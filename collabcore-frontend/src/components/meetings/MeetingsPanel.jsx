import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Users, Video, Trash2, ExternalLink,
  Plus, X, CheckCircle, AlertCircle, PlayCircle, Radio, Mic, Monitor, Volume2,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import {
  subscribeMeetingsDirect, deleteMeetingDirect, generateJitsiUrl,
  createMeetingDirect, updateMeetingStatus,
} from '../../services/firestoreService';
import VideoCallModal from '../calls/VideoCallModal';

// ─── helpers ────────────────────────────────────────────────────────────────

const MEETING_TYPES = {
  standup:       { label: 'Daily Standup',   color: 'bg-red-100 text-red-700 border-red-200'       },
  planning:      { label: 'Planning',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
  review:        { label: 'Review',          color: 'bg-green-100 text-green-700 border-green-200'  },
  retrospective: { label: 'Retrospective',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  brainstorming: { label: 'Brainstorming',   color: 'bg-blue-100 text-blue-700 border-blue-200'    },
  other:         { label: 'Other',           color: 'bg-gray-100 text-gray-700 border-gray-200'    },
};

function typeColor(t) { return (MEETING_TYPES[t] || MEETING_TYPES.other).color; }
function typeLabel(t) { return (MEETING_TYPES[t] || MEETING_TYPES.other).label; }

function formatMeetingTime(dateString) {
  try {
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  } catch { return { date: 'TBD', time: '' }; }
}

/** Joinable = in_progress, OR scheduled within 15 min before → duration end. */
function isJoinable(meeting) {
  if (meeting.meeting_status === 'in_progress') return true;
  if (meeting.meeting_status === 'scheduled') {
    const scheduled  = new Date(meeting.scheduled_at).getTime();
    const durationMs = (meeting.duration_minutes || 60) * 60 * 1000;
    const now        = Date.now();
    return now >= scheduled - 15 * 60 * 1000 && now <= scheduled + durationMs;
  }
  return false;
}

const MeetingsPanel = ({ projectId, teamMembers }) => {
  const [activeTab,         setActiveTab]         = useState('upcoming');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [meetings,          setMeetings]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [activeCall,        setActiveCall]        = useState(null); // { url, title, meetingId }
  const [startingCall,      setStartingCall]      = useState(null); // 'video' | 'audio' | null

  // ── Real-time subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const unsub = subscribeMeetingsDirect(projectId, (data) => {
      setMeetings(data);
      setLoading(false);
    });
    return unsub;
  }, [projectId]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteMeetingDirect(id),
  });

  // ── Instant call — stable room so whole team joins the same call ────────────
  const handleInstantCall = async (callType) => {
    setStartingCall(callType);
    const url   = generateJitsiUrl(projectId, `instant-${callType}`);
    const title = callType === 'video' ? 'Instant Video Call' : 'Instant Audio Call';
    const existing = meetings.find(
      (m) => m.meeting_url === url && m.meeting_status === 'in_progress'
    );
    let meetingId = existing?.id ?? null;
    try {
      if (!existing) {
        const created = await createMeetingDirect({
          projectId,
          title,
          meeting_type: 'other',
          scheduled_at: new Date().toISOString(),
          duration_minutes: 60,
          meeting_url: url,
          participants: teamMembers?.map((m) => m.id) || [],
        });
        meetingId = created.id;
      }
      if (meetingId) await updateMeetingStatus(meetingId, 'in_progress');
    } catch { /* still launch call */ }
    setStartingCall(null);
    setActiveCall({ url, title, meetingId });
  };

  // ── Join a scheduled / live meeting ─────────────────────────────────────────
  const handleJoinMeeting = async (meeting) => {
    if (!meeting.meeting_url) return;
    try { await updateMeetingStatus(meeting.id, 'in_progress'); } catch { /* ignore */ }
    setActiveCall({ url: meeting.meeting_url, title: meeting.title, meetingId: meeting.id });
  };

  const handleDeleteMeeting = (id) => {
    if (window.confirm('Delete this meeting?')) deleteMutation.mutate(id);
  };

  // ── Derived lists ────────────────────────────────────────────────────────────
  const now              = Date.now();
  const liveMeetings     = meetings.filter((m) => m.meeting_status === 'in_progress');
  const upcomingMeetings = meetings.filter(
    (m) => m.meeting_status === 'scheduled' && new Date(m.scheduled_at).getTime() > now
  );
  const pastMeetings     = meetings.filter(
    (m) =>
      m.meeting_status === 'completed' ||
      (m.meeting_status !== 'in_progress' && new Date(m.scheduled_at).getTime() < now)
  );

  const tabMeetings = () => {
    if (activeTab === 'live')     return liveMeetings;
    if (activeTab === 'upcoming') return upcomingMeetings;
    if (activeTab === 'past')     return pastMeetings;
    return meetings;
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Meetings</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {liveMeetings.length > 0 && (
                <span className="text-green-600 font-semibold">{liveMeetings.length} live · </span>
              )}
              {upcomingMeetings.length} upcoming · {pastMeetings.length} past
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              onClick={() => handleInstantCall('video')}
              disabled={!!startingCall}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-sm transition-colors disabled:opacity-60"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              <Video className="h-4 w-4" />
              {startingCall === 'video' ? 'Starting…' : 'Start Video'}
            </motion.button>
            <motion.button
              onClick={() => handleInstantCall('audio')}
              disabled={!!startingCall}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl font-medium shadow-sm transition-colors disabled:opacity-60"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              <Mic className="h-4 w-4" />
              {startingCall === 'audio' ? 'Starting…' : 'Start Audio'}
            </motion.button>
            <motion.button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-medium shadow-sm transition-colors"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              <Plus className="h-4 w-4" />
              Schedule
            </motion.button>
          </div>
        </div>

        {/* Feature hint */}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
          {[
            { icon: <Video className="h-3 w-3" />,   text: 'Video' },
            { icon: <Mic className="h-3 w-3" />,     text: 'Audio' },
            { icon: <Monitor className="h-3 w-3" />, text: 'Screen Share' },
            { icon: <Volume2 className="h-3 w-3" />, text: 'Mute/Unmute' },
          ].map(({ icon, text }) => (
            <span key={text} className="flex items-center gap-1">{icon} {text}</span>
          ))}
          <span className="text-gray-300">— all controls inside the call</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {[
            { id: 'live',     label: 'Live',     count: liveMeetings.length,     dot: true },
            { id: 'upcoming', label: 'Upcoming', count: upcomingMeetings.length             },
            { id: 'past',     label: 'Past',     count: pastMeetings.length                 },
            { id: 'all',      label: 'All',      count: meetings.length                     },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.dot && tab.count > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
              {tab.label} <span className="ml-1 text-xs opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Meeting cards ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {tabMeetings().length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-14 w-14 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              No {activeTab === 'live' ? 'live calls' : activeTab + ' meetings'}
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              {activeTab === 'upcoming' ? 'Schedule a meeting or start an instant call.' :
               activeTab === 'live'     ? 'Start an instant video or audio call above.' : ''}
            </p>
            {activeTab !== 'past' && (
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => handleInstantCall('video')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  <Video className="h-4 w-4" /> Start Video Call
                </button>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" /> Schedule
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {tabMeetings().map((meeting) => {
                const { date, time } = formatMeetingTime(meeting.scheduled_at);
                const live      = meeting.meeting_status === 'in_progress';
                const joinable  = isJoinable(meeting);
                const isPast    = !live && new Date(meeting.scheduled_at).getTime() < Date.now();

                return (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-lg transition-all ${
                      live ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border ${typeColor(meeting.meeting_type)}`}>
                          {live ? <Radio className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-base leading-tight">{meeting.title}</h3>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 border ${typeColor(meeting.meeting_type)}`}>
                            {typeLabel(meeting.meeting_type)}
                          </span>
                        </div>
                      </div>
                      {live ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 shrink-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                          </span>
                          LIVE
                        </span>
                      ) : !isPast ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200 shrink-0">
                          Upcoming
                        </span>
                      ) : null}
                    </div>

                    {meeting.description && (
                      <p className="text-sm text-gray-500 mb-3">{meeting.description}</p>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gray-400" />{date}</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-400" />{time}</span>
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-gray-400" />{meeting.participants?.length || 0} people</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-400" />{meeting.duration_minutes || 60} min</span>
                    </div>

                    {/* Agenda */}
                    {meeting.agenda?.length > 0 && (
                      <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-xs font-semibold text-red-900 mb-1.5">Agenda</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {meeting.agenda.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-red-400 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Live feature chips */}
                    {live && (
                      <div className="mb-3 flex flex-wrap gap-2 text-xs text-green-700">
                        {['Video', 'Audio', 'Screen Share', 'Mute/Unmute', 'Chat'].map((f) => (
                          <span key={f} className="px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">{f}</span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      {joinable && meeting.meeting_url && (
                        <motion.button
                          onClick={() => handleJoinMeeting(meeting)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-colors ${
                            live ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <PlayCircle className="h-4 w-4" />
                          {live ? 'Join Live Call' : 'Join Meeting'}
                        </motion.button>
                      )}
                      {meeting.meeting_url && (
                        <a
                          href={meeting.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showScheduleModal && (
        <PanelScheduleModal
          projectId={projectId}
          teamMembers={teamMembers}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => setShowScheduleModal(false)}
        />
      )}

      {/* Embedded video call */}
      <AnimatePresence>
        {activeCall && (
          <VideoCallModal
            roomUrl={activeCall.url}
            callTitle={activeCall.title}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeetingsPanel;

// ─── Inline schedule modal for MeetingsPanel ─────────────────────────────────
function PanelScheduleModal({ projectId, teamMembers, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    meeting_type: 'standup',
    scheduled_at: '',
    duration_minutes: 60,
    description: '',
    agenda: [''],
    useCustomUrl: false,
    meeting_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const url = formData.useCustomUrl && formData.meeting_url.trim()
        ? formData.meeting_url.trim()
        : generateJitsiUrl(projectId, `${formData.meeting_type}-${Date.now()}`);

      await createMeetingDirect({
        projectId,
        title: formData.title,
        description: formData.description,
        meeting_type: formData.meeting_type,
        scheduled_at: formData.scheduled_at
          ? new Date(formData.scheduled_at).toISOString()
          : new Date().toISOString(),
        duration_minutes: parseInt(formData.duration_minutes) || 60,
        meeting_url: url,
        agenda: formData.agenda.filter((a) => a.trim() !== ''),
        participants: teamMembers?.map((m) => m.id) || [],
      });
      onSuccess();
    } catch {
      setSaveError('Failed to schedule meeting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Schedule Meeting</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input type="text" value={formData.title} required
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Sprint Planning"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
              <select value={formData.meeting_type}
                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                <option value="standup">Daily Standup</option>
                <option value="planning">Planning</option>
                <option value="review">Review</option>
                <option value="retrospective">Retrospective</option>
                <option value="brainstorming">Brainstorming</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Scheduled At *</label>
              <input type="datetime-local" required value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (min)</label>
            <input type="number" value={formData.duration_minutes} min="15" step="15"
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>
          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2 cursor-pointer">
              <input type="checkbox" checked={formData.useCustomUrl}
                onChange={(e) => setFormData({ ...formData, useCustomUrl: e.target.checked, meeting_url: '' })}
                className="rounded text-red-600" />
              <span>Use custom meeting URL (Zoom, Google Meet…)</span>
            </label>
            {formData.useCustomUrl && (
              <input type="url" value={formData.meeting_url}
                onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                placeholder="https://zoom.us/j/123"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
            )}
            {!formData.useCustomUrl && (
              <p className="text-xs text-gray-500">A free Jitsi Meet room will be created automatically.</p>
            )}
          </div>
          {saveError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{saveError}</p>}
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50">
              {saving ? 'Scheduling…' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

