"""
Workspace Models for Tasks, Meetings, and Settings
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============ ENUMS ============

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    BLOCKED = "blocked"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class MeetingType(str, Enum):
    STANDUP = "standup"
    PLANNING = "planning"
    REVIEW = "review"
    RETROSPECTIVE = "retrospective"
    OTHER = "other"


# ============ TASK MODELS ============

@dataclass
class TaskCreate:
    project_id: str
    title: str
    description: str = ""
    assigned_to: Optional[str] = None  # user_id
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[str] = None
    tags: List[str] = field(default_factory=list)


@dataclass
class TaskUpdate:
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[List[str]] = None


@dataclass
class TaskResponse:
    id: str
    project_id: str
    title: str
    description: str
    created_by: str
    created_by_name: str
    assigned_to: Optional[str]
    assigned_to_name: Optional[str]
    status: str
    priority: str
    due_date: Optional[str]
    tags: List[str]
    created_at: str
    updated_at: str
    completed_at: Optional[str]


# ============ MEETING MODELS ============

@dataclass
class MeetingCreate:
    project_id: str
    title: str
    description: str = ""
    meeting_type: str = "other"
    scheduled_at: str = ""
    duration_minutes: int = 60
    participants: List[str] = field(default_factory=list)  # user_ids
    agenda: List[str] = field(default_factory=list)
    meeting_url: Optional[str] = None  # Custom meeting URL (Zoom, Google Meet, etc.)
    auto_generate_room: bool = True  # Auto-generate Jitsi room


@dataclass
class MeetingUpdate:
    title: Optional[str] = None
    description: Optional[str] = None
    meeting_type: Optional[str] = None
    scheduled_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    participants: Optional[List[str]] = None
    agenda: Optional[List[str]] = None
    notes: Optional[str] = None
    action_items: Optional[List[str]] = None
    meeting_url: Optional[str] = None
    meeting_status: Optional[str] = None  # scheduled, in_progress, completed, cancelled


@dataclass
class MeetingResponse:
    id: str
    project_id: str
    title: str
    description: str
    meeting_type: str
    scheduled_at: str
    duration_minutes: int
    created_by: str
    created_by_name: str
    participants: List[Dict[str, Any]]
    agenda: List[str]
    notes: Optional[str]
    action_items: List[str]
    created_at: str
    updated_at: str
    meeting_url: Optional[str] = None
    meeting_status: str = "scheduled"  # scheduled, in_progress, completed, cancelled
    call_id: Optional[str] = None  # Link to call if meeting was held via call


# ============ PROJECT SETTINGS MODELS ============

@dataclass
class ProjectSettingsUpdate:
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None  # public, private
    allow_applications: Optional[bool] = None
    team_size_limit: Optional[int] = None
    required_skills: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[str] = None


@dataclass
class ProjectSettingsResponse:
    id: str
    title: str
    description: str
    status: str
    visibility: str
    allow_applications: bool
    team_size_limit: int
    current_team_size: int
    required_skills: List[str]
    tags: List[str]
    category: str
    difficulty: str
    duration: str
    owner_id: str
    created_at: str
    updated_at: str


# ============ ANALYTICS MODELS ============

@dataclass
class ProjectAnalytics:
    project_id: str
    total_tasks: int
    tasks_by_status: Dict[str, int]
    tasks_by_priority: Dict[str, int]
    completed_tasks: int
    overdue_tasks: int
    total_meetings: int
    meetings_by_type: Dict[str, int]
    total_messages: int
    total_calls: int
    team_activity: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


@dataclass
class MeetingAnalytics:
    project_id: str
    total_meetings: int
    total_duration_minutes: int
    average_duration_minutes: float
    meetings_by_type: Dict[str, int]
    attendance_rate: float
    recent_meetings: List[Dict[str, Any]]
    upcoming_meetings: List[Dict[str, Any]]


# ============ UTILITY FUNCTIONS ============

def calculate_task_completion_rate(total: int, completed: int) -> float:
    """Calculate task completion percentage"""
    if total == 0:
        return 0.0
    return round((completed / total) * 100, 2)


def is_task_overdue(due_date: Optional[str]) -> bool:
    """Check if task is overdue"""
    if not due_date:
        return False
    try:
        due = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        return datetime.now(due.tzinfo) > due
    except:
        return False


def format_duration(minutes: int) -> str:
    """Format duration in minutes to human readable"""
    if minutes < 60:
        return f"{minutes}m"
    hours = minutes // 60
    mins = minutes % 60
    if mins == 0:
        return f"{hours}h"
    return f"{hours}h {mins}m"

