import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

const LoadingSpinner = ({ size = 'default', className = '', light = false }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  const containerSizes = {
    sm: 'p-1',
    default: 'p-2.5',
    lg: 'p-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Sleek minimalist high-speed spinner */}
        <motion.div
          className={`rounded-full border-2 border-red-600/20 border-t-red-600 ${sizeClasses[size]}`}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
        />
        {/* Subtle inner pulse for depth */}
        <motion.div
          className={`absolute rounded-full bg-red-600/10 ${sizeClasses[size]}`}
          animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

export default LoadingSpinner;

