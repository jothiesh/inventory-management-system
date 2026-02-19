import axios from 'axios';
import { toast } from 'react-toastify';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle 401 Unauthorized (expired token or invalid token)
    if (status === 401) {
      const errorType = data?.error;
      
      if (errorType === 'EXPIRED_TOKEN') {
        // Token expired - clear storage and redirect to login
        toast.error('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        
      } else if (errorType === 'INVALID_TOKEN') {
        // Invalid token
        toast.error('Invalid authentication. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        
      } else {
        // Generic unauthorized
        toast.error('Authentication required. Please log in.');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
    }
    
    // Handle 403 Forbidden
    else if (status === 403) {
      toast.error('Access denied. You do not have permission.');
    }
    
    // Handle 404 Not Found
    else if (status === 404) {
      toast.error(data?.message || 'Resource not found');
    }
    
    // Handle 500 Internal Server Error
    else if (status === 500) {
      toast.error(data?.message || 'Server error. Please try again later.');
    }
    
    // Handle other errors
    else {
      const errorMessage = data?.message || 'An error occurred';
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;