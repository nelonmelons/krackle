from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # The client will connect to: ws://yourdomain/ws/connect/?lobby_code=XYZ&user_token=ABC&username=USR&role=player
    re_path(r'ws/connect/$', consumers.LobbyConsumer.as_asgi()),
]