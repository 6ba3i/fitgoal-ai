const axios = require('axios');

class SpoonacularService {
  constructor() {
    this.apiKey = process.env.SPOONACULAR_API_KEY;
    this.baseURL = process.env.SPOONACULAR_BASE_URL;
  }

  async searchRecipes(query, filters = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/recipes/complexSearch`, {
        params: {
          apiKey: this.apiKey,
          query,
          number: filters.number || 10,
          minCalories: filters.minCalories,
          maxCalories: filters.maxCalories,
          minProtein: filters.minProtein,
          minCarbs: filters.minCarbs,
          minFat: filters.minFat,
          diet: filters.diet,
          intolerances: filters.intolerances,
          addRecipeNutrition: true,
          fillIngredients: true
        }
      });
      return response.data.results;
    } catch (error) {
      console.error('Spoonacular API Error:', error);
      throw new Error('Failed to fetch recipes');
    }
  }

  async getRecipeDetails(recipeId) {
    try {
      const response = await axios.get(`${this.baseURL}/recipes/${recipeId}/information`, {
        params: {
          apiKey: this.apiKey,
          includeNutrition: true
        }
      });
      return response.data;
    } catch (error) {
      console.error('Spoonacular API Error:', error);
      throw new Error('Failed to fetch recipe details');
    }
  }

  async getMealPlan(targetCalories, diet, exclude) {
    try {
      const response = await axios.get(`${this.baseURL}/mealplanner/generate`, {
        params: {
          apiKey: this.apiKey,
          timeFrame: 'day',
          targetCalories,
          diet,
          exclude
        }
      });
      return response.data;
    } catch (error) {
      console.error('Spoonacular API Error:', error);
      throw new Error('Failed to generate meal plan');
    }
  }

  async analyzeRecipeNutrition(ingredients) {
    try {
      const response = await axios.post(
        `${this.baseURL}/recipes/analyze`,
        { ingredients },
        {
          params: { apiKey: this.apiKey },
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Spoonacular API Error:', error);
      throw new Error('Failed to analyze nutrition');
    }
  }
}

module.exports = new SpoonacularService();