import axiosInstance from '../config/axiosConfig';

const API_BASE = '/qc';

export const qcApi = {

  // ── Queue ────────────────────────────────────────────────
  getQueue: () => axiosInstance.get(`${API_BASE}/queue`),

  // ── Batch Detail ─────────────────────────────────────────
  getBatch: (batchId) => axiosInstance.get(`${API_BASE}/batches/${batchId}`),

  // ── Templates ────────────────────────────────────────────
  getTemplates: () => axiosInstance.get(`${API_BASE}/templates`),

  // ★ FIX: was named getTemplate — renamed to getTemplateByCode to match JSX
  getTemplateByCode: (categoryCode) =>
    axiosInstance.get(`${API_BASE}/templates/${categoryCode}`),

  // ── Decisions ────────────────────────────────────────────
  bulkDecision: (payload, generatePdf = false) =>
    axiosInstance.post(`${API_BASE}/decisions/bulk?generatePdf=${generatePdf}`, payload),

  perItemDecision: (payload, generatePdf = false) =>
    axiosInstance.post(`${API_BASE}/decisions/per-item?generatePdf=${generatePdf}`, payload),

  // ── PDF — completed inspection report ────────────────────
  downloadInspectionPdf: async (inspectionId, batchRef) => {
    const response = await axiosInstance.get(
      `${API_BASE}/inspections/${inspectionId}/pdf`,
      { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'application/pdf' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `QC_${batchRef || inspectionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Blank Template Download ──────────────────────────────
  downloadBlankTemplate: async (categoryCode) => {
    const response = await axiosInstance.get(
      `${API_BASE}/templates/blank/${categoryCode}`,
      { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(
      new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `QC_Checklist_${categoryCode}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Filled checklist (the real QC record) ────────────────
  // Save-on-download: fired when the inspector clicks Download. No
  // inspection exists yet, so this is a draft keyed by batchId; the
  // decision submit claims it.
  saveChecklistDraft: (batchId, templateCode, results) =>
    axiosInstance.post(`${API_BASE}/checklists/draft`, { batchId, templateCode, results }),

  getChecklistDraft: (batchId) =>
    axiosInstance.get(`${API_BASE}/checklists/draft/${batchId}`),

  // What makes the Approved / Rejected screens show the entered data.
  getInspectionChecklist: (inspectionId) =>
    axiosInstance.get(`${API_BASE}/inspections/${inspectionId}/checklist`),

  // ── Alerts: delete (were missing — callers used raw axios) ──
  deleteAlert: (alertId) => axiosInstance.delete(`${API_BASE}/alerts/${alertId}`),
  deleteAlertsBulk: (alertIds) =>
    axiosInstance.delete(`${API_BASE}/alerts/bulk`, { data: alertIds }),

  // ── Dashboard ────────────────────────────────────────────
  getDashboardStats: () => axiosInstance.get(`${API_BASE}/dashboard/stats`),

  // ── Inspection Lists ─────────────────────────────────────
  getApproved: (limit = 200) =>
    axiosInstance.get(`${API_BASE}/inspections/approved`, { params: { limit } }),

  getRejected: (limit = 200) =>
    axiosInstance.get(`${API_BASE}/inspections/rejected`, { params: { limit } }),

  getHistory: (params = {}) =>
    axiosInstance.get(`${API_BASE}/inspections/history`, { params }),

  // ── Alerts ───────────────────────────────────────────────
  getAlerts: () => axiosInstance.get(`${API_BASE}/alerts`),
  getUnreadAlerts: () => axiosInstance.get(`${API_BASE}/alerts/unread`),
  getUnreadAlertsCount: () => axiosInstance.get(`${API_BASE}/alerts/unread/count`),
  markAlertAsRead: (alertId) => axiosInstance.put(`${API_BASE}/alerts/${alertId}/read`),
  markAllAlertsAsRead: () => axiosInstance.put(`${API_BASE}/alerts/read-all`),

};