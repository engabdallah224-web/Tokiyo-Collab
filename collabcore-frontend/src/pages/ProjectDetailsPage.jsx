import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Users, Clock, Calendar, TrendingUp, Code, Target, 
  ExternalLink, Send, MessageSquare, Settings, MapPin, Award,
  CheckCircle, AlertCircle, Star, Github, Gitlab, Heart, Bookmark,
  Share2, Flag
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectAPI, applicationAPI, authAPI, userAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatStatus, formatCategory } from '../utils/helpers';
import {
  fetchProjectById,
  fetchUserProfile,
  createApplicationInFirestore,
  checkExistingApplication,
  createNotification,
  fetchUserLikes,
  fetchUserSaves,
  toggleProjectLike,
  toggleProjectSave,
} from '../services/firestoreService';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';

const ProjectDetailsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);
  const [hasAppliedDirect, setHasAppliedDirect] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Load like/save state from Firestore on mount
  React.useEffect(() => {
    const uid = authUser?.uid || auth.currentUser?.uid;
    if (!uid || !projectId) return;
    fetchUserLikes(uid).then((ids) => setIsLiked(ids.includes(projectId))).catch(() => {});
    fetchUserSaves(uid).then((ids) => setIsSaved(ids.includes(projectId))).catch(() => {});
  }, [authUser?.uid, projectId]);

  const handleLike = async () => {
    const uid = authUser?.uid || auth.currentUser?.uid;
    if (!uid) return;
    setIsLiked((v) => !v);
    try { await toggleProjectLike(uid, projectId); } catch { setIsLiked((v) => !v); }
  };

  const handleSave = async () => {
    const uid = authUser?.uid || auth.currentUser?.uid;
    if (!uid) return;
    setIsSaved((v) => !v);
    try { await toggleProjectSave(uid, projectId); } catch { setIsSaved((v) => !v); }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: projectData?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  // Fetch project details — try backend first, fall back to Firestore
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      try {
        const response = await projectAPI.getProject(projectId);
        return response.data.project;
      } catch (error) {
        if (!error.response) {
          // Backend unreachable — use Firestore directly
          return await fetchProjectById(projectId);
        }
        throw error;
      }
    },
    enabled: !!projectId
  });

  // Fetch current user — try backend first, fall back to Firestore
  const { data: userData } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const response = await authAPI.getMe();
        return response.data.user;
      } catch (error) {
        if (!error.response) {
          const uid = auth.currentUser?.uid;
          if (uid) return await fetchUserProfile(uid);
          return null;
        }
        throw error;
      }
    }
  });

  // Fetch user's applications to check if already applied
  const { data: userApplications } = useQuery({
    queryKey: ['user-applications', userData?.uid],
    queryFn: async () => {
      if (!userData?.uid) return [];
      try {
        const response = await userAPI.getUserApplications(userData.uid);
        return response.data.applications || [];
      } catch {
        // Fallback: check Firestore directly
        const existing = await checkExistingApplication(projectId, userData.uid).catch(() => null);
        if (existing) setHasAppliedDirect(true);
        return [];
      }
    },
    enabled: !!userData?.uid
  });

  // Also check Firestore for application on mount
  React.useEffect(() => {
    const uid = authUser?.uid || auth.currentUser?.uid;
    if (!uid || !projectId) return;
    checkExistingApplication(projectId, uid).then((r) => { if (r) setHasAppliedDirect(true); }).catch(() => {});
  }, [authUser?.uid, projectId]);

  // Fetch project applications to get team members
  const { data: projectApplications } = useQuery({
    queryKey: ['project-applications', projectId],
    queryFn: async () => {
      try {
        const response = await projectAPI.getProjectApplications(projectId);
        return response.data.applications || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!projectId
  });

  // Apply mutation — try backend first, fall back to Firestore
  const applyMutation = useMutation({
    mutationFn: (data) => applicationAPI.createApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-applications']);
      setShowApplyModal(false);
      setApplicationMessage('');
      alert('Application submitted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.detail || 'Failed to submit application');
    }
  });

  const handleApply = async () => {
    if (!applicationMessage.trim()) {
      alert('Please write a message');
      return;
    }
    const uid = authUser?.uid || auth.currentUser?.uid;
    // Try Firestore direct first (works on mobile/Vercel)
    if (uid) {
      setApplyLoading(true);
      setApplyError('');
      try {
        await createApplicationInFirestore({
          projectId,
          userId: uid,
          message: applicationMessage.trim(),
          applicantName: authUser?.full_name || authUser?.email || '',
        });
        if (projectData?.owner_id) {
          await createNotification(projectData.owner_id, {
            title: 'New Application',
            message: `${authUser?.full_name || authUser?.email || 'Someone'} applied to "${projectData.title}".`,
            type: 'application',
            link: `/projects/${projectId}/applications`,
          }).catch(() => {});
        }
        setHasAppliedDirect(true);
        setApplySuccess(true);
        setApplicationMessage('');
        setTimeout(() => { setShowApplyModal(false); setApplySuccess(false); }, 1800);
      } catch (err) {
        setApplyError(err.message || 'Failed to submit application.');
      } finally {
        setApplyLoading(false);
      }
      return;
    }
    // Backend fallback
    applyMutation.mutate({ project_id: projectId, message: applicationMessage });
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <Link to="/discovery" className="text-blue-600 hover:text-blue-700">
            Back to Discovery
          </Link>
        </div>
      </div>
    );
  }

  const currentUid = userData?.uid || authUser?.uid || auth.currentUser?.uid;
  const isOwner = currentUid === projectData.owner_id;
  const hasApplied = hasAppliedDirect || userApplications?.some(app => app.project_id === projectId);
  const acceptedApplication = projectApplications?.find(
    app => app.user_id === userData?.uid && app.status === 'accepted'
  );
  const isMember = isOwner || !!acceptedApplication;
  const spotsLeft = projectData.team_size_limit - projectData.current_team_size;
  const teamMembers = projectApplications?.filter(app => app.status === 'accepted') || [];

  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'bg-green-100 text-green-700 border-green-200',
      intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      advanced: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[difficulty] || colors.intermediate;
  };

  const getStatusColor = (status) => {
    const colors = {
      recruiting: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-purple-100 text-purple-700',
      on_hold: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.recruiting;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              to="/discovery"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Discovery
            </Link>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(projectData.status)} bg-white/20 text-white border border-white/30`}>
                    {formatStatus(projectData.status)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getDifficultyColor(projectData.difficulty)} bg-white/20 text-white border-white/30`}>
                    {projectData.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-semibold border border-white/30">
                    {formatCategory(projectData.category)}
                  </span>
                </div>

                <h1 className="text-4xl font-bold mb-3">{projectData.title}</h1>
                
                {/* Owner Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm border border-white/30">
                    {projectData.owner?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <Link to={`/users/${projectData.owner_id}`} className="text-lg font-semibold hover:underline">
                      {projectData.owner?.full_name || 'Unknown'}
                    </Link>
                    <p className="text-white/80 text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {projectData.owner?.university || 'University'}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>{spotsLeft} spots left of {projectData.team_size_limit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>Created {new Date(projectData.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{projectData.duration || 'Flexible duration'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={handleLike}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-3 rounded-lg backdrop-blur-sm border border-white/20 transition-colors ${
                    isLiked ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-3 rounded-lg backdrop-blur-sm border border-white/20 transition-colors ${
                    isSaved ? 'bg-amber-400 text-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                </motion.button>
                <div className="relative">
                  <motion.button
                    onClick={handleShare}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition-colors"
                  >
                    <Share2 className="h-5 w-5" />
                  </motion.button>
                  {shareToast && (
                    <div className="absolute -bottom-10 right-0 bg-black text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                      Link copied!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-6 w-6 text-red-600" />
                About This Project
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {projectData.description}
              </p>
            </motion.div>

            {/* Required Skills */}
            {projectData.required_skills && projectData.required_skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Code className="h-6 w-6 text-red-600" />
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-3">
                  {projectData.required_skills.map((skill, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tags */}
            {projectData.tags && projectData.tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Flag className="h-6 w-6 text-red-600" />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {projectData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Team Members */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-6 w-6 text-red-600" />
                Team Members ({projectData.current_team_size}/{projectData.team_size_limit})
              </h2>

              <div className="space-y-3">
                {/* Owner */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                  <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white text-lg font-bold">
                    {projectData.owner?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <Link to={`/users/${projectData.owner_id}`} className="font-semibold text-gray-900 hover:text-red-600 transition-colors">
                      {projectData.owner?.full_name || 'Unknown'}
                    </Link>
                    <p className="text-sm text-gray-600">Project Leader</p>
                  </div>
                  <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                    Owner
                  </span>
                </div>

                {/* Team Members */}
                {teamMembers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg font-bold">
                      {member.user?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div className="flex-1">
                      <Link to={`/users/${member.user_id}`} className="font-semibold text-gray-900 hover:text-red-600 transition-colors">
                        {member.user?.full_name || 'Unknown'}
                      </Link>
                      <p className="text-sm text-gray-600">{member.user?.university || 'University'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {member.user?.skills?.slice(0, 2).map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white text-gray-600 rounded text-xs border border-gray-300">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {/* Empty Spots */}
                {Array.from({ length: spotsLeft }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                  >
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-500">Open Position</p>
                      <p className="text-sm text-gray-400">Waiting for team member</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* CTA Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-6"
            >
              {isMember ? (
                // Member Actions
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg border border-green-200 mb-4">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">You're a team member!</span>
                  </div>
                  
                  <Link to={`/projects/${projectId}/workspace`} className="block w-full">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-md transition-all"
                    >
                      <MessageSquare className="h-5 w-5" />
                      Open Workspace
                    </motion.button>
                  </Link>

                  {isOwner && (
                    <>
                      <Link to={`/projects/${projectId}/applications`} className="block w-full">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
                        >
                          <Users className="h-5 w-5" />
                          Manage Applications
                        </motion.button>
                      </Link>

                      <Link to={`/projects/${projectId}/settings`} className="block w-full">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                        >
                          <Settings className="h-5 w-5" />
                          Project Settings
                        </motion.button>
                      </Link>
                    </>
                  )}
                </div>
              ) : hasApplied ? (
                // Already Applied
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Application Pending</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your application is being reviewed by the project owner. You'll be notified once they make a decision.
                  </p>
                </div>
              ) : projectData.status === 'recruiting' && spotsLeft > 0 ? (
                // Can Apply
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">Join This Project</h3>
                  <p className="text-sm text-gray-600">
                    Apply to join the team and start collaborating on this exciting project!
                  </p>
                  <motion.button
                    onClick={() => setShowApplyModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-md transition-all"
                  >
                    <Send className="h-5 w-5" />
                    Apply Now
                  </motion.button>
                </div>
              ) : (
                // Not Recruiting
                <div className="text-center py-4">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    This project is not currently accepting applications.
                  </p>
                </div>
              )}

              {/* Project Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <h4 className="font-semibold text-gray-900 mb-3">Project Info</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(projectData.status)}`}>
                    {formatStatus(projectData.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Difficulty</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(projectData.difficulty)}`}>
                    {projectData.difficulty}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Category</span>
                  <span className="text-gray-900 font-medium">{formatCategory(projectData.category)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="text-gray-900 font-medium">{projectData.duration || 'Flexible'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Team Size</span>
                  <span className="text-gray-900 font-medium">{projectData.current_team_size}/{projectData.team_size_limit}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
          >
            {applySuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Applied!</h2>
                <p className="text-gray-600">Your application was submitted successfully.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Apply to Join</h2>
                <p className="text-gray-600 mb-4">
                  Tell the project owner why you'd be a great fit for this team.
                </p>
                <textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  placeholder="Introduce yourself and explain your interest in this project..."
                  className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                {applyError && (
                  <p className="mt-2 text-sm text-red-600">{applyError}</p>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowApplyModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={applyLoading || !applicationMessage.trim()}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyLoading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsPage;

