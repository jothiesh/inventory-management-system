import axiosInstance from "../config/axiosConfig";

export const supplierApi = {
  getAll: () => axiosInstance.get('/suppliers'),
  getActive: () => axiosInstance.get('/suppliers/active'),
  getById: (id) => axiosInstance.get(`/suppliers/${id}`),
  create: (data) => axiosInstance.post('/suppliers', null, { params: data }),
  update: (id, data) => axiosInstance.put(`/suppliers/${id}`, null, { params: data }),
  delete: (id) => axiosInstance.delete(`/suppliers/${id}`),
};