import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, LoginResponse } from '../types';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Set default authorization header
      apiService.setAuthToken(token);
      fetchCurrentUser();
    } else {
      checkSetupStatus();
    }
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await apiService.get('/setup/status');
      setIsSetupRequired(!response.data.setup_completed);
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setIsSetupRequired(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await apiService.get('/auth/me');
      setUser(response.data);
      setIsSetupRequired(false);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiService.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      const { access_token, user: userData } = response.data;

      // Store token and set authorization header
      localStorage.setItem('access_token', access_token);
      apiService.setAuthToken(access_token);

      setUser(userData);
      setIsSetupRequired(false);

      toast.success(`Welcome back, ${userData.full_name}!`);

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    apiService.removeAuthToken();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshToken = async () => {
    try {
      const response = await apiService.post('/auth/refresh');
      const { access_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      apiService.setAuthToken(access_token);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    isSetupRequired,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};