import axiosInstance from "../config/axiosConfig";

export const productApi = {
  // Get all products
  getAll: () => axiosInstance.get('/products'),
  
  // Get only active products
  getActive: () => axiosInstance.get('/products/active'),
  
  // Get product by ID
  getById: (id) => axiosInstance.get(`/products/${id}`),
  
  // Get products by category
  getByCategory: (categoryId) => axiosInstance.get(`/products/category/${categoryId}`),
  
  // Search products by keyword
  search: (keyword) => axiosInstance.get(`/products/search?keyword=${keyword}`),
  
  // Create new product
  create: (data) => axiosInstance.post('/products', data),
  
  // Update existing product
  update: (id, data) => axiosInstance.put(`/products/${id}`, data),
  
  // Delete product
  delete: (id) => axiosInstance.delete(`/products/${id}`),
};