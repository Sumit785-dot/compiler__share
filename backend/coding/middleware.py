"""
WebSocket authentication middleware.
Authenticates WebSocket connections using JWT tokens.
"""
import logging
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    try:
        user = User.objects.get(id=user_id)
        logger.info(f"WebSocket auth: Found user {user.username} (role: {user.role})")
        return user
    except User.DoesNotExist:
        logger.warning(f"WebSocket auth: User with id {user_id} not found")
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSocket connections.
    Token can be passed via query string: ws://.../?token=<jwt_token>
    """
    
    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if token:
            try:
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                logger.info(f"WebSocket auth: Token valid, user_id={user_id}")
                scope['user'] = await get_user(user_id)
            except TokenError as e:
                logger.warning(f"WebSocket auth: Token error - {e}")
                scope['user'] = AnonymousUser()
            except Exception as e:
                logger.error(f"WebSocket auth: Unexpected error - {e}")
                scope['user'] = AnonymousUser()
        else:
            logger.warning("WebSocket auth: No token provided")
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)

