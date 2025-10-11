const firebaseService = require('../services/firebase.service');
const LinearRegressionService = require('../services/ai/linearRegression');
const KMeansService = require('../services/ai/kMeans');

// ==================== HELPER FUNCTIONS (OUTSIDE CLASS) ====================

const calculateMacros = (profile) => {
  let bmr;
  if (profile.gender === 'male') {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };

  const tdee = bmr * (activityMultipliers[profile.activityLevel] || 1.55);
  
  let calories = tdee;
  if (profile.goal === 'lose') {
    calories = tdee - 500;
  } else if (profile.goal === 'gain') {
    calories = tdee + 500;
  }

  const protein = Math.round(profile.weight * 2.2);
  const fat = Math.round(calories * 0.3 / 9);
  const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

  return {
    calories: Math.round(calories),
    protein,
    carbs,
    fat
  };
};

const calculateConsistency = (progressData) => {
  if (progressData.length < 7) return 0;
  const weekData = progressData.slice(0, 7);
  return Math.round((weekData.length / 7) * 100);
};

const generateRecommendations = (user, progressData, trends) => {
  const recommendations = [];
  
  if (trends.direction === 'stable' && user.goal !== 'maintain') {
    recommendations.push('Your weight is stable. Consider adjusting your calorie intake.');
  }
  
  if (progressData.filter(p => p.workoutCompleted).length < progressData.length * 0.3) {
    recommendations.push('Try to increase workout frequency for better results.');
  }
  
  const avgSleep = progressData
    .filter(p => p.sleepHours)
    .reduce((sum, p) => sum + p.sleepHours, 0) / progressData.filter(p => p.sleepHours).length;
  
  if (avgSleep < 7) {
    recommendations.push('Aim for 7-9 hours of sleep for better recovery.');
  }
  
  return recommendations;
};

const calculateSuccessRate = (user, progressData) => {
  const target = user.goal === 'lose' ? -1 : user.goal === 'gain' ? 1 : 0;
  const recent = progressData.slice(0, 7);
  
  if (recent.length < 2) return 50;
  
  const trend = (recent[0].weight - recent[recent.length - 1].weight) / recent.length;
  const success = target === 0 
    ? Math.abs(trend) < 0.1 
    : (target > 0 && trend > 0) || (target < 0 && trend < 0);
  
  return success ? 80 : 30;
};

const detectPlateauHelper = (progressData) => {
  if (progressData.length < 14) return { plateauDetected: false, duration: 0 };
  
  const recent = progressData.slice(0, 14);
  const weights = recent.map(p => p.weight);
  const variance = calculateVariance(weights);
  
  return {
    plateauDetected: variance < 0.5,
    duration: variance < 0.5 ? 14 : 0,
    suggestion: variance < 0.5 
      ? 'Consider changing your approach - try new exercises or adjust your diet' 
      : 'Keep up the good work!'
  };
};

const calculateVariance = (numbers) => {
  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length);
};

const generateMacroReasoning = (user, trends, progressData) => {
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
};

const generateDailyInsights = (user, progressData) => {
  return {
    calorieTarget: user.dailyCalories,
    waterGoal: Math.round(user.weight * 35),
    stepGoal: 10000,
    sleepRecommendation: '7-9 hours'
  };
};

const generateWeeklyTrends = (progressData) => {
  const weekData = progressData.slice(0, 7);
  return {
    avgWeight: weekData.reduce((sum, p) => sum + p.weight, 0) / weekData.length,
    workoutsCompleted: weekData.filter(p => p.workoutCompleted).length,
    avgMood: calculateAverageMood(weekData)
  };
};

const calculateAverageMood = (progressData) => {
  const moodValues = { excellent: 5, good: 4, neutral: 3, tired: 2, exhausted: 1 };
  const moodData = progressData.filter(p => p.mood);
  if (moodData.length === 0) return 'neutral';
  
  const avg = moodData.reduce((sum, p) => sum + moodValues[p.mood], 0) / moodData.length;
  if (avg >= 4.5) return 'excellent';
  if (avg >= 3.5) return 'good';
  if (avg >= 2.5) return 'neutral';
  if (avg >= 1.5) return 'tired';
  return 'exhausted';
};

const analyzeGoalProgress = (goals, progressData) => {
  if (!goals || goals.length === 0) return [];
  
  return goals.map(goal => ({
    title: goal.title,
    progress: goal.progress || 0,
    onTrack: (goal.progress || 0) >= 
      (Date.now() - new Date(goal.startDate).getTime()) / 
      (new Date(goal.targetDate).getTime() - new Date(goal.startDate).getTime()) * 100
  }));
};

const generateNutritionInsights = (user) => {
  return {
    proteinPerMeal: Math.round((user.dailyProtein || 150) / 4),
    carbTiming: 'Consider having more carbs around workouts',
    hydration: `Aim for ${Math.round(user.weight * 35)}ml of water daily`
  };
};

const generateMotivationalMessage = (user, progressData) => {
  const messages = [
    'Keep up the great work!',
    'Every day is a step closer to your goal!',
    'Consistency is key to success!',
    'You\'re making amazing progress!',
    'Stay focused on your goals!'
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

// ==================== CONTROLLER CLASS ====================

class AIController {
  // ==================== 1. PREDICT WEIGHT ====================
  async predictWeight(req, res) {
    try {
      const userId = req.user.id;
      const { daysAhead = 30 } = req.body;

      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'uid', 
        '==', 
        userId,
        90
      );

      if (progressData.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Not enough progress data. Please log at least 2 entries.'
        });
      }

      const sortedData = progressData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });

      const predictions = LinearRegressionService.predictWeight(sortedData, daysAhead);

      res.json({
        success: true,
        data: predictions
      });
    } catch (error) {
      console.error('Prediction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to predict weight',
        error: error.message
      });
    }
  }

  // ==================== 2. RECOMMEND CALORIES ====================
  async recommendCalories(req, res) {
    try {
      const userId = req.user.id;
      
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile || !userProfile.profile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const user = userProfile.profile;

      const recommendation = LinearRegressionService.calculateCalorieDeficit(
        user.weight,
        user.targetWeight,
        user.targetDate
      );

      const currentMacros = calculateMacros(user);

      const adjustedCalories = currentMacros.calories + recommendation.dailyDeficit;
      
      const adjustedMacros = {
        calories: Math.max(1200, Math.min(4000, adjustedCalories)),
        protein: Math.round(user.weight * 2.2),
        carbs: Math.round(adjustedCalories * 0.4 / 4),
        fat: Math.round(adjustedCalories * 0.3 / 9),
        message: recommendation.feasible 
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

  // ==================== 3. CLUSTER RECIPES ====================
  async clusterRecipes(req, res) {
    try {
      const userId = req.user.id;
      const { recipes, k = 3 } = req.body;
      
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }
      
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

// ==================== 4. DETECT PLATEAU ====================
  async detectPlateau(req, res) {
    try {
      const userId = req.user.id;

      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'uid', 
        '==', 
        userId,
        30
      );

      const progressArray = Array.isArray(progressData) ? progressData : [];

      if (progressArray.length < 14) {
        return res.json({
          success: true,
          plateauDetected: false,
          message: 'Need at least 14 days of data to detect plateau'
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressArray.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });

      const recentData = sortedData.slice(0, 14);
      
      const weights = recentData.map(entry => entry.weight);
      const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
      
      // Calculate weight change from oldest to newest in the 14-day window
      const oldestWeight = weights[weights.length - 1]; // 14 days ago
      const newestWeight = weights[0]; // Today
      const totalChange = newestWeight - oldestWeight;
      const dailyChange = totalChange / 14;
      
      // Plateau = less than 0.1kg change over 14 days (~7g per day)
      const plateauDetected = Math.abs(totalChange) < 0.1;

      console.log('📊 Plateau detection:', {
        oldestWeight,
        newestWeight,
        totalChange: totalChange.toFixed(3),
        dailyChange: (dailyChange * 1000).toFixed(1) + 'g',
        plateauDetected
      });

      if (!plateauDetected) {
        const userProfile = await firebaseService.getFromFirestore('users', userId);
        const userGoal = userProfile?.profile?.goal || 'maintain';
        
        // Positive feedback based on user goal
        let message = 'No plateau detected. Keep going!';
        let suggestions = [];
        
        if (userGoal === 'lose' && totalChange < 0) {
          message = `Great progress! You're losing ${Math.abs(dailyChange * 1000).toFixed(0)}g per day. Keep up the excellent work!`;
          suggestions = [
            {
              title: 'Maintain Current Plan',
              description: 'Your current approach is working well',
              priority: 'high'
            },
            {
              title: 'Stay Consistent',
              description: 'Continue logging your meals and workouts daily',
              priority: 'medium'
            },
            {
              title: 'Stay Hydrated',
              description: 'Drink at least 2-3 liters of water daily',
              priority: 'low'
            }
          ];
        } else if (userGoal === 'gain' && totalChange > 0) {
          message = `Excellent! You're gaining ${Math.abs(dailyChange * 1000).toFixed(0)}g per day. Stay on track!`;
          suggestions = [
            {
              title: 'Keep Eating Surplus',
              description: 'Maintain your current calorie surplus',
              priority: 'high'
            },
            {
              title: 'Progressive Overload',
              description: 'Gradually increase weights in your workouts',
              priority: 'medium'
            },
            {
              title: 'Rest & Recover',
              description: 'Get 7-9 hours of sleep for muscle growth',
              priority: 'low'
            }
          ];
        } else if (userGoal === 'maintain' && Math.abs(totalChange) < 0.5) {
          message = 'Perfect! Your weight is stable. Keep maintaining!';
          suggestions = [
            {
              title: 'Keep Current Balance',
              description: 'Your calorie intake matches your expenditure',
              priority: 'high'
            },
            {
              title: 'Regular Activity',
              description: 'Maintain your current exercise routine',
              priority: 'medium'
            }
          ];
        } else {
          // Weight is changing but not in the direction of the goal
          message = `Your weight is changing, but may not align with your "${userGoal}" goal. Consider adjusting your plan.`;
          suggestions = [
            {
              title: 'Review Your Goal',
              description: 'Ensure your nutrition aligns with your fitness goal',
              priority: 'high'
            }
          ];
        }
        
        return res.json({
          success: true,
          plateauDetected: false,
          message,
          suggestions,
          currentTrend: {
            totalChange: Math.round(totalChange * 1000) / 1000,
            dailyChange: Math.round(dailyChange * 1000 * 10) / 10,
            period: 14
          }
        });
      }

      // If plateau detected
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const currentCalories = userProfile?.profile?.dailyCalories || 2000;
      const currentWeight = newestWeight;

      const suggestions = [
        {
          title: 'Reduce Daily Calories',
          description: `Try reducing your intake by 200-300 calories (from ${currentCalories} to ${currentCalories - 250} kcal)`,
          priority: 'high'
        },
        {
          title: 'Increase Exercise Intensity',
          description: 'Add 20 minutes of cardio or increase workout intensity by 15%',
          priority: 'high'
        },
        {
          title: 'Track Everything',
          description: 'Log ALL meals and snacks for 7 days - hidden calories might be the issue',
          priority: 'medium'
        },
        {
          title: 'Change Workout Routine',
          description: 'Your body may have adapted. Try a new exercise program or sport',
          priority: 'medium'
        },
        {
          title: 'Increase Protein',
          description: 'Boost protein to 2g per kg body weight to preserve muscle during deficit',
          priority: 'low'
        }
      ];

      const recommendedPlan = {
        newCalories: currentCalories - 250,
        newProtein: Math.round(currentWeight * 2),
        newCarbs: Math.round(((currentCalories - 250) * 0.35) / 4),
        newFat: Math.round(((currentCalories - 250) * 0.25) / 9),
        checkInDays: 7
      };

      res.json({
        success: true,
        plateauDetected: true,
        duration: 14,
        avgWeight: Math.round(avgWeight * 10) / 10,
        totalChange: Math.round(totalChange * 1000) / 1000,
        suggestions,
        recommendedPlan,
        message: `Plateau detected: Weight stable at ${Math.round(avgWeight * 10) / 10} kg for 14 days (only ${Math.abs(totalChange * 1000).toFixed(0)}g change)`
      });

    } catch (error) {
      console.error('❌ Detect plateau error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to detect plateau',
        error: error.message
      });
    }
  }

  // ==================== 5. ANALYZE PROGRESS ====================
  async analyzeProgress(req, res) {
    try {
      const userId = req.user.id;
      
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'uid', 
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

      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const trends = LinearRegressionService.calculateTrend(sortedData);
      const predictions = LinearRegressionService.predictWeight(sortedData, 30);

      const insights = {
        weightTrend: trends,
        predictions: predictions.predictions.slice(0, 7),
        consistency: calculateConsistency(sortedData),
        recommendations: generateRecommendations(userProfile.profile, sortedData, trends),
        plateauDetected: detectPlateauHelper(sortedData),
        successRate: calculateSuccessRate(userProfile.profile, sortedData)
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

  // ==================== 6. GENERATE MEAL PLAN ====================
  async generateMealPlan(req, res) {
    try {
      const userId = req.user.id;
      const { days = 7 } = req.body;

      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const favoriteRecipes = await firebaseService.getFavoriteRecipes(userId);

      const macros = calculateMacros(userProfile.profile);
      const mealPlan = [];

      for (let i = 0; i < days; i++) {
        mealPlan.push({
          day: i + 1,
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          meals: {
            breakfast: {
              calories: Math.round(macros.calories * 0.25),
              protein: Math.round(macros.protein * 0.25),
              carbs: Math.round(macros.carbs * 0.25),
              fat: Math.round(macros.fat * 0.25)
            },
            lunch: {
              calories: Math.round(macros.calories * 0.35),
              protein: Math.round(macros.protein * 0.35),
              carbs: Math.round(macros.carbs * 0.35),
              fat: Math.round(macros.fat * 0.35)
            },
            dinner: {
              calories: Math.round(macros.calories * 0.30),
              protein: Math.round(macros.protein * 0.30),
              carbs: Math.round(macros.carbs * 0.30),
              fat: Math.round(macros.fat * 0.30)
            },
            snacks: {
              calories: Math.round(macros.calories * 0.10),
              protein: Math.round(macros.protein * 0.10),
              carbs: Math.round(macros.carbs * 0.10),
              fat: Math.round(macros.fat * 0.10)
            }
          }
        });
      }

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

  // ==================== 7. OPTIMIZE MACROS ====================
  async optimizeMacros(req, res) {
    try {
      const userId = req.user.id;
      
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'uid', 
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

      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const trends = LinearRegressionService.calculateTrend(sortedData);
      
      let optimizedMacros = calculateMacros(userProfile.profile);
      
      if (userProfile.profile.goal === 'lose' && trends.direction !== 'losing') {
        optimizedMacros.calories = Math.max(1200, optimizedMacros.calories - 200);
      } else if (userProfile.profile.goal === 'gain' && trends.direction !== 'gaining') {
        optimizedMacros.calories = Math.min(4000, optimizedMacros.calories + 200);
      }
      
      const activeCount = sortedData.filter(p => p.workoutCompleted).length;
      if (activeCount > sortedData.length * 0.5) {
        optimizedMacros.protein = Math.round(userProfile.profile.weight * 2.2 * 1.0);
      }
      
      optimizedMacros.carbs = Math.round(optimizedMacros.calories * 0.4 / 4);
      optimizedMacros.fat = Math.round(optimizedMacros.calories * 0.3 / 9);

      res.json({
        success: true,
        data: {
          current: calculateMacros(userProfile.profile),
          optimized: optimizedMacros,
          reasoning: generateMacroReasoning(userProfile.profile, trends, sortedData)
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

  // ==================== 8. GET INSIGHTS ====================
  async getInsights(req, res) {
    try {
      const userId = req.user.id;
      
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'uid', 
        '==', 
        userId,
        30
      );

      const goals = await firebaseService.queryFirestore(
        'goals', 
        'uid', 
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

      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const insights = {
        dailyInsights: generateDailyInsights(userProfile.profile, sortedData),
        weeklyTrends: generateWeeklyTrends(sortedData),
        goalProgress: analyzeGoalProgress(goals, sortedData),
        nutritionInsights: generateNutritionInsights(userProfile.profile),
        motivationalMessage: generateMotivationalMessage(userProfile.profile, sortedData)
      };

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Get insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get insights',
        error: error.message
      });
    }
  }

  // ==================== 9. ADJUST GOALS ====================
  async adjustGoals(req, res) {
    try {
      const userId = req.user.id;
      
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'uid', 
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

      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const currentWeight = sortedData[0]?.weight || userProfile.profile.weight;
      const targetWeight = userProfile.profile.targetWeight;
      const targetDate = new Date(userProfile.profile.targetDate);
      const daysToGoal = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));
      const weeksToGoal = daysToGoal / 7;

      const weightDiff = targetWeight - currentWeight;
      const currentRate = weightDiff / weeksToGoal;
      const targetRate = userProfile.profile.goal === 'lose' ? -0.5 : 0.5;

      const adjustedGoals = {
        currentRate: Math.round(currentRate * 100) / 100,
        targetRate,
        adjustmentNeeded: false,
        recommendation: ''
      };

      if (Math.abs(currentRate) < Math.abs(targetRate) * 0.5) {
        adjustedGoals.adjustmentNeeded = true;
        adjustedGoals.recommendation = 'You\'re progressing slowly. Consider adjusting your approach.';
      } else if (Math.abs(currentRate) > Math.abs(targetRate) * 1.5) {
        adjustedGoals.adjustmentNeeded = true;
        adjustedGoals.recommendation = 'You\'re progressing faster than expected. Make sure this pace is sustainable.';
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

  // ==================== 10. GET WORKOUT RECOMMENDATIONS ====================
  async getWorkoutRecommendations(req, res) {
    try {
      const userId = req.user.id;
      
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'uid', 
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

      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      const workoutFrequency = sortedData.filter(p => p.workoutCompleted).length;
      const goal = userProfile.profile.goal;

      let recommendations = [];

      if (goal === 'lose') {
        recommendations = [
          { type: 'Cardio', frequency: '4-5x per week', duration: '30-45 min', intensity: 'Moderate to High' },
          { type: 'Strength', frequency: '2-3x per week', duration: '30-40 min', intensity: 'Moderate' },
          { type: 'HIIT', frequency: '1-2x per week', duration: '20-30 min', intensity: 'High' }
        ];
      } else if (goal === 'gain') {
        recommendations = [
          { type: 'Strength', frequency: '4-5x per week', duration: '45-60 min', intensity: 'High' },
          { type: 'Cardio', frequency: '2-3x per week', duration: '20-30 min', intensity: 'Low to Moderate' }
        ];
      } else {
        recommendations = [
          { type: 'Mixed Training', frequency: '3-4x per week', duration: '30-45 min', intensity: 'Moderate' },
          { type: 'Flexibility', frequency: '2-3x per week', duration: '15-20 min', intensity: 'Low' }
        ];
      }

      res.json({
        success: true,
        data: {
          currentFrequency: workoutFrequency,
          recommendations
        }
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
}

module.exports = new AIController();