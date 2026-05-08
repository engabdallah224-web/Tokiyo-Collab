// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Auth Token Keys
export const ACCESS_TOKEN_KEY = 'firebase_id_token';
export const REFRESH_TOKEN_KEY = 'firebase_refresh_token';

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  PROJECT_LEADER: 'project_leader',
};

// Project Status
export const PROJECT_STATUS = {
  RECRUITING: 'recruiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

// Task Status
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  SYSTEM: 'system',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  APPLICATION: 'application',
  ACCEPTED: 'accepted',
  MESSAGE: 'message',
  TASK: 'task',
};

