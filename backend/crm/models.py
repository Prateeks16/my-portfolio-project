from django.core.files.storage import storages
from django.db import models
from django.utils import timezone


def _attachment_storage():
    """Named storage rather than a hardcoded backend, so tests can use memory."""
    return storages['attachments']


RESUME_VARIANTS = [
    ('backend', 'Backend / SDE'),
    ('ai_ml', 'AI / ML'),
]

# Signals that a role is machine-learning shaped rather than general backend.
_AI_SIGNALS = {
    'ml', 'ai', 'llm', 'rag', 'nlp', 'genai', 'generative', 'vector', 'embedding',
    'embeddings', 'agent', 'agents', 'agentic', 'data scientist', 'pytorch',
    'tensorflow', 'huggingface', 'transformers', 'qdrant', 'machine learning',
    'deep learning', 'computer vision', 'applied scientist',
}


def suggest_resume(role='', tags=''):
    """Pick which resume fits a role.

    Two real positionings exist: a backend/SDE one led by Java, Spring Boot and
    Go, and an AI/ML one led by RAG and vector search. Sending the wrong one
    buries the evidence the reader is actually looking for. Backend is the
    default because it is the broader document and the safer miss.
    """
    haystack = ('%s %s' % (role or '', tags or '')).lower()
    for signal in _AI_SIGNALS:
        if signal in haystack:
            return 'ai_ml'
    return 'backend'


class Lead(models.Model):
    """A person or company in the outreach pipeline (recruiter, client, collaborator)."""

    STAGE_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('applied', 'Applied'),
        ('replied', 'Replied'),
        ('interviewing', 'Interviewing'),
        ('offer', 'Offer'),
        ('won', 'Won'),
        ('lost', 'Lost'),
    ]
    SOURCE_CHOICES = [
        ('portfolio', 'Portfolio Contact Form'),
        ('linkedin', 'LinkedIn'),
        ('referral', 'Referral'),
        ('job_board', 'Job Board'),
        ('application_form', 'Application Form'),
        ('github', 'GitHub'),
        ('job_scan', 'Automated Job Scan'),
        ('email', 'Inbound Email'),
        ('manual', 'Manually Added'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    company = models.CharField(max_length=200, blank=True)
    role = models.CharField(max_length=200, blank=True)
    linkedin_url = models.URLField(blank=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=150, blank=True)

    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='new')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    # 0-100 priority score, set by hand or nudged by the scoring rules
    score = models.IntegerField(default=50)
    tags = models.CharField(max_length=300, blank=True, help_text='Comma separated')
    notes = models.TextField(blank=True)

    # Where the posting came from, for rows created by the scheduled job scan.
    apply_url = models.URLField(blank=True)
    # Blank means "decide from the role"; set it explicitly to override.
    resume_variant = models.CharField(
        max_length=20, choices=RESUME_VARIANTS, blank=True
    )
    posted_at = models.DateField(blank=True, null=True)
    external_id = models.CharField(max_length=200, blank=True, db_index=True)

    last_contacted_at = models.DateTimeField(blank=True, null=True)
    replied_at = models.DateTimeField(blank=True, null=True)
    next_follow_up_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stage']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return '%s <%s>' % (self.name, self.email)

    @property
    def resume_for_role(self):
        """The variant to attach: an explicit choice, else inferred from the role."""
        return self.resume_variant or suggest_resume(self.role, self.tags)

    @property
    def tag_list(self):
        return [t.strip() for t in self.tags.split(',') if t.strip()]

    @property
    def is_follow_up_due(self):
        return bool(self.next_follow_up_at and self.next_follow_up_at <= timezone.now())


class Activity(models.Model):
    """Append-only timeline entry against a lead."""

    KIND_CHOICES = [
        ('note', 'Note'),
        ('email_sent', 'Email Sent'),
        ('email_received', 'Reply Received'),
        ('email_draft', 'Email Drafted'),
        ('stage_change', 'Stage Change'),
        ('call', 'Call'),
        ('meeting', 'Meeting'),
        ('created', 'Created'),
    ]

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='note')
    summary = models.CharField(max_length=300)
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Activities'

    def __str__(self):
        return '%s - %s' % (self.get_kind_display(), self.lead.name)


class EmailTemplate(models.Model):
    """Reusable outreach template.

    Placeholders are {{name}}, {{company}}, {{role}}, {{my_name}} and friends.
    """

    name = models.CharField(max_length=150)
    category = models.CharField(max_length=80, blank=True)
    subject = models.CharField(max_length=300)
    body = models.TextField()
    description = models.CharField(max_length=300, blank=True)
    times_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def render(self, context):
        """Naive but predictable placeholder substitution."""
        subject, body = self.subject, self.body
        for key, value in context.items():
            token = '{{' + key + '}}'
            subject = subject.replace(token, str(value or ''))
            body = body.replace(token, str(value or ''))
        return subject, body


class OutreachEmail(models.Model):
    """An email draft, or the record of one that was sent.

    Nothing here is transmitted until it is explicitly sent from the dashboard,
    and only when SMTP credentials are configured. New rows start as 'draft'.
    """

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='emails'
    )
    template = models.ForeignKey(
        EmailTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )
    to_email = models.EmailField()
    to_name = models.CharField(max_length=200, blank=True)
    subject = models.CharField(max_length=300)
    body = models.TextField()

    # Whether to attach the resume variant this lead's role calls for. On by
    # default because that is what the templates already promise the reader --
    # they say "attached" in the body -- and off is the deliberate exception.
    attach_resume = models.BooleanField(default=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    scheduled_for = models.DateTimeField(blank=True, null=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True)

    # --- threading ---
    # The Message-ID this email was sent with, minted before transmission and
    # stored so an inbound reply quoting it can be matched back to this row.
    message_id = models.CharField(max_length=300, blank=True, db_index=True)
    # Set when this is a reply: the Message-ID of the message being answered.
    # Gmail uses these two headers to decide what belongs in the same thread.
    in_reply_to = models.CharField(max_length=300, blank=True)
    references = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return '[%s] %s -> %s' % (self.status, self.subject, self.to_email)


class InboundEmail(models.Model):
    """A real email pulled out of the Gmail mailbox over IMAP.

    Distinct from ContactSubmission, which is the portfolio form. This is
    ordinary mail -- recruiter replies, referrals, anything that lands in the
    inbox -- mirrored into the CRM so a conversation started here can be
    finished here. Gmail stays the system of record; nothing is deleted there.

    Deduplication is on `message_id`, the globally unique header every mail
    system stamps, so re-syncing the same window is safe and idempotent.
    """

    # RFC 5322 Message-ID. Unique so a repeated sync silently no-ops rather
    # than stacking duplicates of the same message.
    message_id = models.CharField(max_length=300, unique=True, db_index=True)
    in_reply_to = models.CharField(max_length=300, blank=True, db_index=True)
    references = models.TextField(blank=True)
    # Gmail's own thread grouping is not exposed over IMAP, so threads are
    # reconstructed locally from In-Reply-To / References.
    thread_key = models.CharField(max_length=300, blank=True, db_index=True)

    from_email = models.EmailField(db_index=True)
    from_name = models.CharField(max_length=200, blank=True)
    to_email = models.CharField(max_length=400, blank=True)
    cc_email = models.CharField(max_length=400, blank=True)
    subject = models.CharField(max_length=500, blank=True)
    body_text = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    snippet = models.CharField(max_length=300, blank=True)
    has_attachments = models.BooleanField(default=False)

    # Matched during sync where the sender is already known.
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inbound_emails',
    )
    # Set when this message is a reply to something the CRM sent.
    replies_to = models.ForeignKey(
        OutreachEmail, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='replies',
    )

    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    sent_at = models.DateTimeField(blank=True, null=True)
    synced_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at', '-synced_at']
        indexes = [
            models.Index(fields=['is_archived', '-sent_at']),
            models.Index(fields=['is_read']),
        ]

    def __str__(self):
        return '%s <%s>: %s' % (self.from_name, self.from_email, self.subject)


class MailSyncLog(models.Model):
    """One IMAP run, kept so the dashboard can show when mail last came in."""

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    fetched = models.IntegerField(default=0)
    created = models.IntegerField(default=0)
    matched_leads = models.IntegerField(default=0)
    ok = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return '%s: %s new' % (self.started_at, self.created)


class PageView(models.Model):
    """One recorded visit to a public portfolio page."""

    path = models.CharField(max_length=300, default='/')
    referrer = models.CharField(max_length=500, blank=True)
    session_id = models.CharField(max_length=64, blank=True, db_index=True)
    user_agent = models.CharField(max_length=400, blank=True)
    device = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return '%s @ %s' % (self.path, self.created_at)


class TrackedEvent(models.Model):
    """Named interaction on the portfolio - resume download, project open, CTA click."""

    name = models.CharField(max_length=120, db_index=True)
    detail = models.CharField(max_length=300, blank=True)
    path = models.CharField(max_length=300, blank=True)
    session_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return '%s (%s)' % (self.name, self.detail)


class Task(models.Model):
    """A follow-up action, optionally attached to a lead."""

    PRIORITY_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High')]

    title = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks'
    )
    due_date = models.DateField(blank=True, null=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    is_done = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['is_done', 'due_date', '-created_at']

    def __str__(self):
        return self.title


class EmailAttachment(models.Model):
    """A file that goes out with an OutreachEmail.

    Stored as a raw Cloudinary resource rather than through the default media
    storage, which is configured for images. A PDF happens to survive that path
    because Cloudinary treats PDFs as images, but a .docx or a .zip does not,
    and an attachment feature that silently only works for some file types is
    worse than none.

    Deleting the email deletes the rows; the files themselves are left to
    Cloudinary's own lifecycle, the same as every other upload here.
    """

    email = models.ForeignKey(
        OutreachEmail, on_delete=models.CASCADE, related_name='attachments'
    )
    file = models.FileField(upload_to='email_attachments/', storage=_attachment_storage)
    # Kept alongside the file because the stored name is mangled for uniqueness,
    # and the recipient should see what the sender picked, not a slug.
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True)
    size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return '%s (%s)' % (self.filename, self.email_id)
