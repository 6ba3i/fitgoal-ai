const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Profile validation
const profileValidation = [
  body('weight').optional().isFloat({ min: 20, max: 500 }),
  body('height').optional().isFloat({ min: 50, max: 300 }),
  body('age').optional().isInt({ min: 10, max: 120 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('activityLevel').optional().isIn(['sedentary', 'light', 'moderate', 'active', 'veryActive']),
  body('goal').optional().isIn(['lose', 'maintain', 'gain']),
  body('targetWeight').optional().isFloat({ min: 20, max: 500 }),
  body('targetDate').optional().isISO8601()
];

// Daily intake validation
const intakeValidation = [
  body('recipeId').notEmpty(),
  body('recipeName').notEmpty(),
  body('calories').isFloat({ min: 0 }),
  body('protein').isFloat({ min: 0 }),
  body('carbs').isFloat({ min: 0 }),
  body('fat').isFloat({ min: 0 })
];

// Routes
router.get('/profile', userController.getProfile);

router.put('/profile', 
  profileValidation,
  validationMiddleware.handleValidationErrors,
  userController.updateProfile
);

router.post('/calculate-macros', userController.calculateMacros);

router.get('/daily-intake', userController.getDailyIntake);

router.post('/daily-intake', 
  intakeValidation,
  validationMiddleware.handleValidationErrors,
  userController.addToDailyIntake
);

router.put('/daily-intake/:mealId', 
  intakeValidation,
  validationMiddleware.handleValidationErrors,
  userController.updateDailyIntake
);

router.delete('/daily-intake/:mealId', userController.removeFromDailyIntake);

router.post('/daily-intake/reset', userController.resetDailyIntake);

router.get('/intake-history', userController.getIntakeHistory);

router.get('/stats', userController.getUserStats);

router.put('/change-password',
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  validationMiddleware.handleValidationErrors,
  userController.changePassword
);

router.delete('/account', userController.deleteAccount);

module.exports = router;