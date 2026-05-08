/**
 * Application-wide constants for frontend
 */

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
  NEW_PRODUCT: 'NEW_PRODUCT',
  STOCK_ADDED: 'STOCK_ADDED',
  CATEGORY_ADDED: 'CATEGORY_ADDED',
};

// ============================================
// ALERT SEVERITY
// ============================================
export const ALERT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export const ALERT_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
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

export const STOCK_STATUS_COLORS = {
  'In Stock': '#10b981',
  'Low Stock': '#f59e0b',
  'Out of Stock': '#ef4444',
  'Excess Stock': '#3b82f6',
};

// ============================================
// ✅ FIX: DATE FORMATS - Use correct date-fns tokens
// date-fns uses: dd (day), MMM (month), yyyy (year), HH:mm (time)
// NOT: DD (day-of-year), YYYY (week-year)
// ============================================
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMM yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  API: 'yyyy-MM-dd',
  FULL: 'MMMM dd, yyyy',
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
  STOCK_OUT_HISTORY: '/stock-out-history',
  EXCEL_IMPORT: '/excel-import',
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
// CHART COLORS
// ============================================
export const CHART_COLORS = [
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#6366f1',
];

// ============================================
// DEFAULT VALUES
// ============================================
export const DEFAULT_VALUES = {
  REORDER_LEVEL: 10,
  MAX_STOCK_LEVEL: 1000,
  DEFAULT_QUANTITY: 1,
};

// ============================================
// DEBOUNCE DELAY (milliseconds)
// ============================================
export const DEBOUNCE_DELAY = 300;

// ============================================
// REFRESH INTERVALS (milliseconds)
// ============================================
export const REFRESH_INTERVALS = {
  DASHBOARD: 30000,
  ALERTS: 60000,
  STOCK: 60000,
};
