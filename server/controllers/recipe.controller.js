const SpoonacularService = require('../services/spoonacular.service');
const KMeansService = require('../services/ai/kMeans');
const Recipe = require('../models/Recipe');
const User = require('../models/User');

class RecipeController {
  async searchRecipes(req, res) {
    try {
      const { query, diet, intolerances, minCalories, maxCalories } = req.query;
      const userId = req.user.id;

      // Get user profile for personalized recommendations
      const user = await User.findById(userId);
      const userProfile = user.profile;

      // Fetch recipes from Spoonacular
      const recipes = await SpoonacularService.searchRecipes(query, {
        diet,
        intolerances,
        minCalories: minCalories || (userProfile.dailyCalories / 3 - 200),
        maxCalories: maxCalories || (userProfile.dailyCalories / 3 + 200),
        number: 20
      });

      // Apply K-means clustering for personalized recommendations
      const clusteredRecipes = KMeansService.clusterRecipes(recipes, userProfile);

      res.json({
        success: true,
        data: clusteredRecipes,
        recommendations: {
          targetCalories: userProfile.dailyCalories / 3,
          targetProtein: userProfile.dailyProtein / 3,
          targetCarbs: userProfile.dailyCarbs / 3,
          targetFat: userProfile.dailyFat / 3
        }
      });
    } catch (error) {
      console.error('Recipe search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search recipes',
        error: error.message
      });
    }
  }

  async getRecipeDetails(req, res) {
    try {
      const { recipeId } = req.params;

      // Check if recipe exists in database
      let recipe = await Recipe.findOne({ spoonacularId: recipeId });

      if (!recipe) {
        // Fetch from Spoonacular API
        const recipeData = await SpoonacularService.getRecipeDetails(recipeId);
        
        // Save to database for caching
        recipe = new Recipe({
          spoonacularId: recipeId,
          title: recipeData.title,
          image: recipeData.image,
          nutrition: {
            calories: recipeData.nutrition.nutrients.find(n => n.name === 'Calories')?.amount,
            protein: recipeData.nutrition.nutrients.find(n => n.name === 'Protein')?.amount,
            carbs: recipeData.nutrition.nutrients.find(n => n.name === 'Carbohydrates')?.amount,
            fat: recipeData.nutrition.nutrients.find(n => n.name === 'Fat')?.amount
          },
          ingredients: recipeData.extendedIngredients,
          instructions: recipeData.instructions,
          readyInMinutes: recipeData.readyInMinutes,
          servings: recipeData.servings
        });
        
        await recipe.save();
      }

      res.json({
        success: true,
        data: recipe
      });
    } catch (error) {
      console.error('Recipe details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recipe details',
        error: error.message
      });
    }
  }

  async addToFavorites(req, res) {
    try {
      const { recipeId } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);
      
      if (!user.favoriteRecipes.includes(recipeId)) {
        user.favoriteRecipes.push(recipeId);
        await user.save();
      }

      res.json({
        success: true,
        message: 'Recipe added to favorites'
      });
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add recipe to favorites',
        error: error.message
      });
    }
  }

  async removeFromFavorites(req, res) {
    try {
      const { recipeId } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);
      user.favoriteRecipes = user.favoriteRecipes.filter(id => id !== recipeId);
      await user.save();

      res.json({
        success: true,
        message: 'Recipe removed from favorites'
      });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove recipe from favorites',
        error: error.message
      });
    }
  }

  async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).populate('favoriteRecipes');

      res.json({
        success: true,
        data: user.favoriteRecipes
      });
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get favorite recipes',
        error: error.message
      });
    }
  }

  async generateMealPlan(req, res) {
    try {
      const userId = req.user.id;
      const { diet, exclude } = req.body;

      const user = await User.findById(userId);
      const targetCalories = user.profile.dailyCalories;

      const mealPlan = await SpoonacularService.getMealPlan(
        targetCalories,
        diet,
        exclude
      );

      res.json({
        success: true,
        data: mealPlan
      });
    } catch (error) {
      console.error('Meal plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate meal plan',
        error: error.message
      });
    }
  }
}

module.exports = new RecipeController();