"""
CollabCore Embedding Service
This module handles all text-to-vector conversions for semantic matching.
It's the bridge between human-readable skills and mathematical representations.
"""

import re
import numpy as np
from typing import List, Dict, Union, Optional, Tuple
from sentence_transformers import SentenceTransformer
import logging

# Configure logging to track what's happening
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Core service for generating embeddings from skill descriptions.
    This class manages the ML model and provides methods to convert
    text into vectors for semantic comparison.
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the embedding service with a specific model.
        
        The model is loaded once and reused for all embeddings to improve
        performance. Think of this like keeping a translator on standby
        rather than hiring a new one for each sentence.
        
        Args:
            model_name: The sentence transformer model to use.
                       Default is 'all-MiniLM-L6-v2' which provides
                       a good balance of speed and accuracy.
        """
        logger.info(f"Initializing EmbeddingService with model: {model_name}")
        
        # Load the model once and keep it in memory
        self.model = SentenceTransformer(model_name)
        self.embedding_dimension = 384  # Specific to our chosen model
        
        # Cache for frequently used embeddings to improve performance
        # This acts like a dictionary of pre-translated phrases
        self._embedding_cache = {}
        
        logger.info("EmbeddingService initialized successfully")
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize text for consistent embedding generation.
        
        This ensures that minor variations in formatting don't create
        different embeddings. For example, "Python, ML" and "python,ml"
        should be treated similarly.
        
        Args:
            text: Raw text to normalize
            
        Returns:
            Normalized text ready for embedding
        """
        # Convert to lowercase for consistency
        text = text.lower()
        
        # Replace multiple spaces/tabs with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep spaces and alphanumeric
        # We keep commas as they often separate skills
        text = re.sub(r'[^\w\s,]', '', text)
        
        # Trim whitespace from beginning and end
        text = text.strip()
        
        return text
    
    def generate_embedding(self, text: str, use_cache: bool = True) -> np.ndarray:
        """
        Generate a single embedding from text.
        
        This is the core function that converts text to a vector.
        The resulting vector captures the semantic meaning of the text
        in a way that similar meanings produce similar vectors.
        
        Args:
            text: The text to embed (e.g., "Python, Machine Learning")
            use_cache: Whether to use cached embeddings for performance
            
        Returns:
            A 384-dimensional numpy array representing the text
        """
        # Normalize the text first
        normalized_text = self.normalize_text(text)
        
        # Check if we've already computed this embedding
        if use_cache and normalized_text in self._embedding_cache:
            logger.debug(f"Using cached embedding for: {normalized_text[:50]}...")
            return self._embedding_cache[normalized_text]
        
        # Generate the embedding
        # The model converts text into a dense vector representation
        embedding = self.model.encode(normalized_text)
        
        # Ensure it's a numpy array (for consistency)
        if not isinstance(embedding, np.ndarray):
            embedding = np.array(embedding)
        
        # Cache the result for future use
        if use_cache:
            self._embedding_cache[normalized_text] = embedding
        
        return embedding
    
    def generate_embeddings_batch(self, 
                                  texts: List[str], 
                                  batch_size: int = 32) -> List[np.ndarray]:
        """
        Generate embeddings for multiple texts efficiently.
        
        Processing texts in batches is much faster than one at a time,
        similar to how cooking multiple items in one oven is more efficient
        than heating the oven separately for each item.
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts to process at once
                       (larger = faster but uses more memory)
            
        Returns:
            List of embeddings corresponding to input texts
        """
        if not texts:
            return []
        
        logger.info(f"Generating embeddings for {len(texts)} texts in batches of {batch_size}")
        
        # Normalize all texts first
        normalized_texts = [self.normalize_text(text) for text in texts]
        
        # Process in batches for efficiency
        all_embeddings = []
        
        for i in range(0, len(normalized_texts), batch_size):
            batch = normalized_texts[i:i + batch_size]
            
            # The model can process multiple texts at once
            batch_embeddings = self.model.encode(batch)
            
            # Convert to list of numpy arrays for consistency
            for embedding in batch_embeddings:
                all_embeddings.append(np.array(embedding))
        
        logger.info(f"Generated {len(all_embeddings)} embeddings successfully")
        return all_embeddings
    
    def extract_skills_embedding(self, skills_list: Union[str, List[str]]) -> np.ndarray:
        """
        Generate embedding specifically for a skills list.
        
        This method handles the common use case of converting user skills
        or project requirements into an embedding. It can accept either
        a comma-separated string or a list of skills.
        
        Args:
            skills_list: Either a string like "Python, ML, Docker"
                        or a list like ["Python", "ML", "Docker"]
            
        Returns:
            Embedding representing the combined skills
        """
        # Convert list to string if necessary
        if isinstance(skills_list, list):
            skills_text = ", ".join(skills_list)
        else:
            skills_text = skills_list
        
        # Handle empty skills
        if not skills_text or skills_text.strip() == "":
            logger.warning("Empty skills list provided, returning zero vector")
            return np.zeros(self.embedding_dimension)
        
        # Generate and return the embedding
        return self.generate_embedding(skills_text)
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings.
        
        Cosine similarity measures the angle between two vectors.
        A value of 1 means identical, 0 means perpendicular (unrelated),
        and -1 means opposite. In practice, text embeddings usually
        range from 0.2 (somewhat related) to 0.9 (very similar).
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between -1 and 1
        """
        # Ensure inputs are numpy arrays
        embedding1 = np.array(embedding1)
        embedding2 = np.array(embedding2)
        
        # Calculate cosine similarity: dot product divided by magnitude product
        dot_product = np.dot(embedding1, embedding2)
        magnitude1 = np.linalg.norm(embedding1)
        magnitude2 = np.linalg.norm(embedding2)
        
        # Avoid division by zero
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        similarity = dot_product / (magnitude1 * magnitude2)
        
        # Ensure result is in valid range (floating point errors can cause issues)
        return float(np.clip(similarity, -1.0, 1.0))
    
    def find_similar_skills(self, 
                           query_skills: str,
                           candidate_embeddings: List[Tuple[str, np.ndarray]],
                           top_k: int = 5,
                           min_similarity: float = 0.3) -> List[Dict]:
        """
        Find the most similar skills from a list of candidates.
        
        This method demonstrates how semantic search works: it compares
        a query against multiple candidates and returns the best matches.
        This is what happens when searching for users with relevant skills.
        
        Args:
            query_skills: The skills to search for
            candidate_embeddings: List of (identifier, embedding) tuples
            top_k: Number of top results to return
            min_similarity: Minimum similarity score to include
            
        Returns:
            List of matches with scores, sorted by relevance
        """
        # Generate embedding for the query
        query_embedding = self.extract_skills_embedding(query_skills)
        
        # Calculate similarity for each candidate
        similarities = []
        for identifier, candidate_embedding in candidate_embeddings:
            score = self.calculate_similarity(query_embedding, candidate_embedding)
            
            # Only include results above minimum threshold
            if score >= min_similarity:
                similarities.append({
                    'id': identifier,
                    'score': score
                })
        
        # Sort by score (highest first) and limit to top_k
        similarities.sort(key=lambda x: x['score'], reverse=True)
        
        return similarities[:top_k]
    
    def clear_cache(self):
        """
        Clear the embedding cache to free memory.
        
        Use this if you're processing many unique texts and
        memory usage becomes a concern.
        """
        self._embedding_cache.clear()
        logger.info("Embedding cache cleared")
    
    def get_cache_size(self) -> int:
        """
        Get the current number of cached embeddings.
        
        Returns:
            Number of embeddings currently cached
        """
        return len(self._embedding_cache)


# Convenience functions for quick usage
# These allow using the service without creating a class instance

_default_service = None

def get_default_service() -> EmbeddingService:
    """
    Get or create the default embedding service instance.
    
    This follows the singleton pattern - we create one service
    and reuse it throughout the application for efficiency.
    """
    global _default_service
    if _default_service is None:
        _default_service = EmbeddingService()
    return _default_service

def generate_embedding(text: str) -> np.ndarray:
    """Quick function to generate a single embedding."""
    return get_default_service().generate_embedding(text)

def generate_skills_embedding(skills: Union[str, List[str]]) -> np.ndarray:
    """Quick function to generate embedding for skills."""
    return get_default_service().extract_skills_embedding(skills)

def calculate_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """Quick function to calculate similarity between embeddings."""
    return get_default_service().calculate_similarity(embedding1, embedding2)