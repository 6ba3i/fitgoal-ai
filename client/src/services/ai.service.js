import api from './api';

class AIService {
  async predictWeight(daysAhead = 30) {
    const response = await api.post('/ai/predict-weight', { daysAhead });
    return response.data;
  }

  async recommendCalories() {
    const response = await api.post('/ai/recommend-calories');
    return response.data;
  }

  async clusterRecipes(recipes, k = 3) {
    const response = await api.post('/ai/cluster-recipes', { recipes, k });
    return response.data;
  }

  async analyzeProgress() {
    const response = await api.post('/ai/analyze-progress');
    return response.data;
  }

  async generateMealPlan(days = 7) {
    const response = await api.post('/ai/generate-meal-plan', { days });
    return response.data;
  }

  async optimizeMacros() {
    const response = await api.post('/ai/optimize-macros');
    return response.data;
  }

  async getInsights() {
    const response = await api.get('/ai/insights');
    return response.data;
  }

  async adjustGoals() {
    const response = await api.post('/ai/adjust-goals');
    return response.data;
  }

  async getWorkoutRecommendations() {
    const response = await api.post('/ai/workout-recommendations');
    return response.data;
  }

  async detectPlateau() {
    const response = await api.post('/ai/plateau-detection');
    return response.data;
  }
}

export const aiService = new AIService();