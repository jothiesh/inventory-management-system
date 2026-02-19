import axiosInstance from '../config/axiosConfig';

export const authApi = {
  login: (credentials) => {
    return axiosInstance.post('/auth/login', credentials);
  },

  logout: () => {
    return axiosInstance.post('/auth/logout');
  },

  getCurrentUser: () => {
    return axiosInstance.get('/auth/me');
  }
};