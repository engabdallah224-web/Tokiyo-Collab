import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, 
  GitBranch, 
  Plus, 
  Trash2, 
  ExternalLink, 
  User, 
  Calendar, 
  X, 
  AlertCircle, 
  Link as LinkIcon,
  GitCommit,
  GitPullRequest,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { subscribeToRepoLinks, saveRepoLink, deleteRepoLink } from '../../services/firestoreService';
import { vcsAPI } from '../../services/api';
import { auth } from '../../config/firebase';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../common/LoadingSpinner';

// Detect platform from URL
const getPlatform = (url = '') => {
  if (url.includes('github.com')) return { name: 'GitHub', color: 'bg-gray-900', icon: <Github className="h-5 w-5" /> };
  if (url.includes('gitlab.com')) return { name: 'GitLab', color: 'bg-orange-600', icon: '🦊' };
  if (url.includes('bitbucket.org')) return { name: 'Bitbucket', color: 'bg-blue-600', icon: '🪣' };
  return { name: 'Repository', color: 'bg-gray-700', icon: <GitBranch className="h-5 w-5" /> };
};

const formatDate = (ts) => {
  if (!ts) return '';
  const date = new Date(ts);
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)),
    'day'
  );
};

export default function RepositoryPanel({ projectId, isOwner }) {
  const [activeTab, setActiveTab] = useState('activity'); // 'activity', 'pulls', 'links'
  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(`repo_token_${projectId}`) || '');
  const myUid = auth.currentUser?.uid;

  // 1. Fetch connected repo from Backend
  const { data: connectedRepo, isLoading: repoLoading } = useQuery({
    queryKey: ['connected-repo', projectId],
    queryFn: async () => {
      try {
        const res = await vcsAPI.getRepository(projectId);
        return res.data.repository;
      } catch (err) {
        console.warn('VCS API failed, falling back to links only');
        return null;
      }
    },
    enabled: !!projectId
  });

  // 2. Fetch Commits if repo connected
  const { data: commitsData, isLoading: commitsLoading, refetch: refetchCommits, error: commitsError } = useQuery({
    queryKey: ['repo-commits', projectId, accessToken],
    queryFn: async () => {
      const res = await vcsAPI.getCommits(projectId, { access_token: accessToken });
      return res.data.commits;
    },
    enabled: !!projectId && !!connectedRepo && activeTab === 'activity',
    retry: false
  });

  // 3. Fetch PRs if repo connected
  const { data: prsData, isLoading: prsLoading, refetch: refetchPrs, error: prsError } = useQuery({
    queryKey: ['repo-pulls', projectId, accessToken],
    queryFn: async () => {
      const res = await vcsAPI.getPullRequests(projectId, { access_token: accessToken });
      return res.data.pull_requests;
    },
    enabled: !!projectId && !!connectedRepo && activeTab === 'pulls',
    retry: false
  });

  // 4. Fetch Firestore Links (Fallback/Secondary)
  useEffect(() => {
    if (!projectId) return;
    setLinksLoading(true);
    const unsub = subscribeToRepoLinks(projectId, (l) => {
      setLinks(l);
      setLinksLoading(false);
    });
    return unsub;
  }, [projectId]);

  const handleSetToken = (token) => {
    setAccessToken(token);
    if (token) {
      localStorage.setItem(`repo_token_${projectId}`, token);
    } else {
      localStorage.removeItem(`repo_token_${projectId}`);
    }
  };

  const handleDeleteLink = async (link) => {
    if (!window.confirm(`Remove "${link.label}"?`)) return;
    try {
      await deleteRepoLink(link.id);
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  const tabs = [
    { id: 'activity', label: 'Activity', icon: GitCommit },
    { id: 'pulls', label: 'Pull Requests', icon: GitPullRequest },
    { id: 'links', label: 'Shared Links', icon: LinkIcon },
  ];

  if (repoLoading && linksLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
        <LoadingSpinner />
        <p className="text-sm text-gray-500 mt-4 font-medium animate-pulse">Fetching repository data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Github className="h-7 w-7 text-gray-900" />
            Version Control
          </h2>
          {connectedRepo ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100">
                <CheckCircle2 className="h-3 w-3" />
                Connected to {connectedRepo.repo_name}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 font-medium">Branch: <code className="bg-gray-100 px-1 rounded">{connectedRepo.branch}</code></span>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Connect your code or share useful repository links.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => connectedRepo ? (activeTab === 'activity' ? refetchCommits() : refetchPrs()) : setShowAddModal(true)}
            className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`h-5 w-5 ${commitsLoading || prsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm"
          >
            <Plus className="h-4 w-4" />
            {connectedRepo ? 'Manage Repos' : 'Connect Repository'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {!connectedRepo ? (
                <EmptyState 
                  icon={GitCommit} 
                  title="No Commit History" 
                  desc="Connect a GitHub repository to see real-time activity and commit history here."
                  onAction={() => setShowAddModal(true)}
                  actionLabel="Connect Repository"
                />
              ) : commitsLoading ? (
                <LoadingList count={5} />
              ) : !commitsData || commitsData.length === 0 ? (
                <EmptyState 
                  icon={GitCommit} 
                  title="No Commits Found" 
                  desc="We couldn't find any commits in the default branch. Check your connection or branch settings."
                />
              ) : (
                <div className="relative">
                  <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-gray-100" />
                  <div className="space-y-6">
                    {commitsData.map((commit, i) => (
                      <CommitItem key={commit.sha} commit={commit} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'pulls' && (
            <motion.div
              key="pulls"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {!connectedRepo ? (
                <EmptyState 
                  icon={GitPullRequest} 
                  title="Pull Request Tracking" 
                  desc="Monitor code reviews and merged changes directly from your workspace."
                  onAction={() => setShowAddModal(true)}
                  actionLabel="Connect Repository"
                />
              ) : prsLoading ? (
                <LoadingList count={3} />
              ) : !prsData || prsData.length === 0 ? (
                <EmptyState 
                  icon={GitPullRequest} 
                  title="All Clear!" 
                  desc="There are no open pull requests for this repository at the moment."
                />
              ) : (
                <div className="grid gap-4">
                  {prsData.map((pr, i) => (
                    <PRItem key={pr.number} pr={pr} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'links' && (
            <motion.div
              key="links"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {linksLoading ? (
                <LoadingList count={3} />
              ) : links.length === 0 ? (
                <EmptyState 
                  icon={LinkIcon} 
                  title="No Shared Links" 
                  desc="Add useful repository links, documentation, or related tools for the whole team."
                  onAction={() => setShowAddModal(true)}
                  actionLabel="Add Link"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {links.map((link, i) => (
                    <RepoLinkItem key={link.id} link={link} index={i} onDelete={handleDeleteLink} isOwner={isOwner} myUid={myUid} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddRepoModal
            projectId={projectId}
            connectedRepo={connectedRepo}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function CommitItem({ commit, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex items-start gap-4 group"
    >
      <div className="z-10 flex-shrink-0 mt-1 h-11 w-11 rounded-full bg-white border-4 border-[#f3f3f3] shadow-sm flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-red-600 group-hover:scale-150 transition-transform" />
      </div>
      
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all hover:border-red-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <p className="font-bold text-gray-900 line-clamp-1">{commit.message}</p>
          <span className="text-[10px] font-mono bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100">
            {commit.sha.substring(0, 7)}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden">
              {commit.author.avatar_url ? (
                <img src={commit.author.avatar_url} alt={commit.author.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                  {commit.author.name.charAt(0)}
                </div>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-700">{commit.author.name}</span>
          </div>
          
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(commit.committed_at).toLocaleDateString()}
            </span>
            <a 
              href={commit.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-600 hover:underline flex items-center gap-0.5"
            >
              View <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PRItem({ pr, index }) {
  const isMerged = !!pr.merged_at;
  const isClosed = pr.state === 'closed' && !isMerged;
  const isOpen = pr.state === 'open';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all flex items-start gap-4"
    >
      <div className={`p-3 rounded-xl flex-shrink-0 ${
        isOpen ? 'bg-green-50 text-green-600' : isMerged ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'
      }`}>
        <GitPullRequest className="h-6 w-6" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isOpen ? 'bg-green-100 text-green-700' : isMerged ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
          }`}>
            {isMerged ? 'Merged' : pr.state}
          </span>
          <span className="text-gray-400 text-xs font-medium">#{pr.number}</span>
        </div>
        
        <h4 className="font-bold text-gray-900 text-lg mb-2 truncate group">
          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors">
            {pr.title}
          </a>
        </h4>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-gray-100 overflow-hidden">
              <img src={pr.author.avatar_url} alt={pr.author.username} className="h-full w-full object-cover" />
            </div>
            <span className="font-semibold text-gray-700">{pr.author.username}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 text-[10px] font-mono">{pr.source_branch}</code>
            <ChevronRight className="h-3 w-3" />
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-[10px] font-mono">{pr.target_branch}</code>
          </div>

          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {new Date(pr.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <a 
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
      >
        <ExternalLink className="h-5 w-5" />
      </a>
    </motion.div>
  );
}

function RepoLinkItem({ link, index, onDelete, isOwner, myUid }) {
  const platform = getPlatform(link.url);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-all group"
    >
      <div className={`h-12 w-12 rounded-xl ${platform.color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
        {platform.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 truncate">{link.label}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{link.url}</p>
      </div>

      <div className="flex items-center gap-1">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        {(isOwner || link.added_by === myUid) && (
          <button
            onClick={() => onDelete(link)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, title, desc, onAction, actionLabel }) {
  return (
    <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
      <div className="h-20 w-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Icon className="h-10 w-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">{desc}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all text-sm font-bold shadow-lg active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function LoadingList({ count }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-24 bg-white border border-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

function AddRepoModal({ projectId, connectedRepo, onClose }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(connectedRepo ? 'link' : 'connect'); // 'connect' or 'link'

  const isValidUrl = (val) => {
    try { new URL(val); return true; } catch { return false; }
  };

  const handleSaveLink = async () => {
    if (!label.trim()) { setError('Please enter a name for this repository'); return; }
    if (!url.trim()) { setError('Please enter a repository URL'); return; }
    if (!isValidUrl(url.trim())) { setError('Please enter a valid URL'); return; }
    setSaving(true);
    setError('');
    try {
      await saveRepoLink({ projectId, label, url });
      onClose();
    } catch (err) {
      setError('Failed to save: ' + (err.message || 'Unknown error'));
      setSaving(false);
    }
  };

  const handleConnectRepo = async () => {
    if (!url.trim()) { setError('Please enter a GitHub repository URL'); return; }
    setSaving(true);
    setError('');
    try {
      await vcsAPI.connectRepository(projectId, {
        repo_url: url.trim(),
        access_token: accessToken.trim() || null,
        provider: 'github'
      });
      onClose();
      // Force refresh the workspace to see changes
      window.location.reload();
    } catch (err) {
      setError('Connection failed: ' + (err.response?.data?.detail || err.message));
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg border border-white/20 overflow-hidden"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Repository Settings</h3>
              <p className="text-xs text-gray-500">Configure your project's version control</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex p-1 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
          <button
            onClick={() => setMode('connect')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'connect' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Connect GitHub API
          </button>
          <button
            onClick={() => setMode('link')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Add Shared Link
          </button>
        </div>

        <div className="space-y-6">
          {mode === 'connect' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">GitHub Repo URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Access Token (Optional)</label>
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-[10px] text-red-600 hover:underline">Get Token</a>
                </div>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-sm font-medium"
                />
                <p className="mt-2 text-[10px] text-gray-500 leading-relaxed italic">
                  Note: Tokens are used for fetching data and are not stored in the database for your security.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main Backend Repo"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </>
          )}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 mt-6 text-xs text-red-600 bg-red-50 rounded-2xl p-4 border border-red-100"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </motion.div>
        )}

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={mode === 'connect' ? handleConnectRepo : handleSaveLink}
            disabled={saving}
            className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {saving ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              mode === 'connect' ? 'Connect Repository' : 'Save Shared Link'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


