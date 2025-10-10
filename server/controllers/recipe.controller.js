const SpoonacularService = require('../services/spoonacular.service');
const KMeansService = require('../services/ai/kMeans');

// REMOVED: MongoDB models
// const Recipe = require('../models/Recipe');
// const User = require('../models/User');

class RecipeController {
  async searchRecipes(req, res) {
    try {
      const { query, diet, intolerances, minCalories, maxCalories } = req.query;
      const userId = req.user.id;

      console.log('\n🎯 === RECIPE SEARCH REQUEST ===');
      console.log(`👤 User ID: ${userId}`);
      console.log(`🔍 Query: "${query || 'none'}"`);
      console.log(`🥗 Diet: ${diet || 'none'}`);
      console.log(`🚫 Intolerances: ${intolerances || 'none'}`);
      console.log(`📊 Calorie range: ${minCalories || 'auto'} - ${maxCalories || 'auto'}`);

      // Default user profile (you can get this from Firebase later)
      const userProfile = {
        dailyCalories: 2000,
        dailyProtein: 150,
        dailyCarbs: 250,
        dailyFat: 65,
        goal: 'maintain'
      };

      console.log(`👤 Using default profile`);
      console.log(`   Daily calories: ${userProfile.dailyCalories}`);
      console.log(`   Goal: ${userProfile.goal}`);

      // Calculate calorie range if not provided
      const targetCaloriesPerMeal = userProfile.dailyCalories / 3;
      const finalMinCalories = minCalories || Math.max(0, targetCaloriesPerMeal - 200);
      const finalMaxCalories = maxCalories || (targetCaloriesPerMeal + 200);

      console.log(`🎯 Calculated calorie range: ${finalMinCalories} - ${finalMaxCalories}`);

      // Fetch recipes from Spoonacular
      console.log('📡 Calling Spoonacular API...');
      const recipes = await SpoonacularService.searchRecipes(query, {
        diet,
        intolerances,
        minCalories: finalMinCalories,
        maxCalories: finalMaxCalories,
        number: 20
      });

      console.log(`✅ Received ${recipes.length} recipes from Spoonacular`);

      // Check if recipes were returned
      if (!recipes || recipes.length === 0) {
        console.log('⚠️  No recipes found');
        return res.json({
          success: true,
          data: [],
          message: 'No recipes found matching your criteria. Try adjusting your search.'
        });
      }

      // Apply K-means clustering for personalized recommendations
      console.log('🤖 Applying AI clustering...');
      let clusteredRecipes;
      try {
        clusteredRecipes = KMeansService.clusterRecipes(recipes, userProfile);
        console.log(`✅ Recipes clustered into ${clusteredRecipes.length} groups`);
      } catch (clusterError) {
        console.error('⚠️  Clustering failed, returning raw recipes:', clusterError.message);
        // If clustering fails, return raw recipes
        clusteredRecipes = [{
          recipes: recipes,
          score: 100,
          recommendation: 'Recipes matching your search'
        }];
      }

      console.log('================================\n');

      res.json({
        success: true,
        data: clusteredRecipes,
        totalResults: recipes.length,
        recommendations: {
          targetCalories: Math.round(targetCaloriesPerMeal),
          targetProtein: Math.round(userProfile.dailyProtein / 3),
          targetCarbs: Math.round(userProfile.dailyCarbs / 3),
          targetFat: Math.round(userProfile.dailyFat / 3)
        }
      });

    } catch (error) {
      console.error('\n❌ === RECIPE SEARCH ERROR ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('================================\n');
      
      res.status(500).json({
        success: false,
        message: 'Failed to search recipes',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getRecipeDetails(req, res) {
    try {
      const { recipeId } = req.params;
      console.log(`\n🔍 Fetching details for recipe ID: ${recipeId}`);

      // Fetch directly from Spoonacular (no caching)
      const recipeData = await SpoonacularService.getRecipeDetails(recipeId);
      
      console.log('✅ Recipe details retrieved from Spoonacular');

      res.json({
        success: true,
        data: recipeData
      });
    } catch (error) {
      console.error('❌ Recipe details error:', error.message);
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

      console.log(`✅ Recipe ${recipeId} marked as favorite for user ${userId}`);
      
      // TODO: Store in Firebase Firestore instead
      // For now, just return success
      
      res.json({
        success: true,
        message: 'Recipe added to favorites (stored in Firebase)'
      });
    } catch (error) {
      console.error('❌ Add favorite error:', error.message);
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

      console.log(`✅ Recipe ${recipeId} removed from favorites`);
      
      // TODO: Remove from Firebase Firestore
      
      res.json({
        success: true,
        message: 'Recipe removed from favorites'
      });
    } catch (error) {
      console.error('❌ Remove favorite error:', error.message);
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
      
      // TODO: Get from Firebase Firestore
      console.log(`📋 Getting favorites for user ${userId}`);

      res.json({
        success: true,
        data: [] // Empty for now, implement with Firebase Firestore
      });
    } catch (error) {
      console.error('❌ Get favorites error:', error.message);
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

      console.log(`\n🍽️  Generating meal plan for user ${userId}`);

      // Default calories (get from Firebase user profile later)
      const targetCalories = 2000;

      const mealPlan = await SpoonacularService.getMealPlan(
        targetCalories,
        diet,
        exclude
      );

      console.log('✅ Meal plan generated');

      res.json({
        success: true,
        data: mealPlan
      });
    } catch (error) {
      console.error('❌ Meal plan error:', error.message);
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

      console.log(`📝 Creating custom recipe for user ${userId}`);
      
      // TODO: Store in Firebase Firestore
      
      res.json({
        success: true,
        message: 'Custom recipe created (store in Firebase)',
        data: recipeData
      });
    } catch (error) {
      console.error('Create recipe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create recipe',
        error: error.message
      });
    }
  }

  async updateCustomRecipe(req, res) {
    try {
      const { recipeId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      console.log(`📝 Updating recipe ${recipeId}`);
      
      // TODO: Update in Firebase Firestore

      res.json({
        success: true,
        message: 'Recipe updated',
        data: updates
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

      console.log(`🗑️  Deleting recipe ${recipeId}`);
      
      // TODO: Delete from Firebase Firestore

      res.json({
        success: true,
        message: 'Recipe deleted'
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
      const userId = req.user.id;
      const { rating, review } = req.body;

      console.log(`⭐ Rating recipe ${recipeId}: ${rating} stars`);
      
      // TODO: Store rating in Firebase Firestore

      res.json({
        success: true,
        message: 'Rating submitted',
        data: { rating, review }
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
      console.log(`\n🎯 Fetching recommendations for user ${userId}`);

      // Default profile
      const userProfile = {
        dailyCalories: 2000,
        diet: null
      };

      // Get random recipes
      const recipes = await SpoonacularService.searchRecipes('', {
        diet: userProfile.diet,
        number: 12,
        sort: 'random',
        minCalories: (userProfile.dailyCalories / 3) - 200,
        maxCalories: (userProfile.dailyCalories / 3) + 200
      });

      console.log(`✅ Retrieved ${recipes.length} recommendation recipes`);

      res.json({
        success: true,
        data: recipes
      });
    } catch (error) {
      console.error('❌ Recommendations error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations',
        error: error.message
      });
    }
  }
}

module.exports = new RecipeController();