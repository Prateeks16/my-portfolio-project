from django.contrib import admin
from .models import Project, Skill, SkillCategory, Experience, Achievement, ContactSubmission, Profile
# Register your models here.

admin.site.register(Profile)
admin.site.register(Project)
admin.site.register(Skill)
admin.site.register(SkillCategory)
admin.site.register(Experience)
admin.site.register(Achievement)
admin.site.register(ContactSubmission)


#customise the admn display according to your needs
# @admin.register(Project)
# class ProjectAdmin(admin.ModelAdmin):
#     list_display = ('title', 'created_at')
#     search_fields = ('title', 'tech_stack')
#     list_filter = ('created_at',)
#     list_editable = ('is_featured','display_order')