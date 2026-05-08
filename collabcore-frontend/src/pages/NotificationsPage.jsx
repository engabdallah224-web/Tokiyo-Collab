import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/firestoreService';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToNotifications(user.uid, (rows) => {
      setItems(rows || []);
      setLoading(false);
    });

    return unsub;
  }, [user?.uid]);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return 'Just now';
    return d.toLocaleString();
  };

  const handleOpen = async (item) => {
    if (!item.is_read) {
      try {
        await markNotificationAsRead(item.id);
      } catch {
        // Keep UX responsive even when update fails.
      }
    }
    if (item.link) {
      window.location.href = item.link;
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.uid || unreadCount === 0) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch {
      // no-op
    }
  };

  return (
    <div className="min-h-[70vh] bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">All your updates in one place</p>
          </div>

          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-600">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-1">No notifications yet</h2>
            <p className="text-gray-600">When someone interacts with your projects, updates will appear here.</p>
            <Link
              to="/discovery"
              className="inline-flex mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
            >
              Explore Projects
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleOpen(item)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-all hover:shadow-sm ${
                  item.is_read ? 'border-gray-200' : 'border-red-200 bg-red-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{item.title || 'Notification'}</p>
                    <p className="text-sm text-gray-700 mt-1 break-words">{item.message || 'You have a new update.'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.created_at)}
                      </span>
                      {item.type && <span className="uppercase tracking-wide">{item.type}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!item.is_read && <span className="h-2.5 w-2.5 rounded-full bg-red-600" />}
                    {item.link && <ExternalLink className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
