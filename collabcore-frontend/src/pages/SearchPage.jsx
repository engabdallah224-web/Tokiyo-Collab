import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Briefcase, Filter, MapPin, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProjects, fetchAllUsers } from '../services/firestoreService';
import { formatStatus } from '../utils/helpers';

const POPULAR_SKILLS = [
  'React', 'Python', 'JavaScript', 'Machine Learning', 'Node.js',
  'Flutter', 'Django', 'Data Science', 'UI/UX', 'Firebase',
];

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('projects');
  const [filters, setFilters] = useState({
    skills: [],
    status: 'all',
  });

  // ── Firestore data ──────────────────────────────────────────────────────────
  const { data: allProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['search-all-projects'],
    queryFn: () => fetchProjects({ limitCount: 200 }),
    staleTime: 60000,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['search-all-users'],
    queryFn: () => fetchAllUsers(200),
    enabled: searchType === 'users',
    staleTime: 60000,
  });

  // ── Client-side filtering ───────────────────────────────────────────────────
  const projectResults = useMemo(() => {
    let results = allProjects;
    if (filters.status !== 'all') {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters.skills.length > 0) {
      results = results.filter((p) =>
        filters.skills.some((skill) =>
          (p.required_skills || []).some((s) =>
            s.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          (p.required_skills || []).some((s) => s.toLowerCase().includes(q)) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return results.sort((a, b) =>
      (b.created_at || '') > (a.created_at || '') ? 1 : -1
    );
  }, [allProjects, searchQuery, filters]);

  const userResults = useMemo(() => {
    let results = allUsers;
    if (filters.skills.length > 0) {
      results = results.filter((u) =>
        filters.skills.some((skill) =>
          (u.skills || []).some((s) =>
            s.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.bio?.toLowerCase().includes(q) ||
          u.university?.toLowerCase().includes(q) ||
          (u.skills || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return results;
  }, [allUsers, searchQuery, filters.skills]);

  const activeFiltersCount =
    filters.skills.length + (filters.status !== 'all' ? 1 : 0);

  const handleRemoveFilter = (filterType, value) => {
    if (filterType === 'skills') {
      setFilters((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== value) }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: 'all' }));
    }
  };

  const toggleSkill = (skill) =>
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));

  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Search & Discover</h1>
          <p className="text-gray-600">Find projects and collaborators that match your interests</p>
        </motion.div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchType === 'projects' ? 'Search projects, skills, tags...' : 'Search by name, skill, university...'}
                className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-xl focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-400 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchType('projects')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${searchType === 'projects' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Briefcase className="h-4 w-4" />
              Projects
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${searchType === 'projects' ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                {projectsLoading ? '...' : projectResults.length}
              </span>
            </button>
            <button
              onClick={() => setSearchType('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${searchType === 'users' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Users className="h-4 w-4" />
              People
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${searchType === 'users' ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                {usersLoading ? '...' : userResults.length}
              </span>
            </button>
          </div>

          {/* Quick skill suggestions */}
          <div className="flex flex-wrap gap-2">
            {POPULAR_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  filters.skills.includes(skill)
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-red-400 hover:text-red-600'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </h3>
                {activeFiltersCount > 0 && (
                  <button onClick={() => setFilters({ skills: [], status: 'all' })} className="text-sm text-red-600 hover:text-red-700 font-medium">
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Skill</label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          filters.skills.includes(skill) ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                {searchType === 'projects' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="all">All Status</option>
                      <option value="recruiting">Recruiting</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}

                {filters.skills.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Active:</p>
                    <div className="flex flex-wrap gap-1">
                      {filters.skills.map((skill) => (
                        <div key={skill} className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                          {skill}
                          <button onClick={() => handleRemoveFilter('skills', skill)}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {searchType === 'projects' ? `${projectResults.length} Projects` : `${userResults.length} People`}
                {(searchQuery || filters.skills.length > 0) && (
                  <span className="text-sm font-normal text-gray-500 ml-2">matching your filters</span>
                )}
              </h2>
            </div>

            {/* Projects */}
            {searchType === 'projects' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {projectsLoading ? (
                  <div className="col-span-2 text-center py-12 text-gray-500">Loading projects...</div>
                ) : projectResults.length === 0 ? (
                  <div className="col-span-2 text-center py-12">
                    <div className="text-5xl mb-3">🔍</div>
                    <p className="text-gray-600 font-medium">No projects found. Try adjusting your filters.</p>
                  </div>
                ) : (
                  projectResults.map((project) => (
                    <motion.div
                      key={project.id}
                      className="bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all"
                      whileHover={{ y: -2 }}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <Link to={`/projects/${project.id}`}>
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-red-600 transition-colors mb-1">
                                {project.title}
                              </h3>
                            </Link>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              project.status === 'recruiting' ? 'bg-green-100 text-green-700'
                              : project.status === 'active' ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                            }`}>
                              {formatStatus(project.status)}
                            </span>
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description}</p>

                        {(project.required_skills || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {project.required_skills.slice(0, 4).map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-100">
                                {skill}
                              </span>
                            ))}
                            {project.required_skills.length > 4 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{project.required_skills.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{project.current_team_size || 0}/{project.team_size_limit || '?'} members</span>
                          </div>
                          <Link to={`/projects/${project.id}`}>
                            <button className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
                              View
                            </button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Users */}
            {searchType === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usersLoading ? (
                  <div className="col-span-3 text-center py-12 text-gray-500">Loading users...</div>
                ) : userResults.length === 0 ? (
                  <div className="col-span-3 text-center py-12">
                    <div className="text-5xl mb-3">👥</div>
                    <p className="text-gray-600 font-medium">No users found. Try a different skill or name.</p>
                  </div>
                ) : (
                  userResults.map((u) => (
                    <motion.div
                      key={u.id || u.uid}
                      className="bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all"
                      whileHover={{ y: -2 }}
                    >
                      <div className="p-5 text-center">
                        <div className="h-14 w-14 rounded-full bg-red-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <Link to={`/users/${u.id || u.uid}`}>
                          <h3 className="text-base font-semibold text-gray-900 hover:text-red-600 transition-colors mb-1">
                            {u.full_name || u.email || 'Unknown'}
                          </h3>
                        </Link>
                        {u.university && (
                          <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mb-2">
                            <MapPin className="h-3 w-3" />
                            {u.university}
                          </p>
                        )}
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                          u.role === 'project_leader' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role === 'project_leader' ? 'Project Leader' : 'Student'}
                        </span>
                        {u.bio && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{u.bio}</p>}
                        {(u.skills || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mb-3">
                            {u.skills.slice(0, 3).map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                            {u.skills.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">+{u.skills.length - 3}</span>
                            )}
                          </div>
                        )}
                        <Link to={`/users/${u.id || u.uid}`}>
                          <button className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
                            View Profile
                          </button>
                        </Link>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

