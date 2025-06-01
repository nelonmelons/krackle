"""
Image handling utilities for lobby player verification
"""
import os
import base64
import shutil
from pathlib import Path
from PIL import Image
from io import BytesIO
from django.conf import settings
import numpy as np
import cv2

def create_lobby_image_directory(lobby_code):
    """Create a directory for storing lobby images"""
    lobby_dir = Path(settings.MEDIA_ROOT) / 'lobby_images' / lobby_code
    lobby_dir.mkdir(parents=True, exist_ok=True)
    return lobby_dir


def save_player_image(lobby_code, username, base64_image_data):
    """
    Save a player's image from base64 data
    Returns the filename of the saved image
    """
    try:
        # Create lobby directory
        lobby_dir = create_lobby_image_directory(lobby_code)
        
        # Decode base64 image
        if ',' in base64_image_data:
            # Remove data URL prefix if present
            base64_image_data = base64_image_data.split(',')[1]
        
        image_data = base64.b64decode(base64_image_data)
        
        # Open and process image
        image = Image.open(BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize image to reasonable size (max 500x500)
        max_size = (500, 500)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Generate filename
        filename = f"{lobby_code}_{username}.jpg"
        filepath = lobby_dir / filename
        
        # Save image
        image.save(filepath, 'JPEG', quality=85)
        
        return filename
        
    except Exception as e:
        print(f"Error saving player image: {e}")
        return None


def delete_lobby_images(lobby_code):
    """Delete all images for a specific lobby"""
    try:
        lobby_dir = Path(settings.MEDIA_ROOT) / 'lobby_images' / lobby_code
        if lobby_dir.exists():
            shutil.rmtree(lobby_dir)
            print(f"Deleted lobby images directory: {lobby_dir}")
    except Exception as e:
        print(f"Error deleting lobby images: {e}")


def get_player_image_url(lobby_code, username):
    """Get the URL for a player's image"""
    return Path(settings.MEDIA_ROOT) / 'lobby_images' / lobby_code / f"{lobby_code}_{username}.jpg"


def get_image_numpy(lobby_code, username) -> np.ndarray:
    """Get the image as a numpy array that is compatible with OpenCV and the AI"""
    # Build the file path, not the URL
    filepath = get_player_image_url(lobby_code, username)
    face = cv2.imread(str(filepath))
    if face is None:
        raise FileNotFoundError(f"Image file not found: {filepath}")

    grey = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    cropped_img = np.expand_dims(np.expand_dims(cv2.resize(grey, (48, 48)), -1), 0)
    return cropped_img


def cleanup_all_lobby_images():
    """Clean up all lobby images - called on Django shutdown"""
    try:
        lobby_images_dir = Path(settings.MEDIA_ROOT) / 'lobby_images'
        if lobby_images_dir.exists():
            shutil.rmtree(lobby_images_dir)
            print("Cleaned up all lobby images on shutdown")
    except Exception as e:
        print(f"Error cleaning up lobby images: {e}")
