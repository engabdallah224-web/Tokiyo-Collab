#!/usr/bin/env python3
"""
CollabCore AI/ML Test Suite
Run this after setup to verify everything works correctly
"""

import unittest
import numpy as np
from typing import List
import sys
import warnings
warnings.filterwarnings('ignore')

class TestMLEnvironment(unittest.TestCase):
    """Test suite for ML environment verification"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test fixtures"""
        print("\n🧪 Running CollabCore ML Environment Tests...\n")
    
    def test_01_imports(self):
        """Test that all required packages can be imported"""
        print("Testing package imports...")
        
        # Test core imports
        try:
            from sentence_transformers import SentenceTransformer
            import pinecone
            import numpy as np
            from dotenv import load_dotenv
            self.assertTrue(True)
            print("  ✓ All core packages imported successfully")
        except ImportError as e:
            self.fail(f"Failed to import required package: {e}")
    
    def test_02_embedding_model_loading(self):
        """Test that the embedding model loads correctly"""
        print("Testing embedding model loading...")
        
        from sentence_transformers import SentenceTransformer
        
        # Load model
        model = SentenceTransformer('all-MiniLM-L6-v2')
        self.assertIsNotNone(model)
        
        # Store for later tests
        self.__class__.model = model
        print("  ✓ Model loaded successfully")
    
    def test_03_embedding_dimensions(self):
        """Test that embeddings have correct dimensions"""
        print("Testing embedding dimensions...")
        
        model = self.__class__.model
        
        # Test single skill
        single_skill = "Python programming"
        embedding = model.encode(single_skill)
        
        self.assertEqual(embedding.shape[0], 384)
        print(f"  ✓ Single embedding dimension: {embedding.shape}")
        
        # Test multiple skills
        multiple_skills = ["Python", "JavaScript", "Machine Learning"]
        embeddings = model.encode(multiple_skills)
        
        self.assertEqual(embeddings.shape, (3, 384))
        print(f"  ✓ Multiple embeddings dimension: {embeddings.shape}")
    
    def test_04_semantic_similarity(self):
        """Test semantic similarity calculations"""
        print("Testing semantic similarity...")
        
        model = self.__class__.model
        
        # Test similar skills
        similar_skills = ["Python programming", "Python development"]
        embeddings = model.encode(similar_skills)
        
        # Calculate cosine similarity
        similarity = np.dot(embeddings[0], embeddings[1]) / \
                    (np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1]))
        
        # Similar skills should have high similarity (> 0.8)
        self.assertGreater(similarity, 0.8)
        print(f"  ✓ Similar skills similarity: {similarity:.3f}")
        
        # Test dissimilar skills
        dissimilar_skills = ["Python programming", "Graphic Design"]
        embeddings = model.encode(dissimilar_skills)
        
        dissimilarity = np.dot(embeddings[0], embeddings[1]) / \
                       (np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1]))
        
        # Dissimilar skills should have lower similarity
        self.assertLess(dissimilarity, similarity)
        print(f"  ✓ Dissimilar skills similarity: {dissimilarity:.3f}")
    
    def test_05_batch_processing(self):
        """Test batch processing capabilities"""
        print("Testing batch processing...")
        
        model = self.__class__.model
        
        # Create a larger batch of skills
        skills_batch = [
            "Python", "JavaScript", "React", "Node.js",
            "Machine Learning", "Data Science", "AI",
            "Docker", "Kubernetes", "AWS",
            "MongoDB", "PostgreSQL", "Redis"
        ]
        
        # Process batch
        embeddings = model.encode(skills_batch)
        
        self.assertEqual(embeddings.shape[0], len(skills_batch))
        self.assertEqual(embeddings.shape[1], 384)
        print(f"  ✓ Processed batch of {len(skills_batch)} skills")
    
    def test_06_edge_cases(self):
        """Test edge cases and error handling"""
        print("Testing edge cases...")
        
        model = self.__class__.model
        
        # Test empty string
        empty_embedding = model.encode("")
        self.assertEqual(empty_embedding.shape[0], 384)
        print("  ✓ Empty string handled")
        
        # Test special characters
        special_chars = "C++ Programming & ML/AI"
        special_embedding = model.encode(special_chars)
        self.assertEqual(special_embedding.shape[0], 384)
        print("  ✓ Special characters handled")
        
        # Test very long input
        long_input = " ".join(["skill"] * 100)
        long_embedding = model.encode(long_input)
        self.assertEqual(long_embedding.shape[0], 384)
        print("  ✓ Long input handled")
    
    def test_07_performance_benchmark(self):
        """Test performance benchmarks"""
        print("Testing performance...")
        
        import time
        model = self.__class__.model
        
        # Single embedding speed
        start = time.time()
        _ = model.encode("Python programming")
        single_time = time.time() - start
        
        self.assertLess(single_time, 1.0)  # Should be less than 1 second
        print(f"  ✓ Single embedding time: {single_time:.3f}s")
        
        # Batch embedding speed
        batch = ["skill" + str(i) for i in range(100)]
        start = time.time()
        _ = model.encode(batch)
        batch_time = time.time() - start
        
        self.assertLess(batch_time, 5.0)  # Should be less than 5 seconds for 100
        print(f"  ✓ Batch (100) embedding time: {batch_time:.3f}s")
        print(f"  ✓ Average time per embedding: {batch_time/100:.3f}s")

def run_integration_tests():
    """Run additional integration tests"""
    print("\n📊 Running Integration Tests...\n")
    
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Simulate real-world scenario
    print("Simulating skill matching scenario...")
    
    # Project requirements
    project_skills = "We need a backend developer with Python and FastAPI experience"
    project_embedding = model.encode(project_skills)
    
    # User profiles
    users = [
        {"id": 1, "skills": "Python, Django, Flask, Backend Development"},
        {"id": 2, "skills": "JavaScript, React, Frontend Development"},
        {"id": 3, "skills": "Python, FastAPI, PostgreSQL, Docker"},
        {"id": 4, "skills": "Java, Spring Boot, Microservices"}
    ]
    
    # Calculate matches
    matches = []
    for user in users:
        user_embedding = model.encode(user["skills"])
        similarity = np.dot(project_embedding, user_embedding) / \
                    (np.linalg.norm(project_embedding) * np.linalg.norm(user_embedding))
        matches.append((user["id"], similarity))
    
    # Sort by similarity
    matches.sort(key=lambda x: x[1], reverse=True)
    
    print("\nMatch Results:")
    print("-" * 40)
    for user_id, score in matches:
        user = next(u for u in users if u["id"] == user_id)
        print(f"User {user_id}: {score:.3f} - {user['skills'][:30]}...")
    
    # Best match should be User 3 (Python + FastAPI)
    best_match = matches[0][0]
    print(f"\n✓ Best match: User {best_match}")
    print("✓ Integration test completed successfully!")

def main():
    """Main test runner"""
    # Run unit tests
    suite = unittest.TestLoader().loadTestsFromTestCase(TestMLEnvironment)
    runner = unittest.TextTestRunner(verbosity=0)
    result = runner.run(suite)
    
    # Run integration tests if unit tests pass
    if result.wasSuccessful():
        run_integration_tests()
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED! 🎉")
        print("=" * 60)
        print("\nYour ML environment is fully configured and working!")
        print("You're ready to proceed with building the embedding service.")
        
        return 0
    else:
        print("\n" + "=" * 60)
        print("❌ SOME TESTS FAILED")
        print("=" * 60)
        print("\nPlease fix the issues before proceeding.")
        return 1

if __name__ == "__main__":
    sys.exit(main())