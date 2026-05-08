import axiosInstance from '../config/axiosConfig';

export const boxApi = {
  getAll: () => axiosInstance.get('/boxes'),
  getActive: () => axiosInstance.get('/boxes/active'),
  getByRack: (rackId) => axiosInstance.get(`/boxes/rack/${rackId}`),
  getById: (id) => axiosInstance.get(`/boxes/${id}`),
  // ✅ FIX: Send data as JSON body, not URL params
  create: (data) => axiosInstance.post('/boxes', data),
  update: (id, data) => axiosInstance.put(`/boxes/${id}`, data),
  delete: (id) => axiosInstance.delete(`/boxes/${id}`),
  initDefaults: () => axiosInstance.post('/boxes/init-defaults'),
};
