const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const progressController = require('../controllers/progress.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Validation
const progressValidation = [
  body('weight').isFloat({ min: 20, max: 500 }),
  body('bodyFat').optional().isFloat({ min: 1, max: 80 }),
  body('muscleMass').optional().isFloat({ min: 10, max: 200 }),
  body('measurements').optional().isObject(),
  body('mood').optional().isIn(['excellent', 'good', 'neutral', 'tired', 'exhausted']),
  body('energyLevel').optional().isInt({ min: 1, max: 10 }),
  body('workoutCompleted').optional().isBoolean(),
  body('dailySteps').optional().isInt({ min: 0 }),
  body('waterIntake').optional().isInt({ min: 0 }),
  body('sleepHours').optional().isFloat({ min: 0, max: 24 }),
  body('notes').optional().trim()
];

// Routes
router.get('/', 
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validationMiddleware.handleValidationErrors,
  progressController.getProgress
);

router.post('/', 
  progressValidation,
  validationMiddleware.handleValidationErrors,
  progressController.addProgress
);

router.get('/latest', progressController.getLatestProgress);

router.get('/:progressId', progressController.getProgressById);

router.put('/:progressId', 
  progressValidation,
  validationMiddleware.handleValidationErrors,
  progressController.updateProgress
);

router.delete('/:progressId', progressController.deleteProgress);

router.get('/stats/summary', progressController.getProgressSummary);

router.get('/stats/trends', progressController.getProgressTrends);

router.post('/import',
  body('data').isArray().notEmpty(),
  validationMiddleware.handleValidationErrors,
  progressController.importProgress
);

router.get('/export/csv', progressController.exportProgressCSV);

router.post('/photos/:progressId',
  body('photos').isArray(),
  validationMiddleware.handleValidationErrors,
  progressController.uploadProgressPhotos
);

module.exports = router;