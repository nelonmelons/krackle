from django.urls import path
from .views import *

urlpatterns = [
    path('test/', test_view),
    path('join/create_lobby/', create_lobby), # New route for creating lobbies
    path('join/', join_lobby),
    path('play/', get_lobby_players),
]