from rest_framework import serializers

from .models import (
    Activity,
    EmailAttachment,
    EmailTemplate,
    InboundEmail,
    Lead,
    MailSyncLog,
    OutreachEmail,
    Task,
)


class ActivitySerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = ['created_at']


class LeadSerializer(serializers.ModelSerializer):
    tag_list = serializers.ReadOnlyField()
    resume_for_role = serializers.ReadOnlyField()
    is_follow_up_due = serializers.ReadOnlyField()
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    activity_count = serializers.IntegerField(source='activities.count', read_only=True)
    email_count = serializers.IntegerField(source='emails.count', read_only=True)

    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class LeadDetailSerializer(LeadSerializer):
    activities = ActivitySerializer(many=True, read_only=True)


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'times_used']


class EmailAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAttachment
        fields = ['id', 'filename', 'content_type', 'size', 'created_at']
        # Everything here is derived from the uploaded file by the attach
        # endpoint. A client that could set `size` could lie about it, and the
        # send-size check is what that number exists for.
        read_only_fields = fields


class OutreachEmailSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    attachments = EmailAttachmentSerializer(many=True, read_only=True)
    # Which resume `attach_resume` will actually send, resolved server-side so
    # the compose screen and the send agree on one answer.
    resume_variant = serializers.CharField(
        source='lead.resume_for_role', read_only=True, default='backend'
    )

    class Meta:
        model = OutreachEmail
        fields = '__all__'
        # sent_at / error_message are set by the send endpoint, never by the client
        read_only_fields = ['created_at', 'updated_at', 'sent_at', 'error_message']


class InboundEmailListSerializer(serializers.ModelSerializer):
    """The list view: enough to render a row, without shipping every body."""

    lead_name = serializers.CharField(source='lead.name', read_only=True)

    class Meta:
        model = InboundEmail
        fields = [
            'id', 'from_email', 'from_name', 'subject', 'snippet',
            'sent_at', 'is_read', 'is_archived', 'has_attachments',
            'lead', 'lead_name', 'replies_to', 'thread_key',
        ]


class InboundEmailSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    replies_to_subject = serializers.CharField(
        source='replies_to.subject', read_only=True
    )

    class Meta:
        model = InboundEmail
        fields = '__all__'
        # Everything of substance is written by the IMAP sync, never by a
        # client. Only the two local flags are editable from the dashboard.
        read_only_fields = [
            f.name for f in InboundEmail._meta.fields
            if f.name not in ('is_read', 'is_archived')
        ]


class MailSyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailSyncLog
        fields = '__all__'


class TaskSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['created_at']


class TrackSerializer(serializers.Serializer):
    """Payload accepted by the public /crm/track/ endpoint."""

    type = serializers.ChoiceField(choices=['pageview', 'event'], default='pageview')
    path = serializers.CharField(max_length=300, required=False, allow_blank=True)
    referrer = serializers.CharField(max_length=500, required=False, allow_blank=True)
    session_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    detail = serializers.CharField(max_length=300, required=False, allow_blank=True)
