"""Supporting services for the CRM: outbound mail, analytics rollups, GitHub stats."""

import datetime
import json
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import Activity, Lead, OutreachEmail, PageView, TrackedEvent


class MailNotConfigured(Exception):
    """Raised when a send is attempted without SMTP credentials in the environment."""


def mail_is_configured():
    return bool(getattr(settings, 'EMAIL_HOST_USER', '') and
                getattr(settings, 'EMAIL_HOST_PASSWORD', ''))


def send_outreach_email(email):
    """Actually transmit an OutreachEmail.

    Deliberately explicit: this is only ever called from the `send` action on the
    viewset, one email at a time, and it refuses to run unless real credentials
    are present. Drafting never touches this function.
    """
    if not mail_is_configured():
        raise MailNotConfigured(
            'No SMTP credentials found. Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD '
            'in the backend environment to enable sending. The draft has been saved.'
        )

    from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
    connection = get_connection()

    # Plain text is the source of truth; the HTML part is a light wrapper so the
    # message renders with paragraph breaks in most clients.
    html_body = '<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">%s</div>' % (
        email.body.replace('\n', '<br/>')
    )

    message = EmailMultiAlternatives(
        subject=email.subject,
        body=email.body,
        from_email=from_email,
        to=[email.to_email],
        connection=connection,
    )
    message.attach_alternative(html_body, 'text/html')
    message.send(fail_silently=False)

    email.status = 'sent'
    email.sent_at = timezone.now()
    email.error_message = ''
    email.save(update_fields=['status', 'sent_at', 'error_message', 'updated_at'])

    if email.lead:
        email.lead.last_contacted_at = email.sent_at
        if email.lead.stage == 'new':
            email.lead.stage = 'contacted'
        email.lead.save(update_fields=['last_contacted_at', 'stage', 'updated_at'])
        Activity.objects.create(
            lead=email.lead,
            kind='email_sent',
            summary='Sent: %s' % email.subject,
            body=email.body,
        )
    return email


def analytics_overview(days=30):
    """Aggregate page views and events into the shape the dashboard charts expect."""
    since = timezone.now() - datetime.timedelta(days=days)

    views = PageView.objects.filter(created_at__gte=since)
    total_views = views.count()
    unique_visitors = (
        views.exclude(session_id='').values('session_id').distinct().count()
    )

    by_day = (
        views.annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    # Fill gaps so the chart has a continuous x-axis rather than skipping quiet days.
    counts = {row['day'].isoformat(): row['count'] for row in by_day}
    today = timezone.now().date()
    timeseries = []
    for offset in range(days - 1, -1, -1):
        day = (today - datetime.timedelta(days=offset)).isoformat()
        timeseries.append({'date': day, 'views': counts.get(day, 0)})

    top_pages = list(
        views.values('path').annotate(count=Count('id')).order_by('-count')[:10]
    )
    referrers = list(
        views.exclude(referrer='')
        .values('referrer')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    devices = list(
        views.exclude(device='')
        .values('device')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    events = list(
        TrackedEvent.objects.filter(created_at__gte=since)
        .values('name')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    return {
        'days': days,
        'total_views': total_views,
        'unique_visitors': unique_visitors,
        'timeseries': timeseries,
        'top_pages': top_pages,
        'referrers': referrers,
        'devices': devices,
        'events': events,
    }


def pipeline_summary():
    """Counts per stage, plus the handful of numbers the overview cards show."""
    stage_counts = {row['stage']: row['count'] for row in
                    Lead.objects.values('stage').annotate(count=Count('id'))}
    stages = [
        {'stage': key, 'label': label, 'count': stage_counts.get(key, 0)}
        for key, label in Lead.STAGE_CHOICES
    ]
    now = timezone.now()
    return {
        'stages': stages,
        'total_leads': Lead.objects.count(),
        'due_follow_ups': Lead.objects.filter(
            next_follow_up_at__lte=now
        ).exclude(stage__in=['won', 'lost']).count(),
        'drafts': OutreachEmail.objects.filter(status='draft').count(),
        'sent': OutreachEmail.objects.filter(status='sent').count(),
    }


def github_stats(username='Prateeks16'):
    """Pull live repo stats. Returns an `error` key rather than raising, so a
    rate-limited or offline GitHub never takes the dashboard down."""
    url = 'https://api.github.com/users/%s/repos?per_page=100&sort=pushed' % username
    request = urllib.request.Request(
        url, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'portfolio-crm'}
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            repos = json.loads(response.read().decode('utf-8'))
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError, TimeoutError) as exc:
        return {'error': str(exc), 'repos': [], 'languages': [], 'totals': {}}

    owned = [r for r in repos if not r.get('fork')]
    languages = {}
    for repo in owned:
        lang = repo.get('language')
        if lang:
            languages[lang] = languages.get(lang, 0) + 1

    return {
        'error': None,
        'totals': {
            'public_repos': len(repos),
            'owned_repos': len(owned),
            'forks': len(repos) - len(owned),
            'stars': sum(r.get('stargazers_count', 0) for r in repos),
        },
        'languages': sorted(
            [{'name': k, 'count': v} for k, v in languages.items()],
            key=lambda item: item['count'],
            reverse=True,
        ),
        'repos': [
            {
                'name': r['name'],
                'description': r.get('description') or '',
                'language': r.get('language'),
                'stars': r.get('stargazers_count', 0),
                'forks': r.get('forks_count', 0),
                'pushed_at': r.get('pushed_at'),
                'html_url': r.get('html_url'),
                'topics': r.get('topics', []),
            }
            for r in owned[:30]
        ],
    }
