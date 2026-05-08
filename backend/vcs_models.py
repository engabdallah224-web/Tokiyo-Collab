"""
Version Control System (VCS) models for GitHub/GitLab integration
"""

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


# ============ REPOSITORY MODELS ============

@dataclass
class RepositoryConnect:
    """Request model for connecting a repository"""
    provider: str  # github or gitlab
    repo_url: str
    access_token: Optional[str] = None  # Optional personal access token for private repos
    branch: str = "main"


@dataclass
class RepositoryUpdate:
    """Request model for updating repository settings"""
    branch: Optional[str] = None
    access_token: Optional[str] = None
    is_active: Optional[bool] = None


@dataclass
class RepositoryResponse:
    """Response model for repository"""
    id: str
    project_id: str
    provider: str  # github or gitlab
    repo_url: str
    repo_name: str
    repo_owner: str
    branch: str
    is_active: bool
    last_synced: Optional[str] = None
    connected_at: str = ""
    connected_by: str = ""


# ============ COMMIT MODELS ============

@dataclass
class CommitAuthor:
    """Commit author information"""
    name: str
    email: str
    avatar_url: Optional[str] = None


@dataclass
class CommitResponse:
    """Response model for commit"""
    sha: str
    message: str
    author: CommitAuthor
    committed_at: str
    url: str
    additions: int = 0
    deletions: int = 0
    changed_files: int = 0


@dataclass
class CommitListResponse:
    """Response model for list of commits"""
    commits: List[CommitResponse]
    total: int
    page: int
    per_page: int


# ============ PULL REQUEST MODELS ============

@dataclass
class PullRequestAuthor:
    """Pull request author information"""
    username: str
    url: str
    avatar_url: Optional[str] = None


@dataclass
class PullRequestResponse:
    """Response model for pull request"""
    number: int
    title: str
    description: str
    state: str  # open, closed, merged
    author: PullRequestAuthor
    created_at: str
    updated_at: str
    url: str
    source_branch: str
    target_branch: str
    merged_at: Optional[str] = None
    additions: int = 0
    deletions: int = 0
    changed_files: int = 0
    comments_count: int = 0


@dataclass
class PullRequestListResponse:
    """Response model for list of pull requests"""
    pull_requests: List[PullRequestResponse]
    total: int
    page: int
    per_page: int


# ============ REPOSITORY STATS ============

@dataclass
class RepositoryStats:
    """Repository statistics"""
    total_commits: int
    total_contributors: int
    open_pull_requests: int
    closed_pull_requests: int
    merged_pull_requests: int
    languages: dict  # {language: bytes}
    last_commit_date: Optional[str] = None

