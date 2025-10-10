// client/src/services/spoonacular.service.js
// CLIENT-SIDE SERVICE - Uses ES6 Modules
import axios from 'axios';

class SpoonacularService {
  constructor() {
    this.apiKey = process.env.REACT_APP_SPOONACULAR_API_KEY || process.env.SPOONACULAR_API_KEY || 'cf7241a750fe494281d3be34766bea6b';
    this.baseURL = 'https://api.spoonacular.com';
    
    // Log configuration on startup
    console.log('🔧 CLIENT Spoonacular Service Initialized');
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   API Key: ${this.apiKey ? '✓ Set' : '✗ Missing'}`);
  }

  async searchRecipes(query, filters = {}) {
    try {
      // Build parameters object with CORRECT parameter for nutrition
      const params = {
        apiKey: this.apiKey,
        query: query || '',
        number: filters.number || 12,
        addRecipeNutrition: true,  // FIXED: This is the correct parameter for nutrition data
        fillIngredients: true,
        offset: filters.offset || 0
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
      
      // Log sample nutrition data for debugging
      if (response.data.results && response.data.results.length > 0) {
        const firstRecipe = response.data.results[0];
        console.log('📊 Sample nutrition data:');
        console.log(`   Recipe: ${firstRecipe.title}`);
        if (firstRecipe.nutrition && firstRecipe.nutrition.nutrients) {
          const calories = firstRecipe.nutrition.nutrients.find(n => n.name === 'Calories');
          const protein = firstRecipe.nutrition.nutrients.find(n => n.name === 'Protein');
          console.log(`   Calories: ${calories?.amount || 0} ${calories?.unit || ''}`);
          console.log(`   Protein: ${protein?.amount || 0} ${protein?.unit || ''}`);
        } else {
          console.warn('   ⚠️ No nutrition data found!');
        }
      }

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
          includeNutrition: true  // This ensures we get full nutrition data
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

  async getPersonalizedRecommendations(userProfile, excludedIngredients = [], offset = 0) {
    try {
      console.log('\n⭐ === FETCHING PERSONALIZED RECOMMENDATIONS ===');
      console.log(`👤 User Profile:`, userProfile);
      console.log(`🚫 Excluded Ingredients:`, excludedIngredients);
      console.log(`📍 Offset: ${offset}`);
      
      const targetCalories = userProfile?.dailyCalories 
        ? Math.round(userProfile.dailyCalories / 3) 
        : 600;

      const params = {
        apiKey: this.apiKey,
        number: 12,
        addRecipeNutrition: true,  // FIXED: Changed from addRecipeInformation
        fillIngredients: true,
        minCalories: targetCalories - 200,
        maxCalories: targetCalories + 200,
        sort: 'popularity',
        offset: offset  // ADD OFFSET SUPPORT
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
      
      // Log nutrition data for first result
      if (response.data.results && response.data.results.length > 0) {
        const firstRecipe = response.data.results[0];
        if (firstRecipe.nutrition && firstRecipe.nutrition.nutrients) {
          const protein = firstRecipe.nutrition.nutrients.find(n => n.name === 'Protein');
          console.log(`📊 First recipe protein: ${protein?.amount || 0}g`);
        }
      }
      
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

  async getMealPlan(userProfile, diet, exclude) {
    try {
      console.log('\n🍽️  === GENERATING SMART MEAL PLAN ===');
      
      // Calculate daily targets
      const dailyCalories = userProfile?.dailyCalories || 2000;
      const dailyProtein = userProfile?.dailyProtein || Math.round(userProfile?.weight * 2) || 150;
      const dailyCarbs = userProfile?.dailyCarbs || Math.round((dailyCalories * 0.4) / 4) || 200;
      const dailyFat = userProfile?.dailyFat || Math.round((dailyCalories * 0.3) / 9) || 67;
      
      console.log('📊 Daily Targets:');
      console.log(`   Calories: ${dailyCalories}`);
      console.log(`   Protein: ${dailyProtein}g`);
      console.log(`   Carbs: ${dailyCarbs}g`);
      console.log(`   Fat: ${dailyFat}g`);
      
      // Calculate per-meal targets (33% each for 3 meals)
      const caloriesPerMeal = Math.round(dailyCalories / 3);
      const proteinPerMeal = Math.round(dailyProtein / 3);
      const carbsPerMeal = Math.round(dailyCarbs / 3);
      const fatPerMeal = Math.round(dailyFat / 3);
      
      console.log('\n🍽️  Per-Meal Targets (33% each):');
      console.log(`   Calories: ${caloriesPerMeal}`);
      console.log(`   Protein: ${proteinPerMeal}g`);
      console.log(`   Carbs: ${carbsPerMeal}g`);
      console.log(`   Fat: ${fatPerMeal}g`);
      
      // Define tolerance ranges
      const proteinTolerance = 10; // ±10g
      const carbTolerance = 10; // ±10g
      const fatTolerance = 0; // ±0g
      const calorieTolerance = 100; // ±100 cal for flexibility
      
      console.log('\n📏 Tolerance Ranges:');
      console.log(`   Protein: ±${proteinTolerance}g`);
      console.log(`   Carbs: ±${carbTolerance}g`);
      console.log(`   Fat: ±${fatTolerance}g`);
      console.log(`   Calories: ±${calorieTolerance}`);
      
      // Generate 3 meals with proper macro ranges
      const mealTypes = ['breakfast', 'main course', 'main course']; // breakfast, lunch, dinner
      const meals = [];
      
      for (let i = 0; i < 3; i++) {
        console.log(`\n🔍 Searching for meal ${i + 1} (${mealTypes[i]})...`);
        
        const params = {
          apiKey: this.apiKey,
          type: mealTypes[i],
          number: 1,
          addRecipeNutrition: true,
          
          // Calorie range
          minCalories: caloriesPerMeal - calorieTolerance,
          maxCalories: caloriesPerMeal + calorieTolerance,
          
          // Protein range
          minProtein: Math.max(0, proteinPerMeal - proteinTolerance),
          maxProtein: proteinPerMeal + proteinTolerance,
          
          // Carbs range
          minCarbs: Math.max(0, carbsPerMeal - carbTolerance),
          maxCarbs: carbsPerMeal + carbTolerance,
          
          // Fat range
          minFat: Math.max(0, fatPerMeal - fatTolerance),
          maxFat: fatPerMeal + fatTolerance,
          
          sort: 'random'
        };
        
        if (diet) {
          params.diet = diet;
        }
        
        if (exclude) {
          params.excludeIngredients = exclude;
        }
        
        try {
          const response = await axios.get(`${this.baseURL}/recipes/complexSearch`, { params });
          
          if (response.data.results && response.data.results.length > 0) {
            const meal = response.data.results[0];
            meals.push(meal);
            
            // Log what we found
            const calories = meal.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0;
            const protein = meal.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 0;
            const carbs = meal.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 0;
            const fat = meal.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount || 0;
            
            console.log(`   ✅ Found: ${meal.title}`);
            console.log(`      Calories: ${Math.round(calories)} (target: ${caloriesPerMeal})`);
            console.log(`      Protein: ${Math.round(protein)}g (target: ${proteinPerMeal}g)`);
            console.log(`      Carbs: ${Math.round(carbs)}g (target: ${carbsPerMeal}g)`);
            console.log(`      Fat: ${Math.round(fat)}g (target: ${fatPerMeal}g)`);
          } else {
            console.warn(`   ⚠️ No meals found for slot ${i + 1}, relaxing constraints...`);
            
            // Fallback: Try again with more relaxed constraints
            const relaxedParams = {
              ...params,
              minProtein: Math.max(0, proteinPerMeal - 50),
              maxProtein: proteinPerMeal + 50,
              minCarbs: Math.max(0, carbsPerMeal - 30),
              maxCarbs: carbsPerMeal + 30,
              minFat: Math.max(0, fatPerMeal - 20),
              maxFat: fatPerMeal + 20
            };
            
            const relaxedResponse = await axios.get(`${this.baseURL}/recipes/complexSearch`, { 
              params: relaxedParams 
            });
            
            if (relaxedResponse.data.results && relaxedResponse.data.results.length > 0) {
              meals.push(relaxedResponse.data.results[0]);
              console.log(`   ✅ Found with relaxed constraints: ${relaxedResponse.data.results[0].title}`);
            }
          }
        } catch (mealError) {
          console.error(`   ❌ Error fetching meal ${i + 1}:`, mealError.message);
        }
      }
      
      if (meals.length === 0) {
        throw new Error('Could not generate any meals with the specified constraints');
      }
      
      // Calculate totals
      const totals = meals.reduce((acc, meal) => {
        const calories = meal.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0;
        const protein = meal.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 0;
        const carbs = meal.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 0;
        const fat = meal.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount || 0;
        
        return {
          calories: acc.calories + calories,
          protein: acc.protein + protein,
          carbs: acc.carbs + carbs,
          fat: acc.fat + fat
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
      
      console.log('\n✅ Meal Plan Generated Successfully!');
      console.log('📊 Daily Totals:');
      console.log(`   Calories: ${Math.round(totals.calories)} / ${dailyCalories} (${Math.round((totals.calories/dailyCalories)*100)}%)`);
      console.log(`   Protein: ${Math.round(totals.protein)}g / ${dailyProtein}g (${Math.round((totals.protein/dailyProtein)*100)}%)`);
      console.log(`   Carbs: ${Math.round(totals.carbs)}g / ${dailyCarbs}g (${Math.round((totals.carbs/dailyCarbs)*100)}%)`);
      console.log(`   Fat: ${Math.round(totals.fat)}g / ${dailyFat}g (${Math.round((totals.fat/dailyFat)*100)}%)`);
      
      return {
        success: true,
        data: {
          meals: meals,
          nutrients: totals,
          targets: {
            calories: dailyCalories,
            protein: dailyProtein,
            carbs: dailyCarbs,
            fat: dailyFat
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Meal plan generation error:', error.message);
      
      return {
        success: false,
        error: error.message
      };
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
}

// CRITICAL: ES6 Export for React
export const spoonacularService = new SpoonacularService();