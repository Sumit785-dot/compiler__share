"""
Custom User model with role support for Teacher and Student.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with role field."""
    
    class Role(models.TextChoices):
        TEACHER = 'teacher', 'Teacher'
        STUDENT = 'student', 'Student'
    
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT
    )
    full_name = models.CharField(max_length=200, blank=True)
    avatar_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER
    
    @property
    def is_student(self):
        return self.role == self.Role.STUDENT


class GitHubConnection(models.Model):
    """Stores GitHub OAuth connection for a user."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='github_connection')
    access_token = models.CharField(max_length=255)
    github_username = models.CharField(max_length=100, blank=True)
    github_id = models.IntegerField(null=True, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} -> {self.github_username or 'GitHub'}"


class TeacherSettings(models.Model):
    """Settings for teacher, specifically for AI features."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    openai_api_key = models.CharField(max_length=255, blank=True)
    gemini_api_key = models.CharField(max_length=255, blank=True)
    groq_api_key = models.CharField(max_length=255, blank=True)
    is_ai_active = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.user.username}"
