const User = require('../models/User');
const Progress = require('../models/Progress');
const Goal = require('../models/Goal');
const LinearRegressionService = require('../services/ai/linearRegression');
const KMeansService = require('../services/ai/kMeans');
const PredictionsService = require('../services/ai/predictions');

class AIController {
  async predictWeight(req, res) {
    try {
      const userId = req.user.id;
      const { daysAhead = 30 } = req.body;

      // Get user's progress data
      const progressData = await Progress.getUserProgress(userId, 90);

      if (progressData.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Not enough progress data for predictions. Please log at least 2 entries.'
        });
      }

      // Generate predictions
      const predictions = LinearRegressionService.predictWeight(
        progressData,
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
      const user = await User.findById(userId);

      // Calculate calorie deficit/surplus needed
      const recommendation = LinearRegressionService.calculateCalorieDeficit(
        user.profile.weight,
        user.profile.targetWeight,
        user.profile.targetDate
      );

      // Get current macros
      const currentMacros = user.calculateMacros();

      // Adjust based on recommendation
      const adjustedCalories = currentMacros.calories + recommendation.dailyDeficit;
      
      const adjustedMacros = {
        calories: Math.max(1200, Math.min(4000, adjustedCalories)), // Safety limits
        protein: Math.round(user.profile.weight * 2.2 * 0.8),
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
      
      const user = await User.findById(userId);
      
      // Cluster recipes based on user profile
      const clusters = KMeansService.clusterRecipes(recipes, user.profile, k);

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
      const user = await User.findById(userId);
      const progressData = await Progress.getUserProgress(userId, 30);

      if (progressData.length < 7) {
        return res.json({
          success: true,
          data: {
            message: 'Continue logging for at least a week to get detailed analysis'
          }
        });
      }

      // Analyze trends
      const trends = LinearRegressionService.calculateTrend(progressData);
      const predictions = LinearRegressionService.predictWeight(progressData, 30);

      // Calculate insights
      const insights = {
        weightTrend: trends,
        predictions: predictions.predictions.slice(0, 7), // Next week
        consistency: this.calculateConsistency(progressData),
        recommendations: this.generateRecommendations(user, progressData, trends),
        plateauDetected: this.detectPlateau(progressData),
        successRate: this.calculateSuccessRate(user, progressData)
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
      const user = await User.findById(userId);

      // This would integrate with Spoonacular API for real meal plans
      // For now, returning a structured meal plan based on user's macros
      const dailyMacros = user.calculateMacros();
      
      const mealPlan = [];
      for (let i = 0; i < days; i++) {
        mealPlan.push({
          day: i + 1,
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          meals: {
            breakfast: {
              calories: Math.round(dailyMacros.calories * 0.25),
              protein: Math.round(dailyMacros.protein * 0.25),
              carbs: Math.round(dailyMacros.carbs * 0.25),
              fat: Math.round(dailyMacros.fat * 0.25)
            },
            lunch: {
              calories: Math.round(dailyMacros.calories * 0.35),
              protein: Math.round(dailyMacros.protein * 0.35),
              carbs: Math.round(dailyMacros.carbs * 0.35),
              fat: Math.round(dailyMacros.fat * 0.35)
            },
            dinner: {
              calories: Math.round(dailyMacros.calories * 0.30),
              protein: Math.round(dailyMacros.protein * 0.30),
              carbs: Math.round(dailyMacros.carbs * 0.30),
              fat: Math.round(dailyMacros.fat * 0.30)
            },
            snacks: {
              calories: Math.round(dailyMacros.calories * 0.10),
              protein: Math.round(dailyMacros.protein * 0.10),
              carbs: Math.round(dailyMacros.carbs * 0.10),
              fat: Math.round(dailyMacros.fat * 0.10)
            }
          },
          totals: dailyMacros
        });
      }

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
      const user = await User.findById(userId);
      const progressData = await Progress.getUserProgress(userId, 30);

      // Analyze current progress
      const trends = LinearRegressionService.calculateTrend(progressData);
      
      // Optimize macros based on progress
      let optimizedMacros = user.calculateMacros();
      
      if (user.profile.goal === 'lose' && trends.direction !== 'losing') {
        // Not losing weight, increase deficit
        optimizedMacros.calories = Math.max(1200, optimizedMacros.calories - 200);
      } else if (user.profile.goal === 'gain' && trends.direction !== 'gaining') {
        // Not gaining weight, increase surplus
        optimizedMacros.calories = Math.min(4000, optimizedMacros.calories + 200);
      }
      
      // Adjust protein based on activity
      if (progressData.filter(p => p.workoutCompleted).length > progressData.length * 0.5) {
        optimizedMacros.protein = Math.round(user.profile.weight * 2.2 * 1.0); // Increase protein
      }
      
      // Recalculate other macros
      optimizedMacros.carbs = Math.round(optimizedMacros.calories * 0.4 / 4);
      optimizedMacros.fat = Math.round(optimizedMacros.calories * 0.3 / 9);

      res.json({
        success: true,
        data: {
          current: user.calculateMacros(),
          optimized: optimizedMacros,
          reasoning: this.generateMacroReasoning(user, trends, progressData)
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
      const user = await User.findById(userId);
      const progressData = await Progress.getUserProgress(userId, 30);
      const goals = await Goal.getActiveGoals(userId);

      const insights = {
        dailyInsights: this.generateDailyInsights(user, progressData),
        weeklyTrends: this.generateWeeklyTrends(progressData),
        goalProgress: this.analyzeGoalProgress(goals, progressData),
        nutritionInsights: this.generateNutritionInsights(user),
        motivationalMessage: this.generateMotivationalMessage(user, progressData)
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
      const user = await User.findById(userId);
      const progressData = await Progress.getUserProgress(userId, 30);

      if (progressData.length < 14) {
        return res.json({
          success: true,
          data: {
            message: 'Need at least 2 weeks of data to adjust goals'
          }
        });
      }

      const trends = LinearRegressionService.calculateTrend(progressData);
      const currentRate = trends.weeklyChange;
      const targetRate = (user.profile.weight - user.profile.targetWeight) / 
                         ((new Date(user.profile.targetDate) - new Date()) / (7 * 24 * 60 * 60 * 1000));

      let adjustedGoals = {
        targetWeight: user.profile.targetWeight,
        targetDate: user.profile.targetDate,
        adjustmentNeeded: false,
        recommendation: ''
      };

      if (Math.abs(currentRate) < Math.abs(targetRate) * 0.5) {
        // Progress too slow
        adjustedGoals.adjustmentNeeded = true;
        const weeksNeeded = Math.abs(user.profile.weight - user.profile.targetWeight) / Math.abs(currentRate);
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
      const user = await User.findById(userId);
      const progressData = await Progress.getUserProgress(userId, 7);

      const recommendations = {
        cardio: this.recommendCardio(user.profile),
        strength: this.recommendStrength(user.profile),
        flexibility: this.recommendFlexibility(user.profile),
        weeklySchedule: this.generateWeeklyWorkoutSchedule(user.profile)
      };

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Get workout recommendations error:', error);
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
      const progressData = await Progress.getUserProgress(userId, 21);

      if (progressData.length < 14) {
        return res.json({
          success: true,
          data: {
            plateauDetected: false,
            message: 'Need at least 2 weeks of data to detect plateaus'
          }
        });
      }

      const plateauInfo = this.detectPlateau(progressData);
      
      let recommendations = [];
      if (plateauInfo) {
        recommendations = [
          'Consider changing your workout routine',
          'Try intermittent fasting or carb cycling',
          'Ensure you\'re getting enough sleep',
          'Reassess your calorie intake',
          'Add more variety to your meals'
        ];
      }

      res.json({
        success: true,
        data: {
          plateauDetected: !!plateauInfo,
          duration: plateauInfo ? plateauInfo.duration : 0,
          recommendations
        }
      });
    } catch (error) {
      console.error('Detect plateau error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to detect plateau',
        error: error.message
      });
    }
  }

  // Helper methods
  calculateConsistency(progressData) {
    const expectedDays = progressData.length;
    const actualDays = new Set(progressData.map(p => 
      new Date(p.date).toISOString().split('T')[0]
    )).size;
    return (actualDays / expectedDays) * 100;
  }

  generateRecommendations(user, progressData, trends) {
    const recommendations = [];
    
    if (trends.pace === 'fast') {
      recommendations.push('Your weight change is rapid. Ensure you\'re losing/gaining healthily.');
    }
    
    if (progressData.filter(p => p.workoutCompleted).length < progressData.length * 0.3) {
      recommendations.push('Try to increase your workout frequency for better results.');
    }
    
    if (user.profile.goal === 'lose' && trends.direction !== 'losing') {
      recommendations.push('Consider reducing calorie intake or increasing activity.');
    }
    
    return recommendations;
  }

  detectPlateau(progressData) {
    if (progressData.length < 14) return null;
    
    const recentWeights = progressData.slice(0, 14).map(p => p.weight);
    const avgWeight = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length;
    const variance = recentWeights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / recentWeights.length;
    
    if (variance < 0.5) {
      return { duration: 14, avgWeight };
    }
    
    return null;
  }

  calculateSuccessRate(user, progressData) {
    const totalChange = Math.abs(user.profile.targetWeight - progressData[progressData.length - 1].weight);
    const achievedChange = Math.abs(progressData[0].weight - progressData[progressData.length - 1].weight);
    return Math.min(100, (achievedChange / totalChange) * 100);
  }

  generateMacroReasoning(user, trends, progressData) {
    const reasons = [];
    
    if (trends.direction !== user.profile.goal) {
      reasons.push('Adjusting calories to better align with your goal.');
    }
    
    if (progressData.filter(p => p.workoutCompleted).length > progressData.length * 0.5) {
      reasons.push('Increased protein to support your active lifestyle.');
    }
    
    return reasons;
  }

  generateDailyInsights(user, progressData) {
    return {
      calorieTarget: user.profile.dailyCalories,
      waterGoal: Math.round(user.profile.weight * 35), // ml per kg
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
      progress: goal.progress,
      onTrack: goal.progress >= (Date.now() - goal.startDate) / (goal.targetDate - goal.startDate) * 100
    }));
  }

  generateNutritionInsights(user) {
    return {
      proteinPerMeal: Math.round(user.profile.dailyProtein / 4),
      carbTiming: 'Consider having more carbs around workouts',
      hydration: `Aim for ${Math.round(user.profile.weight * 35)}ml of water daily`
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

  recommendCardio(profile) {
    const { goal, activityLevel } = profile;
    
    if (goal === 'lose') {
      return {
        frequency: '4-5 times per week',
        duration: '30-45 minutes',
        intensity: 'Moderate to high',
        types: ['Running', 'Cycling', 'HIIT', 'Swimming']
      };
    } else if (goal === 'gain') {
      return {
        frequency: '2-3 times per week',
        duration: '20-30 minutes',
        intensity: 'Low to moderate',
        types: ['Walking', 'Light cycling', 'Yoga']
      };
    } else {
      return {
        frequency: '3-4 times per week',
        duration: '30 minutes',
        intensity: 'Moderate',
        types: ['Jogging', 'Cycling', 'Swimming', 'Dancing']
      };
    }
  }

  recommendStrength(profile) {
    const { goal, activityLevel } = profile;
    
    return {
      frequency: goal === 'gain' ? '4-5 times per week' : '3-4 times per week',
      split: goal === 'gain' ? 'Push/Pull/Legs' : 'Full body',
      sets: goal === 'gain' ? '4-5' : '3-4',
      reps: goal === 'gain' ? '6-12' : '12-15'
    };
  }

  recommendFlexibility(profile) {
    return {
      frequency: 'Daily',
      duration: '10-15 minutes',
      types: ['Static stretching', 'Dynamic stretching', 'Yoga', 'Foam rolling']
    };
  }

  generateWeeklyWorkoutSchedule(profile) {
    const { goal } = profile;
    
    if (goal === 'lose') {
      return {
        monday: 'Cardio + Core',
        tuesday: 'Strength Training - Upper Body',
        wednesday: 'HIIT',
        thursday: 'Strength Training - Lower Body',
        friday: 'Cardio',
        saturday: 'Full Body Strength',
        sunday: 'Rest or Light Yoga'
      };
    } else if (goal === 'gain') {
      return {
        monday: 'Chest & Triceps',
        tuesday: 'Back & Biceps',
        wednesday: 'Legs',
        thursday: 'Shoulders & Abs',
        friday: 'Arms',
        saturday: 'Legs',
        sunday: 'Rest'
      };
    } else {
      return {
        monday: 'Full Body Strength',
        tuesday: 'Cardio',
        wednesday: 'Upper Body Strength',
        thursday: 'Yoga or Rest',
        friday: 'Lower Body Strength',
        saturday: 'Cardio',
        sunday: 'Rest or Light Activity'
      };
    }
  }
}

module.exports = new AIController();