import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, CheckCircle, XCircle, Clock, Star, Code } from 'lucide-react';
import { useState } from 'react';

const ApplicationsPanel = ({ projectId, applications }) => {
  const [selectedApp, setSelectedApp] = useState(null);

  const handleAccept = (appId) => {
    console.log('Accepting application:', appId);
    // TODO: API call
  };

  const handleReject = (appId) => {
    console.log('Rejecting application:', appId);
    // TODO: API call
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Applications ({applications.length})
        </h3>
        <span className="text-sm text-gray-500">
          {applications.filter(a => a.status === 'pending').length} pending
        </span>
      </div>

      {applications.map((app) => (
        <motion.div
          key={app.id}
          className="bg-red-600 rounded-xl p-4 border-2 border-purple-100 hover:border-purple-300 transition-all"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {app.user.name.charAt(0)}
            </div>

            <div className="flex-1">
              {/* User Info */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-gray-900">{app.user.name}</h4>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {app.user.email}
                  </p>
                  <p className="text-sm text-gray-600">{app.user.university}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-semibold text-gray-700">
                    {app.user.rating || '4.5'}
                  </span>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-2 mb-3">
                {app.user.skills.slice(0, 4).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-white text-purple-700 text-xs font-semibold rounded-full border border-purple-200"
                  >
                    <Code className="inline h-3 w-3 mr-1" />
                    {skill}
                  </span>
                ))}
              </div>

              {/* Message Preview */}
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 line-clamp-2">{app.message}</p>
                {app.message.length > 100 && (
                  <button
                    onClick={() => setSelectedApp(app.id)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                  >
                    Read more...
                  </button>
                )}
              </div>

              {/* Time & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  Applied {app.appliedAt}
                </div>

                {app.status === 'pending' ? (
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleReject(app.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </motion.button>
                    <motion.button
                      onClick={() => handleAccept(app.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept
                    </motion.button>
                  </div>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    app.status === 'accepted' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {app.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ApplicationsPanel;

