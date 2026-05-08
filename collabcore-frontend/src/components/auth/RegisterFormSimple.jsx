import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Building2, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { register } from '../../services/authService';
import { USER_ROLES } from '../../utils/constants';
import { WORLD_UNIVERSITIES } from '../../data/universities';
import LoadingSpinner from '../common/LoadingSpinner';

const RegisterFormSimple = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    university: '',
    role: USER_ROLES.STUDENT,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const universities = WORLD_UNIVERSITIES;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError('');
  };

  const nextStep = () => {
    setStep(step + 1);
    setApiError('');
  };

  const prevStep = () => {
    setStep(step - 1);
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    setLoading(true);
    
    try {
      await register(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);

      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to create account. Please try again.';

      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  if (success) {
    return (
      <motion.div 
        className="w-full max-w-md"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="bg-white border-2 border-red-600 rounded-2xl sm:rounded-3xl shadow-2xl shadow-red-900/20 p-8 sm:p-12 text-center">
          <motion.div 
            className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-6 shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="h-10 w-10 text-gray-900" />
          </motion.div>
          <motion.h2 
            className="text-3xl font-bold text-gray-900 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Account Created! 🎉
          </motion.h2>
          <motion.p 
            className="text-gray-600 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Verification email has been sent. Verify your email, then log in.
          </motion.p>
        </div>
      </motion.div>
    );
  }

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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-2xl mb-4 shadow-lg"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="h-8 w-8 text-gray-900" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Join CollabCore</h2>
          <p className="text-gray-600 text-sm sm:text-base">Step {step} of 3</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`h-2 rounded-full flex-1 mx-1 ${
                  i <= step ? 'bg-red-600' : 'bg-gray-200'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: i <= step ? 1 : 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>

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

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait" custom={step}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                {/* Name */}
                <div>
                  <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                    What's your name?
                  </label>
                  <div className={`relative transition-all duration-300 ${
                    focusedField === 'full_name' ? 'scale-[1.02]' : ''
                  }`}>
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                      focusedField === 'full_name' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('full_name')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all ${
                        focusedField === 'full_name' 
                          ? 'border-red-500 bg-red-50/50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Your email address
                  </label>
                  <div className={`relative transition-all duration-300 ${
                    focusedField === 'email' ? 'scale-[1.02]' : ''
                  }`}>
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                      focusedField === 'email' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all ${
                        focusedField === 'email' 
                          ? 'border-red-500 bg-red-50/50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      placeholder="you@university.edu"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={nextStep}
                  disabled={!formData.full_name || !formData.email}
                  className="w-full bg-red-600 text-gray-900 py-4 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </motion.button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                {/* University */}
                <div>
                  <label htmlFor="university" className="block text-sm font-semibold text-gray-700 mb-2">
                    Which university?
                  </label>
                  <div className={`relative transition-all duration-300 ${
                    focusedField === 'university' ? 'scale-[1.02]' : ''
                  }`}>
                    <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors pointer-events-none z-10 ${
                      focusedField === 'university' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <select
                      id="university"
                      name="university"
                      value={formData.university}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('university')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 pr-10 py-4 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer bg-no-repeat ${
                        focusedField === 'university' 
                          ? 'border-red-500 bg-red-50/50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23${focusedField === 'university' ? 'DC2626' : '9CA3AF'}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.5rem 1.5rem'
                      }}
                      required
                    >
                      <option value="" disabled>Select your university</option>
                      {universities.length > 0 ? (
                        universities.map((uni, index) => {
                          const isObject = typeof uni === 'object' && uni !== null;
                          const value = isObject ? uni.id || uni.name || `uni-${index}` : uni;
                          const label = isObject ? uni.name || uni.id || uni : uni;

                          return (
                            <option key={value || index} value={value}>
                              {label}
                            </option>
                          );
                        })
                      ) : (
                        <option value="" disabled>Loading universities...</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    I am a
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: USER_ROLES.STUDENT }))}
                      className={`p-4 border-2 rounded-xl font-semibold transition-all ${
                        formData.role === USER_ROLES.STUDENT
                          ? 'border-red-600 bg-red-50 text-red-700 shadow-md'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      🎓 Student
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: USER_ROLES.PROJECT_LEADER }))}
                      className={`p-4 border-2 rounded-xl font-semibold transition-all ${
                        formData.role === USER_ROLES.PROJECT_LEADER
                          ? 'border-red-600 bg-red-50 text-red-700 shadow-md'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      🚀 Project Leader
                    </motion.button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    disabled={!formData.university}
                    className="flex-1 bg-red-600 text-gray-900 py-4 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Create a password
                  </label>
                  <div className={`relative transition-all duration-300 ${
                    focusedField === 'password' ? 'scale-[1.02]' : ''
                  }`}>
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                      focusedField === 'password' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 pr-12 py-4 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all ${
                        focusedField === 'password' 
                          ? 'border-red-500 bg-red-50/50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      placeholder="Min. 8 characters"
                      required
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </motion.button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Use 8+ characters with a mix of letters, numbers & symbols
                  </p>
                </div>

                {/* Terms */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-1"
                    required
                  />
                  <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="#" className="text-red-600 hover:text-red-700 font-medium">
                      Terms
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-red-600 hover:text-red-700 font-medium">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading || !formData.password}
                    className="flex-1 bg-red-600 text-gray-900 py-4 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl relative overflow-hidden group"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                  >
                    <span className="relative z-10">
                      {loading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Account
                          <CheckCircle className="ml-2 h-5 w-5 inline" />
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Sign In Link */}
        <motion.p 
          className="mt-8 text-center text-sm text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Already have an account?{' '}
          <Link to="/login" className="text-red-600 hover:text-red-700 font-semibold transition-colors">
            Sign in →
          </Link>
        </motion.p>
      </div>
    </motion.div>
  );
};

export default RegisterFormSimple;

