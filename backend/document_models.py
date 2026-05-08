"""
Document collaboration models for real-time editing
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


# ============ DOCUMENT MODELS ============

@dataclass
class DocumentCreate:
    """Request model for creating a document"""
    title: str
    content: str = ""
    folder_id: Optional[str] = None


@dataclass
class DocumentUpdate:
    """Request model for updating a document"""
    title: Optional[str] = None
    content: Optional[str] = None
    folder_id: Optional[str] = None


@dataclass
class DocumentEditor:
    """Information about document editor"""
    uid: str
    full_name: str
    avatar_url: Optional[str] = None
    color: str = "#000000"  # User color for cursor/highlights


@dataclass
class DocumentResponse:
    """Response model for document"""
    id: str
    project_id: str
    title: str
    content: str
    created_by: str
    creator: Dict[str, Any]  # Creator user info
    created_at: str
    updated_at: str
    folder_id: Optional[str] = None
    last_edited_by: Optional[str] = None
    last_editor: Optional[Dict[str, Any]] = None  # Last editor user info
    version: int = 1
    active_editors: List[DocumentEditor] = field(default_factory=list)


@dataclass
class DocumentListResponse:
    """Response model for list of documents"""
    documents: List[DocumentResponse]
    total: int


# ============ DOCUMENT FOLDER MODELS ============

@dataclass
class FolderCreate:
    """Request model for creating a folder"""
    name: str
    parent_id: Optional[str] = None


@dataclass
class FolderUpdate:
    """Request model for updating a folder"""
    name: Optional[str] = None
    parent_id: Optional[str] = None


@dataclass
class FolderResponse:
    """Response model for folder"""
    id: str
    project_id: str
    name: str
    created_by: str
    created_at: str
    parent_id: Optional[str] = None
    document_count: int = 0
    subfolder_count: int = 0


# ============ DOCUMENT VERSION MODELS ============

@dataclass
class DocumentVersion:
    """Document version for history"""
    version: int
    content: str
    edited_by: str
    editor: Dict[str, Any]
    edited_at: str
    changes_summary: Optional[str] = None


@dataclass
class DocumentVersionListResponse:
    """Response model for document versions"""
    versions: List[DocumentVersion]
    total: int
    current_version: int


# ============ REAL-TIME COLLABORATION MODELS ============

@dataclass
class CursorPosition:
    """Cursor position for real-time collaboration"""
    user_id: str
    full_name: str
    color: str
    position: int  # Character position
    selection_start: Optional[int] = None
    selection_end: Optional[int] = None


@dataclass
class DocumentUpdate_Operation:
    """Operational Transform operation for document editing"""
    type: str  # insert, delete, retain
    position: int
    user_id: str
    timestamp: str
    content: Optional[str] = None
    length: Optional[int] = None


@dataclass
class CollaborationSession:
    """Active collaboration session"""
    document_id: str
    active_users: List[DocumentEditor]
    cursor_positions: List[CursorPosition]
    last_activity: str

