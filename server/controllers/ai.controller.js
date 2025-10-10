const firebaseService = require('../services/firebase.service');
const LinearRegressionService = require('../services/ai/linearRegression');
const KMeansService = require('../services/ai/kMeans');
const PredictionsService = require('../services/ai/predictions');

class AIController {
  async predictWeight(req, res) {
    try {
      const userId = req.user.id;
      const { daysAhead = 30 } = req.body;

      // Get user's progress data from Firestore
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        90
      );

      if (progressData.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Not enough progress data for predictions. Please log at least 2 entries.'
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Generate predictions
      const predictions = LinearRegressionService.predictWeight(
        sortedData,
        daysAhead
      );

      res.json({
        success: true,
        data: predictions
      });
    } catch (error) {
      console.error('Predict weight error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate weight predictions',
        error: error.message
      });
    }
  }

  async recommendCalories(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const user = userProfile.profile;

      // Calculate calorie deficit/surplus needed
      const recommendation = LinearRegressionService.calculateCalorieDeficit(
        user.weight,
        user.targetWeight,
        user.targetDate
      );

      // Get current macros
      const currentMacros = this.calculateMacros(user);

      // Adjust based on recommendation
      const adjustedCalories = currentMacros.calories + recommendation.dailyDeficit;
      
      const adjustedMacros = {
        calories: Math.max(1200, Math.min(4000, adjustedCalories)), // Safety limits
        protein: Math.round(user.weight * 2.2 * 0.8),
        carbs: Math.round(adjustedCalories * 0.4 / 4),
        fat: Math.round(adjustedCalories * 0.3 / 9),
        recommendation: recommendation.feasible 
          ? `To reach your goal, aim for ${adjustedCalories} calories per day.`
          : `Your goal timeline may be too aggressive. Consider extending your target date.`,
        weeklyWeightChange: recommendation.weeklyLoss,
        estimatedCompletion: recommendation.estimatedCompletion
      };

      res.json({
        success: true,
        data: adjustedMacros
      });
    } catch (error) {
      console.error('Recommend calories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate calorie recommendations',
        error: error.message
      });
    }
  }

  async clusterRecipes(req, res) {
    try {
      const userId = req.user.id;
      const { recipes, k = 3 } = req.body;
      
      // Get user profile from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }
      
      // Cluster recipes based on user profile
      const clusters = KMeansService.clusterRecipes(recipes, userProfile.profile, k);

      res.json({
        success: true,
        data: clusters
      });
    } catch (error) {
      console.error('Cluster recipes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cluster recipes',
        error: error.message
      });
    }
  }

  async analyzeProgress(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile and progress data from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        30
      );

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      if (progressData.length < 7) {
        return res.json({
          success: true,
          data: {
            message: 'Continue logging for at least a week to get detailed analysis'
          }
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Analyze trends
      const trends = LinearRegressionService.calculateTrend(sortedData);
      const predictions = LinearRegressionService.predictWeight(sortedData, 30);

      // Calculate insights
      const insights = {
        weightTrend: trends,
        predictions: predictions.predictions.slice(0, 7), // Next week
        consistency: this.calculateConsistency(sortedData),
        recommendations: this.generateRecommendations(userProfile.profile, sortedData, trends),
        plateauDetected: this.detectPlateau(sortedData),
        successRate: this.calculateSuccessRate(userProfile.profile, sortedData)
      };

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Analyze progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze progress',
        error: error.message
      });
    }
  }

  async generateMealPlan(req, res) {
    try {
      const userId = req.user.id;
      const { days = 7 } = req.body;

      // Get user profile from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Get user's favorite recipes for personalization
      const favoriteRecipes = await firebaseService.getFavoriteRecipes(userId);

      // Generate meal plan using AI/ML
      const mealPlan = PredictionsService.generateMealPlan(
        userProfile.profile,
        favoriteRecipes,
        days
      );

      // Store meal plan in Firestore
      await firebaseService.storeInFirestore('mealPlans', `${userId}_${Date.now()}`, {
        userId,
        mealPlan,
        generatedAt: new Date(),
        days
      });

      res.json({
        success: true,
        data: mealPlan
      });
    } catch (error) {
      console.error('Generate meal plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate meal plan',
        error: error.message
      });
    }
  }

  async optimizeMacros(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile and progress data from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        30
      );

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Analyze current progress
      const trends = LinearRegressionService.calculateTrend(sortedData);
      
      // Optimize macros based on progress
      let optimizedMacros = this.calculateMacros(userProfile.profile);
      
      if (userProfile.profile.goal === 'lose' && trends.direction !== 'losing') {
        // Not losing weight, increase deficit
        optimizedMacros.calories = Math.max(1200, optimizedMacros.calories - 200);
      } else if (userProfile.profile.goal === 'gain' && trends.direction !== 'gaining') {
        // Not gaining weight, increase surplus
        optimizedMacros.calories = Math.min(4000, optimizedMacros.calories + 200);
      }
      
      // Adjust protein based on activity
      const activeCount = sortedData.filter(p => p.workoutCompleted).length;
      if (activeCount > sortedData.length * 0.5) {
        optimizedMacros.protein = Math.round(userProfile.profile.weight * 2.2 * 1.0); // Increase protein
      }
      
      // Recalculate other macros
      optimizedMacros.carbs = Math.round(optimizedMacros.calories * 0.4 / 4);
      optimizedMacros.fat = Math.round(optimizedMacros.calories * 0.3 / 9);

      res.json({
        success: true,
        data: {
          current: this.calculateMacros(userProfile.profile),
          optimized: optimizedMacros,
          reasoning: this.generateMacroReasoning(userProfile.profile, trends, sortedData)
        }
      });
    } catch (error) {
      console.error('Optimize macros error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize macros',
        error: error.message
      });
    }
  }

  async getInsights(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile and progress data from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        30
      );

      // Get user goals from Firestore
      const goals = await firebaseService.queryFirestore(
        'goals', 
        'userId', 
        '==', 
        userId,
        10
      );

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const insights = {
        dailyInsights: this.generateDailyInsights(userProfile.profile, sortedData),
        weeklyTrends: this.generateWeeklyTrends(sortedData),
        goalProgress: this.analyzeGoalProgress(goals, sortedData),
        nutritionInsights: this.generateNutritionInsights(userProfile.profile),
        motivationalMessage: this.generateMotivationalMessage(userProfile.profile, sortedData)
      };

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Get insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate insights',
        error: error.message
      });
    }
  }

  async adjustGoals(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile and progress data from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        30
      );

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      if (progressData.length < 14) {
        return res.json({
          success: true,
          data: {
            message: 'Need at least 2 weeks of data to adjust goals'
          }
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const trends = LinearRegressionService.calculateTrend(sortedData);
      const currentRate = trends.weeklyChange;
      const targetRate = (userProfile.profile.weight - userProfile.profile.targetWeight) / 
                         ((new Date(userProfile.profile.targetDate) - new Date()) / (7 * 24 * 60 * 60 * 1000));

      let adjustedGoals = {
        targetWeight: userProfile.profile.targetWeight,
        targetDate: userProfile.profile.targetDate,
        adjustmentNeeded: false,
        recommendation: ''
      };

      if (Math.abs(currentRate) < Math.abs(targetRate) * 0.5) {
        // Progress too slow
        adjustedGoals.adjustmentNeeded = true;
        const weeksNeeded = Math.abs(userProfile.profile.weight - userProfile.profile.targetWeight) / Math.abs(currentRate);
        adjustedGoals.targetDate = new Date(Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
        adjustedGoals.recommendation = 'Based on your current progress, consider extending your target date or increasing your efforts.';
      } else if (Math.abs(currentRate) > Math.abs(targetRate) * 1.5) {
        // Progress too fast (might be unsustainable)
        adjustedGoals.adjustmentNeeded = true;
        adjustedGoals.recommendation = 'You\'re progressing faster than expected. Make sure this pace is sustainable and healthy.';
      } else {
        adjustedGoals.recommendation = 'You\'re on track to reach your goal!';
      }

      res.json({
        success: true,
        data: adjustedGoals
      });
    } catch (error) {
      console.error('Adjust goals error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to adjust goals',
        error: error.message
      });
    }
  }

  async getWorkoutRecommendations(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile and progress data from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        30
      );

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const recommendations = PredictionsService.generateWorkoutRecommendations(
        userProfile.profile,
        sortedData
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Workout recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate workout recommendations',
        error: error.message
      });
    }
  }

  async detectPlateau(req, res) {
    try {
      const userId = req.user.id;
      
      // Get progress data from Firestore
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        60
      );

      if (progressData.length < 14) {
        return res.json({
          success: true,
          data: {
            plateauDetected: false,
            message: 'Need at least 2 weeks of data to detect plateau'
          }
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const plateauDetected = this.detectPlateau(sortedData);

      res.json({
        success: true,
        data: plateauDetected
      });
    } catch (error) {
      console.error('Plateau detection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to detect plateau',
        error: error.message
      });
    }
  }

  // Helper methods
  calculateMacros(profile) {
    const { weight = 70, height = 170, age = 25, gender = 'male', activityLevel = 'moderate', goal = 'maintain' } = profile;

    // Harris-Benedict Equation
    let bmr;
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };

    let calories = bmr * (activityMultipliers[activityLevel] || 1.55);

    // Adjust for goal
    if (goal === 'lose') {
      calories -= 500; // 1 lb per week
    } else if (goal === 'gain') {
      calories += 500;
    }

    // Calculate macros
    const protein = weight * 2.2 * 0.8; // 0.8g per lb bodyweight
    const fat = calories * 0.25 / 9; // 25% of calories from fat
    const carbs = (calories - (protein * 4) - (fat * 9)) / 4;

    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat)
    };
  }

  calculateConsistency(progressData) {
    const totalDays = progressData.length;
    const workoutDays = progressData.filter(p => p.workoutCompleted).length;
    return {
      workoutConsistency: Math.round((workoutDays / totalDays) * 100),
      loggingConsistency: 100, // They logged if data exists
      overallScore: Math.round(((workoutDays / totalDays) + 1) / 2 * 100)
    };
  }

  generateRecommendations(user, progressData, trends) {
    const recommendations = [];
    
    if (trends.direction === 'plateau') {
      recommendations.push('Consider changing your workout routine or adjusting calories.');
    }
    
    if (progressData.filter(p => p.workoutCompleted).length < progressData.length * 0.3) {
      recommendations.push('Try to increase workout frequency for better results.');
    }
    
    const avgSleep = progressData.filter(p => p.sleepHours).reduce((sum, p) => sum + p.sleepHours, 0) / progressData.filter(p => p.sleepHours).length;
    if (avgSleep < 7) {
      recommendations.push('Aim for 7-9 hours of sleep for better recovery.');
    }
    
    return recommendations;
  }

  generateMacroReasoning(user, trends, progressData) {
    const reasons = [];
    
    if (user.goal === 'lose' && trends.direction !== 'losing') {
      reasons.push('Reduced calories to create a larger deficit for weight loss.');
    }
    
    if (user.goal === 'gain' && trends.direction !== 'gaining') {
      reasons.push('Increased calories to support weight gain.');
    }
    
    if (progressData.filter(p => p.workoutCompleted).length > progressData.length * 0.5) {
      reasons.push('Increased protein to support your active lifestyle.');
    }
    
    return reasons;
  }

  generateDailyInsights(user, progressData) {
    return {
      calorieTarget: user.dailyCalories,
      waterGoal: Math.round(user.weight * 35), // ml per kg
      stepGoal: 10000,
      sleepRecommendation: '7-9 hours'
    };
  }

  generateWeeklyTrends(progressData) {
    const weekData = progressData.slice(0, 7);
    return {
      avgWeight: weekData.reduce((sum, p) => sum + p.weight, 0) / weekData.length,
      workoutsCompleted: weekData.filter(p => p.workoutCompleted).length,
      avgMood: this.calculateAverageMood(weekData)
    };
  }

  calculateAverageMood(progressData) {
    const moodValues = { excellent: 5, good: 4, neutral: 3, tired: 2, exhausted: 1 };
    const moodData = progressData.filter(p => p.mood);
    if (moodData.length === 0) return 'neutral';
    
    const avg = moodData.reduce((sum, p) => sum + moodValues[p.mood], 0) / moodData.length;
    if (avg >= 4.5) return 'excellent';
    if (avg >= 3.5) return 'good';
    if (avg >= 2.5) return 'neutral';
    if (avg >= 1.5) return 'tired';
    return 'exhausted';
  }

  analyzeGoalProgress(goals, progressData) {
    return goals.map(goal => ({
      title: goal.title,
      progress: goal.progress || 0,
      onTrack: (goal.progress || 0) >= (Date.now() - new Date(goal.startDate).getTime()) / (new Date(goal.targetDate).getTime() - new Date(goal.startDate).getTime()) * 100
    }));
  }

  generateNutritionInsights(user) {
    return {
      proteinPerMeal: Math.round(user.dailyProtein / 4),
      carbTiming: 'Consider having more carbs around workouts',
      hydration: `Aim for ${Math.round(user.weight * 35)}ml of water daily`
    };
  }

  generateMotivationalMessage(user, progressData) {
    const messages = [
      'Keep up the great work!',
      'Every day is a step closer to your goal!',
      'Consistency is key to success!',
      'You\'re making amazing progress!',
      'Stay focused on your goals!'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  calculateSuccessRate(user, progressData) {
    const target = user.goal === 'lose' ? -1 : user.goal === 'gain' ? 1 : 0;
    const recent = progressData.slice(0, 7);
    
    if (recent.length < 2) return 50;
    
    const trend = (recent[0].weight - recent[recent.length - 1].weight) / recent.length;
    const success = target === 0 ? Math.abs(trend) < 0.1 : (target > 0 && trend > 0) || (target < 0 && trend < 0);
    
    return success ? 80 : 30;
  }

  detectPlateau(progressData) {
    if (progressData.length < 14) return false;
    
    const recent = progressData.slice(0, 14);
    const weights = recent.map(p => p.weight);
    const variance = this.calculateVariance(weights);
    
    return {
      plateauDetected: variance < 0.5, // Less than 0.5kg variance in 2 weeks
      duration: variance < 0.5 ? 14 : 0,
      suggestion: variance < 0.5 ? 'Consider changing your approach - try new exercises or adjust your diet' : 'Keep up the good work!'
    };
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
}

module.exports = new AIController();