import axiosInstance from '../config/axiosConfig';

export const categoryApi = {
  getAll: () => axiosInstance.get('/categories'),
  getActive: () => axiosInstance.get('/categories/active'),
  getById: (id) => axiosInstance.get(`/categories/${id}`),
  create: (data) => axiosInstance.post('/categories', data),
  update: (id, data) => axiosInstance.put(`/categories/${id}`, data),
  delete: (id) => axiosInstance.delete(`/categories/${id}`),
  // ✅ FIX: Add missing initDefaults method
  initDefaults: () => axiosInstance.post('/categories/init-defaults'),
};
