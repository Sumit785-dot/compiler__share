from django.contrib import admin
from .models import CodingSession, SessionParticipant, CodeSnapshot, ConsoleLog, ErrorNotification


@admin.register(CodingSession)
class CodingSessionAdmin(admin.ModelAdmin):
    list_display = ['session_name', 'session_code', 'teacher', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['session_name', 'session_code', 'teacher__username']


@admin.register(SessionParticipant)
class SessionParticipantAdmin(admin.ModelAdmin):
    list_display = ['student', 'session', 'is_connected', 'last_active']
    list_filter = ['is_connected']


@admin.register(CodeSnapshot)
class CodeSnapshotAdmin(admin.ModelAdmin):
    list_display = ['student', 'session', 'language', 'updated_at']
    list_filter = ['language']


@admin.register(ConsoleLog)
class ConsoleLogAdmin(admin.ModelAdmin):
    list_display = ['student', 'log_type', 'message', 'created_at']
    list_filter = ['log_type']


@admin.register(ErrorNotification)
class ErrorNotificationAdmin(admin.ModelAdmin):
    list_display = ['student', 'error_message', 'is_read', 'created_at']
    list_filter = ['is_read']
