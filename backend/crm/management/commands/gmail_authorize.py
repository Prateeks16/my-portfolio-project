"""Mint a Gmail API refresh token. Run locally, once.

Opens a browser, asks Google for offline permission to send mail as you, and
prints the refresh token to paste into the backend environment as
GMAIL_REFRESH_TOKEN.

    python manage.py gmail_authorize --client-id ... --client-secret ...

Both values come from a Google Cloud OAuth client of type "Desktop app", on a
project with the Gmail API enabled. If they are already in the local
environment as GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET, the flags can be dropped
-- which also keeps the secret out of shell history.

The token is printed and never written to a file. It is a credential with the
power to send mail as you, and a file in the repo is precisely where those get
committed by accident.

Why a local web server rather than pasting a code back in: Google retired the
out-of-band ("copy this code") flow, and the loopback redirect is what replaced
it for desktop clients. Nothing is exposed by it -- the server binds to
127.0.0.1, answers exactly one request, and stops.
"""

import http.server
import urllib.parse
import webbrowser

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from crm import gmail_api


DONE_PAGE = b"""<!doctype html>
<meta charset="utf-8">
<title>Authorized</title>
<body style="font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,
Arial,sans-serif;padding:3rem;max-width:32rem;margin:0 auto">
<h1 style="font-size:1.25rem">Authorized.</h1>
<p>The refresh token has been printed in your terminal. You can close this tab.</p>
"""


class _CallbackHandler(http.server.BaseHTTPRequestHandler):
    """Catches the single redirect Google sends back, then gets out of the way."""

    result = {}

    def do_GET(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        _CallbackHandler.result = {
            key: values[0] for key, values in query.items()
        }
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(DONE_PAGE)))
        self.end_headers()
        self.wfile.write(DONE_PAGE)

    def log_message(self, *args):
        # The default handler writes an access log line to stderr, which here
        # would interleave with the instructions the user is trying to read.
        pass


class Command(BaseCommand):
    help = 'Mint a Gmail API refresh token for outbound mail over HTTPS.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--client-id', default='',
            help='OAuth client ID. Defaults to GMAIL_CLIENT_ID.',
        )
        parser.add_argument(
            '--client-secret', default='',
            help='OAuth client secret. Defaults to GMAIL_CLIENT_SECRET.',
        )
        parser.add_argument(
            '--port', type=int, default=8765,
            help='Local port for the redirect. Must match nothing in '
                 'particular -- Google accepts any port on localhost for a '
                 'Desktop app client.',
        )
        parser.add_argument(
            '--no-browser', action='store_true',
            help='Print the URL instead of opening it. For remote shells.',
        )

    def handle(self, *args, **options):
        client_id = options['client_id'] or getattr(settings, 'GMAIL_CLIENT_ID', '')
        client_secret = (
            options['client_secret'] or getattr(settings, 'GMAIL_CLIENT_SECRET', '')
        )
        if not (client_id and client_secret):
            raise CommandError(
                'Need an OAuth client. Pass --client-id and --client-secret, or '
                'set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in the local '
                'environment. Create the client in the Google Cloud console '
                'under APIs & Services > Credentials, type "Desktop app", on a '
                'project with the Gmail API enabled.'
            )

        redirect_uri = 'http://localhost:%d' % options['port']
        auth_url = gmail_api.authorization_url(client_id, redirect_uri)

        # Bound before the browser opens, for two reasons: a busy port should be
        # reported here rather than after the user has already consented, and
        # the browser must not reach the redirect before anything is listening.
        _CallbackHandler.result = {}
        try:
            server = http.server.HTTPServer(
                ('127.0.0.1', options['port']), _CallbackHandler
            )
        except OSError as exc:
            raise CommandError(
                'Could not listen on %s: %s. Pass --port to pick a free one.'
                % (redirect_uri, exc)
            )

        self.stdout.write('Requesting permission to send mail as your Google account.')
        self.stdout.write('Scope: %s' % ' '.join(gmail_api.SCOPES))
        self.stdout.write('')
        if options['no_browser']:
            self.stdout.write('Open this URL:')
        else:
            self.stdout.write('Opening your browser. If nothing happens, open:')
        self.stdout.write(auth_url)
        self.stdout.write('')
        self.stdout.write(
            'An unverified-app warning is expected for a personal client: '
            'choose Advanced, then "Go to ... (unsafe)".'
        )

        if not options['no_browser']:
            webbrowser.open(auth_url)

        with server:
            self.stdout.write('Waiting for the redirect...')
            server.handle_request()

        result = _CallbackHandler.result
        if 'error' in result:
            raise CommandError('Google refused: %s' % result['error'])
        code = result.get('code')
        if not code:
            raise CommandError(
                'No authorization code came back. Response was: %r' % result
            )

        try:
            data = gmail_api.exchange_code(
                code, client_id, client_secret, redirect_uri
            )
        except gmail_api.GmailAPIError as exc:
            raise CommandError('Token exchange failed: %s' % exc)

        refresh_token = data.get('refresh_token', '')
        if not refresh_token:
            raise CommandError(
                'Google returned an access token but no refresh token. This '
                'happens when the account has already granted this client and '
                'consent was not re-prompted. Revoke it at '
                'https://myaccount.google.com/permissions and run this again.'
            )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Refresh token minted.'))
        self.stdout.write('')
        self.stdout.write('Set these in the backend environment:')
        self.stdout.write('')
        self.stdout.write('  EMAIL_BACKEND=%s' % gmail_api.BACKEND_PATH)
        self.stdout.write('  GMAIL_CLIENT_ID=%s' % client_id)
        self.stdout.write('  GMAIL_CLIENT_SECRET=%s' % client_secret)
        self.stdout.write('  GMAIL_REFRESH_TOKEN=%s' % refresh_token)
        self.stdout.write('')
        self.stdout.write(
            'Leave EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in place -- IMAP '
            'receiving still uses the App Password.'
        )
        self.stdout.write(
            'If the OAuth app is still in "Testing" publishing status, this '
            'token expires in 7 days. Publish it to "In production" to stop '
            'that.'
        )
