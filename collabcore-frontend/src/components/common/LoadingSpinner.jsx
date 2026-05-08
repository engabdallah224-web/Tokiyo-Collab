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
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        {/* Professional, static logo container */}
        <div className={`relative bg-red-600 ${containerSizes[size]} rounded-2xl shadow-sm z-10 border border-red-500/10`}>
          <Users className={`${sizeClasses[size]} text-white`} />
        </div>

        {/* High-end thin spinning ring - perfectly centered, doesn't touch logo */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent border-t-red-600/60"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
          style={{ 
            margin: '-6px',
            padding: '-6px'
          }}
        />
      </div>
    </div>
  );
};

export default LoadingSpinner;

