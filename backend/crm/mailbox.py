"""Inbound mail: pull real messages out of Gmail over IMAP into the CRM.

The design constraint is that Gmail stays the system of record. Nothing here
deletes, moves or marks anything in the mailbox -- fetches use BODY.PEEK so a
sync never touches Gmail's own read state. The CRM keeps its own copy and its
own read flag, so archiving a message here leaves the Gmail thread untouched.

Sync is idempotent: messages are keyed on their RFC 5322 Message-ID, so the
same window can be re-synced any number of times without creating duplicates.
That matters because the backend sleeps on a free tier, and the recovery path
after a long sleep is simply "sync a wider window".
"""

import datetime
import email
import email.utils
import hashlib
import imaplib
import re
from email.header import decode_header, make_header

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Activity, InboundEmail, Lead, MailSyncLog, OutreachEmail


class MailboxNotConfigured(Exception):
    """Raised when a sync is attempted without IMAP credentials in the environment."""


# Gmail hands both halves of the loop the same App Password, so one credential
# check answers for sending and receiving alike.
def mailbox_is_configured():
    return bool(
        getattr(settings, 'EMAIL_HOST_USER', '')
        and getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        and getattr(settings, 'IMAP_HOST', '')
    )


# --------------------------------------------------------------- header parsing


def _decode(value):
    """Decode an RFC 2047 header ("=?utf-8?B?...?=") into plain text."""
    if not value:
        return ''
    try:
        return str(make_header(decode_header(value))).strip()
    except (UnicodeDecodeError, LookupError, ValueError):
        # A malformed header is not worth losing the whole message over.
        return str(value).strip()


def _first_message_id(value):
    """Pull the first <...> token out of a Message-ID / In-Reply-To header."""
    if not value:
        return ''
    match = re.search(r'<[^<>]+>', value)
    return match.group(0) if match else value.strip()[:300]


def _reference_ids(value):
    """Every <...> token in a References header, oldest first."""
    return re.findall(r'<[^<>]+>', value or '')


def _body_parts(message):
    """Return (plain_text, html, has_attachments) for a parsed message.

    Prefers the text/plain alternative because that is what gets stored and
    quoted; the HTML part is kept only so the dashboard can render rich mail.
    """
    text, html, attachments = '', '', False

    if not message.is_multipart():
        payload = _payload_text(message)
        if (message.get_content_type() or '').lower() == 'text/html':
            return '', payload, False
        return payload, '', False

    for part in message.walk():
        if part.is_multipart():
            continue
        content_type = (part.get_content_type() or '').lower()
        disposition = (part.get('Content-Disposition') or '').lower()

        if 'attachment' in disposition:
            attachments = True
            continue
        if content_type == 'text/plain' and not text:
            text = _payload_text(part)
        elif content_type == 'text/html' and not html:
            html = _payload_text(part)

    return text, html, attachments


def _payload_text(part):
    """Decode one part's bytes using its declared charset, tolerating lies."""
    try:
        raw = part.get_payload(decode=True)
    except (AssertionError, ValueError):
        return ''
    if raw is None:
        return ''
    charset = part.get_content_charset() or 'utf-8'
    try:
        return raw.decode(charset, errors='replace')
    except (LookupError, UnicodeDecodeError):
        return raw.decode('utf-8', errors='replace')


# Gmail and most clients prefix quoted history with these markers. Trimming at
# the first one keeps the CRM list showing what was actually written this time
# rather than the entire thread repeated in every row.
_QUOTE_MARKERS = (
    '\n>',
    '\nOn ',
    '\n-----Original Message-----',
    '\n________________________________',
    '\n--\n',
)


def _snippet(text, limit=280):
    """A one-line preview: the new content only, quoted history stripped."""
    body = text or ''
    cut = len(body)
    for marker in _QUOTE_MARKERS:
        found = body.find(marker)
        if found != -1:
            cut = min(cut, found)
    body = ' '.join(body[:cut].split())
    return body[:limit]


def _sent_at(message):
    """The Date header as an aware datetime, falling back to now."""
    raw = message.get('Date')
    if raw:
        try:
            parsed = email.utils.parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            parsed = None
        if parsed is not None:
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, datetime.timezone.utc)
            return parsed
    return timezone.now()


# ------------------------------------------------------------------ correlation


def _match_outreach(in_reply_to, references):
    """Find the sent email this message is answering, if any.

    In-Reply-To is the direct answer and is checked first. References is the
    whole ancestry, so a match there still puts the reply in the right
    conversation even when a client rewrites In-Reply-To.
    """
    candidates = [cid for cid in [in_reply_to] if cid]
    candidates += list(reversed(references))
    for candidate in candidates:
        found = OutreachEmail.objects.filter(message_id=candidate).first()
        if found:
            return found
    return None


def _register_reply(record):
    """Fold a matched inbound message into the lead's pipeline state.

    A reply is the signal the whole pipeline is waiting for, so it moves the
    stage forward and stamps replied_at. Later stages (interviewing, offer,
    won, lost) are left alone -- a reply should never drag a lead backwards.
    """
    lead = record.lead
    if not lead:
        return False

    fields = []
    if not lead.replied_at or record.sent_at and record.sent_at > lead.replied_at:
        lead.replied_at = record.sent_at or timezone.now()
        fields.append('replied_at')
    if lead.stage in ('new', 'contacted', 'applied'):
        lead.stage = 'replied'
        fields.append('stage')
    if fields:
        fields.append('updated_at')
        lead.save(update_fields=fields)

    Activity.objects.create(
        lead=lead,
        kind='email_received',
        summary='Reply: %s' % (record.subject or '(no subject)')[:280],
        body=record.body_text,
    )
    return True


# ------------------------------------------------------------------- the sync


def _store(message, own_address):
    """Persist one parsed message. Returns (record, created, matched_lead)."""
    from_name, from_email_address = email.utils.parseaddr(
        _decode(message.get('From'))
    )
    from_email_address = (from_email_address or '').strip().lower()

    # Copies of our own outgoing mail carry no new information.
    if not from_email_address or from_email_address == own_address:
        return None, False, False

    message_id = _first_message_id(message.get('Message-ID'))
    if not message_id:
        # Rare, but legal. Synthesise a stable id so dedupe still holds.
        seed = '%s|%s|%s' % (
            from_email_address, message.get('Date', ''), message.get('Subject', '')
        )
        message_id = '<synth-%s@crm.local>' % hashlib.sha1(
            seed.encode('utf-8', 'replace')
        ).hexdigest()

    existing = InboundEmail.objects.filter(message_id=message_id).first()
    if existing:
        return existing, False, False

    in_reply_to = _first_message_id(message.get('In-Reply-To'))
    references = _reference_ids(message.get('References'))
    text, html, has_attachments = _body_parts(message)

    outreach = _match_outreach(in_reply_to, references)
    lead = outreach.lead if outreach and outreach.lead else None
    if lead is None:
        lead = Lead.objects.filter(email__iexact=from_email_address).first()

    record = InboundEmail(
        message_id=message_id,
        in_reply_to=in_reply_to,
        references=' '.join(references)[:4000],
        # The oldest ancestor names the conversation; a message that starts one
        # names itself.
        thread_key=(references[0] if references else in_reply_to or message_id),
        from_email=from_email_address[:254],
        from_name=_decode(message.get('From')).split('<')[0].strip(' "')[:200]
        or from_name[:200],
        to_email=_decode(message.get('To'))[:400],
        cc_email=_decode(message.get('Cc'))[:400],
        subject=_decode(message.get('Subject'))[:500],
        body_text=text,
        body_html=html,
        snippet=_snippet(text or re.sub(r'<[^>]+>', ' ', html)),
        has_attachments=has_attachments,
        lead=lead,
        replies_to=outreach,
        sent_at=_sent_at(message),
    )

    try:
        with transaction.atomic():
            record.save()
    except IntegrityError:
        # Another sync won the race on the same Message-ID.
        return InboundEmail.objects.filter(message_id=message_id).first(), False, False

    matched = _register_reply(record) if lead else False
    return record, True, matched


def sync_mailbox(days=None, folder=None, limit=None):
    """Fetch recent mail from Gmail and mirror anything new into the CRM.

    Returns the MailSyncLog row describing the run. Never raises for ordinary
    connection trouble -- the failure is recorded on the log and surfaced in the
    dashboard, because a mailbox that is briefly unreachable should not take an
    API request down with it.
    """
    if not mailbox_is_configured():
        raise MailboxNotConfigured(
            'No IMAP credentials found. Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD '
            'in the backend environment, and enable IMAP in Gmail under '
            'Settings -> Forwarding and POP/IMAP, to receive mail in the CRM.'
        )

    days = days or settings.IMAP_SYNC_DAYS
    folder = folder or settings.IMAP_FOLDER
    limit = limit or settings.IMAP_MAX_MESSAGES
    own_address = (settings.EMAIL_HOST_USER or '').strip().lower()

    log = MailSyncLog.objects.create()
    client = None
    try:
        opener = imaplib.IMAP4_SSL if settings.IMAP_USE_SSL else imaplib.IMAP4
        client = opener(
            settings.IMAP_HOST,
            settings.IMAP_PORT,
            timeout=getattr(settings, 'IMAP_TIMEOUT', 20),
        )
        try:
            client.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        except imaplib.IMAP4.error as exc:
            # The raw message is '[AUTHENTICATIONFAILED] Invalid credentials',
            # which is accurate and completely unactionable. Say what to check.
            raise imaplib.IMAP4.error(
                'Gmail rejected the credentials for %s. Check that 2-Step '
                'Verification is on, that EMAIL_HOST_PASSWORD is a 16-character '
                'App Password (not the account password), and that it was created '
                'under this same Google account. Original error: %s'
                % (settings.EMAIL_HOST_USER, exc)
            ) from exc
        # Read-only: belt and braces on top of BODY.PEEK, so a sync can never
        # change what is unread in the real mailbox.
        client.select(folder, readonly=True)

        since = (timezone.now() - datetime.timedelta(days=days)).strftime('%d-%b-%Y')
        status_code, data = client.search(None, '(SINCE "%s")' % since)
        if status_code != 'OK':
            raise imaplib.IMAP4.error('Mailbox search failed: %s' % status_code)

        # Newest first, capped, so a busy mailbox costs a bounded amount of work.
        uids = (data[0] or b'').split()
        uids = list(reversed(uids))[:limit]

        fetched = created = matched = 0
        for uid in uids:
            fetch_status, payload = client.fetch(uid, '(BODY.PEEK[])')
            if fetch_status != 'OK' or not payload or not isinstance(payload[0], tuple):
                continue
            fetched += 1
            record, was_created, was_matched = _store(
                email.message_from_bytes(payload[0][1]), own_address
            )
            if was_created:
                created += 1
            if was_matched:
                matched += 1

        log.fetched = fetched
        log.created = created
        log.matched_leads = matched
        log.ok = True
    except (imaplib.IMAP4.error, OSError, ValueError) as exc:
        log.ok = False
        log.error_message = str(exc) or exc.__class__.__name__
    finally:
        if client is not None:
            try:
                client.close()
            except (imaplib.IMAP4.error, OSError):
                pass
            try:
                client.logout()
            except (imaplib.IMAP4.error, OSError):
                pass
        log.finished_at = timezone.now()
        log.save()

    return log
