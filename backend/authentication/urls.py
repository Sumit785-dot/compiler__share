"""
URL patterns for authentication.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response

from .views import (
    RegisterView, LoginView, ProfileView, LogoutView,
    GitHubAuthView, GitHubCallbackView, GitHubStatusView, GitHubReposView, GitHubPushView,
    GitHubCreateRepoView, TeacherSettingsView
)


class HealthCheckView(APIView):
    """Health check endpoint for container monitoring."""
    permission_classes = []
    authentication_classes = []
    
    def get(self, request):
        return Response({'status': 'healthy'})


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('health/', HealthCheckView.as_view(), name='health'),
    
    # GitHub OAuth
    path('github/auth/', GitHubAuthView.as_view(), name='github_auth'),
    path('github/callback/', GitHubCallbackView.as_view(), name='github_callback'),
    path('github/status/', GitHubStatusView.as_view(), name='github_status'),
    path('github/repos/', GitHubReposView.as_view(), name='github_repos'),
    path('github/push/', GitHubPushView.as_view(), name='github_push'),
    path('github/create-repo/', GitHubCreateRepoView.as_view(), name='github_create_repo'),
    
    # Teacher Settings
    path('settings/', TeacherSettingsView.as_view(), name='teacher_settings'),
]
