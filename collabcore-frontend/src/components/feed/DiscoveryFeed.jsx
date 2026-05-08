import { useState, useEffect } from 'react';
// motion removed for snappy dynamic UI
import { Clock, MapPin, Send, X, CheckCircle, Heart, Bookmark, TrendingUp, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  createApplicationInFirestore,
  checkExistingApplication,
  createNotification,
  fetchProjectById,
  fetchUserLikes,
  fetchUserSaves,
  toggleProjectLike,
  toggleProjectSave,
  clearAllUserLikes,
  clearAllUserSaves,
  fetchProjectLikeCounts,
} from '../../services/firestoreService';

const DiscoveryFeed = ({ projects }) => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [likedProjects, setLikedProjects] = useState(new Set());
  const [savedProjects, setSavedProjects] = useState(new Set());
  const [appliedProjects, setAppliedProjects] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  // On mount / when user changes, load liked + saved project IDs from Firestore
  // Also clear any stale demo data on first ever load (one-time cleanup)
  useEffect(() => {
    if (!user?.uid) return;
    const CLEARED_KEY = `likes_cleared_${user.uid}`;
    if (!localStorage.getItem(CLEARED_KEY)) {
      // One-time cleanup of any stale/demo likes+saves
      Promise.all([
        clearAllUserLikes(user.uid),
        clearAllUserSaves(user.uid),
      ]).then(() => {
        localStorage.setItem(CLEARED_KEY, '1');
        setLikedProjects(new Set());
        setSavedProjects(new Set());
      }).catch(() => {});
    } else {
      fetchUserLikes(user.uid).then((ids) => setLikedProjects(new Set(ids))).catch(() => {});
      fetchUserSaves(user.uid).then((ids) => setSavedProjects(new Set(ids))).catch(() => {});
    }
  }, [user?.uid]);

  // Fetch real like counts for all displayed projects
  useEffect(() => {
    if (!projects.length) return;
    const ids = projects.map((p) => p.id);
    fetchProjectLikeCounts(ids).then(setLikeCounts).catch(() => {});
  }, [projects]);

  // On mount / when projects or user changes, check which ones the user already applied to
  useEffect(() => {
    if (!user?.uid || projects.length === 0) return;
    const check = async () => {
      try {
        const applied = new Set();
        // Fetch all user applications in one go
        const userApps = await checkExistingApplication(null, user.uid);
        if (Array.isArray(userApps)) {
          userApps.forEach(app => applied.add(app.project_id));
        } else if (userApps && userApps.project_id) {
          // Handle case where it returns a single object (though it should be a list)
          applied.add(userApps.project_id);
        }
        setAppliedProjects(applied);
      } catch (err) {
        console.error('Failed to fetch user applications:', err);
      }
    };
    check();
  }, [user?.uid, projects.length]); // Use projects.length to avoid unnecessary re-runs

  const handleApply = (project) => {
    setSelectedProject(project);
    setApplicationMessage('');
    setApplyError('');
    setApplySuccess(false);
    setShowApplicationModal(true);
  };

  const submitApplication = async () => {
    if (!selectedProject || !applicationMessage.trim()) {
      setApplyError('Please enter a message for your application.');
      return;
    }
    if (!user?.uid) {
      setApplyError('You must be logged in to apply.');
      return;
    }

    setApplyLoading(true);
    setApplyError('');
    try {
      await createApplicationInFirestore({
        projectId: selectedProject.id,
        userId: user.uid,
        message: applicationMessage.trim(),
        applicantName: user.full_name || user.email || '',
      });

      // Mark as applied locally
      setAppliedProjects((prev) => new Set([...prev, selectedProject.id]));

      // Notify project owner
      if (selectedProject.owner_id) {
        await createNotification(selectedProject.owner_id, {
          title: 'New Application',
          message: `${user.full_name || user.email || 'Someone'} applied to your project "${selectedProject.title}".`,
          type: 'application',
          link: `/projects/${selectedProject.id}/applications`,
        }).catch(() => {});
      }

      setApplySuccess(true);
      setTimeout(() => {
        setShowApplicationModal(false);
        setApplySuccess(false);
      }, 1800);
    } catch (err) {
      setApplyError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setApplyLoading(false);
    }
  };

  const toggleLike = async (projectId) => {
    if (!user?.uid) return;
    const wasLiked = likedProjects.has(projectId);
    // Optimistic update
    setLikedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      return next;
    });
    setLikeCounts(prev => ({ ...prev, [projectId]: Math.max(0, (prev[projectId] ?? 0) + (wasLiked ? -1 : 1)) }));
    try {
      await toggleProjectLike(user.uid, projectId);
    } catch {
      // Revert on failure
      setLikedProjects(prev => {
        const next = new Set(prev);
        if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
        return next;
      });
      setLikeCounts(prev => ({ ...prev, [projectId]: Math.max(0, (prev[projectId] ?? 0) + (wasLiked ? 1 : -1)) }));
    }
  };

  const toggleSave = async (projectId) => {
    if (!user?.uid) return;
    // Optimistic update
    setSavedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      return next;
    });
    try {
      await toggleProjectSave(user.uid, projectId);
    } catch {
      // Revert on failure
      setSavedProjects(prev => {
        const next = new Set(prev);
        if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
        return next;
      });
    }
  };

  const getMatchScore = (project) => {
    const userSkills = (user?.skills || []).map((s) => s.toLowerCase());
    const required = (project.required_skills || []).map((s) => s.toLowerCase());
    if (!userSkills.length || !required.length) return null;
    const matches = required.filter((s) => userSkills.includes(s)).length;
    return Math.round((matches / required.length) * 100);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project, index) => {
          const matchScore = getMatchScore(project);
          const isLiked = likedProjects.has(project.id);
          const isSaved = savedProjects.has(project.id);
          const spotsLeft = project.team_size_limit - project.current_team_size;

          return (
            <div
              key={project.id}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-red-200"
            >
              {/* Gradient Background Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-white to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Top Bar */}
              <div className="relative bg-gradient-to-r from-gray-900 via-black to-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {matchScore !== null && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      <span className="text-white font-bold text-sm">{matchScore}% Match</span>
                    </div>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
                      project.status === 'recruiting'
                        ? 'bg-emerald-400/90 text-emerald-900'
                        : 'bg-blue-400/90 text-blue-900'
                    }`}
                  >
                    {project.status === 'recruiting' ? '🚀 Recruiting' : '✅ Active'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleLike(project.id)}
                    className={`p-2 rounded-full transition-all backdrop-blur-sm ${
                      isLiked
                        ? 'bg-white text-red-500'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => toggleSave(project.id)}
                    className={`p-2 rounded-full transition-all backdrop-blur-sm ${
                      isSaved
                        ? 'bg-white text-amber-500'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="relative p-5">
                {/* Owner Section */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {project.owner?.full_name?.charAt(0) || 'U'}
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-400 rounded-full border border-white"></div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{project.owner?.full_name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-red-500" />
                        {project.owner?.university}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {project.owner?.university && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{project.owner.university}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">
                        {project.created_at
                          ? (() => {
                              const diff = Date.now() - new Date(project.created_at).getTime();
                              const mins = Math.floor(diff / 60000);
                              if (mins < 60) return `${mins}m ago`;
                              const hrs = Math.floor(mins / 60);
                              if (hrs < 24) return `${hrs}h ago`;
                              return `${Math.floor(hrs / 24)}d ago`;
                            })()
                          : ''}
                      </span>
                    </div>

                    {/* Inline Stats */}
                    <div className="flex gap-2 text-xs">
                      <div className="text-center bg-blue-50 px-2 py-1 rounded">
                        <div className="font-bold text-blue-600">{spotsLeft}</div>
                        <div className="text-gray-600">Spots</div>
                      </div>
                      <div className="text-center bg-red-50 px-2 py-1 rounded">
                        <div className="font-bold text-red-600">{project.current_team_size}</div>
                        <div className="text-gray-600">Team</div>
                      </div>
                      <div className="text-center bg-purple-50 px-2 py-1 rounded">
                        <div className="font-bold text-purple-600">
                          {likeCounts[project.id] ?? 0}
                        </div>
                        <div className="text-gray-600">Interest</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Title */}
                <Link to={`/projects/${project.id}`}>
                  <h2 className="text-lg font-bold text-gray-900 mb-3 hover:text-red-600 transition-all cursor-pointer leading-tight">
                    {project.title}
                  </h2>
                </Link>

                {/* Description */}
                <p className="text-gray-700 mb-4 leading-relaxed text-sm">
                  {project.description}
                </p>

                {/* Skills Section with Action Buttons */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                          <Filter className="h-3 w-3 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Looking for:</h3>

                        {/* Inline Skill Tags */}
                        <div className="flex flex-wrap gap-1">
                          {(project.required_skills || []).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200 hover:border-red-400 transition-all cursor-pointer"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stacked Action Buttons - Top Right */}
                    <div className="flex flex-col gap-2">
                      <Link to={`/projects/${project.id}`}>
                        <button
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all border border-gray-200 hover:border-gray-300 text-sm"
                        >
                          View Details
                        </button>
                      </Link>

                      {spotsLeft > 0 && project.status === 'recruiting' ? (
                        appliedProjects.has(project.id) ? (
                          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-sm border border-green-200">
                            <CheckCircle className="h-4 w-4" />
                            Applied
                          </div>
                        ) : (
                        <button
                          onClick={() => handleApply(project)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-md transition-all text-sm"
                        >
                          <Send className="h-4 w-4" />
                          Apply Now
                        </button>
                        )
                      ) : (
                        /* Tags when no Apply button */
                        project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Tags inline with Apply button when recruiting */}
                  {spotsLeft > 0 && project.status === 'recruiting' && project.tags && project.tags.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {project.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>




              </div>
            </div>
          );
        })}
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedProject && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowApplicationModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-200">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-white sticky top-0 rounded-t-3xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-3xl font-bold mb-3">Apply to Project</h2>
                      <p className="text-red-100 text-lg font-medium">{selectedProject.title}</p>
                    </div>
                    <button
                      onClick={() => setShowApplicationModal(false)}
                      className="p-3 hover:bg-white/20 rounded-2xl transition-all"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  {/* Project Info */}
                  <div className="bg-red-50 rounded-xl p-4 mb-6 border border-red-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold">
                        {selectedProject.owner?.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedProject.owner?.full_name}</p>
                        <p className="text-sm text-gray-600">{selectedProject.owner?.university}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(selectedProject.required_skills || []).slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white text-red-700 text-xs font-semibold rounded-full border border-red-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Application Message */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Why do you want to join this project? *
                    </label>
                    <textarea
                      value={applicationMessage}
                      onChange={(e) => { setApplicationMessage(e.target.value); setApplyError(''); }}
                      rows="6"
                      className="w-full px-4 py-3 border-2 border-gray-200 bg-white text-gray-900 rounded-xl focus:border-red-500 focus:outline-none transition-all resize-none placeholder:text-gray-400"
                      placeholder="Tell the project leader why you're a great fit for this project. Mention your relevant skills and experience..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Tip: Be specific about what you can contribute to the project
                    </p>
                  </div>

                  {/* Error */}
                  {applyError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      {applyError}
                    </div>
                  )}

                  {/* Success */}
                  {applySuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Application submitted successfully!
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowApplicationModal(false)}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitApplication}
                      disabled={!applicationMessage.trim() || applyLoading || applySuccess}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5" />
                      {applyLoading ? 'Submitting...' : applySuccess ? 'Submitted!' : 'Submit Application'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
    </>
  );
};

export default DiscoveryFeed;

