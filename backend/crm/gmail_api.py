"""Outbound mail over the Gmail API, for hosts that block SMTP.

Render's egress filtering refuses TCP to smtp.gmail.com on both 587 and 465 --
`OSError: [Errno 101] Network is unreachable`, at the socket layer, before any
handshake. No credential or port setting fixes that. IMAP on 993 is untouched,
so this is port-specific filtering rather than a broken network.

This is the same send moved onto HTTPS: `users.messages.send` on port 443,
which is open. Gmail performs the send itself, so the message lands in the
account's own Sent folder -- the requirement that rules out relay APIs like
Resend or Brevo, which send as themselves.

Written as a Django email backend rather than a second send function, so
`get_connection()` picks it up and nothing above it changes: the same
EmailMultiAlternatives, the same minted Message-ID, the same In-Reply-To and
References. Selecting it is one environment variable:

    EMAIL_BACKEND=crm.gmail_api.GmailAPIBackend

SMTP stays the default and still works on any host that permits it.

Deliberately no google-api-python-client. The entire surface used here is one
token refresh and one POST; the dependency would be larger than the module and
would drag google-auth in behind it.
"""

import base64
import io
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from email import generator

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


logger = logging.getLogger(__name__)

# The import path that selects this backend. A constant because two places have
# to agree on it: EMAIL_BACKEND, and is_selected() below.
BACKEND_PATH = 'crm.gmail_api.GmailAPIBackend'

AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
MESSAGES_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
SEND_URL = MESSAGES_URL + '/send'

# gmail.send is what actually sends. gmail.metadata is read-only and headers
# only -- no bodies, no attachments -- and exists solely to read back the
# Message-ID Gmail stamps on a sent message; see read_sent_message_id.
#
# Deliberately not gmail.readonly or gmail.modify, which would let a leaked
# refresh token read the mail itself. IMAP still does the reading, with the App
# Password, and that stays separate on purpose.
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.metadata',
]

# What Google says when the credential itself is the problem. A refresh token
# dies on a password change, on revocation, and -- for an OAuth app still in
# "Testing" publishing status -- seven days after it was minted.
_AUTH_FAILURES = (
    'invalid_grant',
    'invalid_client',
    'unauthorized_client',
    'invalid_scope',
)


class GmailAPIError(Exception):
    """A send that Google refused, or that never reached Google at all."""


class GmailAuthError(GmailAPIError):
    """Credentials missing, revoked or rejected. Retrying will not help."""


def credentials():
    return (
        getattr(settings, 'GMAIL_CLIENT_ID', ''),
        getattr(settings, 'GMAIL_CLIENT_SECRET', ''),
        getattr(settings, 'GMAIL_REFRESH_TOKEN', ''),
    )


def is_selected():
    """True when EMAIL_BACKEND points at this module."""
    return getattr(settings, 'EMAIL_BACKEND', '') == BACKEND_PATH


def is_configured():
    return all(credentials())


NOT_CONFIGURED = (
    'Gmail API sending is selected but not configured. Set GMAIL_CLIENT_ID, '
    'GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN in the backend environment. '
    'Run "python manage.py gmail_authorize" locally to mint the refresh token.'
)


# ------------------------------------------------------------------ transport


def _timeout():
    # Same reasoning as EMAIL_TIMEOUT for SMTP: a request that cannot complete
    # should say so rather than hold the web request open until the platform
    # kills it and the real error is lost.
    return getattr(settings, 'EMAIL_TIMEOUT', 20) or 20


def _error_detail(exc):
    """Pull Google's own explanation out of an error response.

    `str()` on an HTTPError is "HTTP Error 400: Bad Request", which identifies
    nothing. The JSON body is the part that names the actual fault, so it is
    read out here and carried into the exception instead.
    """
    try:
        raw = exc.read().decode('utf-8', 'replace')
    except Exception:
        return str(exc)
    try:
        data = json.loads(raw)
    except ValueError:
        return raw.strip() or str(exc)
    if isinstance(data, dict):
        if 'error_description' in data:
            return '%s (%s)' % (data['error_description'], data.get('error', ''))
        error = data.get('error')
        if isinstance(error, dict):
            return error.get('message') or json.dumps(error)
        if error:
            return str(error)
    return raw.strip() or str(exc)


def _request(url, method='POST', payload=None, headers=None, form=False):
    """Perform one HTTP call and return the parsed JSON response.

    The single place this module touches the network, which is what makes it
    the single place to stub in tests.
    """
    request_headers = dict(headers or {})
    if payload is None:
        body = None
    elif form:
        body = urllib.parse.urlencode(payload).encode('utf-8')
        request_headers.setdefault('Content-Type', 'application/x-www-form-urlencoded')
    else:
        body = json.dumps(payload).encode('utf-8')
        request_headers.setdefault('Content-Type', 'application/json')

    request = urllib.request.Request(
        url, data=body, headers=request_headers, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=_timeout()) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        detail = _error_detail(exc)
        # 401 and 403 are always the credential. 400 only when Google names one
        # of the OAuth failures, because a malformed message is also a 400 and
        # that one is a bug here, not a dead token.
        if exc.code in (401, 403) or (
            exc.code == 400 and any(f in detail for f in _AUTH_FAILURES)
        ):
            raise GmailAuthError(detail) from exc
        raise GmailAPIError(
            'Gmail API returned %s: %s' % (exc.code, detail)
        ) from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise GmailAPIError('Could not reach the Gmail API: %s' % exc) from exc

    # Parsed outside the request, so a bad body is never reported as a network
    # failure. Saying "could not reach" about a response that plainly arrived is
    # how an afternoon goes into diagnosing the wrong layer.
    try:
        return json.loads(raw.decode('utf-8'))
    except (ValueError, UnicodeDecodeError) as exc:
        raise GmailAPIError(
            'Gmail API returned a response that is not JSON: %r' % raw[:200]
        ) from exc


def _post(url, payload, headers=None, form=False):
    return _request(url, 'POST', payload=payload, headers=headers, form=form)


def _get(url, headers=None):
    return _request(url, 'GET', headers=headers)


# Access tokens last an hour. Refreshing before every send would add a round
# trip to Google for nothing. Cached per process, which is the right scope: a
# restarted or scaled-out worker simply mints its own.
_token_cache = {'value': '', 'expires_at': 0.0}


def access_token(force_refresh=False):
    """Return a valid access token, exchanging the refresh token if needed."""
    client_id, client_secret, refresh_token = credentials()
    if not (client_id and client_secret and refresh_token):
        raise GmailAuthError(NOT_CONFIGURED)

    now = time.time()
    if not force_refresh and _token_cache['value'] and _token_cache['expires_at'] > now:
        return _token_cache['value']

    data = _post(
        TOKEN_URL,
        {
            'client_id': client_id,
            'client_secret': client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token',
        },
        form=True,
    )
    token = data.get('access_token', '')
    if not token:
        raise GmailAuthError('Google returned no access token: %s' % json.dumps(data))

    # A minute of slack, so a token cannot expire in the gap between this check
    # and the send that immediately follows it.
    _token_cache['value'] = token
    _token_cache['expires_at'] = now + max(int(data.get('expires_in', 3600)) - 60, 0)
    return token


def authorization_url(client_id, redirect_uri):
    """The consent URL for the one-time authorization done by gmail_authorize."""
    return '%s?%s' % (AUTH_URL, urllib.parse.urlencode({
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': ' '.join(SCOPES),
        # Without offline there is no refresh token at all, only an access
        # token that dies in an hour and cannot be renewed.
        'access_type': 'offline',
        # Google returns a refresh token only on a client's *first* consent
        # unless consent is forced. Re-running authorization without this
        # silently yields no token, which reads like a bug in this code.
        'prompt': 'consent',
    }))


def exchange_code(code, client_id, client_secret, redirect_uri):
    """Trade an authorization code for the long-lived refresh token."""
    return _post(
        TOKEN_URL,
        {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        },
        form=True,
    )


def reset_token_cache():
    """Forget the cached access token. For tests, and for a credential change."""
    _token_cache['value'] = ''
    _token_cache['expires_at'] = 0.0


def flatten(mime):
    """Serialise a MIME message to wire-format bytes, with CRLF line endings.

    Not `as_bytes(linesep='\\r\\n')`: that only ever worked because Django's own
    MIME subclasses added a `linesep` argument the standard library does not
    have, and Django 6 dropped the shim. Driving BytesGenerator directly is what
    both versions do underneath, and it does not care which class it is handed.

    RFC 5322 is CRLF, and `raw` is meant to be a wire-format message. Gmail
    tolerates bare newlines, but a strict recipient further down the line is not
    worth betting on.
    """
    buffer = io.BytesIO()
    generator.BytesGenerator(buffer, mangle_from_=False).flatten(mime, linesep='\r\n')
    return buffer.getvalue()


def send_raw(mime_bytes):
    """Hand one RFC 5322 message to users.messages.send."""
    payload = {'raw': base64.urlsafe_b64encode(mime_bytes).decode('ascii')}
    try:
        return _post(
            SEND_URL, payload,
            headers={'Authorization': 'Bearer %s' % access_token()},
        )
    except GmailAuthError:
        # The cached token may simply have been cut short -- a password change
        # or a revoked session does that mid-hour. One forced refresh separates
        # a stale cache from credentials that are genuinely dead; if they are
        # dead this raises again and the caller hears it.
        return _post(
            SEND_URL, payload,
            headers={'Authorization': 'Bearer %s' % access_token(force_refresh=True)},
        )


def read_sent_message_id(api_id):
    """Read back the Message-ID Gmail actually stamped on a message it sent.

    Gmail does not honour a Message-ID supplied by the sender -- it overwrites
    the header with one of its own, over SMTP just as much as over this API. So
    the value minted locally before the send is *not* what the recipient sees,
    and it is not what their client will quote in In-Reply-To when they reply.
    Storing the local value would quietly break reply matching.

    One metadata-only read closes that gap: ask Gmail for the header it wrote.

    Returns '' rather than raising. The send has already happened by this point
    and cannot be unhappened, so a failure here must never turn a delivered
    message into an error. It also degrades cleanly for a refresh token minted
    before gmail.metadata was requested -- that returns 403, is caught, and
    leaves the locally minted id in place exactly as before.
    """
    if not api_id:
        return ''
    url = '%s/%s?%s' % (MESSAGES_URL, urllib.parse.quote(str(api_id)),
                        urllib.parse.urlencode({
                            'format': 'metadata',
                            'metadataHeaders': 'Message-Id',
                        }))
    try:
        data = _get(url, headers={'Authorization': 'Bearer %s' % access_token()})
    except GmailAPIError as exc:
        logger.warning(
            'Could not read back the Message-ID for sent message %s: %s. '
            'Reply matching will fall back to the sender address. If this says '
            'insufficient scopes, re-run "manage.py gmail_authorize" to pick up '
            'gmail.metadata.', api_id, exc,
        )
        return ''

    headers = (data.get('payload') or {}).get('headers') or []
    for header in headers:
        # Gmail answers with the capitalisation it feels like, and RFC 5322
        # header names are case-insensitive anyway.
        if header.get('name', '').lower() == 'message-id':
            return (header.get('value') or '').strip()
    return ''


class GmailAPIBackend(BaseEmailBackend):
    """Django email backend that sends through the Gmail API.

    Stateless: there is no connection to open or close, only an access token,
    which the module caches. Django calls open()/close() around a send, and
    inheriting the base class's no-op versions is the whole implementation.

    Each message that goes out is annotated with `sent_message_id` -- the
    Message-ID Gmail actually wrote, which is not the one that was handed in.
    Django's send_messages() contract returns only a count, so an attribute on
    the message is how that gets back to the caller who needs to store it.
    """

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        sent = 0
        for message in email_messages:
            try:
                result = send_raw(flatten(message.message()))
            except GmailAPIError:
                if not self.fail_silently:
                    raise
                logger.exception('Gmail API send failed')
                continue
            message.gmail_id = (result or {}).get('id', '')
            message.gmail_thread_id = (result or {}).get('threadId', '')
            message.sent_message_id = read_sent_message_id(message.gmail_id)
            sent += 1
        return sent
