"""
GitHub OAuth and API utilities.
"""
import os
import requests
from urllib.parse import urlencode

# GitHub OAuth settings
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'Ov23liaAfmVZc6YEUtYI')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', 'd6138f02becc866af8c62b89f467eed7ff136f14')
GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', 'https://compiler-share.onrender.com/api/auth/github/callback/')

# GitHub API endpoints
GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
GITHUB_API_URL = 'https://api.github.com'


def get_github_auth_url(state=None):
    """Generate GitHub OAuth authorization URL."""
    params = {
        'client_id': GITHUB_CLIENT_ID,
        'redirect_uri': GITHUB_REDIRECT_URI,
        'scope': 'repo user',
        'state': state or 'random_state'
    }
    return f"{GITHUB_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_token(code):
    """Exchange OAuth code for access token."""
    response = requests.post(
        GITHUB_TOKEN_URL,
        data={
            'client_id': GITHUB_CLIENT_ID,
            'client_secret': GITHUB_CLIENT_SECRET,
            'code': code,
            'redirect_uri': GITHUB_REDIRECT_URI
        },
        headers={'Accept': 'application/json'}
    )
    
    if response.status_code == 200:
        return response.json()
    return None


def get_github_user(access_token):
    """Get GitHub user info using access token."""
    response = requests.get(
        f"{GITHUB_API_URL}/user",
        headers={
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
    )
    
    if response.status_code == 200:
        return response.json()
    return None


def list_user_repos(access_token, page=1, per_page=30):
    """List user's repositories."""
    response = requests.get(
        f"{GITHUB_API_URL}/user/repos",
        params={
            'sort': 'updated',
            'direction': 'desc',
            'page': page,
            'per_page': per_page
        },
        headers={
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
    )
    
    if response.status_code == 200:
        repos = response.json()
        return [{
            'id': repo['id'],
            'name': repo['name'],
            'full_name': repo['full_name'],
            'private': repo['private'],
            'default_branch': repo['default_branch']
        } for repo in repos]
    return []


def push_file_to_repo(access_token, owner, repo, path, content, message, branch='main'):
    """Create or update a file in a repository."""
    import base64
    
    # Check if file exists to get its SHA
    file_url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{path}"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # Get existing file SHA if it exists
    sha = None
    existing = requests.get(file_url, headers=headers, params={'ref': branch})
    if existing.status_code == 200:
        sha = existing.json().get('sha')
    
    # Prepare request data
    data = {
        'message': message,
        'content': base64.b64encode(content.encode()).decode(),
        'branch': branch
    }
    
    if sha:
        data['sha'] = sha  # Required for update
    
    # Create or update file
    response = requests.put(file_url, json=data, headers=headers)
    
    if response.status_code in [200, 201]:
        result = response.json()
        return {
            'success': True,
            'file_url': result['content']['html_url'],
            'commit_url': result['commit']['html_url']
        }
    
    return {
        'success': False,
        'error': response.json().get('message', 'Failed to push file')
    }


def create_repo(access_token, name, description='', private=False, auto_init=True):
    """Create a new GitHub repository."""
    response = requests.post(
        f"{GITHUB_API_URL}/user/repos",
        json={
            'name': name,
            'description': description,
            'private': private,
            'auto_init': auto_init  # Creates README.md automatically
        },
        headers={
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
    )
    
    if response.status_code == 201:
        repo = response.json()
        return {
            'success': True,
            'repo': {
                'id': repo['id'],
                'name': repo['name'],
                'full_name': repo['full_name'],
                'private': repo['private'],
                'html_url': repo['html_url'],
                'default_branch': repo.get('default_branch', 'main')
            }
        }
    
    return {
        'success': False,
        'error': response.json().get('message', 'Failed to create repository')
    }
