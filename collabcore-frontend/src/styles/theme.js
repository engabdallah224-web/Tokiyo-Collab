// CollabCore Design System - Single Theme
export const theme = {
  colors: {
    // Primary gradient colors
    primary: {
      blue: '#3B82F6',      // blue-500
      blueLight: '#60A5FA', // blue-400
      blueDark: '#2563EB',  // blue-600
      purple: '#8B5CF6',    // purple-500
      purpleLight: '#A78BFA', // purple-400
      purpleDark: '#7C3AED',  // purple-600
    },
    
    // Accent colors
    accent: {
      pink: '#EC4899',      // pink-500
      cyan: '#06B6D4',      // cyan-500
      indigo: '#6366F1',    // indigo-500
    },
    
    // Neutrals
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    
    // Semantic colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  
  gradients: {
    primary: 'from-blue-500 via-purple-500 to-purple-600',
    primaryHover: 'from-blue-600 via-purple-600 to-purple-700',
    background: 'from-blue-50 via-purple-50 to-pink-50',
    card: 'from-blue-500/10 to-purple-500/10',
    text: 'from-blue-600 to-purple-600',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  },
  
  animations: {
    duration: {
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      default: 'ease-in-out',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
};

export default theme;

