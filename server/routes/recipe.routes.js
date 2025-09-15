const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const recipeController = require('../controllers/recipe.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// Public routes (no auth required)
router.get('/search', 
  query('query').optional().trim(),
  query('diet').optional().isIn(['gluten free', 'ketogenic', 'vegetarian', 'vegan', 'pescetarian', 'paleo']),
  query('minCalories').optional().isInt({ min: 0 }),
  query('maxCalories').optional().isInt({ min: 0 }),
  query('number').optional().isInt({ min: 1, max: 100 }),
  validationMiddleware.handleValidationErrors,
  recipeController.searchRecipes
);

router.get('/:recipeId', recipeController.getRecipeDetails);

// Protected routes (auth required)
router.use(authMiddleware.authenticate);

router.post('/favorites/:recipeId', recipeController.addToFavorites);

router.delete('/favorites/:recipeId', recipeController.removeFromFavorites);

router.get('/user/favorites', recipeController.getFavorites);

router.post('/meal-plan',
  body('diet').optional().isIn(['gluten free', 'ketogenic', 'vegetarian', 'vegan', 'pescetarian', 'paleo']),
  body('exclude').optional().isArray(),
  validationMiddleware.handleValidationErrors,
  recipeController.generateMealPlan
);

router.post('/analyze',
  body('ingredients').isArray().notEmpty(),
  validationMiddleware.handleValidationErrors,
  recipeController.analyzeNutrition
);

router.post('/create',
  body('title').notEmpty().trim(),
  body('servings').isInt({ min: 1 }),
  body('readyInMinutes').isInt({ min: 1 }),
  body('ingredients').isArray().notEmpty(),
  body('instructions').isArray().notEmpty(),
  body('nutrition.calories').isFloat({ min: 0 }),
  body('nutrition.protein').isFloat({ min: 0 }),
  body('nutrition.carbs').isFloat({ min: 0 }),
  body('nutrition.fat').isFloat({ min: 0 }),
  validationMiddleware.handleValidationErrors,
  recipeController.createCustomRecipe
);

router.put('/:recipeId',
  body('title').optional().trim(),
  body('servings').optional().isInt({ min: 1 }),
  body('readyInMinutes').optional().isInt({ min: 1 }),
  validationMiddleware.handleValidationErrors,
  recipeController.updateCustomRecipe
);

router.delete('/:recipeId', recipeController.deleteCustomRecipe);

router.post('/:recipeId/rate',
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().trim(),
  validationMiddleware.handleValidationErrors,
  recipeController.rateRecipe
);

router.get('/recommendations/personalized', recipeController.getPersonalizedRecommendations);

module.exports = router;