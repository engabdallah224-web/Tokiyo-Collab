"""
Seed test users and projects for CollabCore
Creates 50 test users, each with 1-3 projects
Run: python seed_test_data.py
"""

import random
from datetime import datetime, timedelta
from firebase_admin import auth, firestore
from firebase_config import db, USERS_COLLECTION, PROJECTS_COLLECTION, APPLICATIONS_COLLECTION

# Test user credentials
TEST_EMAIL_PATTERN = "test{}@collabcore.dev"
TEST_PASSWORD = "testpass123"

# Sample data for generating realistic content
FIRST_NAMES = [
    "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery",
    "Quinn", "Reese", "Drew", "Cameron", "Jamie", "Dakota", "Skylar", "Sage",
    "Rowan", "Blake", "Hayden", "Finley", "Charlie", "Parker", "River", "Phoenix",
    "Aria", "Luna", "Nova", "Zara", "Maya", "Ella", "Sophia", "Emma",
    "Olivia", "Ava", "Isabella", "Mia", "Liam", "Noah", "Oliver", "Ethan",
    "Lucas", "Mason", "Logan", "James", "Benjamin", "William", "Henry", "Jack"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White",
    "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
    "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell"
]

UNIVERSITIES = [
    "MIT", "Stanford University", "Harvard University", "UC Berkeley",
    "Carnegie Mellon University", "Georgia Institute of Technology",
    "University of Michigan", "University of Washington", "UT Austin",
    "UCLA", "UC San Diego", "Columbia University", "Cornell University",
    "Princeton University", "Yale University", "Duke University",
    "Northwestern University", "NYU", "Boston University", "USC"
]

SKILLS = [
    "Python", "JavaScript", "React", "Node.js", "Java", "C++", "TypeScript",
    "Machine Learning", "Deep Learning", "AI", "Data Science",
    "React Native", "Flutter", "iOS Development", "Android Development",
    "AWS", "Docker", "Kubernetes", "MongoDB", "PostgreSQL", "Firebase",
    "REST APIs", "GraphQL", "UI/UX Design", "Figma", "Game Development",
    "Unity", "Blockchain", "Web3", "Cybersecurity"
]

PROJECT_TEMPLATES = [
    {
        "title": "AI-Powered Study Assistant",
        "description": "Building an intelligent study companion that uses GPT-4 to help students learn more effectively through personalized quizzes, summaries, and spaced repetition.",
        "skills": ["Python", "Machine Learning", "AI", "React", "FastAPI"],
        "category": "AI/ML",
        "difficulty": "intermediate",
        "duration": "3 months"
    },
    {
        "title": "Campus Event Finder",
        "description": "A mobile app that aggregates all campus events, clubs, and activities in one place with personalized recommendations based on interests.",
        "skills": ["React Native", "Node.js", "MongoDB", "UI/UX Design"],
        "category": "Mobile",
        "difficulty": "beginner",
        "duration": "2 months"
    },
    {
        "title": "Blockchain Voting System",
        "description": "Decentralized voting platform for student government elections using blockchain technology to ensure transparency and security.",
        "skills": ["Blockchain", "Web3", "Solidity", "React", "Smart Contracts"],
        "category": "Blockchain",
        "difficulty": "advanced",
        "duration": "4 months"
    },
    {
        "title": "Sustainable Campus Tracker",
        "description": "Track and gamify sustainable behaviors on campus - recycling, energy usage, transportation choices. Compete with other students!",
        "skills": ["React", "Node.js", "PostgreSQL", "Data Visualization"],
        "category": "Web Development",
        "difficulty": "intermediate",
        "duration": "3 months"
    },
    {
        "title": "AR Museum Tour Guide",
        "description": "Augmented reality app that brings museum exhibits to life with interactive 3D models and historical information.",
        "skills": ["Unity", "C#", "AR Development", "3D Modeling"],
        "category": "Game Development",
        "difficulty": "advanced",
        "duration": "5 months"
    },
    {
        "title": "Mental Health Check-in Bot",
        "description": "Friendly chatbot that helps students track their mental health, provides resources, and connects them with campus counseling services.",
        "skills": ["Python", "NLP", "React", "MongoDB"],
        "category": "AI/ML",
        "difficulty": "intermediate",
        "duration": "2 months"
    },
    {
        "title": "Automated Code Review Tool",
        "description": "AI-powered tool that reviews student code submissions, provides feedback, and suggests improvements using machine learning.",
        "skills": ["Python", "Machine Learning", "Git", "REST APIs"],
        "category": "AI/ML",
        "difficulty": "advanced",
        "duration": "4 months"
    },
    {
        "title": "Food Waste Reduction Platform",
        "description": "Connect students with leftover meal plan swipes to those who need them, and help dining halls donate excess food.",
        "skills": ["React", "Node.js", "Firebase", "Mobile Development"],
        "category": "Web Development",
        "difficulty": "beginner",
        "duration": "2 months"
    },
    {
        "title": "IoT Smart Dorm System",
        "description": "Integrate IoT devices to create smart dorm rooms - automated lighting, temperature control, and security.",
        "skills": ["IoT", "Python", "Raspberry Pi", "React"],
        "category": "IoT",
        "difficulty": "intermediate",
        "duration": "4 months"
    },
    {
        "title": "Student Job Marketplace",
        "description": "Platform connecting students with on-campus and local part-time jobs, internships, and gig opportunities.",
        "skills": ["React", "Node.js", "PostgreSQL", "UI/UX Design"],
        "category": "Web Development",
        "difficulty": "intermediate",
        "duration": "3 months"
    },
    {
        "title": "Collaborative Note-Taking App",
        "description": "Real-time collaborative note-taking for study groups with AI-powered summaries and automatic flashcard generation.",
        "skills": ["React", "WebSockets", "MongoDB", "AI"],
        "category": "Web Development",
        "difficulty": "intermediate",
        "duration": "3 months"
    },
    {
        "title": "Campus Security Alert System",
        "description": "Real-time security alert system with geofencing, emergency contacts, and direct connection to campus police.",
        "skills": ["React Native", "Firebase", "Geolocation", "Push Notifications"],
        "category": "Mobile",
        "difficulty": "intermediate",
        "duration": "2 months"
    },
    {
        "title": "Research Paper Summarizer",
        "description": "AI tool that reads academic papers and generates concise summaries, key findings, and citation networks.",
        "skills": ["Python", "NLP", "Machine Learning", "React"],
        "category": "AI/ML",
        "difficulty": "advanced",
        "duration": "4 months"
    },
    {
        "title": "Virtual Study Room",
        "description": "Video chat platform optimized for studying together - pomodoro timers, shared whiteboards, and focus music.",
        "skills": ["React", "WebRTC", "Node.js", "Socket.io"],
        "category": "Web Development",
        "difficulty": "advanced",
        "duration": "4 months"
    },
    {
        "title": "Course Rating Analytics",
        "description": "Analyze course ratings and reviews to help students make informed decisions about their class schedule.",
        "skills": ["Python", "Data Science", "React", "Data Visualization"],
        "category": "Data Science",
        "difficulty": "intermediate",
        "duration": "2 months"
    }
]

BIOS = [
    "Passionate about building products that solve real problems. Always learning new technologies!",
    "CS major with a focus on AI/ML. Love hackathons and open source contributions.",
    "Full-stack developer interested in web3 and decentralized applications.",
    "Aspiring product manager with a technical background. Building cool stuff!",
    "Data science enthusiast. Love visualizing complex information in simple ways.",
    "Mobile-first developer. Building apps that people actually use.",
    "Security researcher and ethical hacker. Making the web safer, one bug at a time.",
    "Game developer who loves creating immersive experiences.",
    "UI/UX designer who codes. Best of both worlds!",
    "Blockchain enthusiast exploring the future of decentralized tech."
]

def generate_test_users(num_users=50):
    """Generate test users with Firebase Auth and Firestore profiles"""
    print(f"Creating {num_users} test users...\n")
    
    created_users = []
    
    for i in range(1, num_users + 1):
        try:
            email = TEST_EMAIL_PATTERN.format(i)
            full_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            
            # Create user in Firebase Auth
            try:
                user = auth.create_user(
                    email=email,
                    password=TEST_PASSWORD
                )
            except auth.EmailAlreadyExistsError:
                # If user exists, get their UID
                user = auth.get_user_by_email(email)
                print(f"  ⚠ User {i} already exists: {email}")
            
            # Random user data
            role = random.choice(["student", "project_leader", "both"])
            num_skills = random.randint(3, 7)
            user_skills = random.sample(SKILLS, num_skills)
            university = random.choice(UNIVERSITIES)
            
            # Create user profile in Firestore
            user_data = {
                "uid": user.uid,
                "email": email,
                "full_name": full_name,
                "university": university,
                "bio": random.choice(BIOS),
                "skills": user_skills,
                "role": role,
                "rating": round(random.uniform(3.5, 5.0), 1),
                "projects_count": 0,  # Will update this after creating projects
                "avatar_url": None,
                "created_at": (datetime.utcnow() - timedelta(days=random.randint(1, 90))).isoformat()
            }
            
            db.collection(USERS_COLLECTION).document(user.uid).set(user_data)
            created_users.append(user.uid)
            
            print(f"  ✓ Created user {i}: {full_name} ({email})")
            
        except Exception as e:
            print(f"  ✗ Error creating user {i}: {e}")
    
    print(f"\n✅ Successfully created {len(created_users)} users\n")
    return created_users

def generate_projects_for_users(user_ids):
    """Generate 1-3 projects for each user"""
    print("Creating projects for users...\n")
    
    total_projects = 0
    
    for user_id in user_ids:
        try:
            # Get user data
            user_doc = db.collection(USERS_COLLECTION).document(user_id).get()
            if not user_doc.exists:
                continue
            
            user_data = user_doc.to_dict()
            
            # Only create projects for project leaders and "both"
            if user_data["role"] not in ["project_leader", "both"]:
                continue
            
            # Create 1-3 projects per user
            num_projects = random.randint(1, 3)
            
            for _ in range(num_projects):
                # Pick a random project template
                template = random.choice(PROJECT_TEMPLATES)
                
                # Customize it slightly
                project_data = {
                    "title": template["title"],
                    "description": template["description"],
                    "owner_id": user_id,
                    "required_skills": template["skills"],
                    "team_size_limit": random.randint(3, 6),
                    "current_team_size": 1,
                    "status": random.choice(["recruiting", "recruiting", "recruiting", "active"]),  # 75% recruiting
                    "tags": random.sample(template["skills"], min(3, len(template["skills"]))),
                    "category": template["category"],
                    "difficulty": template["difficulty"],
                    "duration": template["duration"],
                    "created_at": (datetime.utcnow() - timedelta(days=random.randint(1, 30))).isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                # Add project to Firestore
                db.collection(PROJECTS_COLLECTION).add(project_data)
                total_projects += 1
            
            # Update user's project count
            db.collection(USERS_COLLECTION).document(user_id).update({
                "projects_count": num_projects
            })
            
            print(f"  ✓ Created {num_projects} project(s) for {user_data['full_name']}")
            
        except Exception as e:
            print(f"  ✗ Error creating projects for user: {e}")
    
    print(f"\n✅ Successfully created {total_projects} projects\n")
    return total_projects

def generate_applications(user_ids, num_applications=30):
    """Generate some applications between users and projects"""
    print(f"Creating {num_applications} test applications...\n")
    
    # Get all projects
    all_projects = list(db.collection(PROJECTS_COLLECTION).where("status", "==", "recruiting").stream())
    
    if not all_projects:
        print("  ⚠ No recruiting projects found. Skipping applications.\n")
        return 0
    
    created_apps = 0
    
    for _ in range(num_applications):
        try:
            # Random user and project
            user_id = random.choice(user_ids)
            project_doc = random.choice(all_projects)
            project_data = project_doc.to_dict()
            
            # Don't apply to own project
            if project_data["owner_id"] == user_id:
                continue
            
            # Check if already applied
            existing = db.collection(APPLICATIONS_COLLECTION) \
                .where("project_id", "==", project_doc.id) \
                .where("user_id", "==", user_id) \
                .limit(1) \
                .get()
            
            if list(existing):
                continue
            
            # Create application
            app_data = {
                "project_id": project_doc.id,
                "user_id": user_id,
                "message": random.choice([
                    "I have experience with these technologies and would love to contribute!",
                    "This project aligns perfectly with my interests. I'd be excited to join the team.",
                    "I've worked on similar projects before and can bring valuable experience.",
                    "Really passionate about this problem space. Would love to help build this!",
                    "I have the required skills and am eager to learn more. Count me in!"
                ]),
                "status": random.choice(["pending", "pending", "pending", "accepted", "rejected"]),  # 60% pending
                "applied_at": (datetime.utcnow() - timedelta(days=random.randint(0, 10))).isoformat(),
                "reviewed_at": None,
                "reviewer_notes": None
            }
            
            db.collection(APPLICATIONS_COLLECTION).add(app_data)
            created_apps += 1
            
        except Exception as e:
            print(f"  ✗ Error creating application: {e}")
    
    print(f"✅ Created {created_apps} applications\n")
    return created_apps

def main():
    print("=" * 60)
    print("CollabCore - Seed Test Data")
    print("=" * 60)
    print()
    print("This will create:")
    print("  • 50 test users (test1@collabcore.dev to test50@collabcore.dev)")
    print("  • Password for all: testpass123")
    print("  • 1-3 projects per project leader")
    print("  • 30 random applications")
    print()
    
    confirm = input("Continue? (yes/no): ")
    if confirm.lower() != "yes":
        print("❌ Aborted.")
        return
    
    print()
    
    try:
        # Create users
        user_ids = generate_test_users(50)
        
        # Create projects
        num_projects = generate_projects_for_users(user_ids)
        
        # Create applications
        num_apps = generate_applications(user_ids, 30)
        
        print("=" * 60)
        print("✅ Test data seeded successfully!")
        print("=" * 60)
        print()
        print("📊 Summary:")
        print(f"  • Users created: {len(user_ids)}")
        print(f"  • Projects created: {num_projects}")
        print(f"  • Applications created: {num_apps}")
        print()
        print("🔑 Login credentials:")
        print("  • Email: test1@collabcore.dev to test50@collabcore.dev")
        print("  • Password: testpass123")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()