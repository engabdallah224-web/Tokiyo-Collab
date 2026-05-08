"""
Data models for request/response validation
Using Python dataclasses instead of Pydantic
"""

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


# ============ USER MODELS ============

@dataclass
class UserSignup:
    email: str
    password: str
    full_name: str
    university: str
    bio: str = ""
    skills: List[str] = field(default_factory=list)
    role: str = "student"  # student, project_leader, both


@dataclass
class UserLogin:
    email: str
    password: str


@dataclass
class UserProfile:
    uid: str
    email: str
    full_name: str
    university: str
    bio: str = ""
    skills: List[str] = field(default_factory=list)
    role: str = "student"
    rating: float = 0.0
    projects_count: int = 0
    avatar_url: Optional[str] = None
    created_at: str = ""


@dataclass
class UserUpdate:
    full_name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    avatar_url: Optional[str] = None


# ============ PROJECT MODELS ============

@dataclass
class ProjectCreate:
    title: str
    description: str
    required_skills: List[str] = field(default_factory=list)
    team_size_limit: int = 5
    tags: List[str] = field(default_factory=list)
    category: str = "other"
    difficulty: str = "intermediate"  # beginner, intermediate, advanced
    duration: str = "3-6 months"


@dataclass
class ProjectUpdate:
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    team_size_limit: Optional[int] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None  # recruiting, active, completed, on_hold
    category: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[str] = None


@dataclass
class ProjectResponse:
    id: str
    title: str
    description: str
    owner_id: str
    owner: dict
    required_skills: List[str]
    team_size_limit: int
    current_team_size: int
    status: str
    tags: List[str]
    category: str
    difficulty: str
    duration: str
    created_at: str
    updated_at: str


# ============ APPLICATION MODELS ============

@dataclass
class ApplicationCreate:
    project_id: str
    message: str


@dataclass
class ApplicationUpdate:
    status: str  # pending, accepted, rejected, withdrawn
    reviewer_notes: Optional[str] = None


@dataclass
class ApplicationResponse:
    id: str
    project_id: str
    user_id: str
    user: dict
    message: str
    status: str
    applied_at: str
    reviewed_at: Optional[str] = None
    reviewer_notes: Optional[str] = None


# ============ SEARCH MODELS ============

@dataclass
class SearchQuery:
    q: str
    limit: int = 20


# ============ FILTER MODELS ============

@dataclass
class ProjectFilters:
    status: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    university: Optional[str] = None
    skills: Optional[List[str]] = None
    limit: int = 20
