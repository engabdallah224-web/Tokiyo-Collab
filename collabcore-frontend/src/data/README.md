# CollabCore Mock Data

This directory contains centralized mock data and utilities for development. Use this data structure to guide your backend API development.

## 📁 Files

- **`mockData.json`** - Complete sample data for all entities
- **`index.js`** - Helper functions to access mock data
- **`types.js`** - JSDoc type definitions for IDE support
- **`README.md`** - This file

## 🚀 Usage

### Import Data in Components

```javascript
import { 
  getProjects, 
  getUsers, 
  searchProjects,
  filterProjects 
} from '../data';

function MyComponent() {
  const projects = getProjects();
  const users = getUsers();
  
  return (
    // Your component JSX
  );
}
```

### Example: Using in SearchPage

```javascript
import { useState, useEffect } from 'react';
import { getProjects, getUsers, searchProjects, searchUsers } from '../data';

function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectResults, setProjectResults] = useState([]);
  const [userResults, setUserResults] = useState([]);

  useEffect(() => {
    if (searchQuery) {
      setProjectResults(searchProjects(searchQuery));
      setUserResults(searchUsers(searchQuery));
    } else {
      setProjectResults(getProjects());
      setUserResults(getUsers());
    }
  }, [searchQuery]);

  return (
    // Your component JSX
  );
}
```

### Example: Using Filters

```javascript
import { filterProjects } from '../data';

function DiscoveryPage() {
  const [filters, setFilters] = useState({
    status: 'recruiting',
    skills: ['React', 'Python'],
    university: 'Stanford University'
  });

  const projects = filterProjects(filters);

  return (
    // Your component JSX
  );
}
```

## 📊 Data Structure

### User Object

```javascript
{
  "id": 1,
  "full_name": "Sarah Chen",
  "email": "sarah.chen@stanford.edu",
  "university": "Stanford University",
  "bio": "Full-stack developer passionate about AI...",
  "avatar_url": null,
  "role": "project_leader", // or "student"
  "skills": ["Python", "Machine Learning", "React"],
  "projects_count": 5,
  "rating": 4.9,
  "created_at": "2024-01-10T00:00:00Z"
}
```

### Project Object

```javascript
{
  "id": 1,
  "title": "AI Study Assistant",
  "description": "Building an intelligent study assistant...",
  "owner_id": 1,
  "owner": {
    "id": 1,
    "full_name": "Sarah Chen",
    "university": "Stanford University",
    "email": "sarah.chen@stanford.edu"
  },
  "required_skills": ["Python", "Machine Learning", "FastAPI"],
  "team_size_limit": 5,
  "current_team_size": 3,
  "status": "recruiting", // or "active", "completed", "on_hold"
  "created_at": "2024-01-15T00:00:00Z",
  "updated_at": "2024-01-20T00:00:00Z",
  "tags": ["AI", "Education", "ML"],
  "category": "artificial_intelligence",
  "difficulty": "intermediate", // or "beginner", "advanced"
  "duration": "3-6 months"
}
```

### Application Object

```javascript
{
  "id": 1,
  "project_id": 1,
  "user_id": 4,
  "user": {
    "id": 4,
    "full_name": "Emma Williams",
    "email": "emma@harvard.edu",
    "university": "Harvard University",
    "skills": ["Python", "FastAPI", "React"],
    "rating": 4.9
  },
  "message": "I have 2 years of experience...",
  "status": "pending", // or "accepted", "rejected", "withdrawn"
  "applied_at": "2024-01-21T14:30:00Z",
  "reviewed_at": null,
  "reviewer_notes": null
}
```

## 🔌 Backend API Integration

When integrating with your backend, replace the helper functions with API calls:

### Example: Convert to API Calls

**Before (Mock Data):**
```javascript
import { getProjects } from '../data';

const projects = getProjects();
```

**After (API Call):**
```javascript
import api from '../services/api';

const projects = await api.get('/projects');
```

### Recommended API Endpoints

Based on the mock data structure, here are the recommended REST API endpoints:

#### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `GET /api/projects?status=recruiting` - Filter projects by status
- `GET /api/projects?category=ai` - Filter projects by category
- `GET /api/projects/search?q=machine%20learning` - Search projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Applications
- `GET /api/applications` - Get all applications
- `GET /api/applications/:id` - Get application by ID
- `GET /api/projects/:projectId/applications` - Get applications for a project
- `GET /api/users/:userId/applications` - Get applications by a user
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id` - Update application status
- `DELETE /api/applications/:id` - Delete/withdraw application

#### My Projects
- `GET /api/me/projects/leading` - Get projects I'm leading
- `GET /api/me/projects/collaborating` - Get projects I'm collaborating on

#### Static Data
- `GET /api/skills` - Get list of all skills
- `GET /api/universities` - Get list of universities
- `GET /api/categories` - Get project categories
- `GET /api/stats` - Get platform statistics

## 📝 Available Helper Functions

### Users
- `getUsers()` - Get all users
- `getUserById(id)` - Get user by ID
- `getUsersByUniversity(university)` - Get users from specific university

### Projects
- `getProjects()` - Get all projects
- `getProjectById(id)` - Get project by ID
- `getProjectsByStatus(status)` - Get projects by status
- `getProjectsByCategory(category)` - Get projects by category
- `getProjectsByOwner(ownerId)` - Get projects by owner

### Applications
- `getApplications()` - Get all applications
- `getApplicationById(id)` - Get application by ID
- `getApplicationsByProject(projectId)` - Get applications for a project
- `getApplicationsByUser(userId)` - Get applications by a user
- `getPendingApplications(projectId)` - Get pending applications for a project

### My Projects
- `getMyLeadingProjects()` - Get projects I'm leading
- `getMyCollaboratingProjects()` - Get projects I'm collaborating on

### Static Data
- `getSkills()` - Get all available skills
- `getUniversities()` - Get all universities
- `getCategories()` - Get project categories
- `getProjectStatuses()` - Get project status options
- `getApplicationStatuses()` - Get application status options
- `getDifficulties()` - Get difficulty levels

### Search & Filter
- `searchProjects(query)` - Search projects by text
- `searchUsers(query)` - Search users by text
- `filterProjects(filters)` - Filter projects with multiple criteria
- `getProjectStats()` - Get platform statistics

## 🔄 Migration Guide

1. **Development Phase**: Use mock data helper functions
2. **Integration Phase**: Create API service wrapper
3. **Production Phase**: Replace all mock data calls with API calls

### Create API Service Wrapper

Create `src/services/apiWrapper.js`:

```javascript
import api from './api';
import * as mockData from '../data';

const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

export const getProjects = async () => {
  if (USE_MOCK_DATA) {
    return mockData.getProjects();
  }
  const response = await api.get('/projects');
  return response.data;
};

// Add similar wrappers for other functions
```

Then use environment variables to switch between mock and real data:
```bash
# .env.development
REACT_APP_USE_MOCK_DATA=true

# .env.production
REACT_APP_USE_MOCK_DATA=false
```

## 💡 Tips

1. **IDE Support**: The `types.js` file provides JSDoc definitions. Your IDE will show type hints!
2. **Consistency**: Use the same data structure in your backend API responses
3. **Extensibility**: Add more fields to `mockData.json` as needed
4. **Testing**: Use this data for unit and integration tests

## 🐛 Troubleshooting

**Q: Import errors?**
A: Make sure you're importing from the correct path: `import { getProjects } from '../data'`

**Q: Type hints not working?**
A: Add JSDoc comments to your functions:
```javascript
/** @type {import('../data/types').Project[]} */
const projects = getProjects();
```

**Q: Need to add new fields?**
A: Add them to `mockData.json` and update the JSDoc types in `types.js`

