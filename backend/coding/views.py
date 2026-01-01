"""
REST API views for code execution.
"""
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

# OPTIMIZATION: Use proper logging instead of print statements
logger = logging.getLogger(__name__)

from .executor import CodeExecutor
from sessions.models import CodingSession, CodeSnapshot, SessionParticipant


class ExecuteCodeView(APIView):
    """Execute code via REST API."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        code = request.data.get('code', '')
        language = request.data.get('language', 'python')
        session_code = request.data.get('session_code', '')
        
        if not code:
            return Response(
                {'error': 'No code provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session = None
        # Save code if session provided
        if session_code:
            try:
                session = CodingSession.objects.get(session_code=session_code)
                snapshot, _ = CodeSnapshot.objects.get_or_create(
                    session=session,
                    student=request.user,
                    defaults={'code_content': code, 'language': language}
                )
                snapshot.code_content = code
                snapshot.language = language
                snapshot.save()
                
                # Update participant last_active
                SessionParticipant.objects.filter(
                    session=session, student=request.user
                ).update(is_connected=True, last_active=timezone.now())
            except CodingSession.DoesNotExist:
                pass
        
        executor = CodeExecutor()
        result = executor.execute(code, language)
        
        # Save console log and error notification if in a session
        if session and request.user.role == 'student':
            from sessions.models import ConsoleLog, ErrorNotification
            
            # Save console log
            log_type = 'output' if result.get('success') else 'error'
            message = result.get('output') or result.get('error') or ''
            
            if message:
                ConsoleLog.objects.create(
                    session=session,
                    student=request.user,
                    log_type=log_type,
                    message=message
                )
            
            # Error notification creation disabled - manual only
            # if not result.get('success') and result.get('error'):
            #     ErrorNotification.objects.create(
            #         session=session,
            #         student=request.user,
            #         error_message=result.get('error'),
            #         is_read=False
            #     )
        
        return Response(result)



class SaveCodeView(APIView):
    """Save student code via REST API."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        code = request.data.get('code', '')
        language = request.data.get('language', 'python')
        session_code = request.data.get('session_code', '')
        
        if not session_code:
            return Response(
                {'error': 'Session code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session = get_object_or_404(CodingSession, session_code=session_code)
        
        # Update or create code snapshot
        snapshot, created = CodeSnapshot.objects.update_or_create(
            session=session,
            student=request.user,
            defaults={
                'code_content': code,
                'language': language
            }
        )
        
        # Update participant status
        SessionParticipant.objects.filter(
            session=session, student=request.user
        ).update(is_connected=True, last_active=timezone.now())
        
        # Trigger Automated Archive (Fire-and-forget)
        try:
            from .archiver import ArchiveService
            ArchiveService.trigger_archive(session, request.user, code, language)
        except Exception as e:
            # OPTIMIZATION: Never fail the save request because of archiving errors
            logger.warning(f"Archive trigger failed: {e}")

        return Response({
            'success': True,
            'message': 'Code saved',
            'created': created
        })


class HeartbeatView(APIView):
    """Update student connection status (heartbeat)."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        session_code = request.data.get('session_code', '')
        
        if not session_code:
            return Response(
                {'error': 'Session code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = CodingSession.objects.get(session_code=session_code)
            updated = SessionParticipant.objects.filter(
                session=session, student=request.user
            ).update(is_connected=True, last_active=timezone.now())
            
            return Response({
                'success': True,
                'updated': updated > 0
            })
        except CodingSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class GetMyCodeView(APIView):
    """Get student's saved code (to receive teacher edits)."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        session_code = request.query_params.get('session_code', '')
        
        if not session_code:
            return Response(
                {'error': 'Session code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = CodingSession.objects.get(session_code=session_code)
            snapshot = CodeSnapshot.objects.filter(
                session=session, student=request.user
            ).first()
            
            if snapshot:
                return Response({
                    'code': snapshot.code_content,
                    'language': snapshot.language,
                    'updated_at': snapshot.updated_at.isoformat() if hasattr(snapshot, 'updated_at') else None
                })
            else:
                return Response({
                    'code': '',
                    'language': 'python',
                    'updated_at': None
                })
        except CodingSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class TeacherSaveCodeView(APIView):
    """Teacher saves edits to a student's code."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        student_id = request.data.get('student_id')
        code = request.data.get('code', '')
        language = request.data.get('language', 'python')
        session_code = request.data.get('session_code', '')
        
        if not session_code or not student_id:
            return Response(
                {'error': 'Session code and student_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify teacher owns this session
        session = get_object_or_404(CodingSession, session_code=session_code, teacher=request.user)
        
        # Update student's code snapshot
        from authentication.models import User
        student = get_object_or_404(User, id=student_id)
        
        snapshot, created = CodeSnapshot.objects.update_or_create(
            session=session,
            student=student,
            defaults={
                'code_content': code,
                'language': language
            }
        )
        
        return Response({
            'success': True,
            'message': 'Student code updated by teacher',
            'created': created
        })


class SupportedLanguagesView(APIView):
    """Get list of supported programming languages."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            'languages': [
                {'id': 'python', 'name': 'Python', 'extension': '.py'},
                {'id': 'javascript', 'name': 'JavaScript', 'extension': '.js'},
                {'id': 'c', 'name': 'C', 'extension': '.c'},
                {'id': 'cpp', 'name': 'C++', 'extension': '.cpp'},
                {'id': 'java', 'name': 'Java', 'extension': '.java'},
            ]
        })


class SendNotificationView(APIView):
    """Send manual notification to teacher."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        session_code = request.data.get('session_code', '')
        message = request.data.get('message', 'Help requested')
        
        if not session_code:
            return Response(
                {'error': 'Session code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        session = get_object_or_404(CodingSession, session_code=session_code)
        
        # Create notification
        from sessions.models import ErrorNotification
        ErrorNotification.objects.create(
            session=session,
            student=request.user,
            error_message=message,
            is_read=False
        )
        
        return Response({'success': True, 'message': 'Notification sent'})



# AI Solver
class AISolveView(APIView):
    """Solve coding errors using configured AI."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if request.user.role != 'teacher':
             return Response({'error': 'Only teachers can use AI solver'}, status=status.HTTP_403_FORBIDDEN)
             
        prompt = request.data.get('prompt', '')
        context_code = request.data.get('code', '')
        language = request.data.get('language', 'python')
        
        if not prompt:
            return Response({'error': 'Prompt is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from authentication.models import TeacherSettings
        try:
            settings = request.user.settings
        except TeacherSettings.DoesNotExist:
             settings = TeacherSettings.objects.create(user=request.user)
             
        from .ai_service import AIService
        service = AIService(settings)
        result = service.solve(prompt, context_code, language)
        
        if 'error' in result:
             # Return error with 503 if all providers failed, or 400 for config error
             status_code = status.HTTP_503_SERVICE_UNAVAILABLE if result['error'] == 'All AI providers failed.' else status.HTTP_400_BAD_REQUEST
             return Response(result, status=status_code)
             
        return Response(result)
