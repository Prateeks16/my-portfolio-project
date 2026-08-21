"""Import the internship pipeline that was tracked in the Cowork dashboard.

Two modes:

    python manage.py import_pipeline              # the ten companies already tracked
    python manage.py import_pipeline --file p.json  # a JSON export from that dashboard

Matching is on (company, role) and existing rows are left alone unless --update is
passed, so running this after the pipeline has moved on will not undo anything.
"""

import datetime
import json

from django.core.management.base import BaseCommand
from django.utils import timezone

from crm.models import Activity, Lead

STAGE_MAP = {
    'lead': 'new',
    'outreach': 'contacted',
    'applied': 'applied',
    'replied': 'replied',
    'interview': 'interviewing',
    'offer': 'offer',
    'rejected': 'lost',
}

CHANNEL_MAP = {
    'Email': 'email',
    'LinkedIn': 'linkedin',
    'Referral': 'referral',
    'Job board': 'job_board',
    'Application form': 'application_form',
    'Other': 'other',
}

# Taken verbatim from the tracker; nothing here is invented.
SEED = [
    {
        'company': 'Brooklyn Health', 'role': 'Backend Engineer', 'stage': 'applied',
        'channel': 'Application form', 'date': '2026-08-13',
        'location': 'Remote (US, CNS clinical trials)', 'contact': '',
        'link': 'https://brooklyn.health',
        'tags': ['Backend', 'APIs', 'PostgreSQL', 'Testing/CI-CD', 'Security'],
        'notes': 'Willis eCOA platform. Answered 5 required backend questions: scale, '
                 'API deep-dive, databases, reliability practices, security.',
    },
    {
        'company': 'Collinear.ai', 'role': 'Member of Technical Staff — Engineering',
        'stage': 'applied', 'channel': 'Application form', 'date': '2026-08-13',
        'location': 'SF Bay Area (stealth, VC-backed)', 'contact': '',
        'link': 'https://collinear.ai',
        'tags': ['React/Next.js', 'FastAPI', 'AWS', 'Docker', 'Kubernetes', 'LLM/NLP', 'SQL+NoSQL'],
        'notes': 'AI customization/alignment. JD wants TDD, open-source portfolio, '
                 'DevOps (Jenkins/AWS/K8s).',
    },
    {
        'company': 'Web3Task', 'role': 'Software Engineering Intern', 'stage': 'outreach',
        'channel': 'Referral', 'date': '2026-08-14', 'location': 'SaaS/AI dev agency',
        'contact': 'SWE (MERN + Next.js, Kotlin, GCP)',
        'link': 'https://web3task.com/career/jobs/read?type=Intern&id=3',
        'tags': ['MERN', 'Next.js', 'Firebase', 'GCP'],
        'notes': 'Approaching a Software Engineer there for a referral — worked on '
                 'Playstore VTN AI and Qyuro AI.',
    },
    {
        'company': 'Adopt AI', 'role': 'Engineering', 'stage': 'outreach',
        'channel': 'LinkedIn', 'date': '2026-08-14',
        'location': 'AI agents for accounting/tax workflows',
        'contact': 'Deepak Anchala (CEO) + talent acquisition', 'link': '',
        'tags': ['AI agents', 'LLM', 'Automation'],
        'notes': 'Two threads: talent acquisition, plus a direct LinkedIn note to the CEO.',
    },
    {
        'company': 'Sampark Softwares', 'role': 'AI Engineer', 'stage': 'outreach',
        'channel': 'Email', 'date': '2026-08-14', 'location': 'Gurugram',
        'contact': 'hr@samparksoftwares.com', 'link': 'https://samparksoftwares.com',
        'tags': ['Java/Spring', 'Python', 'RAG', 'Vector DBs'],
        'notes': 'Enterprise software/AI consultancy — closest stack match to your '
                 'profile of the NCR set.',
    },
    {
        'company': 'Phoenix Tech Consulting', 'role': 'Software / AI Development Intern',
        'stage': 'outreach', 'channel': 'Email', 'date': '2026-08-14',
        'location': 'Gurugram', 'contact': 'info@phoenixtech.consulting',
        'link': 'https://phoenixtech.consulting',
        'tags': ['Python', 'React', 'LLM/AI'], 'notes': '',
    },
    {
        'company': 'EaseOps', 'role': 'Software Engineering Intern', 'stage': 'outreach',
        'channel': 'Email', 'date': '2026-08-14', 'location': 'Bangalore',
        'contact': 'enquiry@easeops.com', 'link': 'https://easeops.io',
        'tags': ['Backend', 'Healthcare ops'],
        'notes': 'AI-powered hospital operations / QMS startup. WhatsApp follow-up also planned.',
    },
    {
        'company': 'Melonleaf Consulting', 'role': 'Internship', 'stage': 'outreach',
        'channel': 'Email', 'date': '2026-08-14', 'location': 'Gurugram + Austin',
        'contact': 'connect@melonleaf.com', 'link': 'https://melonleaf.com',
        'tags': ['Salesforce', 'AI', 'Data Engineering'], 'notes': '',
    },
    {
        'company': '88gravity', 'role': 'Web / App Development Intern', 'stage': 'outreach',
        'channel': 'Email', 'date': '2026-08-14', 'location': 'Gurgaon',
        'contact': 'hr@88gravity.com', 'link': '',
        'tags': ['Web dev', 'App dev'], 'notes': 'Digital marketing agency.',
    },
    {
        'company': 'GAP Infotech', 'role': 'Dev Intern / Trainee', 'stage': 'outreach',
        'channel': 'Email', 'date': '2026-08-14', 'location': 'Gurgaon', 'contact': '',
        'link': '', 'tags': ['Web dev'],
        'notes': 'Web design / digital marketing agency.',
    },
]


def _as_datetime(value):
    if not value:
        return None
    try:
        date = datetime.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None
    return timezone.make_aware(
        datetime.datetime.combine(date, datetime.time(9, 0)),
        datetime.timezone.utc,
    )


class Command(BaseCommand):
    help = 'Import the internship pipeline tracked in the Cowork dashboard.'

    def add_arguments(self, parser):
        parser.add_argument('--file', help='JSON exported from the pipeline dashboard.')
        parser.add_argument(
            '--update',
            action='store_true',
            help='Overwrite rows that already exist. Off by default so a re-run is safe.',
        )

    def handle(self, *args, **options):
        if options['file']:
            with open(options['file'], encoding='utf-8') as handle:
                rows = json.load(handle)
            if not isinstance(rows, list):
                self.stderr.write('Expected a JSON array.')
                return
        else:
            rows = SEED

        created = updated = skipped = 0

        for row in rows:
            company = (row.get('company') or '').strip()
            role = (row.get('role') or '').strip()
            if not company:
                skipped += 1
                continue

            contact = (row.get('contact') or '').strip()
            fields = {
                # The tracker's "contact" is sometimes a person's name, not an address.
                'name': contact if '@' not in contact and contact else company,
                'email': contact if '@' in contact else '',
                'company': company,
                'role': role,
                'location': (row.get('location') or '')[:150],
                'apply_url': (row.get('link') or '')[:200],
                'website': (row.get('link') or '')[:200],
                'tags': ', '.join(row.get('tags') or [])[:300],
                'notes': row.get('notes') or '',
                'stage': STAGE_MAP.get(row.get('stage'), 'new'),
                'source': CHANNEL_MAP.get(row.get('channel'), 'other'),
                'last_contacted_at': _as_datetime(row.get('date')),
                'replied_at': _as_datetime(row.get('reply')),
            }

            existing = Lead.objects.filter(
                company__iexact=company, role__iexact=role
            ).first()

            if existing and not options['update']:
                skipped += 1
                continue
            if existing:
                for key, value in fields.items():
                    setattr(existing, key, value)
                existing.save()
                updated += 1
                continue

            lead = Lead.objects.create(**fields)
            Activity.objects.create(
                lead=lead,
                kind='created',
                summary='Imported from the internship pipeline tracker',
                body=fields['notes'],
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                'Pipeline import: %d created, %d updated, %d skipped (%d leads total).'
                % (created, updated, skipped, Lead.objects.count())
            )
        )
