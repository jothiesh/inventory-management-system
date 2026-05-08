import axiosInstance from '../config/axiosConfig';

export const stockApi = {
  getStockedProducts:    ()           => axiosInstance.get('/stock/stocked-products'),     // stock > 0
  getStockedOutProducts: ()           => axiosInstance.get('/stock/stocked-out-products'),  // has OUT movements
  stockIn:               (data)       => axiosInstance.post('/stock/in', data),
  bulkStockIn:           (data)       => axiosInstance.post('/stock/in/bulk', data),
  stockOut:              (data)       => axiosInstance.post('/stock/out', data),
  getCurrentStock:       (productId)  => axiosInstance.get(`/stock/product/${productId}`),
  getLotsByProduct:      (productId)  => axiosInstance.get(`/stock/lots/product/${productId}`),
  getLotById:            (lotId)      => axiosInstance.get(`/stock/lot/${lotId}`),
  getMovementsByProduct: (productId)  => axiosInstance.get(`/stock/movements/product/${productId}`),
  getMovementsByLot:     (lotId)      => axiosInstance.get(`/stock/movements/lot/${lotId}`),
};