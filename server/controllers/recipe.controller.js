const SpoonacularService = require('../services/spoonacular.service');
const KMeansService = require('../services/ai/kMeans');
const Recipe = require('../models/Recipe');
const User = require('../models/User');

class RecipeController {
  async searchRecipes(req, res) {
    try {
      const { query, diet, intolerances, minCalories, maxCalories } = req.query;
      const userId = req.user?.id;

      // If user is authenticated, get their profile
      let userProfile = null;
      if (userId) {
        const user = await User.findById(userId);
        userProfile = user.profile;
      }

      // Fetch recipes from Spoonacular
      const recipes = await SpoonacularService.searchRecipes(query, {
        diet,
        intolerances,
        minCalories: minCalories || (userProfile?.dailyCalories / 3 - 200) || 400,
        maxCalories: maxCalories || (userProfile?.dailyCalories / 3 + 200) || 800,
        number: 20
      });

      // Apply K-means clustering if user is authenticated
      const clusteredRecipes = userProfile 
        ? KMeansService.clusterRecipes(recipes, userProfile)
        : recipes;

      res.json({
        success: true,
        data: clusteredRecipes,
        recommendations: userProfile ? {
          targetCalories: userProfile.dailyCalories / 3,
          targetProtein: userProfile.dailyProtein / 3,
          targetCarbs: userProfile.dailyCarbs / 3,
          targetFat: userProfile.dailyFat / 3
        } : null
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
            calories: recipeData.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0,
            protein: recipeData.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 0,
            carbs: recipeData.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 0,
            fat: recipeData.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount || 0
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
        data: user.favoriteRecipes || []
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

  async analyzeNutrition(req, res) {
    try {
      const { ingredients } = req.body;

      const nutritionData = await SpoonacularService.analyzeRecipeNutrition(ingredients);

      res.json({
        success: true,
        data: nutritionData
      });
    } catch (error) {
      console.error('Nutrition analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze nutrition',
        error: error.message
      });
    }
  }

  async createCustomRecipe(req, res) {
    try {
      const userId = req.user.id;
      const recipeData = req.body;

      const recipe = new Recipe({
        ...recipeData,
        createdBy: userId,
        isCustom: true
      });

      await recipe.save();

      res.status(201).json({
        success: true,
        message: 'Custom recipe created successfully',
        data: recipe
      });
    } catch (error) {
      console.error('Create recipe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create custom recipe',
        error: error.message
      });
    }
  }

  async updateCustomRecipe(req, res) {
    try {
      const { recipeId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const recipe = await Recipe.findOne({ 
        _id: recipeId, 
        createdBy: userId,
        isCustom: true 
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found or you do not have permission to edit it'
        });
      }

      Object.assign(recipe, updates);
      await recipe.save();

      res.json({
        success: true,
        message: 'Recipe updated successfully',
        data: recipe
      });
    } catch (error) {
      console.error('Update recipe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update recipe',
        error: error.message
      });
    }
  }

  async deleteCustomRecipe(req, res) {
    try {
      const { recipeId } = req.params;
      const userId = req.user.id;

      const recipe = await Recipe.findOneAndDelete({ 
        _id: recipeId, 
        createdBy: userId,
        isCustom: true 
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found or you do not have permission to delete it'
        });
      }

      res.json({
        success: true,
        message: 'Recipe deleted successfully'
      });
    } catch (error) {
      console.error('Delete recipe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete recipe',
        error: error.message
      });
    }
  }

  async rateRecipe(req, res) {
    try {
      const { recipeId } = req.params;
      const { rating, review } = req.body;
      const userId = req.user.id;

      const recipe = await Recipe.findById(recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // Remove existing rating from this user
      recipe.ratings = recipe.ratings.filter(r => r.userId.toString() !== userId);
      
      // Add new rating
      recipe.ratings.push({
        userId,
        rating,
        review,
        date: new Date()
      });

      // Calculate average rating
      const avgRating = recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length;
      recipe.averageRating = avgRating;

      await recipe.save();

      res.json({
        success: true,
        message: 'Recipe rated successfully',
        data: {
          averageRating: avgRating,
          totalRatings: recipe.ratings.length
        }
      });
    } catch (error) {
      console.error('Rate recipe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rate recipe',
        error: error.message
      });
    }
  }

  async getPersonalizedRecommendations(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile and preferences
      const user = await User.findById(userId).populate('favoriteRecipes');
      const userProfile = user.profile;

      // Get recipes based on user's dietary preferences and goals
      const recommendations = await SpoonacularService.searchRecipes('', {
        diet: userProfile.dietaryRestrictions,
        minCalories: userProfile.dailyCalories / 3 - 200,
        maxCalories: userProfile.dailyCalories / 3 + 200,
        number: 10
      });

      // Apply AI clustering for better recommendations
      const clusteredRecommendations = KMeansService.clusterRecipes(
        recommendations, 
        userProfile
      );

      res.json({
        success: true,
        data: clusteredRecommendations,
        meta: {
          basedOn: 'Your dietary preferences and nutritional goals',
          targetCalories: userProfile.dailyCalories / 3,
          targetProtein: userProfile.dailyProtein / 3,
          targetCarbs: userProfile.dailyCarbs / 3,
          targetFat: userProfile.dailyFat / 3
        }
      });
    } catch (error) {
      console.error('Recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personalized recommendations',
        error: error.message
      });
    }
  }
}

module.exports = new RecipeController();