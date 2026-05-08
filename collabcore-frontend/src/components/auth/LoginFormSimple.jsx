import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { login, loginWithGoogle, loginWithGithub } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';

const LoginFormSimple = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [apiError, setApiError] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError('');
  };

  const handleSocialLogin = async (provider) => {
    setApiError('');
    setSocialLoading(provider);

    try {
      const response = provider === 'google'
        ? await loginWithGoogle()
        : await loginWithGithub();

      if (response?.redirecting) {
        // Page will redirect to OAuth provider; auth state handled on return
        return;
      }

      authLogin(response.user);
      navigate('/discovery');
    } catch (error) {
      console.error(`${provider} login error:`, error);
      if (error.code === 'auth/popup-closed-by-user') {
        setApiError('Login popup was closed. Please try again.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setApiError('This email is already linked to another sign-in method.');
      } else {
        setApiError(error.message || 'Social login failed. Please try again.');
      }
      setSocialLoading('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!formData.email || !formData.password) {
      setApiError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await login(formData.email, formData.password);
      authLogin(response.user);
      navigate('/discovery');
    } catch (error) {
      console.error('Login error:', error);
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Invalid email or password. Please try again.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white border-2 border-red-600 rounded-2xl sm:rounded-3xl shadow-2xl shadow-red-900/20 p-6 sm:p-10 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <motion.div 
          className="absolute -top-20 -right-20 w-40 h-40 bg-red-600 rounded-full blur-3xl opacity-20"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="h-8 w-8 text-gray-900" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
          <p className="text-gray-700 text-sm sm:text-base">Sign in to continue your journey</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {apiError && (
            <motion.div 
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start space-x-3"
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{apiError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <motion.div 
              className={`relative transition-all duration-300 ${
                focusedField === 'email' ? 'scale-[1.02]' : ''
              }`}
            >
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                focusedField === 'email' ? 'text-red-500' : 'text-gray-500'
              }`} />
              <motion.input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-900 ${
                  focusedField === 'email' 
                    ? 'border-red-500 bg-gray-100' 
                    : 'border-gray-300 bg-gray-100'
                }`}
                placeholder="you@example.com"
                whileFocus={{ scale: 1.01 }}
              />
            </motion.div>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <motion.div 
              className={`relative transition-all duration-300 ${
                focusedField === 'password' ? 'scale-[1.02]' : ''
              }`}
            >
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                focusedField === 'password' ? 'text-red-500' : 'text-gray-500'
              }`} />
              <motion.input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-12 pr-12 py-4 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-900 ${
                  focusedField === 'password' 
                    ? 'border-red-500 bg-gray-100' 
                    : 'border-gray-300 bg-gray-100'
                }`}
                placeholder="Enter your password"
                whileFocus={{ scale: 1.01 }}
              />
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Remember & Forgot */}
          <motion.div 
            className="flex items-center justify-between text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                className="h-4 w-4 text-red-600 border-gray-300 bg-gray-100 rounded focus:ring-red-500 cursor-pointer"
              />
              <span className="ml-2 text-gray-700 group-hover:text-red-500 transition-colors">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-red-500 hover:text-red-400 font-medium transition-colors">
              Forgot password?
            </Link>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-gray-900 py-4 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <motion.span
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <motion.div 
          className="mt-8 mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium">Or continue with</span>
            </div>
          </div>
        </motion.div>

        {/* Social Login */}
        <motion.div 
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <motion.button 
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={loading || socialLoading !== ''}
            className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 bg-gray-100 rounded-xl hover:border-red-500 hover:bg-gray-200 transition-all group"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="h-5 w-5 text-gray-900" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="ml-2 text-sm font-semibold text-gray-900 group-hover:text-red-500 transition-colors">
              {socialLoading === 'google' ? 'Connecting...' : 'Google'}
            </span>
          </motion.button>
          
          <motion.button 
            type="button"
            onClick={() => handleSocialLogin('github')}
            disabled={loading || socialLoading !== ''}
            className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 bg-gray-100 rounded-xl hover:border-red-500 hover:bg-gray-200 transition-all group"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="h-5 w-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="ml-2 text-sm font-semibold text-gray-900 group-hover:text-red-500 transition-colors">
              {socialLoading === 'github' ? 'Connecting...' : 'GitHub'}
            </span>
          </motion.button>
        </motion.div>

        {/* Sign Up Link */}
        <motion.p 
          className="mt-8 text-center text-sm text-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Don't have an account?{' '}
          <Link to="/register" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
            Create one now →
          </Link>
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LoginFormSimple;

