"""Import the 21 Aug 2026 application batch from the weekday scan.

Everything here came from the scan report and the follow-up pack, including the
caveats — a stipend that was never confirmed, a repost that probably goes
nowhere, and an eligibility clause worth checking before spending an evening on
the form. Those live in the notes rather than being quietly dropped, because the
whole point of the board is to not rediscover them later.

Matching is on (company, role); existing rows are skipped unless --update.
"""

import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from crm.models import Activity, Lead

APPLIED_ON = '2026-08-21'

# stage: 'applied' means the form went in. 'new' means it is still on you.
BATCH = [
    {
        'company': 'Amazon', 'role': 'SDE Intern 2027', 'stage': 'applied',
        'source': 'application_form', 'location': 'India (Delhi listed)',
        'link': 'https://www.amazon.jobs/en/jobs/10488368',
        'tags': ['SDE', 'DSA', 'CS fundamentals'],
        'notes': 'Explicitly scoped to 2027 grads. University reqs close on volume '
                 'rather than a published date, so early submission is the whole '
                 'advantage. Job id 10488368.',
    },
    {
        'company': 'SkillsCapital', 'role': 'Full-Stack AI/ML Intern', 'stage': 'applied',
        'source': 'job_board', 'location': 'Remote',
        'link': 'https://internshala.com/internship/detail/work-from-home-software-engineer-full-stack-ai-ml-global-ai-native-tech-talent-venture-internship-at-skillscapital1787050567',
        'tags': ['Full-stack', 'AI/ML', 'Vector DBs', 'Embeddings', 'Agents'],
        'deadline': '2026-09-17',
        'notes': 'Stipend Rs 20-30k/month. Hard deadline 17 Sep 2026. Names vector '
                 'DBs, embeddings and agents - closest listing to the KisanGPT work.',
    },
    {
        'company': 'SuperKalam', 'role': 'Engineering Intern (LLM/RAG)', 'stage': 'applied',
        'source': 'job_board', 'location': 'Remote (India)',
        'link': 'https://www.workatastartup.com/jobs/64551',
        'tags': ['LLM', 'RAG', 'Python'],
        'notes': 'YC company. Stipend Rs 28-40k/month. Sends a 3-4 day take-home - '
                 'start it on a weekend you control.',
    },
    {
        'company': 'Peakflo', 'role': 'ML Engineer Intern', 'stage': 'applied',
        'source': 'job_board', 'location': 'Remote (India)',
        'link': 'https://www.workatastartup.com/jobs/90065',
        'tags': ['LLM', 'RAG', 'ML'],
        'notes': 'YC company. Rs 4.8-6L. Asks for 0.5-2 years ML experience, so the '
                 'Red Panda Games internship has to lead - projects alone will not '
                 'clear that bar.',
    },
    {
        'company': 'AI47Labs', 'role': 'AI Engineer Intern', 'stage': 'applied',
        'source': 'job_board', 'location': 'Noida',
        'link': 'https://wellfound.com/jobs/3976469-ai-engineer-intern',
        'tags': ['AI', 'LLM'],
        'notes': 'One of two separate reqs at this company - both were applied to.',
    },
    {
        'company': 'AI47Labs', 'role': 'Full Stack Engineer Intern', 'stage': 'applied',
        'source': 'job_board', 'location': 'Noida or remote',
        'link': '',
        'tags': ['Full-stack'],
        'notes': 'Second req, posted about a month ago. Different opening from the AI '
                 'Engineer one, same company.',
    },
    {
        'company': 'Vellaration', 'role': 'Backend Developer Intern (Python/FastAPI)',
        'stage': 'applied', 'source': 'job_board', 'location': 'Remote',
        'link': 'https://wellfound.com/jobs/4379458-backend-developer-intern-python-fastapi',
        'tags': ['Python', 'FastAPI', 'Backend'],
        'notes': 'Stipend was never confirmed on the listing - worth pinning down '
                 'before investing time in a later round.',
    },
    {
        'company': 'TrueFoundry', 'role': 'Software Engineer Backend Intern',
        'stage': 'contacted', 'source': 'linkedin', 'location': 'Remote',
        'link': 'https://wellfound.com/jobs/2153913-software-engineer-backend-intern-remote',
        'tags': ['Backend', 'Python'],
        'notes': 'Not an application: the req is a six-month-old repost and "actively '
                 'hiring" on Wellfound is a company-level badge, not per-role, so the '
                 'form likely goes nowhere. Reached out to their engineering team on '
                 'LinkedIn instead. Rs 45-55k stipend justified the message.',
    },
    # --- still open on your side -------------------------------------------
    {
        'company': 'Microsoft', 'role': 'Software Engineering Intern (2027 batch)',
        'stage': 'new', 'source': 'application_form', 'location': 'Noida',
        'link': 'https://apply.careers.microsoft.com/careers/job/1970393556911730',
        'tags': ['DSA', 'CS fundamentals', 'SDE'],
        'no_contact_date': True,
        'notes': 'NOT YET APPLIED. Check eligibility first: an aggregator listing '
                 'says candidates need at least one academic semester remaining '
                 'after the internship ends. Graduating April 2027 means a mid-2027 '
                 'internship leaves nothing after it. That clause came from a third '
                 'party, not Microsoft, so read the official req before spending the '
                 '20 minutes.\n\nIf eligible: set location preference to Noida, '
                 'upload the LaTeX resume (not the Internshala profile) and confirm '
                 'Red Panda Games is on the PDF. Screen is DS-algo, nothing to tailor.',
    },
]

# EaseOps already exists from the earlier import; this only moves it forward.
EASEOPS_NOTE = (
    'Follow-up drafted 21 Aug citing their live Wellfound Backend Intern req '
    '(wellfound.com/jobs/2878516-backend-intern). Weaker than it first looked: '
    'Rs 1-2L annually, asks for 1 year experience, and lists Eastern European / '
    'Turkey / Dubai timezones for a Bangalore company. Worth the five-minute '
    'follow-up since the thread is already open, but rank it last.'
)


def _dt(value, hour=10):
    if not value:
        return None
    date = datetime.date.fromisoformat(value)
    return timezone.make_aware(
        datetime.datetime.combine(date, datetime.time(hour, 0)),
        datetime.timezone.utc,
    )


class Command(BaseCommand):
    help = 'Import the 21 Aug 2026 application batch.'

    def add_arguments(self, parser):
        parser.add_argument('--update', action='store_true')

    def handle(self, *args, **options):
        created = updated = skipped = 0

        for row in BATCH:
            existing = Lead.objects.filter(
                company__iexact=row['company'], role__iexact=row['role']
            ).first()
            if existing and not options['update']:
                skipped += 1
                continue

            fields = {
                'name': row['company'],
                'company': row['company'],
                'role': row['role'],
                'stage': row['stage'],
                'source': row['source'],
                'location': row['location'][:150],
                'apply_url': row['link'][:200],
                'website': row['link'][:200],
                'tags': ', '.join(row['tags'])[:300],
                'notes': row['notes'],
                'posted_at': datetime.date.fromisoformat(APPLIED_ON),
                # Anything not yet sent has no contact date, so it must not show
                # up in the "needs a nudge" queue.
                'last_contacted_at': None if row.get('no_contact_date') else _dt(APPLIED_ON),
                'next_follow_up_at': _dt(row['deadline']) if row.get('deadline') else None,
            }

            if existing:
                for key, value in fields.items():
                    setattr(existing, key, value)
                existing.save()
                updated += 1
                continue

            lead = Lead.objects.create(**fields)
            Activity.objects.create(
                lead=lead,
                kind='created' if row['stage'] == 'new' else 'note',
                summary=(
                    'Applied %s' % APPLIED_ON
                    if row['stage'] == 'applied'
                    else 'Added from the 21 Aug scan'
                ),
                body=row['notes'],
            )
            created += 1

        # EaseOps: move the existing row on rather than duplicating it.
        easeops = Lead.objects.filter(company__icontains='EaseOps').first()
        if easeops:
            if EASEOPS_NOTE not in (easeops.notes or ''):
                easeops.notes = ('%s\n\n%s' % (easeops.notes or '', EASEOPS_NOTE)).strip()
                easeops.next_follow_up_at = _dt(APPLIED_ON, hour=12)
                easeops.save()
                Activity.objects.create(
                    lead=easeops,
                    kind='note',
                    summary='Follow-up drafted, citing their live Wellfound req',
                    body=EASEOPS_NOTE,
                )
                self.stdout.write('EaseOps: follow-up note attached.')

        self.stdout.write(
            self.style.SUCCESS(
                'Batch 2027: %d created, %d updated, %d skipped (%d leads total).'
                % (created, updated, skipped, Lead.objects.count())
            )
        )
