import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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
  const navigate = useNavigate();

  // Check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      // Decode JWT token (without verification)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const { exp } = JSON.parse(jsonPayload);
      
      if (!exp) return true;
      
      // Check if token is expired (with 1 minute buffer)
      const currentTime = Date.now() / 1000;
      const isExpired = exp < (currentTime + 60); // 60 seconds buffer
      
      if (isExpired) {
        console.log('Token expired at:', new Date(exp * 1000));
      }
      
      return isExpired;
      
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      // Check if token is expired
      if (isTokenExpired(storedToken)) {
        console.log('Stored token is expired, clearing...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.warning('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // Periodic token expiry check (every 5 minutes)
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = () => {
      if (isTokenExpired(token)) {
        console.log('Token expired, logging out...');
        logout();
        toast.warning('Your session has expired. Please log in again.');
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);

    // Check immediately
    checkTokenExpiry();

    return () => clearInterval(interval);
  }, [token]);

  const login = (userData, authToken) => {
    // Check if new token is already expired
    if (isTokenExpired(authToken)) {
      toast.error('Received expired token. Please try logging in again.');
      return false;
    }

    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    return true;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!token && !isTokenExpired(token),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};