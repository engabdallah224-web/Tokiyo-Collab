import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DiscoveryPage from './pages/DiscoveryPage';
import ProfilePage from './pages/ProfilePage';
import CreateProjectPage from './pages/CreateProjectPage';
import EditProfilePage from './pages/EditProfilePage';
import MyProjectsPage from './pages/MyProjectsPage';
import SearchPage from './pages/SearchPage';
import ProjectWorkspace from './pages/ProjectWorkspace';
import ManageApplicationsPage from './pages/ManageApplicationsPage';
import UserProfilePage from './pages/UserProfilePage';
import TasksPage from './pages/TasksPage';
import MeetingAnalyticsPage from './pages/MeetingAnalyticsPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import AdminPage from './pages/AdminPage';
import AdminRoute from './components/auth/AdminRoute';
import AdminLogin from './pages/AdminLogin';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner size="lg" light={true} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-grow pt-20">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Routes */}
            <Route path="/discovery" element={<ProtectedRoute><DiscoveryPage /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><MyProjectsPage /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
            <Route path="/projects/create" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailsPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/workspace" element={<ProtectedRoute><ProjectWorkspace /></ProtectedRoute>} />
            <Route path="/projects/:projectId/applications" element={<ProtectedRoute><ManageApplicationsPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/analytics" element={<ProtectedRoute><MeetingAnalyticsPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/settings" element={<ProtectedRoute><ProjectSettingsPage /></ProtectedRoute>} />
            <Route path="/users/:userId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

            {/* Admin Login Route */}
            <Route path="/admin-login" element={<AdminLogin onLogin={(email, password) => {
              // Ku dar logic admin login halkan (tusaale: firebase, static check, iwm)
              // Tusaale: if(email==="admin@collabcore.com" && password==="admin123") { ... }
            }} />} />

            {/* Admin Route */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
