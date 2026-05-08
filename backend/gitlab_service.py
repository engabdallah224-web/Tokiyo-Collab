"""
GitLab API integration service
"""

import requests
from typing import List, Optional
from urllib.parse import quote
from vcs_models import (
    CommitResponse, CommitAuthor, CommitListResponse,
    PullRequestResponse, PullRequestAuthor, PullRequestListResponse,
    RepositoryStats
)


class GitLabService:
    """Service for interacting with GitLab API"""
    
    BASE_URL = "https://gitlab.com/api/v4"
    
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token
        self.headers = {}
        if access_token:
            self.headers["PRIVATE-TOKEN"] = access_token
    
    def parse_repo_url(self, repo_url: str) -> str:
        """Parse GitLab repo URL to extract project path"""
        # Handle various URL formats
        # https://gitlab.com/owner/repo
        # https://gitlab.com/owner/group/repo
        # git@gitlab.com:owner/repo.git
        
        if repo_url.startswith("git@gitlab.com:"):
            repo_url = repo_url.replace("git@gitlab.com:", "")
        elif "gitlab.com/" in repo_url:
            repo_url = repo_url.split("gitlab.com/")[1]
        
        repo_url = repo_url.replace(".git", "")
        return repo_url
    
    def get_project_id(self, project_path: str) -> Optional[int]:
        """Get GitLab project ID from project path"""
        encoded_path = quote(project_path, safe='')
        url = f"{self.BASE_URL}/projects/{encoded_path}"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json().get("id")
        except:
            return None
    
    def get_commits(
        self,
        project_path: str,
        branch: str = "main",
        page: int = 1,
        per_page: int = 30
    ) -> CommitListResponse:
        """Fetch commits from repository"""
        project_id = self.get_project_id(project_path)
        if not project_id:
            raise Exception("Project not found")
        
        url = f"{self.BASE_URL}/projects/{project_id}/repository/commits"
        params = {
            "ref_name": branch,
            "page": page,
            "per_page": per_page
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            commits_data = response.json()
            commits = []
            
            for commit_data in commits_data:
                commits.append(CommitResponse(
                    sha=commit_data.get("id", ""),
                    message=commit_data.get("message", ""),
                    author=CommitAuthor(
                        name=commit_data.get("author_name", "Unknown"),
                        email=commit_data.get("author_email", ""),
                        avatar_url=None
                    ),
                    committed_at=commit_data.get("committed_date", ""),
                    url=commit_data.get("web_url", ""),
                    additions=0,
                    deletions=0,
                    changed_files=0
                ))
            
            return CommitListResponse(
                commits=commits,
                total=len(commits),
                page=page,
                per_page=per_page
            )
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch commits: {str(e)}")
    
    def get_pull_requests(
        self,
        project_path: str,
        state: str = "all",  # opened, closed, merged, all
        page: int = 1,
        per_page: int = 30
    ) -> PullRequestListResponse:
        """Fetch merge requests (PRs) from repository"""
        project_id = self.get_project_id(project_path)
        if not project_id:
            raise Exception("Project not found")
        
        url = f"{self.BASE_URL}/projects/{project_id}/merge_requests"
        params = {
            "page": page,
            "per_page": per_page,
            "order_by": "updated_at",
            "sort": "desc"
        }
        
        if state != "all":
            params["state"] = state
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            mrs_data = response.json()
            pull_requests = []
            
            for mr_data in mrs_data:
                author_data = mr_data.get("author", {})
                
                # Map GitLab state to standard state
                gitlab_state = mr_data.get("state", "opened")
                if gitlab_state == "merged":
                    state = "merged"
                elif gitlab_state == "opened":
                    state = "open"
                else:
                    state = "closed"
                
                pull_requests.append(PullRequestResponse(
                    number=mr_data.get("iid", 0),
                    title=mr_data.get("title", ""),
                    description=mr_data.get("description", ""),
                    state=state,
                    author=PullRequestAuthor(
                        username=author_data.get("username", "Unknown"),
                        url=author_data.get("web_url", ""),
                        avatar_url=author_data.get("avatar_url")
                    ),
                    created_at=mr_data.get("created_at", ""),
                    updated_at=mr_data.get("updated_at", ""),
                    merged_at=mr_data.get("merged_at"),
                    url=mr_data.get("web_url", ""),
                    source_branch=mr_data.get("source_branch", ""),
                    target_branch=mr_data.get("target_branch", ""),
                    additions=0,
                    deletions=0,
                    changed_files=mr_data.get("changes_count", 0),
                    comments_count=mr_data.get("user_notes_count", 0)
                ))
            
            return PullRequestListResponse(
                pull_requests=pull_requests,
                total=len(pull_requests),
                page=page,
                per_page=per_page
            )
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch merge requests: {str(e)}")
    
    def get_repository_stats(self, project_path: str) -> RepositoryStats:
        """Fetch repository statistics"""
        project_id = self.get_project_id(project_path)
        if not project_id:
            raise Exception("Project not found")
        
        try:
            # Get project info
            project_url = f"{self.BASE_URL}/projects/{project_id}"
            project_response = requests.get(project_url, headers=self.headers)
            project_response.raise_for_status()
            project_data = project_response.json()
            
            # Get languages
            languages_url = f"{self.BASE_URL}/projects/{project_id}/languages"
            languages_response = requests.get(languages_url, headers=self.headers)
            languages = languages_response.json() if languages_response.ok else {}
            
            return RepositoryStats(
                total_commits=0,
                total_contributors=0,
                open_pull_requests=project_data.get("open_merge_requests_count", 0),
                closed_pull_requests=0,
                merged_pull_requests=0,
                languages=languages,
                last_commit_date=project_data.get("last_activity_at")
            )
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch repository stats: {str(e)}")
    
    def verify_repository(self, project_path: str) -> bool:
        """Verify if repository exists and is accessible"""
        project_id = self.get_project_id(project_path)
        return project_id is not None

