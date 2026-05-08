import { motion } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';

const FeedFilters = ({ filters, setFilters }) => {
  const skills = ['React', 'Python', 'Machine Learning', 'Node.js', 'UI/UX', 'Data Science', 'Mobile Dev', 'Blockchain'];
  const statuses = ['recruiting', 'active', 'all'];

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
      {/* Search */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 bg-white text-gray-900 rounded-lg focus:border-red-500 focus:outline-none transition-all placeholder:text-gray-400 text-sm"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Filter className="inline h-3 w-3 mr-1" />
          Status
        </label>
        <div className="flex gap-1">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setFilters({ ...filters, status })}
              className={`px-3 py-1 rounded-lg font-medium text-xs transition-all ${
                filters.status === status
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Skills
        </label>
        <div className="flex flex-wrap gap-1">
          {skills.map((skill) => {
            const isSelected = filters.skills?.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => {
                  const currentSkills = filters.skills || [];
                  const newSkills = isSelected
                    ? currentSkills.filter((s) => s !== skill)
                    : [...currentSkills, skill];
                  setFilters({ ...filters, skills: newSkills });
                }}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isSelected && <X className="inline h-3 w-3 mr-1" />}
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.search || filters.status !== 'all' || filters.skills?.length > 0) && (
        <motion.button
          onClick={() => setFilters({ search: '', status: 'all', skills: [] })}
          className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Clear all filters
        </motion.button>
      )}
    </div>
  );
};

export default FeedFilters;

