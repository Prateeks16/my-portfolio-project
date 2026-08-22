"""End-to-end check of the mail loop against an isolated test database."""

import email as email_mod
import smtplib
from unittest import mock

from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from django.core import mail as django_mail
from django.test import TestCase, override_settings

from crm.mailbox import _store
from crm.models import InboundEmail, Lead, OutreachEmail
from crm.services import send_outreach_email

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
