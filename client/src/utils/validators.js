// Validation Functions for FitGoal AI Application

import { VALIDATION_RULES, USER_GOALS, ACTIVITY_LEVELS, GENDER_OPTIONS } from './constants';

// **Basic Validators**

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} Validation result
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Email is required' };
  }
  
  const trimmedEmail = email.trim();
  
  if (!trimmedEmail) {
    return { isValid: false, message: 'Email is required' };
  }
  
  if (!VALIDATION_RULES.EMAIL.test(trimmedEmail)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  if (trimmedEmail.length > 254) {
    return { isValid: false, message: 'Email is too long' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with strength info
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { 
      isValid: false, 
      message: 'Password is required',
      strength: 'none',
      requirements: getPasswordRequirements(password)
    };
  }
  
  const requirements = getPasswordRequirements(password);
  const metRequirements = Object.values(requirements).filter(Boolean).length;
  
  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      message: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`,
      strength: 'weak',
      requirements
    };
  }
  
  let strength = 'weak';
  if (metRequirements >= 5) strength = 'strong';
  else if (metRequirements >= 3) strength = 'medium';
  
  const isValid = metRequirements >= 3;
  const message = isValid ? '' : 'Password must meet at least 3 requirements';
  
  return { isValid, message, strength, requirements };
};

/**
 * Get password requirements status
 * @param {string} password - Password to check
 * @returns {object} Requirements status
 */
export const getPasswordRequirements = (password = '') => {
  return {
    length: password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noSpaces: !/\s/.test(password)
  };
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {object} Validation result
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, message: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate name (first name, last name, etc.)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {object} Validation result
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  if (trimmedName.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      message: `${fieldName} must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters long` 
    };
  }
  
  if (trimmedName.length > VALIDATION_RULES.NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      message: `${fieldName} must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters long` 
    };
  }
  
  if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
    return { 
      isValid: false, 
      message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` 
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} Validation result
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: true, message: '' }; // Phone is optional
  }
  
  if (typeof phone !== 'string') {
    return { isValid: false, message: 'Invalid phone number format' };
  }
  
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  if (!VALIDATION_RULES.PHONE.test(cleanPhone)) {
    return { isValid: false, message: 'Please enter a valid phone number' };
  }
  
  return { isValid: true, message: '' };
};

// **Profile Validators**

/**
 * Validate age
 * @param {number} age - Age to validate
 * @returns {object} Validation result
 */
export const validateAge = (age) => {
  if (age === null || age === undefined || age === '') {
    return { isValid: false, message: 'Age is required' };
  }
  
  const numAge = Number(age);
  
  if (isNaN(numAge) || !Number.isInteger(numAge)) {
    return { isValid: false, message: 'Age must be a whole number' };
  }
  
  if (numAge < VALIDATION_RULES.AGE_MIN) {
    return { isValid: false, message: `Age must be at least ${VALIDATION_RULES.AGE_MIN}` };
  }
  
  if (numAge > VALIDATION_RULES.AGE_MAX) {
    return { isValid: false, message: `Age must be less than ${VALIDATION_RULES.AGE_MAX}` };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate weight
 * @param {number} weight - Weight to validate (in kg)
 * @returns {object} Validation result
 */
export const validateWeight = (weight) => {
  if (weight === null || weight === undefined || weight === '') {
    return { isValid: false, message: 'Weight is required' };
  }
  
  const numWeight = Number(weight);
  
  if (isNaN(numWeight) || numWeight <= 0) {
    return { isValid: false, message: 'Weight must be a positive number' };
  }
  
  if (numWeight < VALIDATION_RULES.WEIGHT_MIN) {
    return { isValid: false, message: `Weight must be at least ${VALIDATION_RULES.WEIGHT_MIN} kg` };
  }
  
  if (numWeight > VALIDATION_RULES.WEIGHT_MAX) {
    return { isValid: false, message: `Weight must be less than ${VALIDATION_RULES.WEIGHT_MAX} kg` };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate height
 * @param {number} height - Height to validate (in cm)
 * @returns {object} Validation result
 */
export const validateHeight = (height) => {
  if (height === null || height === undefined || height === '') {
    return { isValid: false, message: 'Height is required' };
  }
  
  const numHeight = Number(height);
  
  if (isNaN(numHeight) || numHeight <= 0) {
    return { isValid: false, message: 'Height must be a positive number' };
  }
  
  if (numHeight < VALIDATION_RULES.HEIGHT_MIN) {
    return { isValid: false, message: `Height must be at least ${VALIDATION_RULES.HEIGHT_MIN} cm` };
  }
  
  if (numHeight > VALIDATION_RULES.HEIGHT_MAX) {
    return { isValid: false, message: `Height must be less than ${VALIDATION_RULES.HEIGHT_MAX} cm` };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate gender
 * @param {string} gender - Gender to validate
 * @returns {object} Validation result
 */
export const validateGender = (gender) => {
  if (!gender) {
    return { isValid: false, message: 'Gender is required' };
  }
  
  const validGenders = Object.values(GENDER_OPTIONS);
  
  if (!validGenders.includes(gender)) {
    return { isValid: false, message: 'Please select a valid gender option' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate activity level
 * @param {string} activityLevel - Activity level to validate
 * @returns {object} Validation result
 */
export const validateActivityLevel = (activityLevel) => {
  if (!activityLevel) {
    return { isValid: false, message: 'Activity level is required' };
  }
  
  const validLevels = Object.values(ACTIVITY_LEVELS);
  
  if (!validLevels.includes(activityLevel)) {
    return { isValid: false, message: 'Please select a valid activity level' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate goal
 * @param {string} goal - Goal to validate
 * @returns {object} Validation result
 */
export const validateGoal = (goal) => {
  if (!goal) {
    return { isValid: false, message: 'Goal is required' };
  }
  
  const validGoals = Object.values(USER_GOALS);
  
  if (!validGoals.includes(goal)) {
    return { isValid: false, message: 'Please select a valid goal' };
  }
  
  return { isValid: true, message: '' };
};

// **Form Validators**

/**
 * Validate entire user profile
 * @param {object} profile - Profile object to validate
 * @returns {object} Validation result with field-specific errors
 */
export const validateUserProfile = (profile) => {
  const errors = {};
  let isValid = true;
  
  // Validate required fields
  const nameValidation = validateName(profile.firstName, 'First name');
  if (!nameValidation.isValid) {
    errors.firstName = nameValidation.message;
    isValid = false;
  }
  
  const lastNameValidation = validateName(profile.lastName, 'Last name');
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.message;
    isValid = false;
  }
  
  const emailValidation = validateEmail(profile.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.message;
    isValid = false;
  }
  
  const ageValidation = validateAge(profile.age);
  if (!ageValidation.isValid) {
    errors.age = ageValidation.message;
    isValid = false;
  }
  
  const weightValidation = validateWeight(profile.weight);
  if (!weightValidation.isValid) {
    errors.weight = weightValidation.message;
    isValid = false;
  }
  
  const heightValidation = validateHeight(profile.height);
  if (!heightValidation.isValid) {
    errors.height = heightValidation.message;
    isValid = false;
  }
  
  const genderValidation = validateGender(profile.gender);
  if (!genderValidation.isValid) {
    errors.gender = genderValidation.message;
    isValid = false;
  }
  
  const activityValidation = validateActivityLevel(profile.activityLevel);
  if (!activityValidation.isValid) {
    errors.activityLevel = activityValidation.message;
    isValid = false;
  }
  
  const goalValidation = validateGoal(profile.goal);
  if (!goalValidation.isValid) {
    errors.goal = goalValidation.message;
    isValid = false;
  }
  
  // Validate optional phone
  if (profile.phone) {
    const phoneValidation = validatePhone(profile.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.message;
      isValid = false;
    }
  }
  
  return { isValid, errors };
};

/**
 * Validate registration form
 * @param {object} formData - Registration form data
 * @returns {object} Validation result
 */
export const validateRegistrationForm = (formData) => {
  const errors = {};
  let isValid = true;
  
  // Basic info validation
  const firstNameValidation = validateName(formData.firstName, 'First name');
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.message;
    isValid = false;
  }
  
  const lastNameValidation = validateName(formData.lastName, 'Last name');
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.message;
    isValid = false;
  }
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.message;
    isValid = false;
  }
  
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.message;
    isValid = false;
  }
  
  const confirmPasswordValidation = validatePasswordConfirmation(
    formData.password, 
    formData.confirmPassword
  );
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.message;
    isValid = false;
  }
  
  // Terms acceptance
  if (!formData.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions';
    isValid = false;
  }
  
  return { isValid, errors };
};

/**
 * Validate login form
 * @param {object} formData - Login form data
 * @returns {object} Validation result
 */
export const validateLoginForm = (formData) => {
  const errors = {};
  let isValid = true;
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.message;
    isValid = false;
  }
  
  if (!formData.password) {
    errors.password = 'Password is required';
    isValid = false;
  }
  
  return { isValid, errors };
};

/**
 * Validate goal form
 * @param {object} goalData - Goal form data
 * @returns {object} Validation result
 */
export const validateGoalForm = (goalData) => {
  const errors = {};
  let isValid = true;
  
  if (!goalData.title || !goalData.title.trim()) {
    errors.title = 'Goal title is required';
    isValid = false;
  } else if (goalData.title.trim().length < 3) {
    errors.title = 'Goal title must be at least 3 characters long';
    isValid = false;
  } else if (goalData.title.trim().length > 100) {
    errors.title = 'Goal title must be less than 100 characters long';
    isValid = false;
  }
  
  if (!goalData.targetValue || goalData.targetValue <= 0) {
    errors.targetValue = 'Target value must be a positive number';
    isValid = false;
  }
  
  if (!goalData.targetDate) {
    errors.targetDate = 'Target date is required';
    isValid = false;
  } else {
    const targetDate = new Date(goalData.targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate <= today) {
      errors.targetDate = 'Target date must be in the future';
      isValid = false;
    }
  }
  
  if (!goalData.category || !goalData.category.trim()) {
    errors.category = 'Goal category is required';
    isValid = false;
  }
  
  return { isValid, errors };
};

/**
 * Validate progress entry
 * @param {object} progressData - Progress entry data
 * @returns {object} Validation result
 */
export const validateProgressEntry = (progressData) => {
  const errors = {};
  let isValid = true;
  
  if (!progressData.value || progressData.value <= 0) {
    errors.value = 'Progress value must be a positive number';
    isValid = false;
  }
  
  if (!progressData.date) {
    errors.date = 'Progress date is required';
    isValid = false;
  } else {
    const progressDate = new Date(progressData.date);
    const today = new Date();
    
    if (progressDate > today) {
      errors.date = 'Progress date cannot be in the future';
      isValid = false;
    }
  }
  
  if (!progressData.type || !progressData.type.trim()) {
    errors.type = 'Progress type is required';
    isValid = false;
  }
  
  return { isValid, errors };
};

// **Utility Validators**

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {object} Validation result
 */
export const validateURL = (url) => {
  if (!url) {
    return { isValid: true, message: '' }; // URL is optional
  }
  
  try {
    new URL(url);
    return { isValid: true, message: '' };
  } catch {
    return { isValid: false, message: 'Please enter a valid URL' };
  }
};

/**
 * Validate date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {object} Validation result
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { isValid: false, message: 'Both start and end dates are required' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: 'Please enter valid dates' };
  }
  
  if (start >= end) {
    return { isValid: false, message: 'End date must be after start date' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {object} Validation result
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (value === null || value === undefined || value === '' || 
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && Object.keys(value).length === 0)) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  if (typeof value === 'string' && !value.trim()) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate form with multiple fields
 * @param {object} formData - Form data object
 * @param {object} validationRules - Validation rules object
 * @returns {object} Validation result
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  for (const [field, rules] of Object.entries(validationRules)) {
    const value = formData[field];
    
    for (const rule of rules) {
      const validation = rule.validator(value, rule.params);
      
      if (!validation.isValid) {
        errors[field] = validation.message;
        isValid = false;
        break; // Stop at first error for this field
      }
    }
  }
  
  return { isValid, errors };
};

export default {
  validateEmail,
  validatePassword,
  getPasswordRequirements,
  validatePasswordConfirmation,
  validateName,
  validatePhone,
  validateAge,
  validateWeight,
  validateHeight,
  validateGender,
  validateActivityLevel,
  validateGoal,
  validateUserProfile,
  validateRegistrationForm,
  validateLoginForm,
  validateGoalForm,
  validateProgressEntry,
  validateURL,
  validateDateRange,
  validateRequired,
  validateForm
};