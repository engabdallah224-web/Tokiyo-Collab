import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Phone, Calendar, X, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { generateJitsiUrl, createMeetingDirect } from '../../services/firestoreService';
import VideoCallModal from './VideoCallModal';

export default function CallButtons({ projectId, teamMembers }) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeCall, setActiveCall] = useState(null); // { url, title }
  const queryClient = useQueryClient();

  const handleInstantCall = async (callType) => {
    // Use a STABLE room per project so all team members join the same call
    const url   = generateJitsiUrl(projectId, `instant-${callType}`);
    const title = callType === 'video' ? 'Instant Video Call' : 'Instant Audio Call';
    try {
      await createMeetingDirect({
        projectId,
        title,
        meeting_type: 'other',
        scheduled_at: new Date().toISOString(),
        duration_minutes: 60,
        meeting_url: url,
        agenda: [],
        participants: teamMembers?.map((m) => m.id) || [],
      });
    } catch {
      // silent — still open call
    }
    setActiveCall({ url, title });
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Video Call Button */}
        <motion.button
          onClick={() => handleInstantCall('video')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Start instant video call"
        >
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline text-sm font-medium">Video</span>
        </motion.button>

        {/* Audio Call Button */}
        <motion.button
          onClick={() => handleInstantCall('audio')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Start instant audio call"
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline text-sm font-medium">Audio</span>
        </motion.button>

        {/* Schedule Meeting Button */}
        <motion.button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Schedule a meeting"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline text-sm font-medium">Schedule</span>
        </motion.button>
      </div>

      {/* Embedded video call overlay */}
      <AnimatePresence>
        {activeCall && (
          <VideoCallModal
            roomUrl={activeCall.url}
            callTitle={activeCall.title}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <ScheduleMeetingModal
          projectId={projectId}
          teamMembers={teamMembers}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            queryClient.invalidateQueries(['project-meetings', projectId]);
          }}
        />
      )}
    </>
  );
}

// Schedule Meeting Modal
function ScheduleMeetingModal({ projectId, teamMembers, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_type: 'standup',
    scheduled_at: '',
    duration_minutes: 60,
    participants: [],
    agenda: [''],
    meeting_url: '',
    auto_generate_room: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const url = formData.auto_generate_room
        ? generateJitsiUrl(projectId, `${formData.meeting_type}-${Date.now()}`)
        : formData.meeting_url.trim();

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
        participants: formData.participants,
      });
      onSuccess();
    } catch {
      setSaveError('Failed to schedule meeting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addAgendaItem = () => {
    setFormData(prev => ({
      ...prev,
      agenda: [...prev.agenda, '']
    }));
  };

  const updateAgendaItem = (index, value) => {
    const newAgenda = [...formData.agenda];
    newAgenda[index] = value;
    setFormData(prev => ({ ...prev, agenda: newAgenda }));
  };

  const removeAgendaItem = (index) => {
    setFormData(prev => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index)
    }));
  };

  const toggleParticipant = (userId) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Schedule Meeting</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meeting Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Weekly Standup"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will you discuss?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
            />
          </div>

          {/* Meeting Type & Date Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meeting Type
              </label>
              <select
                value={formData.meeting_type}
                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              >
                <option value="standup">Daily Standup</option>
                <option value="planning">Planning</option>
                <option value="review">Review</option>
                <option value="retrospective">Retrospective</option>
                <option value="brainstorming">Brainstorming</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              min="15"
              step="15"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Participants
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-xl">
              {teamMembers.map((member) => (
                <label key={member.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.participants.includes(member.id)}
                    onChange={() => toggleParticipant(member.id)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                    {member.avatar}
                  </div>
                  <span className="text-sm text-gray-900">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Agenda
            </label>
            <div className="space-y-2">
              {formData.agenda.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateAgendaItem(index, e.target.value)}
                    placeholder={`Agenda item ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  {formData.agenda.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAgendaItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAgendaItem}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add agenda item</span>
              </button>
            </div>
          </div>

          {/* Meeting Platform */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meeting Platform
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.auto_generate_room}
                  onChange={() => setFormData({ ...formData, auto_generate_room: true, meeting_url: '' })}
                  className="text-red-600 focus:ring-red-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto-generate Jitsi room</p>
                  <p className="text-xs text-gray-500">Free, no account needed</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.auto_generate_room}
                  onChange={() => setFormData({ ...formData, auto_generate_room: false })}
                  className="text-red-600 focus:ring-red-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Custom meeting link</p>
                  <p className="text-xs text-gray-500 mb-2">Use Zoom, Google Meet, etc.</p>
                  {!formData.auto_generate_room && (
                    <input
                      type="url"
                      value={formData.meeting_url}
                      onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                      placeholder="https://zoom.us/j/123456789"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{saveError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {saving ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

