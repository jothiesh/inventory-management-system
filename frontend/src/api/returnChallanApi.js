import axiosInstance from '../config/axiosConfig';

export const returnChallanApi = {

  // ── List all DCs (Manager only) ──────────────────────────
  getAll: () =>
    axiosInstance.get('/qc/return-challans'),

  // ── DC detail ────────────────────────────────────────────
  getById: (id) =>
    axiosInstance.get(`/qc/return-challans/${id}`),

  // ── DCs for a specific batch ─────────────────────────────
  getByBatch: (batchId) =>
    axiosInstance.get(`/qc/return-challans/batch/${batchId}`),

  // ── Create DC from rejected batch (Manager only) ─────────
  create: (batchId, remarks = null) =>
    axiosInstance.post(`/qc/return-challans/batch/${batchId}/create`, { remarks }),

  // ── Send DC to supplier (Manager only) ───────────────────
  send: (dcId) =>
    axiosInstance.post(`/qc/return-challans/${dcId}/send`, {}),

  // ── Mark replacement received (Manager only) ─────────────
  replacementReceived: (dcId, invoiceNo = null, receivedDate = null) =>
    axiosInstance.post(`/qc/return-challans/${dcId}/replacement-received`, {
      invoiceNo,
      receivedDate,
    }),

  // ── Batch timeline (QC + Manager) ────────────────────────
  getTimeline: (batchId) =>
    axiosInstance.get(`/qc/return-challans/timeline/${batchId}`),
};
