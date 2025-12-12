"""
WebSocket URL routing for Real-time Coding Monitor.
"""
from django.urls import re_path
from coding.consumers import CodingConsumer

websocket_urlpatterns = [
    re_path(r'ws/session/(?P<session_code>\w+)/$', CodingConsumer.as_asgi()),
]
