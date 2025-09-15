const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('displayName').notEmpty().trim(),
  body('weight').optional().isFloat({ min: 20, max: 500 }),
  body('height').optional().isFloat({ min: 50, max: 300 }),
  body('age').optional().isInt({ min: 10, max: 120 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('activityLevel').optional().isIn(['sedentary', 'light', 'moderate', 'active', 'veryActive']),
  body('goal').optional().isIn(['lose', 'maintain', 'gain'])
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.post('/register', 
  registerValidation, 
  validationMiddleware.handleValidationErrors,
  authController.register
);

router.post('/login', 
  loginValidation,
  validationMiddleware.handleValidationErrors,
  authController.login
);

router.post('/google', authController.googleAuth);

router.post('/firebase', authController.firebaseAuth);

router.post('/refresh-token', authController.refreshToken);

router.post('/logout', 
  authMiddleware.authenticate, 
  authController.logout
);

router.post('/forgot-password', 
  body('email').isEmail().normalizeEmail(),
  validationMiddleware.handleValidationErrors,
  authController.forgotPassword
);

router.post('/reset-password', 
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
  validationMiddleware.handleValidationErrors,
  authController.resetPassword
);

router.get('/verify-token', 
  authMiddleware.authenticate, 
  authController.verifyToken
);

router.get('/me', 
  authMiddleware.authenticate, 
  authController.getCurrentUser
);

module.exports = router;