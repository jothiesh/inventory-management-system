import axiosInstance from "../config/axiosConfig";

export const stockApi = {
  stockIn: (data) => axiosInstance.post('/stock/in', data),
  stockOut: (data) => axiosInstance.post('/stock/out', data),
  getCurrentStock: (productId) => axiosInstance.get(`/stock/product/${productId}`),
  getLotsByProduct: (productId) => axiosInstance.get(`/stock/lots/product/${productId}`),
  getLotById: (lotId) => axiosInstance.get(`/stock/lot/${lotId}`),
  getMovementsByProduct: (productId) => axiosInstance.get(`/stock/movements/product/${productId}`),
  getMovementsByLot: (lotId) => axiosInstance.get(`/stock/movements/lot/${lotId}`),
};