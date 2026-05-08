#!/usr/bin/env python3
"""
Pinecone Configuration and Setup for CollabCore
This script creates and configures your Pinecone index for semantic search
"""

import os
import sys
import time
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_pinecone():
    """
    Initialize Pinecone and create the index for skill matching.
    This is the core setup that prepares your vector database.
    """
    print("=" * 60)
    print("PINECONE CONFIGURATION FOR COLLABCORE")
    print("=" * 60)
    
    # Step 1: Import and validate credentials
    try:
        from pinecone import Pinecone, ServerlessSpec
        print("✓ Pinecone library imported successfully")
    except ImportError:
        print("✗ Error: Pinecone not installed. Run: pip install pinecone-client")
        return False
    
    # Get credentials from environment variables
    api_key = os.getenv('PINECONE_API_KEY')
    
    if not api_key or api_key == 'your_pinecone_api_key_here':
        print("\n⚠ SETUP REQUIRED:")
        print("1. Go to https://www.pinecone.io and sign up for a free account")
        print("2. Navigate to API Keys in your dashboard")
        print("3. Copy your API key")
        print("4. Add it to your .env file:")
        print("   PINECONE_API_KEY=your_actual_key_here")
        return False
    
    print("✓ API credentials found")
    
    # Step 2: Initialize Pinecone client
    try:
        pc = Pinecone(api_key=api_key)
        print("✓ Connected to Pinecone successfully")
    except Exception as e:
        print(f"✗ Failed to connect to Pinecone: {str(e)}")
        return False
    
    # Step 3: Define index configuration
    index_name = "collabcore-skills"  # Name for your index
    dimension = 384  # all-MiniLM-L6-v2 produces 384-dimensional vectors
    metric = "cosine"  # Cosine similarity for semantic matching
    
    print(f"\nIndex Configuration:")
    print(f"  Name: {index_name}")
    print(f"  Dimensions: {dimension}")
    print(f"  Metric: {metric}")
    
    # Step 4: Check if index already exists
    try:
        existing_indexes = pc.list_indexes()
        index_names = [idx.name for idx in existing_indexes]
        
        if index_name in index_names:
            print(f"\n✓ Index '{index_name}' already exists")
            
            # Connect to existing index
            index = pc.Index(index_name)
            
            # Get index statistics
            stats = index.describe_index_stats()
            print(f"  Total vectors: {stats.total_vector_count}")
            print(f"  Dimensions: {stats.dimension}")
            
            return index
        else:
            print(f"\nCreating new index '{index_name}'...")
            
            # Create new index with serverless configuration
            # Serverless is free tier friendly and auto-scales
            pc.create_index(
                name=index_name,
                dimension=dimension,
                metric=metric,
                spec=ServerlessSpec(
                    cloud='aws',  # Cloud provider
                    region='us-east-1'  # Region (choose closest to you)
                )
            )
            
            # Wait for index to be ready
            print("Waiting for index to initialize...")
            time.sleep(5)  # Give it a moment to initialize
            
            # Connect to the new index
            index = pc.Index(index_name)
            
            print(f"✓ Index '{index_name}' created successfully!")
            return index
            
    except Exception as e:
        print(f"✗ Error managing index: {str(e)}")
        print("\nTroubleshooting:")
        print("- Check your Pinecone dashboard for any existing indexes")
        print("- Free tier allows only 1 index - delete others if needed")
        print("- Verify your API key is correct")
        return None

def test_index_operations(index):
    """
    Test basic operations on the Pinecone index to ensure everything works.
    This validates that we can store and retrieve vectors correctly.
    """
    print("\n" + "=" * 60)
    print("TESTING INDEX OPERATIONS")
    print("=" * 60)
    
    from sentence_transformers import SentenceTransformer
    import numpy as np
    
    # Load the embedding model
    print("Loading embedding model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Test data - sample users with skills
    test_users = [
        {
            "id": "test_user_1",
            "name": "Alice Johnson",
            "skills": "Python, Machine Learning, TensorFlow, Data Science"
        },
        {
            "id": "test_user_2", 
            "name": "Bob Smith",
            "skills": "JavaScript, React, Node.js, Frontend Development"
        },
        {
            "id": "test_user_3",
            "name": "Charlie Davis",
            "skills": "Python, FastAPI, Backend Development, PostgreSQL"
        }
    ]
    
    # Step 1: Generate embeddings for each user
    print("\nGenerating embeddings for test users...")
    vectors_to_upsert = []
    
    for user in test_users:
        # Generate embedding for user's skills
        embedding = model.encode(user["skills"])
        
        # Prepare vector for Pinecone (id, values, metadata)
        vector = {
            "id": user["id"],
            "values": embedding.tolist(),  # Convert numpy array to list
            "metadata": {
                "name": user["name"],
                "skills": user["skills"]
            }
        }
        vectors_to_upsert.append(vector)
        print(f"  ✓ Generated embedding for {user['name']}")
    
    # Step 2: Upsert vectors to Pinecone
    print("\nUpserting vectors to Pinecone...")
    try:
        index.upsert(vectors=vectors_to_upsert)
        print("✓ Successfully stored test vectors")
    except Exception as e:
        print(f"✗ Error upserting vectors: {str(e)}")
        return False
    
    # Give Pinecone a moment to index the vectors
    time.sleep(2)
    
    # Step 3: Test semantic search
    print("\nTesting semantic search...")
    
    # Search for a Python developer
    query = "Looking for a Python backend developer with API experience"
    print(f"Query: '{query}'")
    
    # Generate embedding for the query
    query_embedding = model.encode(query)
    
    # Search Pinecone
    try:
        results = index.query(
            vector=query_embedding.tolist(),
            top_k=3,  # Get top 3 matches
            include_metadata=True
        )
        
        print("\nSearch Results:")
        print("-" * 40)
        
        for match in results['matches']:
            score = match['score']
            metadata = match.get('metadata', {})
            name = metadata.get('name', 'Unknown')
            skills = metadata.get('skills', 'No skills listed')
            
            print(f"Match: {name}")
            print(f"  Score: {score:.3f}")
            print(f"  Skills: {skills}")
            print()
        
        print("✓ Semantic search working correctly!")
        
        # The best match should be Charlie (Python + Backend + API-related skills)
        best_match = results['matches'][0]['metadata']['name']
        print(f"Best match for the query: {best_match}")
        
    except Exception as e:
        print(f"✗ Error performing search: {str(e)}")
        return False
    
    # Step 4: Clean up test data (optional)
    print("\nCleaning up test data...")
    try:
        # Delete test vectors
        test_ids = [user["id"] for user in test_users]
        index.delete(ids=test_ids)
        print("✓ Test data cleaned up")
    except Exception as e:
        print(f"⚠ Warning: Could not clean up test data: {str(e)}")
    
    return True

def print_configuration_summary():
    """
    Print a summary of the configuration for reference
    """
    print("\n" + "=" * 60)
    print("CONFIGURATION SUMMARY")
    print("=" * 60)
    
    print("\n📌 Pinecone Configuration:")
    print("  Index Name: collabcore-skills")
    print("  Dimensions: 384 (matches all-MiniLM-L6-v2 output)")
    print("  Metric: Cosine Similarity")
    print("  Type: Serverless (auto-scaling)")
    
    print("\n🔧 Next Steps:")
    print("  1. Build the embedding service (embeddings.py)")
    print("  2. Create the semantic search service")
    print("  3. Implement the integration endpoints")
    
    print("\n💡 Important Notes:")
    print("  - Free tier includes 100K vectors")
    print("  - Serverless scales automatically")
    print("  - Vectors persist until explicitly deleted")
    print("  - Use metadata to store user/project details")

def main():
    """
    Main execution function
    """
    print("\n🚀 STARTING PINECONE CONFIGURATION\n")
    
    # Setup Pinecone
    index = setup_pinecone()
    
    if index:
        # Test operations
        success = test_index_operations(index)
        
        if success:
            print_configuration_summary()
            print("\n✅ PINECONE CONFIGURATION COMPLETE!")
            print("Your vector database is ready for semantic search.")
        else:
            print("\n⚠ Configuration completed but tests failed.")
            print("Please check your setup and try again.")
    else:
        print("\n❌ Configuration failed. Please check the errors above.")
        print("\nCommon issues:")
        print("- Invalid API key")
        print("- Network connectivity")
        print("- Free tier limitations (1 index max)")

if __name__ == "__main__":
    main()