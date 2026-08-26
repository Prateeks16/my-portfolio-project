"""End-to-end check of the mail loop against an isolated test database."""

import base64
import email as email_mod
import io
import json
import smtplib
import urllib.error
import urllib.parse
from unittest import mock

from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from django.core import mail as django_mail
from django.test import TestCase, override_settings

from crm import gmail_api
from crm.mailbox import _store
from crm.models import InboundEmail, Lead, OutreachEmail
from crm.services import mail_is_configured, send_outreach_email

REPLY = b"""From: Priya Mehta <priya@acme-hire.com>
To: me@gmail.com
Subject: Re: Backend role
Date: Fri, 22 Aug 2026 11:04:12 +0530
Message-ID: <inbound-1@acme-hire.com>
In-Reply-To: %s
References: %s
Content-Type: text/plain; charset="utf-8"

Sounds good. Tuesday 4pm works.
"""


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    EMAIL_HOST_USER='me@gmail.com',
    EMAIL_HOST_PASSWORD='app-password',
    DEFAULT_FROM_EMAIL='me@gmail.com',
    DEFAULT_FROM_NAME='Prateek Sahu',
)
class MailLoopTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('me', password='pw')
        self.client.force_login(self.user)
        self.lead = Lead.objects.create(
            name='Priya Mehta', email='priya@acme-hire.com', stage='new',
        )

    def test_outbound_stamps_threading_headers_and_display_name(self):
        outreach = OutreachEmail.objects.create(
            lead=self.lead, to_email=self.lead.email, to_name='Priya Mehta',
            subject='Backend role', body='Hi Priya,\n\nQuick note.',
        )
        send_outreach_email(outreach)

        sent = django_mail.outbox[0]
        outreach.refresh_from_db()

        self.assertTrue(outreach.message_id.startswith('<'))
        self.assertEqual(sent.extra_headers['Message-ID'], outreach.message_id)
        self.assertEqual(sent.from_email, 'Prateek Sahu <me@gmail.com>')
        self.assertEqual(sent.to, ['Priya Mehta <priya@acme-hire.com>'])
        self.assertEqual(outreach.status, 'sent')

        self.lead.refresh_from_db()
        self.assertEqual(self.lead.stage, 'contacted')

    def test_inbound_reply_matches_the_outreach_and_advances_the_lead(self):
        outreach = OutreachEmail.objects.create(
            lead=self.lead, to_email=self.lead.email, subject='Backend role',
            body='...',
        )
        send_outreach_email(outreach)
        outreach.refresh_from_db()

        raw = REPLY % (
            outreach.message_id.encode(), outreach.message_id.encode(),
        )
        record, created, matched = _store(
            email_mod.message_from_bytes(raw), 'me@gmail.com'
        )

        self.assertTrue(created and matched)
        self.assertEqual(record.replies_to_id, outreach.id)
        self.assertEqual(record.lead_id, self.lead.id)

        self.lead.refresh_from_db()
        self.assertEqual(self.lead.stage, 'replied')
        self.assertIsNotNone(self.lead.replied_at)

    def test_reply_endpoint_threads_and_sends(self):
        outreach = OutreachEmail.objects.create(
            lead=self.lead, to_email=self.lead.email, subject='Backend role',
            body='...',
        )
        send_outreach_email(outreach)
        outreach.refresh_from_db()

        raw = REPLY % (
            outreach.message_id.encode(), outreach.message_id.encode(),
        )
        record, _, _ = _store(email_mod.message_from_bytes(raw), 'me@gmail.com')

        django_mail.outbox.clear()
        response = self.client.post(
            '/api/crm/mail/%d/reply/' % record.id,
            {'body': 'Tuesday 4pm it is.', 'send': True},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201, response.content)

        sent = django_mail.outbox[0]
        self.assertEqual(sent.subject, 'Re: Backend role')
        self.assertEqual(sent.extra_headers['In-Reply-To'], record.message_id)
        self.assertIn(outreach.message_id, sent.extra_headers['References'])
        self.assertIn(record.message_id, sent.extra_headers['References'])

        record.refresh_from_db()
        self.assertTrue(record.is_read)

    def test_read_and_archive_flags_are_local_only(self):
        record, _, _ = _store(
            email_mod.message_from_bytes(REPLY % (b'<x@y>', b'<x@y>')),
            'me@gmail.com',
        )
        self.assertFalse(record.is_read)

        self.client.post('/api/crm/mail/%d/read/' % record.id,
                         {}, content_type='application/json')
        self.client.post('/api/crm/mail/%d/archive/' % record.id,
                         {}, content_type='application/json')
        record.refresh_from_db()
        self.assertTrue(record.is_read and record.is_archived)

        # Archived rows drop out of the default list, not out of the database.
        listing = self.client.get('/api/crm/mail/').json()
        self.assertEqual(listing, [])
        archived = self.client.get('/api/crm/mail/?archived=true').json()
        self.assertEqual(len(archived), 1)
        self.assertEqual(InboundEmail.objects.count(), 1)

    def test_convert_backfills_every_message_from_that_sender(self):
        raw = REPLY.replace(b'priya@acme-hire.com', b'stranger@newco.com')
        first, _, _ = _store(email_mod.message_from_bytes(
            raw % (b'<a@b>', b'<a@b>')), 'me@gmail.com')
        second_raw = raw.replace(b'<inbound-1@', b'<inbound-2@')
        second, _, _ = _store(email_mod.message_from_bytes(
            second_raw % (b'<a@b>', b'<a@b>')), 'me@gmail.com')
        self.assertIsNone(first.lead_id)

        response = self.client.post('/api/crm/mail/%d/convert/' % first.id,
                                    {}, content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)

        first.refresh_from_db()
        second.refresh_from_db()
        self.assertIsNotNone(first.lead_id)
        self.assertEqual(second.lead_id, first.lead_id)

    def test_contact_form_notification_replies_to_the_visitor(self):
        from api.models import ContactSubmission
        from crm.services import notify_contact_submission

        submission = ContactSubmission.objects.create(
            name='Priya Mehta', email='priya@acme-hire.com',
            subject='Backend role', message='Are you free Tuesday?',
        )
        django_mail.outbox.clear()
        self.assertTrue(notify_contact_submission(submission))

        sent = django_mail.outbox[0]
        # Sent from the account to itself so Gmail accepts it and it lands in
        # the inbox; Reply-To is what makes Reply answer the visitor instead.
        self.assertEqual(sent.to, ['me@gmail.com'])
        self.assertEqual(sent.from_email, 'me@gmail.com')
        self.assertEqual(sent.reply_to, ['Priya Mehta <priya@acme-hire.com>'])
        self.assertEqual(sent.subject, '[Portfolio] Backend role')
        self.assertIn('Are you free Tuesday?', sent.body)

    def test_contact_notification_never_breaks_the_form(self):
        from api.models import ContactSubmission
        from crm.services import notify_contact_submission

        submission = ContactSubmission.objects.create(
            name='X', email='x@y.com', subject='s', message='m',
        )
        with mock.patch.object(
            EmailMultiAlternatives, 'send', side_effect=OSError('smtp down')
        ):
            # Returns False rather than raising: the submission is already
            # stored, and a visitor must never see the form fail over this.
            self.assertFalse(notify_contact_submission(submission))

    def test_rejected_credentials_keep_the_draft_and_explain_themselves(self):
        draft = OutreachEmail.objects.create(
            to_email='x@y.com', subject='s', body='b',
        )
        failure = smtplib.SMTPAuthenticationError(
            535, b'5.7.8 Username and Password not accepted'
        )
        with mock.patch.object(
            EmailMultiAlternatives, 'send', side_effect=failure
        ):
            response = self.client.post('/api/crm/emails/%d/send/' % draft.id)

        # A bad password is a configuration problem, not a failed send: 409 and
        # the draft survives, because retrying is pointless until it is fixed.
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['code'], 'mail_not_configured')
        self.assertIn('App Password', response.json()['detail'])
        draft.refresh_from_db()
        self.assertEqual(draft.status, 'draft')

    def test_sending_without_credentials_refuses_and_keeps_the_draft(self):
        with override_settings(EMAIL_HOST_USER='', EMAIL_HOST_PASSWORD=''):
            draft = OutreachEmail.objects.create(
                to_email='x@y.com', subject='s', body='b',
            )
            response = self.client.post('/api/crm/emails/%d/send/' % draft.id)
            self.assertEqual(response.status_code, 409)
            draft.refresh_from_db()
            self.assertEqual(draft.status, 'draft')


@override_settings(
    EMAIL_BACKEND=gmail_api.BACKEND_PATH,
    GMAIL_CLIENT_ID='client-id',
    GMAIL_CLIENT_SECRET='client-secret',
    GMAIL_REFRESH_TOKEN='refresh-token',
    EMAIL_HOST_USER='me@gmail.com',
    EMAIL_HOST_PASSWORD='app-password',
    DEFAULT_FROM_EMAIL='me@gmail.com',
    DEFAULT_FROM_NAME='Prateek Sahu',
)
class GmailAPITransportTest(TestCase):
    """The HTTPS send path, exercised through the same public entry point.

    `_post` is the only place this code touches the network, so it is the only
    thing stubbed. Everything above it -- the backend, get_connection(),
    send_outreach_email -- runs for real, which is the point: the claim being
    tested is that swapping the transport changes nothing else.
    """

    def setUp(self):
        self.user = User.objects.create_user('me', password='pw')
        self.client.force_login(self.user)
        # Module-level cache. Left alone it would leak an access token minted
        # by one test into the request counts of the next.
        gmail_api.reset_token_cache()
        self.addCleanup(gmail_api.reset_token_cache)
        self.calls = []
        # What Gmail rewrites the Message-ID to. Deliberately unlike anything
        # make_msgid would produce, so a test cannot pass by accident.
        self.gmail_message_id = '<CAMWrOazsHapZVJeaqesW7Mat@mail.gmail.com>'

    def _fake_request(self, url, method='POST', payload=None, headers=None, form=False):
        self.calls.append((url, method, payload, headers))
        if url == gmail_api.TOKEN_URL:
            return {'access_token': 'access-token', 'expires_in': 3600}
        if url == gmail_api.SEND_URL:
            return {'id': 'gmail-msg-1', 'threadId': 'gmail-thread-1'}
        if url.startswith(gmail_api.MESSAGES_URL):
            return {'payload': {'headers': [
                {'name': 'Subject', 'value': 'Backend role'},
                {'name': 'Message-Id', 'value': self.gmail_message_id},
            ]}}
        raise AssertionError('unexpected call to %s' % url)

    def _patch(self, **kwargs):
        kwargs.setdefault('side_effect', self._fake_request)
        return mock.patch.object(gmail_api, '_request', **kwargs)

    def _calls_to(self, url, method=None):
        return [c for c in self.calls
                if c[0] == url and (method is None or c[1] == method)]

    def _sent_mime(self):
        return base64.urlsafe_b64decode(
            self._calls_to(gmail_api.SEND_URL)[0][2]['raw']
        ).decode('utf-8')

    def test_send_carries_the_same_headers_as_the_smtp_path(self):
        lead = Lead.objects.create(
            name='Priya Mehta', email='priya@acme-hire.com', stage='new',
        )
        outreach = OutreachEmail.objects.create(
            lead=lead, to_email=lead.email, to_name='Priya Mehta',
            subject='Backend role', body='Hi Priya,\n\nQuick note.',
            in_reply_to='<earlier@acme-hire.com>',
        )
        with self._patch():
            send_outreach_email(outreach)

        outreach.refresh_from_db()
        mime = self._sent_mime()

        # The thread references survive the trip through base64.
        self.assertIn('In-Reply-To: <earlier@acme-hire.com>', mime)
        self.assertIn('References: <earlier@acme-hire.com>', mime)
        self.assertIn('Prateek Sahu <me@gmail.com>', mime)
        self.assertIn('Priya Mehta <priya@acme-hire.com>', mime)

        self.assertEqual(outreach.status, 'sent')
        lead.refresh_from_db()
        self.assertEqual(lead.stage, 'contacted')

        # Bearer token on the send, and it came from the refresh exchange.
        self.assertEqual(
            self._calls_to(gmail_api.SEND_URL)[0][3]['Authorization'],
            'Bearer access-token',
        )

    def test_the_stored_message_id_is_the_one_gmail_actually_wrote(self):
        outreach = OutreachEmail.objects.create(
            to_email='priya@acme-hire.com', subject='Backend role', body='...',
        )
        with self._patch():
            send_outreach_email(outreach)
        outreach.refresh_from_db()

        # Gmail discards the Message-ID it is handed and writes its own. Storing
        # the locally minted one would mean every reply quotes an id the CRM has
        # never heard of, and reply matching silently degrades to the address
        # fallback -- which loses which *email* was being answered.
        self.assertEqual(outreach.message_id, self.gmail_message_id)
        self.assertNotIn(self.gmail_message_id, self._sent_mime())

        # Read back by id, metadata only -- never the body.
        read = self._calls_to(
            '%s/gmail-msg-1?format=metadata&metadataHeaders=Message-Id'
            % gmail_api.MESSAGES_URL, method='GET',
        )
        self.assertEqual(len(read), 1)

    def test_a_reply_matches_the_id_gmail_wrote_not_the_one_minted(self):
        lead = Lead.objects.create(
            name='Priya Mehta', email='priya@acme-hire.com', stage='new',
        )
        outreach = OutreachEmail.objects.create(
            lead=lead, to_email=lead.email, subject='Backend role', body='...',
        )
        with self._patch():
            send_outreach_email(outreach)

        # The recipient answers quoting what their client saw, which is Gmail's
        # id. This is the end-to-end claim the read-back exists to protect.
        raw = REPLY % (
            self.gmail_message_id.encode(), self.gmail_message_id.encode(),
        )
        record, created, matched = _store(
            email_mod.message_from_bytes(raw), 'me@gmail.com'
        )

        self.assertTrue(created and matched)
        self.assertEqual(record.replies_to_id, outreach.id)
        lead.refresh_from_db()
        self.assertEqual(lead.stage, 'replied')

    def test_a_failed_read_back_keeps_the_send_and_the_minted_id(self):
        outreach = OutreachEmail.objects.create(
            to_email='x@y.com', subject='s', body='b',
        )

        def refuse_the_read(url, method='POST', payload=None, headers=None, form=False):
            if url.startswith(gmail_api.MESSAGES_URL) and method == 'GET':
                raise gmail_api.GmailAuthError(
                    'Request had insufficient authentication scopes.'
                )
            return self._fake_request(url, method, payload, headers, form)

        with self._patch(side_effect=refuse_the_read):
            send_outreach_email(outreach)
        outreach.refresh_from_db()

        # A token minted before gmail.metadata was requested returns 403 here.
        # The message is already gone by then, so this must not fail the send --
        # it degrades to the old behaviour and nothing else.
        self.assertEqual(outreach.status, 'sent')
        self.assertTrue(outreach.message_id.startswith('<'))
        self.assertNotEqual(outreach.message_id, self.gmail_message_id)

    def test_the_access_token_is_minted_once_and_reused(self):
        drafts = [
            OutreachEmail.objects.create(to_email='a@b.com', subject='s', body='b'),
            OutreachEmail.objects.create(to_email='c@d.com', subject='s', body='b'),
        ]
        with self._patch():
            for draft in drafts:
                send_outreach_email(draft)

        token_calls = [c for c in self.calls if c[0] == gmail_api.TOKEN_URL]
        send_calls = [c for c in self.calls if c[0] == gmail_api.SEND_URL]
        self.assertEqual(len(token_calls), 1)
        self.assertEqual(len(send_calls), 2)

    def test_a_dead_refresh_token_keeps_the_draft_and_says_what_to_do(self):
        draft = OutreachEmail.objects.create(
            to_email='x@y.com', subject='s', body='b',
        )
        failure = gmail_api.GmailAuthError('Token has been expired or revoked. (invalid_grant)')
        with self._patch(side_effect=failure):
            response = self.client.post('/api/crm/emails/%d/send/' % draft.id)

        # Same handling as a rejected App Password: a configuration problem, so
        # 409 and an intact draft rather than a failed send worth retrying.
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['code'], 'mail_not_configured')
        self.assertIn('gmail_authorize', response.json()['detail'])
        draft.refresh_from_db()
        self.assertEqual(draft.status, 'draft')

    def test_an_app_password_does_not_count_as_gmail_api_credentials(self):
        # EMAIL_HOST_PASSWORD is still set here, because IMAP needs it. It must
        # not make the dashboard claim sending is live.
        with override_settings(GMAIL_REFRESH_TOKEN=''):
            self.assertFalse(mail_is_configured())
            response = self.client.get('/api/crm/emails/mail_status/')
            self.assertFalse(response.json()['configured'])

    def test_a_refused_send_is_reported_as_a_send_failure_not_a_config_error(self):
        draft = OutreachEmail.objects.create(
            to_email='x@y.com', subject='s', body='b',
        )
        failure = gmail_api.GmailAPIError('Gmail API returned 500: Backend Error')
        with self._patch(side_effect=failure):
            response = self.client.post('/api/crm/emails/%d/send/' % draft.id)

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()['code'], 'send_failed')
        draft.refresh_from_db()
        self.assertEqual(draft.status, 'failed')

    def test_an_http_error_body_becomes_the_message_instead_of_the_status_line(self):
        # The reason this module reads error bodies at all: urllib's own string
        # for a 400 is "HTTP Error 400: Bad Request", which names nothing.
        body = json.dumps({
            'error': 'invalid_grant',
            'error_description': 'Token has been expired or revoked.',
        }).encode('utf-8')
        failure = urllib.error.HTTPError(
            gmail_api.TOKEN_URL, 400, 'Bad Request', {}, io.BytesIO(body)
        )
        with mock.patch.object(
            gmail_api.urllib.request, 'urlopen', side_effect=failure
        ):
            with self.assertRaises(gmail_api.GmailAuthError) as caught:
                gmail_api.access_token()

        self.assertIn('Token has been expired or revoked.', str(caught.exception))

    def test_the_consent_url_asks_for_offline_access_every_time(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(
            gmail_api.authorization_url('client-id', 'http://localhost:8765')
        ).query)

        # Drop either of these and authorization still appears to succeed, while
        # handing back no refresh token at all -- which is indistinguishable
        # from a bug in the exchange until you read Google's docs closely.
        self.assertEqual(query['access_type'], ['offline'])
        self.assertEqual(query['prompt'], ['consent'])
        # Sending, plus headers-only metadata for the Message-ID read-back.
        # Neither gmail.readonly nor gmail.modify: a leaked refresh token must
        # not be able to read the mail itself.
        self.assertEqual(query['scope'], [
            'https://www.googleapis.com/auth/gmail.send '
            'https://www.googleapis.com/auth/gmail.metadata'
        ])
