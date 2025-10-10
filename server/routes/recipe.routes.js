const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const recipeController = require('../controllers/recipe.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(authMiddleware.authenticate);

// Search recipes (requires auth for personalization)
router.get('/search', 
  query('query').optional().trim(),
  query('diet').optional().isIn(['gluten free', 'ketogenic', 'vegetarian', 'vegan', 'pescetarian', 'paleo']),
  query('minCalories').optional().isInt({ min: 0 }),
  query('maxCalories').optional().isInt({ min: 0 }),
  query('number').optional().isInt({ min: 1, max: 100 }),
  validationMiddleware.handleValidationErrors,
  recipeController.searchRecipes
);

// Get personalized recommendations
router.get('/recommendations/personalized', recipeController.getPersonalizedRecommendations);

// Get recipe details by ID
router.get('/:recipeId', recipeController.getRecipeDetails);

// Favorites management
router.post('/favorites/:recipeId', recipeController.addToFavorites);

router.delete('/favorites/:recipeId', recipeController.removeFromFavorites);

router.get('/user/favorites', recipeController.getFavorites);

// Meal planning
router.post('/meal-plan',
  body('diet').optional().isIn(['gluten free', 'ketogenic', 'vegetarian', 'vegan', 'pescetarian', 'paleo']),
  body('exclude').optional().isArray(),
  validationMiddleware.handleValidationErrors,
  recipeController.generateMealPlan
);

// Nutrition analysis
router.post('/analyze',
  body('ingredients').isArray().notEmpty(),
  validationMiddleware.handleValidationErrors,
  recipeController.analyzeNutrition
);

// Custom recipes CRUD
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

// Recipe rating
router.post('/:recipeId/rate',
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().trim(),
  validationMiddleware.handleValidationErrors,
  recipeController.rateRecipe
);

module.exports = router;