"""
Authentication views for register, login, and profile.
"""
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""
    
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """User login endpoint."""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    """User profile endpoint."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """User logout endpoint - blacklists refresh token."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'message': 'Logged out'})


# GitHub OAuth Views
from django.shortcuts import redirect
from .models import GitHubConnection
from . import github as github_utils


class GitHubAuthView(APIView):
    """Start GitHub OAuth flow - returns auth URL."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Use user ID as state for security (and optional next path)
        # Format: userid|nextpath
        next_path = request.GET.get('next', '/join')
        state = f"{request.user.id}|{next_path}"
        auth_url = github_utils.get_github_auth_url(state)
        return Response({'auth_url': auth_url})


class GitHubCallbackView(APIView):
    """Handle GitHub OAuth callback."""
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        code = request.GET.get('code')
        state_str = request.GET.get('state')
        
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        # Parse state to get next path
        next_path = '/join' # Default
        user_id = None
        
        if state_str:
            parts = state_str.split('|')
            if len(parts) >= 1:
                user_id = parts[0]
            if len(parts) >= 2:
                next_path = parts[1]
        
        error_redirect = f"{frontend_url}{next_path}?github=error"
        success_redirect = f"{frontend_url}{next_path}?github=success"
        
        if not code or not user_id:
            return redirect(error_redirect)
        
        # Exchange code for token
        token_data = github_utils.exchange_code_for_token(code)
        
        if not token_data or 'access_token' not in token_data:
            return redirect(error_redirect)
        
        access_token = token_data['access_token']
        
        # Get GitHub user info
        github_user = github_utils.get_github_user(access_token)
        
        if not github_user:
            return redirect(error_redirect)
        
        # Find user by state (user ID)
        try:
            user = User.objects.get(id=int(user_id))
        except (User.DoesNotExist, ValueError):
            return redirect(error_redirect)
        
        # Save or update GitHub connection
        GitHubConnection.objects.update_or_create(
            user=user,
            defaults={
                'access_token': access_token,
                'github_username': github_user.get('login', ''),
                'github_id': github_user.get('id')
            }
        )
        
        # Redirect back to app with success
        return redirect(success_redirect)


class GitHubStatusView(APIView):
    """Check if user has GitHub connected."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            connection = request.user.github_connection
            return Response({
                'connected': True,
                'github_username': connection.github_username
            })
        except GitHubConnection.DoesNotExist:
            return Response({'connected': False})


class GitHubReposView(APIView):
    """List user's GitHub repositories."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            connection = request.user.github_connection
        except GitHubConnection.DoesNotExist:
            return Response(
                {'error': 'GitHub not connected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        repos = github_utils.list_user_repos(connection.access_token)
        return Response({'repos': repos})


class GitHubPushView(APIView):
    """Push code to a GitHub repository."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            connection = request.user.github_connection
        except GitHubConnection.DoesNotExist:
            return Response(
                {'error': 'GitHub not connected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        repo_full_name = request.data.get('repo')  # e.g., "username/repo"
        filename = request.data.get('filename', 'main.py')
        code = request.data.get('code', '')
        message = request.data.get('message', 'Update code from CodeMonitor')
        branch = request.data.get('branch', 'main')
        
        if not repo_full_name or not code:
            return Response(
                {'error': 'repo and code are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Split repo full name into owner/repo
        parts = repo_full_name.split('/')
        if len(parts) != 2:
            return Response(
                {'error': 'Invalid repo format. Use owner/repo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        owner, repo = parts
        
        result = github_utils.push_file_to_repo(
            access_token=connection.access_token,
            owner=owner,
            repo=repo,
            path=filename,
            content=code,
            message=message,
            branch=branch
        )
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class GitHubCreateRepoView(APIView):
    """Create a new GitHub repository."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            connection = request.user.github_connection
        except GitHubConnection.DoesNotExist:
            return Response(
                {'error': 'GitHub not connected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        name = request.data.get('name', '')
        description = request.data.get('description', 'Created from CodeMonitor')
        private = request.data.get('private', False)
        
        if not name:
            return Response(
                {'error': 'Repository name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = github_utils.create_repo(
            access_token=connection.access_token,
            name=name,
            description=description,
            private=private
        )
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
