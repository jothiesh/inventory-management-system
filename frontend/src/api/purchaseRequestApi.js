import axiosInstance from '../config/axiosConfig';

const API_BASE = '/purchase-requests';

export const purchaseRequestApi = {

  create:  (data) => axiosInstance.post(API_BASE, data),
  getAll:  ()     => axiosInstance.get(API_BASE),
  getById: (id)   => axiosInstance.get(`${API_BASE}/${id}`),
  approve: (id)   => axiosInstance.put(`${API_BASE}/${id}/approve`),
  reject:  (id)   => axiosInstance.put(`${API_BASE}/${id}/reject`),

  downloadPdf: async (id, prCode) => {
    const response = await axiosInstance.get(`${API_BASE}/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'application/pdf' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${prCode}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};