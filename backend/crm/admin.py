from django.contrib import admin

from .models import (
    Activity,
    EmailTemplate,
    Lead,
    OutreachEmail,
    PageView,
    Task,
    TrackedEvent,
)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "company", "stage", "source", "score", "created_at"]
    list_filter = ["stage", "source"]
    search_fields = ["name", "email", "company", "role", "tags"]


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ["lead", "kind", "summary", "created_at"]
    list_filter = ["kind"]


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "subject", "times_used"]


@admin.register(OutreachEmail)
class OutreachEmailAdmin(admin.ModelAdmin):
    list_display = ["subject", "to_email", "status", "sent_at", "created_at"]
    list_filter = ["status"]


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ["path", "referrer", "device", "created_at"]
    list_filter = ["device"]


@admin.register(TrackedEvent)
class TrackedEventAdmin(admin.ModelAdmin):
    list_display = ["name", "detail", "created_at"]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "lead", "priority", "due_date", "is_done"]
    list_filter = ["priority", "is_done"]
