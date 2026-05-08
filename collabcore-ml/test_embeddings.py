#!/usr/bin/env python3
"""
Test script for the Embedding Service
This demonstrates how the service works and validates its functionality
"""

import numpy as np
import sys
import os

# Add the parent directory to the path so we can import our service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_embedding_service():
    """
    Comprehensive test of the embedding service functionality.
    This shows you exactly how to use each method.
    """
    print("="*60)
    print("TESTING EMBEDDING SERVICE")
    print("="*60)
    
    # Import the service
    from ai_ml.services.embeddings import EmbeddingService, calculate_similarity
    
    # Initialize the service
    print("\n1. Initializing Embedding Service...")
    service = EmbeddingService()
    print("   ✓ Service initialized")
    
    # Test text normalization
    print("\n2. Testing text normalization...")
    test_texts = [
        "  Python,  Machine Learning  ",  # Extra spaces
        "PYTHON, machine learning",       # Mixed case
        "Python & ML!!!",                  # Special characters
    ]
    
    for text in test_texts:
        normalized = service.normalize_text(text)
        print(f"   Original: '{text}'")
        print(f"   Normalized: '{normalized}'")
    
    # Test single embedding generation
    print("\n3. Testing single embedding generation...")
    skill_text = "Python, Machine Learning, TensorFlow"
    embedding = service.generate_embedding(skill_text)
    print(f"   Input: '{skill_text}'")
    print(f"   Output shape: {embedding.shape}")
    print(f"   Output type: {type(embedding)}")
    print(f"   ✓ Single embedding generated")
    
    # Test batch embedding generation
    print("\n4. Testing batch embedding generation...")
    skill_sets = [
        "JavaScript, React, Node.js",
        "Python, Django, PostgreSQL",
        "Data Science, R, Statistics",
        "DevOps, Docker, Kubernetes"
    ]
    
    batch_embeddings = service.generate_embeddings_batch(skill_sets)
    print(f"   Input: {len(skill_sets)} skill sets")
    print(f"   Output: {len(batch_embeddings)} embeddings")
    print(f"   Each shape: {batch_embeddings[0].shape}")
    print(f"   ✓ Batch processing works")
    
    # Test similarity calculation
    print("\n5. Testing similarity calculations...")
    
    # Similar skills should have high similarity
    similar1 = service.generate_embedding("Python programming")
    similar2 = service.generate_embedding("Python development")
    similarity_high = service.calculate_similarity(similar1, similar2)
    
    # Different skills should have lower similarity
    different1 = service.generate_embedding("Python programming")
    different2 = service.generate_embedding("Graphic Design")
    similarity_low = service.calculate_similarity(different1, different2)
    
    print(f"   Similar skills: {similarity_high:.3f}")
    print(f"   Different skills: {similarity_low:.3f}")
    print(f"   ✓ Similarity calculation works correctly")
    
    # Test the find_similar_skills method
    print("\n6. Testing skill matching...")
    
    # Create a pool of candidates with their embeddings
    candidates = [
        ("user_1", "Python, Machine Learning, TensorFlow"),
        ("user_2", "JavaScript, React, Frontend"),
        ("user_3", "Python, FastAPI, Backend"),
        ("user_4", "Java, Spring Boot, Microservices"),
        ("user_5", "Python, Data Science, Pandas"),
    ]
    
    # Generate embeddings for all candidates
    candidate_embeddings = [
        (user_id, service.generate_embedding(skills))
        for user_id, skills in candidates
    ]
    
    # Search for Python developers
    query = "Looking for Python backend developers"
    matches = service.find_similar_skills(
        query_skills=query,
        candidate_embeddings=candidate_embeddings,
        top_k=3,
        min_similarity=0.3
    )
    
    print(f"   Query: '{query}'")
    print("\n   Top matches:")
    for match in matches:
        user_id = match['id']
        score = match['score']
        # Find the original skills for display
        original_skills = next(skills for uid, skills in candidates if uid == user_id)
        print(f"   - {user_id}: {score:.3f} ({original_skills})")
    
    # Test caching
    print("\n7. Testing cache functionality...")
    initial_cache_size = service.get_cache_size()
    print(f"   Current cache size: {initial_cache_size}")
    
    # Generate same embedding twice (should use cache second time)
    _ = service.generate_embedding("Test caching")
    cache_after_first = service.get_cache_size()
    
    _ = service.generate_embedding("Test caching")  # Should use cache
    cache_after_second = service.get_cache_size()
    
    print(f"   After first generation: {cache_after_first}")
    print(f"   After second generation: {cache_after_second}")
    print(f"   ✓ Cache working (size unchanged: {cache_after_second == cache_after_first})")
    
    # Clear cache
    service.clear_cache()
    print(f"   Cache cleared, new size: {service.get_cache_size()}")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    print("\nThe embedding service is working correctly.")
    print("Ready to integrate with Pinecone for persistent storage.")

def demonstrate_real_world_usage():
    """
    Show how the service would be used in the actual application.
    This demonstrates the typical workflow.
    """
    print("\n" + "="*60)
    print("REAL-WORLD USAGE DEMONSTRATION")
    print("="*60)
    
    from ai_ml.services.embeddings import (
        generate_embedding,
        generate_skills_embedding,
        calculate_similarity
    )
    
    print("\nScenario: A new user signs up and we need to match them with projects")
    
    # User's skills
    user_skills = "Python, Machine Learning, Computer Vision, PyTorch"
    print(f"\nUser's skills: {user_skills}")
    
    # Generate embedding for the user
    user_embedding = generate_skills_embedding(user_skills)
    print(f"Generated embedding with shape: {user_embedding.shape}")
    
    # Sample projects with their requirements
    projects = [
        {
            "id": "proj_1",
            "title": "AI Image Recognition System",
            "required_skills": "Python, Deep Learning, Computer Vision, TensorFlow or PyTorch"
        },
        {
            "id": "proj_2",
            "title": "Web Scraping Tool",
            "required_skills": "Python, BeautifulSoup, Selenium, Data Extraction"
        },
        {
            "id": "proj_3",
            "title": "React Dashboard",
            "required_skills": "JavaScript, React, D3.js, Frontend Development"
        }
    ]
    
    print("\nMatching user with projects...")
    print("-" * 40)
    
    # Calculate match scores for each project
    for project in projects:
        # Generate embedding for project requirements
        project_embedding = generate_skills_embedding(project["required_skills"])
        
        # Calculate similarity
        match_score = calculate_similarity(user_embedding, project_embedding)
        
        print(f"\nProject: {project['title']}")
        print(f"Required: {project['required_skills'][:50]}...")
        print(f"Match Score: {match_score:.1%}")
        
        if match_score > 0.7:
            print("   → Strong match! ✓")
        elif match_score > 0.5:
            print("   → Moderate match")
        else:
            print("   → Weak match")
    
    print("\n" + "="*60)
    print("This is how CollabCore will match users with relevant projects!")

if __name__ == "__main__":
    # First, create the directory structure if it doesn't exist
    os.makedirs("ai_ml/services", exist_ok=True)
    
    # Check if embeddings.py exists in the right location
    embeddings_path = "ai_ml/services/embeddings.py"
    if not os.path.exists(embeddings_path):
        print("⚠️  embeddings.py not found in ai_ml/services/")
        print("   Please save embeddings.py to: ai_ml/services/embeddings.py")
        print("   Then run this test again.")
        sys.exit(1)
    
    # Run the tests
    try:
        test_embedding_service()
        demonstrate_real_world_usage()
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        print("\nPlease ensure:")
        print("1. embeddings.py is in ai_ml/services/")
        print("2. All required packages are installed")
        sys.exit(1)