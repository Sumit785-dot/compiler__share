"""
URL patterns for coding app.
"""
from django.urls import path
from .views import ExecuteCodeView, SaveCodeView, HeartbeatView, GetMyCodeView, TeacherSaveCodeView, SupportedLanguagesView, SendNotificationView, AISolveView

urlpatterns = [
    path('execute/', ExecuteCodeView.as_view(), name='execute-code'),
    path('save/', SaveCodeView.as_view(), name='save-code'),
    path('heartbeat/', HeartbeatView.as_view(), name='heartbeat'),
    path('my-code/', GetMyCodeView.as_view(), name='get-my-code'),
    path('teacher-save/', TeacherSaveCodeView.as_view(), name='teacher-save-code'),
    path('notify/', SendNotificationView.as_view(), name='send-notification'),
    path('languages/', SupportedLanguagesView.as_view(), name='supported-languages'),
    
    # AI
    path('ai/solve/', AISolveView.as_view(), name='ai-solve'),
]



