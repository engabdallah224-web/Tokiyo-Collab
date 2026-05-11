import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set environment variables to disable ALTS warnings and optimize for local development
os.environ["GOOGLE_CLOUD_DISABLE_GRPC_FOR_GAE"] = "true"
os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "serviceAccountKey.json"
# Disable ALTS for local development
os.environ["GOOGLE_CLOUD_DISABLE_ALTS"] = "true"

# Initialize Firebase Admin SDK
# On Vercel (PROD), we load the JSON from an environment variable
service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')

if service_account_json:
    import json
    try:
        cred_dict = json.loads(service_account_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized from environment variable")
    except Exception as e:
        print(f"❌ Error initializing Firebase from environment: {e}")
        # Fallback to local file if env fails
        if os.path.exists("serviceAccountKey.json"):
            cred = credentials.Certificate("serviceAccountKey.json")
            firebase_admin.initialize_app(cred)
elif os.getenv('INSTANCE') == 'PROD':
    # Fallback for platforms with secret files (like Render)
    cred = credentials.Certificate("/etc/secrets/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    print("Firebase PROD setup completed via secret file")
else:
    # Local development fallback
    if os.path.exists("serviceAccountKey.json"):
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        print("Firebase DEV setup completed via local file")
    else:
        print("⚠️ No Firebase credentials found! Set FIREBASE_SERVICE_ACCOUNT_KEY or add serviceAccountKey.json")
# Initialize Firestore
db = firestore.client()

# Collections
USERS_COLLECTION = "users"
PROJECTS_COLLECTION = "projects"
APPLICATIONS_COLLECTION = "applications"
SKILLS_COLLECTION = "skills"
UNIVERSITIES_COLLECTION = "universities"
CATEGORIES_COLLECTION = "categories"
MESSAGES_COLLECTION = "messages"
TASKS_COLLECTION = "tasks"
MEETINGS_COLLECTION = "meetings"
REPOSITORIES_COLLECTION = "repositories"
DOCUMENTS_COLLECTION = "documents"
FOLDERS_COLLECTION = "folders"
DOCUMENT_VERSIONS_COLLECTION = "document_versions"

# Legacy support (for backward compatibility)
POSTS_COLLECTION = "projects"  # Alias for old code