from fastapi import FastAPI, HTTPException, Depends, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime
from firebase_admin import auth, firestore
from firebase_config import db, USERS_COLLECTION, POSTS_COLLECTION, PROJECTS_COLLECTION, APPLICATIONS_COLLECTION

app = FastAPI(title="CollabCore API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ AUTH MIDDLEWARE ============

async def verify_token(authorization: str = Header(None)) -> dict:
    """Verify Firebase ID token from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ============ AUTH ENDPOINTS ============

@app.post("/api/auth/signup")
async def signup(request: Request):
    """Create a new user account"""
    try:
        data = await request.json()
        
        # Basic validation
        if not data.get("email") or not data.get("password"):
            raise HTTPException(status_code=400, detail="Email and password are required")
        
        # Validate role
        role = data.get("role", "student")  # Default to student
        valid_roles = ["student", "project_leader", "both"]
        if role.lower() not in valid_roles:
            raise HTTPException(
                status_code=400, 
                detail=f"Role must be one of: {', '.join(valid_roles)}"
            )
        
        # Create user in Firebase Auth
        user = auth.create_user(
            email=data["email"],
            password=data["password"]
        )
        
        # Create user profile in Firestore
        user_data = {
            "uid": user.uid,
            "email": data["email"],
            "full_name": data.get("full_name", ""),
            "university": data.get("university", ""),
            "skills": data.get("skills", []),
            "bio": data.get("bio", ""),
            "role": role.lower(),  # student, project_leader, or both
            "created_at": datetime.utcnow().isoformat()
        }
        
        db.collection(USERS_COLLECTION).document(user.uid).set(user_data)
        
        return {
            "success": True,
            "message": "User created successfully",
            "user": {
                "uid": user.uid,
                "email": user.email,
                "role": role.lower()
            }
        }
    
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=409, detail="Email already exists")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
async def login(request: Request):
    """Login endpoint - returns user info (client gets token from Firebase SDK)"""
    try:
        data = await request.json()
        
        if not data.get("email"):
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Get user by email from Firebase Auth
        user = auth.get_user_by_email(data["email"])
        
        user_ref = db.collection(USERS_COLLECTION).document(user.uid)
        user_doc = user_ref.get()

        # If Firestore profile is missing, create a default profile
        if not user_doc.exists:
            profile_data = {
                "uid": user.uid,
                "email": user.email,
                "full_name": user.display_name or "",
                "university": "",
                "skills": [],
                "bio": "",
                "role": "student",
                "created_at": datetime.utcnow().isoformat(),
            }
            user_ref.set(profile_data)
            user_doc = user_ref.get()

        return {
            "success": True,
            "message": "Login successful",
            "user": user_doc.to_dict()
        }
    
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException as e:
        raise e
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
    except HTTPException as e:
        # Re-throw existing HTTP errors (proper status code)
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ PROJECTS ENDPOINTS ============

@app.post("/api/projects", status_code=status.HTTP_201_CREATED)
async def create_project(request: Request, token_data: dict = Depends(verify_token)):
    """Create a new project (requires authentication)"""
    try:
        data = await request.json()
        uid = token_data["uid"]

        # Basic validation
        if not data.get("title") or not data.get("description"):
            raise HTTPException(status_code=400, detail="Title and description are required")

        project_data = {
            "title": data["title"],
            "description": data["description"],
            "required_skills": data.get("required_skills", []),
            "category": data.get("category", "Other"),
            "difficulty": data.get("difficulty", "Beginner"),
            "team_size_limit": data.get("team_size_limit", 5),
            "tags": data.get("tags", []),
            "repository_url": data.get("repository_url", ""),
            "owner_id": uid,
            "current_team_size": 1,
            "status": "recruiting",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        ref = db.collection(PROJECTS_COLLECTION).add(project_data)
        project_id = ref[1].id
        return {"success": True, "project_id": project_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create project: {str(e)}")

@app.get("/api/projects")
async def get_projects(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
):
    """Get all projects with optional filters"""
    try:
        query = db.collection(PROJECTS_COLLECTION)
        
        if status:
            query = query.where("status", "==", status)
        if category:
            query = query.where("category", "==", category)
        
        query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
        query = query.limit(limit)
        
        projects = []
        for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            projects.append(data)
        
        return {"success": True, "projects": projects}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get a single project by ID"""
    try:
        doc = db.collection(PROJECTS_COLLECTION).document(project_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_data = doc.to_dict()
        project_data["id"] = doc.id
        return {"success": True, "project": project_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/projects/{project_id}")
async def update_project(
    project_id: str, 
    request: Request, 
    token_data: dict = Depends(verify_token)
):
    """Update a project"""
    try:
        data = await request.json()
        doc_ref = db.collection(PROJECTS_COLLECTION).document(project_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
            
        if doc.to_dict().get("owner_id") != token_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this project")
            
        data["updated_at"] = datetime.utcnow().isoformat()
        doc_ref.update(data)
        
        return {"success": True, "message": "Project updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ POSTS ENDPOINTS ============

@app.post("/api/posts")
async def create_post(
    request: Request,
    token_data: dict = Depends(verify_token)
):
    """Create a new project post (requires authentication)"""
    try:
        data = await request.json()
        uid = token_data["uid"]
        
        # Basic validation
        if not data.get("title") or not data.get("description"):
            raise HTTPException(status_code=400, detail="Title and description are required")
        
        post_data = {
            "title": data["title"],
            "description": data["description"],
            "required_skills": data.get("required_skills", []),
            "category": data.get("category", "Other"),
            "status": "open",
            "author_id": uid,
            "team_size": data.get("team_size", 5),
            "current_team_size": 1,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        # Add post to Firestore
        post_ref = db.collection(POSTS_COLLECTION).add(post_data)
        post_id = post_ref[1].id
        
        return {
            "success": True,
            "message": "Post created successfully",
            "post_id": post_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/posts")
async def get_posts(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
):
    """Get all posts with optional filters"""
    try:
        query = db.collection(POSTS_COLLECTION)
        
        # Apply filters
        if status:
            query = query.where("status", "==", status)
        if category:
            query = query.where("category", "==", category)
        
        # Order by most recent
        query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
        query = query.limit(limit)
        
        # Execute query
        posts = []
        for doc in query.stream():
            post_data = doc.to_dict()
            post_data["id"] = doc.id
            posts.append(post_data)
        
        return {
            "success": True,
            "posts": posts,
            "count": len(posts)
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/posts/{post_id}")
async def get_post(post_id: str):
    """Get a single post by ID"""
    try:
        post_doc = db.collection(POSTS_COLLECTION).document(post_id).get()
        
        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Post not found")
        
        post_data = post_doc.to_dict()
        post_data["id"] = post_doc.id
        
        return {
            "success": True,
            "post": post_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/posts/user/{user_id}")
async def get_user_posts(user_id: str):
    """Get all posts by a specific user"""
    try:
        query = db.collection(POSTS_COLLECTION) \
            .where("author_id", "==", user_id) \
            .order_by("created_at", direction=firestore.Query.DESCENDING)
        
        posts = []
        for doc in query.stream():
            post_data = doc.to_dict()
            post_data["id"] = doc.id
            posts.append(post_data)
        
        return {
            "success": True,
            "posts": posts,
            "count": len(posts)
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ UNIVERSITIES ENDPOINTS ============

@app.get("/api/universities")
async def get_universities():
    """Get all available universities"""
    try:
        universities_ref = db.collection("universities").stream()
        universities = []
        
        for doc in universities_ref:
            uni_data = doc.to_dict()
            uni_data["id"] = doc.id
            universities.append(uni_data)
        
        # If no universities in DB, return default list
        if not universities:
            universities = [
                {"id": "mit", "name": "MIT"},
                {"id": "stanford", "name": "Stanford University"},
                {"id": "harvard", "name": "Harvard University"},
                {"id": "berkeley", "name": "UC Berkeley"},
                {"id": "caltech", "name": "Caltech"},
                {"id": "CMU", "name": "Carnegie Mellon University"},
                {"id": "georgia-tech", "name": "Georgia Tech"},
                {"id": "yale", "name": "Yale University"},
                {"id": "penn", "name": "University of Pennsylvania"},
                {"id": "michigan", "name": "University of Michigan"}
            ]
        
        return {
            "success": True,
            "universities": universities,
            "count": len(universities)
        }
    
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

        accepted_apps = db.collection(APPLICATIONS_COLLECTION) \
            .where("user_id", "==", uid) \
            .where("status", "==", "accepted") \
            .get()

        projects = []
        for app_doc in accepted_apps:
            app_data = app_doc.to_dict()
            project_doc = db.collection(PROJECTS_COLLECTION).document(app_data["project_id"]).get()
            if project_doc.exists:
                project_data = project_doc.to_dict()
                project_data["id"] = project_doc.id
                projects.append(project_data)

        return {
            "success": True,
            "projects": projects,
            "count": len(projects)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ HEALTH CHECK ============

@app.get("/")
async def root():
    return {
        "message": "CollabCore API is running!",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth/*",
            "posts": "/api/posts/*",
            "universities": "/api/universities",
            "my_leading_projects": "/api/me/projects/leading",
            "my_collaborating_projects": "/api/me/projects/collaborating"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)