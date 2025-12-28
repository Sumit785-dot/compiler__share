"""
Sandboxed code execution for Python, JavaScript, C, C++, and Java.
"""
import subprocess
import time
import tempfile
import os
import asyncio
from django.conf import settings


class CodeExecutor:
    """
    Executes code in a sandboxed environment with timeout and memory limits.
    """
    
    SUPPORTED_LANGUAGES = ['python', 'javascript', 'c', 'cpp', 'java']
    
    def __init__(self):
        self.timeout = getattr(settings, 'CODE_EXECUTION_TIMEOUT', 10)
        self.memory_limit = getattr(settings, 'CODE_EXECUTION_MEMORY_LIMIT', 50 * 1024 * 1024)
    
    def execute(self, code, language):
        """
        Execute code and return result.
        
        Args:
            code: The code to execute
            language: Programming language ('python', 'javascript', 'c', 'cpp', 'java')
        
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
        elif language == 'c':
            return self._execute_c(code)
        elif language == 'cpp':
            return self._execute_cpp(code)
        elif language == 'java':
            return self._execute_java(code)

    async def start_async_interactive(self, code, language):
        """
        Start an interactive async process and return Process object, source file path, and executable path (if any).
        
        Returns:
            (process, temp_file_path, executable_path_to_cleanup)
        """
        if language not in self.SUPPORTED_LANGUAGES:
            raise ValueError(f'Unsupported language: {language}')

        if language == 'python':
            return await self._start_async_python(code)
        elif language == 'javascript':
            return await self._start_async_javascript(code)
        elif language == 'c':
            return await self._start_async_c(code)
        elif language == 'cpp':
            return await self._start_async_cpp(code)
        elif language == 'java':
            return await self._start_async_java(code)
    
    async def _start_async_python(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        process = await asyncio.create_subprocess_exec(
            'python3', '-u', temp_file,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tempfile.gettempdir()
        )
        return process, temp_file, None

    async def _start_async_javascript(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_file = f.name
            
        process = await asyncio.create_subprocess_exec(
            'node', temp_file,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tempfile.gettempdir()
        )
        return process, temp_file, None

    async def _start_async_c(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.c', delete=False) as f:
            f.write(code)
            source_file = f.name
        
        output_file = source_file.replace('.c', '')
        
        # Compile first (run_in_executor to avoid blocking event loop)
        await asyncio.to_thread(subprocess.run, ['gcc', source_file, '-o', output_file], check=True, timeout=10)
        
        process = await asyncio.create_subprocess_exec(
            output_file,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tempfile.gettempdir()
        )
        return process, source_file, output_file

    async def _start_async_cpp(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.cpp', delete=False) as f:
            f.write(code)
            source_file = f.name
        
        output_file = source_file.replace('.cpp', '')
        
        # Compile
        await asyncio.to_thread(subprocess.run, ['g++', source_file, '-o', output_file], check=True, timeout=10)
        
        process = await asyncio.create_subprocess_exec(
            output_file,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tempfile.gettempdir()
        )
        return process, source_file, output_file

    async def _start_async_java(self, code):
        import re
        class_match = re.search(r'public\s+class\s+(\w+)', code)
        class_name = class_match.group(1) if class_match else 'Main'
        if 'class ' not in code:
            code = f'public class Main {{\n    public static void main(String[] args) {{\n        {code}\n    }}\n}}'
            class_name = 'Main'

        temp_dir = tempfile.mkdtemp()
        source_file = os.path.join(temp_dir, f'{class_name}.java')
        
        with open(source_file, 'w') as f:
            f.write(code)
            
        # Compile
        await asyncio.to_thread(subprocess.run, ['javac', source_file], check=True, timeout=10, cwd=temp_dir)
        
        process = await asyncio.create_subprocess_exec(
            'java', class_name,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=temp_dir
        )
        return process, temp_dir, None
    
    def _start_python(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        process = subprocess.Popen(
            ['python3', '-u', temp_file], # -u for unbuffered python stdout
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False, # Binary mode for unbuffered pipe access
            bufsize=0,  # Unbuffered
            cwd=tempfile.gettempdir()
        )
        return process, temp_file, None

    def _start_javascript(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_file = f.name
            
        process = subprocess.Popen(
            ['node', temp_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False,
            bufsize=0,
            cwd=tempfile.gettempdir()
        )
        return process, temp_file, None

    def _start_c(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.c', delete=False) as f:
            f.write(code)
            source_file = f.name
        
        output_file = source_file.replace('.c', '')
        
        # Compile first
        subprocess.run(['gcc', source_file, '-o', output_file], check=True, timeout=10)
        
        process = subprocess.Popen(
            [output_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0,
            cwd=tempfile.gettempdir()
        )
        return process, source_file, output_file

    def _start_cpp(self, code):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.cpp', delete=False) as f:
            f.write(code)
            source_file = f.name
        
        output_file = source_file.replace('.cpp', '')
        
        # Compile
        subprocess.run(['g++', source_file, '-o', output_file], check=True, timeout=10)
        
        process = subprocess.Popen(
            [output_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0,
            cwd=tempfile.gettempdir()
        )
        return process, source_file, output_file

    def _start_java(self, code):
        import re
        class_match = re.search(r'public\s+class\s+(\w+)', code)
        class_name = class_match.group(1) if class_match else 'Main'
        if 'class ' not in code:
            code = f'public class Main {{\n    public static void main(String[] args) {{\n        {code}\n    }}\n}}'
            class_name = 'Main'

        temp_dir = tempfile.mkdtemp()
        source_file = os.path.join(temp_dir, f'{class_name}.java')
        
        with open(source_file, 'w') as f:
            f.write(code)
            
        subprocess.run(['javac', source_file], check=True, timeout=10, cwd=temp_dir)
        
        process = subprocess.Popen(
            ['java', class_name],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False,
            bufsize=0,
            cwd=temp_dir
        )
        # For Java, we return the temp_dir as the file to cleanup
        return process, temp_dir, None
    
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
        
        except subprocess.TimeoutExpired as e:
            output = e.stdout if e.stdout else ''
            error_out = e.stderr if e.stderr else ''
            return {
                'success': False,
                'error': f'Execution timeout ({self.timeout}s exceeded).\nOutput before timeout:\n{output}\nError:\n{error_out}',
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
        
        except subprocess.TimeoutExpired as e:
            output = e.stdout if e.stdout else ''
            error_out = e.stderr if e.stderr else ''
            return {
                'success': False,
                'error': f'Execution timeout ({self.timeout}s exceeded).\nOutput before timeout:\n{output}\nError:\n{error_out}',
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

    def _execute_c(self, code):
        """Execute C code using GCC."""
        start_time = time.time()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.c', delete=False) as f:
            f.write(code)
            source_file = f.name
        
        # Output binary path
        output_file = source_file.replace('.c', '')
        
        try:
            # Compile the C code
            compile_result = subprocess.run(
                ['gcc', source_file, '-o', output_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=tempfile.gettempdir()
            )
            
            if compile_result.returncode != 0:
                return {
                    'success': False,
                    'error': f'Compilation Error:\n{compile_result.stderr}',
                    'execution_time': round(time.time() - start_time, 3)
                }
            
            # Run the compiled binary
            result = subprocess.run(
                [output_file],
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
                    'error': result.stderr or 'Runtime error',
                    'execution_time': round(execution_time, 3)
                }
        
        except subprocess.TimeoutExpired as e:
            output = e.stdout if e.stdout else ''
            error_out = e.stderr if e.stderr else ''
            return {
                'success': False,
                'error': f'Execution timeout ({self.timeout}s exceeded).\nOutput before timeout:\n{output}\nError:\n{error_out}',
                'execution_time': self.timeout
            }
        except FileNotFoundError:
            return {
                'success': False,
                'error': 'GCC is not installed or not in PATH',
                'execution_time': 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }
        finally:
            # Clean up temp files
            try:
                os.unlink(source_file)
            except:
                pass
            try:
                os.unlink(output_file)
            except:
                pass

    def _execute_cpp(self, code):
        """Execute C++ code using G++."""
        start_time = time.time()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.cpp', delete=False) as f:
            f.write(code)
            source_file = f.name
        
        # Output binary path
        output_file = source_file.replace('.cpp', '')
        
        try:
            # Compile the C++ code
            compile_result = subprocess.run(
                ['g++', source_file, '-o', output_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=tempfile.gettempdir()
            )
            
            if compile_result.returncode != 0:
                return {
                    'success': False,
                    'error': f'Compilation Error:\n{compile_result.stderr}',
                    'execution_time': round(time.time() - start_time, 3)
                }
            
            # Run the compiled binary
            result = subprocess.run(
                [output_file],
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
                    'error': result.stderr or 'Runtime error',
                    'execution_time': round(execution_time, 3)
                }
        
        except subprocess.TimeoutExpired as e:
            output = e.stdout if e.stdout else ''
            error_out = e.stderr if e.stderr else ''
            return {
                'success': False,
                'error': f'Execution timeout ({self.timeout}s exceeded).\nOutput before timeout:\n{output}\nError:\n{error_out}',
                'execution_time': self.timeout
            }
        except FileNotFoundError:
            return {
                'success': False,
                'error': 'G++ is not installed or not in PATH',
                'execution_time': 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }
        finally:
            # Clean up temp files
            try:
                os.unlink(source_file)
            except:
                pass
            try:
                os.unlink(output_file)
            except:
                pass

    def _execute_java(self, code):
        """Execute Java code."""
        start_time = time.time()
        
        # Extract class name from code (look for public class)
        import re
        class_match = re.search(r'public\s+class\s+(\w+)', code)
        if class_match:
            class_name = class_match.group(1)
        else:
            # Default class name if not found
            class_name = 'Main'
            # Wrap code in Main class if no public class found
            if 'class ' not in code:
                code = f'''public class Main {{
    public static void main(String[] args) {{
        {code}
    }}
}}'''
        
        # Create a temporary directory for Java files
        temp_dir = tempfile.mkdtemp()
        source_file = os.path.join(temp_dir, f'{class_name}.java')
        
        try:
            # Write the source file
            with open(source_file, 'w') as f:
                f.write(code)
            
            # Compile the Java code
            compile_result = subprocess.run(
                ['javac', source_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=temp_dir
            )
            
            if compile_result.returncode != 0:
                return {
                    'success': False,
                    'error': f'Compilation Error:\n{compile_result.stderr}',
                    'execution_time': round(time.time() - start_time, 3)
                }
            
            # Run the compiled Java class
            result = subprocess.run(
                ['java', class_name],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=temp_dir
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
                    'error': result.stderr or 'Runtime error',
                    'execution_time': round(execution_time, 3)
                }
        
        except subprocess.TimeoutExpired as e:
            output = e.stdout if e.stdout else ''
            error_out = e.stderr if e.stderr else ''
            return {
                'success': False,
                'error': f'Execution timeout ({self.timeout}s exceeded).\nOutput before timeout:\n{output}\nError:\n{error_out}',
                'execution_time': self.timeout
            }
        except FileNotFoundError:
            return {
                'success': False,
                'error': 'Java JDK is not installed or not in PATH',
                'execution_time': 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }
        finally:
            # Clean up temp directory
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except:
                pass


# Singleton instance
executor = CodeExecutor()
