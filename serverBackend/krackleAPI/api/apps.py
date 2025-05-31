from django.apps import AppConfig
import atexit


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        # Register cleanup function to run on Django shutdown
        from .utils.image_utils import cleanup_all_lobby_images
        atexit.register(cleanup_all_lobby_images)
