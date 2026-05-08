"""
GitHub API integration service
"""

import requests
from typing import List, Optional, Dict, Any
from datetime import datetime
from vcs_models import (
    CommitResponse, CommitAuthor, CommitListResponse,
    PullRequestResponse, PullRequestAuthor, PullRequestListResponse,
    RepositoryStats
)


class GitHubService:
    """Service for interacting with GitHub API"""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token
        self.headers = {
            "Accept": "application/vnd.github.v3+json"
        }
        if access_token:
            self.headers["Authorization"] = f"token {access_token}"
    
    def parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """Parse GitHub repo URL to extract owner and repo name"""
        # Handle various URL formats
        # https://github.com/owner/repo
        # https://github.com/owner/repo.git
        # git@github.com:owner/repo.git
        
        if repo_url.startswith("git@github.com:"):
            repo_url = repo_url.replace("git@github.com:", "")
        elif "github.com/" in repo_url:
            repo_url = repo_url.split("github.com/")[1]
        
        repo_url = repo_url.replace(".git", "")
        parts = repo_url.split("/")
        
        if len(parts) >= 2:
            return parts[0], parts[1]
        raise ValueError("Invalid GitHub repository URL")
    
    def get_commits(
        self, 
        owner: str, 
        repo: str, 
        branch: str = "main",
        page: int = 1,
        per_page: int = 30
    ) -> CommitListResponse:
        """Fetch commits from repository"""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/commits"
        params = {
            "sha": branch,
            "page": page,
            "per_page": per_page
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            commits_data = response.json()
            commits = []
            
            for commit_data in commits_data:
                commit = commit_data.get("commit", {})
                author_data = commit.get("author", {})
                author_info = commit_data.get("author", {})
                
                commits.append(CommitResponse(
                    sha=commit_data.get("sha", ""),
                    message=commit.get("message", ""),
                    author=CommitAuthor(
                        name=author_data.get("name", "Unknown"),
                        email=author_data.get("email", ""),
                        avatar_url=author_info.get("avatar_url") if author_info else None
                    ),
                    committed_at=author_data.get("date", ""),
                    url=commit_data.get("html_url", ""),
                    additions=0,  # Would need separate API call for stats
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
        owner: str,
        repo: str,
        state: str = "all",  # open, closed, all
        page: int = 1,
        per_page: int = 30
    ) -> PullRequestListResponse:
        """Fetch pull requests from repository"""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/pulls"
        params = {
            "state": state,
            "page": page,
            "per_page": per_page,
            "sort": "updated",
            "direction": "desc"
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            prs_data = response.json()
            pull_requests = []
            
            for pr_data in prs_data:
                user_data = pr_data.get("user", {})
                
                pull_requests.append(PullRequestResponse(
                    number=pr_data.get("number", 0),
                    title=pr_data.get("title", ""),
                    description=pr_data.get("body", ""),
                    state=pr_data.get("state", "open"),
                    author=PullRequestAuthor(
                        username=user_data.get("login", "Unknown"),
                        url=user_data.get("html_url", ""),
                        avatar_url=user_data.get("avatar_url")
                    ),
                    created_at=pr_data.get("created_at", ""),
                    updated_at=pr_data.get("updated_at", ""),
                    merged_at=pr_data.get("merged_at"),
                    url=pr_data.get("html_url", ""),
                    source_branch=pr_data.get("head", {}).get("ref", ""),
                    target_branch=pr_data.get("base", {}).get("ref", ""),
                    additions=pr_data.get("additions", 0),
                    deletions=pr_data.get("deletions", 0),
                    changed_files=pr_data.get("changed_files", 0),
                    comments_count=pr_data.get("comments", 0)
                ))
            
            return PullRequestListResponse(
                pull_requests=pull_requests,
                total=len(pull_requests),
                page=page,
                per_page=per_page
            )
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch pull requests: {str(e)}")
    
    def get_repository_stats(self, owner: str, repo: str) -> RepositoryStats:
        """Fetch repository statistics"""
        try:
            # Get repository info
            repo_url = f"{self.BASE_URL}/repos/{owner}/{repo}"
            repo_response = requests.get(repo_url, headers=self.headers)
            repo_response.raise_for_status()
            repo_data = repo_response.json()
            
            # Get languages
            languages_url = f"{self.BASE_URL}/repos/{owner}/{repo}/languages"
            languages_response = requests.get(languages_url, headers=self.headers)
            languages_response.raise_for_status()
            languages = languages_response.json()
            
            # Get pull requests count
            prs_url = f"{self.BASE_URL}/repos/{owner}/{repo}/pulls"
            open_prs = requests.get(prs_url, headers=self.headers, params={"state": "open"})
            closed_prs = requests.get(prs_url, headers=self.headers, params={"state": "closed"})
            
            return RepositoryStats(
                total_commits=0,  # GitHub doesn't provide easy way to get total commits
                total_contributors=repo_data.get("network_count", 0),
                open_pull_requests=len(open_prs.json()) if open_prs.ok else 0,
                closed_pull_requests=len(closed_prs.json()) if closed_prs.ok else 0,
                merged_pull_requests=0,  # Would need to iterate through closed PRs
                languages=languages,
                last_commit_date=repo_data.get("pushed_at")
            )
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch repository stats: {str(e)}")
    
    def verify_repository(self, owner: str, repo: str) -> bool:
        """Verify if repository exists and is accessible"""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}"
        try:
            response = requests.get(url, headers=self.headers)
            return response.status_code == 200
        except:
            return False

