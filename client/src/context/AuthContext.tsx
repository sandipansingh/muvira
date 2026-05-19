import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/auth';
import { authMockService } from '../mocks/auth.mock';
import { MockDatabase } from '../mocks/store';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string, phone: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string, phone: string) => Promise<boolean>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = MockDatabase.getActiveUser();
        const storedToken = localStorage.getItem('muvira_db_token');
        if (storedUser && storedToken) {
          setUser(storedUser);
          setToken(storedToken);
        }
      } catch (err) {
        console.error('Failed to initialize auth', err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    const res = await authMockService.login(email, password);
    setLoading(false);

    if (res.success) {
      setUser(res.data.profile);
      setToken(res.data.token);
      showToast(`Welcome back, ${res.data.profile.fullName}!`, 'success');
      return true;
    } else {
      showToast(res.error.message || 'Login failed', 'error');
      return false;
    }
  };

  const signup = async (email: string, password: string, fullName: string, phone: string): Promise<boolean> => {
    setLoading(true);
    const res = await authMockService.signup(email, password, fullName, phone);
    setLoading(false);

    if (res.success) {
      setUser(res.data.profile);
      setToken(res.data.token);
      showToast(`Account created! Welcome, ${res.data.profile.fullName}!`, 'success');
      return true;
    } else {
      showToast(res.error.message || 'Signup failed', 'error');
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    await authMockService.logout();
    setUser(null);
    setToken(null);
    setLoading(false);
    showToast('Logged out successfully', 'success');
  };

  const updateProfile = async (fullName: string, phone: string): Promise<boolean> => {
    setLoading(true);
    const res = await authMockService.updateProfile(fullName, phone);
    setLoading(false);

    if (res.success) {
      setUser(res.data);
      showToast('Profile updated successfully', 'success');
      return true;
    } else {
      showToast(res.error.message || 'Profile update failed', 'error');
      return false;
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        updateProfile,
        isAuthenticated,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
