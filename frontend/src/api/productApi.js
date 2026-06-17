import axiosInstance from '../config/axiosConfig';

export const productApi = {
  // ── Core endpoints ────────────────────────────────────────────
  getAll:           ()           => axiosInstance.get('/products'),
  getActive:        ()           => axiosInstance.get('/products/active'),   // ← restored (used by StockIn)
  getById:          (id)         => axiosInstance.get(`/products/${id}`),
  getByCategory:    (catId)      => axiosInstance.get(`/products/category/${catId}`),
  create:           (data)       => axiosInstance.post('/products', data),
  update:           (id, data)   => axiosInstance.put(`/products/${id}`, data),
  delete:           (id)         => axiosInstance.delete(`/products/${id}`),
  search:           (q)          => axiosInstance.get(`/products/search?keyword=${encodeURIComponent(q)}`),

  // ── NEW: Update min stock level inline from CurrentStock page ──
  updateMinStockLevel: (productId, minLevel) =>
    axiosInstance.patch(`/products/${productId}/min-stock-level`, { minLevel }),
};