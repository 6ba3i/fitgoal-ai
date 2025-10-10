// CLIENT-SIDE SERVICE - Uses ES6 Modules
import axios from 'axios';

class SpoonacularService {
  constructor() {
    // Try multiple environment variable formats for Create React App
    this.apiKey = process.env.SPOONACULAR_API_KEY || 'cf7241a750fe494281d3be34766bea6b';
    this.baseURL = 'https://api.spoonacular.com';
    
    // Log configuration on startup
    console.log('🔧 CLIENT Spoonacular Service Initialized');
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   API Key: ${this.apiKey ? '✓ Set' : '✗ Missing'}`);
    
    if (!process.env.REACT_APP_SPOONACULAR_API_KEY) {
      console.warn('⚠️  WARNING: Using hardcoded API key (environment variable not found)');
      console.warn('   For production, create a .env file in client/ folder with:');
      console.warn('   REACT_APP_SPOONACULAR_API_KEY=your_api_key_here');
    }
  }

  async searchRecipes(query, filters = {}) {
    try {
      // Build parameters object
      const params = {
        apiKey: this.apiKey,
        query: query || '',
        number: filters.number || 10,
        addRecipeInformation: true,
        fillIngredients: true
      };

      // Only add optional parameters if they have values
      if (filters.minCalories) params.minCalories = filters.minCalories;
      if (filters.maxCalories) params.maxCalories = filters.maxCalories;
      if (filters.minProtein) params.minProtein = filters.minProtein;
      if (filters.minCarbs) params.minCarbs = filters.minCarbs;
      if (filters.minFat) params.minFat = filters.minFat;
      if (filters.diet) params.diet = filters.diet;
      if (filters.intolerances) params.intolerances = filters.intolerances;
      if (filters.sort) params.sort = filters.sort;
      if (filters.excludeIngredients) params.excludeIngredients = filters.excludeIngredients;

      const endpoint = `${this.baseURL}/recipes/complexSearch`;
      
      console.log('\n🔍 === CLIENT SEARCH REQUEST ===');
      console.log(`📍 Endpoint: ${endpoint}`);
      console.log('📦 Query:', query);
      console.log('📦 Filters:', filters);

      const response = await axios.get(endpoint, { params });

      console.log(`✅ Received ${response.data.results?.length || 0} recipes`);

      return {
        success: true,
        data: response.data.results || []
      };
      
    } catch (error) {
      console.error('❌ Search Error:', error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Data:', error.response.data);
      }
      
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async getRecipeDetails(recipeId) {
    try {
      console.log(`\n🔍 Fetching recipe details for ID: ${recipeId}`);
      
      const response = await axios.get(`${this.baseURL}/recipes/${recipeId}/information`, {
        params: {
          apiKey: this.apiKey,
          includeNutrition: true
        }
      });

      console.log(`✅ Recipe details retrieved: ${response.data.title}`);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error(`❌ Failed to fetch recipe ${recipeId}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPersonalizedRecommendations(userProfile, excludedIngredients = []) {
    try {
      console.log('\n⭐ === FETCHING PERSONALIZED RECOMMENDATIONS ===');
      console.log(`👤 User Profile:`, userProfile);
      console.log(`🚫 Excluded Ingredients:`, excludedIngredients);
      
      const targetCalories = userProfile?.dailyCalories 
        ? Math.round(userProfile.dailyCalories / 3) 
        : 600;

      const params = {
        apiKey: this.apiKey,
        number: 12,
        addRecipeInformation: true,
        fillIngredients: true,
        minCalories: targetCalories - 200,
        maxCalories: targetCalories + 200,
        sort: 'popularity'
      };

      if (userProfile?.dietaryPreferences) {
        params.diet = userProfile.dietaryPreferences;
      }

      if (excludedIngredients.length > 0) {
        params.excludeIngredients = excludedIngredients.join(',');
      }

      console.log('📦 Request params:', params);

      const response = await axios.get(`${this.baseURL}/recipes/complexSearch`, { params });
      
      console.log(`✅ Retrieved ${response.data.results?.length || 0} recommendations`);
      
      return {
        success: true,
        data: response.data.results || []
      };
    } catch (error) {
      console.error('❌ Recommendations Error:', error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, error.response.data);
      }
      
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async getMealPlan(targetCalories, diet, exclude) {
    try {
      console.log(`\n🍽️  Generating meal plan (${targetCalories} cal, ${diet || 'any'} diet)`);
      
      const response = await axios.get(`${this.baseURL}/mealplanner/generate`, {
        params: {
          apiKey: this.apiKey,
          timeFrame: 'day',
          targetCalories,
          diet,
          exclude
        }
      });

      console.log(`✅ Meal plan generated`);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Meal plan generation error:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeRecipeNutrition(ingredients) {
    try {
      console.log(`\n🧪 Analyzing nutrition for ${ingredients.length} ingredients`);
      
      const response = await axios.post(
        `${this.baseURL}/recipes/analyze`,
        { ingredients },
        {
          params: { apiKey: this.apiKey },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log(`✅ Nutrition analysis complete`);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Nutrition analysis error:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      console.log('\n🧪 Testing Spoonacular API connection...');
      
      const response = await axios.get(`${this.baseURL}/recipes/random`, {
        params: {
          apiKey: this.apiKey,
          number: 1
        }
      });

      console.log('✅ API connection successful!');
      console.log(`   Test recipe: ${response.data.recipes[0].title}`);
      
      if (response.headers['x-api-quota-used']) {
        console.log(`   Quota used: ${response.headers['x-api-quota-used']}`);
        console.log(`   Quota left: ${response.headers['x-api-quota-left']}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ API connection test failed:', error.message);
      return false;
    }
  }

  async searchRecipesByIngredients(ingredients, number = 10) {
    try {
      console.log(`\n🔍 Searching recipes by ingredients: ${ingredients}`);
      
      const response = await axios.get(`${this.baseURL}/recipes/findByIngredients`, {
        params: {
          apiKey: this.apiKey,
          ingredients: ingredients,
          number: number,
          ranking: 2,
          ignorePantry: true
        }
      });

      console.log(`✅ Found ${response.data.length} recipes`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Search by ingredients error:', error.message);
      
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async getRandomRecipes(number = 10, tags = '') {
    try {
      console.log(`\n🎲 Getting ${number} random recipes`);
      
      const response = await axios.get(`${this.baseURL}/recipes/random`, {
        params: {
          apiKey: this.apiKey,
          number: number,
          tags: tags
        }
      });

      console.log(`✅ Retrieved ${response.data.recipes.length} random recipes`);
      
      return {
        success: true,
        data: response.data.recipes
      };
    } catch (error) {
      console.error('❌ Random recipes error:', error.message);
      
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async getSimilarRecipes(recipeId, number = 5) {
    try {
      console.log(`\n🔄 Getting similar recipes to ID: ${recipeId}`);
      
      const response = await axios.get(`${this.baseURL}/recipes/${recipeId}/similar`, {
        params: {
          apiKey: this.apiKey,
          number: number
        }
      });

      console.log(`✅ Found ${response.data.length} similar recipes`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Similar recipes error:', error.message);
      
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }
}

// CRITICAL: ES6 Export for React
export const spoonacularService = new SpoonacularService();