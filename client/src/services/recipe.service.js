import api from './api';

class RecipeService {
  async searchRecipes(params) {
    const response = await api.get('/recipes/search', { params });
    return response.data;
  }

  async getRecipeDetails(recipeId) {
    const response = await api.get(`/recipes/${recipeId}`);
    return response.data;
  }

  async addToFavorites(recipeId) {
    const response = await api.post(`/recipes/favorites/${recipeId}`);
    return response.data;
  }

  async removeFromFavorites(recipeId) {
    const response = await api.delete(`/recipes/favorites/${recipeId}`);
    return response.data;
  }

  async getFavorites() {
    const response = await api.get('/recipes/user/favorites');
    return response.data;
  }

  async generateMealPlan(preferences) {
    const response = await api.post('/recipes/meal-plan', preferences);
    return response.data;
  }

  async analyzeNutrition(ingredients) {
    const response = await api.post('/recipes/analyze', { ingredients });
    return response.data;
  }

  async createCustomRecipe(recipeData) {
    const response = await api.post('/recipes/create', recipeData);
    return response.data;
  }

  async updateCustomRecipe(recipeId, recipeData) {
    const response = await api.put(`/recipes/${recipeId}`, recipeData);
    return response.data;
  }

  async deleteCustomRecipe(recipeId) {
    const response = await api.delete(`/recipes/${recipeId}`);
    return response.data;
  }

  async rateRecipe(recipeId, rating, review) {
    const response = await api.post(`/recipes/${recipeId}/rate`, { rating, review });
    return response.data;
  }

  async getPersonalizedRecommendations() {
    const response = await api.get('/recipes/recommendations/personalized');
    return response.data;
  }
}

export const recipeService = new RecipeService();