"""
Cloudinary configuration for file uploads
"""

import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Cloudinary
# Get your Cloudinary URL from: https://console.cloudinary.com/
# Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
cloudinary_url = os.getenv('CLOUDINARY_URL')

if cloudinary_url:
    cloudinary.config(
        cloudinary_url=cloudinary_url
    )
    print("✅ Cloudinary configured successfully")
else:
    print("⚠️  CLOUDINARY_URL not found in environment variables")
    print("Add CLOUDINARY_URL to .env file or set as environment variable")
    print("Format: CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME")


