import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

// Components
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import SetupWizard from './pages/Setup/SetupWizard';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Schools from './pages/Admin/Schools';
import Users from './pages/Admin/Users';
import SchoolUsers from './pages/School/SchoolUsers';
import Students from './pages/School/Students';
import Staff from './pages/School/Staff';
import Documents from './pages/Documents/Documents';
import Bots from './pages/Bots/Bots';
import Profile from './pages/Profile/Profile';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Styles
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
    // Check if setup is complete
    const setupComplete = localStorage.getItem('setupComplete');
    setIsSetupComplete(setupComplete === 'true');
  }, [checkAuth]);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Show loading while checking authentication
  if (isLoading || isSetupComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show setup wizard if not complete
  if (!isSetupComplete) {
    return <SetupWizard onComplete={() => setIsSetupComplete(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: theme === 'dark' ? '#374151' : '#fff',
                color: theme === 'dark' ? '#fff' : '#000',
              },
            }}
          />
          
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" replace /> : <Login />
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              isAuthenticated ? <Layout /> : <Navigate to="/login" replace />
            }>
              {/* Dashboard routes */}
              <Route index element={
                user?.role === 'SUPER_ADMIN' ? <AdminDashboard /> : <Dashboard />
              } />
              
              {/* Admin routes */}
              {user?.role === 'SUPER_ADMIN' && (
                <>
                  <Route path="admin/dashboard" element={<AdminDashboard />} />
                  <Route path="admin/schools" element={<Schools />} />
                  <Route path="admin/users" element={<Users />} />
                </>
              )}
              
              {/* School routes */}
              {user?.role === 'SCHOOL_ADMIN' && (
                <>
                  <Route path="school/users" element={<SchoolUsers />} />
                  <Route path="school/students" element={<Students />} />
                  <Route path="school/staff" element={<Staff />} />
                </>
              )}
              
              {/* Common routes */}
              <Route path="documents" element={<Documents />} />
              <Route path="bots" element={<Bots />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;