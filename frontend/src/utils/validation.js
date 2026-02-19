import { VALIDATION_RULES, ERROR_MESSAGES } from './constants';

/**
 * Validation utility functions
 */

// ============================================
// FIELD VALIDATORS
// ============================================

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {string|null} Error message or null
 */
export const validateRequired = (value) => {
  if (value === null || value === undefined || value === '') {
    return ERROR_MESSAGES.REQUIRED;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return ERROR_MESSAGES.REQUIRED;
  }
  return null;
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {string|null} Error message or null
 */
export const validateEmail = (email) => {
  if (!email) return null; // Allow empty (use validateRequired separately)
  
  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return ERROR_MESSAGES.INVALID_EMAIL;
  }
  return null;
};

/**
 * Validate phone number
 * @param {string} phone - Phone to validate
 * @returns {string|null} Error message or null
 */
export const validatePhone = (phone) => {
  if (!phone) return null; // Allow empty
  
  if (!VALIDATION_RULES.PHONE.PATTERN.test(phone)) {
    return ERROR_MESSAGES.INVALID_PHONE;
  }
  return null;
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {string|null} Error message or null
 */
export const validateUsername = (username) => {
  if (!username) return ERROR_MESSAGES.REQUIRED;
  
  const { MIN_LENGTH, MAX_LENGTH, PATTERN } = VALIDATION_RULES.USERNAME;
  
  if (username.length < MIN_LENGTH || username.length > MAX_LENGTH) {
    return `Username must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`;
  }
  
  if (!PATTERN.test(username)) {
    return ERROR_MESSAGES.INVALID_USERNAME;
  }
  
  return null;
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {string|null} Error message or null
 */
export const validatePassword = (password) => {
  if (!password) return ERROR_MESSAGES.REQUIRED;
  
  const { MIN_LENGTH, MAX_LENGTH } = VALIDATION_RULES.PASSWORD;
  
  if (password.length < MIN_LENGTH) {
    return ERROR_MESSAGES.PASSWORD_MIN_LENGTH;
  }
  
  if (password.length > MAX_LENGTH) {
    return `Password must not exceed ${MAX_LENGTH} characters`;
  }
  
  return null;
};

/**
 * Validate code (category code, supplier code, etc.)
 * @param {string} code - Code to validate
 * @returns {string|null} Error message or null
 */
export const validateCode = (code) => {
  if (!code) return null; // Allow empty
  
  const { MIN_LENGTH, MAX_LENGTH, PATTERN } = VALIDATION_RULES.CODE;
  
  if (code.length < MIN_LENGTH || code.length > MAX_LENGTH) {
    return `Code must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`;
  }
  
  if (!PATTERN.test(code)) {
    return ERROR_MESSAGES.INVALID_CODE;
  }
  
  return null;
};

/**
 * Validate positive number
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null
 */
export const validatePositiveNumber = (value, fieldName = 'Value') => {
  if (value === null || value === undefined || value === '') {
    return null; // Allow empty
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  
  if (num <= 0) {
    return ERROR_MESSAGES.POSITIVE_NUMBER;
  }
  
  return null;
};

/**
 * Validate quantity
 * @param {any} quantity - Quantity to validate
 * @returns {string|null} Error message or null
 */
export const validateQuantity = (quantity) => {
  const error = validatePositiveNumber(quantity, 'Quantity');
  if (error) return error;
  
  const num = parseFloat(quantity);
  const { MIN, MAX } = VALIDATION_RULES.QUANTITY;
  
  if (num < MIN || num > MAX) {
    return `Quantity must be between ${MIN} and ${MAX}`;
  }
  
  return null;
};

/**
 * Validate price
 * @param {any} price - Price to validate
 * @returns {string|null} Error message or null
 */
export const validatePrice = (price) => {
  const error = validatePositiveNumber(price, 'Price');
  if (error) return error;
  
  const num = parseFloat(price);
  const { MIN, MAX } = VALIDATION_RULES.PRICE;
  
  if (num < MIN || num > MAX) {
    return `Price must be between ${MIN} and ${MAX}`;
  }
  
  return null;
};

/**
 * Validate number range
 * @param {any} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null
 */
export const validateRange = (value, min, max, fieldName = 'Value') => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  
  if (num < min || num > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  
  return null;
};

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null
 */
export const validateMinLength = (value, minLength, fieldName = 'Field') => {
  if (!value) return null;
  
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  
  return null;
};

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null
 */
export const validateMaxLength = (value, maxLength, fieldName = 'Field') => {
  if (!value) return null;
  
  if (value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  
  return null;
};

/**
 * Validate date
 * @param {string} date - Date string to validate
 * @returns {string|null} Error message or null
 */
export const validateDate = (date) => {
  if (!date) return null;
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  return null;
};

/**
 * Validate future date
 * @param {string} date - Date string to validate
 * @returns {string|null} Error message or null
 */
export const validateFutureDate = (date) => {
  const dateError = validateDate(date);
  if (dateError) return dateError;
  
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dateObj < today) {
    return 'Date cannot be in the past';
  }
  
  return null;
};

/**
 * Validate past date
 * @param {string} date - Date string to validate
 * @returns {string|null} Error message or null
 */
export const validatePastDate = (date) => {
  const dateError = validateDate(date);
  if (dateError) return dateError;
  
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (dateObj > today) {
    return 'Date cannot be in the future';
  }
  
  return null;
};

// ============================================
// FORM VALIDATORS
// ============================================

/**
 * Validate login form
 * @param {Object} formData - Form data
 * @returns {Object} Errors object
 */
export const validateLoginForm = (formData) => {
  const errors = {};
  
  const usernameError = validateRequired(formData.username);
  if (usernameError) errors.username = usernameError;
  
  const passwordError = validateRequired(formData.password);
  if (passwordError) errors.password = passwordError;
  
  return errors;
};

/**
 * Validate category form
 * @param {Object} formData - Form data
 * @returns {Object} Errors object
 */
export const validateCategoryForm = (formData) => {
  const errors = {};
  
  const nameError = validateRequired(formData.categoryName);
  if (nameError) errors.categoryName = nameError;
  
  const codeError = validateRequired(formData.categoryCode) || validateCode(formData.categoryCode);
  if (codeError) errors.categoryCode = codeError;
  
  return errors;
};

/**
 * Validate product form
 * @param {Object} formData - Form data
 * @returns {Object} Errors object
 */
export const validateProductForm = (formData) => {
  const errors = {};
  
  const nameError = validateRequired(formData.productName);
  if (nameError) errors.productName = nameError;
  
  const categoryError = validateRequired(formData.categoryId);
  if (categoryError) errors.categoryId = categoryError;
  
  const typeError = validateRequired(formData.productType);
  if (typeError) errors.productType = typeError;
  
  const unitError = validateRequired(formData.unit);
  if (unitError) errors.unit = unitError;
  
  if (formData.reorderLevel) {
    const reorderError = validatePositiveNumber(formData.reorderLevel, 'Reorder level');
    if (reorderError) errors.reorderLevel = reorderError;
  }
  
  if (formData.maxStockLevel) {
    const maxError = validatePositiveNumber(formData.maxStockLevel, 'Max stock level');
    if (maxError) errors.maxStockLevel = maxError;
  }
  
  return errors;
};

/**
 * Validate supplier form
 * @param {Object} formData - Form data
 * @returns {Object} Errors object
 */
export const validateSupplierForm = (formData) => {
  const errors = {};
  
  const nameError = validateRequired(formData.supplierName);
  if (nameError) errors.supplierName = nameError;
  
  if (formData.email) {
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
  }
  
  if (formData.phone) {
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;
  }
  
  return errors;
};

/**
 * Validate stock IN form
 * @param {Object} formData - Form data
 * @returns {Object} Errors object
 */
export const validateStockInForm = (formData) => {
  const errors = {};
  
  const productError = validateRequired(formData.productId);
  if (productError) errors.productId = productError;
  
  const quantityError = validateRequired(formData.quantity) || validateQuantity(formData.quantity);
  if (quantityError) errors.quantity = quantityError;
  
  const priceError = validateRequired(formData.purchasePrice) || validatePrice(formData.purchasePrice);
  if (priceError) errors.purchasePrice = priceError;
  
  const dateError = validateRequired(formData.purchaseDate) || validatePastDate(formData.purchaseDate);
  if (dateError) errors.purchaseDate = dateError;
  
  const rackError = validateRequired(formData.rackId);
  if (rackError) errors.rackId = rackError;
  
  const boxError = validateRequired(formData.boxId);
  if (boxError) errors.boxId = boxError;
  
  return errors;
};

/**
 * Validate stock OUT form
 * @param {Object} formData - Form data
 * @returns {Object} Errors object
 */
export const validateStockOutForm = (formData) => {
  const errors = {};
  
  const productError = validateRequired(formData.productId);
  if (productError) errors.productId = productError;
  
  const quantityError = validateRequired(formData.quantity) || validateQuantity(formData.quantity);
  if (quantityError) errors.quantity = quantityError;
  
  const typeError = validateRequired(formData.transactionType);
  if (typeError) errors.transactionType = typeError;
  
  return errors;
};

/**
 * Generic form validator
 * @param {Object} formData - Form data
 * @param {Object} rules - Validation rules
 * @returns {Object} Errors object
 */
export const validateForm = (formData, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = formData[field];
    
    if (rule.required) {
      const error = validateRequired(value);
      if (error) {
        errors[field] = error;
        return;
      }
    }
    
    if (rule.email) {
      const error = validateEmail(value);
      if (error) errors[field] = error;
    }
    
    if (rule.phone) {
      const error = validatePhone(value);
      if (error) errors[field] = error;
    }
    
    if (rule.minLength) {
      const error = validateMinLength(value, rule.minLength, field);
      if (error) errors[field] = error;
    }
    
    if (rule.maxLength) {
      const error = validateMaxLength(value, rule.maxLength, field);
      if (error) errors[field] = error;
    }
    
    if (rule.min !== undefined || rule.max !== undefined) {
      const error = validateRange(value, rule.min, rule.max, field);
      if (error) errors[field] = error;
    }
    
    if (rule.custom) {
      const error = rule.custom(value);
      if (error) errors[field] = error;
    }
  });
  
  return errors;
};

export default {
  validateRequired,
  validateEmail,
  validatePhone,
  validateUsername,
  validatePassword,
  validateCode,
  validatePositiveNumber,
  validateQuantity,
  validatePrice,
  validateRange,
  validateMinLength,
  validateMaxLength,
  validateDate,
  validateFutureDate,
  validatePastDate,
  validateLoginForm,
  validateCategoryForm,
  validateProductForm,
  validateSupplierForm,
  validateStockInForm,
  validateStockOutForm,
  validateForm,
};