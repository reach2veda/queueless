import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check for active session on initial load
  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem('queueless_token');
        setUser(null);
      }
    } catch (err) {
      // 401 or network error simply means no active session
      localStorage.removeItem('queueless_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.success && response.data?.user) {
        if (response.data.token) {
          localStorage.setItem('queueless_token', response.data.token);
        }
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(response.data?.message || 'Login failed');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Invalid credentials';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (userData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data?.success && response.data?.user) {
        if (response.data.token) {
          localStorage.setItem('queueless_token', response.data.token);
        }
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(response.data?.message || 'Registration failed');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Registration failed';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Demo login handler (authenticates strictly through the backend)
  const loginDemo = async (role = 'provider') => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.post('/auth/demo-login', { role });
      if (response.data?.success && response.data?.user) {
        if (response.data.token) {
          localStorage.setItem('queueless_token', response.data.token);
        }
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(response.data?.message || 'Demo authentication failed');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Demo authentication failed';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error.message);
    } finally {
      localStorage.removeItem('queueless_token');
      setUser(null);
      window.location.href = '/login';
    }
  };

  // Update local user state
  const updateUser = (updatedUserData) => {
    setUser((prev) => ({ ...prev, ...updatedUserData }));
  };

  const value = {
    user,
    loading,
    authError,
    isAuthenticated: !!user,
    login,
    loginDemo,
    register,
    logout,
    checkAuth,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
