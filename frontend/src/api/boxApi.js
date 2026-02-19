import axiosInstance from "../config/axiosConfig";

export const boxApi = {
  getAll: () => axiosInstance.get('/boxes'),
  getActive: () => axiosInstance.get('/boxes/active'),
  getByRack: (rackId) => axiosInstance.get(`/boxes/rack/${rackId}`),
  getById: (id) => axiosInstance.get(`/boxes/${id}`),
  create: (data) => axiosInstance.post('/boxes', null, { params: data }),
  update: (id, data) => axiosInstance.put(`/boxes/${id}`, null, { params: data }),
  delete: (id) => axiosInstance.delete(`/boxes/${id}`),
  initDefaults: () => axiosInstance.post('/boxes/init-defaults'),
};