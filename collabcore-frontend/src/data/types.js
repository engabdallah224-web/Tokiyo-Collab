/**
 * Type Definitions for CollabCore Data Structures
 * 
 * Use these JSDoc types for better IDE support and documentation
 */

/**
 * @typedef {Object} User
 * @property {number} id - Unique user identifier
 * @property {string} full_name - User's full name
 * @property {string} email - User's email address
 * @property {string} university - User's university
 * @property {string} bio - User's biography
 * @property {string|null} avatar_url - URL to user's avatar image
 * @property {'student'|'project_leader'} role - User's role in the platform
 * @property {string[]} skills - Array of user's skills
 * @property {number} projects_count - Number of projects user is involved in
 * @property {number} rating - User's rating (0-5)
 * @property {string} created_at - ISO 8601 datetime when user was created
 */

/**
 * @typedef {Object} UserBasic
 * @property {number} id - Unique user identifier
 * @property {string} full_name - User's full name
 * @property {string} university - User's university
 * @property {string} email - User's email address
 */

/**
 * @typedef {Object} Project
 * @property {number} id - Unique project identifier
 * @property {string} title - Project title
 * @property {string} description - Project description
 * @property {number} owner_id - ID of project owner
 * @property {UserBasic} owner - Project owner information
 * @property {string[]} required_skills - Skills required for the project
 * @property {number} team_size_limit - Maximum team size
 * @property {number} current_team_size - Current number of team members
 * @property {'recruiting'|'active'|'completed'|'on_hold'} status - Project status
 * @property {string} created_at - ISO 8601 datetime when project was created
 * @property {string} updated_at - ISO 8601 datetime when project was last updated
 * @property {string[]} tags - Project tags
 * @property {string} category - Project category ID
 * @property {'beginner'|'intermediate'|'advanced'} difficulty - Project difficulty level
 * @property {string} duration - Expected project duration
 */

/**
 * @typedef {Object} ApplicationUser
 * @property {number} id - User ID
 * @property {string} full_name - User's full name
 * @property {string} email - User's email
 * @property {string} university - User's university
 * @property {string[]} skills - User's skills
 * @property {number} rating - User's rating
 */

/**
 * @typedef {Object} Application
 * @property {number} id - Unique application identifier
 * @property {number} project_id - ID of the project applied to
 * @property {number} user_id - ID of the user who applied
 * @property {ApplicationUser} user - User who applied
 * @property {string} message - Application message
 * @property {'pending'|'accepted'|'rejected'|'withdrawn'} status - Application status
 * @property {string} applied_at - ISO 8601 datetime when application was submitted
 * @property {string|null} reviewed_at - ISO 8601 datetime when application was reviewed
 * @property {string|null} reviewer_notes - Notes from reviewer
 */

/**
 * @typedef {Object} MyProjectApplication
 * @property {number} id - Application ID
 * @property {Object} user - Applicant information
 * @property {string} user.name - Applicant name
 * @property {string} user.email - Applicant email
 * @property {string} user.university - Applicant university
 * @property {string[]} user.skills - Applicant skills
 * @property {number} user.rating - Applicant rating
 * @property {string} message - Application message
 * @property {'pending'|'accepted'|'rejected'} status - Application status
 * @property {string} appliedAt - When the application was submitted
 */

/**
 * @typedef {Object} MyLeadingProject
 * @property {number} id - Project ID
 * @property {string} title - Project title
 * @property {string} description - Project description
 * @property {'recruiting'|'active'|'completed'} status - Project status
 * @property {number} team_size - Current team size
 * @property {number} team_limit - Maximum team size
 * @property {MyProjectApplication[]} applications - Project applications
 * @property {number} messages - Number of messages
 * @property {number} tasks - Total number of tasks
 * @property {number} completedTasks - Number of completed tasks
 * @property {string} created_at - Creation date
 */

/**
 * @typedef {Object} MyCollaboratingProject
 * @property {number} id - Project ID
 * @property {string} title - Project title
 * @property {string} description - Project description
 * @property {string} role - User's role in the project
 * @property {'active'|'completed'} status - Project status
 * @property {number} team_size - Current team size
 * @property {string} owner - Project owner name
 */

/**
 * @typedef {Object} Category
 * @property {string} id - Category identifier
 * @property {string} name - Category display name
 * @property {string} icon - Category emoji icon
 */

/**
 * @typedef {Object} Status
 * @property {string} value - Status value
 * @property {string} label - Status display label
 * @property {string} color - Status color
 */

/**
 * @typedef {Object} Difficulty
 * @property {string} value - Difficulty value
 * @property {string} label - Difficulty display label
 * @property {string} description - Difficulty description
 */

/**
 * @typedef {Object} ProjectFilters
 * @property {string} [status] - Filter by status
 * @property {string} [category] - Filter by category
 * @property {string[]} [skills] - Filter by skills
 * @property {string} [university] - Filter by university
 * @property {string} [difficulty] - Filter by difficulty
 */

/**
 * @typedef {Object} ProjectStats
 * @property {number} total - Total number of projects
 * @property {number} recruiting - Number of recruiting projects
 * @property {number} active - Number of active projects
 * @property {number} completed - Number of completed projects
 * @property {number} totalStudents - Total number of students
 */

export default {};

