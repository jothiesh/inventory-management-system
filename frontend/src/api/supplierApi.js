import axiosInstance from '../config/axiosConfig';

export const supplierApi = {
  getAll:              ()         => axiosInstance.get('/suppliers'),
  getActive:           ()         => axiosInstance.get('/suppliers/active'),
  getById:             (id)       => axiosInstance.get(`/suppliers/${id}`),
  create:              (data)     => axiosInstance.post('/suppliers', data),
  update:              (id, data) => axiosInstance.put(`/suppliers/${id}`, data),
  delete:              (id)       => axiosInstance.delete(`/suppliers/${id}`),

  // Product summary — used in Suppliers.jsx expand row + SupplierDetail tab
  getProducts:         (id) => axiosInstance.get(`/suppliers/${id}/product-summary`),

  // Purchase history — used in Suppliers.jsx detail tab
  getHistory:          (id) => axiosInstance.get(`/suppliers/${id}/purchase-details`),

  // Alias used in SupplierDetail.jsx (useParams page)
  getPurchaseDetails:  (id) => axiosInstance.get(`/suppliers/${id}/purchase-details`),
  
  
  getMovements: (id) => axiosInstance.get(`/suppliers/${id}/stock-movements`),
};