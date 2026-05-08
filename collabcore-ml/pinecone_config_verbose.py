#!/usr/bin/env python3
"""
Pinecone Configuration with Progress Indicators
This version shows you exactly what's happening at each step
"""

import os
import sys
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def step1_check_connection_only():
    """
    Step 1: Just check if we can connect to Pinecone
    This is quick and tells us if credentials are working
    """
    print("\n" + "="*60)
    print("STEP 1: Testing Pinecone Connection")
    print("="*60)
    
    try:
        from pinecone import Pinecone
        api_key = os.getenv('PINECONE_API_KEY')
        
        if not api_key or api_key == 'your_pinecone_api_key_here':
            print("ERROR: No API key found in .env file")
            return None
            
        print("Attempting to connect to Pinecone...")
        pc = Pinecone(api_key=api_key)
        
        # Quick test - list indexes
        print("Fetching your indexes...")
        indexes = pc.list_indexes()
        index_names = [idx.name for idx in indexes]
        
        print(f"SUCCESS! Connected to Pinecone")
        print(f"Found {len(index_names)} indexes: {index_names}")
        
        # Check if our index exists
        if "collabcore-skills" in index_names:
            print("✓ Your 'collabcore-skills' index already exists")
            index = pc.Index("collabcore-skills")
            stats = index.describe_index_stats()
            print(f"  Current vectors in index: {stats.total_vector_count}")
        else:
            print("Note: 'collabcore-skills' index not found (will create later)")
            
        return pc
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return None

def step2_test_model_separately():
    """
    Step 2: Test the embedding model separately
    This is where the download happens - we'll show progress
    """
    print("\n" + "="*60)
    print("STEP 2: Testing Embedding Model")
    print("="*60)
    
    print("\nThis step downloads the model on first run (~80MB)")
    print("The download happens from HuggingFace servers")
    print("It may take 1-5 minutes depending on your connection...")
    
    try:
        # First, let's check if the model is already downloaded
        import os
        from pathlib import Path
        
        # The model gets cached here
        cache_dir = Path.home() / ".cache" / "torch" / "sentence_transformers"
        model_name = "sentence-transformers_all-MiniLM-L6-v2"
        
        if (cache_dir / model_name).exists():
            print("\n✓ Model already downloaded (found in cache)")
        else:
            print("\n⏳ Model not in cache - downloading now...")
            print("   (No progress bar unfortunately, but it IS downloading)")
            
        # Now actually load the model
        print("\nLoading model into memory...")
        from sentence_transformers import SentenceTransformer
        
        start_time = time.time()
        model = SentenceTransformer('all-MiniLM-L6-v2')
        load_time = time.time() - start_time
        
        print(f"✓ Model loaded successfully in {load_time:.1f} seconds")
        
        # Quick test
        print("\nTesting with a sample sentence...")
        test_text = "Python programming"
        embedding = model.encode(test_text)
        
        print(f"✓ Generated embedding with shape: {embedding.shape}")
        print(f"  Expected: (384,) - Got: {embedding.shape}")
        
        if embedding.shape[0] == 384:
            print("✓ Model is working correctly!")
            return model
        else:
            print("ERROR: Unexpected embedding dimensions")
            return None
            
    except KeyboardInterrupt:
        print("\n\nInterrupted by user (Ctrl+C)")
        print("The model download was likely still in progress.")
        print("Run this script again - partial downloads will resume.")
        return None
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return None

def step3_quick_vector_test(pc, model):
    """
    Step 3: Quick test with just ONE vector
    This tests the pipeline without doing too much
    """
    print("\n" + "="*60)
    print("STEP 3: Quick Vector Test")
    print("="*60)
    
    try:
        index = pc.Index("collabcore-skills")
        
        # Create just one test vector
        print("\nCreating a single test vector...")
        test_id = "quick_test_" + str(int(time.time()))
        test_skills = "Python, Machine Learning, Data Science"
        
        # Generate embedding
        print("Generating embedding...")
        embedding = model.encode(test_skills)
        
        # Prepare vector
        vector = {
            "id": test_id,
            "values": embedding.tolist(),
            "metadata": {
                "name": "Test User",
                "skills": test_skills
            }
        }
        
        # Upsert to Pinecone
        print("Uploading to Pinecone...")
        index.upsert(vectors=[vector])
        print("✓ Upload successful")
        
        # Wait a moment for indexing
        print("Waiting 2 seconds for indexing...")
        time.sleep(2)
        
        # Search for it
        print("\nSearching for similar vectors...")
        query = "Looking for ML engineers"
        query_embedding = model.encode(query)
        
        results = index.query(
            vector=query_embedding.tolist(),
            top_k=1,
            include_metadata=True
        )
        
        if results['matches']:
            match = results['matches'][0]
            print(f"✓ Found match with score: {match['score']:.3f}")
            print(f"  Skills: {match['metadata']['skills']}")
        
        # Clean up
        print("\nCleaning up test vector...")
        index.delete(ids=[test_id])
        print("✓ Cleanup complete")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

def main():
    """
    Run each step separately with clear progress indicators
    """
    print("\n🚀 PINECONE SETUP - VERBOSE MODE")
    print("Each step runs separately so you can see exactly what's happening")
    
    # Step 1: Test connection
    print("\n[1/3] Testing Pinecone connection...")
    pc = step1_check_connection_only()
    if not pc:
        print("\n❌ Failed at Step 1. Fix connection issues first.")
        return
    
    # Ask user if they want to continue
    print("\n" + "-"*60)
    response = input("Connection successful! Continue to model download? (y/n): ")
    if response.lower() != 'y':
        print("Stopping here. Run again when ready.")
        return
    
    # Step 2: Load model
    print("\n[2/3] Loading embedding model...")
    model = step2_test_model_separately()
    if not model:
        print("\n❌ Failed at Step 2. Model loading issues.")
        return
    
    # Ask user if they want to continue
    print("\n" + "-"*60)
    response = input("Model loaded! Test vector operations? (y/n): ")
    if response.lower() != 'y':
        print("Stopping here. Model is ready for use.")
        return
    
    # Step 3: Quick test
    print("\n[3/3] Running vector test...")
    success = step3_quick_vector_test(pc, model)
    
    if success:
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\nYour Pinecone setup is complete and working.")
        print("Ready to build the embedding service!")
    else:
        print("\n⚠️ Vector test failed, but connection and model are OK.")
        print("You can still proceed with development.")

if __name__ == "__main__":
    # Add interrupt handler
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nScript interrupted by user (Ctrl+C)")
        print("You can run it again to continue where you left off.")