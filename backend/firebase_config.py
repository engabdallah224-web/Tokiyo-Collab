import firebase_admin
from firebase_admin import credentials, auth, firestore
import os

# Set environment variables to disable ALTS warnings and optimize for local development
os.environ["GOOGLE_CLOUD_DISABLE_GRPC_FOR_GAE"] = "true"
os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "serviceAccountKey.json"
# Disable ALTS for local development
os.environ["GOOGLE_CLOUD_DISABLE_ALTS"] = "true"

# Initialize Firebase Admin SDK
# Place your service account key JSON file in the project root
if os.getenv('INSTANCE')=='PROD':
    cred = credentials.Certificate("/etc/secrets/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    print("Firebase PROD setup completed")
else:
    cred = credentials.Certificate("collabcore-2b1fb-firebase-adminsdk-fbsvc-781fa43e75.json")
    firebase_admin.initialize_app(cred)
    print("Firebase DEV setup completed")
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