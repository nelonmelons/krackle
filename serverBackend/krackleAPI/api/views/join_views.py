from django.http import JsonResponse
import json
from .share_data import lobbies_data
import uuid
import secrets 
from django.views.decorators.csrf import csrf_exempt # Import csrf_exempt

@csrf_exempt
def create_lobby(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            max_players = data.get('max_players')
            lobby_name = data.get('lobby_name')
            rounds = data.get('rounds')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload."}, status=400)

        if not all([username, isinstance(max_players, int), lobby_name, isinstance(rounds, int)]):
            return JsonResponse({
                "error": "Missing or invalid parameters. Required: username (string), max_players (int), lobby_name (string), rounds (int)."
            }, status=400)

        if not (2 <= max_players <= 50): 
            return JsonResponse({"error": "max_players must be between 2 and 50."}, status=400)
        if not (1 <= rounds <= 10):
            return JsonResponse({"error": "rounds must be between 1 and 10."}, status=400)

        while True:
            lobby_code = secrets.token_hex(3).upper()
            if lobby_code not in lobbies_data:
                break
        
        admin_token = uuid.uuid4().hex

        lobbies_data[lobby_code] = {
            "name": lobby_name,
            "max_players": max_players,
            "rounds": rounds,
            "admin_token": admin_token, # Host uses this as their user_token
            "host_username": username,
            "players": [username], # Creator is the first player
            "verified_players": [], # Players who have submitted their photos
            "player_images": {}, # Mapping of username to image filename
            "game_state": {},
            "connected_users": {}, # For WebSocket connected users
            "issued_player_tokens": {admin_token: username},
            "laugh_meters": {}, # {Player1Name: Player1LaughMeterValue, Player2Name: Player2LaughMeterValue, ...}
        }

        # in setting, we add a laught increment which is the increment value for the laugh meter

        return JsonResponse({
            "message": f"Lobby '{lobby_name}' created successfully.",
            "lobby_code": lobby_code,
            "admin_token": admin_token, # For the host
            "username": username
        }, status=201)

    return JsonResponse({"error": "Only POST method is allowed."}, status=405)

@csrf_exempt
def join_lobby(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            lobby_code = data.get('lobby_code')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload."}, status=400)

        if not username or not lobby_code:
            return JsonResponse({"error": "Username and lobby parameters are required."}, status=400)

        if lobby_code not in lobbies_data:
            return JsonResponse({"error": f"Lobby '{lobby_code}' not found."}, status=404)

        lobby_info = lobbies_data[lobby_code]

        if username in lobby_info["players"]:
             pass

        if username not in lobby_info["players"]:
            if len(lobby_info["players"]) >= lobby_info["max_players"]:
                return JsonResponse({"error": f"Lobby '{lobby_code}' is full (HTTP join limit)."}, status=400)
            lobby_info["players"].append(username)

        # Generate a player token for WebSocket connection
        player_token = uuid.uuid4().hex
        lobby_info["issued_player_tokens"][player_token] = username

        return JsonResponse({
            "message": f"Successfully joined lobby '{lobby_code}'.",
            "username": username,
            "lobby_code": lobby_code,
            "lobby_name": lobby_info["name"],
            "players": lobby_info["players"],
            "player_token": player_token # Client uses this for WebSocket connection
        }, status=200)
    
    return JsonResponse({"error": "Only GET method is allowed."}, status=405)

