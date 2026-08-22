from django.contrib import admin

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


@admin.register(InboundEmail)
class InboundEmailAdmin(admin.ModelAdmin):
    list_display = ["from_email", "subject", "lead", "is_read", "is_archived", "sent_at"]
    list_filter = ["is_read", "is_archived"]
    search_fields = ["from_email", "from_name", "subject", "body_text"]
    # Every field is written by the IMAP sync; editing one here would only
    # desynchronise the CRM copy from the mailbox it mirrors.
    readonly_fields = [f.name for f in InboundEmail._meta.fields]


@admin.register(MailSyncLog)
class MailSyncLogAdmin(admin.ModelAdmin):
    list_display = ["started_at", "ok", "fetched", "created", "matched_leads"]
    list_filter = ["ok"]
