from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'full_name', 'role', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {'fields': ('role', 'full_name', 'avatar_url')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Profile', {'fields': ('role', 'full_name')}),
    )

from .models import TeacherSettings

@admin.register(TeacherSettings)
class TeacherSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_ai_active', 'updated_at']
    list_filter = ['is_ai_active']
    search_fields = ['user__username', 'user__email']
