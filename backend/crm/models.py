from django.db import models
from django.utils import timezone


class Lead(models.Model):
    """A person or company in the outreach pipeline (recruiter, client, collaborator)."""

    STAGE_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
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
        ('github', 'GitHub'),
        ('email', 'Inbound Email'),
        ('manual', 'Manually Added'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    email = models.EmailField()
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

    last_contacted_at = models.DateTimeField(blank=True, null=True)
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

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    scheduled_for = models.DateTimeField(blank=True, null=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return '[%s] %s -> %s' % (self.status, self.subject, self.to_email)


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
