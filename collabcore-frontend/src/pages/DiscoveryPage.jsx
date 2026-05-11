import { useState, useEffect } from 'react';
// motion removed for snappy dynamic UI
import { Sparkles, TrendingUp, Plus, Users, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DiscoveryFeed from '../components/feed/DiscoveryFeed';
import FeedFilters from '../components/feed/FeedFilters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fetchProjects, subscribeActiveLiveStreams } from '../services/firestoreService';
import { useAuth } from '../hooks/useAuth';
import VideoCallModal from '../components/calls/VideoCallModal';

const DiscoveryPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // Changed from 'recruiting' to 'all' to show everything by default
    skills: [],
    category: '',
    difficulty: ''
  });

  const [sortBy, setSortBy] = useState('recent');
  const [liveStreams, setLiveStreams] = useState([]);
  const [watchStream, setWatchStream] = useState(null); // { meeting_url, owner_name, project_title }

  // Real-time live streams subscription
  useEffect(() => {
    const unsub = subscribeActiveLiveStreams(setLiveStreams);
    return unsub;
  }, []);

  // Fetch ALL projects directly from Firestore (works on mobile + Vercel without backend)
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
    refetch,
  } = useQuery({
    queryKey: ['projects', filters.status, filters.category, filters.difficulty],
    queryFn: () =>
      fetchProjects({
        status: filters.status,
        category: filters.category,
        difficulty: filters.difficulty,
        limitCount: 100,
      }),
    staleTime: 0,
    retry: 1,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const projects = projectsData || [];

  const stats = {
    active_projects: projects.filter((p) => p.status === 'active').length,
    recruiting_projects: projects.filter((p) => p.status === 'recruiting').length,
    total_students: 0,
  };

  // Filter projects based on search and handle visibility
  const filteredProjects = projects.filter((project) => {
    // 1. Basic validation
    if (!project || !project.id) return false;

    // 2. Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        project.title?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower) ||
        project.required_skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
        project.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    
    if (sortBy === 'recent') {
      return dateB - dateA;
    } else if (sortBy === 'popular') {
      return (b.current_team_size || 0) - (a.current_team_size || 0);
    }
    return 0;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (projectsError) {
    // Only show full error page for real server errors (not network/connection issues)
    if (projectsError.response) {
      return (
        <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load projects</h2>
            <p className="text-gray-700 mb-4">
              {projectsError.response?.data?.detail || 'Something went wrong. Please try again.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-red-600 text-gray-900 rounded-xl font-semibold hover:bg-red-700 shadow-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    // Network error — fall through and show empty projects list
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Discover Projects
              </h1>
              <p className="text-gray-700 flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-red-500" />
                {sortedProjects.length} projects available
                {liveStreams.length > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                    </span>
                    {liveStreams.length} Live Now
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/projects/create">
                <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-md text-sm">
                  <Plus className="h-4 w-4" />
                  Create Project
                </button>
              </Link>
            </div>
          </div>

          {/* ── Live Streams Banner (Static) ── */}
          {liveStreams.length > 0 && (
            <div className="mb-3 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-2xl p-3 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="text-white font-bold text-sm">LIVE NOW</span>
                  <span className="text-red-200 text-xs">{liveStreams.length} stream{liveStreams.length > 1 ? 's' : ''} active</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {liveStreams.map((stream) => {
                    const initials = (stream.owner_name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <button
                        key={stream.id}
                        onClick={() => setWatchStream(stream)}
                        className="flex-shrink-0 flex items-center gap-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl px-3 py-2 transition-all"
                      >
                        <div className="relative flex-shrink-0">
                          {stream.owner_avatar ? (
                            <img src={stream.owner_avatar} alt={stream.owner_name}
                              className="h-10 w-10 rounded-full object-cover border-2 border-red-300" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border-2 border-red-300">
                              {initials}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 bg-red-500 rounded-full px-1 text-[9px] text-white font-bold border border-white">
                            LIVE
                          </span>
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-white text-xs font-semibold truncate max-w-[120px]">{stream.owner_name}</p>
                          <p className="text-red-200 text-[10px] truncate max-w-[120px]">{stream.project_title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Radio className="h-2.5 w-2.5 text-red-200" />
                            <span className="text-red-200 text-[10px]">Tap to watch</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Sort by:</span>
            {[
              { value: 'recent', label: '🕐 Recent' },
              { value: 'popular', label: '🔥 Popular' },
            ].map((sort) => (
              <button
                key={sort.value}
                onClick={() => setSortBy(sort.value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  sortBy === sort.value
                    ? 'bg-red-200 text-gray-900'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {sort.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{stats.active_projects || 0}</p>
                  <p className="text-xs text-gray-600">Active Projects</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{stats.recruiting_projects || 0}</p>
                  <p className="text-xs text-gray-600">Recruiting Now</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{stats.total_students || 0}</p>
                  <p className="text-xs text-gray-600">Students Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FeedFilters filters={filters} setFilters={setFilters} />
          </div>

          {/* Projects Feed */}
          <div className="lg:col-span-3">
            {projectsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <LoadingSpinner size="lg" />
              </div>
            ) : sortedProjects.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
                <div className="text-6xl mb-6 grayscale opacity-50">🔍</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  We couldn't find any projects matching your filters. Try adjusting them or be the first to create one!
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => refetch()}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all border border-gray-200"
                  >
                    🔄 Refresh Feed
                  </button>
                  <Link to="/projects/create">
                    <button className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200">
                      ✨ Create Project
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <DiscoveryFeed projects={sortedProjects} />
            )}
          </div>
        </div>
      </div>

      {/* Watch live stream modal - Static */}
      {watchStream && (
        <VideoCallModal
          roomUrl={watchStream.meeting_url}
          callTitle={`🔴 ${watchStream.owner_name} — LIVE: ${watchStream.project_title}`}
          onClose={() => setWatchStream(null)}
        />
      )}
    </div>
  );
};

export default DiscoveryPage;
