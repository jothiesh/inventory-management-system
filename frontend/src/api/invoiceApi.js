// src/api/invoiceApi.js
// Purchase Invoice + blank-template endpoints for tablet workflow
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const inv = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

inv.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("jwt");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const invoiceApi = {
  /** Step 1: tablet captures invoice photo / PDF and uploads it. */
  async upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await inv.post("/qc/invoices/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data; // { id }
  },

  /** Step 2: fill or update the metadata for an uploaded invoice. */
  async update(id, payload) {
    const { data } = await inv.put(`/qc/invoices/${id}`, payload);
    return data;
  },

  /** Create from scratch (no file). */
  async create(payload) {
    const { data } = await inv.post("/qc/invoices", payload);
    return data;
  },

  /** Link an invoice to a Stock IN batch. */
  async linkToBatch(id, batchId) {
    await inv.post(`/qc/invoices/${id}/link/${batchId}`);
  },

  async search(q = "", page = 0, size = 20) {
    const { data } = await inv.get("/qc/invoices", { params: { q, page, size } });
    return data;
  },

  async getById(id) {
    const { data } = await inv.get(`/qc/invoices/${id}`);
    return data;
  },

  /** Returns a Blob URL for inline preview of the scanned file. */
  async getFileUrl(id) {
    const res = await inv.get(`/qc/invoices/${id}/file`, { responseType: "blob" });
    return URL.createObjectURL(res.data);
  },

  /** Download the blank Word template for a category. */
  async downloadBlankTemplate(categoryCode) {
    const res = await inv.get(`/qc/templates/blank/${categoryCode}`, {
      responseType: "blob",
    });
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QC_Checklist_${categoryCode}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
