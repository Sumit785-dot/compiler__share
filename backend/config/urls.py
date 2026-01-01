"""
URL configuration for Real-time Coding Monitor project.
"""
from django.contrib import admin
from django.urls import path, include

from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/sessions/', include('sessions.urls')),
    path('api/coding/', include('coding.urls')),
    # React Frontend Catch-all
    path('', TemplateView.as_view(template_name='index.html')),
    path('<path:resource>', TemplateView.as_view(template_name='index.html')),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
