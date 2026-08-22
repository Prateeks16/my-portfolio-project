from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import Achievement, Experience, Profile, Project, Skill, SkillCategory
from api.serializers import (
    AchievementSerializer,
    ExperienceSerializer,
    ProfileSerializer,
    ProjectSerializer,
    SkillCategorySerializer,
    SkillSerializer,
)

from .mailbox import MailboxNotConfigured, mailbox_is_configured, sync_mailbox
from .models import (
    Activity,
    EmailTemplate,
    InboundEmail,
    Lead,
    MailSyncLog,
    OutreachEmail,
    PageView,
    Task,
    TrackedEvent,
)
from .serializers import (
    ActivitySerializer,
    EmailTemplateSerializer,
    InboundEmailListSerializer,
    InboundEmailSerializer,
    LeadDetailSerializer,
    LeadSerializer,
    MailSyncLogSerializer,
    OutreachEmailSerializer,
    TaskSerializer,
    TrackSerializer,
)
from .services import (
    MailNotConfigured,
    analytics_overview,
    github_stats,
    mail_is_configured,
    pipeline_summary,
    send_outreach_email,
)


def _device_from_user_agent(user_agent):
    agent = (user_agent or '').lower()
    if any(token in agent for token in ['ipad', 'tablet']):
        return 'tablet'
    if any(token in agent for token in ['mobi', 'android', 'iphone']):
        return 'mobile'
    return 'desktop'


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LeadDetailSerializer
        return LeadSerializer

    def get_queryset(self):
        queryset = Lead.objects.all()
        params = self.request.query_params

        stage = params.get('stage')
        if stage:
            queryset = queryset.filter(stage=stage)

        source = params.get('source')
        if source:
            queryset = queryset.filter(source=source)

        search = params.get('search')
        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(company__icontains=search)
                | Q(role__icontains=search)
                | Q(tags__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        lead = serializer.save()
        Activity.objects.create(
            lead=lead, kind='created', summary='Lead created (%s)' % lead.get_source_display()
        )

    def perform_update(self, serializer):
        previous_stage = self.get_object().stage
        lead = serializer.save()
        if lead.stage != previous_stage:
            Activity.objects.create(
                lead=lead,
                kind='stage_change',
                summary='Stage: %s -> %s' % (previous_stage, lead.stage),
            )

    @action(detail=True, methods=['post'])
    def note(self, request, pk=None):
        """Attach a free-text note to the lead's timeline."""
        lead = self.get_object()
        body = (request.data.get('body') or '').strip()
        if not body:
            return Response({'detail': 'A note body is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        activity = Activity.objects.create(
            lead=lead,
            kind=request.data.get('kind', 'note'),
            summary=(request.data.get('summary') or body[:120]),
            body=body,
        )
        return Response(ActivitySerializer(activity).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def pipeline(self, request):
        return Response(pipeline_summary())


class EmailTemplateViewSet(viewsets.ModelViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Render this template against a lead (or ad-hoc context) without saving."""
        template = self.get_object()
        context = _build_context(request.data)
        subject, body = template.render(context)
        return Response({'subject': subject, 'body': body})


def _build_context(data):
    """Assemble placeholder values, preferring an explicit lead when one is given."""
    profile = Profile.objects.first()
    context = {
        'my_name': profile.full_name if profile else 'Prateek Sahu',
        'my_email': profile.email if profile else '',
        'my_github': profile.github_url if profile else '',
        'my_linkedin': profile.linkedin_url if profile else '',
        'my_portfolio': getattr(settings, 'PORTFOLIO_URL', 'https://prateeks16.in'),
        'name': '',
        'company': '',
        'role': '',
    }
    lead_id = data.get('lead')
    if lead_id:
        lead = Lead.objects.filter(pk=lead_id).first()
        if lead:
            # Scanned postings have no contact person, so name falls back to
            # the company. Greeting a company by name reads as a mailmerge
            # failure, so those get a neutral opener instead.
            is_person = bool(lead.name) and lead.name.strip().lower() != lead.company.strip().lower()
            context.update(
                {
                    'name': lead.name,
                    'company': lead.company,
                    'role': lead.role,
                    'first_name': lead.name.split(' ')[0] if is_person else 'there',
                }
            )
    # Anything passed inline wins over the derived values.
    for key in ['name', 'company', 'role', 'first_name']:
        if data.get(key):
            context[key] = data[key]
    context.setdefault('first_name', context['name'].split(' ')[0] if context['name'] else '')
    return context


class OutreachEmailViewSet(viewsets.ModelViewSet):
    queryset = OutreachEmail.objects.all()
    serializer_class = OutreachEmailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = OutreachEmail.objects.all()
        email_status = self.request.query_params.get('status')
        if email_status:
            queryset = queryset.filter(status=email_status)
        return queryset

    def perform_create(self, serializer):
        # Drafts are the only thing creation produces; sending is a separate action.
        email = serializer.save(status=serializer.validated_data.get('status', 'draft'))
        if email.template:
            EmailTemplate.objects.filter(pk=email.template.pk).update(
                times_used=email.template.times_used + 1
            )
        if email.lead:
            Activity.objects.create(
                lead=email.lead,
                kind='email_draft',
                summary='Drafted: %s' % email.subject,
                body=email.body,
            )

    @action(detail=False, methods=['post'])
    def draft(self, request):
        """Compose a draft from a template + lead in one call."""
        template_id = request.data.get('template')
        context = _build_context(request.data)

        subject = request.data.get('subject', '')
        body = request.data.get('body', '')
        template = None
        if template_id:
            template = EmailTemplate.objects.filter(pk=template_id).first()
            if template:
                subject, body = template.render(context)

        lead = Lead.objects.filter(pk=request.data.get('lead')).first()
        to_email = request.data.get('to_email') or (lead.email if lead else '')
        if not to_email:
            return Response({'detail': 'A recipient address is required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        email = OutreachEmail.objects.create(
            lead=lead,
            template=template,
            to_email=to_email,
            to_name=request.data.get('to_name') or (lead.name if lead else ''),
            subject=subject,
            body=body,
            status='draft',
        )
        if template:
            EmailTemplate.objects.filter(pk=template.pk).update(
                times_used=template.times_used + 1
            )
        if lead:
            Activity.objects.create(
                lead=lead, kind='email_draft', summary='Drafted: %s' % subject, body=body
            )
        return Response(OutreachEmailSerializer(email).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Transmit a single draft. Fails loudly and reversibly if SMTP is unset."""
        email = self.get_object()
        if email.status == 'sent':
            return Response({'detail': 'This email was already sent.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            send_outreach_email(email)
        except MailNotConfigured as exc:
            return Response(
                {'detail': str(exc), 'code': 'mail_not_configured'},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as exc:  # network, auth, malformed address
            email.status = 'failed'
            email.error_message = str(exc)
            email.save(update_fields=['status', 'error_message', 'updated_at'])
            return Response({'detail': str(exc), 'code': 'send_failed'},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response(OutreachEmailSerializer(email).data)

    @action(detail=False, methods=['get'])
    def mail_status(self, request):
        """Lets the UI tell the user whether sending is live or draft-only."""
        return Response({
            'configured': mail_is_configured(),
            'receiving': mailbox_is_configured(),
        })


class InboundEmailViewSet(viewsets.ReadOnlyModelViewSet):
    """Real email, mirrored out of Gmail over IMAP.

    Read-only by design: the mailbox is the source of truth and this is a view
    onto it. The only writes are the two local flags (read, archived), which
    exist so triaging in the CRM never disturbs what is unread in Gmail.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = InboundEmailSerializer

    def get_queryset(self):
        queryset = InboundEmail.objects.select_related('lead', 'replies_to')

        if self.request.query_params.get('archived') == 'true':
            queryset = queryset.filter(is_archived=True)
        else:
            queryset = queryset.filter(is_archived=False)

        if self.request.query_params.get('unread') == 'true':
            queryset = queryset.filter(is_read=False)
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)

        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(subject__icontains=search)
                | Q(from_email__icontains=search)
                | Q(from_name__icontains=search)
                | Q(body_text__icontains=search)
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return InboundEmailListSerializer
        return InboundEmailSerializer

    @action(detail=False, methods=['post'])
    def sync(self, request):
        """Pull new mail from Gmail on demand.

        The free-tier backend has no always-on worker, so the dashboard asking
        for a sync is the primary trigger; the management command covers cron.
        """
        try:
            log = sync_mailbox(days=int(request.data.get('days') or 0) or None)
        except MailboxNotConfigured as exc:
            return Response(
                {'detail': str(exc), 'code': 'mailbox_not_configured'},
                status=status.HTTP_409_CONFLICT,
            )
        if not log.ok:
            return Response(
                {'detail': log.error_message, 'code': 'sync_failed',
                 'log': MailSyncLogSerializer(log).data},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(MailSyncLogSerializer(log).data)

    @action(detail=False, methods=['get'])
    def sync_status(self, request):
        """When mail last came in, and whether receiving is switched on at all."""
        latest = MailSyncLog.objects.first()
        return Response({
            'configured': mailbox_is_configured(),
            'unread': InboundEmail.objects.filter(
                is_read=False, is_archived=False
            ).count(),
            'total': InboundEmail.objects.count(),
            'last_sync': MailSyncLogSerializer(latest).data if latest else None,
        })

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Toggle the CRM's own read flag. Gmail is left exactly as it was."""
        message = self.get_object()
        message.is_read = request.data.get('is_read', True) is not False
        message.save(update_fields=['is_read'])
        return Response(InboundEmailSerializer(message).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Hide from the CRM inbox. Nothing is archived or deleted in Gmail."""
        message = self.get_object()
        message.is_archived = request.data.get('is_archived', True) is not False
        message.save(update_fields=['is_archived'])
        return Response(InboundEmailSerializer(message).data)

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """Draft a threaded reply, and optionally send it in the same call.

        Carrying In-Reply-To and References through is what makes Gmail file the
        reply into the conversation it belongs to, on both sides, instead of
        opening a fresh thread the recipient has to mentally re-attach.
        """
        message = self.get_object()
        body = (request.data.get('body') or '').strip()
        if not body:
            return Response({'detail': 'A reply needs a body.'},
                            status=status.HTTP_400_BAD_REQUEST)

        subject = request.data.get('subject') or _reply_subject(message.subject)
        # The full ancestry, this message appended, is what keeps long threads
        # intact rather than only the immediate parent.
        references = ' '.join(
            [part for part in [message.references, message.message_id] if part]
        ).strip()

        email = OutreachEmail.objects.create(
            lead=message.lead,
            to_email=message.from_email,
            to_name=message.from_name,
            subject=subject[:300],
            body=body,
            status='draft',
            in_reply_to=message.message_id,
            references=references,
        )

        if request.data.get('send'):
            try:
                send_outreach_email(email)
            except MailNotConfigured as exc:
                return Response(
                    {'detail': str(exc), 'code': 'mail_not_configured',
                     'email': OutreachEmailSerializer(email).data},
                    status=status.HTTP_409_CONFLICT,
                )
            except Exception as exc:  # network, auth, malformed address
                email.status = 'failed'
                email.error_message = str(exc)
                email.save(update_fields=['status', 'error_message', 'updated_at'])
                return Response(
                    {'detail': str(exc), 'code': 'send_failed',
                     'email': OutreachEmailSerializer(email).data},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            # Replying is the strongest signal there is that it has been read.
            if not message.is_read:
                message.is_read = True
                message.save(update_fields=['is_read'])

        return Response(OutreachEmailSerializer(email).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Turn an unknown sender into a tracked lead, without duplicating."""
        message = self.get_object()
        lead, created = Lead.objects.get_or_create(
            email=message.from_email,
            defaults={
                'name': message.from_name or message.from_email,
                'source': 'email',
                'notes': '%s\n\n%s' % (message.subject, message.snippet),
                'stage': 'replied',
            },
        )
        if created:
            Activity.objects.create(
                lead=lead,
                kind='created',
                summary='Converted from inbound email: %s' % message.subject,
                body=message.body_text,
            )
        # Backfill every message from this sender, not only the one clicked.
        InboundEmail.objects.filter(
            from_email__iexact=message.from_email, lead__isnull=True
        ).update(lead=lead)
        message.refresh_from_db()

        return Response(
            {'lead': LeadSerializer(lead).data, 'created': created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


def _reply_subject(subject):
    """Prefix with Re: unless the subject already carries one."""
    subject = (subject or '').strip()
    if subject.lower().startswith('re:'):
        return subject
    return 'Re: %s' % subject if subject else 'Re:'


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        task = serializer.save()
        if task.is_done and not task.completed_at:
            task.completed_at = timezone.now()
            task.save(update_fields=['completed_at'])
        elif not task.is_done and task.completed_at:
            task.completed_at = None
            task.save(update_fields=['completed_at'])


# --- Authenticated write access to the public portfolio content ---------------

class ManagedProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]


class ManagedProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]


class ManagedExperienceViewSet(viewsets.ModelViewSet):
    queryset = Experience.objects.all()
    serializer_class = ExperienceSerializer
    permission_classes = [IsAuthenticated]


class ManagedAchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [IsAuthenticated]


class ManagedSkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]


class ManagedSkillCategoryViewSet(viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer
    permission_classes = [IsAuthenticated]


# --- Analytics ---------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    """Deliberately trivial: no database work, no serializers.

    This exists so an uptime pinger can keep the Render instance awake cheaply.
    Render's free tier sleeps after ~15 minutes idle and then needs close to a
    minute to cold start, which is what made the portfolio feel slow.
    """
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([AllowAny])
def track(request):
    """Public beacon endpoint called by the portfolio front-end.

    Stores no cookies and no IP address - only a client-generated session id, so
    it stays privacy-preserving while still separating visitors from page views.
    """
    serializer = TrackSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:400]

    if data.get('type') == 'event':
        if not data.get('name'):
            return Response({'detail': 'Event name is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        TrackedEvent.objects.create(
            name=data['name'],
            detail=data.get('detail', ''),
            path=data.get('path', ''),
            session_id=data.get('session_id', ''),
        )
    else:
        PageView.objects.create(
            path=data.get('path') or '/',
            referrer=data.get('referrer', ''),
            session_id=data.get('session_id', ''),
            user_agent=user_agent,
            device=_device_from_user_agent(user_agent),
        )
    return Response({'ok': True}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics(request):
    try:
        days = int(request.query_params.get('days', 30))
    except (TypeError, ValueError):
        days = 30
    days = max(1, min(days, 365))
    return Response(analytics_overview(days))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ingest_status(request):
    """Whether the job-scan ingest token is configured.

    Reports only a boolean, never the token, and requires a login to read - so
    it confirms the wiring without becoming an oracle for probing the secret.
    """
    from .models import Lead

    latest = (
        Lead.objects.filter(source='job_scan').order_by('-created_at').first()
    )
    return Response(
        {
            'configured': bool(getattr(settings, 'CRM_INGEST_TOKEN', '')),
            'scanned_leads': Lead.objects.filter(source='job_scan').count(),
            'last_ingest_at': latest.created_at if latest else None,
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def github(request):
    username = request.query_params.get('username', 'Prateeks16')
    return Response(github_stats(username))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Everything the overview screen needs, in one round trip."""
    from api.models import ContactSubmission

    return Response(
        {
            'pipeline': pipeline_summary(),
            'analytics': analytics_overview(30),
            'content': {
                'projects': Project.objects.count(),
                'experiences': Experience.objects.count(),
                'achievements': Achievement.objects.count(),
                'skills': Skill.objects.count(),
            },
            'inbox': {
                'total': ContactSubmission.objects.count(),
                'recent': list(
                    ContactSubmission.objects.values(
                        'id', 'name', 'email', 'subject', 'submitted_at'
                    )[:5]
                ),
            },
            'tasks': {
                'open': Task.objects.filter(is_done=False).count(),
                'done': Task.objects.filter(is_done=True).count(),
            },
            'mail_configured': mail_is_configured(),
        }
    )


class ContactSubmissionAdminViewSet(viewsets.ModelViewSet):
    """Read/delete access to inbound contact-form messages, plus lead conversion."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from api.models import ContactSubmission

        return ContactSubmission.objects.all()

    def get_serializer_class(self):
        from api.serializers import ContactSubmissionSerializer

        return ContactSubmissionSerializer

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Turn an inbound message into a tracked lead, without duplicating."""
        submission = self.get_object()
        lead, created = Lead.objects.get_or_create(
            email=submission.email,
            defaults={
                'name': submission.name,
                'source': 'portfolio',
                'notes': '%s\n\n%s' % (submission.subject, submission.message),
                'stage': 'new',
            },
        )
        if created:
            Activity.objects.create(
                lead=lead,
                kind='created',
                summary='Converted from contact form: %s' % submission.subject,
                body=submission.message,
            )
        return Response(
            {'lead': LeadSerializer(lead).data, 'created': created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
