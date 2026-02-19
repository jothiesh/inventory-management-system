/**
 * Application-wide constants for frontend
 */

// ============================================
// API ENDPOINTS
// ============================================
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  CATEGORIES: '/categories',
  PRODUCTS: '/products',
  RACKS: '/racks',
  BOXES: '/boxes',
  SUPPLIERS: '/suppliers',
  LOTS: '/lots',
  STOCK: {
    IN: '/stock/in',
    OUT: '/stock/out',
    CURRENT: '/stock/current',
    BY_PRODUCT: '/stock/product',
  },
  ALERTS: '/alerts',
  REPORTS: {
    STOCK_SUMMARY: '/reports/stock-summary',
    CATEGORY_WISE: '/reports/category-wise',
    RACK_WISE: '/reports/rack-wise',
    DEAD_STOCK: '/reports/dead-stock',
    SLOW_MOVING: '/reports/slow-moving',
    PRICE_DIFFERENCE: '/reports/price-difference',
    STOCK_VALUE: '/reports/stock-value',
  },
  INIT: '/init',
};

// ============================================
// USER ROLES
// ============================================
export const USER_ROLES = {
  OWNER: 'OWNER',
  STORE_MANAGER: 'STORE_MANAGER',
};

// ============================================
// PRODUCT TYPES
// ============================================
export const PRODUCT_TYPES = [
  { value: 'PCBA', label: 'PCBA' },
  { value: 'Component', label: 'Component' },
  { value: 'Module', label: 'Module' },
  { value: 'Finished', label: 'Finished Product' },
];

// ============================================
// UNITS OF MEASUREMENT
// ============================================
export const UNITS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'set', label: 'Set' },
  { value: 'box', label: 'Box' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'meter', label: 'Meter (m)' },
];

// ============================================
// MOVEMENT TYPES
// ============================================
export const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
};

// ============================================
// TRANSACTION TYPES
// ============================================
export const TRANSACTION_TYPES = {
  STOCK_IN: [
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Transfer', label: 'Transfer In' },
  ],
  STOCK_OUT: [
    { value: 'Sale', label: 'Sale' },
    { value: 'Production', label: 'Production Use' },
    { value: 'Damage', label: 'Damage/Defect' },
    { value: 'Scrap', label: 'Scrap' },
    { value: 'Transfer', label: 'Transfer Out' },
  ],
};

// ============================================
// LOT STATUS
// ============================================
export const LOT_STATUS = {
  ACTIVE: 'Active',
  DEPLETED: 'Depleted',
  EXPIRED: 'Expired',
};

// ============================================
// ALERT TYPES
// ============================================
export const ALERT_TYPES = {
  DEAD_STOCK: 'DEAD_STOCK',
  SLOW_MOVING: 'SLOW_MOVING',
  PRICE_CHANGE: 'PRICE_CHANGE',
  LOW_STOCK: 'LOW_STOCK',
  EXCESS_STOCK: 'EXCESS_STOCK',
};

// ============================================
// ALERT SEVERITY
// ============================================
export const ALERT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

// ============================================
// ALERT SEVERITY COLORS
// ============================================
export const ALERT_COLORS = {
  HIGH: '#ef4444',      // Red
  MEDIUM: '#f59e0b',    // Yellow
  LOW: '#3b82f6',       // Blue
};

// ============================================
// STOCK STATUS
// ============================================
export const STOCK_STATUS = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
  EXCESS_STOCK: 'Excess Stock',
};

// ============================================
// STOCK STATUS COLORS
// ============================================
export const STOCK_STATUS_COLORS = {
  'In Stock': '#10b981',      // Green
  'Low Stock': '#f59e0b',     // Yellow
  'Out of Stock': '#ef4444',  // Red
  'Excess Stock': '#3b82f6',  // Blue
};

// ============================================
// DATE FORMATS
// ============================================
export const DATE_FORMATS = {
  DISPLAY: 'DD MMM YYYY',
  DISPLAY_WITH_TIME: 'DD MMM YYYY HH:mm',
  INPUT: 'YYYY-MM-DD',
  API: 'YYYY-MM-DD',
  FULL: 'MMMM DD, YYYY',
};

// ============================================
// PAGINATION
// ============================================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// ============================================
// VALIDATION RULES
// ============================================
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 100,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^[0-9]{10}$/,
  },
  CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    PATTERN: /^[A-Z0-9-]+$/,
  },
  QUANTITY: {
    MIN: 0.01,
    MAX: 999999.99,
  },
  PRICE: {
    MIN: 0.01,
    MAX: 999999.99,
  },
};

// ============================================
// LOCAL STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  REMEMBER_ME: 'rememberMe',
  THEME: 'theme',
};

// ============================================
// TOAST CONFIGURATION
// ============================================
export const TOAST_CONFIG = {
  POSITION: 'top-right',
  AUTO_CLOSE: 3000,
  HIDE_PROGRESS_BAR: false,
  CLOSE_ON_CLICK: true,
  PAUSE_ON_HOVER: true,
  DRAGGABLE: true,
};

// ============================================
// CHART COLORS
// ============================================
export const CHART_COLORS = [
  '#4f46e5', // Indigo
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#6366f1', // Light Indigo
];

// ============================================
// ROUTES
// ============================================
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CATEGORIES: '/categories',
  PRODUCTS: '/products',
  RACKS: '/racks',
  SUPPLIERS: '/suppliers',
  STOCK_IN: '/stock-in',
  STOCK_OUT: '/stock-out',
  CURRENT_STOCK: '/current-stock',
  ALERTS: '/alerts',
  REPORTS: '/reports',
};

// ============================================
// ERROR MESSAGES
// ============================================
export const ERROR_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PHONE: 'Invalid phone number (10 digits required)',
  INVALID_USERNAME: 'Username can only contain letters, numbers, and underscores',
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
  POSITIVE_NUMBER: 'Must be a positive number',
  INVALID_CODE: 'Code can only contain uppercase letters, numbers, and hyphens',
  NETWORK_ERROR: 'Network error. Please check your connection',
  UNAUTHORIZED: 'Unauthorized. Please login again',
  FORBIDDEN: 'You do not have permission to perform this action',
  SERVER_ERROR: 'Server error. Please try again later',
};

// ============================================
// SUCCESS MESSAGES
// ============================================
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful',
  LOGOUT: 'Logout successful',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  STOCK_IN: 'Stock added successfully',
  STOCK_OUT: 'Stock issued successfully',
  ALERT_READ: 'Alert marked as read',
  DATA_INITIALIZED: 'Default data initialized successfully',
};

// ============================================
// REPORT TYPES
// ============================================
export const REPORT_TYPES = {
  STOCK_SUMMARY: {
    id: 'stock-summary',
    label: 'Stock Summary',
    icon: '📊',
  },
  CATEGORY_WISE: {
    id: 'category-wise',
    label: 'Category-wise',
    icon: '📁',
  },
  RACK_WISE: {
    id: 'rack-wise',
    label: 'Rack-wise',
    icon: '🗄️',
  },
  DEAD_STOCK: {
    id: 'dead-stock',
    label: 'Dead Stock',
    icon: '⚠️',
  },
  SLOW_MOVING: {
    id: 'slow-moving',
    label: 'Slow Moving',
    icon: '🐌',
  },
  PRICE_DIFFERENCE: {
    id: 'price-difference',
    label: 'Price Difference',
    icon: '💰',
  },
  STOCK_VALUE: {
    id: 'stock-value',
    label: 'Stock Value',
    icon: '💵',
  },
};

// ============================================
// DEFAULT VALUES
// ============================================
export const DEFAULT_VALUES = {
  REORDER_LEVEL: 10,
  MAX_STOCK_LEVEL: 1000,
  DEFAULT_QUANTITY: 1,
};

// ============================================
// FILE UPLOAD
// ============================================
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
};

// ============================================
// DEBOUNCE DELAY (milliseconds)
// ============================================
export const DEBOUNCE_DELAY = 300;

// ============================================
// REFRESH INTERVAL (milliseconds)
// ============================================
export const REFRESH_INTERVALS = {
  DASHBOARD: 30000,      // 30 seconds
  ALERTS: 60000,         // 1 minute
  STOCK: 60000,          // 1 minute
};

export default {
  API_ENDPOINTS,
  USER_ROLES,
  PRODUCT_TYPES,
  UNITS,
  MOVEMENT_TYPES,
  TRANSACTION_TYPES,
  LOT_STATUS,
  ALERT_TYPES,
  ALERT_SEVERITY,
  ALERT_COLORS,
  STOCK_STATUS,
  STOCK_STATUS_COLORS,
  DATE_FORMATS,
  PAGINATION,
  VALIDATION_RULES,
  STORAGE_KEYS,
  TOAST_CONFIG,
  CHART_COLORS,
  ROUTES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REPORT_TYPES,
  DEFAULT_VALUES,
  FILE_UPLOAD,
  DEBOUNCE_DELAY,
  REFRESH_INTERVALS,
};