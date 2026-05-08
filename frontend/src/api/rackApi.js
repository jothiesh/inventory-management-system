import axiosInstance from '../config/axiosConfig';

export const rackApi = {
  getAll: () => axiosInstance.get('/racks'),
  getActive: () => axiosInstance.get('/racks/active'),
  getById: (id) => axiosInstance.get(`/racks/${id}`),
  create: (data) => axiosInstance.post('/racks', data),
  update: (id, data) => axiosInstance.put(`/racks/${id}`, data),
  delete: (id) => axiosInstance.delete(`/racks/${id}`),
};