// client/src/services/spoonacular.service.js
import axios from 'axios';

class SpoonacularService {
  constructor() {
    // Multiple API keys in case one hits the limit
    this.apiKeys = [
      'abf8b3a213f44fe99b03dee5633775e5'
    ];
    this.currentKeyIndex = 0;
    this.baseURL = 'https://api.spoonacular.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });
  }

  getCurrentApiKey() {
    return this.apiKeys[this.currentKeyIndex];
  }

  rotateApiKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log('Rotating to next API key');
  }

  async makeRequest(endpoint, params = {}) {
    let lastError;
    let attempts = 0;
    
    // Try with each API key
    while (attempts < this.apiKeys.length) {
      try {
        const response = await this.client.get(endpoint, {
          params: {
            ...params,
            apiKey: this.getCurrentApiKey()
          }
        });
        return response;
      } catch (error) {
        lastError = error;
        if (error.response?.status === 401 || error.response?.status === 402) {
          // API key issue or quota exceeded, try next key
          this.rotateApiKey();
          attempts++;
        } else {
          // Other error, throw immediately
          throw error;
        }
      }
    }
    
    // All keys failed
    console.error('All API keys exhausted or invalid');
    throw lastError;
  }

  async searchRecipes(query, filters = {}) {
    try {
      const response = await this.makeRequest('/recipes/complexSearch', {
        query: query || '',
        number: filters.number || 12,
        minCalories: filters.minCalories,
        maxCalories: filters.maxCalories,
        minProtein: filters.minProtein,
        minCarbs: filters.minCarbs,
        minFat: filters.minFat,
        diet: filters.diet,
        intolerances: filters.intolerances,
        addRecipeNutrition: true,
        fillIngredients: true,
        instructionsRequired: true
      });
      
      return {
        success: true,
        data: response.data.results || []
      };
    } catch (error) {
      console.error('Spoonacular search error:', error);
      
      // Return mock data if API fails
      if (error.response?.status === 401 || error.response?.status === 402) {
        return {
          success: true,
          data: this.getMockRecipes(query)
        };
      }
      
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getRecipeDetails(recipeId) {
    try {
      const response = await this.makeRequest(`/recipes/${recipeId}/information`, {
        includeNutrition: true
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Spoonacular details error:', error);
      
      // Return basic data if API fails
      return {
        success: true,
        data: {
          id: recipeId,
          title: 'Recipe Details Unavailable',
          readyInMinutes: 30,
          servings: 4,
          image: 'https://via.placeholder.com/600x400?text=Recipe',
          summary: 'Recipe details are temporarily unavailable.',
          instructions: 'Please try again later.'
        }
      };
    }
  }

  async getRandomRecipes(tags = '', number = 10) {
    try {
      const response = await this.makeRequest('/recipes/random', {
        number,
        tags,
        includeNutrition: true
      });
      
      return {
        success: true,
        data: response.data.recipes || []
      };
    } catch (error) {
      console.error('Spoonacular random error:', error);
      
      // Return mock data if API fails
      return {
        success: true,
        data: this.getMockRecipes('healthy')
      };
    }
  }

  async getMealPlan(targetCalories, diet, exclude) {
    try {
      const response = await this.makeRequest('/mealplanner/generate', {
        timeFrame: 'day',
        targetCalories,
        diet,
        exclude
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Spoonacular meal plan error:', error);
      
      // Return mock meal plan if API fails
      return {
        success: true,
        data: this.getMockMealPlan(targetCalories)
      };
    }
  }

  async getPersonalizedRecommendations(userProfile = {}) {
    try {
      const targetCalories = userProfile.dailyCalories ? Math.round(userProfile.dailyCalories / 3) : 600;
      
      const response = await this.makeRequest('/recipes/findByNutrients', {
        minCalories: targetCalories - 200,
        maxCalories: targetCalories + 200,
        minProtein: userProfile.goal === 'gain' ? 20 : 10,
        number: 10,
        random: true,
        limitLicense: false
      });
      
      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      console.error('Spoonacular recommendations error:', error);
      
      // Fallback to mock recommendations
      return {
        success: true,
        data: this.getMockRecipes('healthy')
      };
    }
  }

  // Mock data for when API is down or quota exceeded
  getMockRecipes(query = '') {
    const mockRecipes = [
      {
        id: 1,
        title: 'Grilled Chicken Salad',
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
        readyInMinutes: 25,
        servings: 2,
        calories: 350,
        protein: 35,
        carbs: 15,
        fat: 18,
        nutrition: { 
          nutrients: [
            { name: 'Calories', amount: 350 },
            { name: 'Protein', amount: 35 },
            { name: 'Carbohydrates', amount: 15 },
            { name: 'Fat', amount: 18 }
          ]
        }
      },
      {
        id: 2,
        title: 'Quinoa Buddha Bowl',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        readyInMinutes: 30,
        servings: 2,
        calories: 420,
        protein: 18,
        carbs: 55,
        fat: 16,
        nutrition: { 
          nutrients: [
            { name: 'Calories', amount: 420 },
            { name: 'Protein', amount: 18 },
            { name: 'Carbohydrates', amount: 55 },
            { name: 'Fat', amount: 16 }
          ]
        }
      },
      {
        id: 3,
        title: 'Salmon with Vegetables',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
        readyInMinutes: 35,
        servings: 2,
        calories: 380,
        protein: 32,
        carbs: 20,
        fat: 22,
        nutrition: { 
          nutrients: [
            { name: 'Calories', amount: 380 },
            { name: 'Protein', amount: 32 },
            { name: 'Carbohydrates', amount: 20 },
            { name: 'Fat', amount: 22 }
          ]
        }
      },
      {
        id: 4,
        title: 'Protein Smoothie Bowl',
        image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400',
        readyInMinutes: 10,
        servings: 1,
        calories: 320,
        protein: 25,
        carbs: 38,
        fat: 12,
        nutrition: { 
          nutrients: [
            { name: 'Calories', amount: 320 },
            { name: 'Protein', amount: 25 },
            { name: 'Carbohydrates', amount: 38 },
            { name: 'Fat', amount: 12 }
          ]
        }
      },
      {
        id: 5,
        title: 'Greek Yogurt Parfait',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
        readyInMinutes: 5,
        servings: 1,
        calories: 280,
        protein: 20,
        carbs: 35,
        fat: 8,
        nutrition: { 
          nutrients: [
            { name: 'Calories', amount: 280 },
            { name: 'Protein', amount: 20 },
            { name: 'Carbohydrates', amount: 35 },
            { name: 'Fat', amount: 8 }
          ]
        }
      },
      {
        id: 6,
        title: 'Turkey Wrap',
        image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
        readyInMinutes: 15,
        servings: 1,
        calories: 340,
        protein: 28,
        carbs: 32,
        fat: 14,
        nutrition: { 
          nutrients: [
            { name: 'Calories', amount: 340 },
            { name: 'Protein', amount: 28 },
            { name: 'Carbohydrates', amount: 32 },
            { name: 'Fat', amount: 14 }
          ]
        }
      }
    ];

    // Filter based on query if provided
    if (query) {
      return mockRecipes.filter(recipe => 
        recipe.title.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return mockRecipes;
  }

  getMockMealPlan(targetCalories = 2000) {
    return {
      meals: [
        {
          id: 1,
          title: 'Oatmeal with Berries',
          readyInMinutes: 10,
          servings: 1
        },
        {
          id: 2,
          title: 'Grilled Chicken Salad',
          readyInMinutes: 25,
          servings: 1
        },
        {
          id: 3,
          title: 'Salmon with Quinoa',
          readyInMinutes: 35,
          servings: 1
        }
      ],
      nutrients: {
        calories: targetCalories,
        protein: Math.round(targetCalories * 0.3 / 4),
        carbohydrates: Math.round(targetCalories * 0.4 / 4),
        fat: Math.round(targetCalories * 0.3 / 9)
      }
    };
  }
}

export const spoonacularService = new SpoonacularService();