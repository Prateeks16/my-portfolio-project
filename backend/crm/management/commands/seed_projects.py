"""Seed portfolio projects that exist on the resume but not yet in the database.

Runs from build.sh because an interactive shell is a paid feature on Render.
Matching is on title with get_or_create, so this never overwrites an edit made
in the CRM afterwards, and re-running on every deploy is a no-op.

Copy here is taken from the resume; nothing is embellished. Projects with no
screenshot are left without one rather than given a placeholder, and the
portfolio lays those out as full-width text.
"""

import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Project

PROJECTS = [
    {
        'title': 'Cappy — Hinglish AI Caption Studio',
        'short_description': (
            'A browser-based AI caption editor for ten Indian languages, merging two '
            'speech-recognition engines into per-word captions and rendering video '
            'entirely client-side.'
        ),
        'description': (
            'Cappy is a caption studio that runs in the browser. It merges dual ASR '
            'engines — Sarvam for text and Gladia for timings — using Needleman–Wunsch '
            'sequence alignment, then applies Devanagari–Latin transliteration to '
            'produce accurate per-word captions across 10 Indian languages.\n\n'
            'The render pipeline carries no server cost: Remotion drives the preview, '
            'captions are burned in on canvas, and ffmpeg.wasm transcodes the final MP4 '
            'in the browser rather than on a backend.\n\n'
            'On top of that sits a CapCut-style timeline editor with 32 templates. It is '
            'deployed on Vercel, with serverless functions used only as thin proxies to '
            'keep API keys off the client.'
        ),
        'tech_stack': '["Next.js", "React", "Remotion", "FFmpeg (WASM)", "Vercel"]',
        'github_url': '',
        'live_demo_url': '',
        'created_at': datetime.datetime(2026, 7, 20, tzinfo=datetime.timezone.utc),
    },
    {
        'title': 'HookGuard — Webhook Signature Gateway',
        'short_description': (
            'A zero-dependency Go gateway that verifies inbound webhook signatures for '
            'four providers behind a single pluggable interface, forwarding only '
            'authenticated traffic.'
        ),
        'description': (
            'HookGuard sits in front of an application and refuses any webhook it cannot '
            'cryptographically verify. Stripe, Shopify, GitHub and PayPal are each '
            'handled behind one pluggable Verifier interface, so adding a provider does '
            'not touch the gateway itself.\n\n'
            'Verification is constant-time HMAC-SHA256 computed over the raw request '
            'body, which is what prevents both signature bypass and timing attacks. '
            'PayPal additionally requires RSA-SHA256 against a fetched certificate, so '
            'that path carries an SSRF guard on the fetch.\n\n'
            'It is written in Go with no third-party dependencies, covered by '
            'table-driven unit tests per provider, and ships via Docker Compose.'
        ),
        'tech_stack': '["Go", "HMAC-SHA256", "RSA-SHA256", "Docker"]',
        'github_url': 'https://github.com/Prateeks16/hookguard',
        'live_demo_url': '',
        'created_at': datetime.datetime(2026, 6, 20, tzinfo=datetime.timezone.utc),
    },
    {
        'title': 'High-Throughput Flash Sale Engine',
        'short_description': (
            'An event-driven Spring Boot backend sustaining 10,000+ transactions per '
            'second under 5ms latency, with Redis atomic locking guaranteeing zero '
            'overselling.'
        ),
        'description': (
            'A flash sale is a worst-case concurrency problem: thousands of buyers '
            'contend for a small, fixed stock in the same second. This engine handles '
            '10,000+ TPS at under 5ms latency, using Redis atomic locking to keep stock '
            'counts perfectly consistent and make overselling impossible.\n\n'
            'Writes are decoupled through Apache Kafka so PostgreSQL never absorbs the '
            'traffic spike directly, and endpoints are protected with Bucket4j rate '
            'limiting.\n\n'
            'The stack is instrumented with Prometheus and Grafana and containerised end '
            'to end with Docker Compose.'
        ),
        'tech_stack': '["Java", "Spring Boot", "Redis", "Apache Kafka", "PostgreSQL", "Docker"]',
        'github_url': 'https://github.com/Prateeks16/high-performance-flashsale',
        'live_demo_url': '',
        'created_at': datetime.datetime(2026, 2, 15, tzinfo=datetime.timezone.utc),
    },
]


class Command(BaseCommand):
    help = 'Add resume projects that are missing from the database. Idempotent.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update',
            action='store_true',
            help='Also refresh the copy on projects that already exist.',
        )

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for spec in PROJECTS:
            fields = dict(spec)
            created_at = fields.pop('created_at')
            title = fields['title']

            project, created = Project.objects.get_or_create(title=title, defaults=fields)

            if created:
                # created_at is auto_now_add, so it can only be set after the fact.
                # Ordering is by -created_at, and dating each project to when it was
                # actually built keeps the public list honestly chronological.
                Project.objects.filter(pk=project.pk).update(created_at=created_at)
                created_count += 1
                self.stdout.write(self.style.SUCCESS('added: %s' % title))
            elif options['update']:
                for key, value in fields.items():
                    setattr(project, key, value)
                project.save()
                updated_count += 1
                self.stdout.write(self.style.WARNING('updated: %s' % title))
            else:
                self.stdout.write('exists, left alone: %s' % title)

        self.stdout.write(
            self.style.SUCCESS(
                'Projects: %d added, %d updated, %d total.'
                % (created_count, updated_count, Project.objects.count())
            )
        )
