import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, AlertCircle, ArrowLeft, Trash2, Sparkles } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import { deleteProjectFromFirestore } from '../services/firestoreService';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProjectSettingsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch project details
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await projectAPI.getProject(projectId);
      return response.data.project;
    },
    enabled: !!projectId
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'recruiting',
    team_size_limit: 5,
    category: 'other',
    difficulty: 'intermediate',
    duration: '3-6 months'
  });

  // Update form when project data loads
  React.useEffect(() => {
    if (projectData) {
      setFormData({
        title: projectData.title || '',
        description: projectData.description || '',
        status: projectData.status || 'recruiting',
        team_size_limit: projectData.team_size_limit || 5,
        category: projectData.category || 'other',
        difficulty: projectData.difficulty || 'intermediate',
        duration: projectData.duration || '3-6 months'
      });
    }
  }, [projectData]);

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (data) => {
      const response = await projectAPI.updateProject(projectId, data);
      return response.data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project', projectId]);
      alert('Project settings updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.detail || 'Failed to update project settings');
    }
  });

  // Delete project mutation — uses Firestore directly to avoid backend 403 issues
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const uid = user?.uid;
      if (!uid) throw new Error('You must be logged in to delete a project');
      try {
        // Try Firestore direct delete first
        await deleteProjectFromFirestore(projectId, uid);
      } catch (firestoreErr) {
        // Fallback to backend API
        try {
          await projectAPI.deleteProject(projectId);
        } catch {
          throw firestoreErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      navigate('/projects');
    },
    onError: (error) => {
      alert(error.message || 'Failed to delete project');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProjectMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteProjectMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(59, 130, 246) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 -right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Link
            to={`/projects/${projectId}/workspace`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-500 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Workspace</span>
          </Link>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mb-3">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Project Settings
          </h1>
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Configure and manage your project details
          </p>
          {projectData && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {projectData.title}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                {projectData.status}
              </span>
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4"
          >
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium mb-3">
                ⚠️ This action cannot be undone. All project data, tasks, messages, and team information will be permanently deleted.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 bg-white text-gray-700 rounded text-sm hover:bg-gray-100 border border-gray-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleDelete}
                  disabled={deleteProjectMutation.isPending}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Forever'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-md border border-gray-200"
        >
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Project Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    placeholder="e.g., AI-Powered Study Assistant"
                    required
                  />
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                      required
                    >
                      <option value="web_development">Web Development</option>
                      <option value="mobile_development">Mobile Development</option>
                      <option value="machine_learning">Machine Learning</option>
                      <option value="data_science">Data Science</option>
                      <option value="blockchain">Blockchain</option>
                      <option value="research">Research</option>
                      <option value="design">Design</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    >
                      <option value="recruiting">🚀 Recruiting</option>
                      <option value="active">✅ Active</option>
                      <option value="completed">🎉 Completed</option>
                      <option value="on_hold">⏸️ On Hold</option>
                    </select>
                  </div>
                </div>

                {/* Difficulty & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    >
                      <option value="beginner">🟢 Beginner</option>
                      <option value="intermediate">🟡 Intermediate</option>
                      <option value="advanced">🔴 Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    >
                      <option value="1-3 months">1-3 months</option>
                      <option value="3-6 months">3-6 months</option>
                      <option value="6-12 months">6-12 months</option>
                      <option value="12+ months">12+ months</option>
                    </select>
                  </div>
                </div>

                {/* Team Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Size Limit
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={formData.team_size_limit}
                      onChange={(e) => setFormData({ ...formData, team_size_limit: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                    />
                    <span className="text-lg font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg min-w-[3rem] text-center">
                      {formData.team_size_limit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current team: {projectData?.current_team_size || 1} / {formData.team_size_limit}
                  </p>
                </div>

                {/* Delete Project Button */}
                <div className="pt-4 border-t border-gray-200">
                  <motion.button
                    type="button"
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 flex items-center justify-center gap-2 text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                  </motion.button>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none text-sm"
                    placeholder="Describe your project, what you're building, and what you hope to achieve..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific about your project goals and what makes it unique
                  </p>
                </div>

                {/* Project Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Project Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{projectData?.current_team_size || 1}</div>
                      <div className="text-xs text-gray-500">Team Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600 capitalize">{projectData?.status || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">Status</div>
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h3>
                  <p className="text-sm text-gray-600">
                    {projectData?.updated_at ? new Date(projectData.updated_at).toLocaleString() : 'Never'}
                  </p>
                </div>

                {/* Important Note */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Important Note</p>
                      <p className="text-xs text-yellow-700">
                        Changing project settings will affect all team members. Make sure to communicate changes with your team before saving.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="col-span-1 lg:col-span-2 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <motion.button
                  type="button"
                  onClick={() => navigate(`/projects/${projectId}/workspace`)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={updateProjectMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  whileHover={{ scale: updateProjectMutation.isPending ? 1 : 1.02 }}
                  whileTap={{ scale: updateProjectMutation.isPending ? 1 : 0.98 }}
                >
                  {updateProjectMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectSettingsPage;

