import axiosInstance from '../config/axiosConfig';

export const initApi = {
  initializeAll: () => axiosInstance.post('/init/all'),
};
