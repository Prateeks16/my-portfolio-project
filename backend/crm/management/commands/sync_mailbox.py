"""Pull new mail from Gmail into the CRM.

Point a cron job (or a Render cron service) at this to keep the inbox current
without anyone opening the dashboard:

    python manage.py sync_mailbox
    python manage.py sync_mailbox --days 30

Safe to run as often as you like -- messages are deduplicated on Message-ID, so
overlapping windows cost a little bandwidth and change nothing.
"""

from django.core.management.base import BaseCommand, CommandError

from crm.mailbox import MailboxNotConfigured, sync_mailbox


class Command(BaseCommand):
    help = 'Fetch recent messages from the configured IMAP mailbox into the CRM.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=None,
            help='How far back to look. Defaults to IMAP_SYNC_DAYS.',
        )
        parser.add_argument(
            '--folder',
            default=None,
            help='Mailbox folder to read. Defaults to IMAP_FOLDER (INBOX).',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Maximum messages to fetch in this run.',
        )

    def handle(self, *args, **options):
        try:
            log = sync_mailbox(
                days=options['days'],
                folder=options['folder'],
                limit=options['limit'],
            )
        except MailboxNotConfigured as exc:
            raise CommandError(str(exc))

        if not log.ok:
            raise CommandError('Sync failed: %s' % log.error_message)

        self.stdout.write(
            self.style.SUCCESS(
                'Fetched %d, stored %d new, matched %d to leads.'
                % (log.fetched, log.created, log.matched_leads)
            )
        )
