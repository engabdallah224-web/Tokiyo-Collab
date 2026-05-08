"""
Call-related data models for WebRTC functionality
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class CallType(str, Enum):
    VIDEO = "video"
    VOICE = "voice"


class CallStatus(str, Enum):
    INITIATING = "initiating"
    RINGING = "ringing"
    ACTIVE = "active"
    ENDED = "ended"
    DECLINED = "declined"
    MISSED = "missed"


class CallDirection(str, Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"


@dataclass
class CallCreate:
    """Data for creating a new call"""
    caller_id: str
    callee_id: str
    project_id: Optional[str] = None
    type: CallType = CallType.VIDEO
    direction: CallDirection = CallDirection.OUTGOING


@dataclass
class CallUpdate:
    """Data for updating an existing call"""
    status: Optional[CallStatus] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration: Optional[int] = None
    webrtc_offer: Optional[Dict[str, Any]] = None
    webrtc_answer: Optional[Dict[str, Any]] = None
    ice_candidates: Optional[List[Dict[str, Any]]] = None


@dataclass
class CallResponse:
    """Response model for call data"""
    id: str
    caller_id: str
    caller: Dict[str, Any]
    callee_id: str
    callee: Dict[str, Any]
    project_id: Optional[str]
    type: CallType
    status: CallStatus
    direction: CallDirection
    start_time: Optional[str]
    end_time: Optional[str]
    duration: int
    webrtc_offer: Optional[Dict[str, Any]]
    webrtc_answer: Optional[Dict[str, Any]]
    ice_candidates: List[Dict[str, Any]]
    created_at: str
    updated_at: str


@dataclass
class WebRTCOffer:
    """WebRTC offer data"""
    type: str
    sdp: str
    ice_candidates: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class WebRTCAnswer:
    """WebRTC answer data"""
    type: str
    sdp: str
    ice_candidates: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class IceCandidate:
    """ICE candidate data"""
    candidate: str
    sdp_mid: Optional[str]
    sdp_mline_index: Optional[int]


@dataclass
class CallSignal:
    """Call signaling data for WebRTC"""
    call_id: str
    signal_type: str  # 'offer', 'answer', 'ice_candidate'
    data: Dict[str, Any]
    timestamp: str


@dataclass
class CallHistoryResponse:
    """Response for call history"""
    calls: List[CallResponse]
    total: int
    page: int
    limit: int
    has_more: bool


@dataclass
class CallStats:
    """Call statistics"""
    total_calls: int
    video_calls: int
    voice_calls: int
    total_duration: int
    average_duration: float
    calls_today: int
    calls_this_week: int
    calls_this_month: int


@dataclass
class CallNotification:
    """Call notification data"""
    call_id: str
    user_id: str
    type: str  # 'incoming_call', 'call_ended', 'call_missed'
    title: str
    message: str
    data: Dict[str, Any]
    timestamp: str


# Utility functions for call models
def calculate_call_duration(start_time: str, end_time: str) -> int:
    """Calculate call duration in seconds"""
    if not start_time or not end_time:
        return 0
    
    try:
        start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        duration = (end - start).total_seconds()
        return max(0, int(duration))
    except (ValueError, TypeError):
        return 0


def format_call_duration(seconds: int) -> str:
    """Format call duration as MM:SS"""
    minutes = seconds // 60
    remaining_seconds = seconds % 60
    return f"{minutes:02d}:{remaining_seconds:02d}"


def is_call_active(status: CallStatus) -> bool:
    """Check if call is currently active"""
    return status == CallStatus.ACTIVE


def is_call_ended(status: CallStatus) -> bool:
    """Check if call has ended"""
    return status in [CallStatus.ENDED, CallStatus.DECLINED, CallStatus.MISSED]


def get_call_status_display(status: CallStatus) -> str:
    """Get human-readable call status"""
    status_map = {
        CallStatus.INITIATING: "Initiating",
        CallStatus.RINGING: "Ringing",
        CallStatus.ACTIVE: "Active",
        CallStatus.ENDED: "Ended",
        CallStatus.DECLINED: "Declined",
        CallStatus.MISSED: "Missed"
    }
    return status_map.get(status, "Unknown")


def get_call_type_display(call_type: CallType) -> str:
    """Get human-readable call type"""
    type_map = {
        CallType.VIDEO: "Video Call",
        CallType.VOICE: "Voice Call"
    }
    return type_map.get(call_type, "Unknown")
