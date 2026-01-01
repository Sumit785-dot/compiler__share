import requests
import base64
import os
import threading
import logging
from django.conf import settings

# OPTIMIZATION: Use proper logging instead of print statements
logger = logging.getLogger(__name__)

class ArchiveService:
    @staticmethod
    def get_headers():
        if not hasattr(settings, 'GITHUB_ADMIN_TOKEN') or not settings.GITHUB_ADMIN_TOKEN:
            return None
        return {
            'Authorization': f'token {settings.GITHUB_ADMIN_TOKEN}',
            'Accept': 'application/vnd.github.v3+json'
        }

    @staticmethod
    def get_repo_name(session):
        return f"Observer-Session-{session.session_code}-{topic}"

    @staticmethod
    def get_file_path(student, language):
        # Format: {StudentName}_{ID}/main.{ext}
        ext_map = {
            'python': 'py', 'javascript': 'js', 'c': 'c', 
            'cpp': 'cpp', 'java': 'java'
        }
        ext = ext_map.get(language, 'txt')
        username = "".join(c for c in student.username if c.isalnum() or c in ('-', '_'))
        return f"{username}_{student.id}/main.{ext}"

    @staticmethod
    def ensure_repo_exists(repo_name):
        headers = ArchiveService.get_headers()
        if not headers:
            return False

        # Check existence
        owner = settings.GITHUB_ADMIN_USERNAME
        check_url = f"https://api.github.com/repos/{owner}/{repo_name}"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code == 200:
            return True
        
        # Create if missing
        create_url = "https://api.github.com/user/repos"
        data = {
            "name": repo_name,
            "private": True,
            "description": "Automated Code Archive from Observer Session",
            "auto_init": True
        }
        create_res = requests.post(create_url, json=data, headers=headers)
        return create_res.status_code == 201

    @staticmethod
    def push_file(repo_name, file_path, content, message):
        headers = ArchiveService.get_headers()
        if not headers:
            return False

        owner = settings.GITHUB_ADMIN_USERNAME
        url = f"https://api.github.com/repos/{owner}/{repo_name}/contents/{file_path}"
        
        # Get SHA if file exists (for update)
        get_res = requests.get(url, headers=headers)
        sha = None
        if get_res.status_code == 200:
            sha = get_res.json().get('sha')

        # Push
        data = {
            "message": message,
            "content": base64.b64encode(content.encode('utf-8')).decode('utf-8'),
            "branch": "main"
        }
        if sha:
            data['sha'] = sha

        put_res = requests.put(url, json=data, headers=headers)
        return put_res.status_code in [200, 201]

    @staticmethod
    def archive_code_async(session_code, topic, student_username, student_id, code, language):
        """
        Calculates repo name and path locally to minimize data passed to thread
        """
        try:
            # Mock session object/student object strictly for helper methods if needed,
            # or just replicate logic to avoid passing Django models to threads if not db-serialized.
            # Here we just use the raw data.
            
            # Repo Name Logic
            s_topic = "".join(c for c in topic if c.isalnum() or c in ('-', '_')).strip()
            repo_name = f"Observer-Session-{session_code}-{s_topic}"
            
            # File Path Logic
            ext_map = {'python': 'py', 'javascript': 'js', 'c': 'c', 'cpp': 'cpp', 'java': 'java'}
            ext = ext_map.get(language, 'txt')
            s_username = "".join(c for c in student_username if c.isalnum() or c in ('-', '_'))
            file_path = f"{s_username}_{student_id}/main.{ext}"

            # 1. Ensure Repo
            if ArchiveService.ensure_repo_exists(repo_name):
                # 2. Push Code
                ArchiveService.push_file(
                    repo_name, 
                    file_path, 
                    code, 
                    f"Auto-archive: {student_username} update on {language}"
                )
        except Exception as e:
            logger.warning(f"Archiving failed: {e}")

    @staticmethod
    def trigger_archive(session, student, code, language):
        """
        Fire-and-forget method to not block the request
        """
        # Safety check for settings
        if not hasattr(settings, 'GITHUB_ADMIN_TOKEN') or not settings.GITHUB_ADMIN_TOKEN:
            return

        thread = threading.Thread(
            target=ArchiveService.archive_code_async,
            args=(session.session_code, session.topic, student.username, student.id, code, language)
        )
        thread.start()
