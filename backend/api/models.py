from django.db import models
from cloudinary.models import CloudinaryField

# Create your models here.
class Project(models.Model):
    title = models.CharField(max_length=200)
    short_description = models.CharField(max_length=500)
    description = models.TextField()
    tech_stack = models.CharField(max_length=200)
    github_url = models.URLField(blank=True)
    live_demo_url = models.URLField(blank=True)
    image = CloudinaryField('image', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
    
class Skill(models.Model):
    category = models.ForeignKey('SkillCategory', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    proficiency = models.CharField(max_length=50, choices=[
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
        ('Expert', 'Expert'),
    ])
    order = models.IntegerField(default=0)
class SkillCategory(models.Model):
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
class Experience(models.Model):
    company_name = models.CharField(max_length=200)
    position = models.CharField(max_length=200)
    location = models.CharField(max_length=100, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    description = models.TextField()
    technologies_used = models.CharField(max_length=200, blank=True)
    company_logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)

    @property
    def is_current(self):
        return self.end_date is None
    
    class Meta:
        ordering = ['-end_date']
    

class Achievement(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    organization = models.CharField(max_length=200, blank=True)
    date = models.DateField()
    achievement_type = models.CharField(max_length=100)
    badge_image = models.ImageField(upload_to='achievements/', blank=True, null=True)
    certificate_url = models.URLField(blank=True)
    class Meta:
        ordering = ['-date']


class ContactSubmission(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

class Profile(models.Model):
    full_name = models.CharField(max_length=200)
    tagline = models.CharField(max_length=300)
    bio = models.TextField()
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)

    #social links
    github_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)

    #files
    # The public resume, offered for download on the portfolio, and the default
    # the CRM attaches. Deliberately the backend/SDE one: it is the broader
    # document, so it is the safer thing to send when nothing says otherwise.
    resume_pdf = models.FileField(upload_to='resumes/', blank=True, null=True)
    # The AI/ML positioning of the same history. crm.suggest_resume decides which
    # of the two a lead's role calls for; without this field that decision had
    # nothing to choose between and the dashboard was naming a file that did not
    # exist. Optional -- unset simply falls back to resume_pdf.
    resume_pdf_ai_ml = models.FileField(upload_to='resumes/', blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)

    def resume_for_variant(self, variant):
        """The resume file for a variant key, falling back to the public one."""
        if variant == 'ai_ml' and self.resume_pdf_ai_ml:
            return self.resume_pdf_ai_ml
        return self.resume_pdf

    class Meta:
        verbose_name_plural = "Profile"

    