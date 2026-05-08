import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, MapPin, Star, Send, TrendingUp, UserPlus, UserCheck, Radio, MessageCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatRelativeTime, getInitials, getAvatarColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import {
  subscribeFollowStatus, followUser, unfollowUser,
  subscribeProjectLiveStream, startLiveStream, endLiveStream,
  subscribeProjectComments, addProjectComment, deleteProjectComment,
} from '../../services/firestoreService';
import VideoCallModal from '../calls/VideoCallModal';

// Derive a stable pseudo-random match % from the project id
const getMatchPercent = (id = '') => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return 65 + (hash % 30); // 65–94 %
};

const ProjectCard = ({ project }) => {
  const { user: currentUser } = useAuth();
  const {
    id,
    title,
    description,
    owner,
    required_skills = [],
    team_size_limit,
    current_team_size = 0,
    status,
    created_at,
    tags = [],
    interest_count,
  } = project;

  const spotsLeft     = Math.max(0, (team_size_limit || 5) - current_team_size);
  const matchPct      = getMatchPercent(id);
  const isRecruiting  = status === 'recruiting';
  const isOwner       = currentUser?.uid === owner?.id;

  // Owner fields
  const ownerName     = owner?.full_name || 'Unknown';
  const ownerUniversity = owner?.university || '';
  const ownerRating   = owner?.rating ? Number(owner.rating).toFixed(1) : '4.8';
  const ownerProjects = owner?.projects_count ?? 12;
  const ownerAvatar   = owner?.avatar_url || owner?.profile_photo || null;
  const ownerInitials = getInitials(ownerName);
  const avatarBg      = getAvatarColor(ownerName);
  const interestCount = interest_count ?? Math.floor(getMatchPercent(id + 'i') * 0.3);

  // ── Follow state ──────────────────────────────────────────────────────────
  const [followState, setFollowState]   = useState({ isFollowing: false, followsMe: false });
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || !owner?.id || isOwner) return;
    const unsub = subscribeFollowStatus(owner.id, setFollowState);
    return unsub;
  }, [currentUser?.uid, owner?.id, isOwner]);

  const handleFollow = async (e) => {
    e.preventDefault();
    if (!currentUser || isOwner || followLoading) return;
    setFollowLoading(true);
    try {
      if (followState.isFollowing) {
        await unfollowUser(owner.id);
      } else {
        await followUser(owner.id);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Live stream state ─────────────────────────────────────────────────────
  const [liveStream, setLiveStream]     = useState(null); // null = no live
  const [goingLive,  setGoingLive]      = useState(false);
  const [watchModal, setWatchModal]     = useState(false);

  useEffect(() => {
    const unsub = subscribeProjectLiveStream(id, setLiveStream);
    return unsub;
  }, [id]);

  // ── Comments state ────────────────────────────────────────────────────────
  const [comments,       setComments]       = useState([]);
  const [showComments,   setShowComments]   = useState(false);
  const [newComment,     setNewComment]     = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const commentInputRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeProjectComments(id, setComments);
    return unsub;
  }, [id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      await addProjectComment(id, newComment);
      setNewComment('');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    await deleteProjectComment(commentId);
  };

  const handleGoLive = async (e) => {
    e.preventDefault();
    if (!isOwner || goingLive) return;
    if (liveStream) {
      // End the live stream
      await endLiveStream(liveStream.id);
    } else {
      setGoingLive(true);
      try {
        await startLiveStream({
          projectId:    id,
          projectTitle: title,
          ownerId:      currentUser.uid,
          ownerName,
          ownerAvatar,
        });
      } finally {
        setGoingLive(false);
      }
    }
  };

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100 flex flex-col"
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Dark Header ── */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Match badge */}
          <span className="flex items-center gap-1 bg-gray-800 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-gray-700">
            <TrendingUp className="h-3 w-3" />
            {matchPct}% Match
          </span>
          {/* Status badge */}
          {isRecruiting && (
            <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full border border-green-500/30">
              🚀 Recruiting
            </span>
          )}
          {/* LIVE badge */}
          {liveStream && (
            <motion.button
              onClick={(e) => { e.preventDefault(); setWatchModal(true); }}
              className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              LIVE
            </motion.button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Follow button — compact pill (non-owners only) */}
          {!isOwner && owner?.id && currentUser && (
            <motion.button
              onClick={handleFollow}
              disabled={followLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                followState.isFollowing
                  ? 'bg-gray-700 text-gray-300 border border-gray-600'
                  : followState.followsMe
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}
            >
              {followState.isFollowing ? (
                <><UserCheck className="h-3 w-3" /> Following</>
              ) : followState.followsMe ? (
                <><UserPlus className="h-3 w-3" /> Follow Back</>
              ) : (
                <><UserPlus className="h-3 w-3" /> Follow</>
              )}
            </motion.button>
          )}
          {/* Comments button */}
          <motion.button
            onClick={(e) => { e.preventDefault(); setShowComments(v => !v); }}
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className={`relative flex items-center gap-1 transition-colors ${showComments ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}`}
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 && (
              <span className="text-[10px] font-bold leading-none">{comments.length}</span>
            )}
          </motion.button>
          {/* Go Live button (owner only) */}
          {isOwner && (
            <motion.button
              onClick={handleGoLive}
              disabled={goingLive}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                liveStream
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400'
              }`}
            >
              <Radio className="h-3 w-3" />
              {goingLive ? '…' : liveStream ? 'End Live' : 'Go Live'}
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-red-400 transition-colors">
            <Heart className="h-4 w-4" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-yellow-400 transition-colors">
            <Bookmark className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* ── Owner row ── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Left: avatar + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              {ownerAvatar ? (
                <img src={ownerAvatar} alt={ownerName}
                  className="h-11 w-11 rounded-full object-cover border-2 border-white shadow" />
              ) : (
                <div className={`h-11 w-11 rounded-full ${avatarBg} flex items-center justify-center text-white text-sm font-bold shadow border-2 border-white`}>
                  {ownerInitials}
                </div>
              )}
              {liveStream ? (
                <span className="absolute bottom-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              ) : (
                <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-900 truncate">{ownerName}</p>
                {followState.followsMe && !isOwner && (
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                    Follows you
                  </span>
                )}
              </div>
              {ownerUniversity && (
                <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {ownerUniversity}
                </p>
              )}
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-gray-700">{ownerRating}</span>
                <span className="text-xs text-gray-400">· {ownerProjects} projects</span>
              </div>
            </div>
          </div>

          {/* Right: time + stats */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-xs text-gray-400">🕐 {formatRelativeTime(created_at)}</span>
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-sm font-bold text-blue-500">{spotsLeft}</p>
                <p className="text-[10px] text-gray-400 leading-none">Spots</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">{current_team_size}</p>
                <p className="text-[10px] text-gray-400 leading-none">Team</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-purple-500">{interestCount}</p>
                <p className="text-[10px] text-gray-400 leading-none">Interest</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <Link to={`/projects/${id}`}>
          <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-red-600 transition-colors cursor-pointer line-clamp-1">
            {title}
          </h3>
        </Link>

        {/* ── Description ── */}
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
          {description}
        </p>

        {/* ── Looking for skills ── */}
        {required_skills.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              🔍 Looking for:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {required_skills.slice(0, 4).map((skill, idx) => (
                <span key={idx}
                  className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">
                  {skill}
                </span>
              ))}
              {required_skills.length > 4 && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                  +{required_skills.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-2 mb-3">
          <Link to={`/projects/${id}`} className="flex-1">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all">
              View Details
            </motion.button>
          </Link>
          <Link to={`/projects/${id}`} className="flex-1">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-all">
              <Send className="h-3.5 w-3.5" />
              Apply Now
            </motion.button>
          </Link>
        </div>

        {/* ── Tags ── */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
            {tags.slice(0, 3).map((tag, idx) => (
              <span key={idx}
                className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* ── Watch live modal ── */}
      <AnimatePresence>
        {watchModal && liveStream && (
          <VideoCallModal
            roomUrl={liveStream.meeting_url}
            callTitle={`🔴 ${liveStream.owner_name} — LIVE: ${liveStream.project_title}`}
            onClose={() => setWatchModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Comments drawer ── */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            key="comments-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="px-4 pt-3 pb-4 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                {comments.length === 0 ? 'No comments yet' : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
              </p>

              {/* Comment list */}
              {comments.length > 0 && (
                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      {c.author_avatar ? (
                        <img src={c.author_avatar} alt={c.author_name}
                          className="h-6 w-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className={`h-6 w-6 rounded-full ${getAvatarColor(c.author_name)} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5`}>
                          {getInitials(c.author_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 bg-white rounded-lg px-2.5 py-1.5 border border-gray-200">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] font-semibold text-gray-700 truncate">{c.author_name}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-gray-400">{formatRelativeTime(c.created_at)}</span>
                            {(currentUser?.uid === c.author_id || isOwner) && (
                              <button onClick={() => handleDeleteComment(c.id)}
                                className="text-gray-300 hover:text-red-400 transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 break-words">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment form */}
              {currentUser ? (
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment…"
                    maxLength={300}
                    className="flex-1 text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 placeholder-gray-400"
                  />
                  <motion.button
                    type="submit"
                    disabled={!newComment.trim() || commentLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3 w-3" />
                    Post
                  </motion.button>
                </form>
              ) : (
                <p className="text-xs text-gray-400 text-center">Sign in to leave a comment</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProjectCard;

