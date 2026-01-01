
import requests
import json
import logging

logger = logging.getLogger(__name__)

class AIService:
    """Service to handle AI code solving requests with fallback logic."""
    
    def __init__(self, settings):
        self.settings = settings
        self.providers = []
        
        # Priority Order: OpenAI -> Gemini -> Groq
        if settings.openai_api_key:
            self.providers.append('openai')
        if settings.gemini_api_key:
            self.providers.append('gemini')
        if settings.groq_api_key:
            self.providers.append('groq')
            
    def solve(self, prompt, context_code=None, language='python'):
        """Attempts to solve the problem using available providers in order."""
        if not self.settings.is_ai_active:
            return {'error': 'AI assistance is disabled in settings.'}
            
        if not self.providers:
            return {'error': 'No API keys configured. Please add keys in settings.'}
            
        full_prompt = self._construct_prompt(prompt, context_code, language)
        
        errors = []
        for provider in self.providers:
            try:
                response = self._call_provider(provider, full_prompt)
                if response:
                    return {
                        'provider': provider,
                        'content': response
                    }
            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code
                error_msg = f"{provider}: "
                
                if status_code == 429:
                    error_msg += "Quota exceeded or Rate limit reached (Check billing)."
                elif status_code == 401:
                    error_msg += "Invalid API Key."
                else:
                    error_msg += str(e)
                    
                logger.error(error_msg)
                print(f"❌ AI ERROR [{provider}]: {error_msg}")
                errors.append(error_msg)
            except Exception as e:
                logger.error(f"AI Provider {provider} failed: {str(e)}")
                print(f"❌ AI ERROR [{provider}]: {str(e)}")
                errors.append(f"{provider}: {str(e)}")
                
        return {'error': 'All AI providers failed.', 'details': errors}

    def _construct_prompt(self, user_query, code, language):
        return f"""
You are an expert coding assistant for a teacher.
Language: {language}

Student's Code:
```{language}
{code or '# No code provided'}
```

Teacher's Query/Error:
{user_query}

Please provide:
1. A brief explanation of the issue/error.
2. The corrected code snippet.
3. Why the fix works.
Format your response in Markdown.
"""

    def _call_provider(self, provider, prompt):
        if provider == 'openai':
            return self._call_openai(prompt)
        elif provider == 'gemini':
            return self._call_gemini(prompt)
        elif provider == 'groq':
            return self._call_groq(prompt)
        return None

    def _call_openai(self, prompt):
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "gpt-4o", # Fallback to 3.5-turbo if needed, but assuming user has access
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']

    def _call_gemini(self, prompt):
        # Gemini usage via REST API
        # Requires: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.settings.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        data = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        try:
            return result['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError):
            raise Exception("Invalid response format from Gemini")

    def _call_groq(self, prompt):
        # Groq compatible with OpenAI SDK but using raw HTTP here
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.settings.groq_api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "llama3-70b-8192", 
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
