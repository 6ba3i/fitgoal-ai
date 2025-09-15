import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/auth.service';

export const useAuth = () => {
  const context = useContext(AuthContext);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  useEffect(() => {
    checkAuthStatus();
  }, [context.user]);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (token && context.user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await context.login(email, password);
      if (result.success) {
        setIsAuthenticated(true);
        navigate('/dashboard');
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const result = await context.register(userData);
      if (result.success) {
        setIsAuthenticated(true);
        navigate('/dashboard');
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await context.logout();
      setIsAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await authService.refreshToken(token);
        if (response.success) {
          localStorage.setItem('authToken', response.token);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const requireAuth = (callback) => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login');
      return null;
    }
    return callback;
  };

  const requireGuest = (callback) => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
      return null;
    }
    return callback;
  };

  return {
    user: context.user,
    isAuthenticated,
    isLoading,
    loading: context.loading,
    error: context.error,
    login,
    register,
    logout,
    refreshToken,
    checkAuthStatus,
    requireAuth,
    requireGuest,
    updateUser: context.updateUser
  };
};