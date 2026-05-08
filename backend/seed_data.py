"""
Seed static data for CollabCore
Run: python seed_data.py
Options:
  --clear    Clear existing data before seeding
  --force    Skip confirmation prompts
"""

import requests
import sys
from firebase_config import db, SKILLS_COLLECTION, UNIVERSITIES_COLLECTION, CATEGORIES_COLLECTION

def clear_collection(collection_name):
    """Delete all documents in a collection"""
    print(f"Clearing {collection_name} collection...")
    docs = db.collection(collection_name).stream()
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
    print(f"  ✓ Deleted {count} documents\n")

def seed_skills():
    """Add common skills"""
    skills = [
        "Python", "JavaScript", "React", "Node.js", "Java", "C++", "C#",
        "HTML/CSS", "TypeScript", "Go", "Rust", "Swift", "Kotlin",
        "Machine Learning", "Deep Learning", "Data Science", "AI",
        "React Native", "Flutter", "iOS Development", "Android Development",
        "AWS", "Docker", "Kubernetes", "DevOps", "CI/CD",
        "SQL", "MongoDB", "PostgreSQL", "Firebase", "Redis",
        "REST APIs", "GraphQL", "Microservices", "System Design",
        "Git", "Agile", "Project Management", "UI/UX Design",
        "Figma", "Photoshop", "Game Development", "Unity", "Unreal Engine",
        "Blockchain", "Web3", "Smart Contracts", "Solidity",
        "Cybersecurity", "Penetration Testing", "Networking"
    ]
    
    print("Seeding skills...")
    
    # Use skill name as document ID to prevent duplicates
    for skill in skills:
        doc_id = skill.lower().replace(" ", "_").replace("/", "_")
        db.collection(SKILLS_COLLECTION).document(doc_id).set({
            "name": skill
        })
        print(f"  ✓ Added: {skill}")
    
    print(f"✅ Added {len(skills)} skills\n")

def seed_universities():
    """Fetch and add USA universities from public API"""
    print("Fetching USA universities from API...")
    
    try:
        # Fetch universities from public API with better configuration
        url = "http://universities.hipolabs.com/search?country=United%20States"
        
        # Create session for better connection handling
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'CollabCore/1.0',
            'Accept': 'application/json',
            'Connection': 'close'
        })
        
        # Make request with retries and longer timeout
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"  Attempt {attempt + 1}/{max_retries}...")
                response = session.get(url, timeout=60, stream=False)
                response.raise_for_status()
                
                # Parse JSON
                universities_data = response.json()
                print(f"  ✓ Successfully fetched {len(universities_data)} universities from API\n")
                break
                
            except (requests.exceptions.Timeout, requests.exceptions.ChunkedEncodingError) as e:
                print(f"  ⚠ Attempt {attempt + 1} failed: {type(e).__name__}")
                if attempt == max_retries - 1:
                    raise
                print(f"  Retrying...")
                continue
        
        print("Seeding universities to Firestore...")
        
        # Sort by name for better organization
        universities_data.sort(key=lambda x: x["name"])
        
        count = 0
        for uni_data in universities_data:
            # Use university name as document ID to prevent duplicates
            doc_id = uni_data["name"].lower().replace(" ", "_").replace(",", "").replace(".", "")[:100]
            
            university = {
                "name": uni_data["name"],
                "state_province": uni_data.get("state-province"),
                "country": uni_data["country"],
                "domains": uni_data.get("domains", []),
                "web_pages": uni_data.get("web_pages", [])
            }
            
            db.collection(UNIVERSITIES_COLLECTION).document(doc_id).set(university)
            count += 1
            
            # Print progress every 100 universities
            if count % 100 == 0:
                print(f"  ✓ Added {count} universities...")
        
        print(f"✅ Successfully added {count} USA universities\n")
        
    except Exception as e:
        print(f"❌ Error fetching universities from API: {e}")
        print("Falling back to curated list of major universities...\n")
        
        # Fallback to a better curated list of major universities
        major_universities = [
            # Ivy League
            {"name": "Harvard University", "state": "Massachusetts"},
            {"name": "Yale University", "state": "Connecticut"},
            {"name": "Princeton University", "state": "New Jersey"},
            {"name": "Columbia University", "state": "New York"},
            {"name": "University of Pennsylvania", "state": "Pennsylvania"},
            {"name": "Brown University", "state": "Rhode Island"},
            {"name": "Dartmouth College", "state": "New Hampshire"},
            {"name": "Cornell University", "state": "New York"},
            
            # Top Tech Schools
            {"name": "Massachusetts Institute of Technology", "state": "Massachusetts"},
            {"name": "Stanford University", "state": "California"},
            {"name": "California Institute of Technology", "state": "California"},
            {"name": "Carnegie Mellon University", "state": "Pennsylvania"},
            {"name": "Georgia Institute of Technology", "state": "Georgia"},
            
            # UC System
            {"name": "University of California, Berkeley", "state": "California"},
            {"name": "University of California, Los Angeles", "state": "California"},
            {"name": "University of California, San Diego", "state": "California"},
            {"name": "University of California, Irvine", "state": "California"},
            {"name": "University of California, Santa Barbara", "state": "California"},
            {"name": "University of California, Davis", "state": "California"},
            
            # Other Top Universities
            {"name": "University of Chicago", "state": "Illinois"},
            {"name": "Northwestern University", "state": "Illinois"},
            {"name": "Duke University", "state": "North Carolina"},
            {"name": "Johns Hopkins University", "state": "Maryland"},
            {"name": "University of Michigan", "state": "Michigan"},
            {"name": "University of Washington", "state": "Washington"},
            {"name": "University of Texas at Austin", "state": "Texas"},
            {"name": "University of Illinois Urbana-Champaign", "state": "Illinois"},
            {"name": "University of Wisconsin-Madison", "state": "Wisconsin"},
            {"name": "University of Maryland", "state": "Maryland"},
            {"name": "Purdue University", "state": "Indiana"},
            {"name": "University of Southern California", "state": "California"},
            {"name": "New York University", "state": "New York"},
            {"name": "Boston University", "state": "Massachusetts"},
            {"name": "Northeastern University", "state": "Massachusetts"},
            
            # State Flagships
            {"name": "University of Virginia", "state": "Virginia"},
            {"name": "University of North Carolina at Chapel Hill", "state": "North Carolina"},
            {"name": "University of Florida", "state": "Florida"},
            {"name": "Ohio State University", "state": "Ohio"},
            {"name": "Penn State University", "state": "Pennsylvania"},
            {"name": "University of Minnesota", "state": "Minnesota"},
            {"name": "University of Colorado Boulder", "state": "Colorado"},
            {"name": "Arizona State University", "state": "Arizona"},
        ]
        
        print("Seeding curated list of major universities...")
        for uni in major_universities:
            # Use university name as document ID to prevent duplicates
            doc_id = uni["name"].lower().replace(" ", "_").replace(",", "")[:100]
            
            db.collection(UNIVERSITIES_COLLECTION).document(doc_id).set({
                "name": uni["name"],
                "state_province": uni["state"],
                "country": "United States"
            })
            print(f"  ✓ Added: {uni['name']}")
        
        print(f"✅ Added {len(major_universities)} major universities (fallback)\n")

def seed_categories():
    """Add project categories"""
    categories = [
        {
            "id": "ai_ml",
            "name": "AI/ML",
            "description": "Artificial Intelligence and Machine Learning projects",
            "icon": "🤖"
        },
        {
            "id": "web_dev",
            "name": "Web Development",
            "description": "Full-stack web applications and websites",
            "icon": "🌐"
        },
        {
            "id": "mobile",
            "name": "Mobile",
            "description": "iOS and Android mobile applications",
            "icon": "📱"
        },
        {
            "id": "game_dev",
            "name": "Game Development",
            "description": "Video games and interactive experiences",
            "icon": "🎮"
        },
        {
            "id": "data_science",
            "name": "Data Science",
            "description": "Data analysis, visualization, and insights",
            "icon": "📊"
        },
        {
            "id": "blockchain",
            "name": "Blockchain",
            "description": "Web3, DeFi, and blockchain applications",
            "icon": "⛓️"
        },
        {
            "id": "devops",
            "name": "DevOps",
            "description": "Infrastructure, deployment, and automation",
            "icon": "🔧"
        },
        {
            "id": "cybersecurity",
            "name": "Cybersecurity",
            "description": "Security tools and ethical hacking",
            "icon": "🔒"
        },
        {
            "id": "iot",
            "name": "IoT",
            "description": "Internet of Things and hardware projects",
            "icon": "📡"
        },
        {
            "id": "other",
            "name": "Other",
            "description": "Other types of projects",
            "icon": "💡"
        }
    ]
    
    print("Seeding categories...")
    for category in categories:
        # Use category ID as document ID to prevent duplicates
        doc_id = category.pop("id")
        db.collection(CATEGORIES_COLLECTION).document(doc_id).set(category)
        print(f"  ✓ Added: {category['name']}")
    
    print(f"✅ Added {len(categories)} categories\n")

if __name__ == "__main__":
    print("=" * 50)
    print("CollabCore - Seeding Static Data")
    print("=" * 50)
    print()
    
    # Check for command line arguments
    clear_data = "--clear" in sys.argv
    force = "--force" in sys.argv
    
    if clear_data:
        if not force:
            print("⚠️  WARNING: This will DELETE all existing data in:")
            print("  - Skills collection")
            print("  - Universities collection")
            print("  - Categories collection")
            print()
            confirm = input("Are you sure? Type 'yes' to continue: ")
            if confirm.lower() != "yes":
                print("❌ Aborted.")
                sys.exit(0)
        
        clear_collection(SKILLS_COLLECTION)
        clear_collection(UNIVERSITIES_COLLECTION)
        clear_collection(CATEGORIES_COLLECTION)
    else:
        print("ℹ️  Running in UPSERT mode - will update existing documents")
        print("   Use --clear flag to delete all data first")
        print()
    
    try:
        seed_skills()
        seed_universities()
        seed_categories()
        
        print("=" * 50)
        print("✅ All data seeded successfully!")
        print("=" * 50)
        print()
        if not clear_data:
            print("💡 Tip: Run with --clear flag to delete existing data first:")
            print("   python seed_data.py --clear")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Make sure your Firebase credentials are set up correctly.")