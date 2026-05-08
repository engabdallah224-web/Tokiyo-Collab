"""
CollabCore Semantic Search Service
This module integrates embeddings with Pinecone to provide persistent,
scalable semantic search capabilities for skill matching.
"""

import os
import time
import json
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
from dotenv import load_dotenv
import numpy as np
from pinecone import Pinecone
import logging

# Import our embedding service
from ai_ml.services.embeddings import EmbeddingService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SemanticSearchService:
    """
    Service for managing and searching skill embeddings in Pinecone.
    
    This class provides the bridge between your application's skill data
    and the vector database. It handles storing, updating, and searching
    for users and projects based on semantic similarity of skills.
    """
    
    def __init__(self, index_name: str = "collabcore-skills"):
        """
        Initialize the semantic search service.
        
        This sets up connections to both the embedding model and Pinecone,
        creating a complete pipeline from text to searchable vectors.
        
        Args:
            index_name: Name of the Pinecone index to use
        """
        # Initialize embedding service
        logger.info("Initializing Semantic Search Service...")
        self.embedding_service = EmbeddingService()
        
        # Initialize Pinecone
        api_key = os.getenv('PINECONE_API_KEY')
        if not api_key:
            raise ValueError("Pinecone API key not found in environment variables")
        
        self.pc = Pinecone(api_key=api_key)
        self.index = self.pc.Index(index_name)
        self.index_name = index_name
        
        # Namespaces to separate different types of data
        # Think of these as different sections in our library
        self.USER_NAMESPACE = "users"
        self.PROJECT_NAMESPACE = "projects"
        
        logger.info(f"Connected to Pinecone index: {index_name}")
    
    def create_user_embedding(self, 
                             user_id: str,
                             name: str,
                             skills: str,
                             additional_metadata: Optional[Dict] = None) -> Dict:
        """
        Create and store embedding for a user's skills in Pinecone.
        
        When a user signs up or completes their profile, this method
        converts their skills into a searchable vector and stores it
        with their information. It's like creating a catalog card for
        a new library book.
        
        Args:
            user_id: Unique identifier for the user
            name: User's display name
            skills: Comma-separated string of user's skills
            additional_metadata: Optional extra information to store
            
        Returns:
            Dictionary with operation status and details
        """
        try:
            logger.info(f"Creating embedding for user: {user_id}")
            
            # Generate embedding for the user's skills
            # This converts "Python, ML, Docker" into a 384-dimensional vector
            embedding = self.embedding_service.extract_skills_embedding(skills)
            
            # Prepare metadata to store alongside the vector
            # This is the information we'll get back when searching
            metadata = {
                "user_id": user_id,
                "name": name,
                "skills": skills,
                "type": "user",  # Helps identify what kind of entry this is
                "created_at": datetime.now().isoformat(),
                "skills_list": [s.strip() for s in skills.split(',')]  # Array for filtering
            }
            
            # Add any additional metadata provided
            if additional_metadata:
                metadata.update(additional_metadata)
            
            # Create vector entry for Pinecone
            vector_entry = {
                "id": f"user_{user_id}",  # Unique ID in Pinecone
                "values": embedding.tolist(),  # The actual vector
                "metadata": metadata  # Associated information
            }
            
            # Store in Pinecone with user namespace
            # Namespaces help organize different types of vectors
            self.index.upsert(
                vectors=[vector_entry],
                namespace=self.USER_NAMESPACE
            )
            
            logger.info(f"Successfully created embedding for user {user_id}")
            
            return {
                "success": True,
                "user_id": user_id,
                "message": "User embedding created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating user embedding: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to create user embedding"
            }
    
    def update_user_embedding(self,
                            user_id: str,
                            name: Optional[str] = None,
                            skills: Optional[str] = None,
                            additional_metadata: Optional[Dict] = None) -> Dict:
        """
        Update an existing user's embedding when their skills change.
        
        When users learn new skills or update their profile, this method
        updates their vector representation. It's like updating a library
        card when a book gets a new edition.
        
        Args:
            user_id: User's unique identifier
            name: Updated name (optional)
            skills: Updated skills (optional)
            additional_metadata: Updated metadata (optional)
            
        Returns:
            Dictionary with operation status
        """
        try:
            logger.info(f"Updating embedding for user: {user_id}")
            
            # Fetch existing user data from Pinecone
            fetch_response = self.index.fetch(
                ids=[f"user_{user_id}"],
                namespace=self.USER_NAMESPACE
            )
            
            if not fetch_response.vectors:
                return {
                    "success": False,
                    "message": f"User {user_id} not found"
                }
            
            # Get existing metadata
            existing_data = fetch_response.vectors[f"user_{user_id}"]
            existing_metadata = existing_data.metadata
            
            # Update metadata with new values
            if name:
                existing_metadata["name"] = name
            if additional_metadata:
                existing_metadata.update(additional_metadata)
            
            # If skills changed, generate new embedding
            if skills and skills != existing_metadata.get("skills"):
                embedding = self.embedding_service.extract_skills_embedding(skills)
                existing_metadata["skills"] = skills
                existing_metadata["skills_list"] = [s.strip() for s in skills.split(',')]
                existing_metadata["updated_at"] = datetime.now().isoformat()
                
                # Update vector with new embedding
                vector_entry = {
                    "id": f"user_{user_id}",
                    "values": embedding.tolist(),
                    "metadata": existing_metadata
                }
            else:
                # Just update metadata without changing embedding
                existing_metadata["updated_at"] = datetime.now().isoformat()
                vector_entry = {
                    "id": f"user_{user_id}",
                    "values": existing_data.values,  # Keep existing embedding
                    "metadata": existing_metadata
                }
            
            # Update in Pinecone
            self.index.upsert(
                vectors=[vector_entry],
                namespace=self.USER_NAMESPACE
            )
            
            logger.info(f"Successfully updated embedding for user {user_id}")
            
            return {
                "success": True,
                "user_id": user_id,
                "message": "User embedding updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error updating user embedding: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to update user embedding"
            }
    
    def search_matching_users(self,
                            required_skills: str,
                            top_k: int = 10,
                            min_score: float = 0.5,
                            exclude_users: Optional[List[str]] = None) -> List[Dict]:
        """
        Find users with skills matching the requirements.
        
        This is the core search function for finding team members.
        When a project needs "Python backend developer with FastAPI",
        this finds users whose skills semantically match, even if they
        don't use the exact same words.
        
        Args:
            required_skills: Skills to search for
            top_k: Maximum number of results to return
            min_score: Minimum similarity score (0-1)
            exclude_users: List of user IDs to exclude from results
            
        Returns:
            List of matching users with similarity scores
        """
        try:
            logger.info(f"Searching for users with skills: {required_skills[:50]}...")
            
            # Generate embedding for the required skills
            query_embedding = self.embedding_service.extract_skills_embedding(required_skills)
            
            # Prepare filter for excluded users if provided
            filter_dict = None
            if exclude_users:
                # Pinecone filter to exclude certain user IDs
                filter_dict = {
                    "user_id": {"$nin": exclude_users}
                }
            
            # Search Pinecone for similar vectors
            search_results = self.index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                namespace=self.USER_NAMESPACE,
                include_metadata=True,
                filter=filter_dict
            )
            
            # Process and format results
            matches = []
            for match in search_results.matches:
                # Only include results above minimum score
                if match.score >= min_score:
                    result = {
                        "user_id": match.metadata.get("user_id"),
                        "name": match.metadata.get("name"),
                        "skills": match.metadata.get("skills"),
                        "skills_list": match.metadata.get("skills_list", []),
                        "score": float(match.score),  # Similarity score
                        "match_percentage": f"{match.score * 100:.1f}%"
                    }
                    
                    # Add any additional metadata
                    for key, value in match.metadata.items():
                        if key not in result:
                            result[key] = value
                    
                    matches.append(result)
            
            logger.info(f"Found {len(matches)} matching users")
            
            return matches
            
        except Exception as e:
            logger.error(f"Error searching for users: {str(e)}")
            return []
    
    def search_matching_projects(self,
                                user_skills: str,
                                top_k: int = 10,
                                min_score: float = 0.5,
                                status_filter: Optional[str] = "open") -> List[Dict]:
        """
        Find projects that match a user's skills.
        
        This helps users discover relevant opportunities. It's like
        a personalized job board that understands skill relationships,
        not just keyword matches.
        
        Args:
            user_skills: User's skills to match against
            top_k: Maximum number of results
            min_score: Minimum similarity score
            status_filter: Filter by project status (e.g., "open")
            
        Returns:
            List of matching projects with scores
        """
        try:
            logger.info(f"Searching projects for skills: {user_skills[:50]}...")
            
            # Generate embedding for user's skills
            query_embedding = self.embedding_service.extract_skills_embedding(user_skills)
            
            # Prepare filter if status is specified
            filter_dict = None
            if status_filter:
                filter_dict = {"status": status_filter}
            
            # Search in projects namespace
            search_results = self.index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                namespace=self.PROJECT_NAMESPACE,
                include_metadata=True,
                filter=filter_dict
            )
            
            # Process results
            matches = []
            for match in search_results.matches:
                if match.score >= min_score:
                    result = {
                        "project_id": match.metadata.get("project_id"),
                        "title": match.metadata.get("title"),
                        "description": match.metadata.get("description"),
                        "required_skills": match.metadata.get("required_skills"),
                        "score": float(match.score),
                        "match_percentage": f"{match.score * 100:.1f}%",
                        "status": match.metadata.get("status", "unknown")
                    }
                    
                    # Include all metadata
                    for key, value in match.metadata.items():
                        if key not in result:
                            result[key] = value
                    
                    matches.append(result)
            
            logger.info(f"Found {len(matches)} matching projects")
            
            return matches
            
        except Exception as e:
            logger.error(f"Error searching for projects: {str(e)}")
            return []
    
    def create_project_embedding(self,
                                project_id: str,
                                title: str,
                                description: str,
                                required_skills: str,
                                additional_metadata: Optional[Dict] = None) -> Dict:
        """
        Create and store embedding for a project's requirements.
        
        When someone creates a new project, this stores its skill
        requirements in a searchable format, allowing the system
        to match it with qualified users.
        
        Args:
            project_id: Unique project identifier
            title: Project title
            description: Project description
            required_skills: Skills needed for the project
            additional_metadata: Extra project information
            
        Returns:
            Dictionary with operation status
        """
        try:
            logger.info(f"Creating embedding for project: {project_id}")
            
            # Combine description and skills for richer embedding
            # This gives the model more context about what the project needs
            combined_text = f"{title}. {description}. Required skills: {required_skills}"
            embedding = self.embedding_service.generate_embedding(combined_text)
            
            # Prepare metadata
            metadata = {
                "project_id": project_id,
                "title": title,
                "description": description,
                "required_skills": required_skills,
                "type": "project",
                "status": "open",  # Default status
                "created_at": datetime.now().isoformat(),
                "skills_list": [s.strip() for s in required_skills.split(',')]
            }
            
            if additional_metadata:
                metadata.update(additional_metadata)
            
            # Create vector entry
            vector_entry = {
                "id": f"project_{project_id}",
                "values": embedding.tolist(),
                "metadata": metadata
            }
            
            # Store in Pinecone
            self.index.upsert(
                vectors=[vector_entry],
                namespace=self.PROJECT_NAMESPACE
            )
            
            logger.info(f"Successfully created embedding for project {project_id}")
            
            return {
                "success": True,
                "project_id": project_id,
                "message": "Project embedding created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating project embedding: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to create project embedding"
            }
    
    def delete_user_embedding(self, user_id: str) -> Dict:
        """
        Remove a user's embedding from the index.
        
        Used when a user deletes their account or wants to be
        removed from the search system.
        
        Args:
            user_id: User to remove
            
        Returns:
            Status dictionary
        """
        try:
            self.index.delete(
                ids=[f"user_{user_id}"],
                namespace=self.USER_NAMESPACE
            )
            
            logger.info(f"Deleted embedding for user {user_id}")
            
            return {
                "success": True,
                "message": f"User {user_id} removed from search index"
            }
            
        except Exception as e:
            logger.error(f"Error deleting user embedding: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_index_stats(self) -> Dict:
        """
        Get statistics about the current state of the index.
        
        This provides insights into how many users and projects
        are indexed, helping monitor system growth and usage.
        
        Returns:
            Dictionary with index statistics
        """
        try:
            stats = self.index.describe_index_stats()
            
            return {
                "total_vectors": stats.total_vector_count,
                "dimensions": stats.dimension,
                "index_fullness": stats.index_fullness,
                "namespaces": stats.namespaces
            }
            
        except Exception as e:
            logger.error(f"Error getting index stats: {str(e)}")
            return {
                "error": str(e)
            }