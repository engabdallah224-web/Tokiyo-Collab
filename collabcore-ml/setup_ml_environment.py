#!/usr/bin/env python3
"""
CollabCore AI/ML Environment Setup Script
This script initializes and tests the ML environment for semantic search functionality
"""

import sys
import os
from typing import List, Tuple
import json
import time

def verify_imports():
    """Verify all required libraries are installed correctly"""
    print("=" * 60)
    print("STEP 1: Verifying library installations...")
    print("=" * 60)
    
    required_packages = {
        'sentence_transformers': 'sentence-transformers',
        'pinecone': 'pinecone',
        'numpy': 'numpy',
        'dotenv': 'python-dotenv'
    }
    
    missing_packages = []
    
    for module_name, package_name in required_packages.items():
        try:
            __import__(module_name)
            print(f"✓ {package_name} installed successfully")
        except ImportError:
            print(f"✗ {package_name} not found")
            missing_packages.append(package_name)
    
    if missing_packages:
        print(f"\nMissing packages detected. Install them with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("\n✓ All required packages are installed!")
    return True

def test_embedding_model():
    """Download and test the embedding model"""
    print("\n" + "=" * 60)
    print("STEP 2: Testing Embedding Model (all-MiniLM-L6-v2)...")
    print("=" * 60)
    
    try:
        from sentence_transformers import SentenceTransformer
        
        # Initialize the model (will download if not present)
        print("Loading model (this may take a moment on first run)...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Test with sample skills
        test_skills = [
            "Python programming",
            "Machine Learning",
            "JavaScript React",
            "Data Science",
            "Backend Development"
        ]
        
        print(f"\nGenerating embeddings for {len(test_skills)} test skills...")
        embeddings = model.encode(test_skills)
        
        # Verify embeddings dimensions
        print(f"\nEmbedding shape: {embeddings.shape}")
        print(f"Expected shape: ({len(test_skills)}, 384)")
        
        if embeddings.shape[1] != 384:
            print(f"✗ Warning: Expected 384 dimensions, got {embeddings.shape[1]}")
            return False
        
        # Test similarity calculation
        print("\nTesting semantic similarity...")
        from numpy import dot
        from numpy.linalg import norm
        
        # Calculate cosine similarity between "Python programming" and "Backend Development"
        similarity = dot(embeddings[0], embeddings[4]) / (norm(embeddings[0]) * norm(embeddings[4]))
        print(f"Similarity between 'Python programming' and 'Backend Development': {similarity:.3f}")
        
        # Calculate similarity between "Python programming" and "Machine Learning"
        similarity_ml = dot(embeddings[0], embeddings[1]) / (norm(embeddings[0]) * norm(embeddings[1]))
        print(f"Similarity between 'Python programming' and 'Machine Learning': {similarity_ml:.3f}")
        
        print("\n✓ Embedding model is working correctly!")
        return model
        
    except Exception as e:
        print(f"✗ Error testing embedding model: {str(e)}")
        return None

def create_env_template():
    """Create a .env template file for Pinecone configuration"""
    print("\n" + "=" * 60)
    print("STEP 3: Creating Environment Configuration Template...")
    print("=" * 60)
    
    env_template = """# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=collabcore-skills

# Optional: FastAPI Configuration (for later)
API_HOST=0.0.0.0
API_PORT=8001
"""
    
    # Check if .env already exists
    if os.path.exists('.env'):
        print("✓ .env file already exists")
        return True
    
    # Create .env.template
    with open('.env.template', 'w') as f:
        f.write(env_template)
    
    print("✓ Created .env.template file")
    print("\nNext steps:")
    print("1. Copy .env.template to .env")
    print("2. Add your Pinecone API key and environment")
    print("3. Sign up at https://www.pinecone.io if you don't have an account")
    
    return True

def test_pinecone_connection():
    """Test Pinecone connection if credentials are available"""
    print("\n" + "=" * 60)
    print("STEP 4: Testing Pinecone Connection (Optional)...")
    print("=" * 60)
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.getenv('PINECONE_API_KEY')
        
        if not api_key or api_key == 'your_pinecone_api_key_here':
            print("⚠ Pinecone API key not configured in .env file")
            print("  Skipping Pinecone connection test...")
            return False
        
        from pinecone import Pinecone
        
        # Initialize Pinecone
        pc = Pinecone(api_key=api_key)
        
        # List existing indexes
        existing_indexes = pc.list_indexes()
        print(f"✓ Connected to Pinecone successfully!")
        print(f"  Found {len(existing_indexes)} existing indexes")
        
        return True
        
    except Exception as e:
        print(f"⚠ Could not connect to Pinecone: {str(e)}")
        print("  This is expected if you haven't set up Pinecone yet")
        return False

def create_project_structure():
    """Create the recommended project structure for AI/ML components"""
    print("\n" + "=" * 60)
    print("STEP 5: Creating Project Structure...")
    print("=" * 60)
    
    directories = [
        'ai_ml',
        'ai_ml/services',
        'ai_ml/models',
        'ai_ml/utils',
        'tests',
        'data'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ Created directory: {directory}/")
    
    # Create __init__.py files
    init_files = [
        'ai_ml/__init__.py',
        'ai_ml/services/__init__.py',
        'ai_ml/models/__init__.py',
        'ai_ml/utils/__init__.py'
    ]
    
    for init_file in init_files:
        with open(init_file, 'w') as f:
            f.write('# CollabCore AI/ML Module\n')
        print(f"✓ Created: {init_file}")
    
    print("\n✓ Project structure created successfully!")
    return True

def main():
    """Main setup function"""
    print("\n" + "🚀 COLLABCORE AI/ML ENVIRONMENT SETUP 🚀")
    print("=" * 60)
    
    # Track setup progress
    setup_complete = True
    
    # Step 1: Verify imports
    if not verify_imports():
        print("\n⚠ Please install missing packages before continuing")
        setup_complete = False
        return
    
    # Step 2: Test embedding model
    model = test_embedding_model()
    if not model:
        setup_complete = False
    
    # Step 3: Create environment template
    create_env_template()
    
    # Step 4: Test Pinecone (optional)
    test_pinecone_connection()
    
    # Step 5: Create project structure
    create_project_structure()
    
    # Final summary
    print("\n" + "=" * 60)
    print("SETUP SUMMARY")
    print("=" * 60)
    
    if setup_complete:
        print("✓ ML environment setup completed successfully!")
        print("\nYour environment is ready for development.")
        print("\nNext steps:")
        print("1. Configure Pinecone credentials in .env file")
        print("2. Run test_ml_setup.py to verify everything works")
        print("3. Start building the embedding service")
    else:
        print("⚠ Setup completed with warnings.")
        print("  Please address any issues before proceeding.")
    
    print("\nProject structure ready for GitHub push! 🎉")

if __name__ == "__main__":
    main()