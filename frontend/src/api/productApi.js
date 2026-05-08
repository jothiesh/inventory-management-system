import axiosInstance from '../config/axiosConfig';

export const productApi = {
  getAll: () => axiosInstance.get('/products'),
  getActive: () => axiosInstance.get('/products/active'),
  getById: (id) => axiosInstance.get(`/products/${id}`),
  getByCategory: (categoryId) => axiosInstance.get(`/products/category/${categoryId}`),
  search: (keyword) => axiosInstance.get(`/products/search?keyword=${keyword}`),
  create: (data) => axiosInstance.post('/products', data),
  update: (id, data) => axiosInstance.put(`/products/${id}`, data),
  delete: (id) => axiosInstance.delete(`/products/${id}`),
};
