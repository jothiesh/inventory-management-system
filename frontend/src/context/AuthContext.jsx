import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if token is expired
  const isTokenExpired = useCallback((tokenStr) => {
    if (!tokenStr) return true;

    try {
      const base64Url = tokenStr.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const { exp } = JSON.parse(jsonPayload);
      if (!exp) return true;

      // Check if token is expired (with 1 minute buffer)
      const currentTime = Date.now() / 1000;
      return exp < currentTime + 60;
    } catch (error) {
      return true;
    }
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      if (isTokenExpired(storedToken)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, [isTokenExpired]);

  // Periodic token expiry check (every 5 minutes)
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = () => {
      if (isTokenExpired(token)) {
        logoutCleanup();
      }
    };

    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, isTokenExpired]);

  // ✅ FIX: login now calls the API and returns {success, message}
  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      const data = response.data;

      // Handle different response structures from backend
      const authToken = data.token || data.data?.token;
      const userData = data.user || data.data?.user || data.data;

      if (!authToken) {
        return { success: false, message: 'No token received from server' };
      }

      if (isTokenExpired(authToken)) {
        return { success: false, message: 'Received expired token' };
      }

      // Build user object
      const userObj = {
        userId: userData?.userId || userData?.id,
        username: userData?.username || credentials.username,
        fullName: userData?.fullName || userData?.name || credentials.username,
        email: userData?.email || '',
        role: userData?.role || 'STORE_MANAGER',
      };

      setUser(userObj);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userObj));

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Login failed. Please check your credentials.';
      return { success: false, message };
    }
  };

  // ✅ FIX: logout without useNavigate (no Router dependency)
  const logoutCleanup = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const logout = () => {
    logoutCleanup();
    // Navigate via window.location to avoid useNavigate dependency
    window.location.href = '/login';
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!token && !isTokenExpired(token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
