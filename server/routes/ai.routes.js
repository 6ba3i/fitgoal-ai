const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Routes
router.post('/predict-weight',
  body('daysAhead').optional().isInt({ min: 1, max: 365 }),
  validationMiddleware.handleValidationErrors,
  aiController.predictWeight
);

router.post('/recommend-calories', aiController.recommendCalories);

router.post('/cluster-recipes',
  body('recipes').isArray().notEmpty(),
  body('k').optional().isInt({ min: 2, max: 10 }),
  validationMiddleware.handleValidationErrors,
  aiController.clusterRecipes
);

router.post('/analyze-progress', aiController.analyzeProgress);

router.post('/generate-meal-plan', 
  body('days').optional().isInt({ min: 1, max: 30 }),
  validationMiddleware.handleValidationErrors,
  aiController.generateMealPlan
);

router.post('/optimize-macros', aiController.optimizeMacros);

router.get('/insights', aiController.getInsights);

router.post('/adjust-goals', aiController.adjustGoals);

router.post('/workout-recommendations', aiController.getWorkoutRecommendations);

router.post('/plateau-detection', aiController.detectPlateau);

module.exports = router;