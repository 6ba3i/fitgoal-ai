const SpoonacularService = require('../services/spoonacular.service');
const KMeansService = require('../services/ai/kMeans');
const firebaseService = require('../services/firebase.service');

class RecipeController {
  async searchRecipes(req, res) {
    try {
      const { query, diet, intolerances, minCalories, maxCalories } = req.query;
      const userId = req.user?.id;

      let userProfile = null;
      if (userId) {
        // Get user profile for personalized recommendations
        userProfile = await firebaseService.getFromFirestore('users', userId);
      }

      const defaultCalories = userProfile?.profile?.dailyCalories || 2000;

      // Fetch recipes from Spoonacular
      const recipes = await SpoonacularService.searchRecipes(query, {
        diet,
        intolerances,
        minCalories: minCalories || (defaultCalories / 3 - 200),
        maxCalories: maxCalories || (defaultCalories / 3 + 200),
        number: 20
      });

      // Apply K-means clustering for personalized recommendations if user is logged in
      let clusteredRecipes = recipes;
      if (userProfile?.profile) {
        clusteredRecipes = KMeansService.clusterRecipes(recipes, userProfile.profile);
      }

      res.json({
        success: true,
        data: clusteredRecipes,
        recommendations: userProfile?.profile ? {
          targetCalories: userProfile.profile.dailyCalories / 3,
          targetProtein: userProfile.profile.dailyProtein / 3,
          targetCarbs: userProfile.profile.dailyCarbs / 3,
          targetFat: userProfile.profile.dailyFat / 3
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

      // Check if recipe exists in Firestore cache
      let recipe = await firebaseService.getFromFirestore('recipes', recipeId);

      if (!recipe) {
        // Fetch from Spoonacular and cache in Firestore
        recipe = await SpoonacularService.getRecipeDetails(recipeId);
        
        if (recipe) {
          // Cache in Firestore with spoonacularId as document ID
          await firebaseService.storeInFirestore('recipes', recipeId, {
            ...recipe,
            spoonacularId: recipeId,
            cachedAt: new Date()
          });
        }
      }

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      res.json({
        success: true,
        data: recipe
      });
    } catch (error) {
      console.error('Get recipe details error:', error);
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

      // Get recipe details
      const recipe = await SpoonacularService.getRecipeDetails(recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // Add to favorites using Firebase service
      await firebaseService.storeFavoriteRecipe(userId, {
        id: recipeId,
        ...recipe
      });

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

      await firebaseService.removeFavoriteRecipe(userId, recipeId);

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
      
      const favoriteRecipes = await firebaseService.getFavoriteRecipes(userId);

      res.json({
        success: true,
        data: favoriteRecipes
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

      // Get user profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const targetCalories = userProfile.profile.dailyCalories;

      const mealPlan = await SpoonacularService.getMealPlan(
        targetCalories,
        diet,
        exclude
      );

      // Cache meal plan in Firestore
      await firebaseService.storeInFirestore('mealPlans', `${userId}_${Date.now()}`, {
        userId,
        mealPlan,
        diet,
        targetCalories,
        createdAt: new Date()
      });

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

      // You can either use Spoonacular or implement your own nutrition analysis
      const nutrition = await SpoonacularService.analyzeNutrition(ingredients);

      res.json({
        success: true,
        data: nutrition
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

      const customRecipe = {
        ...recipeData,
        userCreated: true,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ratings: [],
        averageRating: 0
      };

      // Store in Firestore
      const docId = `custom_${userId}_${Date.now()}`;
      await firebaseService.storeInFirestore('recipes', docId, customRecipe);

      res.status(201).json({
        success: true,
        message: 'Custom recipe created successfully',
        data: { id: docId, ...customRecipe }
      });
    } catch (error) {
      console.error('Create custom recipe error:', error);
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

      // Get existing recipe
      const recipe = await firebaseService.getFromFirestore('recipes', recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // Check if user owns this recipe
      if (!recipe.userCreated || recipe.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own recipes'
        });
      }

      const updatedRecipe = {
        ...recipe,
        ...updates,
        updatedAt: new Date()
      };

      await firebaseService.storeInFirestore('recipes', recipeId, updatedRecipe);

      res.json({
        success: true,
        message: 'Recipe updated successfully',
        data: updatedRecipe
      });
    } catch (error) {
      console.error('Update custom recipe error:', error);
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

      // Get existing recipe
      const recipe = await firebaseService.getFromFirestore('recipes', recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // Check if user owns this recipe
      if (!recipe.userCreated || recipe.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own recipes'
        });
      }

      await firebaseService.deleteFromFirestore('recipes', recipeId);

      res.json({
        success: true,
        message: 'Recipe deleted successfully'
      });
    } catch (error) {
      console.error('Delete custom recipe error:', error);
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

      // Get recipe
      const recipe = await firebaseService.getFromFirestore('recipes', recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // Add or update rating
      const ratings = recipe.ratings || [];
      const existingRatingIndex = ratings.findIndex(r => r.userId === userId);

      const newRating = {
        userId,
        rating,
        review: review || '',
        date: new Date()
      };

      if (existingRatingIndex !== -1) {
        ratings[existingRatingIndex] = newRating;
      } else {
        ratings.push(newRating);
      }

      // Calculate average rating
      const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      const updatedRecipe = {
        ...recipe,
        ratings,
        averageRating: Math.round(averageRating * 10) / 10,
        updatedAt: new Date()
      };

      await firebaseService.storeInFirestore('recipes', recipeId, updatedRecipe);

      res.json({
        success: true,
        message: 'Recipe rated successfully',
        data: {
          rating: newRating,
          averageRating: updatedRecipe.averageRating
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

      // Get user profile and favorites
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const favoriteRecipes = await firebaseService.getFavoriteRecipes(userId);

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Get recommendations based on user preferences and favorites
      const recommendations = await SpoonacularService.getPersonalizedRecommendations(
        userProfile.profile,
        favoriteRecipes
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Personalized recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personalized recommendations',
        error: error.message
      });
    }
  }
}

module.exports = new RecipeController();