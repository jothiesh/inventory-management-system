import axiosInstance from '../config/axiosConfig'; // ← use this, not plain axios

const API_BASE = '/purchase-orders'; // axiosInstance baseURL is already '/api'

export const purchaseOrderApi = {

  // Create new PO
  create: (data) => axiosInstance.post(API_BASE, data),

  // Get all POs
  getAll: () => axiosInstance.get(API_BASE),

  // Get single PO
  getById: (id) => axiosInstance.get(`${API_BASE}/${id}`),

  // Download PDF
  downloadPdf: async (id, poCode) => {
    const response = await axiosInstance.get(`${API_BASE}/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'application/pdf' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${poCode}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};