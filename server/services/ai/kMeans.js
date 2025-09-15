const kmeans = require('ml-kmeans');

class KMeansService {
  clusterRecipes(recipes, userProfile, k = 3) {
    if (!recipes || recipes.length === 0) {
      return [];
    }

    // Prepare data for clustering
    const data = recipes.map(recipe => [
      recipe.nutrition.calories || 0,
      recipe.nutrition.protein || 0,
      recipe.nutrition.carbs || 0,
      recipe.nutrition.fat || 0
    ]);

    // Perform k-means clustering
    const result = kmeans(data, k, {
      initialization: 'kmeans++',
      maxIterations: 100
    });

    // Group recipes by cluster
    const clusters = Array(k).fill().map(() => []);
    recipes.forEach((recipe, index) => {
      const clusterIndex = result.clusters[index];
      clusters[clusterIndex].push(recipe);
    });

    // Score clusters based on user preferences
    return this.rankClusters(clusters, userProfile);
  }

  rankClusters(clusters, userProfile) {
    const targetMacros = this.calculateTargetMacros(userProfile);
    
    return clusters.map(cluster => {
      const avgNutrition = this.calculateAverageNutrition(cluster);
      const score = this.calculateClusterScore(avgNutrition, targetMacros);
      
      return {
        recipes: cluster,
        avgNutrition,
        score,
        recommendation: this.getRecommendation(score)
      };
    }).sort((a, b) => b.score - a.score);
  }

  calculateTargetMacros(profile) {
    const { weight, height, age, gender, activityLevel, goal } = profile;
    
    // Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };

    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
    let targetCalories = tdee;

    if (goal === 'lose') {
      targetCalories = tdee - 500;
    } else if (goal === 'gain') {
      targetCalories = tdee + 500;
    }

    return {
      calories: targetCalories / 3, // Per meal
      protein: weight * 0.8, // Per meal
      carbs: (targetCalories * 0.4) / 4 / 3,
      fat: (targetCalories * 0.3) / 9 / 3
    };
  }

  calculateAverageNutrition(recipes) {
    const total = recipes.reduce((acc, recipe) => ({
      calories: acc.calories + (recipe.nutrition?.calories || 0),
      protein: acc.protein + (recipe.nutrition?.protein || 0),
      carbs: acc.carbs + (recipe.nutrition?.carbs || 0),
      fat: acc.fat + (recipe.nutrition?.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const count = recipes.length || 1;
    return {
      calories: total.calories / count,
      protein: total.protein / count,
      carbs: total.carbs / count,
      fat: total.fat / count
    };
  }

  calculateClusterScore(avgNutrition, targetMacros) {
    const calorieScore = 100 - Math.abs(avgNutrition.calories - targetMacros.calories) / targetMacros.calories * 100;
    const proteinScore = 100 - Math.abs(avgNutrition.protein - targetMacros.protein) / targetMacros.protein * 100;
    const carbScore = 100 - Math.abs(avgNutrition.carbs - targetMacros.carbs) / targetMacros.carbs * 100;
    const fatScore = 100 - Math.abs(avgNutrition.fat - targetMacros.fat) / targetMacros.fat * 100;

    return (calorieScore * 0.4 + proteinScore * 0.3 + carbScore * 0.2 + fatScore * 0.1);
  }

  getRecommendation(score) {
    if (score >= 90) return 'Excellent match for your goals';
    if (score >= 75) return 'Good match for your goals';
    if (score >= 60) return 'Moderate match for your goals';
    return 'Consider other options';
  }
}

module.exports = new KMeansService();