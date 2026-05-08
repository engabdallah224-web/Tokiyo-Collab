import mockData from './mockData.json';

/**
 * Mock Data Helper
 * 
 * This file provides easy access to mock data for development.
 * Replace these functions with actual API calls when backend is ready.
 */

// Users
export const getUsers = () => mockData.users;
export const getUserById = (id) => mockData.users.find(user => user.id === id);
export const getUsersByUniversity = (university) => 
  mockData.users.filter(user => user.university === university);

// Projects
export const getProjects = () => mockData.projects;
export const getProjectById = (id) => mockData.projects.find(project => project.id === id);
export const getProjectsByStatus = (status) => 
  mockData.projects.filter(project => project.status === status);
export const getProjectsByCategory = (category) =>
  mockData.projects.filter(project => project.category === category);
export const getProjectsByOwner = (ownerId) =>
  mockData.projects.filter(project => project.owner_id === ownerId);

// Applications
export const getApplications = () => mockData.applications;
export const getApplicationById = (id) => 
  mockData.applications.find(app => app.id === id);
export const getApplicationsByProject = (projectId) =>
  mockData.applications.filter(app => app.project_id === projectId);
export const getApplicationsByUser = (userId) =>
  mockData.applications.filter(app => app.user_id === userId);
export const getPendingApplications = (projectId) =>
  mockData.applications.filter(app => 
    app.project_id === projectId && app.status === 'pending'
  );

// My Projects
export const getMyLeadingProjects = () => mockData.myProjects.leading;
export const getMyCollaboratingProjects = () => mockData.myProjects.collaborating;

// Skills & Universities
export const getSkills = () => mockData.skills;
export const getUniversities = () => mockData.universities;

// Categories & Statuses
export const getCategories = () => mockData.categories;
export const getProjectStatuses = () => mockData.projectStatuses;
export const getApplicationStatuses = () => mockData.applicationStatuses;
export const getDifficulties = () => mockData.difficulties;

// Search & Filter
export const searchProjects = (query) => {
  const lowerQuery = query.toLowerCase();
  return mockData.projects.filter(project =>
    project.title.toLowerCase().includes(lowerQuery) ||
    project.description.toLowerCase().includes(lowerQuery) ||
    project.required_skills.some(skill => skill.toLowerCase().includes(lowerQuery)) ||
    project.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const searchUsers = (query) => {
  const lowerQuery = query.toLowerCase();
  return mockData.users.filter(user =>
    user.full_name.toLowerCase().includes(lowerQuery) ||
    user.university.toLowerCase().includes(lowerQuery) ||
    user.skills.some(skill => skill.toLowerCase().includes(lowerQuery))
  );
};

export const filterProjects = (filters) => {
  let filtered = [...mockData.projects];
  
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(p => p.status === filters.status);
  }
  
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  
  if (filters.skills && filters.skills.length > 0) {
    filtered = filtered.filter(p =>
      filters.skills.some(skill => p.required_skills.includes(skill))
    );
  }
  
  if (filters.university) {
    filtered = filtered.filter(p => p.owner.university === filters.university);
  }
  
  if (filters.difficulty) {
    filtered = filtered.filter(p => p.difficulty === filters.difficulty);
  }
  
  return filtered;
};

// Statistics
export const getProjectStats = () => {
  const projects = mockData.projects;
  return {
    total: projects.length,
    recruiting: projects.filter(p => p.status === 'recruiting').length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalStudents: mockData.users.length,
  };
};

export default mockData;

