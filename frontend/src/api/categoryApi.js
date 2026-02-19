import axiosInstance from "../config/axiosConfig";

export const categoryApi = {
  // Get all categories
  getAll: () => axiosInstance.get('/categories'),
  
  // Get only active categories
  getActive: () => axiosInstance.get('/categories/active'),
  
  // Get category by ID
  getById: (id) => axiosInstance.get(`/categories/${id}`),
  
  // Create new category
  create: (data) => axiosInstance.post('/categories', data),
  
  // Update existing category
  update: (id, data) => axiosInstance.put(`/categories/${id}`, data),
  
  // Delete category
  delete: (id) => axiosInstance.delete(`/categories/${id}`),
};