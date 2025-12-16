"""
Serializers for session management.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import CodingSession, SessionParticipant, CodeSnapshot, ConsoleLog, ErrorNotification

User = get_user_model()


class ParticipantUserSerializer(serializers.ModelSerializer):
    """Minimal user serializer for participants."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role']


class SessionParticipantSerializer(serializers.ModelSerializer):
    """Serializer for session participants."""
    
    student = ParticipantUserSerializer(read_only=True)
    
    class Meta:
        model = SessionParticipant
        fields = ['id', 'student', 'is_connected', 'last_active', 'joined_at']


class CodeSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for code snapshots."""
    
    student = ParticipantUserSerializer(read_only=True)
    
    class Meta:
        model = CodeSnapshot
        fields = ['id', 'student', 'code_content', 'language', 'updated_at']


class ConsoleLogSerializer(serializers.ModelSerializer):
    """Serializer for console logs."""
    
    student = ParticipantUserSerializer(read_only=True)
    
    class Meta:
        model = ConsoleLog
        fields = ['id', 'student', 'log_type', 'message', 'created_at']


class ErrorNotificationSerializer(serializers.ModelSerializer):
    """Serializer for error notifications."""
    
    student = ParticipantUserSerializer(read_only=True)
    
    class Meta:
        model = ErrorNotification
        fields = ['id', 'student', 'error_message', 'error_line', 'is_read', 'created_at']


class CodingSessionSerializer(serializers.ModelSerializer):
    """Serializer for coding sessions."""
    
    teacher = ParticipantUserSerializer(read_only=True)
    participant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CodingSession
        fields = [
            'id', 'teacher', 'session_name', 'session_code', 
            'description', 'default_language', 'is_active', 
            'created_at', 'ended_at', 'participant_count'
        ]
        read_only_fields = ['id', 'session_code', 'created_at', 'teacher']
    
    def get_participant_count(self, obj):
        return obj.participants.filter(is_connected=True).count()


class CodingSessionDetailSerializer(CodingSessionSerializer):
    """Detailed serializer with participants."""
    
    participants = SessionParticipantSerializer(many=True, read_only=True)
    
    class Meta(CodingSessionSerializer.Meta):
        fields = CodingSessionSerializer.Meta.fields + ['participants']
        read_only_fields = CodingSessionSerializer.Meta.read_only_fields


class JoinSessionSerializer(serializers.Serializer):
    """Serializer for joining a session."""
    
    session_code = serializers.CharField(max_length=10)
    
    def validate_session_code(self, value):
        try:
            session = CodingSession.objects.get(session_code=value.upper(), is_active=True)
        except CodingSession.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive session code.")
        return value.upper()


class StudentDashboardSerializer(serializers.Serializer):
    """Serializer for student data in teacher dashboard."""
    
    id = serializers.IntegerField()
    username = serializers.CharField()
    full_name = serializers.CharField()
    is_connected = serializers.BooleanField()
    last_active = serializers.DateTimeField()
    code_content = serializers.CharField(allow_blank=True)
    language = serializers.CharField()
    recent_logs = ConsoleLogSerializer(many=True)
    has_errors = serializers.BooleanField()
