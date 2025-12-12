"""
URL configuration for Real-time Coding Monitor project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/sessions/', include('sessions.urls')),
    path('api/coding/', include('coding.urls')),
]
