const spoonacularService = require('../services/spoonacular.service');
const firebaseService = require('../services/firebase.service');

exports.searchRecipes = async (req, res) => {
  try {
    const { query, diet, minCalories, maxCalories, number } = req.query;
    const filters = {
      diet,
      minCalories: minCalories ? parseInt(minCalories) : undefined,
      maxCalories: maxCalories ? parseInt(maxCalories) : undefined,
      number: number ? parseInt(number) : 10
    };

    const results = await spoonacularService.searchRecipes(query, filters);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRecipeDetails = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const result = await spoonacularService.getRecipeDetails(recipeId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = await firebaseService.getFromFirestore('users', userId);
    const results = await spoonacularService.getPersonalizedRecommendations(userProfile?.profile);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addToFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipeId } = req.params;
    await firebaseService.addFavoriteRecipe(userId, recipeId);
    res.json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipeId } = req.params;
    await firebaseService.removeFavoriteRecipe(userId, recipeId);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await firebaseService.getFavoriteRecipes(userId);
    res.json({ success: true, data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.generateMealPlan = async (req, res) => {
  try {
    const { diet, exclude } = req.body;
    const userId = req.user.id;
    const userProfile = await firebaseService.getFromFirestore('users', userId);
    const targetCalories = userProfile?.profile?.dailyCalories || 2000;
    const result = await spoonacularService.getMealPlan(targetCalories, diet, exclude);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.analyzeNutrition = async (req, res) => {
  try {
    const { ingredients } = req.body;
    const result = await spoonacularService.analyzeRecipeNutrition(ingredients);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createCustomRecipe = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

exports.updateCustomRecipe = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

exports.deleteCustomRecipe = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

exports.rateRecipe = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};