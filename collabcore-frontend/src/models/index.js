/**
 * Data Models and Type Definitions
 * Centralized model definitions for the CollabCore application
 */

// ============ USER MODELS ============

export const UserRole = {
  STUDENT: 'student',
  PROJECT_LEADER: 'project_leader',
  BOTH: 'both'
};

export const UserStatus = {
  ONLINE: 'online',
  AWAY: 'away',
  OFFLINE: 'offline',
  BUSY: 'busy'
};

export class User {
  constructor(data = {}) {
    this.uid = data.uid || '';
    this.email = data.email || '';
    this.full_name = data.full_name || '';
    this.university = data.university || '';
    this.bio = data.bio || '';
    this.skills = data.skills || [];
    this.role = data.role || UserRole.STUDENT;
    this.rating = data.rating || 0.0;
    this.projects_count = data.projects_count || 0;
    this.projects_completed = data.projects_completed || 0;
    this.avatar_url = data.avatar_url || null;
    this.status = data.status || UserStatus.OFFLINE;
    this.last_seen = data.last_seen || null;
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
  }

  getInitials() {
    if (!this.full_name) return 'U';
    const parts = this.full_name.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  isOnline() {
    return this.status === UserStatus.ONLINE;
  }

  canCreateProjects() {
    return this.role === UserRole.PROJECT_LEADER || this.role === UserRole.BOTH;
  }

  canJoinProjects() {
    return this.role === UserRole.STUDENT || this.role === UserRole.BOTH;
  }
}

// ============ PROJECT MODELS ============

export const ProjectStatus = {
  RECRUITING: 'recruiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled'
};

export const ProjectDifficulty = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
};

export const ProjectCategory = {
  AI_ML: 'artificial_intelligence',
  WEB_DEV: 'web_development',
  MOBILE: 'mobile_app',
  DATA_SCIENCE: 'data_science',
  GAME_DEV: 'game_development',
  BLOCKCHAIN: 'blockchain',
  IOT: 'iot',
  OTHER: 'other'
};

export class Project {
  constructor(data = {}) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.owner_id = data.owner_id || '';
    this.owner = data.owner || {};
    this.required_skills = data.required_skills || [];
    this.team_size_limit = data.team_size_limit || 5;
    this.current_team_size = data.current_team_size || 1;
    this.status = data.status || ProjectStatus.RECRUITING;
    this.tags = data.tags || [];
    this.category = data.category || ProjectCategory.OTHER;
    this.difficulty = data.difficulty || ProjectDifficulty.INTERMEDIATE;
    this.duration = data.duration || '3-6 months';
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
    this.team_members = data.team_members || [];
    this.pending_applications = data.pending_applications || 0;
  }

  isRecruiting() {
    return this.status === ProjectStatus.RECRUITING;
  }

  isActive() {
    return this.status === ProjectStatus.ACTIVE;
  }

  hasSpace() {
    return this.current_team_size < this.team_size_limit;
  }

  getTeamProgress() {
    return (this.current_team_size / this.team_size_limit) * 100;
  }

  getCategoryDisplay() {
    return this.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getDifficultyDisplay() {
    return this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
  }
}

// ============ APPLICATION MODELS ============

export const ApplicationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

export class Application {
  constructor(data = {}) {
    this.id = data.id || '';
    this.project_id = data.project_id || '';
    this.user_id = data.user_id || '';
    this.user = data.user || {};
    this.message = data.message || '';
    this.status = data.status || ApplicationStatus.PENDING;
    this.applied_at = data.applied_at || '';
    this.reviewed_at = data.reviewed_at || null;
    this.reviewer_notes = data.reviewer_notes || null;
    this.match_score = data.match_score || 0;
  }

  isPending() {
    return this.status === ApplicationStatus.PENDING;
  }

  isAccepted() {
    return this.status === ApplicationStatus.ACCEPTED;
  }

  isRejected() {
    return this.status === ApplicationStatus.REJECTED;
  }

  getAppliedTimeAgo() {
    if (!this.applied_at) return 'Unknown';
    const now = new Date();
    const applied = new Date(this.applied_at);
    const diffInHours = Math.floor((now - applied) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return applied.toLocaleDateString();
  }
}

// ============ MESSAGE MODELS ============

export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system'
};

export class Message {
  constructor(data = {}) {
    this.id = data.id || '';
    this.project_id = data.project_id || '';
    this.user_id = data.user_id || '';
    this.user = data.user || {};
    this.content = data.content || '';
    this.type = data.type || MessageType.TEXT;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.edited = data.edited || false;
    this.reactions = data.reactions || [];
    this.reply_to = data.reply_to || null;
    this.attachments = data.attachments || [];
  }

  isText() {
    return this.type === MessageType.TEXT;
  }

  isImage() {
    return this.type === MessageType.IMAGE;
  }

  isFile() {
    return this.type === MessageType.FILE;
  }

  isSystem() {
    return this.type === MessageType.SYSTEM;
  }

  getTimeDisplay() {
    const date = new Date(this.timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getDateDisplay() {
    const date = new Date(this.timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString();
  }
}

// ============ NOTIFICATION MODELS ============

export const NotificationType = {
  APPLICATION: 'application',
  APPLICATION_ACCEPTED: 'application_accepted',
  APPLICATION_REJECTED: 'application_rejected',
  PROJECT_UPDATE: 'project_update',
  MESSAGE: 'message',
  CALL: 'call',
  SYSTEM: 'system'
};

export const NotificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
  ARCHIVED: 'archived'
};

export class Notification {
  constructor(data = {}) {
    this.id = data.id || '';
    this.user_id = data.user_id || '';
    this.type = data.type || NotificationType.SYSTEM;
    this.title = data.title || '';
    this.message = data.message || '';
    this.status = data.status || NotificationStatus.UNREAD;
    this.data = data.data || {};
    this.created_at = data.created_at || '';
    this.read_at = data.read_at || null;
  }

  isUnread() {
    return this.status === NotificationStatus.UNREAD;
  }

  isRead() {
    return this.status === NotificationStatus.READ;
  }

  getTimeAgo() {
    const now = new Date();
    const created = new Date(this.created_at);
    const diffInMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
}

// ============ UTILITY FUNCTIONS ============

export const ModelUtils = {
  // Create instances from API responses
  createUser: (data) => new User(data),
  createProject: (data) => new Project(data),
  createApplication: (data) => new Application(data),
  createMessage: (data) => new Message(data),
  createNotification: (data) => new Notification(data),

  // Validate required fields
  validateUser: (user) => {
    const required = ['uid', 'email', 'full_name', 'university'];
    return required.every(field => user[field]);
  },

  validateProject: (project) => {
    const required = ['title', 'description', 'owner_id'];
    return required.every(field => project[field]);
  },

  validateApplication: (application) => {
    const required = ['project_id', 'user_id', 'message'];
    return required.every(field => application[field]);
  },

  // Format data for API
  formatForAPI: (instance) => {
    if (instance instanceof User) {
      const { uid, email, full_name, university, bio, skills, role, avatar_url } = instance;
      return { uid, email, full_name, university, bio, skills, role, avatar_url };
    }
    if (instance instanceof Project) {
      const { title, description, required_skills, team_size_limit, tags, category, difficulty, duration } = instance;
      return { title, description, required_skills, team_size_limit, tags, category, difficulty, duration };
    }
    if (instance instanceof Application) {
      const { project_id, message } = instance;
      return { project_id, message };
    }
    return instance;
  }
};

export default {
  User,
  Project,
  Application,
  Message,
  Notification,
  UserRole,
  UserStatus,
  ProjectStatus,
  ProjectDifficulty,
  ProjectCategory,
  ApplicationStatus,
  MessageType,
  NotificationType,
  NotificationStatus,
  ModelUtils
};
