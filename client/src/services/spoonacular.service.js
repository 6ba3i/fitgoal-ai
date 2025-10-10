const axios = require('axios');

class SpoonacularService {
  constructor() {
    this.apiKey = process.env.SPOONACULAR_API_KEY;
    this.baseURL = process.env.SPOONACULAR_BASE_URL || 'https://api.spoonacular.com';
    
    // Log configuration on startup
    console.log('🔧 Spoonacular Service Initialized');
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   API Key: ${this.apiKey ? '✓ Set' : '✗ Missing'}`);
  }

  async searchRecipes(query, filters = {}) {
    try {
      // Build parameters object
      const params = {
        apiKey: this.apiKey,
        query: query || '',
        number: filters.number || 10,
        addRecipeInformation: true,  // FIXED: was addRecipeNutrition
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

      const endpoint = `${this.baseURL}/recipes/complexSearch`;
      
      // LOG: Request details
      console.log('\n🔍 === SPOONACULAR API SEARCH REQUEST ===');
      console.log(`📍 Endpoint: ${endpoint}`);
      console.log('📦 Parameters:', JSON.stringify(params, null, 2));
      console.log(`⏰ Time: ${new Date().toISOString()}`);

      const response = await axios.get(endpoint, { params });

      // LOG: Response details
      console.log('\n✅ === SPOONACULAR API SEARCH RESPONSE ===');
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`📈 Results count: ${response.data.results?.length || 0}`);
      console.log(`📋 Total available: ${response.data.totalResults || 0}`);
      console.log(`🔢 Offset: ${response.data.offset || 0}`);
      
      // LOG: API quota info if available
      if (response.headers['x-api-quota-used']) {
        console.log('\n📊 === API QUOTA INFO ===');
        console.log(`   Used: ${response.headers['x-api-quota-used']}`);
        console.log(`   Left: ${response.headers['x-api-quota-left']}`);
      }

      // LOG: Sample of first result for debugging
      if (response.data.results && response.data.results.length > 0) {
        console.log('\n📝 First Result Sample:');
        const firstRecipe = response.data.results[0];
        console.log(`   ID: ${firstRecipe.id}`);
        console.log(`   Title: ${firstRecipe.title}`);
        console.log(`   Image: ${firstRecipe.image ? '✓' : '✗'}`);
        console.log(`   Nutrition data: ${firstRecipe.nutrition ? '✓' : '✗'}`);
      }

      console.log('=========================================\n');

      return response.data.results || [];
      
    } catch (error) {
      // ENHANCED ERROR LOGGING
      console.error('\n❌ === SPOONACULAR API ERROR ===');
      console.error(`⏰ Time: ${new Date().toISOString()}`);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(`📊 Status: ${error.response.status}`);
        console.error(`📋 Status Text: ${error.response.statusText}`);
        console.error('📦 Response Data:', JSON.stringify(error.response.data, null, 2));
        console.error('🔑 Headers:', JSON.stringify(error.response.headers, null, 2));
        
        // Specific error messages based on status code
        if (error.response.status === 401) {
          console.error('🔐 Authentication Error: Invalid API key');
          throw new Error('Invalid Spoonacular API key. Please check your .env file.');
        } else if (error.response.status === 402) {
          console.error('💰 Payment Required: API quota exceeded');
          throw new Error('Spoonacular API quota exceeded. Please upgrade your plan.');
        } else if (error.response.status === 404) {
          console.error('🔍 Not Found: Endpoint may be incorrect');
          throw new Error('Spoonacular API endpoint not found.');
        } else if (error.response.status === 429) {
          console.error('⏱️  Rate Limited: Too many requests');
          throw new Error('Too many requests to Spoonacular API. Please try again later.');
        }
        
      } else if (error.request) {
        // The request was made but no response was received
        console.error('📡 No Response Received');
        console.error('🌐 Request Details:', error.request);
        throw new Error('No response from Spoonacular API. Check your internet connection.');
        
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('⚙️  Setup Error:', error.message);
      }
      
      console.error('📚 Full Error:', error);
      console.error('=====================================\n');
      
      throw new Error(`Spoonacular API Error: ${error.message}`);
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
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to fetch recipe ${recipeId}:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, error.response.data);
      }
      throw new Error('Failed to fetch recipe details');
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
      return response.data;
      
    } catch (error) {
      console.error('❌ Meal plan generation error:', error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, error.response.data);
      }
      throw new Error('Failed to generate meal plan');
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
      return response.data;
      
    } catch (error) {
      console.error('❌ Nutrition analysis error:', error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, error.response.data);
      }
      throw new Error('Failed to analyze nutrition');
    }
  }

  // Test method to verify API connection
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
}

module.exports = new SpoonacularService();