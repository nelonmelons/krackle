# LOBBY DATA STORAGE

# In-memory store for lobbies.
# Structure:
# lobbies_data = {
#   "LOBBY_CODE_EXAMPLE": {
#     "name": "My Awesome Lobby",
#     "max_players": 8,
#     "rounds": 5,
#     "admin_token": "unique_admin_token_for_this_lobby", # Token for lobby management, also user_token for admin
#     "host_username": "creator_username", # Username of the host
#     "players": ["creator_username", "player2", "player3"], # List of player usernames who have *HTTP joined*
#     "verified_players": ["creator_username", "player2"], # List of players who have submitted and verified their photos
#     "player_images": { # Mapping of username to their profile image filename
#         "creator_username": "LOBBY_CODE_creator_username.jpg",
#         "player2": "LOBBY_CODE_player2.jpg"
#     },
#     "game_state": {}, # Placeholder for game-specific data
#     "connected_users": { # Users currently connected via WebSocket, keyed by user_token
#         # "user_token_example": {
#         #    "username": "player_username",
#         #    "role": "player" or "lobby-admin",
#         #    "channel_name": "specific.channel_name!randomchars" # Internal Channels identifier
#         # }
#     },
#     "issued_player_tokens": { # Tokens issued to players via HTTP join, mapping token to username
#         # "player_token_example": "username_associated_with_token"
#     },
#     "laugh_meters": { # Mapping of player usernames to their laugh meter values
#         # "player1": 0.0,
#         # "player2": 0.0,
#         # ...
#     }
#   }
# }
lobbies_data = {}