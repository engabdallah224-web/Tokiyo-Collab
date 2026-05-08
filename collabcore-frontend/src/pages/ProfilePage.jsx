import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mail, Calendar, Edit, Award, Code, Star, Users, Github, Linkedin, Twitter, Briefcase, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { auth } from '../config/firebase';
import {
  fetchUserProfile,
  fetchMyLeadingProjects,
  fetchMyCollaboratingProjects,
} from '../services/firestoreService';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const { user: authUser } = useAuth();

  // Fetch current user profile directly from Firestore
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['current-user-firestore', authUser?.uid],
    queryFn: () => fetchUserProfile(authUser.uid),
    enabled: !!authUser?.uid,
  });

  // Fetch user's projects directly from Firestore
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['my-all-projects-firestore', authUser?.uid],
    queryFn: async () => {
      const [leading, collaborating] = await Promise.all([
        fetchMyLeadingProjects(authUser.uid),
        fetchMyCollaboratingProjects(authUser.uid),
      ]);
      return { leading, collaborating };
    },
    enabled: !!authUser?.uid,
  });

  const user = userData || authUser || {
    full_name: 'Loading...',
    email: '',
    university: '',
    bio: '',
    skills: [],
    role: 'student',
    joined_date: new Date().toISOString(),
  };
  const profileAvatarUrl = user.avatar_url || auth.currentUser?.photoURL || null;

  const allProjects = [
    ...(projectsData?.leading || []).map(p => ({ ...p, role: 'Project Leader' })),
    ...(projectsData?.collaborating || []).map(p => ({ ...p, role: 'Team Member' })),
  ];

  if (userLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      <div className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md overflow-hidden mb-6 border border-gray-100"
        >
          {/* Cover Image */}
          <div className="h-40 bg-red-600 relative overflow-hidden">
            {user.banner_url ? (
              <img 
                src={user.banner_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-red-600" />
            )}
          </div>

          <div className="px-6 pb-6 relative">
            {/* Profile Picture */}
            <div className="flex justify-between items-start -mt-16 mb-6">
              <div className="h-32 w-32 rounded-2xl bg-red-600 flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
                {profileAvatarUrl ? (
                  <img 
                    src={profileAvatarUrl} 
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.full_name?.charAt(0) || 'U'
                )}
              </div>

              <Link to="/profile/edit">
                <motion.button
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold shadow-md hover:bg-red-700 hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit className="h-5 w-5" />
                  Edit Profile
                </motion.button>
              </Link>
            </div>

            {/* User Info - Now below the banner */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.full_name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {user.university}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(user.joined_date || user.created_at || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {user.role === 'project_leader' ? 'Project Leader' : 'Student'}
              </span>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-gray-700 mb-6 max-w-3xl text-sm leading-relaxed">{user.bio}</p>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{allProjects.length}</p>
                    <p className="text-sm text-gray-600">Projects</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{user.skills?.length || 0}</p>
                    <p className="text-sm text-gray-600">Skills</p>
                  </div>
                  <Code className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{user.rating || 0}</p>
                    <p className="text-sm text-gray-600">Rating</p>
                  </div>
                  <Star className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Skills & Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Skills */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-md p-6 border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-red-600" />
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {user.skills && user.skills.length > 0 ? (
                  user.skills.map((skill, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                    >
                      {skill}
                    </motion.span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No skills added yet</p>
                )}
              </div>
            </motion.div>

            {/* Social Links */}
            {(user.github || user.linkedin || user.twitter) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-md p-6 border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Connect</h2>
                <div className="flex flex-col gap-3">
                  {user.github && (
                    <a
                      href={`https://github.com/${user.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      <Github className="h-5 w-5 text-gray-700" />
                      <span className="text-sm font-medium text-gray-900">@{user.github}</span>
                    </a>
                  )}
                  {user.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${user.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      <Linkedin className="h-5 w-5 text-gray-700" />
                      <span className="text-sm font-medium text-gray-900">@{user.linkedin}</span>
                    </a>
                  )}
                  {user.twitter && (
                    <a
                      href={`https://twitter.com/${user.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      <Twitter className="h-5 w-5 text-gray-700" />
                      <span className="text-sm font-medium text-gray-900">@{user.twitter}</span>
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Projects & Activity */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6">
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'projects'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Projects ({allProjects.length})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Activity
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'projects' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {allProjects.length > 0 ? (
                    allProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <Link to={`/projects/${project.id}`}>
                              <h3 className="text-lg font-bold text-gray-900 hover:text-red-600 transition-colors">
                                {project.title}
                              </h3>
                            </Link>
                            <p className="text-xs text-red-600 font-semibold mt-1">{project.role}</p>
                          </div>
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full capitalize">
                            {project.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{project.current_team_size || 0}/{project.team_size_limit}</span>
                          </div>
                          <span className="capitalize">{project.category}</span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
                      <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                      <p className="text-sm text-gray-600 mb-6">Start collaborating on projects!</p>
                      <Link to="/projects/discover">
                        <button className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold shadow-md hover:bg-red-700 transition-all">
                          Discover Projects
                        </button>
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100"
                >
                  <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
                  <p className="text-sm text-gray-600">Your recent activity will appear here</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
