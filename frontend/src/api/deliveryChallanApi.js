import axiosInstance from '../config/axiosConfig';

export const deliveryChallanApi = {
  getSuppliers:          ()           => axiosInstance.get('/suppliers/active'),
  getStockedProducts:    ()           => axiosInstance.get('/stock/stocked-products'),
  getProductsBySupplier: (supplierId) => axiosInstance.get(`/suppliers/${supplierId}/product-summary`),
  getCurrentStock:       (productId)  => axiosInstance.get(`/stock/product/${productId}`),
  issueStock:            (data)       => axiosInstance.post('/stock/out', data),
};