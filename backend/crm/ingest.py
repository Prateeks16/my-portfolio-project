"""Ingest endpoint for the scheduled job scan.

The scan runs in a Cowork cloud sandbox on a fresh session every weekday, so it
cannot hold a login. It authenticates with a single-purpose token instead of a
JWT: this endpoint only ever creates or updates job-scan leads, so a leaked
token cannot read the pipeline, send mail, or touch published content.

Rows are matched on (company, role) so a rerun updates the existing entry rather
than filling the board with duplicates. Anything already moved past 'new' keeps
its stage — the scan reports postings, it does not overrule your progress.
"""

import hmac

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Activity, Lead

# Stage names the Cowork board uses, mapped onto this pipeline.
STAGE_ALIASES = {
    'lead': 'new',
    'new': 'new',
    'outreach sent': 'contacted',
    'outreach_sent': 'contacted',
    'contacted': 'contacted',
    'applied': 'applied',
    'replied': 'replied',
    'interview': 'interviewing',
    'interviewing': 'interviewing',
    'offer': 'offer',
    'closed': 'lost',
    'won': 'won',
    'lost': 'lost',
}

# Stages that represent real progress. The scan never moves a lead back out of one.
PROTECTED = {'contacted', 'applied', 'replied', 'interviewing', 'offer', 'won', 'lost'}


def _authorised(request):
    expected = getattr(settings, 'CRM_INGEST_TOKEN', '')
    if not expected:
        return False
    supplied = request.headers.get('X-Ingest-Token', '')
    # Constant-time compare so the token cannot be recovered by timing.
    return hmac.compare_digest(supplied, expected)


def _clean(value, limit):
    return str(value or '').strip()[:limit]


@api_view(['POST'])
@permission_classes([AllowAny])
def ingest_opportunities(request):
    """Accept a batch of job postings and upsert them as leads.

    Body: {"items": [{company, role, apply_url, location, stack[], stage,
                      deadline, posted_at, email, notes, source_board}]}
    """
    if not _authorised(request):
        return Response(
            {'detail': 'Invalid or missing ingest token.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    items = request.data.get('items')
    if not isinstance(items, list):
        return Response(
            {'detail': 'Expected an "items" array.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    created, updated, skipped = 0, 0, 0

    for item in items[:200]:
        if not isinstance(item, dict):
            skipped += 1
            continue

        company = _clean(item.get('company'), 200)
        role = _clean(item.get('role') or item.get('title'), 200)
        if not company or not role:
            skipped += 1
            continue

        stack = item.get('stack') or item.get('tags') or []
        if isinstance(stack, str):
            stack = [part.strip() for part in stack.split(',')]
        tags = ', '.join(filter(None, (str(t).strip() for t in stack)))[:300]

        incoming_stage = STAGE_ALIASES.get(
            str(item.get('stage') or 'new').strip().lower(), 'new'
        )

        lead = Lead.objects.filter(company__iexact=company, role__iexact=role).first()

        fields = {
            'name': _clean(item.get('name') or item.get('contact_name') or company, 200),
            'email': _clean(item.get('email'), 254),
            'company': company,
            'role': role,
            'location': _clean(item.get('location'), 150),
            'apply_url': _clean(item.get('apply_url') or item.get('url'), 200),
            'website': _clean(item.get('apply_url') or item.get('url'), 200),
            'tags': tags,
            'source': 'job_scan',
        }

        posted = item.get('posted_at') or item.get('posted')
        if posted:
            fields['posted_at'] = posted
        deadline = item.get('deadline')
        if deadline:
            fields['next_follow_up_at'] = deadline

        if lead is None:
            fields['stage'] = incoming_stage
            fields['notes'] = _clean(item.get('notes'), 4000)
            lead = Lead.objects.create(**fields)
            Activity.objects.create(
                lead=lead,
                kind='created',
                summary='Found by the weekday job scan',
                body=fields['notes'],
            )
            created += 1
            continue

        # Never drag a lead backwards: if you have already applied or replied,
        # a fresh sighting of the same posting must not reset it to 'new'.
        if lead.stage not in PROTECTED:
            fields['stage'] = incoming_stage
        for key, value in fields.items():
            # Only fill blanks; anything edited in the CRM wins over the scan.
            if value and not getattr(lead, key, None):
                setattr(lead, key, value)
            elif key in ('apply_url', 'website', 'location', 'tags') and value:
                setattr(lead, key, value)
        if 'stage' in fields:
            lead.stage = fields['stage']
        lead.save()
        updated += 1

    return Response(
        {'created': created, 'updated': updated, 'skipped': skipped},
        status=status.HTTP_200_OK,
    )
