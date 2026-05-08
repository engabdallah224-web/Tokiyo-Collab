"""
Chat/Message Models for Project Workspace
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============ ENUMS ============

class MessageType(str, Enum):
    TEXT = "text"
    FILE = "file"
    SYSTEM = "system"
    IMAGE = "image"


# ============ REQUEST MODELS ============

@dataclass
class MessageCreate:
    project_id: str
    content: str
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    reply_to: Optional[str] = None  # Message ID being replied to


@dataclass
class MessageUpdate:
    content: Optional[str] = None
    is_edited: bool = True


# ============ RESPONSE MODELS ============

@dataclass
class MessageSender:
    uid: str
    full_name: str
    avatar_url: Optional[str] = None


@dataclass
class MessageResponse:
    id: str
    project_id: str
    sender_id: str
    sender: Dict[str, Any]
    content: str
    message_type: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    reply_to: Optional[str] = None
    is_edited: bool = False
    created_at: str = ""
    updated_at: str = ""


@dataclass
class MessagesResponse:
    messages: List[Dict[str, Any]]
    total: int
    has_more: bool
    next_cursor: Optional[str] = None


# ============ UTILITY FUNCTIONS ============

def format_message_timestamp(timestamp: str) -> str:
    """Format message timestamp for display"""
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        now = datetime.now(dt.tzinfo)
        diff = now - dt
        
        if diff.days == 0:
            if diff.seconds < 60:
                return "Just now"
            elif diff.seconds < 3600:
                minutes = diff.seconds // 60
                return f"{minutes}m ago"
            else:
                hours = diff.seconds // 3600
                return f"{hours}h ago"
        elif diff.days == 1:
            return "Yesterday"
        elif diff.days < 7:
            return f"{diff.days}d ago"
        else:
            return dt.strftime("%b %d")
    except:
        return timestamp

