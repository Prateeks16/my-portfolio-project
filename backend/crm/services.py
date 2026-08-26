"""Supporting services for the CRM: outbound mail, analytics rollups, GitHub stats."""

import datetime
import html as html_module
import logging
import json
import smtplib
import urllib.error
import urllib.request
from email.utils import formataddr, make_msgid

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from . import gmail_api
from .models import Activity, Lead, OutreachEmail, PageView, TrackedEvent


logger = logging.getLogger(__name__)


class MailNotConfigured(Exception):
    """Raised when a send is attempted without usable credentials in the environment."""


def mail_is_configured():
    # Which credentials count depends on the transport. With the Gmail API
    # selected an App Password proves nothing -- the OAuth client and refresh
    # token are what sending needs -- and reporting "configured" on the strength
    # of the wrong credential is how a dashboard ends up lying about itself.
    if gmail_api.is_selected():
        return gmail_api.is_configured()
    return bool(getattr(settings, 'EMAIL_HOST_USER', '') and
                getattr(settings, 'EMAIL_HOST_PASSWORD', ''))


def _not_configured_message():
    if gmail_api.is_selected():
        return '%s The draft has been saved.' % gmail_api.NOT_CONFIGURED
    return (
        'No SMTP credentials found. Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD '
        'in the backend environment to enable sending. The draft has been saved.'
    )


def _html_body(text):
    """Wrap the plain-text body in minimal HTML.

    Escaped first: an unescaped angle bracket in the message would otherwise be
    swallowed as markup by the receiving client.
    """
    escaped = html_module.escape(text or '')
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,'
        'Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;'
        'color:#1a1a1a">%s</div>' % escaped.replace('\n', '<br/>')
    )


def send_outreach_email(email):
    """Actually transmit an OutreachEmail.

    Deliberately explicit: this is only ever called from the `send` action on the
    viewset, one email at a time, and it refuses to run unless real credentials
    are present. Drafting never touches this function.

    The message is stamped with a Message-ID that is saved alongside the row,
    which is what lets an inbound reply be matched back to it. Gmail overwrites
    that header with its own, so what gets saved is the value read back after
    the send, not the one minted before it. When the email answers something,
    In-Reply-To and References go out with it so Gmail files it in the existing
    conversation instead of starting a new one.
    """
    if not mail_is_configured():
        raise MailNotConfigured(_not_configured_message())

    address = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
    from_name = getattr(settings, 'DEFAULT_FROM_NAME', '')
    # A display name is the difference between "a person wrote to me" and
    # "something automated did".
    from_email = formataddr((from_name, address)) if from_name else address

    # Minted here rather than left to the SMTP server, because the value has to
    # be known locally for reply matching to work at all.
    if not email.message_id:
        email.message_id = make_msgid(domain=address.split('@')[-1] or None)

    headers = {'Message-ID': email.message_id}
    if email.in_reply_to:
        headers['In-Reply-To'] = email.in_reply_to
        headers['References'] = email.references or email.in_reply_to
    reply_to = getattr(settings, 'REPLY_TO_EMAIL', '')

    message = EmailMultiAlternatives(
        subject=email.subject,
        body=email.body,
        from_email=from_email,
        to=[formataddr((email.to_name, email.to_email)) if email.to_name
            else email.to_email],
        connection=get_connection(),
        headers=headers,
        reply_to=[reply_to] if reply_to else None,
    )
    message.attach_alternative(_html_body(email.body), 'text/html')
    try:
        message.send(fail_silently=False)
    except smtplib.SMTPAuthenticationError as exc:
        # Same credentials as IMAP, so the same advice applies. Raised as a
        # configuration problem rather than a send failure, because retrying
        # the draft will not help until the password is fixed.
        raise MailNotConfigured(
            'Gmail rejected the credentials for %s. Check that 2-Step '
            'Verification is on, that EMAIL_HOST_PASSWORD is a 16-character '
            'App Password (not the account password), and that it was created '
            'under this same Google account. Original error: %s'
            % (address, exc)
        ) from exc
    except gmail_api.GmailAuthError as exc:
        # The same class of problem as a rejected App Password, so it gets the
        # same treatment: the draft survives and resending is pointless until
        # the token is replaced. A refresh token dies on a Google password
        # change, on revocation, and seven days out if the OAuth app is still
        # in "Testing" publishing status -- that last one catches people.
        raise MailNotConfigured(
            'Google rejected the Gmail API credentials for %s. Re-run '
            '"python manage.py gmail_authorize" locally and update '
            'GMAIL_REFRESH_TOKEN in the backend environment. Original error: %s'
            % (address, exc)
        ) from exc

    # Gmail overwrites the Message-ID header on send, so the value minted above
    # is not the one the recipient's client will quote back in In-Reply-To.
    # When the transport can tell us what actually went out, that is what gets
    # stored -- otherwise every reply would fail to match the email it answers.
    actual_message_id = getattr(message, 'sent_message_id', '')
    if actual_message_id:
        email.message_id = actual_message_id

    email.status = 'sent'
    email.sent_at = timezone.now()
    email.error_message = ''
    email.save(update_fields=[
        'status', 'sent_at', 'error_message', 'message_id', 'updated_at',
    ])

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


def notify_contact_submission(submission):
    """Forward a contact-form message into the mailbox as real email.

    The submission is already stored and visible in the dashboard Inbox; this is
    so it also lands in Gmail, where you actually notice things. Sent from the
    account to itself, with Reply-To set to whoever wrote in -- so hitting Reply
    in Gmail answers them, not you.

    Never raises. The message is saved before this runs, and a visitor should
    not see their form fail because a notification could not go out.
    """
    if not mail_is_configured():
        return False

    # The IMAP account first: this notification is meant to land in the mailbox
    # the CRM syncs, and DEFAULT_FROM_EMAIL is only a fallback for a setup that
    # sends through the Gmail API without an App Password configured at all.
    address = settings.EMAIL_HOST_USER or settings.DEFAULT_FROM_EMAIL
    body = (
        'From: %s <%s>\n'
        'Subject: %s\n'
        '\n'
        '%s\n'
        '\n'
        '--\n'
        'Sent from the contact form on %s\n'
        'Reply to this email to answer them directly.'
    ) % (
        submission.name,
        submission.email,
        submission.subject,
        submission.message,
        getattr(settings, 'PORTFOLIO_URL', 'https://prateeks16.in'),
    )

    try:
        message = EmailMultiAlternatives(
            # Prefixed so it can be filtered and starred in Gmail on sight.
            subject='[Portfolio] %s' % submission.subject,
            body=body,
            from_email=address,
            to=[address],
            # The whole point: Reply in Gmail goes to the visitor.
            reply_to=[formataddr((submission.name, submission.email))],
            connection=get_connection(),
        )
        message.attach_alternative(_html_body(body), 'text/html')
        message.send(fail_silently=False)
    except Exception:
        logger.exception('Contact notification failed for submission %s', submission.pk)
        return False
    return True


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
