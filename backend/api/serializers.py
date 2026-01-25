from rest_framework import serializers
from .models import Project, Skill, Achievement, ContactSubmission, Experience, SkillCategory, Profile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

class SkillSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Skill
        fields = '__all__'
class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = '__all__'

class ExperienceSerializer(serializers.ModelSerializer):
    tech_stack = serializers.SerializerMethodField()
    
    class Meta:
        model = Experience
        fields = '__all__'
    
    def get_tech_stack(self, obj):
        if obj.technologies_used:
            return [tech.strip() for tech in obj.technologies_used.split(',')]
        return []

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__' 

class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = '__all__'  

