#!/usr/bin/env python3
"""
Test script for the FastAPI Integration
This demonstrates how the backend team will interact with your semantic search API
"""

import requests
import json
import time
import sys
from typing import Dict, List

# API base URL - change this if running on a different port
API_BASE_URL = "http://localhost:8001"

def test_api_connection():
    """
    Test basic connectivity to the API.
    This verifies the service is running and accessible.
    """
    print("="*60)
    print("TESTING API CONNECTION")
    print("="*60)
    
    try:
        # Test root endpoint
        response = requests.get(f"{API_BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Connected to: {data['service']}")
            print(f"  Version: {data['version']}")
            print(f"  Status: {data['status']}")
            return True
        else:
            print(f"✗ Failed to connect. Status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to API. Is the service running?")
        print(f"  Make sure the API is running on {API_BASE_URL}")
        print("  Start it with: python ai_ml/services/api_integration.py")
        return False

def test_health_endpoint():
    """
    Test the health check endpoint.
    This is what monitoring systems will use to verify service health.
    """
    print("\n" + "="*60)
    print("TESTING HEALTH CHECK")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        data = response.json()
        
        if response.status_code == 200:
            print(f"✓ Service is {data['status']}")
            print(f"  Total vectors in index: {data['index_stats']['total_vectors']}")
            print(f"  Index ready: {data['index_stats']['index_ready']}")
            return True
        else:
            print(f"✗ Health check failed: {data}")
            return False
            
    except Exception as e:
        print(f"✗ Health check error: {str(e)}")
        return False

def test_user_embedding_creation():
    """
    Test creating user embeddings through the API.
    This simulates what happens when users sign up or update profiles.
    """
    print("\n" + "="*60)
    print("TESTING USER EMBEDDING CREATION")
    print("="*60)
    
    # Test users to create
    test_users = [
        {
            "user_id": "api_test_user_001",
            "name": "API Test Alice",
            "skills": "Python, Machine Learning, TensorFlow, Computer Vision",
            "role": "ML Engineer",
            "experience_years": 3
        },
        {
            "user_id": "api_test_user_002",
            "name": "API Test Bob",
            "skills": "JavaScript, React, TypeScript, Node.js",
            "role": "Frontend Developer",
            "experience_years": 4
        },
        {
            "user_id": "api_test_user_003",
            "name": "API Test Charlie",
            "skills": "Python, FastAPI, PostgreSQL, Docker",
            "role": "Backend Engineer",
            "experience_years": 5
        }
    ]
    
    created_users = []
    
    for user in test_users:
        try:
            response = requests.post(
                f"{API_BASE_URL}/embeddings/user",
                json=user
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Created embedding for {user['name']}")
                print(f"  User ID: {data['user_id']}")
                created_users.append(user['user_id'])
            else:
                print(f"✗ Failed to create {user['name']}: {response.text}")
                
        except Exception as e:
            print(f"✗ Error creating user: {str(e)}")
    
    return created_users

def test_project_embedding_creation():
    """
    Test creating project embeddings through the API.
    This simulates project creation in the system.
    """
    print("\n" + "="*60)
    print("TESTING PROJECT EMBEDDING CREATION")
    print("="*60)
    
    test_projects = [
        {
            "project_id": "api_test_proj_001",
            "title": "AI Chat Assistant",
            "description": "Build an intelligent conversational AI using modern NLP techniques",
            "required_skills": "Python, NLP, Transformers, Machine Learning",
            "owner_id": "api_test_user_001",
            "team_size": 3,
            "duration_weeks": 12,
            "status": "open"
        },
        {
            "project_id": "api_test_proj_002",
            "title": "React Dashboard",
            "description": "Create an interactive analytics dashboard with real-time updates",
            "required_skills": "React, JavaScript, D3.js, Data Visualization",
            "owner_id": "api_test_user_002",
            "team_size": 2,
            "duration_weeks": 8,
            "status": "open"
        }
    ]
    
    created_projects = []
    
    for project in test_projects:
        try:
            response = requests.post(
                f"{API_BASE_URL}/embeddings/project",
                json=project
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Created embedding for {project['title']}")
                print(f"  Project ID: {data['project_id']}")
                created_projects.append(project['project_id'])
            else:
                print(f"✗ Failed to create {project['title']}: {response.text}")
                
        except Exception as e:
            print(f"✗ Error creating project: {str(e)}")
    
    return created_projects

def test_semantic_search():
    """
    Test the main semantic search endpoint.
    This is the core functionality that powers skill matching.
    """
    print("\n" + "="*60)
    print("TESTING SEMANTIC SEARCH")
    print("="*60)
    
    # Wait for indexing
    print("\nWaiting for Pinecone to index vectors...")
    time.sleep(3)
    
    # Test searching for users
    print("\n1. Searching for ML engineers...")
    print("-" * 40)
    
    search_request = {
        "query": "Looking for machine learning engineers with deep learning experience",
        "search_type": "users",
        "limit": 5,
        "min_score": 0.3
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/search/semantic",
            json=search_request
        )
        
        if response.status_code == 200:
            results = response.json()
            print(f"Found {len(results)} matching users:")
            
            for result in results[:3]:  # Show top 3
                print(f"\n  • {result.get('name', 'Unknown')} ({result['match_percentage']})")
                print(f"    Skills: {result.get('skills', 'N/A')[:60]}...")
                print(f"    Role: {result['metadata'].get('role', 'N/A')}")
        else:
            print(f"✗ Search failed: {response.text}")
            
    except Exception as e:
        print(f"✗ Search error: {str(e)}")
    
    # Test searching for projects
    print("\n2. Searching for projects (from a user's perspective)...")
    print("-" * 40)
    
    search_request = {
        "query": "Python, Machine Learning, NLP, TensorFlow",
        "search_type": "projects",
        "limit": 5,
        "min_score": 0.3,
        "filters": {"status": "open"}
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/search/semantic",
            json=search_request
        )
        
        if response.status_code == 200:
            results = response.json()
            print(f"Found {len(results)} matching projects:")
            
            for result in results[:3]:  # Show top 3
                print(f"\n  • {result.get('title', 'Unknown')} ({result['match_percentage']})")
                print(f"    Required: {result.get('required_skills', 'N/A')[:60]}...")
                print(f"    Team size: {result['metadata'].get('team_size', 'N/A')}")
        else:
            print(f"✗ Search failed: {response.text}")
            
    except Exception as e:
        print(f"✗ Search error: {str(e)}")

def test_user_update():
    """
    Test updating a user's skills through the API.
    This simulates profile updates.
    """
    print("\n" + "="*60)
    print("TESTING USER UPDATE")
    print("="*60)
    
    user_id = "api_test_user_001"
    
    update_data = {
        "user_id": user_id,
        "name": "API Test Alice (Updated)",
        "skills": "Python, Machine Learning, TensorFlow, PyTorch, Computer Vision, GANs",
        "role": "Senior ML Engineer",
        "experience_years": 4
    }
    
    try:
        response = requests.put(
            f"{API_BASE_URL}/embeddings/user/{user_id}",
            json=update_data
        )
        
        if response.status_code == 200:
            print(f"✓ Successfully updated user {user_id}")
            print(f"  New skills include: PyTorch, GANs")
            
            # Verify the update with a search
            time.sleep(2)
            
            print("\n  Verifying update with search for 'PyTorch and GANs'...")
            search_request = {
                "query": "PyTorch and GANs expert",
                "search_type": "users",
                "limit": 3,
                "min_score": 0.3
            }
            
            response = requests.post(
                f"{API_BASE_URL}/search/semantic",
                json=search_request
            )
            
            if response.status_code == 200:
                results = response.json()
                if results and "Alice" in results[0].get('name', ''):
                    print("  ✓ Updated user appears in PyTorch searches!")
                    
        else:
            print(f"✗ Update failed: {response.text}")
            
    except Exception as e:
        print(f"✗ Update error: {str(e)}")

def test_batch_embeddings():
    """
    Test generating embeddings for multiple texts.
    This utility endpoint helps with debugging and testing.
    """
    print("\n" + "="*60)
    print("TESTING BATCH EMBEDDING GENERATION")
    print("="*60)
    
    batch_request = {
        "texts": [
            "Python programming and web development",
            "Machine learning and artificial intelligence",
            "Frontend development with React"
        ]
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/embeddings/generate",
            json=batch_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Generated {data['count']} embeddings")
            
            for item in data['embeddings']:
                print(f"  • Text: '{item['text'][:40]}...'")
                print(f"    Dimension: {item['embedding_dimension']}")
                
        else:
            print(f"✗ Batch generation failed: {response.text}")
            
    except Exception as e:
        print(f"✗ Batch error: {str(e)}")

def test_statistics():
    """
    Test the statistics endpoint.
    This shows system usage metrics.
    """
    print("\n" + "="*60)
    print("TESTING STATISTICS ENDPOINT")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/stats")
        
        if response.status_code == 200:
            stats = response.json()
            print("✓ Retrieved system statistics:")
            print(f"  Total vectors: {stats['total_vectors']}")
            print(f"  Index dimensions: {stats['index_dimensions']}")
            print(f"  Index fullness: {stats['index_fullness']}")
            
            # Show namespace breakdown if available
            if stats.get('namespaces'):
                print("\n  Namespace breakdown:")
                for namespace, count in stats['namespaces'].items():
                    if namespace:  # Skip empty namespace key
                        print(f"    {namespace}: {count.get('vector_count', 0)} vectors")
                        
        else:
            print(f"✗ Statistics request failed: {response.text}")
            
    except Exception as e:
        print(f"✗ Statistics error: {str(e)}")

def cleanup_test_data(user_ids: List[str]):
    """
    Clean up test data from the index.
    This prevents test data from polluting the production index.
    """
    print("\n" + "="*60)
    print("CLEANING UP TEST DATA")
    print("="*60)
    
    for user_id in user_ids:
        try:
            response = requests.delete(f"{API_BASE_URL}/embeddings/user/{user_id}")
            if response.status_code == 200:
                print(f"✓ Removed {user_id}")
            else:
                print(f"⚠ Could not remove {user_id}")
        except:
            pass
    
    print("  Cleanup complete")

def main():
    """
    Run all API integration tests
    """
    print("\n🚀 FASTAPI INTEGRATION TEST SUITE\n")
    print("This test simulates how the backend team will interact with your API")
    print("-" * 60)
    
    # Check connection first
    if not test_api_connection():
        print("\n❌ Cannot connect to API!")
        print("\nTo start the API server:")
        print("1. Open a new terminal window")
        print("2. Navigate to your project directory")
        print("3. Run: python ai_ml/services/api_integration.py")
        print("4. Wait for 'Uvicorn running on http://0.0.0.0:8001' message")
        print("5. Run this test again in the original terminal")
        return 1
    
    # Run all tests
    test_health_endpoint()
    
    created_users = test_user_embedding_creation()
    created_projects = test_project_embedding_creation()
    
    test_semantic_search()
    test_user_update()
    test_batch_embeddings()
    test_statistics()
    
    # Cleanup
    if created_users:
        cleanup_test_data(created_users)
    
    print("\n" + "="*60)
    print("✅ API INTEGRATION TESTS COMPLETE!")
    print("="*60)
    print("\nYour semantic search API is ready for the backend team!")
    print("\nAPI Documentation available at:")
    print(f"  • Swagger UI: {API_BASE_URL}/docs")
    print(f"  • ReDoc: {API_BASE_URL}/redoc")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())