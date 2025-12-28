"""
Models for coding session management.
"""
import random
import string
from django.db import models
from django.conf import settings


def generate_session_code():
    """Generate a unique 6-character session code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class CodingSession(models.Model):
    """A coding session created by a teacher that students can join."""
    
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teacher_sessions'
    )
    session_name = models.CharField(max_length=200)
    session_code = models.CharField(max_length=10, unique=True, default=generate_session_code)
    description = models.TextField(blank=True)
    default_language = models.CharField(max_length=20, default='python')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.session_name} ({self.session_code})"
    
    def save(self, *args, **kwargs):
        # Ensure unique session code
        if not self.session_code:
            self.session_code = generate_session_code()
            while CodingSession.objects.filter(session_code=self.session_code).exists():
                self.session_code = generate_session_code()
        super().save(*args, **kwargs)


class SessionParticipant(models.Model):
    """A student participating in a coding session."""
    
    session = models.ForeignKey(
        CodingSession,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='session_participations'
    )
    is_connected = models.BooleanField(default=False)
    last_active = models.DateTimeField(auto_now=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['session', 'student']
        ordering = ['-last_active']
    
    def __str__(self):
        return f"{self.student.username} in {self.session.session_code}"


class CodeSnapshot(models.Model):
    """Snapshot of student's code at a point in time."""
    
    LANGUAGE_CHOICES = [
        ('python', 'Python'),
        ('javascript', 'JavaScript'),
        ('java', 'Java'),
        ('cpp', 'C++'),
        ('c', 'C'),
    ]
    
    session = models.ForeignKey(
        CodingSession,
        on_delete=models.CASCADE,
        related_name='code_snapshots'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='code_snapshots'
    )
    code_content = models.TextField(default='')
    language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default='python')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Code by {self.student.username} in {self.session.session_code}"


class ConsoleLog(models.Model):
    """Console output from code execution."""
    
    LOG_TYPES = [
        ('output', 'Output'),
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    
    session = models.ForeignKey(
        CodingSession,
        on_delete=models.CASCADE,
        related_name='console_logs'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='console_logs'
    )
    log_type = models.CharField(max_length=10, choices=LOG_TYPES, default='output')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.log_type}: {self.message[:50]}"


class ErrorNotification(models.Model):
    """Error notification for teacher dashboard."""
    
    session = models.ForeignKey(
        CodingSession,
        on_delete=models.CASCADE,
        related_name='error_notifications'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='error_notifications'
    )
    error_message = models.TextField()
    error_line = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Error from {self.student.username}: {self.error_message[:50]}"
