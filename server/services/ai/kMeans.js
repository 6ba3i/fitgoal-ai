// Try different import methods for ml-kmeans
let kmeans;
try {
  // Method 1: Direct require
  kmeans = require('ml-kmeans');
  
  // Check if it's an object with kmeans method
  if (typeof kmeans !== 'function' && kmeans.kmeans) {
    kmeans = kmeans.kmeans;
  }
  
  // Check if it has a default export
  if (typeof kmeans !== 'function' && kmeans.default) {
    kmeans = kmeans.default;
  }
} catch (error) {
  console.error('❌ Error importing ml-kmeans:', error);
  console.error('Please install ml-kmeans: npm install ml-kmeans');
}

class KMeansService {
  /**
   * Cluster recipes based on nutritional similarity
   * @param {Array} recipes - Array of recipe objects with nutrition data
   * @param {Object} userProfile - User profile with goals and preferences
   * @param {Number} k - Number of clusters (default 3)
   * @returns {Array} Clustered recipes with match scores
   */
  clusterRecipes(recipes, userProfile, k = 3) {
    try {
      if (!recipes || recipes.length < k) {
        throw new Error(`Need at least ${k} recipes for clustering`);
      }

      // Extract nutritional features for clustering
      const features = recipes.map(recipe => {
        const nutrition = recipe.nutrition || {};
        return [
          nutrition.calories / 1000 || 0,  // Normalize to 0-3 range
          nutrition.protein / 100 || 0,     // Normalize to 0-2 range
          nutrition.carbs / 100 || 0,       // Normalize to 0-5 range
          nutrition.fat / 50 || 0           // Normalize to 0-2 range
        ];
      });

      console.log('🔍 Clustering', recipes.length, 'recipes into', k, 'groups');
      console.log('📊 Sample features:', features[0]);

      // Check if kmeans is available
      if (typeof kmeans !== 'function') {
        console.error('❌ kmeans is not a function. Type:', typeof kmeans);
        console.error('Available methods:', Object.keys(kmeans || {}));
        throw new Error('ml-kmeans library not properly loaded');
      }

      // Perform K-means clustering
      const result = kmeans(features, k, {
        initialization: 'kmeans++',
        maxIterations: 100
      });

      console.log('✅ Clustering complete. Cluster assignments:', result.clusters.slice(0, 5));

      // Group recipes by cluster
      const clusters = Array.from({ length: k }, () => []);
      result.clusters.forEach((clusterIndex, recipeIndex) => {
        clusters[clusterIndex].push(recipes[recipeIndex]);
      });

      // Calculate cluster statistics and score each cluster
      const clustersWithStats = clusters.map((clusterRecipes, index) => {
        if (clusterRecipes.length === 0) return null;

        // Calculate average nutrition for this cluster
        const avgNutrition = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        };

        clusterRecipes.forEach(recipe => {
          avgNutrition.calories += recipe.nutrition?.calories || 0;
          avgNutrition.protein += recipe.nutrition?.protein || 0;
          avgNutrition.carbs += recipe.nutrition?.carbs || 0;
          avgNutrition.fat += recipe.nutrition?.fat || 0;
        });

        Object.keys(avgNutrition).forEach(key => {
          avgNutrition[key] = Math.round(avgNutrition[key] / clusterRecipes.length);
        });

        // Score cluster based on how close it matches user's goals
        const score = this.calculateMatchScore(avgNutrition, userProfile);

        // Assign label based on score
        let label, description;
        if (score >= 70) {
          label = 'Perfect Match';
          description = 'These recipes are ideal for your goals!';
        } else if (score >= 45) {
          label = 'Good Match';
          description = 'Good options with minor adjustments needed.';
        } else {
          label = 'Moderate Match';
          description = 'Consider these for variety or special occasions.';
        }

        return {
          id: index,
          label,
          description,
          score: Math.round(score),
          avgNutrition,
          recipes: clusterRecipes.map(recipe => ({
            ...recipe,
            matchScore: Math.round(score)
          }))
        };
      }).filter(cluster => cluster !== null);

      // Sort clusters by score (best first)
      clustersWithStats.sort((a, b) => b.score - a.score);

      console.log('✅ Generated', clustersWithStats.length, 'clusters with scores:', 
        clustersWithStats.map(c => c.score));

      return clustersWithStats;

    } catch (error) {
      console.error('KMeans clustering error:', error);
      throw error;
    }
  }

  /**
   * Calculate match score between recipe nutrition and user goals
   * @param {Object} nutrition - Recipe nutrition values
   * @param {Object} userProfile - User profile with goals
   * @returns {Number} Match score (0-100)
   */
  calculateMatchScore(nutrition, userProfile) {
    const targetCalories = userProfile.dailyCalories || 2000;
    const targetProtein = userProfile.dailyProtein || 150;
    const targetCarbs = userProfile.dailyCarbs || 200;
    const targetFat = userProfile.dailyFat || 65;

    let score = 100;

    // Penalize based on deviation from targets (per meal, assume 4 meals/day)
    const mealCalories = targetCalories / 4;
    const mealProtein = targetProtein / 4;
    const mealCarbs = targetCarbs / 4;
    const mealFat = targetFat / 4;

    // Calories (30% weight)
    const caloriesDiff = Math.abs(nutrition.calories - mealCalories);
    score -= (caloriesDiff / mealCalories) * 30;

    // Protein (25% weight)
    const proteinDiff = Math.abs(nutrition.protein - mealProtein);
    score -= (proteinDiff / mealProtein) * 25;

    // Carbs (25% weight)
    const carbsDiff = Math.abs(nutrition.carbs - mealCarbs);
    score -= (carbsDiff / mealCarbs) * 25;

    // Fat (20% weight)
    const fatDiff = Math.abs(nutrition.fat - mealFat);
    score -= (fatDiff / mealFat) * 20;

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = new KMeansService();