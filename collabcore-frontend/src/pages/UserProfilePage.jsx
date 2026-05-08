import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Briefcase, Code, ArrowLeft, Mail } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  fetchUserProfile,
  fetchMyLeadingProjects,
} from '../services/firestoreService';

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => fetchUserProfile(userId),
    enabled: !!userId,
  });

  const { data: leadingProjects = [], isLoading: leadingLoading } = useQuery({
    queryKey: ['user-leading-projects', userId],
    queryFn: async () => fetchMyLeadingProjects(userId),
    enabled: !!userId,
  });

  const publicProjects = useMemo(() => {
    return (leadingProjects || []).map((project) => ({
      ...project,
      roleLabel: 'Project Leader',
    }));
  }, [leadingProjects]);

  const loading = userLoading || leadingLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-600 mb-6">This profile is not available.</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const joinedDate = user.created_at || user.joined_date;
  const skills = user.skills || [];
  const displayName = user.full_name || user.email || 'User';

  return (
    <div className="min-h-screen bg-[#f3f3f3] transition-colors">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-6 transition-all"
          whileHover={{ x: -4 }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </motion.button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 transition-colors"
        >
          {/* Cover Image */}
          <div className="h-32 bg-red-600 relative">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          <div className="px-8 pb-8">
            {/* Profile Picture & Basic Info */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 mb-6">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                {/* Avatar */}
                <motion.div
                  className="h-32 w-32 rounded-2xl bg-red-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-xl"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </motion.div>

                <div className="mb-4 md:mb-0">
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">{displayName}</h1>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    {user.university && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {user.university}
                      </span>
                    )}
                    {joinedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Member since {new Date(joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
                      {user.role === 'project_leader' ? '🚀 Project Leader' : '🎓 Student'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact */}
              {user.email && (
                <motion.div
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-800 rounded-xl font-medium"
                  whileHover={{ scale: 1.02 }}
                >
                  <Mail className="h-5 w-5 text-red-600" />
                  <span>{user.email}</span>
                </motion.div>
              )}
            </div>

            {/* Bio */}
            <p className="text-gray-700 mb-6 max-w-3xl">{user.bio || 'No bio added yet.'}</p>

            {/* Stats - Limited */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-600 rounded-xl">
                <div className="text-2xl font-bold text-white">{publicProjects.length}</div>
                <div className="text-sm text-red-100">Projects</div>
              </div>
              <div className="text-center p-4 bg-red-600 rounded-xl">
                <div className="text-2xl font-bold text-white">{skills.length}</div>
                <div className="text-sm text-red-100">Skills</div>
              </div>
              <div className="text-center p-4 bg-red-600 rounded-xl">
                <div className="text-2xl font-bold text-white">{leadingProjects.length}</div>
                <div className="text-sm text-red-100">Led Projects</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Skills */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Skills */}
            <div className="bg-white rounded-2xl shadow-md p-6 transition-colors">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-4">
                <Code className="h-6 w-6 text-red-600" />
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.length === 0 && <p className="text-gray-500 text-sm">No skills listed yet.</p>}
                {skills.map((skill, index) => (
                  <motion.span
                    key={index}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-full"
                    whileHover={{ scale: 1.1 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 transition-colors">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-4">
                <Calendar className="h-6 w-6 text-red-600" />
                Profile Details
              </h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="font-semibold">Role:</span> {user.role || 'student'}</p>
                <p><span className="font-semibold">University:</span> {user.university || 'Not specified'}</p>
                <p><span className="font-semibold">Email:</span> {user.email || 'Not available'}</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Projects */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-colors">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  <Briefcase className="inline h-5 w-5 mr-2 text-red-600" />
                  Created Projects ({publicProjects.length})
                </h3>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {publicProjects.length === 0 && (
                    <p className="text-gray-500">No public projects found for this user yet.</p>
                  )}
                  {publicProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      className="p-4 border-2 border-gray-100 rounded-xl hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">{project.title || 'Untitled project'}</h3>
                          <p className="text-sm text-gray-600 mb-2">{project.description || 'No description'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          (project.status || '').toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {project.status || 'unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{project.roleLabel || 'Contributor'}</span>
                        <span>Team of {project.current_team_size || project.team_size || 1}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;

