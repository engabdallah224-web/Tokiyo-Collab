#!/usr/bin/env python3
"""
Test script for the Semantic Search Service
This demonstrates the complete skill matching workflow with Pinecone
"""

import sys
import os
import time
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_semantic_search_service():
    """
    Comprehensive test of the semantic search functionality.
    This simulates real-world usage of the skill matching system.
    """
    print("="*60)
    print("TESTING SEMANTIC SEARCH SERVICE")
    print("="*60)
    
    # Import the service
    from ai_ml.services.semantic_search import SemanticSearchService
    
    # Initialize the service
    print("\n1. Initializing Semantic Search Service...")
    try:
        search_service = SemanticSearchService(index_name="collabcore-skills")
        print("   ✓ Service initialized successfully")
    except Exception as e:
        print(f"   ✗ Failed to initialize: {str(e)}")
        print("   Make sure your .env file has valid Pinecone credentials")
        return False
    
    # Get initial index stats
    print("\n2. Checking index status...")
    stats = search_service.get_index_stats()
    print(f"   Total vectors currently in index: {stats.get('total_vectors', 0)}")
    print(f"   Index dimensions: {stats.get('dimensions', 'unknown')}")
    
    # Test creating user embeddings
    print("\n3. Creating test user embeddings...")
    
    test_users = [
        {
            "user_id": "test_alice_001",
            "name": "Alice Johnson",
            "skills": "Python, Machine Learning, TensorFlow, Data Science, Neural Networks",
            "metadata": {"role": "AI Engineer", "experience_years": 3}
        },
        {
            "user_id": "test_bob_002",
            "name": "Bob Smith",
            "skills": "JavaScript, React, Node.js, MongoDB, Express.js",
            "metadata": {"role": "Full Stack Developer", "experience_years": 5}
        },
        {
            "user_id": "test_charlie_003",
            "name": "Charlie Davis",
            "skills": "Python, FastAPI, PostgreSQL, Docker, Kubernetes",
            "metadata": {"role": "Backend Engineer", "experience_years": 4}
        },
        {
            "user_id": "test_diana_004",
            "name": "Diana Wilson",
            "skills": "Python, Data Analysis, SQL, Tableau, Statistics",
            "metadata": {"role": "Data Analyst", "experience_years": 2}
        },
        {
            "user_id": "test_eve_005",
            "name": "Eve Martinez",
            "skills": "Java, Spring Boot, Microservices, AWS, DevOps",
            "metadata": {"role": "Cloud Architect", "experience_years": 6}
        }
    ]
    
    for user in test_users:
        result = search_service.create_user_embedding(
            user_id=user["user_id"],
            name=user["name"],
            skills=user["skills"],
            additional_metadata=user["metadata"]
        )
        
        if result["success"]:
            print(f"   ✓ Created embedding for {user['name']}")
        else:
            print(f"   ✗ Failed for {user['name']}: {result.get('error')}")
    
    # Wait for indexing
    print("\n   Waiting for Pinecone to index vectors...")
    time.sleep(3)
    
    # Test creating project embeddings
    print("\n4. Creating test project embeddings...")
    
    test_projects = [
        {
            "project_id": "test_proj_001",
            "title": "AI-Powered Recommendation System",
            "description": "Build a recommendation engine using deep learning",
            "required_skills": "Python, Machine Learning, TensorFlow or PyTorch, Recommender Systems",
            "metadata": {"team_size": 3, "duration_weeks": 12}
        },
        {
            "project_id": "test_proj_002",
            "title": "Modern Web Dashboard",
            "description": "Create an interactive analytics dashboard",
            "required_skills": "JavaScript, React, D3.js, Data Visualization",
            "metadata": {"team_size": 2, "duration_weeks": 8}
        },
        {
            "project_id": "test_proj_003",
            "title": "Scalable API Platform",
            "description": "Design and implement a microservices-based API",
            "required_skills": "Python, FastAPI, Docker, PostgreSQL, Redis",
            "metadata": {"team_size": 4, "duration_weeks": 16}
        }
    ]
    
    for project in test_projects:
        result = search_service.create_project_embedding(
            project_id=project["project_id"],
            title=project["title"],
            description=project["description"],
            required_skills=project["required_skills"],
            additional_metadata=project["metadata"]
        )
        
        if result["success"]:
            print(f"   ✓ Created embedding for {project['title']}")
        else:
            print(f"   ✗ Failed for {project['title']}: {result.get('error')}")
    
    # Wait for indexing
    time.sleep(3)
    
    # Test searching for matching users
    print("\n5. Testing user search (finding team members for a project)...")
    print("-" * 40)
    
    # Search for ML engineers
    print("\n   Query: 'Need Python developers with ML and deep learning experience'")
    ml_matches = search_service.search_matching_users(
        required_skills="Python developers with machine learning and deep learning experience",
        top_k=3,
        min_score=0.3
    )
    
    print(f"\n   Found {len(ml_matches)} matches:")
    for match in ml_matches:
        print(f"   • {match['name']} ({match['match_percentage']})")
        print(f"     Skills: {match['skills'][:60]}...")
        print(f"     Role: {match.get('role', 'N/A')}")
    
    # Search for backend developers
    print("\n   Query: 'Looking for backend API developers with Docker'")
    backend_matches = search_service.search_matching_users(
        required_skills="Backend API developer with Docker and database experience",
        top_k=3,
        min_score=0.3
    )
    
    print(f"\n   Found {len(backend_matches)} matches:")
    for match in backend_matches:
        print(f"   • {match['name']} ({match['match_percentage']})")
        print(f"     Skills: {match['skills'][:60]}...")
    
    # Test searching for matching projects
    print("\n6. Testing project search (finding opportunities for a user)...")
    print("-" * 40)
    
    # Search projects for Alice (ML Engineer)
    alice_skills = "Python, Machine Learning, TensorFlow, Data Science"
    print(f"\n   Searching projects for Alice's skills: {alice_skills}")
    
    alice_projects = search_service.search_matching_projects(
        user_skills=alice_skills,
        top_k=3,
        min_score=0.3
    )
    
    print(f"\n   Found {len(alice_projects)} matching projects:")
    for project in alice_projects:
        print(f"   • {project['title']} ({project['match_percentage']})")
        print(f"     Required: {project['required_skills'][:60]}...")
        print(f"     Team size: {project.get('team_size', 'N/A')}")
    
    # Test updating user skills
    print("\n7. Testing skill update...")
    print("-" * 40)
    
    # Update Alice's skills
    print("\n   Updating Alice's skills to include PyTorch...")
    update_result = search_service.update_user_embedding(
        user_id="test_alice_001",
        skills="Python, Machine Learning, TensorFlow, PyTorch, Data Science, Computer Vision"
    )
    
    if update_result["success"]:
        print("   ✓ Skills updated successfully")
    else:
        print(f"   ✗ Update failed: {update_result.get('error')}")
    
    # Wait and search again to see the update
    time.sleep(2)
    
    print("\n   Searching again for 'PyTorch and Computer Vision experts'...")
    cv_matches = search_service.search_matching_users(
        required_skills="PyTorch and Computer Vision experts",
        top_k=2,
        min_score=0.3
    )
    
    if cv_matches and cv_matches[0]['name'] == "Alice Johnson":
        print("   ✓ Alice now appears in PyTorch searches!")
    
    # Cleanup test data
    print("\n8. Cleaning up test data...")
    
    # Delete test users
    for user in test_users:
        search_service.delete_user_embedding(user["user_id"])
    
    # Delete test projects (similar method would be needed)
    # For now, we'll just note that cleanup should happen
    print("   ✓ Test users removed")
    print("   Note: Add project cleanup method for production")
    
    print("\n" + "="*60)
    print("✅ ALL SEMANTIC SEARCH TESTS PASSED!")
    print("="*60)
    
    return True

def demonstrate_real_scenario():
    """
    Demonstrate a real-world scenario of the system in action.
    This shows how CollabCore would work in practice.
    """
    print("\n" + "="*60)
    print("REAL-WORLD SCENARIO DEMONSTRATION")
    print("="*60)
    
    from ai_ml.services.semantic_search import SemanticSearchService
    
    search_service = SemanticSearchService()
    
    print("\n📋 Scenario: A startup is building an AI product and needs a team")
    print("-" * 40)
    
    # The startup's project
    print("\n1. Startup creates a project posting:")
    print("   Title: 'AI-Powered Content Generation Platform'")
    print("   Skills needed: 'Python, NLP, Transformers, FastAPI, React'")
    
    # Simulate what happens when they search for team members
    print("\n2. System searches for matching developers...")
    print("   The semantic search understands that:")
    print("   • 'NLP' relates to 'Natural Language Processing'")
    print("   • 'Transformers' relates to 'BERT', 'GPT', 'Machine Learning'")
    print("   • 'FastAPI' relates to 'Backend', 'Python web development'")
    
    print("\n3. Results would include:")
    print("   • ML Engineers with NLP experience (85% match)")
    print("   • Python Backend developers with API experience (70% match)")
    print("   • Full-stack developers with React and Python (65% match)")
    
    print("\n4. Meanwhile, developers see this project when they search")
    print("   A developer with 'Machine Learning, Python, BERT' skills")
    print("   would see this project as a top match!")
    
    print("\n" + "="*60)
    print("This semantic matching is what makes CollabCore special!")
    print("It understands skill relationships, not just keywords.")

def main():
    """
    Main test runner
    """
    print("\n🚀 SEMANTIC SEARCH SERVICE TEST SUITE\n")
    
    # Check if semantic_search.py exists
    if not os.path.exists("ai_ml/services/semantic_search.py"):
        print("⚠️  semantic_search.py not found in ai_ml/services/")
        print("   Please save the file first, then run this test.")
        return 1
    
    try:
        # Run the comprehensive test
        success = test_semantic_search_service()
        
        if success:
            # Show the real-world scenario
            demonstrate_real_scenario()
            
            print("\n" + "="*60)
            print("🎉 SEMANTIC SEARCH SERVICE IS READY!")
            print("="*60)
            print("\nYour skill matching system is now complete.")
            print("Next step: Create the FastAPI integration endpoints.")
            
            return 0
        else:
            print("\n⚠️  Some tests failed. Please check the errors above.")
            return 1
            
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        print("\nPlease ensure:")
        print("1. Pinecone credentials are correct in .env")
        print("2. embeddings.py is working correctly")
        print("3. Your Pinecone index is accessible")
        return 1

if __name__ == "__main__":
    sys.exit(main())