"""
WebSocket consumer for real-time coding sessions.
Handles bidirectional communication between teachers and students.
"""
import json
import asyncio
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class CodingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time code synchronization.
    
    Events:
    - code_change: Student sends code updates → broadcasted to teacher
    - teacher_edit: Teacher sends code → sent to specific student
    - run_code: Execute code and broadcast output
    - request_control: Teacher requests control of student's editor
    - release_control: Teacher releases control
    - heartbeat: Keep connection alive and track activity
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.session_code = self.scope['url_route']['kwargs']['session_code']
        self.session_group_name = f'session_{self.session_code}'
        self.user = self.scope.get('user')
        self.is_connected = False
        print(f"🔌 WebSocket Connect: code={self.session_code}, user={self.user}") # DEBUG
        
        # Check if user is authenticated
        user_data = await self.get_user_data()
        if not user_data:
            # Reject connection for unauthenticated users
            await self.close(code=4001)
            return
        
        # Join session group
        await self.channel_layer.group_add(
            self.session_group_name,
            self.channel_name
        )
        
        await self.accept()
        self.is_connected = True
        
        # Create unique channel for this user
        self.user_channel = f'user_{user_data["id"]}'
        await self.channel_layer.group_add(
            self.user_channel,
            self.channel_name
        )
        
        # Send confirmation to this client only first
        await self.send(text_data=json.dumps({
            'type': 'connection_confirmed',
            'user_id': user_data['id'],
            'username': user_data['username'],
            'role': user_data['role'],
            'session_code': self.session_code,
            'timestamp': datetime.now().isoformat()
        }))
        
        # Notify others of connection (with delay to ensure connection is stable)
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'user_connected',
                'user_id': user_data['id'],
                'username': user_data['username'],
                'full_name': user_data['full_name'],
                'role': user_data['role'],
                'timestamp': datetime.now().isoformat()
            }
        )
        
        # Update connection status
        if user_data['role'] == 'student':
            await self.update_connection_status(True)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        self.is_connected = False
        user_data = await self.get_user_data()
        
        if user_data:
            # Update connection status first
            if user_data['role'] == 'student':
                await self.update_connection_status(False)
            
            # Leave user channel
            try:
                await self.channel_layer.group_discard(
                    f'user_{user_data["id"]}',
                    self.channel_name
                )
            except Exception:
                pass
        
        # Leave session group
        try:
            await self.channel_layer.group_discard(
                self.session_group_name,
                self.channel_name
            )
        except Exception:
            pass
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            handlers = {
                'code_change': self.handle_code_change,
                'teacher_edit': self.handle_teacher_edit,
                'run_code': self.handle_run_code,
                'request_control': self.handle_request_control,
                'release_control': self.handle_release_control,
                'heartbeat': self.handle_heartbeat,
                'console_clear': self.handle_console_clear,
                'student_notification': self.handle_student_notification,
            }
            
            handler = handlers.get(message_type)
            if handler:
                await handler(data)
            else:
                await self.send_error(f'Unknown message type: {message_type}')
        
        except json.JSONDecodeError:
            await self.send_error('Invalid JSON')
        except Exception as e:
            await self.send_error(str(e))
    
    # Message handlers
    
    async def handle_code_change(self, data):
        """Handle code changes from student."""
        user_data = await self.get_user_data()
        if not user_data:
            return
        
        code = data.get('code', '')
        language = data.get('language', 'python')
        cursor_position = data.get('cursor_position', 0)
        
        # Save code snapshot
        await self.save_code_snapshot(code, language)
        
        # Update last active
        await self.update_last_active()
        
        # Broadcast to session (teachers will receive this)
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'student_code_update',
                'student_id': user_data['id'],
                'username': user_data['username'],
                'full_name': user_data['full_name'],
                'code': code,
                'language': language,
                'cursor_position': cursor_position,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    async def handle_teacher_edit(self, data):
        """Handle code edits from teacher."""
        user_data = await self.get_user_data()
        if not user_data or user_data['role'] != 'teacher':
            await self.send_error('Only teachers can edit student code')
            return
        
        student_id = data.get('student_id')
        code = data.get('code', '')
        language = data.get('language', 'python')
        cursor_position = data.get('cursor_position', 0)
        
        # Save code snapshot for student
        await self.save_code_for_student(student_id, code, language)
        
        # Send to specific student
        await self.channel_layer.group_send(
            f'user_{student_id}',
            {
                'type': 'teacher_edit_received',
                'teacher_id': user_data['id'],
                'teacher_name': user_data['full_name'],
                'code': code,
                'language': language,
                'cursor_position': cursor_position,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    async def handle_run_code(self, data):
        """Handle code execution request."""
        user_data = await self.get_user_data()
        if not user_data:
            return
        
        code = data.get('code', '')
        language = data.get('language', 'python')
        
        # Execute code
        result = await self.execute_code(code, language)
        
        # Save console log
        await self.save_console_log(
            result['output'] if result['success'] else result['error'],
            'output' if result['success'] else 'error'
        )
        
        # Send result back to user
        await self.send(text_data=json.dumps({
            'type': 'code_output',
            'success': result['success'],
            'output': result.get('output', ''),
            'error': result.get('error', ''),
            'execution_time': result.get('execution_time', 0),
            'timestamp': datetime.now().isoformat()
        }))
        
        # Broadcast to session for teachers
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'student_output',
                'student_id': user_data['id'],
                'username': user_data['username'],
                'full_name': user_data['full_name'],
                'success': result['success'],
                'output': result.get('output', ''),
                'error': result.get('error', ''),
                'language': language,
                'timestamp': datetime.now().isoformat()
            }
        )
        
        # If error, do NOT create error notification automatically
        # if not result['success']:
        #     await self.create_error_notification(result.get('error', ''))

    async def handle_student_notification(self, data):
        """Handle manual notification from student."""
        user_data = await self.get_user_data()
        if not user_data:
            return

        message = data.get('message', 'Help requested')
        
        # Create notification in DB
        await self.create_error_notification(message)
        
        # Broadcast to teachers
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'student_alert',
                'student_id': user_data['id'],
                'username': user_data['username'],
                'full_name': user_data['full_name'],
                'message': message,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    async def handle_request_control(self, data):
        """Handle teacher requesting control of student's editor."""
        user_data = await self.get_user_data()
        if not user_data or user_data['role'] != 'teacher':
            return
        
        student_id = data.get('student_id')
        
        await self.channel_layer.group_send(
            f'user_{student_id}',
            {
                'type': 'control_requested',
                'teacher_id': user_data['id'],
                'teacher_name': user_data['full_name'],
                'timestamp': datetime.now().isoformat()
            }
        )
    
    async def handle_release_control(self, data):
        """Handle teacher releasing control."""
        user_data = await self.get_user_data()
        if not user_data or user_data['role'] != 'teacher':
            return
        
        student_id = data.get('student_id')
        
        await self.channel_layer.group_send(
            f'user_{student_id}',
            {
                'type': 'control_released',
                'teacher_id': user_data['id'],
                'timestamp': datetime.now().isoformat()
            }
        )
    
    async def handle_heartbeat(self, data):
        """Handle heartbeat for activity tracking."""
        user_data = await self.get_user_data()
        if user_data and user_data['role'] == 'student':
            await self.update_last_active()
            
            # Broadcast activity status
            await self.channel_layer.group_send(
                self.session_group_name,
                {
                    'type': 'student_activity',
                    'student_id': user_data['id'],
                    'status': 'active',
                    'timestamp': datetime.now().isoformat()
                }
            )
    
    async def handle_console_clear(self, data):
        """Handle console clear request."""
        await self.send(text_data=json.dumps({
            'type': 'console_cleared',
            'timestamp': datetime.now().isoformat()
        }))
    
    # Safe send method to prevent "closed protocol" errors
    async def safe_send(self, data):
        """Send data only if connection is still open."""
        if not getattr(self, 'is_connected', False):
            return
        try:
            await self.send(text_data=json.dumps(data))
        except Exception as e:
            # Connection closed, ignore the error
            pass
    
    # Outgoing message handlers (called by group_send)
    
    async def user_connected(self, event):
        """Send user connected notification."""
        await self.safe_send(event)
    
    async def user_disconnected(self, event):
        """Send user disconnected notification."""
        await self.safe_send(event)
    
    async def student_code_update(self, event):
        """Send student code update to teachers."""
        user_data = await self.get_user_data()
        if user_data and user_data['role'] == 'teacher':
            await self.safe_send(event)
    
    async def teacher_edit_received(self, event):
        """Send teacher edit to student."""
        await self.safe_send(event)
    
    async def student_output(self, event):
        """Send student output to teachers."""
        user_data = await self.get_user_data()
        if user_data and user_data['role'] == 'teacher':
            await self.safe_send(event)
    
    async def control_requested(self, event):
        """Send control requested notification."""
        await self.safe_send(event)
    
    async def control_released(self, event):
        """Send control released notification."""
        await self.safe_send(event)
    
    async def student_activity(self, event):
        """Send student activity update to teachers."""
        print(f"🔔 student_activity received: {event}")  # DEBUG
        user_data = await self.get_user_data()
        print(f"👤 User data: {user_data}")  # DEBUG
        if user_data and user_data['role'] == 'teacher':
            print(f"✅ Sending to teacher: {event}")  # DEBUG
            await self.safe_send(event)

    async def student_alert(self, event):
        """Send student alert to teachers."""
        user_data = await self.get_user_data()
        if user_data and user_data['role'] == 'teacher':
            await self.safe_send(event)
    
    async def student_error(self, event):
        """Send student error notification to teachers."""
        user_data = await self.get_user_data()
        if user_data and user_data['role'] == 'teacher':
            await self.safe_send(event)
    
    # Helper methods
    
    async def send_error(self, message):
        """Send error message to client."""
        await self.safe_send({
            'type': 'error',
            'message': message,
            'timestamp': datetime.now().isoformat()
        })
    
    @database_sync_to_async
    def get_user_data(self):
        """Get current user data."""
        user = self.scope.get('user')
        if user and user.is_authenticated:
            return {
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name or user.username,
                'role': user.role
            }
        return None
    
    @database_sync_to_async
    def update_connection_status(self, is_connected):
        """Update participant connection status."""
        from sessions.models import SessionParticipant, CodingSession
        try:
            session = CodingSession.objects.get(session_code=self.session_code)
            participant = SessionParticipant.objects.filter(
                session=session,
                student=self.scope['user']
            ).first()
            if participant:
                participant.is_connected = is_connected
                participant.save()
        except (CodingSession.DoesNotExist, Exception):
            pass
    
    @database_sync_to_async
    def update_last_active(self):
        """Update last active timestamp."""
        from sessions.models import SessionParticipant, CodingSession
        try:
            session = CodingSession.objects.get(session_code=self.session_code)
            SessionParticipant.objects.filter(
                session=session,
                student=self.scope['user']
            ).update(last_active=datetime.now())
        except Exception:
            pass
    
    @database_sync_to_async
    def save_code_snapshot(self, code, language):
        """Save code snapshot for current user."""
        from sessions.models import CodeSnapshot, CodingSession
        try:
            session = CodingSession.objects.get(session_code=self.session_code)
            snapshot, _ = CodeSnapshot.objects.get_or_create(
                session=session,
                student=self.scope['user']
            )
            snapshot.code_content = code
            snapshot.language = language
            snapshot.save()
        except Exception:
            pass
    
    @database_sync_to_async
    def save_code_for_student(self, student_id, code, language):
        """Save code snapshot for a specific student."""
        from sessions.models import CodeSnapshot, CodingSession
        try:
            session = CodingSession.objects.get(session_code=self.session_code)
            snapshot = CodeSnapshot.objects.filter(
                session=session,
                student_id=student_id
            ).first()
            if snapshot:
                snapshot.code_content = code
                snapshot.language = language
                snapshot.save()
        except Exception:
            pass
    
    @database_sync_to_async
    def save_console_log(self, message, log_type):
        """Save console log."""
        from sessions.models import ConsoleLog, CodingSession
        try:
            session = CodingSession.objects.get(session_code=self.session_code)
            ConsoleLog.objects.create(
                session=session,
                student=self.scope['user'],
                log_type=log_type,
                message=message
            )
        except Exception:
            pass
    
    @database_sync_to_async
    def create_error_notification(self, error_message):
        """Create error notification for teacher."""
        from sessions.models import ErrorNotification, CodingSession
        import re
        
        try:
            session = CodingSession.objects.get(session_code=self.session_code)
            
            # Try to parse line number from error
            line_match = re.search(r'line (\d+)', error_message, re.IGNORECASE)
            error_line = int(line_match.group(1)) if line_match else None
            
            ErrorNotification.objects.create(
                session=session,
                student=self.scope['user'],
                error_message=error_message,
                error_line=error_line
            )
            
            # Broadcast error notification
            user_data = {
                'id': self.scope['user'].id,
                'username': self.scope['user'].username,
                'full_name': self.scope['user'].full_name or self.scope['user'].username
            }
            
            return user_data
        except Exception:
            pass
        return None
    
    async def execute_code(self, code, language):
        """Execute code in sandboxed environment."""
        from .executor import CodeExecutor
        executor = CodeExecutor()
        return await database_sync_to_async(executor.execute)(code, language)

class InteractiveExecutionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for interactive code execution (Terminal-like).
    """
    async def connect(self):
        await self.accept()
        self.process = None
        self.files_to_cleanup = []

    async def disconnect(self, close_code):
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=1)
            except:
                try:
                    self.process.kill()
                except:
                    pass
        
        # Cleanup files
        import shutil
        import os
        for path in self.files_to_cleanup:
            try:
                if path and os.path.exists(path):
                    if os.path.isdir(path):
                        shutil.rmtree(path)
                    else:
                        os.unlink(path)
            except:
                pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")

            if message_type == "run":
                # Must run in background to avoid blocking 'receive' (which handles input/stop)
                asyncio.create_task(self.start_execution(data.get("code"), data.get("language")))
            elif message_type == "input":
                await self.send_input(data.get("input"))
            elif message_type == "stop":
                if self.process:
                    self.process.terminate()
                    await self.send(text_data=json.dumps({
                        "type": "status",
                        "status": "stopped"
                    }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "error": str(e)
            }))

    async def start_execution(self, code, language):
        from .executor import CodeExecutor
        import asyncio

        if self.process:
            try:
                self.process.terminate()
            except:
                pass


        try:
            executor = CodeExecutor()
            # Directly await the async method, no database_sync_to_async needed
            process, f1, f2 = await executor.start_async_interactive(code, language)
            
            self.process = process
            if f1: self.files_to_cleanup.append(f1)
            if f2: self.files_to_cleanup.append(f2)

            await self.send(text_data=json.dumps({
                "type": "status",
                "status": "started"
            }))



            # Start reading stdout/stderr in background tasks
            stdout_task = asyncio.create_task(self.read_stream(process.stdout, "stdout"))
            stderr_task = asyncio.create_task(self.read_stream(process.stderr, "stderr"))

            # Wait for process to finish
            return_code = await process.wait()
            
            # Wait for output to be fully read
            await asyncio.gather(stdout_task, stderr_task)

            await self.send(text_data=json.dumps({
                "type": "status",
                "status": "finished",
                "exit_code": return_code
            }))

        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "error": str(e)
            }))

    async def read_stream(self, stream, stream_type):
        """Read data from a stream and send it to websocket."""
        try:
            while True:
                # Read 1 byte at a time for responsiveness
                # StreamReader.read(n) is a coroutine
                chunk = await stream.read(1)
                if not chunk:
                    break
                
                # Decode bytes to string, replacing errors
                decoded_chunk = chunk.decode('utf-8', errors='replace')
                


                await self.send(text_data=json.dumps({
                    "type": "output",
                    "stream": stream_type,
                    "data": decoded_chunk
                }))
        except Exception as e:
            # print(f"DEBUG: Error reading stream {stream_type}: {e}")
            pass

    async def send_input(self, input_text):
        if self.process and self.process.stdin:
            try:
                print(f"DEBUG: Writing input to process: {repr(input_text)}")
                # Encode text to bytes
                input_bytes = input_text.encode('utf-8')
                self.process.stdin.write(input_bytes) # write is not async in asyncio subprocess
                await self.process.stdin.drain()      # flush using drain
                print("DEBUG: Input written and drained")
            except Exception as e:
                print(f"DEBUG: Error writing input: {e}")
                pass

