// Helper Functions for FitGoal AI Application

import { 
  BMI_CATEGORIES, 
  ACTIVITY_MULTIPLIERS, 
  MACRO_RATIOS,
  DATE_FORMATS,
  MEASUREMENT_UNITS
} from './constants';

// **Math & Calculations**

/**
 * Calculate BMI from weight and height
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @returns {number} BMI value
 */
export const calculateBMI = (weight, height) => {
  if (!weight || !height || weight <= 0 || height <= 0) return 0;
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

/**
 * Get BMI category and color
 * @param {number} bmi - BMI value
 * @returns {object} Category information
 */
export const getBMICategory = (bmi) => {
  for (const [key, category] of Object.entries(BMI_CATEGORIES)) {
    if (bmi >= category.min && bmi < category.max) {
      return { category: key, ...category };
    }
  }
  return BMI_CATEGORIES.NORMAL;
};

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * @param {object} profile - User profile
 * @returns {number} BMR in calories
 */
export const calculateBMR = (profile) => {
  const { weight, height, age, gender } = profile;
  
  if (!weight || !height || !age) return 0;
  
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  
  return Math.round(bmr);
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * @param {object} profile - User profile
 * @returns {number} TDEE in calories
 */
export const calculateTDEE = (profile) => {
  const bmr = calculateBMR(profile);
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
};

/**
 * Calculate target calories based on goal
 * @param {object} profile - User profile
 * @returns {number} Target calories
 */
export const calculateTargetCalories = (profile) => {
  const tdee = calculateTDEE(profile);
  const { goal } = profile;
  
  switch (goal) {
    case 'lose':
      return Math.round(tdee * 0.8); // 20% deficit
    case 'gain':
      return Math.round(tdee * 1.2); // 20% surplus
    case 'muscle':
      return Math.round(tdee * 1.1); // 10% surplus
    default:
      return tdee;
  }
};

/**
 * Calculate macro targets
 * @param {object} profile - User profile
 * @returns {object} Macro targets in grams
 */
export const calculateMacros = (profile) => {
  const calories = calculateTargetCalories(profile);
  const ratios = MACRO_RATIOS[profile.goal] || MACRO_RATIOS.maintain;
  
  return {
    protein: Math.round((calories * (ratios.protein / 100)) / 4),
    carbs: Math.round((calories * (ratios.carbs / 100)) / 4),
    fat: Math.round((calories * (ratios.fat / 100)) / 9),
    calories
  };
};

// **Date & Time Utilities**

/**
 * Format date to specified format
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = DATE_FORMATS.MEDIUM) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const options = {};
  
  switch (format) {
    case DATE_FORMATS.SHORT:
      options.month = 'short';
      options.day = '2-digit';
      break;
    case DATE_FORMATS.MEDIUM:
      options.month = 'short';
      options.day = '2-digit';
      options.year = 'numeric';
      break;
    case DATE_FORMATS.LONG:
      options.month = 'long';
      options.day = '2-digit';
      options.year = 'numeric';
      break;
    case DATE_FORMATS.TIME:
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
      break;
    case DATE_FORMATS.DATETIME:
      options.month = 'short';
      options.day = '2-digit';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
      break;
    default:
      return d.toLocaleDateString();
  }
  
  return d.toLocaleDateString('en-US', options);
};

/**
 * Get relative time string
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} Is today
 */
export const isToday = (date) => {
  if (!date) return false;
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

/**
 * Get week dates array
 * @param {Date} startDate - Start of week
 * @returns {Array} Array of 7 dates
 */
export const getWeekDates = (startDate = new Date()) => {
  const dates = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

// **String Utilities**

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str.split(' ').map(capitalize).join(' ');
};

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated string
 */
export const truncate = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
export const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// **Array Utilities**

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const groupKey = item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

/**
 * Sort array by multiple fields
 * @param {Array} array - Array to sort
 * @param {Array} fields - Fields to sort by
 * @returns {Array} Sorted array
 */
export const sortBy = (array, fields) => {
  return array.sort((a, b) => {
    for (const field of fields) {
      const { key, direction = 'asc' } = typeof field === 'string' ? { key: field } : field;
      const valueA = a[key];
      const valueB = b[key];
      
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Get unique values from array
 * @param {Array} array - Input array
 * @param {string} key - Key to extract unique values from
 * @returns {Array} Unique values
 */
export const unique = (array, key = null) => {
  if (key) {
    return array.filter((item, index, self) => 
      index === self.findIndex(t => t[key] === item[key])
    );
  }
  return [...new Set(array)];
};

// **Number Utilities**

/**
 * Round number to specified decimal places
 * @param {number} num - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
export const roundTo = (num, decimals = 1) => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

/**
 * Generate random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
export const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// **Unit Conversion**

/**
 * Convert weight between units
 * @param {number} weight - Weight value
 * @param {string} from - Source unit
 * @param {string} to - Target unit
 * @returns {number} Converted weight
 */
export const convertWeight = (weight, from, to) => {
  if (from === to) return weight;
  
  const toKg = from === MEASUREMENT_UNITS.WEIGHT.LBS ? weight * 0.453592 : weight;
  return to === MEASUREMENT_UNITS.WEIGHT.LBS ? toKg * 2.20462 : toKg;
};

/**
 * Convert height between units
 * @param {number} height - Height value
 * @param {string} from - Source unit
 * @param {string} to - Target unit
 * @returns {number} Converted height
 */
export const convertHeight = (height, from, to) => {
  if (from === to) return height;
  
  let heightInCm = height;
  
  if (from === MEASUREMENT_UNITS.HEIGHT.INCHES) {
    heightInCm = height * 2.54;
  } else if (from === MEASUREMENT_UNITS.HEIGHT.FEET) {
    heightInCm = height * 30.48;
  }
  
  if (to === MEASUREMENT_UNITS.HEIGHT.INCHES) {
    return heightInCm / 2.54;
  } else if (to === MEASUREMENT_UNITS.HEIGHT.FEET) {
    return heightInCm / 30.48;
  }
  
  return heightInCm;
};

// **Local Storage Utilities**

/**
 * Save data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @returns {boolean} Success status
 */
export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
};

/**
 * Load data from localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored data or default value
 */
export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
    return false;
  }
};

// **Color Utilities**

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color
 * @returns {object} RGB object
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Generate color variations
 * @param {string} color - Base color
 * @param {number} percentage - Percentage to lighten/darken
 * @returns {string} Modified color
 */
export const adjustColor = (color, percentage) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const adjust = (value) => {
    const adjusted = value + (percentage > 0 ? 
      (255 - value) * (percentage / 100) : 
      value * (percentage / 100)
    );
    return Math.round(Math.max(0, Math.min(255, adjusted)));
  };
  
  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
};

// **Validation Utilities**

/**
 * Check if value is empty
 * @param {any} value - Value to check
 * @returns {boolean} Is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Deep clone object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export default {
  calculateBMI,
  getBMICategory,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  formatDate,
  getRelativeTime,
  isToday,
  getWeekDates,
  capitalize,
  toTitleCase,
  truncate,
  generateRandomString,
  groupBy,
  sortBy,
  unique,
  roundTo,
  formatNumber,
  randomBetween,
  convertWeight,
  convertHeight,
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  hexToRgb,
  adjustColor,
  isEmpty,
  deepClone,
  debounce,
  throttle
};