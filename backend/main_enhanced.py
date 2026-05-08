"""
Enhanced CollabCore FastAPI Backend
Matches frontend data structure from /collabcore-frontend/src/data/mockData.json
"""

from fastapi import FastAPI, HTTPException, Depends, Header, Request, Query, UploadFile, File as FastAPIFile
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import datetime
import uuid
from io import BytesIO
from firebase_admin import auth, firestore
from firebase_config import (
    db,
    USERS_COLLECTION, 
    PROJECTS_COLLECTION, 
    APPLICATIONS_COLLECTION,
    SKILLS_COLLECTION,
    UNIVERSITIES_COLLECTION,
    CATEGORIES_COLLECTION,
    MESSAGES_COLLECTION,
    TASKS_COLLECTION,
    MEETINGS_COLLECTION,
    REPOSITORIES_COLLECTION,
    DOCUMENTS_COLLECTION,
    FOLDERS_COLLECTION,
    DOCUMENT_VERSIONS_COLLECTION
)
from chat_models import (
    MessageCreate, MessageUpdate, MessageResponse, MessagesResponse,
    MessageType, MessageSender, format_message_timestamp
)
from workspace_models import (
    TaskCreate, TaskUpdate, TaskResponse, TaskStatus, TaskPriority,
    MeetingCreate, MeetingUpdate, MeetingResponse, MeetingType,
    ProjectSettingsUpdate, ProjectSettingsResponse,
    ProjectAnalytics, MeetingAnalytics,
    calculate_task_completion_rate, is_task_overdue, format_duration
)
from vcs_models import (
    RepositoryConnect, RepositoryUpdate, RepositoryResponse,
    CommitListResponse, PullRequestListResponse, RepositoryStats
)
from document_models import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListResponse,
    FolderCreate, FolderUpdate, FolderResponse,
    DocumentVersion, DocumentVersionListResponse
)
from github_service import GitHubService
from gitlab_service import GitLabService

# Import cloudinary after other configs
try:
    import cloudinary.uploader
    from cloudinary_config import cloudinary
    CLOUDINARY_ENABLED = True
except Exception as e:
    print(f"⚠️  Cloudinary not configured: {e}")
    CLOUDINARY_ENABLED = False

app = FastAPI(
    title="CollabCore API",
    description="Student collaboration platform API with WebRTC calling",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

websocket_connections: dict = {}


# ============ AUTH MIDDLEWARE ============

async def verify_token(authorization: str = Header(None)) -> dict:
    """Verify Firebase ID token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def populate_owner_info(project_data: dict) -> dict:
    """Populate owner information in project"""
    owner_doc = db.collection(USERS_COLLECTION).document(project_data["owner_id"]).get()
    if owner_doc.exists:
        owner_data = owner_doc.to_dict()
        project_data["owner"] = {
            "id": project_data["owner_id"],
            "full_name": owner_data.get("full_name", ""),
            "university": owner_data.get("university", ""),
            "email": owner_data.get("email", "")
        }
    else:
        project_data["owner"] = {
            "id": project_data["owner_id"],
            "full_name": "Unknown",
            "university": "",
            "email": ""
        }
    return project_data


def populate_user_info(application_data: dict) -> dict:
    """Populate user information in application"""
    user_doc = db.collection(USERS_COLLECTION).document(application_data["user_id"]).get()
    if user_doc.exists:
        user_data = user_doc.to_dict()
        application_data["user"] = {
            "id": application_data["user_id"],
            "full_name": user_data.get("full_name", ""),
            "email": user_data.get("email", ""),
            "university": user_data.get("university", ""),
            "skills": user_data.get("skills", []),
            "rating": user_data.get("rating", 0.0)
        }
    return application_data



# ============ AUTH ENDPOINTS ============

@app.post("/api/auth/signup")
async def signup(request: Request, token_data: dict = Depends(verify_token)):
    """Create user profile in backend (Firebase Auth user already created by frontend)"""
    try:
        data = await request.json()
        user_id = token_data["uid"]
        
        # Check if user profile already exists
        existing_user = db.collection(USERS_COLLECTION).document(user_id).get()
        if existing_user.exists:
            # User already has a profile, return it
            user_data = existing_user.to_dict()
            return {
                "success": True,
                "message": "User profile already exists",
                "user": user_data
            }
        
        # Validate role
        role = data.get("role", "student")
        valid_roles = ["student", "project_leader", "both"]
        if role.lower() not in valid_roles:
            raise HTTPException(
                status_code=400,
                detail=f"Role must be one of: {', '.join(valid_roles)}"
            )
        
        # Create user profile in Firestore
        profile_data = {
            "uid": user_id,
            "email": data.get("email", token_data.get("email", "")),
            "full_name": data.get("full_name", ""),
            "university": data.get("university", ""),
            "bio": data.get("bio", ""),
            "skills": data.get("skills", []),
            "role": role.lower(),
            "rating": 0.0,
            "projects_count": 0,
            "projects_completed": 0,
            "avatar_url": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        db.collection(USERS_COLLECTION).document(user_id).set(profile_data)
        
        return {
            "success": True,
            "message": "User profile created successfully",
            "user": profile_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login")
async def login(request: Request):
    """Login endpoint - returns user info"""
    try:
        data = await request.json()
        
        if not data.get("email"):
            raise HTTPException(status_code=400, detail="Email is required")
        
        user = auth.get_user_by_email(data["email"])
        user_doc = db.collection(USERS_COLLECTION).document(user.uid).get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        return {
            "success": True,
            "message": "Login successful",
            "user": user_doc.to_dict()
        }
    
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/auth/me")
async def get_current_user(token_data: dict = Depends(verify_token)):
    """Get current authenticated user's profile"""
    try:
        uid = token_data["uid"]
        user_doc = db.collection(USERS_COLLECTION).document(uid).get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        return {
            "success": True,
            "user": user_doc.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/test-token")
async def get_test_token(request: Request):
    """DEVELOPMENT ONLY: Generate a custom token for testing"""
    try:
        data = await request.json()

        if not data.get("email"):
            raise HTTPException(status_code=400, detail="Email is required")

        # Get user by email
        user = auth.get_user_by_email(data["email"])

        # Create a custom token (for testing)
        custom_token = auth.create_custom_token(user.uid)

        return {
            "success": True,
            "message": "Test token generated (use this for development only)",
            "custom_token": custom_token.decode('utf-8'),
            "uid": user.uid,
            "note": "In production, get idToken from Firebase SDK on frontend"
        }

    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ USER ENDPOINTS ============

@app.get("/api/users")
async def get_users(
    university: Optional[str] = None,
    limit: int = 20,
    page: int = 1
):
    """Get all users with optional filters"""
    try:
        query = db.collection(USERS_COLLECTION)
        
        if university:
            query = query.where("university", "==", university)
        
        query = query.limit(limit)
        
        users = []
        for doc in query.stream():
            user_data = doc.to_dict()
            users.append(user_data)
        
        return {
            "success": True,
            "users": users,
            "count": len(users)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    try:
        user_doc = db.collection(USERS_COLLECTION).document(user_id).get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "user": user_doc.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/users/{user_id}")
async def update_user(
    user_id: str,
    request: Request,
    token_data: dict = Depends(verify_token)
):
    """Update user profile (authenticated user only)"""
    try:
        # Verify user can only update their own profile
        if token_data["uid"] != user_id:
            raise HTTPException(status_code=403, detail="Cannot update other user's profile")
        
        update_data = await request.json()
        
        # Filter out None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        db.collection(USERS_COLLECTION).document(user_id).update(update_data)
        
        # Get updated user
        user_doc = db.collection(USERS_COLLECTION).document(user_id).get()
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": user_doc.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ PROJECT ENDPOINTS ============

@app.post("/api/projects")
async def create_project(
    request: Request,
    token_data: dict = Depends(verify_token)
):
    """Create a new project"""
    try:
        uid = token_data["uid"]
        data = await request.json()
        
        # Basic validation
        if not data.get("title") or not data.get("description"):
            raise HTTPException(status_code=400, detail="Title and description are required")
        
        project_data = {
            "title": data["title"],
            "description": data["description"],
            "owner_id": uid,
            "required_skills": data.get("required_skills", []),
            "team_size_limit": data.get("team_size_limit", 5),
            "current_team_size": 1,
            "status": "recruiting",
            "tags": data.get("tags", []),
            "category": data.get("category", "Other"),
            "difficulty": data.get("difficulty", "intermediate"),
            "duration": data.get("duration", ""),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        project_ref = db.collection(PROJECTS_COLLECTION).add(project_data)
        project_id = project_ref[1].id
        
        return {
            "success": True,
            "message": "Project created successfully",
            "project_id": project_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects")
async def get_projects(
    status: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    university: Optional[str] = None,
    limit: int = 20,
    cursor: Optional[str] = None
):
    """Get all projects with optional filters and cursor-based pagination"""
    try:
        projects = []

        # Prefer Firestore-side filtering first. If an index is missing, fall back to
        # in-memory filtering so local/dev environments still work.
        try:
            query = db.collection(PROJECTS_COLLECTION)

            if status:
                query = query.where("status", "==", status)
            if category:
                query = query.where("category", "==", category)
            if difficulty:
                query = query.where("difficulty", "==", difficulty)

            query = query.order_by("created_at", direction=firestore.Query.DESCENDING)

            if cursor:
                cursor_doc = db.collection(PROJECTS_COLLECTION).document(cursor).get()
                if cursor_doc.exists:
                    query = query.start_after(cursor_doc)

            query = query.limit(limit + 1)
            docs = list(query.stream())
        except Exception as query_error:
            # Firestore commonly raises "The query requires an index" for filtered
            # + ordered queries. Fallback to an unfiltered read and filter in Python.
            if "requires an index" not in str(query_error).lower():
                raise query_error

            docs = list(db.collection(PROJECTS_COLLECTION).stream())

            def _matches_filters(data):
                if status and data.get("status") != status:
                    return False
                if category and data.get("category") != category:
                    return False
                if difficulty and data.get("difficulty") != difficulty:
                    return False
                return True

            docs = [doc for doc in docs if _matches_filters(doc.to_dict() or {})]
            docs.sort(
                key=lambda d: (d.to_dict() or {}).get("created_at", ""),
                reverse=True,
            )

            if cursor:
                try:
                    cursor_index = next(i for i, d in enumerate(docs) if d.id == cursor)
                    docs = docs[cursor_index + 1 :]
                except StopIteration:
                    docs = docs

            docs = docs[: limit + 1]

        has_more = len(docs) > limit
        
        # Only return 'limit' number of projects
        for doc in docs[:limit]:
            project_data = doc.to_dict()
            project_data["id"] = doc.id
            
            # Filter by university if needed (after fetch since owner_id filter would require index)
            if university:
                owner_doc = db.collection(USERS_COLLECTION).document(project_data["owner_id"]).get()
                if owner_doc.exists and owner_doc.to_dict().get("university") != university:
                    continue
            
            # Populate owner info
            project_data = populate_owner_info(project_data)
            projects.append(project_data)
        
        # Set next cursor to the last document ID
        next_cursor = docs[limit - 1].id if has_more and len(docs) > limit else None
        
        return {
            "success": True,
            "projects": projects,
            "count": len(projects),
            "has_more": has_more,
            "next_cursor": next_cursor
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get project by ID"""
    try:
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_data = project_doc.to_dict()
        project_data["id"] = project_doc.id
        project_data = populate_owner_info(project_data)
        
        return {
            "success": True,
            "project": project_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/projects/{project_id}")
async def update_project(
    project_id: str,
    request: Request,
    token_data: dict = Depends(verify_token)
):
    """Update project (owner only)"""
    try:
        # Get project
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Verify ownership
        if project_doc.to_dict()["owner_id"] != token_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this project")
        
        # Update
        update_data = await request.json()
        
        # Filter out None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        db.collection(PROJECTS_COLLECTION).document(project_id).update(update_data)
        
        # Get updated project
        updated_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        project_data = updated_doc.to_dict()
        project_data["id"] = project_id
        project_data = populate_owner_info(project_data)
        
        return {
            "success": True,
            "message": "Project updated successfully",
            "project": project_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete project (owner only)"""
    try:
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project_doc.to_dict()["owner_id"] != token_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        db.collection(PROJECTS_COLLECTION).document(project_id).delete()
        
        return {
            "success": True,
            "message": "Project deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ APPLICATION ENDPOINTS ============

@app.post("/api/applications")
async def create_application(
    request: Request,
    token_data: dict = Depends(verify_token)
):
    """Apply to a project"""
    try:
        uid = token_data["uid"]
        data = await request.json()
        
        # Basic validation
        if not data.get("project_id"):
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        # Check if project exists
        project_doc = db.collection(PROJECTS_COLLECTION).document(data["project_id"]).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if already applied
        existing = db.collection(APPLICATIONS_COLLECTION) \
            .where("project_id", "==", data["project_id"]) \
            .where("user_id", "==", uid) \
            .limit(1) \
            .get()
        
        if list(existing):
            raise HTTPException(status_code=400, detail="Already applied to this project")
        
        app_data = {
            "project_id": data["project_id"],
            "user_id": uid,
            "message": data.get("message", ""),
            "status": "pending",
            "applied_at": datetime.utcnow().isoformat(),
            "reviewed_at": None,
            "reviewer_notes": None
        }
        
        app_ref = db.collection(APPLICATIONS_COLLECTION).add(app_data)
        
        return {
            "success": True,
            "message": "Application submitted successfully",
            "application_id": app_ref[1].id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/applications")
async def get_project_applications(
    project_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all applications for a project (project members can view)"""
    try:
        # Verify project exists
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        # Check if user is owner or accepted collaborator
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query_check = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query_check.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not authorized - only project members can view applications")
        
        # Get applications (without ordering to avoid index requirement)
        apps_query = db.collection(APPLICATIONS_COLLECTION) \
            .where("project_id", "==", project_id)
        
        applications = []
        for doc in apps_query.stream():
            app_data = doc.to_dict()
            app_data["id"] = doc.id
            app_data = populate_user_info(app_data)
            applications.append(app_data)
        
        # Sort in Python instead of Firestore to avoid index requirement
        applications.sort(key=lambda x: x.get("applied_at", ""), reverse=True)
        
        return {
            "success": True,
            "applications": applications,
            "count": len(applications)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/users/{user_id}/applications")
async def get_user_applications(
    user_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all applications by a user"""
    try:
        # Users can only see their own applications
        if token_data["uid"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        apps_query = db.collection(APPLICATIONS_COLLECTION) \
            .where("user_id", "==", user_id) \
            .order_by("applied_at", direction=firestore.Query.DESCENDING)
        
        applications = []
        for doc in apps_query.stream():
            app_data = doc.to_dict()
            app_data["id"] = doc.id
            applications.append(app_data)
        
        return {
            "success": True,
            "applications": applications,
            "count": len(applications)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/applications/{application_id}")
async def update_application(
    application_id: str,
    request: Request,
    token_data: dict = Depends(verify_token)
):
    """Update application status (project owner only)"""
    try:
        app_doc = db.collection(APPLICATIONS_COLLECTION).document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")
        
        app_data = app_doc.to_dict()
        data = await request.json()
        
        # Verify user owns the project
        project_doc = db.collection(PROJECTS_COLLECTION).document(app_data["project_id"]).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project_doc.to_dict()["owner_id"] != token_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Validate status
        if not data.get("status"):
            raise HTTPException(status_code=400, detail="Status is required")
        
        # Update application
        update_data = {
            "status": data["status"],
            "reviewed_at": datetime.utcnow().isoformat()
        }
        if data.get("reviewer_notes"):
            update_data["reviewer_notes"] = data["reviewer_notes"]
        
        db.collection(APPLICATIONS_COLLECTION).document(application_id).update(update_data)
        
        # If accepted, increment project team size
        if data["status"] == "accepted":
            project_data = project_doc.to_dict()
            new_size = project_data.get("current_team_size", 1) + 1
            db.collection(PROJECTS_COLLECTION).document(app_data["project_id"]).update({
                "current_team_size": new_size
            })
        
        return {
            "success": True,
            "message": "Application updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/applications/{application_id}")
async def withdraw_application(
    application_id: str,
    token_data: dict = Depends(verify_token)
):
    """Withdraw application (applicant only)"""
    try:
        app_doc = db.collection(APPLICATIONS_COLLECTION).document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")
        
        app_data = app_doc.to_dict()
        if app_data["user_id"] != token_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        db.collection(APPLICATIONS_COLLECTION).document(application_id).delete()
        
        return {
            "success": True,
            "message": "Application withdrawn successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ MY PROJECTS ENDPOINTS ============

@app.get("/api/me/projects/leading")
async def get_my_leading_projects(token_data: dict = Depends(verify_token)):
    """Get projects I'm leading"""
    try:
        uid = token_data["uid"]
        
        query = db.collection(PROJECTS_COLLECTION) \
            .where("owner_id", "==", uid) \
            .order_by("created_at", direction=firestore.Query.DESCENDING)
        
        projects = []
        for doc in query.stream():
            project_data = doc.to_dict()
            project_data["id"] = doc.id
            
            # Get pending applications count
            pending_apps = db.collection(APPLICATIONS_COLLECTION) \
                .where("project_id", "==", doc.id) \
                .where("status", "==", "pending") \
                .get()
            
            project_data["pending_applications"] = len(list(pending_apps))
            
            projects.append(project_data)
        
        return {
            "success": True,
            "projects": projects,
            "count": len(projects)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/me/projects/collaborating")
async def get_my_collaborating_projects(token_data: dict = Depends(verify_token)):
    """Get projects I'm collaborating on"""
    try:
        uid = token_data["uid"]
        
        # Get accepted applications
        accepted_apps = db.collection(APPLICATIONS_COLLECTION) \
            .where("user_id", "==", uid) \
            .where("status", "==", "accepted") \
            .get()
        
        projects = []
        for app_doc in accepted_apps:
            app_data = app_doc.to_dict()
            
            # Get project details
            project_doc = db.collection(PROJECTS_COLLECTION).document(app_data["project_id"]).get()
            if project_doc.exists:
                project_data = project_doc.to_dict()
                project_data["id"] = project_doc.id
                project_data = populate_owner_info(project_data)
                projects.append(project_data)
        
        return {
            "success": True,
            "projects": projects,
            "count": len(projects)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ SEARCH ENDPOINTS ============

@app.get("/api/search/projects")
async def search_projects(q: str = Query(..., min_length=1), limit: int = 20, cursor: Optional[str] = None):
    """Search projects by text with pagination"""
    try:
        # Get all projects (Firestore doesn't support full-text search natively)
        query = db.collection(PROJECTS_COLLECTION).order_by("created_at", direction=firestore.Query.DESCENDING)
        
        # Apply cursor if provided
        if cursor:
            cursor_doc = db.collection(PROJECTS_COLLECTION).document(cursor).get()
            if cursor_doc.exists:
                query = query.start_after(cursor_doc)
        
        all_projects = query.limit(200).stream()
        
        results = []
        query_lower = q.lower()
        all_docs = []
        
        for doc in all_projects:
            all_docs.append(doc)
            project_data = doc.to_dict()
            project_data["id"] = doc.id
            
            # Simple text matching
            if (query_lower in project_data.get("title", "").lower() or
                query_lower in project_data.get("description", "").lower() or
                any(query_lower in skill.lower() for skill in project_data.get("required_skills", [])) or
                any(query_lower in tag.lower() for tag in project_data.get("tags", []))):
                
                project_data = populate_owner_info(project_data)
                results.append(project_data)
                
                if len(results) >= limit:
                    break
        
        has_more = len(results) == limit and len(all_docs) >= limit
        next_cursor = results[-1]["id"] if has_more and len(results) > 0 else None
        
        return {
            "success": True,
            "projects": results,
            "count": len(results),
            "has_more": has_more,
            "next_cursor": next_cursor
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/search/users")
async def search_users(q: str = Query(..., min_length=1), limit: int = 20):
    """Search users by text"""
    try:
        all_users = db.collection(USERS_COLLECTION).limit(100).stream()
        
        results = []
        query_lower = q.lower()
        
        for doc in all_users:
            user_data = doc.to_dict()
            
            if (query_lower in user_data.get("full_name", "").lower() or
                query_lower in user_data.get("university", "").lower() or
                any(query_lower in skill.lower() for skill in user_data.get("skills", []))):
                
                results.append(user_data)
                
                if len(results) >= limit:
                    break
        
        return {
            "success": True,
            "users": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ STATIC DATA ENDPOINTS ============

@app.get("/api/skills")
async def get_skills():
    """Get all available skills"""
    try:
        skills_query = db.collection(SKILLS_COLLECTION).stream()
        skills = [doc.to_dict()["name"] for doc in skills_query]
        
        return {
            "success": True,
            "skills": skills,
            "count": len(skills)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/universities")
async def get_universities():
    """Get all universities"""
    try:
        unis_query = db.collection(UNIVERSITIES_COLLECTION).stream()
        universities = [doc.to_dict()["name"] for doc in unis_query]
        
        return {
            "success": True,
            "universities": universities,
            "count": len(universities)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/categories")
async def get_categories():
    """Get project categories"""
    try:
        categories_query = db.collection(CATEGORIES_COLLECTION).stream()
        categories = [doc.to_dict() for doc in categories_query]
        
        return {
            "success": True,
            "categories": categories,
            "count": len(categories)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/stats")
async def get_stats():
    """Get platform statistics"""
    try:
        # Count projects by status
        all_projects = list(db.collection(PROJECTS_COLLECTION).stream())
        total_projects = len(all_projects)
        recruiting = sum(1 for p in all_projects if p.to_dict().get("status") == "recruiting")
        active = sum(1 for p in all_projects if p.to_dict().get("status") == "active")
        completed = sum(1 for p in all_projects if p.to_dict().get("status") == "completed")
        
        # Count users
        total_users = len(list(db.collection(USERS_COLLECTION).stream()))
        
        # Count applications
        total_applications = len(list(db.collection(APPLICATIONS_COLLECTION).stream()))
        
        return {
            "success": True,
            "stats": {
                "total_projects": total_projects,
                "recruiting_projects": recruiting,
                "active_projects": active,
                "completed_projects": completed,
                "total_students": total_users,
                "total_applications": total_applications
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ MESSAGE/CHAT ENDPOINTS ============

@app.post("/api/projects/{project_id}/messages")
async def send_message(
    project_id: str,
    message_data: MessageCreate,
    token_data: dict = Depends(verify_token)
):
    """Send a message in project chat"""
    try:
        # Verify project exists
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        # Verify user is project member (owner or accepted collaborator)
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            # Check if user has accepted application
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Verify project_id in message matches URL
        if message_data.project_id != project_id:
            raise HTTPException(status_code=400, detail="Project ID mismatch")
        
        # Create message document
        message_ref = db.collection(MESSAGES_COLLECTION).document()
        message_id = message_ref.id
        
        message_doc = {
            "id": message_id,
            "project_id": project_id,
            "sender_id": user_id,
            "content": message_data.content,
            "message_type": message_data.message_type,
            "file_url": message_data.file_url,
            "file_name": message_data.file_name,
            "reply_to": message_data.reply_to,
            "is_edited": False,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        message_ref.set(message_doc)
        
        # Populate sender info
        user_doc = db.collection(USERS_COLLECTION).document(user_id).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            message_doc["sender"] = {
                "uid": user_id,
                "full_name": user_data.get("full_name", ""),
                "avatar_url": user_data.get("avatar_url")
            }
        
        return {
            "success": True,
            "message": message_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/messages")
async def get_messages(
    project_id: str,
    limit: int = 50,
    cursor: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get messages for a project"""
    try:
        # Verify project exists
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        # Verify user is project member
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Build query
        query = db.collection(MESSAGES_COLLECTION)\
            .where("project_id", "==", project_id)\
            .order_by("created_at", direction=firestore.Query.DESCENDING)\
            .limit(limit + 1)
        
        # Apply cursor if provided
        if cursor:
            cursor_doc = db.collection(MESSAGES_COLLECTION).document(cursor).get()
            if cursor_doc.exists:
                query = query.start_after(cursor_doc)
        
        # Fetch messages
        docs = list(query.stream())
        has_more = len(docs) > limit
        
        if has_more:
            docs = docs[:limit]
        
        messages = []
        for doc in docs:
            message_data = doc.to_dict()
            message_data["id"] = doc.id
            
            # Populate sender info
            user_doc = db.collection(USERS_COLLECTION).document(message_data["sender_id"]).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                message_data["sender"] = {
                    "uid": message_data["sender_id"],
                    "full_name": user_data.get("full_name", ""),
                    "avatar_url": user_data.get("avatar_url")
                }
            
            messages.append(message_data)
        
        # Reverse to show oldest first
        messages.reverse()
        
        return {
            "messages": messages,
            "total": len(messages),
            "has_more": has_more,
            "next_cursor": docs[-1].id if has_more and docs else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/messages/{message_id}")
async def update_message(
    message_id: str,
    update_data: MessageUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update/edit a message"""
    try:
        message_doc = db.collection(MESSAGES_COLLECTION).document(message_id).get()
        if not message_doc.exists:
            raise HTTPException(status_code=404, detail="Message not found")
        
        message_data = message_doc.to_dict()
        
        # Verify user is sender
        if message_data["sender_id"] != token_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized to edit this message")
        
        # Update message
        update_dict = {
            "updated_at": datetime.utcnow().isoformat(),
            "is_edited": True
        }
        
        if update_data.content:
            update_dict["content"] = update_data.content
        
        db.collection(MESSAGES_COLLECTION).document(message_id).update(update_dict)
        
        # Get updated message
        updated_doc = db.collection(MESSAGES_COLLECTION).document(message_id).get()
        updated_data = updated_doc.to_dict()
        updated_data["id"] = message_id
        
        # Populate sender info
        user_doc = db.collection(USERS_COLLECTION).document(updated_data["sender_id"]).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            updated_data["sender"] = {
                "uid": updated_data["sender_id"],
                "full_name": user_data.get("full_name", ""),
                "avatar_url": user_data.get("avatar_url")
            }
        
        return {
            "success": True,
            "message": updated_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/messages/{message_id}")
async def delete_message(
    message_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a message"""
    try:
        message_doc = db.collection(MESSAGES_COLLECTION).document(message_id).get()
        if not message_doc.exists:
            raise HTTPException(status_code=404, detail="Message not found")
        
        message_data = message_doc.to_dict()
        
        # Verify user is sender or project owner
        user_id = token_data["uid"]
        is_sender = message_data["sender_id"] == user_id
        
        # Check if user is project owner
        project_doc = db.collection(PROJECTS_COLLECTION).document(message_data["project_id"]).get()
        is_owner = False
        if project_doc.exists:
            is_owner = project_doc.to_dict()["owner_id"] == user_id
        
        if not is_sender and not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized to delete this message")
        
        # Delete message
        db.collection(MESSAGES_COLLECTION).document(message_id).delete()
        
        return {
            "success": True,
            "message": "Message deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ TASK ENDPOINTS ============

@app.post("/api/projects/{project_id}/tasks")
async def create_task(
    project_id: str,
    task_data: TaskCreate,
    token_data: dict = Depends(verify_token)
):
    """Create a new task"""
    try:
        # Verify project exists and user is member
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        # Check membership
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Create task
        task_ref = db.collection(TASKS_COLLECTION).document()
        task_id = task_ref.id
        
        task_doc = {
            "id": task_id,
            "project_id": project_id,
            "title": task_data.title,
            "description": task_data.description,
            "created_by": user_id,
            "assigned_to": task_data.assigned_to,
            "status": task_data.status,
            "priority": task_data.priority,
            "due_date": task_data.due_date,
            "tags": task_data.tags,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "completed_at": None
        }
        
        task_ref.set(task_doc)
        
        # Populate creator and assignee names
        creator = db.collection(USERS_COLLECTION).document(user_id).get()
        task_doc["created_by_name"] = creator.to_dict().get("full_name", "") if creator.exists else ""
        
        if task_data.assigned_to:
            assignee = db.collection(USERS_COLLECTION).document(task_data.assigned_to).get()
            task_doc["assigned_to_name"] = assignee.to_dict().get("full_name", "") if assignee.exists else None
        else:
            task_doc["assigned_to_name"] = None
        
        return {
            "success": True,
            "task": task_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/tasks")
async def get_tasks(
    project_id: str,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all tasks for a project"""
    try:
        # Verify membership
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Build query
        query = db.collection(TASKS_COLLECTION).where("project_id", "==", project_id)
        
        if status:
            query = query.where("status", "==", status)
        if assigned_to:
            query = query.where("assigned_to", "==", assigned_to)
        
        query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
        
        # Get tasks
        docs = list(query.stream())
        tasks = []
        
        for doc in docs:
            task_data = doc.to_dict()
            task_data["id"] = doc.id
            
            # Populate names
            creator = db.collection(USERS_COLLECTION).document(task_data["created_by"]).get()
            task_data["created_by_name"] = creator.to_dict().get("full_name", "") if creator.exists else ""
            
            if task_data.get("assigned_to"):
                assignee = db.collection(USERS_COLLECTION).document(task_data["assigned_to"]).get()
                task_data["assigned_to_name"] = assignee.to_dict().get("full_name", "") if assignee.exists else None
            else:
                task_data["assigned_to_name"] = None
            
            tasks.append(task_data)
        
        return {
            "success": True,
            "tasks": tasks
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/tasks/{task_id}")
async def update_task(
    task_id: str,
    update_data: TaskUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update a task"""
    try:
        task_doc = db.collection(TASKS_COLLECTION).document(task_id).get()
        if not task_doc.exists:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_data = task_doc.to_dict()
        
        # Verify membership
        project_id = task_data["project_id"]
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Update task
        update_dict = {"updated_at": datetime.utcnow().isoformat()}
        
        if update_data.title is not None:
            update_dict["title"] = update_data.title
        if update_data.description is not None:
            update_dict["description"] = update_data.description
        if update_data.assigned_to is not None:
            update_dict["assigned_to"] = update_data.assigned_to
        if update_data.status is not None:
            update_dict["status"] = update_data.status
            if update_data.status == "done":
                update_dict["completed_at"] = datetime.utcnow().isoformat()
        if update_data.priority is not None:
            update_dict["priority"] = update_data.priority
        if update_data.due_date is not None:
            update_dict["due_date"] = update_data.due_date
        if update_data.tags is not None:
            update_dict["tags"] = update_data.tags
        
        db.collection(TASKS_COLLECTION).document(task_id).update(update_dict)
        
        # Get updated task
        updated_doc = db.collection(TASKS_COLLECTION).document(task_id).get()
        updated_data = updated_doc.to_dict()
        updated_data["id"] = task_id
        
        # Populate names
        creator = db.collection(USERS_COLLECTION).document(updated_data["created_by"]).get()
        updated_data["created_by_name"] = creator.to_dict().get("full_name", "") if creator.exists else ""
        
        if updated_data.get("assigned_to"):
            assignee = db.collection(USERS_COLLECTION).document(updated_data["assigned_to"]).get()
            updated_data["assigned_to_name"] = assignee.to_dict().get("full_name", "") if assignee.exists else None
        else:
            updated_data["assigned_to_name"] = None
        
        return {
            "success": True,
            "task": updated_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/tasks/{task_id}")
async def delete_task(
    task_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a task"""
    try:
        task_doc = db.collection(TASKS_COLLECTION).document(task_id).get()
        if not task_doc.exists:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_data = task_doc.to_dict()
        
        # Verify user is creator or project owner
        user_id = token_data["uid"]
        is_creator = task_data["created_by"] == user_id
        
        project_doc = db.collection(PROJECTS_COLLECTION).document(task_data["project_id"]).get()
        is_owner = False
        if project_doc.exists:
            is_owner = project_doc.to_dict()["owner_id"] == user_id
        
        if not is_creator and not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized to delete this task")
        
        db.collection(TASKS_COLLECTION).document(task_id).delete()
        
        return {
            "success": True,
            "message": "Task deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ VERSION CONTROL (GITHUB/GITLAB) ============

@app.post("/api/projects/{project_id}/repository")
async def connect_repository(
    project_id: str,
    repo_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Connect a GitHub/GitLab repository to a project"""
    try:
        # Verify project exists and user is owner
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        if project["owner_id"] != user_id:
            raise HTTPException(status_code=403, detail="Only project owner can connect repository")
        
        # Parse repo data
        provider = repo_data.get("provider", "github").lower()
        repo_url = repo_data.get("repo_url")
        access_token = repo_data.get("access_token")
        branch = repo_data.get("branch", "main")
        
        if not repo_url:
            raise HTTPException(status_code=400, detail="Repository URL is required")
        
        # Verify repository exists
        if provider == "github":
            service = GitHubService(access_token)
            owner, repo = service.parse_repo_url(repo_url)
            if not service.verify_repository(owner, repo):
                raise HTTPException(status_code=400, detail="Repository not found or not accessible")
            repo_name = repo
            repo_owner = owner
        elif provider == "gitlab":
            service = GitLabService(access_token)
            project_path = service.parse_repo_url(repo_url)
            if not service.verify_repository(project_path):
                raise HTTPException(status_code=400, detail="Repository not found or not accessible")
            parts = project_path.split("/")
            repo_name = parts[-1] if parts else project_path
            repo_owner = "/".join(parts[:-1]) if len(parts) > 1 else ""
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider. Use 'github' or 'gitlab'")
        
        # Check if repository already connected
        existing_repos = db.collection(REPOSITORIES_COLLECTION)\
            .where("project_id", "==", project_id)\
            .where("is_active", "==", True)\
            .limit(1)\
            .stream()
        
        if len(list(existing_repos)) > 0:
            raise HTTPException(status_code=400, detail="A repository is already connected. Disconnect it first.")
        
        # Create repository document
        repo_id = str(uuid.uuid4())
        repo_document = {
            "id": repo_id,
            "project_id": project_id,
            "provider": provider,
            "repo_url": repo_url,
            "repo_name": repo_name,
            "repo_owner": repo_owner,
            "branch": branch,
            "is_active": True,
            "last_synced": None,
            "connected_at": datetime.utcnow().isoformat(),
            "connected_by": user_id,
            # Don't store access token in database for security
        }
        
        db.collection(REPOSITORIES_COLLECTION).document(repo_id).set(repo_document)
        
        return {
            "success": True,
            "repository": repo_document,
            "message": f"{provider.capitalize()} repository connected successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/repository")
async def get_repository(
    project_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get connected repository for a project"""
    try:
        # Verify project exists and user has access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        # Check if user is owner or collaborator
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Get repository
        repos = db.collection(REPOSITORIES_COLLECTION)\
            .where("project_id", "==", project_id)\
            .where("is_active", "==", True)\
            .limit(1)\
            .stream()
        
        repos_list = list(repos)
        if len(repos_list) == 0:
            return {
                "success": True,
                "repository": None,
                "message": "No repository connected"
            }
        
        repo_data = repos_list[0].to_dict()
        
        return {
            "success": True,
            "repository": repo_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/projects/{project_id}/repository")
async def disconnect_repository(
    project_id: str,
    token_data: dict = Depends(verify_token)
):
    """Disconnect repository from project"""
    try:
        # Verify project exists and user is owner
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        if project["owner_id"] != user_id:
            raise HTTPException(status_code=403, detail="Only project owner can disconnect repository")
        
        # Get repository
        repos = db.collection(REPOSITORIES_COLLECTION)\
            .where("project_id", "==", project_id)\
            .where("is_active", "==", True)\
            .limit(1)\
            .stream()
        
        repos_list = list(repos)
        if len(repos_list) == 0:
            raise HTTPException(status_code=404, detail="No repository connected")
        
        repo_doc = repos_list[0]
        db.collection(REPOSITORIES_COLLECTION).document(repo_doc.id).update({
            "is_active": False,
            "disconnected_at": datetime.utcnow().isoformat()
        })
        
        return {
            "success": True,
            "message": "Repository disconnected successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/repository/commits")
async def get_commits(
    project_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    access_token: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get commits from connected repository"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Get repository
        repos = db.collection(REPOSITORIES_COLLECTION)\
            .where("project_id", "==", project_id)\
            .where("is_active", "==", True)\
            .limit(1)\
            .stream()
        
        repos_list = list(repos)
        if len(repos_list) == 0:
            raise HTTPException(status_code=404, detail="No repository connected")
        
        repo_data = repos_list[0].to_dict()
        provider = repo_data["provider"]
        branch = repo_data["branch"]
        
        # Fetch commits
        if provider == "github":
            service = GitHubService(access_token)
            owner, repo = service.parse_repo_url(repo_data["repo_url"])
            commits = service.get_commits(owner, repo, branch, page, per_page)
        elif provider == "gitlab":
            service = GitLabService(access_token)
            project_path = service.parse_repo_url(repo_data["repo_url"])
            commits = service.get_commits(project_path, branch, page, per_page)
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")
        
        # Update last synced time
        db.collection(REPOSITORIES_COLLECTION).document(repos_list[0].id).update({
            "last_synced": datetime.utcnow().isoformat()
        })
        
        return {
            "success": True,
            "commits": [vars(c) for c in commits.commits],
            "pagination": {
                "page": commits.page,
                "per_page": commits.per_page,
                "total": commits.total
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/repository/pulls")
async def get_pull_requests(
    project_id: str,
    state: str = Query("all", regex="^(open|closed|merged|all)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    access_token: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get pull requests from connected repository"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Get repository
        repos = db.collection(REPOSITORIES_COLLECTION)\
            .where("project_id", "==", project_id)\
            .where("is_active", "==", True)\
            .limit(1)\
            .stream()
        
        repos_list = list(repos)
        if len(repos_list) == 0:
            raise HTTPException(status_code=404, detail="No repository connected")
        
        repo_data = repos_list[0].to_dict()
        provider = repo_data["provider"]
        
        # Fetch pull requests
        if provider == "github":
            service = GitHubService(access_token)
            owner, repo = service.parse_repo_url(repo_data["repo_url"])
            prs = service.get_pull_requests(owner, repo, state, page, per_page)
        elif provider == "gitlab":
            service = GitLabService(access_token)
            project_path = service.parse_repo_url(repo_data["repo_url"])
            # Map state for GitLab
            gitlab_state = "opened" if state == "open" else state
            prs = service.get_pull_requests(project_path, gitlab_state, page, per_page)
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")
        
        return {
            "success": True,
            "pull_requests": [vars(pr) for pr in prs.pull_requests],
            "pagination": {
                "page": prs.page,
                "per_page": prs.per_page,
                "total": prs.total
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/repository/stats")
async def get_repository_stats(
    project_id: str,
    access_token: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get repository statistics"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Get repository
        repos = db.collection(REPOSITORIES_COLLECTION)\
            .where("project_id", "==", project_id)\
            .where("is_active", "==", True)\
            .limit(1)\
            .stream()
        
        repos_list = list(repos)
        if len(repos_list) == 0:
            raise HTTPException(status_code=404, detail="No repository connected")
        
        repo_data = repos_list[0].to_dict()
        provider = repo_data["provider"]
        
        # Fetch stats
        if provider == "github":
            service = GitHubService(access_token)
            owner, repo = service.parse_repo_url(repo_data["repo_url"])
            stats = service.get_repository_stats(owner, repo)
        elif provider == "gitlab":
            service = GitLabService(access_token)
            project_path = service.parse_repo_url(repo_data["repo_url"])
            stats = service.get_repository_stats(project_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")
        
        return {
            "success": True,
            "stats": vars(stats)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ DOCUMENT COLLABORATION ============

@app.post("/api/projects/{project_id}/documents")
async def create_document(
    project_id: str,
    doc_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Create a new document"""
    try:
        # Verify project exists and user has access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Create document
        doc_id = str(uuid.uuid4())
        document = {
            "id": doc_id,
            "project_id": project_id,
            "title": doc_data.get("title", "Untitled Document"),
            "content": doc_data.get("content", ""),
            "folder_id": doc_data.get("folder_id"),
            "created_by": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "last_edited_by": user_id,
            "version": 1
        }
        
        db.collection(DOCUMENTS_COLLECTION).document(doc_id).set(document)
        
        # Get creator info
        creator_doc = db.collection(USERS_COLLECTION).document(user_id).get()
        if creator_doc.exists:
            creator_data = creator_doc.to_dict()
            document["creator"] = {
                "uid": user_id,
                "full_name": creator_data.get("full_name", ""),
                "avatar_url": creator_data.get("avatar_url")
            }
        
        return {
            "success": True,
            "document": document
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/documents")
async def get_documents(
    project_id: str,
    folder_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all documents for a project"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Query documents
        query = db.collection(DOCUMENTS_COLLECTION).where("project_id", "==", project_id)
        
        if folder_id:
            query = query.where("folder_id", "==", folder_id)
        else:
            query = query.where("folder_id", "==", None)
        
        docs = query.order_by("updated_at", direction=firestore.Query.DESCENDING).stream()
        
        documents = []
        for doc in docs:
            doc_data = doc.to_dict()
            
            # Get creator info
            creator_doc = db.collection(USERS_COLLECTION).document(doc_data["created_by"]).get()
            if creator_doc.exists:
                creator_data = creator_doc.to_dict()
                doc_data["creator"] = {
                    "uid": doc_data["created_by"],
                    "full_name": creator_data.get("full_name", ""),
                    "avatar_url": creator_data.get("avatar_url")
                }
            
            documents.append(doc_data)
        
        return {
            "success": True,
            "documents": documents,
            "total": len(documents)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/documents/{document_id}")
async def get_document(
    document_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific document"""
    try:
        doc_ref = db.collection(DOCUMENTS_COLLECTION).document(document_id).get()
        if not doc_ref.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc_ref.to_dict()
        
        # Verify user has access to project
        project_doc = db.collection(PROJECTS_COLLECTION).document(doc_data["project_id"]).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", doc_data["project_id"])\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Get creator info
        creator_doc = db.collection(USERS_COLLECTION).document(doc_data["created_by"]).get()
        if creator_doc.exists:
            creator_data = creator_doc.to_dict()
            doc_data["creator"] = {
                "uid": doc_data["created_by"],
                "full_name": creator_data.get("full_name", ""),
                "avatar_url": creator_data.get("avatar_url")
            }
        
        return {
            "success": True,
            "document": doc_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/documents/{document_id}")
async def update_document(
    document_id: str,
    update_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Update a document"""
    try:
        doc_ref = db.collection(DOCUMENTS_COLLECTION).document(document_id).get()
        if not doc_ref.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc_ref.to_dict()
        
        # Verify user has access
        project_doc = db.collection(PROJECTS_COLLECTION).document(doc_data["project_id"]).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", doc_data["project_id"])\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Update document
        update_dict = {
            "updated_at": datetime.utcnow().isoformat(),
            "last_edited_by": user_id
        }
        
        if "title" in update_data:
            update_dict["title"] = update_data["title"]
        if "content" in update_data:
            update_dict["content"] = update_data["content"]
            update_dict["version"] = doc_data.get("version", 1) + 1
        if "folder_id" in update_data:
            update_dict["folder_id"] = update_data["folder_id"]
        
        db.collection(DOCUMENTS_COLLECTION).document(document_id).update(update_dict)
        
        # Get updated document
        updated_doc = db.collection(DOCUMENTS_COLLECTION).document(document_id).get()
        updated_data = updated_doc.to_dict()
        
        return {
            "success": True,
            "document": updated_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/documents/{document_id}")
async def delete_document(
    document_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a document"""
    try:
        doc_ref = db.collection(DOCUMENTS_COLLECTION).document(document_id).get()
        if not doc_ref.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc_ref.to_dict()
        
        # Verify user is creator or project owner
        user_id = token_data["uid"]
        is_creator = doc_data["created_by"] == user_id
        
        project_doc = db.collection(PROJECTS_COLLECTION).document(doc_data["project_id"]).get()
        is_owner = False
        if project_doc.exists:
            is_owner = project_doc.to_dict()["owner_id"] == user_id
        
        if not is_creator and not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized to delete this document")
        
        db.collection(DOCUMENTS_COLLECTION).document(document_id).delete()
        
        return {
            "success": True,
            "message": "Document deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/projects/{project_id}/folders")
async def create_folder(
    project_id: str,
    folder_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Create a new folder"""
    try:
        # Verify project exists and user has access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Create folder
        folder_id = str(uuid.uuid4())
        folder = {
            "id": folder_id,
            "project_id": project_id,
            "name": folder_data.get("name", "New Folder"),
            "parent_id": folder_data.get("parent_id"),
            "created_by": user_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        db.collection(FOLDERS_COLLECTION).document(folder_id).set(folder)
        
        return {
            "success": True,
            "folder": folder
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/folders")
async def get_folders(
    project_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all folders for a project"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Get folders
        folders_query = db.collection(FOLDERS_COLLECTION)\
            .where("project_id", "==", project_id)\
            .order_by("created_at")\
            .stream()
        
        folders = [folder.to_dict() for folder in folders_query]
        
        return {
            "success": True,
            "folders": folders,
            "total": len(folders)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ MEETINGS & CALLS ============

@app.post("/api/projects/{project_id}/meetings")
async def create_meeting(
    project_id: str,
    meeting_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Create a scheduled meeting"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Create meeting
        meeting_id = str(uuid.uuid4())
        
        # Generate Jitsi room URL if auto_generate_room is True
        meeting_url = meeting_data.get("meeting_url")
        if meeting_data.get("auto_generate_room", True) and not meeting_url:
            # Generate unique Jitsi room name
            room_name = f"collabcore-{project_id[:8]}-{meeting_id[:8]}"
            meeting_url = f"https://meet.jit.si/{room_name}"
        
        meeting = {
            "id": meeting_id,
            "project_id": project_id,
            "title": meeting_data.get("title", "Team Meeting"),
            "description": meeting_data.get("description", ""),
            "meeting_type": meeting_data.get("meeting_type", "other"),
            "scheduled_at": meeting_data.get("scheduled_at", ""),
            "duration_minutes": meeting_data.get("duration_minutes", 60),
            "created_by": user_id,
            "participants": meeting_data.get("participants", []),
            "agenda": meeting_data.get("agenda", []),
            "notes": None,
            "action_items": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "meeting_url": meeting_url,
            "meeting_status": "scheduled"
        }
        
        db.collection(MEETINGS_COLLECTION).document(meeting_id).set(meeting)
        
        # Get creator name
        creator_doc = db.collection(USERS_COLLECTION).document(user_id).get()
        meeting["created_by_name"] = creator_doc.to_dict().get("full_name", "") if creator_doc.exists else ""
        
        # Get participant details
        participant_details = []
        for participant_id in meeting["participants"]:
            participant_doc = db.collection(USERS_COLLECTION).document(participant_id).get()
            if participant_doc.exists:
                participant_data = participant_doc.to_dict()
                participant_details.append({
                    "uid": participant_id,
                    "full_name": participant_data.get("full_name", ""),
                    "avatar_url": participant_data.get("avatar_url")
                })
        
        meeting["participants"] = participant_details
        
        return {
            "success": True,
            "meeting": meeting,
            "message": "Meeting scheduled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/meetings")
async def get_meetings(
    project_id: str,
    status: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all meetings for a project"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Query meetings
        query = db.collection(MEETINGS_COLLECTION).where("project_id", "==", project_id)
        
        if status:
            query = query.where("meeting_status", "==", status)
        
        meetings = query.order_by("scheduled_at").stream()
        
        meetings_list = []
        for meeting in meetings:
            meeting_data = meeting.to_dict()
            
            # Get creator name
            creator_doc = db.collection(USERS_COLLECTION).document(meeting_data["created_by"]).get()
            meeting_data["created_by_name"] = creator_doc.to_dict().get("full_name", "") if creator_doc.exists else ""
            
            # Get participant details
            participant_details = []
            for participant_id in meeting_data.get("participants", []):
                participant_doc = db.collection(USERS_COLLECTION).document(participant_id).get()
                if participant_doc.exists:
                    participant_data = participant_doc.to_dict()
                    participant_details.append({
                        "uid": participant_id,
                        "full_name": participant_data.get("full_name", ""),
                        "avatar_url": participant_data.get("avatar_url")
                    })
            
            meeting_data["participants"] = participant_details
            meetings_list.append(meeting_data)
        
        return {
            "success": True,
            "meetings": meetings_list,
            "total": len(meetings_list)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/meetings/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    update_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Update a meeting"""
    try:
        meeting_doc = db.collection(MEETINGS_COLLECTION).document(meeting_id).get()
        if not meeting_doc.exists:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        meeting_data = meeting_doc.to_dict()
        
        # Verify user is creator or project owner
        user_id = token_data["uid"]
        is_creator = meeting_data["created_by"] == user_id
        
        project_doc = db.collection(PROJECTS_COLLECTION).document(meeting_data["project_id"]).get()
        is_owner = False
        if project_doc.exists:
            is_owner = project_doc.to_dict()["owner_id"] == user_id
        
        if not is_creator and not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized to update this meeting")
        
        # Update meeting
        update_dict = {"updated_at": datetime.utcnow().isoformat()}
        
        if "title" in update_data:
            update_dict["title"] = update_data["title"]
        if "description" in update_data:
            update_dict["description"] = update_data["description"]
        if "meeting_type" in update_data:
            update_dict["meeting_type"] = update_data["meeting_type"]
        if "scheduled_at" in update_data:
            update_dict["scheduled_at"] = update_data["scheduled_at"]
        if "duration_minutes" in update_data:
            update_dict["duration_minutes"] = update_data["duration_minutes"]
        if "participants" in update_data:
            update_dict["participants"] = update_data["participants"]
        if "agenda" in update_data:
            update_dict["agenda"] = update_data["agenda"]
        if "notes" in update_data:
            update_dict["notes"] = update_data["notes"]
        if "action_items" in update_data:
            update_dict["action_items"] = update_data["action_items"]
        if "meeting_url" in update_data:
            update_dict["meeting_url"] = update_data["meeting_url"]
        if "meeting_status" in update_data:
            update_dict["meeting_status"] = update_data["meeting_status"]
        
        db.collection(MEETINGS_COLLECTION).document(meeting_id).update(update_dict)
        
        # Get updated meeting
        updated_doc = db.collection(MEETINGS_COLLECTION).document(meeting_id).get()
        updated_data = updated_doc.to_dict()
        
        return {
            "success": True,
            "meeting": updated_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a meeting"""
    try:
        meeting_doc = db.collection(MEETINGS_COLLECTION).document(meeting_id).get()
        if not meeting_doc.exists:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        meeting_data = meeting_doc.to_dict()
        
        # Verify user is creator or project owner
        user_id = token_data["uid"]
        is_creator = meeting_data["created_by"] == user_id
        
        project_doc = db.collection(PROJECTS_COLLECTION).document(meeting_data["project_id"]).get()
        is_owner = False
        if project_doc.exists:
            is_owner = project_doc.to_dict()["owner_id"] == user_id
        
        if not is_creator and not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized to delete this meeting")
        
        db.collection(MEETINGS_COLLECTION).document(meeting_id).delete()
        
        return {
            "success": True,
            "message": "Meeting deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/meetings/{meeting_id}/join")
async def get_meeting_join_url(
    meeting_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get meeting join URL (for instant calls)"""
    try:
        meeting_doc = db.collection(MEETINGS_COLLECTION).document(meeting_id).get()
        if not meeting_doc.exists:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        meeting_data = meeting_doc.to_dict()
        
        # Verify user has access to project
        project_doc = db.collection(PROJECTS_COLLECTION).document(meeting_data["project_id"]).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", meeting_data["project_id"])\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Update meeting status to in_progress
        db.collection(MEETINGS_COLLECTION).document(meeting_id).update({
            "meeting_status": "in_progress",
            "updated_at": datetime.utcnow().isoformat()
        })
        
        return {
            "success": True,
            "meeting_url": meeting_data.get("meeting_url"),
            "meeting_id": meeting_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/projects/{project_id}/instant-call")
async def create_instant_call(
    project_id: str,
    call_data: dict,
    token_data: dict = Depends(verify_token)
):
    """Create an instant video/audio call"""
    try:
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Create instant meeting
        meeting_id = str(uuid.uuid4())
        room_name = f"collabcore-instant-{project_id[:8]}-{meeting_id[:8]}"
        meeting_url = f"https://meet.jit.si/{room_name}"
        
        meeting = {
            "id": meeting_id,
            "project_id": project_id,
            "title": call_data.get("title", "Instant Call"),
            "description": "Instant call",
            "meeting_type": call_data.get("call_type", "video"),  # video or audio
            "scheduled_at": datetime.utcnow().isoformat(),
            "duration_minutes": 60,
            "created_by": user_id,
            "participants": [],
            "agenda": [],
            "notes": None,
            "action_items": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "meeting_url": meeting_url,
            "meeting_status": "in_progress"
        }
        
        db.collection(MEETINGS_COLLECTION).document(meeting_id).set(meeting)
        
        return {
            "success": True,
            "meeting_url": meeting_url,
            "meeting_id": meeting_id,
            "room_name": room_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ FILE UPLOAD (CLOUDINARY) ============

@app.post("/api/upload/file")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    project_id: str = Query(...),
    token_data: dict = Depends(verify_token)
):
    """Upload a file to Cloudinary"""
    try:
        # Check if Cloudinary is enabled
        if not CLOUDINARY_ENABLED:
            raise HTTPException(
                status_code=503, 
                detail="File upload service not configured. Please set CLOUDINARY_URL in .env file."
            )
        # Verify project access
        project_doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not project_doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_doc.to_dict()
        user_id = token_data["uid"]
        
        is_owner = project["owner_id"] == user_id
        is_collaborator = False
        
        if not is_owner:
            apps_query = db.collection(APPLICATIONS_COLLECTION)\
                .where("project_id", "==", project_id)\
                .where("user_id", "==", user_id)\
                .where("status", "==", "accepted")\
                .limit(1)
            is_collaborator = len(list(apps_query.stream())) > 0
        
        if not is_owner and not is_collaborator:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (10MB limit for free tier)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Determine content type
        content_type = file.content_type or 'application/octet-stream'
        
        # Determine file type for chat
        file_type = 'file'
        resource_type = 'auto'
        
        if content_type.startswith('image/'):
            file_type = 'image'
            resource_type = 'image'
        elif content_type.startswith('video/'):
            file_type = 'video'
            resource_type = 'video'
        elif content_type.startswith('audio/'):
            file_type = 'audio'
            resource_type = 'video'
        else:
            # For other files, use raw resource type
            resource_type = 'raw'
        
        # Upload to Cloudinary
        folder = f"collabcore/projects/{project_id}"
        
        # Create a unique public_id without special characters
        safe_filename = file.filename.replace(' ', '_').replace('/', '_').split('.')[0]
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_id = f"{safe_filename}_{uuid.uuid4().hex[:8]}"
        
        # Wrap content in BytesIO for Cloudinary
        file_stream = BytesIO(file_content)
        
        upload_result = cloudinary.uploader.upload(
            file_stream,
            folder=folder,
            resource_type=resource_type,
            public_id=unique_id,
            format=file_extension if file_extension else None
        )
        
        return {
            "success": True,
            "file_url": upload_result['secure_url'],
            "file_name": file.filename,
            "file_type": file_type,
            "content_type": content_type,
            "file_size": len(file_content),
            "cloudinary_id": upload_result['public_id']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


# ============ HEALTH CHECK ============

@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "CollabCore API is running!",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth/*",
            "projects": "/api/projects/*",
            "applications": "/api/applications/*",
            "users": "/api/users/*",
            "search": "/api/search/*",
            "calls": "/api/calls/*",
            "messages": "/api/projects/{project_id}/messages, /api/messages/*",
            "static": "/api/skills, /api/universities, /api/categories, /api/stats"
        }
    }


@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

