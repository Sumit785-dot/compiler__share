"""
WebSocket URL routing for Real-time Coding Monitor.
"""
from django.urls import re_path
from coding.consumers import CodingConsumer, InteractiveExecutionConsumer

websocket_urlpatterns = [
    re_path(r'ws/session/(?P<session_code>\w+)/$', CodingConsumer.as_asgi()),
    re_path(r'ws/execute/$', InteractiveExecutionConsumer.as_asgi()),
]
