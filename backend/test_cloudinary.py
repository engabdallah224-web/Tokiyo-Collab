import cloudinary
import cloudinary.uploader

# Manual config test with the CORRECT 'dii'
CLOUD_NAME = "dii1mnqve"
API_KEY = "288624267526535"
API_SECRET = "xAmLcZBiXfoI-ntUjJpdjDrfKyI"

print(f"Testing Cloudinary with CORRECT 'dii' name:")
try:
    cloudinary.config(
        cloud_name = CLOUD_NAME,
        api_key = API_KEY,
        api_secret = API_SECRET
    )
    
    result = cloudinary.uploader.upload(
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        folder="test_folder"
    )
    print("SUCCESS!!! Cloudinary is working perfectly.")
    print(f"URL: {result.get('secure_url')}")
except Exception as e:
    print(f"ERROR: {e}")
