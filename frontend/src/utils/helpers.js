import { format, parseISO } from 'date-fns';
import { DATE_FORMATS, STOCK_STATUS, STOCK_STATUS_COLORS, ALERT_COLORS } from './constants';

/**
 * Utility helper functions
 */

// ============================================
// DATE/TIME HELPERS
// ============================================

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - Format string (default: DD MMM YYYY)
 * @returns {string} Formatted date
 */
export const formatDate = (date, formatStr = DATE_FORMATS.DISPLAY) => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format datetime for display
 * @param {string|Date} dateTime - DateTime to format
 * @returns {string} Formatted datetime
 */
export const formatDateTime = (dateTime) => {
  return formatDate(dateTime, DATE_FORMATS.DISPLAY_WITH_TIME);
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffInMs = now - dateObj;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
};

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0.00';
  
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format currency (INR)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0.00';
  
  return `₹${formatNumber(amount, 2)}`;
};

/**
 * Parse formatted number back to float
 * @param {string} formattedNumber - Formatted number string
 * @returns {number} Parsed number
 */
export const parseFormattedNumber = (formattedNumber) => {
  if (!formattedNumber) return 0;
  
  const cleaned = formattedNumber.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

// ============================================
// STRING HELPERS
// ============================================

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength = 50) => {
  if (!str || str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};

/**
 * Generate initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// ============================================
// STOCK HELPERS
// ============================================

/**
 * Get stock status based on quantity and thresholds
 * @param {number} currentStock - Current stock quantity
 * @param {number} reorderLevel - Reorder threshold
 * @param {number} maxStockLevel - Maximum stock threshold
 * @returns {string} Stock status
 */
export const getStockStatus = (currentStock, reorderLevel, maxStockLevel) => {
  const stock = parseFloat(currentStock) || 0;
  const reorder = parseFloat(reorderLevel) || 0;
  const max = parseFloat(maxStockLevel) || Infinity;
  
  if (stock === 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (stock <= reorder) return STOCK_STATUS.LOW_STOCK;
  if (stock >= max) return STOCK_STATUS.EXCESS_STOCK;
  return STOCK_STATUS.IN_STOCK;
};

/**
 * Get color for stock status
 * @param {string} status - Stock status
 * @returns {string} Color hex code
 */
export const getStockStatusColor = (status) => {
  return STOCK_STATUS_COLORS[status] || '#6b7280';
};

/**
 * Get color for alert severity
 * @param {string} severity - Alert severity
 * @returns {string} Color hex code
 */
export const getAlertColor = (severity) => {
  return ALERT_COLORS[severity] || '#6b7280';
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if phone is valid (10 digits)
 * @param {string} phone - Phone to validate
 * @returns {boolean} Is valid
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

/**
 * Check if value is a positive number
 * @param {any} value - Value to check
 * @returns {boolean} Is positive number
 */
export const isPositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
};

// ============================================
// ARRAY HELPERS
// ============================================

/**
 * Sort array by property
 * @param {Array} array - Array to sort
 * @param {string} property - Property to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortBy = (array, property, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Group array by property
 * @param {Array} array - Array to group
 * @param {string} property - Property to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, property) => {
  return array.reduce((grouped, item) => {
    const key = item[property];
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
    return grouped;
  }, {});
};

/**
 * Remove duplicates from array
 * @param {Array} array - Array with duplicates
 * @param {string} key - Optional key for objects
 * @returns {Array} Array without duplicates
 */
export const removeDuplicates = (array, key = null) => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// ============================================
// OBJECT HELPERS
// ============================================

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} Is empty
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Pick specific properties from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object} New object with picked keys
 */
export const pick = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

/**
 * Omit specific properties from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object} New object without omitted keys
 */
export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

// ============================================
// DOWNLOAD HELPERS
// ============================================

/**
 * Download data as JSON file
 * @param {Object|Array} data - Data to download
 * @param {string} filename - File name
 */
export const downloadJSON = (data, filename = 'data.json') => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects
 * @param {string} filename - File name
 */
export const downloadCSV = (data, filename = 'data.csv') => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ============================================
// DEBOUNCE
// ============================================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};