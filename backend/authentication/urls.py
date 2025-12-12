"""
URL patterns for authentication.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response

from .views import RegisterView, LoginView, ProfileView, LogoutView


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
]

