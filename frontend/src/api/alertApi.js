import axiosInstance from '../config/axiosConfig';

export const alertApi = {
  getAll:                () => axiosInstance.get('/alerts'),
  getUnread:             () => axiosInstance.get('/alerts/unread'),
  getUnreadCount:        () => axiosInstance.get('/alerts/unread/count'),
  getByType:             (type) => axiosInstance.get(`/alerts/type/${type}`),
  markAsRead:            (alertId) => axiosInstance.put(`/alerts/${alertId}/read`),
  markAllAsRead:         () => axiosInstance.put('/alerts/read-all'),

  // ── NEW: Stock OUT alerts for Owner + Manager ──
  getStockOutAlerts:      () => axiosInstance.get('/alerts/stock-out'),
  getStockOutUnreadCount: () => axiosInstance.get('/alerts/stock-out/unread/count'),
  markAllStockOutAsRead:  () => axiosInstance.put('/alerts/stock-out/read-all'),
};