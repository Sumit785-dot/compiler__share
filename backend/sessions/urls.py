"""
URL patterns for session management.
"""
from django.urls import path
from .views import (
    CreateSessionView, ListSessionsView, SessionDetailView,
    JoinSessionView, EndSessionView, SessionParticipantsView,
    StudentCodeView, ErrorNotificationsView, MarkErrorReadView,
    TeacherDashboardView, ReportActivityView, StudentStatsView
)

urlpatterns = [
    path('', ListSessionsView.as_view(), name='session-list'),
    path('student/stats/', StudentStatsView.as_view(), name='student-stats'),
    path('create/', CreateSessionView.as_view(), name='session-create'),
    path('join/', JoinSessionView.as_view(), name='session-join'),
    path('<str:session_code>/', SessionDetailView.as_view(), name='session-detail'),
    path('<str:session_code>/end/', EndSessionView.as_view(), name='session-end'),
    path('<str:session_code>/participants/', SessionParticipantsView.as_view(), name='session-participants'),
    path('<str:session_code>/dashboard/', TeacherDashboardView.as_view(), name='teacher-dashboard'),
    path('<str:session_code>/students/<int:student_id>/code/', StudentCodeView.as_view(), name='student-code'),
    path('<str:session_code>/errors/', ErrorNotificationsView.as_view(), name='error-notifications'),
    path('<str:session_code>/activity/', ReportActivityView.as_view(), name='report-activity'),
    path('errors/<int:notification_id>/read/', MarkErrorReadView.as_view(), name='mark-error-read'),
]
