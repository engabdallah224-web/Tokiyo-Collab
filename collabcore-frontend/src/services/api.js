import axios from 'axios';
import { API_BASE_URL, ACCESS_TOKEN_KEY } from '../utils/constants';
import { auth } from '../config/firebase';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        // Update localStorage with fresh token
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const user = auth.currentUser;
        if (user) {
          // Try to get a fresh token
          const token = await user.getIdToken(true); // Force refresh
          localStorage.setItem(ACCESS_TOKEN_KEY, token);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } else {
          // No user, silently reject without redirect if already on login/register
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login only if not already there
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============ AUTH ENDPOINTS ============

export const authAPI = {
  // Get current user profile
  getMe: () => api.get('/api/auth/me'),
  
  // Note: Login and signup are handled directly with Firebase Auth
  // Backend login endpoint is only used to get user profile
  loginBackend: (email) => api.post('/api/auth/login', { email }),
};

// ============ USER ENDPOINTS ============

export const userAPI = {
  // Get all users
  getUsers: (params = {}) => api.get('/api/users', { params }),
  
  // Get user by ID
  getUser: (userId) => api.get(`/api/users/${userId}`),
  
  // Update user profile
  updateUser: (userId, data) => api.put(`/api/users/${userId}`, data),
  
  // Get user applications
  getUserApplications: (userId) => api.get(`/api/users/${userId}/applications`),
};

// ============ PROJECT ENDPOINTS ============

export const projectAPI = {
  // Create project
  createProject: (data) => api.post('/api/projects', data),
  
  // Get all projects with filters
  getProjects: (params = {}) => api.get('/api/projects', { params }),
  
  // Get project by ID
  getProject: (projectId) => api.get(`/api/projects/${projectId}`),
  
  // Update project
  updateProject: (projectId, data) => api.put(`/api/projects/${projectId}`, data),
  
  // Delete project
  deleteProject: (projectId) => api.delete(`/api/projects/${projectId}`),
  
  // Get project applications
  getProjectApplications: (projectId) => api.get(`/api/projects/${projectId}/applications`),
  
  // Get my leading projects
  getMyLeadingProjects: () => api.get('/api/me/projects/leading'),
  
  // Get my collaborating projects
  getMyCollaboratingProjects: () => api.get('/api/me/projects/collaborating'),
  
  // Task management
  getTasks: (projectId, params = {}) => api.get(`/api/projects/${projectId}/tasks`, { params }),
  createTask: (projectId, data) => api.post(`/api/projects/${projectId}/tasks`, data),
  updateTask: (taskId, data) => api.put(`/api/tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/api/tasks/${taskId}`),
};

// ============ APPLICATION ENDPOINTS ============

export const applicationAPI = {
  // Create application
  createApplication: (data) => api.post('/api/applications', data),
  
  // Update application
  updateApplication: (applicationId, data) => api.put(`/api/applications/${applicationId}`, data),
  
  // Delete/withdraw application
  deleteApplication: (applicationId) => api.delete(`/api/applications/${applicationId}`),
};

// ============ SEARCH ENDPOINTS ============

export const searchAPI = {
  // Search projects
  searchProjects: (query, params = {}) => api.get('/api/search/projects', { params: { q: query, ...params } }),
  
  // Search users
  searchUsers: (query, params = {}) => api.get('/api/search/users', { params: { q: query, ...params } }),
};

// ============ MESSAGE/CHAT ENDPOINTS ============

export const messageAPI = {
  // Send message in project chat
  sendMessage: (projectId, data) => api.post(`/api/projects/${projectId}/messages`, data),
  
  // Get messages for a project
  getMessages: (projectId, params = {}) => api.get(`/api/projects/${projectId}/messages`, { params }),
  
  // Update/edit message
  updateMessage: (messageId, data) => api.put(`/api/messages/${messageId}`, data),
  
  // Delete message
  deleteMessage: (messageId) => api.delete(`/api/messages/${messageId}`),
};

// ============ STATIC DATA ENDPOINTS ============

export const staticAPI = {
  // Get all skills
  getSkills: () => api.get('/api/skills'),
  
  // Get all universities
  getUniversities: () => api.get('/api/universities'),
  
  // Get all categories
  getCategories: () => api.get('/api/categories'),
  
  // Get platform stats
  getStats: () => api.get('/api/stats'),
};

// ============ VERSION CONTROL (GITHUB/GITLAB) ============

export const vcsAPI = {
  // Connect repository to project
  connectRepository: (projectId, data) => 
    api.post(`/api/projects/${projectId}/repository`, data),
  
  // Get connected repository
  getRepository: (projectId) => 
    api.get(`/api/projects/${projectId}/repository`),
  
  // Disconnect repository
  disconnectRepository: (projectId) => 
    api.delete(`/api/projects/${projectId}/repository`),
  
  // Get commits
  getCommits: (projectId, params = {}) => 
    api.get(`/api/projects/${projectId}/repository/commits`, { params }),
  
  // Get pull requests
  getPullRequests: (projectId, params = {}) => 
    api.get(`/api/projects/${projectId}/repository/pulls`, { params }),
  
  // Get repository stats
  getStats: (projectId, accessToken) => 
    api.get(`/api/projects/${projectId}/repository/stats`, { 
      params: { access_token: accessToken } 
    }),
};

// ============ DOCUMENT COLLABORATION ============

export const documentAPI = {
  // Create document
  createDocument: (projectId, data) => 
    api.post(`/api/projects/${projectId}/documents`, data),
  
  // Get documents for project
  getDocuments: (projectId, folderId = null) => 
    api.get(`/api/projects/${projectId}/documents`, { 
      params: folderId ? { folder_id: folderId } : {} 
    }),
  
  // Get specific document
  getDocument: (documentId) => 
    api.get(`/api/documents/${documentId}`),
  
  // Update document
  updateDocument: (documentId, data) => 
    api.put(`/api/documents/${documentId}`, data),
  
  // Delete document
  deleteDocument: (documentId) => 
    api.delete(`/api/documents/${documentId}`),
  
  // Create folder
  createFolder: (projectId, data) => 
    api.post(`/api/projects/${projectId}/folders`, data),
  
  // Get folders
  getFolders: (projectId) => 
    api.get(`/api/projects/${projectId}/folders`),
};

// ============ FILE UPLOAD ============

export const uploadAPI = {
  // Upload file to Cloudinary
  uploadFile: (file, projectId) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post(`/api/upload/file?project_id=${projectId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ============ MEETINGS & CALLS ============

export const meetingAPI = {
  // Create scheduled meeting
  createMeeting: (projectId, data) => 
    api.post(`/api/projects/${projectId}/meetings`, data),
  
  // Get meetings for project
  getMeetings: (projectId, status = null) => 
    api.get(`/api/projects/${projectId}/meetings`, { 
      params: status ? { status } : {} 
    }),
  
  // Update meeting
  updateMeeting: (meetingId, data) => 
    api.put(`/api/meetings/${meetingId}`, data),
  
  // Delete meeting
  deleteMeeting: (meetingId) => 
    api.delete(`/api/meetings/${meetingId}`),
  
  // Join meeting
  joinMeeting: (meetingId) => 
    api.post(`/api/meetings/${meetingId}/join`),
  
  // Create instant call
  createInstantCall: (projectId, data) => 
    api.post(`/api/projects/${projectId}/instant-call`, data),
};

// ============ HEALTH CHECK ============

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
