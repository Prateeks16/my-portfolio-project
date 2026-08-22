from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view
from .models import Project, Skill, Achievement, ContactSubmission, Experience, SkillCategory, Profile
from .serializers import ProjectSerializer, SkillSerializer, AchievementSerializer, ContactSubmissionSerializer, ExperienceSerializer, SkillCategorySerializer, ProfileSerializer   

# Create your views here.
class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [AllowAny] #Anyone can access

    def get_queryset(self):
        return Project.objects.all().order_by('-created_at')

class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [AllowAny]

class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [AllowAny]

    

class SkillCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer
    permission_classes = [AllowAny]

class ExperienceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Experience.objects.all()
    serializer_class = ExperienceSerializer
    permission_classes = [AllowAny]

class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [AllowAny]

class ContactSubmissionViewSet(viewsets.ModelViewSet):
    queryset = ContactSubmission.objects.all()
    serializer_class = ContactSubmissionSerializer

    #only allow post requests 
    http_method_names = ['post']
    permission_classes = [AllowAny]


    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return success message
        return Response(
            {"message": "Your message has been received! I'll get back to you soon."},
            status=status.HTTP_201_CREATED
        )



@api_view(['GET'])
def recent_projects(request):
    projects = Project.objects.all()[:3]  # First 3
    return Response(ProjectSerializer(projects, many=True).data)