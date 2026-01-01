"""
Views for session management.
"""
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import CodingSession, SessionParticipant, CodeSnapshot, ConsoleLog, ErrorNotification
from .serializers import (
    CodingSessionSerializer, CodingSessionDetailSerializer,
    JoinSessionSerializer, SessionParticipantSerializer,
    CodeSnapshotSerializer, ErrorNotificationSerializer
)


class IsTeacher:
    """Permission mixin to check if user is a teacher."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'teacher'


class CreateSessionView(generics.CreateAPIView):
    """Create a new coding session (teacher only)."""
    
    serializer_class = CodingSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        if self.request.user.role != 'teacher':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers can create sessions.")
        serializer.save(teacher=self.request.user)


class ListSessionsView(generics.ListAPIView):
    """List sessions for the current user."""
    
    serializer_class = CodingSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return CodingSession.objects.filter(teacher=user)
        else:
            return CodingSession.objects.filter(
                participants__student=user
            ).distinct()


class SessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a session."""
    
    serializer_class = CodingSessionDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'session_code'
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return CodingSession.objects.filter(teacher=user)
        else:
            return CodingSession.objects.filter(
                participants__student=user
            )


class JoinSessionView(APIView):
    """Join a coding session as a student."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = JoinSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Prevent teachers from joining as students
        if request.user.role == 'teacher':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Teachers cannot join sessions as participants. Please use the dashboard.")

        session_code = serializer.validated_data['session_code']
        session = get_object_or_404(CodingSession, session_code=session_code, is_active=True)
        
        # Create or get participant
        participant, created = SessionParticipant.objects.get_or_create(
            session=session,
            student=request.user,
            defaults={'is_connected': True}
        )
        
        if not created:
            participant.is_connected = True
            participant.save()
        
        # Create initial code snapshot if doesn't exist
        CodeSnapshot.objects.get_or_create(
            session=session,
            student=request.user,
            defaults={
                'code_content': '',
                'language': session.default_language
            }
        )
        
        return Response({
            'session': CodingSessionDetailSerializer(session).data,
            'participant': SessionParticipantSerializer(participant).data,
            'message': 'Joined session' if not created else 'Joined session successfully'
        })


class EndSessionView(APIView):
    """End a coding session (teacher only)."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_code):
        session = get_object_or_404(
            CodingSession, 
            session_code=session_code, 
            teacher=request.user
        )
        session.is_active = False
        session.ended_at = timezone.now()
        session.save()
        
        # Disconnect all participants
        session.participants.update(is_connected=False)
        
        return Response({'message': 'Session ended successfully'})


class SessionParticipantsView(generics.ListAPIView):
    """List all participants in a session."""
    
    serializer_class = SessionParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        session_code = self.kwargs['session_code']
        session = get_object_or_404(CodingSession, session_code=session_code)
        return session.participants.all()


class StudentCodeView(generics.RetrieveAPIView):
    """Get a student's code snapshot (teacher only)."""
    
    serializer_class = CodeSnapshotSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        session_code = self.kwargs['session_code']
        student_id = self.kwargs['student_id']
        
        session = get_object_or_404(CodingSession, session_code=session_code)
        
        if self.request.user.role != 'teacher' and self.request.user.id != student_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have permission to view this code.")
        
        snapshot = get_object_or_404(
            CodeSnapshot,
            session=session,
            student_id=student_id
        )
        return snapshot


class ErrorNotificationsView(generics.ListAPIView):
    """List unread error notifications for a session."""
    
    serializer_class = ErrorNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        session_code = self.kwargs['session_code']
        session = get_object_or_404(
            CodingSession, 
            session_code=session_code,
            teacher=self.request.user
        )
        return session.error_notifications.filter(is_read=False)


class MarkErrorReadView(APIView):
    """Mark an error notification as read."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, notification_id):
        notification = get_object_or_404(
            ErrorNotification,
            id=notification_id,
            session__teacher=request.user
        )
        notification.is_read = True
        notification.save()
        return Response({'message': 'Marked as read'})


class TeacherDashboardView(APIView):
    """Get dashboard data for teacher view."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_code):
        session = get_object_or_404(
            CodingSession,
            session_code=session_code
        )
        
        if session.teacher != request.user:
            return Response(
                {'error': 'You do not have permission to view this dashboard.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        participants = session.participants.select_related('student').order_by('student__id').all()
        
        dashboard_data = []
        for participant in participants:
            # Get latest code snapshot
            snapshot = CodeSnapshot.objects.filter(
                session=session,
                student=participant.student
            ).first()
            
            # Get recent console logs
            logs = ConsoleLog.objects.filter(
                session=session,
                student=participant.student
            )[:10]
            
            # Check for unread errors
            has_errors = ErrorNotification.objects.filter(
                session=session,
                student=participant.student,
                is_read=False
            ).exists()
            
            dashboard_data.append({
                'id': participant.student.id,
                'username': participant.student.username,
                'full_name': participant.student.full_name or participant.student.username,
                'is_connected': participant.is_connected,
                'last_active': participant.last_active,
                'code_content': snapshot.code_content if snapshot else '',
                'language': snapshot.language if snapshot else 'python',
                'recent_logs': [
                    {
                        'id': log.id,
                        'log_type': log.log_type,
                        'message': log.message,
                        'created_at': log.created_at.isoformat()
                    }
                    for log in logs
                ],
                'has_errors': has_errors
            })
        
        return Response({
            'session': CodingSessionSerializer(session).data,
            'students': dashboard_data
        })


class ReportActivityView(APIView):
    """Report student activity (tab switch, window blur) via REST API."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_code):
        activity_type = request.data.get('type')
        print(f"📍 ReportActivityView: session={session_code}, type={activity_type}, user={request.user}")  # DEBUG
        
        if not activity_type:
            return Response(
                {'error': 'Activity type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        session = get_object_or_404(CodingSession, session_code=session_code)
        
        # If user is the teacher, just log it but don't error
        if request.user == session.teacher:
             print("ℹ️ Teacher reported activity, ignoring participant check")
             return Response({'status': 'reported (teacher)'})

        # Verify student is participant
        participant = get_object_or_404(
            SessionParticipant,
            session=session,
            student=request.user
        )
        
        # Broadcast activity to session group (teachers will pick it up)
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        print(f"📤 Broadcasting to session_{session_code}")  # DEBUG
        async_to_sync(channel_layer.group_send)(
            f'session_{session_code}',
            {
                'type': 'student_activity',
                'student_id': request.user.id,
                'activity_type': activity_type,
                'timestamp': timezone.now().isoformat()
            }
        )
        print(f"✅ Broadcast complete")  # DEBUG
        
        return Response({'status': 'reported'})


class StudentStatsView(APIView):
    """Get statistics for student dashboard."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        active_sessions = CodingSession.objects.filter(is_active=True).count()
        attended_sessions = SessionParticipant.objects.filter(student=request.user).count()
        
        # Calculate missed sessions (Total sessions created - Attended)
        # Note: In a real world scenario, might want to filter by sessions *available* to the student (e.g. by group/class)
        # For now, assuming all sessions are potential sessions
        total_sessions = CodingSession.objects.count()
        missed_sessions = max(0, total_sessions - attended_sessions)
        
        return Response({
            'active_sessions': active_sessions,
            'attended_sessions': attended_sessions,
            'total_sessions': total_sessions,
            'missed_sessions': missed_sessions
        })
