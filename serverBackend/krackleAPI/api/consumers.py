import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from .views.share_data import lobbies_data # Corrected import path

class LobbyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)

        self.lobby_code = params.get('lobby_code', [None])[0]
        self.username = params.get('username', [None])[0]
        self.user_token = params.get('user_token', [None])[0]
        self.role = params.get('role', [None])[0] # 'lobby-admin' or 'player'

        if not all([self.lobby_code, self.username, self.user_token, self.role]):
            await self.close(code=4001) # Bad request
            return

        if self.lobby_code not in lobbies_data:
            await self.close(code=4004) # Lobby not found
            return

        lobby_info = lobbies_data[self.lobby_code]
        authenticated = False

        if self.role == 'lobby-admin':
            if self.user_token == lobby_info.get('admin_token') and self.username == lobby_info.get('host_username'):
                authenticated = True
        elif self.role == 'player':
            # Check if token was issued and matches the username, and user is in HTTP players list
            if lobby_info.get('issued_player_tokens', {}).get(self.user_token) == self.username and \
               self.username in lobby_info.get('players', []):
                authenticated = True
        
        if not authenticated:
            await self.close(code=4003) # Forbidden / Auth failed
            return

        # Prevent same user_token from connecting multiple times
        if self.user_token in lobby_info.get('connected_users', {}):
            await self.close(code=4009) # Conflict / Token already in use for a connection
            return

        # Check max players for active WebSocket connections
        if len(lobby_info.get('connected_users', {})) >= lobby_info.get('max_players', 0):
            await self.close(code=4010) # Lobby full for WebSocket connections
            return

        self.lobby_group_name = f'lobby_{self.lobby_code}'

        await self.channel_layer.group_add(self.lobby_group_name, self.channel_name)
        await self.accept()

        lobby_info.setdefault('connected_users', {})[self.user_token] = {
            'username': self.username,
            'role': self.role,
            'channel_name': self.channel_name
        }
        
        # Optionally, remove token from issued_player_tokens once used, or keep for reconnections
        # For now, we keep it in issued_player_tokens.

        await self.broadcast_lobby_update("user_connected")

    async def disconnect(self, close_code):
        if hasattr(self, 'lobby_code') and self.lobby_code and self.user_token:
            lobby_info = lobbies_data.get(self.lobby_code)
            if lobby_info and 'connected_users' in lobby_info:
                if self.user_token in lobby_info['connected_users']:
                    del lobby_info['connected_users'][self.user_token]
                    await self.broadcast_lobby_update("user_disconnected")

            if hasattr(self, 'lobby_group_name'):
                await self.channel_layer.group_discard(self.lobby_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        payload = text_data_json.get('payload')

        # Example: broadcasting a chat message
        if message_type == 'chat_message':
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'lobby.message', # Handler method in consumer
                    'event': 'chat_message',
                    'message': payload.get('text'),
                    'sender_username': self.username,
                }
            )
        # Add more message types as needed

    async def lobby_message(self, event_data): # Renamed to match convention (dot replaced by underscore)
        # This method is called when a message is sent to the group with 'type': 'lobby.message'
        await self.send(text_data=json.dumps(event_data))

    async def broadcast_lobby_update(self, event_type):
        """Helper to broadcast current lobby state."""
        if hasattr(self, 'lobby_code') and self.lobby_code:
            lobby_info = lobbies_data.get(self.lobby_code, {})
            connected_users_details = list(lobby_info.get('connected_users', {}).values())
            
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'lobby.message', # Must match a handler method name
                    'event': event_type,
                    'username': self.username, # User causing the event
                    'role': self.role,         # Role of the user
                    'lobby_code': self.lobby_code,
                    'lobby_name': lobby_info.get('name'),
                    'host': lobby_info.get('host_username'),
                    'players_in_lobby': lobby_info.get('players', []), # HTTP joined
                    'connected_players': [{'username': u['username'], 'role': u['role']} for u in connected_users_details]
                }
            )