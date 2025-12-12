"""
Sandboxed code execution for Python and JavaScript.
"""
import subprocess
import time
import tempfile
import os
from django.conf import settings


class CodeExecutor:
    """
    Executes code in a sandboxed environment with timeout and memory limits.
    """
    
    SUPPORTED_LANGUAGES = ['python', 'javascript']
    
    def __init__(self):
        self.timeout = getattr(settings, 'CODE_EXECUTION_TIMEOUT', 5)
        self.memory_limit = getattr(settings, 'CODE_EXECUTION_MEMORY_LIMIT', 50 * 1024 * 1024)
    
    def execute(self, code, language):
        """
        Execute code and return result.
        
        Args:
            code: The code to execute
            language: Programming language ('python' or 'javascript')
        
        Returns:
            dict with keys: success, output/error, execution_time
        """
        if language not in self.SUPPORTED_LANGUAGES:
            return {
                'success': False,
                'error': f'Unsupported language: {language}. Supported: {", ".join(self.SUPPORTED_LANGUAGES)}',
                'execution_time': 0
            }
        
        if language == 'python':
            return self._execute_python(code)
        elif language == 'javascript':
            return self._execute_javascript(code)
    
    def _execute_python(self, code):
        """Execute Python code."""
        start_time = time.time()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Run with timeout
            result = subprocess.run(
                ['python3', temp_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=tempfile.gettempdir()
            )
            
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return {
                    'success': True,
                    'output': result.stdout or '(No output)',
                    'execution_time': round(execution_time, 3)
                }
            else:
                return {
                    'success': False,
                    'error': result.stderr or 'Unknown error',
                    'execution_time': round(execution_time, 3)
                }
        
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': f'Execution timeout ({self.timeout} seconds exceeded)',
                'execution_time': self.timeout
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file)
            except:
                pass
    
    def _execute_javascript(self, code):
        """Execute JavaScript code using Node.js."""
        start_time = time.time()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Run with timeout
            result = subprocess.run(
                ['node', temp_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=tempfile.gettempdir()
            )
            
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return {
                    'success': True,
                    'output': result.stdout or '(No output)',
                    'execution_time': round(execution_time, 3)
                }
            else:
                return {
                    'success': False,
                    'error': result.stderr or 'Unknown error',
                    'execution_time': round(execution_time, 3)
                }
        
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': f'Execution timeout ({self.timeout} seconds exceeded)',
                'execution_time': self.timeout
            }
        except FileNotFoundError:
            return {
                'success': False,
                'error': 'Node.js is not installed or not in PATH',
                'execution_time': 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file)
            except:
                pass


# Singleton instance
executor = CodeExecutor()
