import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from .views.share_data import lobbies_data  # Corrected import path
from .utils.image_utils import save_player_image, delete_lobby_images, get_image_numpy
import numpy as np
import sys
import os
from .emotion import predict_emotion
from .shorts_links import urls
from django.conf import settings
import cv2


class LobbyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("[LobbyConsumer] Attempting to connect...")
        try:
            query_string = self.scope['query_string'].decode()
            params = parse_qs(query_string)
            print(f"[LobbyConsumer] Query Params: {params}")
            self.play_round = 0
            self.rounds = 0
            self.lobby_code = params.get('lobby_code', [None])[0]
            self.username = params.get('username', [None])[0]
            self.user_token = params.get('user_token', [None])[0]
            self.role = params.get('role', [None])[0]
            print(
                f"[LobbyConsumer] Parsed: lobby_code={self.lobby_code}, username={self.username}, user_token={self.user_token}, role={self.role}")

            if not all([self.lobby_code, self.username, self.user_token, self.role]):
                print("[LobbyConsumer] Missing parameters. Closing.")
                await self.close(code=4001)
                return

            if self.lobby_code not in lobbies_data:
                print(f"[LobbyConsumer] Lobby {self.lobby_code} not found. Closing.")
                await self.close(code=4004)
                return

            lobby_info = lobbies_data[self.lobby_code]
            print(f"[LobbyConsumer] Lobby info: {lobby_info}")
            authenticated = False

            if self.role == 'lobby-admin':
                print(
                    f"[LobbyConsumer] Admin auth check: user_token={self.user_token}, admin_token={lobby_info.get('admin_token')}")
                print(
                    f"[LobbyConsumer] Admin auth check: username={self.username}, host_username={lobby_info.get('host_username')}")
                if self.user_token == lobby_info.get('admin_token'):
                    if self.username == lobby_info.get('host_username'):
                        authenticated = True
                        print("[LobbyConsumer] Authenticated as lobby-admin (exact username match).")
                    elif self.username in lobby_info.get('players', []):
                        # Allow admin token holder to authenticate even if username doesn't match host_username
                        # but they must be in the players list
                        authenticated = True
                        print(
                            f"[LobbyConsumer] Authenticated as lobby-admin (admin token + in players list). Updating host_username from '{lobby_info.get('host_username')}' to '{self.username}'.")
                        lobby_info['host_username'] = self.username
                    else:
                        print(
                            f"[LobbyConsumer] Admin auth failed - valid admin token but username '{self.username}' not in players list")
                else:
                    print(f"[LobbyConsumer] Admin auth failed - token mismatch")
            elif self.role == 'player':
                print(
                    f"[LobbyConsumer] Player auth check: user_token={self.user_token}, issued_token_username={lobby_info.get('issued_player_tokens', {}).get(self.user_token)}")
                print(
                    f"[LobbyConsumer] Player auth check: username={self.username}, in_players_list={self.username in lobby_info.get('players', [])}")
                if lobby_info.get('issued_player_tokens', {}).get(self.user_token) == self.username and \
                        self.username in lobby_info.get('players', []):
                    authenticated = True
                    print("[LobbyConsumer] Authenticated as player.")
                else:
                    print(
                        f"[LobbyConsumer] Player auth failed - token username match: {lobby_info.get('issued_player_tokens', {}).get(self.user_token) == self.username}, in players list: {self.username in lobby_info.get('players', [])}")

            if not authenticated:
                print("[LobbyConsumer] Authentication failed. Closing.")
                await self.close(code=4003)
                return

            # Check if lobby is closed for new connections
            if lobby_info.get('closed_for_connections', False) and self.user_token not in lobby_info.get(
                    'connected_users', {}):
                print("[LobbyConsumer] Lobby is closed for new connections.")
                await self.close(code=4011)
                return

            # Prevent same user_token from connecting multiple times
            if self.user_token in lobby_info.get('connected_users', {}):
                await self.close(code=4009)  # Conflict / Token already in use for a connection
                return

            # Check max players for active WebSocket connections
            if len(lobby_info.get('connected_users', {})) >= lobby_info.get('max_players', 0):
                await self.close(code=4010)  # Lobby full for WebSocket connections
                return

            print("[LobbyConsumer] Authentication successful. Adding to group and accepting.")
            self.lobby_group_name = f'lobby_{self.lobby_code}'
            await self.channel_layer.group_add(self.lobby_group_name, self.channel_name)
            await self.accept()
            print("[LobbyConsumer] Connection accepted.")

            lobby_info.setdefault('connected_users', {})[self.user_token] = {
                'username': self.username,
                'role': self.role,
                'channel_name': self.channel_name
            }

            self.video_ind = 0

            await self.broadcast_lobby_update("user_connected")

        except Exception as e:
            print(f"[LobbyConsumer] EXCEPTION in connect: {e}")
            await self.close(code=4000)  # Generic server error or a more specific code
            # It's important to await self.close() here if an exception occurs before accept()
            # If accept() has been called, the connection is already open, and this close is for cleanup.
            # If accept() hasn't been called, this ensures a close frame is attempted.
            raise  # Optionally re-raise if you want it to appear in server logs as an error

    async def disconnect(self, close_code):
        if hasattr(self, 'lobby_code') and self.lobby_code and hasattr(self, 'user_token') and self.user_token:
            lobby_info = lobbies_data.get(self.lobby_code)
            if lobby_info and 'connected_users' in lobby_info:
                if self.user_token in lobby_info['connected_users']:
                    del lobby_info['connected_users'][self.user_token]
                    # Only broadcast if lobby_group_name exists (connection was successful)
                    if hasattr(self, 'lobby_group_name'):
                        await self.broadcast_lobby_update("user_disconnected")

            if hasattr(self, 'lobby_group_name'):
                await self.channel_layer.group_discard(self.lobby_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        payload = text_data_json.get('payload', {})

        # Chat message (public)
        if message_type == 'chat_message':
            await self.handle_chat_message(payload)

        # Player actions
        elif message_type == 'leave_lobby':
            await self.handle_leave_lobby()

        # Image upload for verification
        elif message_type == 'upload_image':
            await self.handle_upload_image(payload)

        # Face detection data for verification
        elif message_type == 'face_detection_data':
            await self.handle_face_detection_data(payload)

        # Admin-only actions
        elif message_type in ['kick_player', 'start_game', 'close_lobby', 'disband_lobby', 'mute_player',
                              'unmute_player', 'change_settings', 'face_detection_admin_settings',
                              'get_face_detection_stats', 'new_game_video']:
            if self.role == 'lobby-admin':
                if message_type == 'kick_player':
                    await self.handle_kick_player(payload)
                elif message_type == 'start_game':
                    await self.handle_start_game(payload)
                elif message_type == 'close_lobby':
                    await self.handle_close_lobby()
                elif message_type == 'disband_lobby':
                    await self.handle_disband_lobby()
                elif message_type == 'mute_player':
                    await self.handle_mute_player(payload)
                elif message_type == 'unmute_player':
                    await self.handle_unmute_player(payload)
                elif message_type == 'change_settings':
                    await self.handle_change_settings(payload)
                elif message_type == 'face_detection_admin_settings':
                    await self.handle_face_detection_admin_settings(payload)
                elif message_type == 'get_face_detection_stats':
                    await self.handle_get_face_detection_stats(payload)
                elif message_type == 'new_game_video':
                    await self.handle_new_game_video(payload)
            else:
                await self.send_private_message("error", "You don't have permission for this action.")
        else:
            await self.send_private_message("error", f"Unknown message type: {message_type}")

    async def handle_chat_message(self, payload):
        """Handle chat messages"""
        lobby_info = lobbies_data.get(self.lobby_code, {})

        # Check if user is muted
        if self.user_token in lobby_info.get('muted_users', set()):
            await self.send_private_message("error", "You are muted and cannot send messages.")
            return

        # Check if text channel is disabled
        if lobby_info.get('text_disabled', False):
            await self.send_private_message("error", "Text channel is disabled.")
            return

        await self.channel_layer.group_send(
            self.lobby_group_name,
            {
                'type': 'lobby.message',
                'event': 'chat_message',
                'message': payload.get('text', ''),
                'sender_username': self.username,
                'sender_role': self.role
            }
        )

    async def handle_leave_lobby(self):
        """Handle player leaving the lobby"""
        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        # Remove from players list if they're in it
        if self.username in lobby_info.get('players', []):
            lobby_info['players'].remove(self.username)

        # Remove their token
        issued_tokens = lobby_info.get('issued_player_tokens', {})
        for token, username in list(issued_tokens.items()):
            if username == self.username:
                del issued_tokens[token]

        await self.broadcast_lobby_update("user_left")
        await self.close()

    async def handle_kick_player(self, payload):
        """Handle admin kicking a player"""
        target_username = payload.get('username')
        if not target_username:
            await self.send_private_message("error", "Username required for kick action.")
            return

        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        # Can't kick the admin
        if target_username == lobby_info.get('host_username'):
            await self.send_private_message("error", "Cannot kick the lobby admin.")
            return

        # Remove from players list
        if target_username in lobby_info.get('players', []):
            lobby_info['players'].remove(target_username)

        # Remove their tokens
        issued_tokens = lobby_info.get('issued_player_tokens', {})
        for token, username in list(issued_tokens.items()):
            if username == target_username:
                del issued_tokens[token]

        # Disconnect them if they're connected
        connected_users = lobby_info.get('connected_users', {})
        for token, user_data in list(connected_users.items()):
            if user_data['username'] == target_username:
                # Send them a kick notification before disconnecting
                await self.channel_layer.send(user_data['channel_name'], {
                    'type': 'kick.notification',
                    'reason': payload.get('reason', 'You have been kicked from the lobby.')
                })
                del connected_users[token]

        await self.broadcast_lobby_update("player_kicked", {
            'kicked_username': target_username,
            'reason': payload.get('reason', 'No reason provided')
        })

    async def handle_start_game(self, payload):
        """Handle admin starting the game"""
        self.play_round = 1

        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        # Check if all players are verified
        players = lobby_info.get('players', [])
        verified_players = lobby_info.get('verified_players', [])

        # init laugh_meters
        lobby_info['laugh_meters'] = {player: 0.0 for player in players}

        unverified_players = [player for player in players if player not in verified_players]

        if unverified_players:
            await self.send_private_message("error",
                                            f"Cannot start game. The following players haven't submitted their photos: {', '.join(unverified_players)}")
            return

        # Simple implementation - just broadcast game start with verified players
        lobby_info['game_state'] = {
            'status': 'playing',
            'round': self.play_round,
            'verified_players': verified_players.copy()
        }

        await self.channel_layer.group_send(
            self.lobby_group_name,
            {
                'type': 'lobby.message',
                'event': 'game_started',
                'message': f'The game has started with {len(verified_players)} verified players!',
                'started_by': self.username,
                'verified_players': verified_players
            }
        )

    async def handle_close_lobby(self):
        """Handle admin closing lobby for new connections"""
        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        lobby_info['closed_for_connections'] = True

        await self.channel_layer.group_send(
            self.lobby_group_name,
            {
                'type': 'lobby.message',
                'event': 'lobby_closed',
                'message': 'Lobby is now closed for new connections.'
            }
        )

    async def handle_disband_lobby(self):
        """Handle admin disbanding the lobby"""
        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        # Notify everyone before disbanding
        await self.channel_layer.group_send(
            self.lobby_group_name,
            {
                'type': 'lobby.message',
                'event': 'lobby_disbanded',
                'message': 'The lobby has been disbanded by the admin.'
            }
        )

        # Clean up lobby images
        delete_lobby_images(self.lobby_code)

        # Remove the lobby from data
        del lobbies_data[self.lobby_code]

        # Close all connections (they'll handle cleanup in disconnect)
        await self.channel_layer.group_send(
            self.lobby_group_name,
            {
                'type': 'force.disconnect'
            }
        )

    async def handle_mute_player(self, payload):
        """Handle admin muting a player"""
        target_username = payload.get('username')
        if not target_username:
            await self.send_private_message("error", "Username required for mute action.")
            return

        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        # Can't mute the admin
        if target_username == lobby_info.get('host_username'):
            await self.send_private_message("error", "Cannot mute the lobby admin.")
            return

        # Add to muted users
        muted_users = lobby_info.setdefault('muted_users', set())
        muted_users.add(target_username)

        # Find the target's token and notify them
        for token, user_data in lobby_info.get('connected_users', {}).items():
            if user_data['username'] == target_username:
                await self.channel_layer.send(user_data['channel_name'], {
                    'type': 'mute.notification',
                    'message': 'You have been muted by the admin.'
                })
                break

        await self.send_private_message("success", f"Player {target_username} has been muted.")

    async def handle_unmute_player(self, payload):
        """Handle admin unmuting a player"""
        target_username = payload.get('username')
        if not target_username:
            await self.send_private_message("error", "Username required for unmute action.")
            return

        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        # Remove from muted users
        muted_users = lobby_info.get('muted_users', set())
        muted_users.discard(target_username)

        # Find the target's token and notify them
        for token, user_data in lobby_info.get('connected_users', {}).items():
            if user_data['username'] == target_username:
                await self.channel_layer.send(user_data['channel_name'], {
                    'type': 'unmute.notification',
                    'message': 'You have been unmuted by the admin.'
                })
                break

        await self.send_private_message("success", f"Player {target_username} has been unmuted.")

    async def handle_change_settings(self, payload):
        """Handle admin changing lobby settings"""
        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            return

        changes_made = []

        # Change max players
        if 'max_players' in payload:
            new_max = payload['max_players']
            if isinstance(new_max, int) and 2 <= new_max <= 50:
                lobby_info['max_players'] = new_max
                changes_made.append(f"Max players: {new_max}")

        # Change rounds
        if 'rounds' in payload:
            new_rounds = payload['rounds']
            if isinstance(new_rounds, int) and 1 <= new_rounds <= 10:
                lobby_info['rounds'] = new_rounds
                changes_made.append(f"Rounds: {new_rounds}")

        # Toggle text channel
        if 'text_disabled' in payload:
            lobby_info['text_disabled'] = bool(payload['text_disabled'])
            status = "disabled" if lobby_info['text_disabled'] else "enabled"
            changes_made.append(f"Text channel: {status}")

        if changes_made:
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'lobby.message',
                    'event': 'settings_changed',
                    'message': f"Lobby settings updated: {', '.join(changes_made)}",
                    'changed_by': self.username
                }
            )
        else:
            await self.send_private_message("error", "No valid settings to change.")

    async def handle_upload_image(self, payload):
        """Handle player image upload for verification"""
        image_data = payload.get('image_data')

        if not image_data:
            await self.send_private_message("error", "No image data provided.")
            return

        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            await self.send_private_message("error", "Lobby not found.")
            return

        # Save the image
        print(f"[DEBUG] GOT IMAGE IN STATE { lobby_info.get('game_state', {}) }")
        filename = save_player_image(self.lobby_code, self.username, image_data)
        if not filename:
            await self.send_private_message("error", "Failed to save image. Please try again.")
            return

        verified_players = lobby_info.setdefault('verified_players', [])
        if self.username not in verified_players:
            verified_players.append(self.username)

        # Store the image filename
        player_images = lobby_info.setdefault('player_images', {})
        player_images[self.username] = filename

        # If the game is currently playing, run emotion prediction
        game_state = lobby_info.get('game_state', {})

        if game_state.get('status') == 'playing':
            await self.handle_emotion_prediction()

            await self.send_private_message("emotion_prediction_update", json.dumps(lobby_info.get('laugh_meters')))
        else:
            await self.send_private_message("success", "Profile picture uploaded successfully!")
            # Broadcast verification update to all players
            await self.broadcast_lobby_update("player_verified", {
                'verified_usernames': lobby_info['verified_players']
            })

    async def handle_face_detection_admin_settings(self, payload):
        """Handle admin face detection settings"""
        lobby_info = lobbies_data.get(self.lobby_code)
        if not lobby_info:
            await self.send_private_message("error", "Lobby not found.")
            return

        # Initialize face detection settings
        face_settings = lobby_info.setdefault('face_detection_settings', {
            'enabled': False,
            'required_mode': 'face',
            'detection_frequency': 5,
            'broadcast_to_all': False
        })

        # Update settings from payload
        if 'enabled' in payload:
            face_settings['enabled'] = payload['enabled']
        if 'required_mode' in payload:
            face_settings['required_mode'] = payload['required_mode']
        if 'detection_frequency' in payload:
            face_settings['detection_frequency'] = max(1, int(payload['detection_frequency']))
        if 'broadcast_to_all' in payload:
            face_settings['broadcast_to_all'] = payload['broadcast_to_all']

        # Broadcast settings update to all players
        await self.broadcast_lobby_update("face_detection_settings_update", face_settings)
        await self.send_private_message("success", "Face detection settings updated!")

    async def send_private_message(self, message_type, message):
        """Send a private message to this user only"""
        await self.send(text_data=json.dumps({
            'type': 'private_message',
            'message_type': message_type,
            'message': message
        }))

    async def lobby_message(self, event_data):
        """Handle messages sent to the lobby group"""
        await self.send(text_data=json.dumps(event_data))

    async def kick_notification(self, event_data):
        """Handle kick notifications"""
        await self.send(text_data=json.dumps({
            'type': 'kicked',
            'message': event_data['reason']
        }))
        await self.close()

    async def mute_notification(self, event_data):
        """Handle mute notifications"""
        await self.send(text_data=json.dumps({
            'type': 'muted',
            'message': event_data['message']
        }))

    async def unmute_notification(self, event_data):
        """Handle unmute notifications"""
        await self.send(text_data=json.dumps({
            'type': 'unmuted',
            'message': event_data['message']
        }))

    async def force_disconnect(self, event_data):
        """Handle forced disconnection"""
        await self.close()

    async def broadcast_lobby_update(self, event_type, extra_data=None):
        """Helper to broadcast current lobby state."""
        if hasattr(self, 'lobby_code') and self.lobby_code and hasattr(self, 'lobby_group_name'):
            lobby_info = lobbies_data.get(self.lobby_code, {})
            print(f"[DEBUG] {lobby_info}")
            message_data = {
                'type': 'lobby.message',
                'event': event_type,
                'username': self.username,
                'role': self.role,
                'lobby_code': self.lobby_code,
                'lobby_name': lobby_info.get('name'),
                'host': lobby_info.get('host_username'),
                'players_in_lobby': lobby_info.get('players', []),
            }

            if extra_data:
                message_data.update(extra_data)

            await self.channel_layer.group_send(self.lobby_group_name, message_data)

    async def handle_emotion_prediction(self):
        """Handle emotion prediction using face data"""
        face_array = get_image_numpy(self.lobby_code, self.username)
        print("[DEBUG] Face Data Size: ", face_array.shape)
        if face_array is None:
            await self.send_private_message("error", "No face data provided for emotion prediction.")
            return

        try:

            result = predict_emotion(face_array)
            lobbies_data[self.lobby_code]['laugh_meters'][self.username] += 0.2 if result in ['Happy',
                                                                                              'Surprised'] else 0
        except Exception as e:
            await self.send_private_message("error", f"Emotion prediction failed: {e}")
            return None

    async def handle_new_game_video(self, payload):
        """Handle new game video upload

        It would return a url and incremetn self.video_ind
        """
        try:
            url = urls[self.video_ind]
            self.video_ind += 1
            self.play_round += 1
            rounds = lobbies_data[self.lobby_code]['rounds']
            if self.play_round > rounds:
                await self.send_private_message("success", "Game over!")
                # broadcast game over,
                return None
        except IndexError:
            await self.send_private_message("error", "No more videos available.")
            return None

        await self.broadcast_lobby_update("game_video", {"url": url})
        return None