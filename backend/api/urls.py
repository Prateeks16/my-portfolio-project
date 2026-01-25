from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProfileViewSet, ProjectViewSet, SkillCategoryViewSet,
    SkillViewSet, ExperienceViewSet, AchievementViewSet,
    ContactSubmissionViewSet
)

# Router automatically generates URLs for ViewSets
router = DefaultRouter()
router.register(r'profile', ProfileViewSet, basename='profile')
router.register(r'projects', ProjectViewSet, basename='projects')
router.register(r'skill-categories', SkillCategoryViewSet, basename='skill-categories')
router.register(r'skills', SkillViewSet, basename='skills')
router.register(r'experiences', ExperienceViewSet, basename='experiences')
router.register(r'achievements', AchievementViewSet, basename='achievements')
router.register(r'contact', ContactSubmissionViewSet, basename='contact')

urlpatterns = [
    path('', include(router.urls)),
]