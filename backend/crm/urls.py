from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import ingest, views

router = DefaultRouter()
router.register(r'leads', views.LeadViewSet, basename='leads')
router.register(r'templates', views.EmailTemplateViewSet, basename='templates')
router.register(r'emails', views.OutreachEmailViewSet, basename='emails')
router.register(r'tasks', views.TaskViewSet, basename='tasks')
router.register(r'inbox', views.ContactSubmissionAdminViewSet, basename='inbox')
# Real Gmail, mirrored in over IMAP. Kept separate from `inbox`, which is the
# portfolio contact form -- they are different sources with different rules.
router.register(r'mail', views.InboundEmailViewSet, basename='mail')

# Authenticated write access to the content that renders on the public site.
router.register(r'manage/profile', views.ManagedProfileViewSet, basename='manage-profile')
router.register(r'manage/projects', views.ManagedProjectViewSet, basename='manage-projects')
router.register(r'manage/experiences', views.ManagedExperienceViewSet, basename='manage-experiences')
router.register(r'manage/achievements', views.ManagedAchievementViewSet, basename='manage-achievements')
router.register(r'manage/skills', views.ManagedSkillViewSet, basename='manage-skills')
router.register(r'manage/skill-categories', views.ManagedSkillCategoryViewSet, basename='manage-skill-categories')

urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('health/', views.health, name='health'),
    path('ingest/opportunities/', ingest.ingest_opportunities, name='ingest-opportunities'),
    path('track/', views.track, name='track'),
    path('analytics/', views.analytics, name='analytics'),
    path('ingest-status/', views.ingest_status, name='ingest-status'),
    path('github/', views.github, name='github'),
    path('summary/', views.dashboard_summary, name='dashboard-summary'),
    path('', include(router.urls)),
]
