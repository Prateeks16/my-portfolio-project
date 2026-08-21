"""Prepare the CRM for use: an admin login and a starter set of outreach templates.

Safe to run repeatedly - everything is get_or_create, so it never clobbers edits.

    python manage.py bootstrap_crm --username prateek --password '...'
    python manage.py bootstrap_crm --pull-live   # also copy content from the live API
"""

import json
import os
import urllib.request

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.models import Achievement, Experience, Profile, Project
from crm.models import EmailTemplate
from crm.outreach_templates import TEMPLATES as RESUME_MATCHED_TEMPLATES

LIVE_API = 'https://my-portfolio-backend-awei.onrender.com/api'

TEMPLATES = [
    {
        'name': 'Recruiter - Inbound Reply',
        'category': 'Recruiting',
        'description': 'Reply to a recruiter who reached out first.',
        'subject': 'Re: {{role}} at {{company}}',
        'body': (
            'Hi {{first_name}},\n\n'
            'Thanks for reaching out about the {{role}} role at {{company}} - I\'d be glad '
            'to learn more.\n\n'
            'A quick sense of where I am: I\'m a CS undergrad at Galgotias (B.Tech, 2027) '
            'working across backend and applied ML. Most recently I was an ML & LLM Data '
            'Scientist intern at Red Panda Games, where I built text-to-3D biome generation '
            'pipelines with SDXL, Hunyuan3D, FastAPI and AWS. Alongside that I\'ve shipped '
            'KisanGPT, a RAG advisory system over 3.5L+ agricultural queries using Qdrant '
            'and Gemini.\n\n'
            'Portfolio: {{my_portfolio}}\n'
            'GitHub: {{my_github}}\n\n'
            'Would a short call this week or next work for you?\n\n'
            'Best,\n{{my_name}}'
        ),
    },
    {
        'name': 'Cold Outreach - Backend / ML Role',
        'category': 'Job Search',
        'description': 'First-touch email to a hiring manager or engineer.',
        'subject': 'Backend + ML engineer interested in {{company}}',
        'body': (
            'Hi {{first_name}},\n\n'
            'I came across {{company}} and wanted to introduce myself. I\'m {{my_name}}, a '
            'backend and machine-learning engineer who likes problems where the pipeline '
            'matters as much as the model.\n\n'
            'Two things I\'ve built that might be relevant:\n\n'
            '- KisanGPT: a bilingual RAG advisory system (Qdrant + Gemini) answering farmer '
            'queries over 3.5L+ KCC records. Placed 3rd of 200+ teams at Smart India '
            'Hackathon 2025.\n'
            '- A text-to-image-to-3D asset pipeline at Red Panda Games using SDXL, '
            'Hunyuan3D, FastAPI and AWS, cutting manual asset creation time substantially.\n\n'
            'If you\'re hiring for {{role}} - or expect to be - I\'d welcome a conversation.\n\n'
            'Portfolio: {{my_portfolio}}\n\n'
            'Thanks for your time,\n{{my_name}}'
        ),
    },
    {
        'name': 'Follow-up - No Reply',
        'category': 'Follow-up',
        'description': 'Gentle nudge roughly a week after the first email.',
        'subject': 'Following up - {{company}}',
        'body': (
            'Hi {{first_name}},\n\n'
            'Just floating this back to the top of your inbox in case it got buried. '
            'Still very interested in {{company}} and happy to work around your schedule '
            'for a short call.\n\n'
            'If the timing isn\'t right, no problem at all - just let me know and I\'ll '
            'check back later in the year.\n\n'
            'Best,\n{{my_name}}'
        ),
    },
    {
        'name': 'Freelance / Client Enquiry Reply',
        'category': 'Client',
        'description': 'Respond to an inbound project enquiry from the contact form.',
        'subject': 'Re: your project enquiry',
        'body': (
            'Hi {{first_name}},\n\n'
            'Thanks for getting in touch about your project. I build backend services '
            '(Django, FastAPI) and applied-ML features - RAG systems, NLP classifiers, '
            'data pipelines - and I\'d be happy to hear more about what you need.\n\n'
            'A few things that would help me scope it:\n'
            '1. What outcome are you trying to reach?\n'
            '2. Is there an existing system this has to fit into?\n'
            '3. What timeline and budget range are you working with?\n\n'
            'You can see previous work at {{my_portfolio}}.\n\n'
            'Best,\n{{my_name}}'
        ),
    },
    {
        'name': 'Thank You - After Interview',
        'category': 'Interview',
        'description': 'Send within 24 hours of an interview.',
        'subject': 'Thank you - {{role}} conversation',
        'body': (
            'Hi {{first_name}},\n\n'
            'Thank you for the time today. I enjoyed the conversation about the {{role}} '
            'role, and it left me more interested in {{company}}, not less.\n\n'
            'If it\'s useful, I\'m happy to share code or walk through any of the systems '
            'we discussed in more detail.\n\n'
            'Looking forward to hearing about next steps.\n\n'
            'Best,\n{{my_name}}'
        ),
    },
    {
        'name': 'Open Source / Collaboration',
        'category': 'Networking',
        'description': 'Reach out to a maintainer or potential collaborator.',
        'subject': 'Contributing to {{company}}',
        'body': (
            'Hi {{first_name}},\n\n'
            'I\'ve been using and reading through {{company}} and would like to contribute.\n\n'
            'My background is backend and ML engineering - Python, Django, FastAPI, Go, '
            'and a fair amount of NLP and RAG work. You can see what I\'ve built at '
            '{{my_github}}.\n\n'
            'Is there an area where an extra pair of hands would actually help? Happy to '
            'start with something small and unglamorous.\n\n'
            'Thanks,\n{{my_name}}'
        ),
    },
]


# Templates whose copy is paired with a specific resume variant.
TEMPLATES += RESUME_MATCHED_TEMPLATES


def _fetch(endpoint):
    request = urllib.request.Request(
        '%s/%s/' % (LIVE_API, endpoint), headers={'User-Agent': 'portfolio-crm'}
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode('utf-8'))


class Command(BaseCommand):
    help = 'Create the CRM admin user, seed outreach templates, optionally pull live content.'

    def add_arguments(self, parser):
        # Values fall back to the environment so this can run from build.sh on
        # hosts where an interactive shell is a paid feature.
        parser.add_argument('--username', default=os.environ.get('CRM_ADMIN_USERNAME', 'prateek'))
        parser.add_argument('--password', default=os.environ.get('CRM_ADMIN_PASSWORD'))
        parser.add_argument('--email', default=os.environ.get('CRM_ADMIN_EMAIL', 'prateeksahu529pvt@gmail.com'))
        parser.add_argument(
            '--pull-live',
            action='store_true',
            help='Copy profile/projects/experience/achievements from the live API.',
        )

    def handle(self, *args, **options):
        self._seed_templates()
        self._seed_user(options)
        if options['pull_live']:
            self._pull_live()
        self.stdout.write(self.style.SUCCESS('CRM bootstrap complete.'))

    def _seed_templates(self):
        created = 0
        for spec in TEMPLATES:
            _, was_created = EmailTemplate.objects.get_or_create(
                name=spec['name'], defaults=spec
            )
            created += int(was_created)
        self.stdout.write('Templates: %d new, %d total.'
                          % (created, EmailTemplate.objects.count()))

    def _seed_user(self, options):
        username = options['username']
        password = options['password']
        user = User.objects.filter(username=username).first()
        if user:
            self.stdout.write('Admin user "%s" already exists.' % username)
            if password:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.WARNING('Password updated.'))
            return
        if not password:
            self.stdout.write(
                self.style.WARNING(
                    'No password supplied (--password or CRM_ADMIN_PASSWORD), so no '
                    'admin user was created. Set CRM_ADMIN_PASSWORD to create "%s".'
                    % username
                )
            )
            return
        User.objects.create_superuser(
            username=username, email=options['email'], password=password
        )
        self.stdout.write(self.style.SUCCESS('Created superuser "%s".' % username))

    def _pull_live(self):
        self.stdout.write('Pulling content from the live API (Render can take ~60s to wake)...')
        try:
            profiles = _fetch('profile')
            projects = _fetch('projects')
            experiences = _fetch('experiences')
            achievements = _fetch('achievements')
        except Exception as exc:
            self.stdout.write(self.style.ERROR('Could not reach the live API: %s' % exc))
            return

        for row in profiles:
            row.pop('id', None)
            Profile.objects.update_or_create(email=row.get('email', ''), defaults=row)
        for row in projects:
            row.pop('id', None)
            row.pop('created_at', None)
            Project.objects.update_or_create(title=row['title'], defaults=row)
        for row in experiences:
            row.pop('id', None)
            row.pop('tech_stack', None)
            Experience.objects.update_or_create(
                company_name=row['company_name'], position=row['position'], defaults=row
            )
        for row in achievements:
            row.pop('id', None)
            Achievement.objects.update_or_create(title=row['title'], defaults=row)

        self.stdout.write(
            self.style.SUCCESS(
                'Pulled %d profile, %d projects, %d experiences, %d achievements.'
                % (len(profiles), len(projects), len(experiences), len(achievements))
            )
        )
