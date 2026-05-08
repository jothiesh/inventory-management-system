import axios from 'axios';
import { toast } from 'react-toastify';

// ✅ PERMANENT FIX: Use relative '/api' path
// Vite proxy forwards /api → http://localhost:8080/api in dev
// In production (built into Spring Boot jar), /api hits Spring Boot directly
const axiosInstance = axios.create({
  baseURL: '/api',
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
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401) {
      const errorType = data?.error;
      if (errorType === 'EXPIRED_TOKEN' || errorType === 'INVALID_TOKEN') {
        toast.error('Your session has expired. Please log in again.');
      } else {
        toast.error('Authentication required. Please log in.');
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      }
    } else if (status === 403) {
      toast.error('Access denied. You do not have permission.');
    } else if (status === 404) {
      toast.error(data?.message || 'Resource not found.');
    } else if (status === 500) {
      toast.error(data?.message || 'Server error. Please try again later.');
    } else {
      toast.error(data?.message || 'An error occurred');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;