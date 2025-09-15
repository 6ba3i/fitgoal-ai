// Constants for FitGoal AI Application

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Spoonacular API Configuration
export const SPOONACULAR_CONFIG = {
  BASE_URL: 'https://api.spoonacular.com',
  IMAGE_BASE_URL: 'https://spoonacular.com/recipeImages/',
  ENDPOINTS: {
    RECIPES: '/recipes',
    SEARCH: '/recipes/complexSearch',
    NUTRITION: '/recipes/{id}/nutritionWidget.json',
    INSTRUCTIONS: '/recipes/{id}/analyzedInstructions',
    SIMILAR: '/recipes/{id}/similar',
    INGREDIENTS: '/recipes/{id}/ingredientWidget.json'
  }
};

// Authentication
export const AUTH_CONFIG = {
  TOKEN_KEY: 'fitgoal_auth_token',
  USER_KEY: 'fitgoal_user_data',
  REFRESH_TOKEN_KEY: 'fitgoal_refresh_token',
  TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes before expiry
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 hours
};

// User Profile Constants
export const USER_GOALS = {
  LOSE_WEIGHT: 'lose',
  GAIN_WEIGHT: 'gain',
  MAINTAIN_WEIGHT: 'maintain',
  BUILD_MUSCLE: 'muscle',
  IMPROVE_FITNESS: 'fitness'
};

export const ACTIVITY_LEVELS = {
  SEDENTARY: 'sedentary',
  LIGHTLY_ACTIVE: 'lightly_active',
  MODERATELY_ACTIVE: 'moderately_active',
  VERY_ACTIVE: 'very_active',
  EXTREMELY_ACTIVE: 'extremely_active'
};

export const GENDER_OPTIONS = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
};

// BMI Categories
export const BMI_CATEGORIES = {
  UNDERWEIGHT: { min: 0, max: 18.5, label: 'Underweight', color: '#48dbfb' },
  NORMAL: { min: 18.5, max: 24.9, label: 'Normal', color: '#00d4aa' },
  OVERWEIGHT: { min: 25, max: 29.9, label: 'Overweight', color: '#feca57' },
  OBESE: { min: 30, max: 100, label: 'Obese', color: '#ff6b6b' }
};

// Activity Level Multipliers for BMR
export const ACTIVITY_MULTIPLIERS = {
  [ACTIVITY_LEVELS.SEDENTARY]: 1.2,
  [ACTIVITY_LEVELS.LIGHTLY_ACTIVE]: 1.375,
  [ACTIVITY_LEVELS.MODERATELY_ACTIVE]: 1.55,
  [ACTIVITY_LEVELS.VERY_ACTIVE]: 1.725,
  [ACTIVITY_LEVELS.EXTREMELY_ACTIVE]: 1.9
};

// Nutrition Constants
export const MACROS = {
  PROTEIN: 'protein',
  CARBS: 'carbs',
  FAT: 'fat',
  FIBER: 'fiber',
  SUGAR: 'sugar',
  SODIUM: 'sodium'
};

export const MACRO_RATIOS = {
  [USER_GOALS.LOSE_WEIGHT]: { protein: 30, carbs: 40, fat: 30 },
  [USER_GOALS.GAIN_WEIGHT]: { protein: 25, carbs: 45, fat: 30 },
  [USER_GOALS.MAINTAIN_WEIGHT]: { protein: 25, carbs: 45, fat: 30 },
  [USER_GOALS.BUILD_MUSCLE]: { protein: 35, carbs: 40, fat: 25 },
  [USER_GOALS.IMPROVE_FITNESS]: { protein: 25, carbs: 50, fat: 25 }
};

// Exercise Constants
export const EXERCISE_TYPES = {
  CARDIO: 'cardio',
  STRENGTH: 'strength',
  FLEXIBILITY: 'flexibility',
  SPORTS: 'sports',
  HIIT: 'hiit',
  YOGA: 'yoga'
};

export const WORKOUT_INTENSITIES = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

// Progress Tracking
export const MEASUREMENT_UNITS = {
  WEIGHT: {
    KG: 'kg',
    LBS: 'lbs'
  },
  HEIGHT: {
    CM: 'cm',
    INCHES: 'inches',
    FEET: 'feet'
  },
  DISTANCE: {
    KM: 'km',
    MILES: 'miles'
  }
};

export const PROGRESS_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#667eea',
  SECONDARY: '#f093fb',
  SUCCESS: '#00d4aa',
  WARNING: '#feca57',
  ERROR: '#ff6b6b',
  INFO: '#48dbfb',
  GRADIENT_COLORS: [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
  ]
};

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM DD',
  MEDIUM: 'MMM DD, YYYY',
  LONG: 'MMMM DD, YYYY',
  TIME: 'HH:mm',
  DATETIME: 'MMM DD, YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  ISO_TIME: 'YYYY-MM-DDTHH:mm:ss'
};

// Validation Constants
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  AGE_MIN: 13,
  AGE_MAX: 120,
  WEIGHT_MIN: 20, // kg
  WEIGHT_MAX: 500, // kg
  HEIGHT_MIN: 50, // cm
  HEIGHT_MAX: 300, // cm
  PHONE: /^[\+]?[1-9][\d]{0,15}$/
};

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'fitgoal_theme',
  LANGUAGE: 'fitgoal_language',
  PREFERENCES: 'fitgoal_preferences',
  DASHBOARD_LAYOUT: 'fitgoal_dashboard_layout',
  RECENT_SEARCHES: 'fitgoal_recent_searches',
  OFFLINE_DATA: 'fitgoal_offline_data'
};

// Theme Options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
  HIGH_CONTRAST: 'high-contrast'
};

// Language Options
export const LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  PT: 'pt',
  RU: 'ru',
  ZH: 'zh',
  JA: 'ja',
  KO: 'ko'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  TIMEOUT: 'Request timed out. Please try again.',
  GENERIC: 'Something went wrong. Please try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully!',
  GOAL_CREATED: 'Goal created successfully!',
  PROGRESS_LOGGED: 'Progress logged successfully!',
  RECIPE_SAVED: 'Recipe saved to favorites!',
  WORKOUT_COMPLETED: 'Workout completed! Great job!',
  SETTINGS_SAVED: 'Settings saved successfully!'
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'FitGoal AI',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-Powered Fitness and Nutrition Tracker',
  AUTHOR: 'FitGoal Team',
  CONTACT_EMAIL: 'support@fitgoal.ai',
  PRIVACY_POLICY_URL: '/privacy',
  TERMS_OF_SERVICE_URL: '/terms',
  HELP_URL: '/help'
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_SOCIAL_LOGIN: true,
  ENABLE_PREMIUM_FEATURES: false,
  ENABLE_ANALYTICS: true,
  ENABLE_AI_RECOMMENDATIONS: true,
  ENABLE_MEAL_PLANNING: true,
  ENABLE_WORKOUT_TRACKING: true
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Modal Types
export const MODAL_TYPES = {
  CONFIRM: 'confirm',
  ALERT: 'alert',
  FORM: 'form',
  CUSTOM: 'custom'
};

// Loading States
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50],
  MAX_PAGE_SIZE: 100
};

// Recipe Filters
export const RECIPE_FILTERS = {
  DIET_TYPES: [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
    'ketogenic', 'paleo', 'low-carb', 'mediterranean'
  ],
  MEAL_TYPES: [
    'breakfast', 'lunch', 'dinner', 'snack',
    'appetizer', 'dessert', 'drink'
  ],
  CUISINES: [
    'american', 'italian', 'mexican', 'chinese',
    'indian', 'french', 'japanese', 'thai',
    'mediterranean', 'middle-eastern'
  ],
  INTOLERANCES: [
    'dairy', 'egg', 'gluten', 'grain',
    'peanut', 'seafood', 'sesame', 'shellfish',
    'soy', 'sulfite', 'tree-nut', 'wheat'
  ]
};

// Default Values
export const DEFAULTS = {
  PROFILE: {
    age: 25,
    weight: 70,
    height: 170,
    gender: GENDER_OPTIONS.OTHER,
    activityLevel: ACTIVITY_LEVELS.MODERATELY_ACTIVE,
    goal: USER_GOALS.MAINTAIN_WEIGHT
  },
  PREFERENCES: {
    theme: THEMES.AUTO,
    language: LANGUAGES.EN,
    units: {
      weight: MEASUREMENT_UNITS.WEIGHT.KG,
      height: MEASUREMENT_UNITS.HEIGHT.CM,
      distance: MEASUREMENT_UNITS.DISTANCE.KM
    },
    notifications: {
      workouts: true,
      meals: true,
      progress: true,
      achievements: false
    }
  }
};

export default {
  API_CONFIG,
  SPOONACULAR_CONFIG,
  AUTH_CONFIG,
  USER_GOALS,
  ACTIVITY_LEVELS,
  GENDER_OPTIONS,
  BMI_CATEGORIES,
  ACTIVITY_MULTIPLIERS,
  MACROS,
  MACRO_RATIOS,
  EXERCISE_TYPES,
  WORKOUT_INTENSITIES,
  MEASUREMENT_UNITS,
  PROGRESS_PERIODS,
  CHART_COLORS,
  DATE_FORMATS,
  VALIDATION_RULES,
  STORAGE_KEYS,
  THEMES,
  LANGUAGES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  APP_CONFIG,
  FEATURE_FLAGS,
  NOTIFICATION_TYPES,
  MODAL_TYPES,
  LOADING_STATES,
  PAGINATION,
  RECIPE_FILTERS,
  DEFAULTS
};