import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  LogOut, 
  User, 
  Bell, 
  Menu, 
  X, 
  Search, 
  Compass, 
  Layout,
  PlusCircle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToNotifications } from '../../services/firestoreService';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const uid = user?.uid || user?.id || null;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!uid) { setUnreadCount(0); return; }
    const unsub = subscribeToNotifications(uid, (items) => {
      setUnreadCount(items.filter((n) => !n.is_read).length);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Discover', path: '/discovery', icon: Compass },
    { name: 'Projects', path: '/projects', icon: Layout },
    { name: 'Search', path: '/search', icon: Search },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 bg-black/80 backdrop-blur-md ${
        scrolled 
          ? 'border-b border-white/10 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
          : 'py-5'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-red-600 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-red-600 to-red-800 p-2 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500/30">
                <Users className="h-6 w-6 text-white" />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-white group-hover:text-red-500 transition-colors">
                Collab<span className="text-red-600">Core</span>
              </span>
              <div className="h-1 w-0 group-hover:w-full bg-red-600 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(220,38,38,0.6)]"></div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                to={link.path}
                className={`text-sm font-bold uppercase tracking-widest transition-all hover:text-red-600 ${
                  location.pathname === link.path ? 'text-red-600' : 'text-gray-400'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 md:space-x-5">
            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center space-x-4 border-r border-white/10 pr-5">
                  <Link to="/notifications" className="relative text-gray-400 hover:text-white">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full"></span>
                    )}
                  </Link>
                  <Link to="/profile" className="text-gray-400 hover:text-white">
                    <User className="h-5 w-5" />
                  </Link>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="bg-white/5 hover:bg-red-600 text-white p-2.5 rounded-xl border border-white/10 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                </motion.button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    className="text-gray-400 hover:text-white font-bold text-sm px-4"
                  >
                    Login
                  </motion.button>
                </Link>
                <Link to="/register">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-600/20"
                  >
                    Join
                  </motion.button>
                </Link>
              </div>
            )}

            {/* Mobile Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[340px] bg-black border-l border-white/10 z-[100] md:hidden p-8 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between mb-10">
                <span className="text-xl font-black text-white tracking-widest uppercase">Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white p-2">
                  <X className="h-7 w-7" />
                </button>
              </div>

              {/* Navigation Links - Clean minimalist style */}
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <Link 
                    key={link.path}
                    to={link.path}
                    className={`flex items-center justify-between py-4 px-2 rounded-xl transition-all ${
                      location.pathname === link.path 
                        ? 'text-red-600' 
                        : 'text-gray-400 hover:text-white hover:pl-4'
                    }`}
                  >
                    <div className="flex items-center space-x-5">
                      <link.icon className={`h-6 w-6 ${location.pathname === link.path ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="font-black text-xl tracking-tight">{link.name}</span>
                    </div>
                    {location.pathname === link.path && (
                      <motion.div layoutId="mobile-active" className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                    )}
                  </Link>
                ))}
              </div>

              {/* User Actions Section */}
              <div className="mt-8 pt-8 border-t border-white/5 space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link 
                      to="/notifications" 
                      className="flex items-center justify-between py-4 px-2 text-gray-400 hover:text-white transition-all"
                    >
                      <div className="flex items-center space-x-5">
                        <Bell className="h-6 w-6 text-gray-500" />
                        <span className="font-bold text-lg">Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link 
                      to="/profile" 
                      className="flex items-center space-x-5 py-4 px-2 text-gray-400 hover:text-white transition-all"
                    >
                      <User className="h-6 w-6 text-gray-500" />
                      <span className="font-bold text-lg">My Profile</span>
                    </Link>
                  </>
                ) : (
                  <Link 
                    to="/login" 
                    className="block bg-red-600 text-white text-center py-4 rounded-2xl font-black text-lg shadow-lg shadow-red-600/20 mt-4"
                  >
                    Login / Join Now
                  </Link>
                )}
              </div>

              {/* Sign Out at the very bottom */}
              {isAuthenticated && (
                <div className="mt-auto pt-10">
                  <button 
                    onClick={logout} 
                    className="flex items-center space-x-5 py-5 px-6 w-full rounded-2xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all group"
                  >
                    <LogOut className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                    <span className="font-black text-lg">Sign Out</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
