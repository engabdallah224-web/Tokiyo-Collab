"""
CollabCore AI/ML FastAPI Integration Module
This module exposes the semantic search capabilities as REST API endpoints
that the backend team can easily integrate into the main application.
"""

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import uvicorn
from datetime import datetime
import logging

# Import our AI/ML services
from ai_ml.services.semantic_search import SemanticSearchService
from ai_ml.services.embeddings import EmbeddingService

# Configure logging for monitoring API usage
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan context manager for startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Initialize services when the API starts and cleanup when it shuts down.
    This preloads the ML model and establishes the Pinecone connection,
    ensuring the first request doesn't experience a cold start delay.
    """
    # Startup
    logger.info("Starting CollabCore Semantic Search API...")
    get_semantic_service()
    get_embedding_service()
    logger.info("All services initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down CollabCore Semantic Search API...")
    # Additional cleanup can be added here if needed

# Initialize FastAPI app with metadata and lifespan
app = FastAPI(
    title="CollabCore Semantic Search API",
    description="AI-powered skill matching and semantic search endpoints",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI available at /docs
    redoc_url="/redoc",  # ReDoc available at /redoc
    lifespan=lifespan
)

# Configure CORS to allow the frontend to communicate with this service
# In production, you'd want to restrict origins to your actual frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize our services as singleton instances
# This ensures we reuse the same model and connections for all requests
semantic_service = None
embedding_service = None

def get_semantic_service():
    """
    Get or create the semantic search service instance.
    Using a singleton pattern ensures we don't reload the model for each request,
    which would be inefficient and slow.
    """
    global semantic_service
    if semantic_service is None:
        semantic_service = SemanticSearchService()
        logger.info("Semantic search service initialized")
    return semantic_service

def get_embedding_service():
    """
    Get or create the embedding service instance.
    This maintains the ML model in memory for fast response times.
    """
    global embedding_service
    if embedding_service is None:
        embedding_service = EmbeddingService()
        logger.info("Embedding service initialized")
    return embedding_service

# Pydantic models for request/response validation
# These ensure that the API receives and returns properly structured data

class UserEmbeddingRequest(BaseModel):
    """
    Request model for creating or updating a user's skill embedding.
    Pydantic automatically validates that all required fields are present
    and properly typed, preventing errors from bad data.
    """
    user_id: str = Field(..., description="Unique user identifier", json_schema_extra={"example": "user_123"})
    name: str = Field(..., description="User's display name", json_schema_extra={"example": "Alice Johnson"})
    skills: str = Field(..., description="Comma-separated skills", json_schema_extra={"example": "Python, Machine Learning, TensorFlow"})
    bio: Optional[str] = Field(None, description="User biography", json_schema_extra={"example": "Experienced ML engineer"})
    role: Optional[str] = Field(None, description="User's role", json_schema_extra={"example": "AI Engineer"})
    experience_years: Optional[int] = Field(None, description="Years of experience", ge=0, le=50)
    
    @field_validator('skills')
    @classmethod
    def validate_skills(cls, v):
        """Ensure skills field is not empty and properly formatted"""
        if not v or len(v.strip()) == 0:
            raise ValueError("Skills cannot be empty")
        # Clean up the skills string
        cleaned = ", ".join([s.strip() for s in v.split(",") if s.strip()])
        return cleaned

class ProjectEmbeddingRequest(BaseModel):
    """
    Request model for creating a project with searchable skill requirements.
    This captures all the information needed to match projects with qualified users.
    """
    project_id: str = Field(..., description="Unique project identifier", json_schema_extra={"example": "proj_456"})
    title: str = Field(..., description="Project title", json_schema_extra={"example": "AI Recommendation System"})
    description: str = Field(..., description="Project description", min_length=10, max_length=1000)
    required_skills: str = Field(..., description="Required skills for the project")
    owner_id: str = Field(..., description="Project owner's user ID", json_schema_extra={"example": "user_789"})
    team_size: Optional[int] = Field(None, description="Desired team size", ge=1, le=100)
    duration_weeks: Optional[int] = Field(None, description="Estimated duration in weeks", ge=1, le=520)
    status: Optional[str] = Field("open", description="Project status", pattern="^(open|closed|in_progress)$")

class SearchRequest(BaseModel):
    """
    Request model for semantic search operations.
    This handles both user searches (finding team members) and
    project searches (finding opportunities).
    """
    query: str = Field(..., description="Search query or skills to match", json_schema_extra={"example": "Python backend developer with API experience"})
    search_type: str = Field("users", description="Type of search", pattern="^(users|projects)$")
    limit: int = Field(10, description="Maximum results to return", ge=1, le=50)
    min_score: float = Field(0.5, description="Minimum similarity score", ge=0.0, le=1.0)
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")

class SearchResult(BaseModel):
    """
    Response model for search results.
    This structures the data returned from searches in a consistent format.
    """
    id: str
    name: Optional[str]
    title: Optional[str]
    skills: Optional[str]
    required_skills: Optional[str]
    score: float
    match_percentage: str
    metadata: Dict[str, Any]

class BatchEmbeddingRequest(BaseModel):
    """
    Request model for generating embeddings for multiple texts at once.
    This is useful for bulk operations or preprocessing.
    """
    texts: List[str] = Field(..., description="List of texts to embed", min_length=1, max_length=100)
    
# API Endpoints

@app.get("/")
async def root():
    """
    Root endpoint providing API information.
    This helps developers understand what the service offers.
    """
    return {
        "service": "CollabCore Semantic Search API",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "search": "/search/semantic",
            "users": "/embeddings/user",
            "projects": "/embeddings/project"
        },
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring service status.
    This is crucial for deployment - load balancers and orchestrators
    use this to verify the service is running properly.
    """
    try:
        service = get_semantic_service()
        stats = service.get_index_stats()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "index_stats": {
                "total_vectors": stats.get("total_vectors", 0),
                "index_ready": True
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.post("/search/semantic", response_model=List[SearchResult])
async def semantic_search(request: SearchRequest):
    """
    Main semantic search endpoint.
    
    This is the primary endpoint that the backend will call to find
    matching users or projects. It handles both types of searches
    through a unified interface, making it simple for the backend
    team to integrate.
    
    The semantic search understands relationships between skills,
    so searching for "ML engineer" will find people with
    "Machine Learning", "Deep Learning", or "Neural Networks" skills.
    """
    try:
        service = get_semantic_service()
        
        if request.search_type == "users":
            # Search for users with matching skills
            results = service.search_matching_users(
                required_skills=request.query,
                top_k=request.limit,
                min_score=request.min_score,
                exclude_users=request.filters.get("exclude_users") if request.filters else None
            )
        else:
            # Search for projects matching user skills
            results = service.search_matching_projects(
                user_skills=request.query,
                top_k=request.limit,
                min_score=request.min_score,
                status_filter=request.filters.get("status") if request.filters else "open"
            )
        
        # Format results for response
        formatted_results = []
        for result in results:
            formatted_results.append(SearchResult(
                id=result.get("user_id") or result.get("project_id"),
                name=result.get("name"),
                title=result.get("title"),
                skills=result.get("skills"),
                required_skills=result.get("required_skills"),
                score=result.get("score"),
                match_percentage=result.get("match_percentage"),
                metadata={k: v for k, v in result.items() 
                         if k not in ["user_id", "project_id", "name", "title", 
                                     "skills", "required_skills", "score", "match_percentage"]}
            ))
        
        logger.info(f"Search completed: {request.search_type} query returned {len(formatted_results)} results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/embeddings/user")
async def create_user_embedding(request: UserEmbeddingRequest):
    """
    Create or update a user's skill embedding.
    
    This endpoint is called when a user signs up or updates their profile.
    It converts their skills into a searchable vector and stores it in Pinecone.
    The backend team will call this whenever user skills change.
    """
    try:
        service = get_semantic_service()
        
        # Prepare additional metadata from optional fields
        metadata = {}
        if request.bio:
            metadata["bio"] = request.bio
        if request.role:
            metadata["role"] = request.role
        if request.experience_years is not None:
            metadata["experience_years"] = request.experience_years
        
        # Create or update the embedding
        result = service.create_user_embedding(
            user_id=request.user_id,
            name=request.name,
            skills=request.skills,
            additional_metadata=metadata
        )
        
        if result["success"]:
            logger.info(f"User embedding created/updated for {request.user_id}")
            return {
                "success": True,
                "message": f"User {request.user_id} indexed successfully",
                "user_id": request.user_id
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("message", "Failed to create embedding"))
            
    except Exception as e:
        logger.error(f"Failed to create user embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to index user: {str(e)}")

@app.put("/embeddings/user/{user_id}")
async def update_user_embedding(user_id: str, request: UserEmbeddingRequest):
    """
    Update an existing user's embedding.
    
    This provides a RESTful way to update user skills when they
    learn new technologies or change their focus areas.
    """
    try:
        service = get_semantic_service()
        
        metadata = {}
        if request.bio:
            metadata["bio"] = request.bio
        if request.role:
            metadata["role"] = request.role
        if request.experience_years is not None:
            metadata["experience_years"] = request.experience_years
        
        result = service.update_user_embedding(
            user_id=user_id,
            name=request.name,
            skills=request.skills,
            additional_metadata=metadata
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": f"User {user_id} updated successfully"
            }
        else:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
            
    except Exception as e:
        logger.error(f"Failed to update user embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@app.delete("/embeddings/user/{user_id}")
async def delete_user_embedding(user_id: str):
    """
    Remove a user from the search index.
    
    Called when a user deletes their account or opts out of
    being searchable. This ensures data privacy compliance.
    """
    try:
        service = get_semantic_service()
        result = service.delete_user_embedding(user_id)
        
        if result["success"]:
            return {
                "success": True,
                "message": f"User {user_id} removed from search index"
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to delete"))
            
    except Exception as e:
        logger.error(f"Failed to delete user embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@app.post("/embeddings/project")
async def create_project_embedding(request: ProjectEmbeddingRequest):
    """
    Create a searchable embedding for a project.
    
    When someone creates a new project, this endpoint indexes its
    requirements so the system can match it with qualified users.
    """
    try:
        service = get_semantic_service()
        
        metadata = {
            "owner_id": request.owner_id,
            "status": request.status
        }
        if request.team_size:
            metadata["team_size"] = request.team_size
        if request.duration_weeks:
            metadata["duration_weeks"] = request.duration_weeks
        
        result = service.create_project_embedding(
            project_id=request.project_id,
            title=request.title,
            description=request.description,
            required_skills=request.required_skills,
            additional_metadata=metadata
        )
        
        if result["success"]:
            logger.info(f"Project embedding created for {request.project_id}")
            return {
                "success": True,
                "message": f"Project {request.project_id} indexed successfully",
                "project_id": request.project_id
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("message", "Failed to create embedding"))
            
    except Exception as e:
        logger.error(f"Failed to create project embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to index project: {str(e)}")

@app.post("/embeddings/generate")
async def generate_embeddings(request: BatchEmbeddingRequest):
    """
    Generate embeddings for multiple texts without storing them.
    
    This utility endpoint is useful for testing, debugging, or
    when the backend needs embeddings for temporary comparisons
    without persisting them to the database.
    """
    try:
        service = get_embedding_service()
        embeddings = service.generate_embeddings_batch(request.texts)
        
        # Convert numpy arrays to lists for JSON serialization
        results = []
        for i, text in enumerate(request.texts):
            results.append({
                "text": text,
                "embedding_dimension": len(embeddings[i]),
                "embedding_sample": embeddings[i][:5].tolist()  # Just first 5 values as sample
            })
        
        return {
            "success": True,
            "count": len(results),
            "embeddings": results
        }
        
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

@app.get("/stats")
async def get_statistics():
    """
    Get statistics about the search index.
    
    This provides insights into system usage and helps monitor
    the growth of the platform. Useful for analytics and debugging.
    """
    try:
        service = get_semantic_service()
        stats = service.get_index_stats()
        
        return {
            "total_vectors": stats.get("total_vectors", 0),
            "index_dimensions": stats.get("dimensions", 384),
            "namespaces": stats.get("namespaces", {}),
            "index_fullness": f"{stats.get('index_fullness', 0) * 100:.2f}%"
        }
        
    except Exception as e:
        logger.error(f"Failed to get statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

# Application startup and shutdown events are now handled by the lifespan context manager

# Main entry point for running the service directly
if __name__ == "__main__":
    # Configure the server
    # In production, you'd typically run this behind a proper ASGI server like Gunicorn
    uvicorn.run(
        app,
        host="0.0.0.0",  # Listen on all interfaces
        port=8001,  # Port 8001 to avoid conflicts with main backend on 8000
        reload=True,  # Auto-reload on code changes during development
        log_level="info"
    )