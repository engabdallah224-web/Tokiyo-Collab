# CollabCore FastAPI + Firebase Setup Guide

## 🎯 What You're Building

- **Backend**: FastAPI (handles all API requests)
- **Auth**: Firebase Authentication (no custom JWT logic needed)
- **Database**: Firestore (no PostgreSQL hosting needed)
- **No Pinecone**: Removed vector search complexity

---

## 🚀 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name it **"CollabCore"**
4. Disable Google Analytics (optional)
5. Click **"Create project"**

---

## 🔑 Step 2: Get Service Account Key (Important!)

Your FastAPI backend needs this to communicate with Firebase:

1. In Firebase Console, click the **gear icon** ⚙️ > **Project settings**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** (downloads a JSON file)
5. **Rename it to `serviceAccountKey.json`**
6. **Place it in your project root** (same folder as `main.py`)

⚠️ **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore` - never commit this file!

---

## 🔐 Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Enable **Email/Password** sign-in method
4. Click **"Save"**

---

## 🗄️ Step 4: Create Firestore Database

1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Select a location close to you
5. Click **"Enable"**

---

## 📦 Step 5: Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 🏃 Step 6: Run Your API

```bash
uvicorn main:app --reload
```

Your API will be running at: **http://localhost:8000**

Check the API docs at: **http://localhost:8000/docs** (automatic Swagger UI!)

---

## 📁 Project Structure

```
collabcore-backend/
├── main.py                    # FastAPI app with all endpoints
├── firebase_config.py         # Firebase initialization
├── serviceAccountKey.json     # Your Firebase credentials (DON'T COMMIT!)
├── requirements.txt           # Python dependencies
├── .gitignore                # Add serviceAccountKey.json here
└── SETUP_GUIDE.md            # This file
```

---

## 🔌 API Endpoints

### Authentication

#### **POST** `/api/auth/signup`
Create a new user account

```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "university": "MIT",
  "skills": ["Python", "React", "AI"],
  "bio": "Love building projects!",
  "role": "student"
}
```

**Role options:**
- `"student"` - Can join projects
- `"project_leader"` - Can create projects
- `"both"` - Can both create and join projects
- **Default:** `"student"` (if not provided)
```

#### **POST** `/api/auth/login`
Login user (returns user info)

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### **GET** `/api/auth/me`
Get current user profile (requires Bearer token)

**Headers**: `Authorization: Bearer <firebase-id-token>`

---

### Posts

#### **POST** `/api/posts`
Create a new project post (requires authentication)

**Headers**: `Authorization: Bearer <firebase-id-token>`

```json
{
  "title": "AI Chatbot Project",
  "description": "Building a chatbot with GPT-4",
  "required_skills": ["Python", "Machine Learning"],
  "category": "AI/ML",
  "team_size": 4
}
```

#### **GET** `/api/posts`
Get all posts with optional filters

**Query params**: 
- `status` (optional): `open`, `in-progress`, `completed`
- `category` (optional): `AI/ML`, `Web Dev`, etc.
- `limit` (optional): default 20

Example: `GET /api/posts?status=open&category=AI/ML&limit=10`

#### **GET** `/api/posts/{post_id}`
Get a single post by ID

#### **GET** `/api/posts/user/{user_id}`
Get all posts by a specific user

---

## 🧪 Testing with curl

### 1. Sign up a new user

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User",
    "university": "MIT",
    "skills": ["Python", "FastAPI"],
    "role": "both"
  }'
```

### 2. Create a post (requires token from frontend)

First, get the Firebase ID token from your frontend, then:

```bash
curl -X POST http://localhost:8000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "title": "Cool AI Project",
    "description": "Building something awesome",
    "required_skills": ["Python", "ML"],
    "team_size": 3
  }'
```

### 3. Get all posts

```bash
curl http://localhost:8000/api/posts
```

---

## 🎨 Frontend Integration

### How Authentication Works:

1. **Frontend** uses Firebase SDK to sign up/login users
2. **Frontend** gets Firebase ID token: `user.getIdToken()`
3. **Frontend** sends token in Authorization header to your API
4. **Backend** verifies token and processes request

### Example Frontend Code (React):

```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

// Login
const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  
  // Now use this token to call your FastAPI backend
  const response = await fetch('http://localhost:8000/api/posts', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

// Create post
const createPost = async (postData) => {
  const token = await auth.currentUser.getIdToken();
  
  const response = await fetch('http://localhost:8000/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(postData)
  });
};
```

---

## 🔒 Security (For Later)

When ready to deploy, update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.author_id;
    }
  }
}
```

---

## ✅ What You Have Now

✅ FastAPI backend with clean endpoints  
✅ Firebase Auth (no custom JWT logic)  
✅ Firestore database (no PostgreSQL hosting)  
✅ Working signup, login, and posts endpoints  
✅ Automatic API documentation at `/docs`  
✅ Token-based authentication  
✅ Zero backend hosting costs (Firebase free tier)  

---

## 🎉 Next Steps

1. ✅ Backend is ready!
2. Build your React frontend
3. Connect frontend to these API endpoints
4. Add more features (applications, teams, chat)

**Your API is ready to use!** 🚀