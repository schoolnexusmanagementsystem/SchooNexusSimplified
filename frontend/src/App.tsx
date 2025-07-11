import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SetupWizard } from './components/SetupWizard';
import { Login } from './components/Login';
import { SuperAdminDashboard } from './components/dashboards/SuperAdminDashboard';
import { SchoolAdminDashboard } from './components/dashboards/SchoolAdminDashboard';
import { StaffDashboard } from './components/dashboards/StaffDashboard';
import { StudentDashboard } from './components/dashboards/StudentDashboard';
import { LoadingScreen } from './components/LoadingScreen';
import { UserRole } from './types';
import './App.css';
import { Dashboard } from './components/Dashboard';
import { DocumentGenerator } from './components/DocumentGenerator';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <AppContent />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const { user, loading, isSetupRequired } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isSetupRequired) {
    return <SetupWizard />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={<Navigate to="/dashboard" replace />} 
      />
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/documents" element={
        <ProtectedRoute>
          <DashboardLayout>
            <DocumentGenerator />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route 
        path="/profile" 
        element={<div>Profile Page (Coming Soon)</div>} 
      />
      <Route 
        path="/settings" 
        element={<div>Settings Page (Coming Soon)</div>} 
      />
      <Route 
        path="*" 
        element={<Navigate to="/dashboard" replace />} 
      />
    </Routes>
  );
};

interface DashboardRouterProps {
  user: {
    role: UserRole;
    [key: string]: any;
  };
}

const DashboardRouter: React.FC<DashboardRouterProps> = ({ user }) => {
  switch (user.role) {
    case UserRole.SUPER_ADMIN:
      return <SuperAdminDashboard />;
    case UserRole.SCHOOL_ADMIN:
      return <SchoolAdminDashboard />;
    case UserRole.STAFF:
      return <StaffDashboard />;
    case UserRole.STUDENT:
      return <StudentDashboard />;
    case UserRole.PARENT:
      return <div>Parent Dashboard (Coming Soon)</div>;
    case UserRole.VISITOR:
      return <div>Visitor Dashboard (Coming Soon)</div>;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default App;