from rest_framework import serializers

from .models import (
    Activity,
    EmailTemplate,
    Lead,
    OutreachEmail,
    PageView,
    Task,
    TrackedEvent,
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


class OutreachEmailSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = OutreachEmail
        fields = '__all__'
        # sent_at / error_message are set by the send endpoint, never by the client
        read_only_fields = ['created_at', 'updated_at', 'sent_at', 'error_message']


class TaskSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['created_at']


class PageViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageView
        fields = '__all__'


class TrackedEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackedEvent
        fields = '__all__'


class TrackSerializer(serializers.Serializer):
    """Payload accepted by the public /crm/track/ endpoint."""

    type = serializers.ChoiceField(choices=['pageview', 'event'], default='pageview')
    path = serializers.CharField(max_length=300, required=False, allow_blank=True)
    referrer = serializers.CharField(max_length=500, required=False, allow_blank=True)
    session_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    detail = serializers.CharField(max_length=300, required=False, allow_blank=True)
