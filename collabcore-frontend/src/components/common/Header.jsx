import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, User, Bell, Sparkles, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToNotifications } from '../../services/firestoreService';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const uid = user?.uid || user?.id || null;

  // Real-time notification badge — updates instantly when a new notification arrives
  useEffect(() => {
    if (!uid) { setUnreadCount(0); return; }
    const unsub = subscribeToNotifications(uid, (items) => {
      setUnreadCount(items.filter((n) => !n.is_read).length);
    });
    return unsub;
  }, [uid]);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  return (
    <motion.header 
      className="bg-black/95 backdrop-blur-lg border-b border-red-900/50 sticky top-0 z-50 shadow-lg shadow-red-900/20"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 md:space-x-3 group flex-shrink-0">
            <motion.div
              className="relative"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 bg-red-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-red-600 p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-lg">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </motion.div>
            <div className="flex items-center">
              <motion.span
                className="text-lg md:text-2xl font-bold"
                animate={{ color: ['#ffffff', '#ef4444', '#ff6b6b', '#ffffff'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                CollabCore
              </motion.span>
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
                className="hidden sm:block"
              >
                <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-red-500 ml-1" />
              </motion.div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated ? (
            <>
              <motion.nav 
                className="hidden lg:flex items-center space-x-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Link
                  to="/discovery"
                  className="text-white hover:text-red-500 font-medium transition-all"
                >
                  Discover
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Link
                  to="/projects"
                  className="text-white hover:text-red-500 font-medium transition-all"
                >
                  Projects
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Link
                  to="/search"
                  className="text-white hover:text-red-500 font-medium transition-all"
                >
                  Search
                </Link>
              </motion.div>

                <div className="flex items-center space-x-2 ml-4 border-l border-red-900 pl-4">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 15 }} 
                  whileTap={{ scale: 0.9 }}
                >
                  <Link
                    to="/notifications"
                    className="relative p-2 hover:bg-red-900/50 rounded-xl transition-all focus:outline-none"
                  >
                    <Bell className="h-5 w-5 text-white" />
                    {unreadCount > 0 && (
                      <motion.span 
                        className="absolute top-1 right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-lg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, delay: 0.5 }}
                        whileHover={{ scale: 1.2 }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </Link>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }}
                >
                  <Link
                    to="/profile"
                    className="p-2 hover:bg-red-900/50 rounded-xl transition-all focus:outline-none"
                  >
                    <User className="h-5 w-5 text-white" />
                  </Link>
                </motion.div>

                <motion.button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-600/50 rounded-xl transition-all group focus:outline-none"
                  title="Logout"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <LogOut className="h-5 w-5 text-white group-hover:text-red-400 transition-colors" />
                </motion.button>
              </div>
            </motion.nav>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-red-900/50 rounded-lg transition-all focus:outline-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </motion.button>
          </>
          ) : (
            <motion.nav 
              className="flex items-center gap-2 md:gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                to="/login"
                className="inline-block text-white hover:text-red-500 font-semibold transition-all px-3 md:px-5 py-2 md:py-2.5 rounded-lg hover:bg-red-900/30 text-sm md:text-base whitespace-nowrap"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-block bg-red-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl text-sm md:text-base whitespace-nowrap"
              >
                Sign Up
              </Link>
            </motion.nav>
          )}
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isAuthenticated && mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden border-t border-red-900 mt-3 bg-black"
            >
              <div className="py-4 space-y-3">
                <Link
                  to="/discovery"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-white hover:bg-red-900/50 rounded-lg transition-all font-medium"
                >
                  Discover
                </Link>
                <Link
                  to="/projects"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-white hover:bg-red-900/50 rounded-lg transition-all font-medium"
                >
                  My Projects
                </Link>
                <Link
                  to="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-white hover:bg-red-900/50 rounded-lg transition-all font-medium"
                >
                  Search
                </Link>
                
                <div className="border-t border-red-900 pt-3 mt-3 space-y-3">
                  <Link
                    to="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2 text-white hover:bg-red-900/50 rounded-lg transition-all"
                  >
                    <span className="font-medium">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-600 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-semibold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-white hover:bg-red-900/50 rounded-lg transition-all font-medium"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-900/50 rounded-lg transition-all font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;

