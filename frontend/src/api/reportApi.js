import axiosInstance from '../config/axiosConfig';

export const reportApi = {
  getDeadStock: () => axiosInstance.get('/reports/dead-stock'),
  getSlowMoving: () => axiosInstance.get('/reports/slow-moving'),
  getStockSummary: () => axiosInstance.get('/reports/stock-summary'),
  getCategoryWise: () => axiosInstance.get('/reports/category-wise'),
  getRackWise: () => axiosInstance.get('/reports/rack-wise'),
  getPriceDifference: () => axiosInstance.get('/reports/price-difference'),
  getStockValue: () => axiosInstance.get('/reports/stock-value'),

  getStockOutHistory: (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return axiosInstance.get('/reports/stock-out-history', { params });
  },

  getProductStockOutHistory: (productId) =>
    axiosInstance.get(`/reports/stock-out-history/product/${productId}`),

  getStockOutSummary: (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return axiosInstance.get('/reports/stock-out-summary', { params });
  },
};
