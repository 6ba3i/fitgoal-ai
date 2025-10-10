const firebaseService = require('../services/firebase.service');
const admin = require('../config/firebase');

class UserController {
  async getProfile(req, res) {
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

      // Get favorite recipes
      const favoriteRecipes = await firebaseService.getFavoriteRecipes(userId);

      res.json({
        success: true,
        data: {
          ...userProfile,
          favoriteRecipes
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Get current user profile
      const currentProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!currentProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Update profile fields (excluding sensitive fields)
      const updatedProfile = {
        ...currentProfile,
        updatedAt: new Date()
      };

      // Update profile nested object
      if (updates.profile) {
        updatedProfile.profile = {
          ...currentProfile.profile,
          ...updates.profile
        };
      }

      // Update other allowed fields
      Object.keys(updates).forEach(key => {
        if (key !== 'email' && key !== 'password' && key !== 'profile') {
          updatedProfile[key] = updates[key];
        }
      });

      // Recalculate macros if relevant fields changed
      if (updates.profile && (
        updates.profile.weight || 
        updates.profile.height || 
        updates.profile.age || 
        updates.profile.gender || 
        updates.profile.activityLevel || 
        updates.profile.goal
      )) {
        const macros = this.calculateMacros(updatedProfile.profile);
        updatedProfile.profile.dailyCalories = macros.calories;
        updatedProfile.profile.dailyProtein = macros.protein;
        updatedProfile.profile.dailyCarbs = macros.carbs;
        updatedProfile.profile.dailyFat = macros.fat;
      }

      // Save to Firestore
      await firebaseService.storeInFirestore('users', userId, updatedProfile);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  async calculateMacros(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const macros = this.calculateMacros(userProfile.profile);

      // Update profile with new macros
      const updatedProfile = {
        ...userProfile,
        profile: {
          ...userProfile.profile,
          dailyCalories: macros.calories,
          dailyProtein: macros.protein,
          dailyCarbs: macros.carbs,
          dailyFat: macros.fat
        },
        updatedAt: new Date()
      };

      await firebaseService.storeInFirestore('users', userId, updatedProfile);

      res.json({
        success: true,
        data: macros
      });
    } catch (error) {
      console.error('Calculate macros error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate macros',
        error: error.message
      });
    }
  }

  async getDailyIntake(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const today = new Date().toDateString();
      const intakeDate = new Date(userProfile.dailyIntake?.date || 0).toDateString();

      // Reset intake if it's a new day
      if (intakeDate !== today) {
        const resetIntake = {
          date: new Date(),
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          meals: []
        };

        await firebaseService.storeInFirestore('users', userId, {
          ...userProfile,
          dailyIntake: resetIntake,
          updatedAt: new Date()
        });

        return res.json({
          success: true,
          data: resetIntake
        });
      }

      res.json({
        success: true,
        data: userProfile.dailyIntake
      });
    } catch (error) {
      console.error('Get daily intake error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get daily intake',
        error: error.message
      });
    }
  }

  async addToDailyIntake(req, res) {
    try {
      const userId = req.user.id;
      const { recipeId, recipeName, calories, protein, carbs, fat } = req.body;

      // Get user profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const today = new Date().toDateString();
      const intakeDate = new Date(userProfile.dailyIntake?.date || 0).toDateString();

      let dailyIntake = userProfile.dailyIntake || {
        date: new Date(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        meals: []
      };

      // Reset if new day
      if (intakeDate !== today) {
        dailyIntake = {
          date: new Date(),
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          meals: []
        };
      }

      // Add new meal
      const newMeal = {
        id: Date.now().toString(),
        recipeId,
        recipeName,
        calories,
        protein,
        carbs,
        fat,
        consumedAt: new Date()
      };

      dailyIntake.meals.push(newMeal);
      dailyIntake.calories += calories;
      dailyIntake.protein += protein;
      dailyIntake.carbs += carbs;
      dailyIntake.fat += fat;

      // Update in Firestore
      await firebaseService.storeInFirestore('users', userId, {
        ...userProfile,
        dailyIntake,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Meal added to daily intake',
        data: dailyIntake
      });
    } catch (error) {
      console.error('Add to daily intake error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add meal to daily intake',
        error: error.message
      });
    }
  }

  async removeFromDailyIntake(req, res) {
    try {
      const userId = req.user.id;
      const { mealId } = req.params;

      // Get user profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const dailyIntake = userProfile.dailyIntake;
      if (!dailyIntake || !dailyIntake.meals) {
        return res.status(404).json({
          success: false,
          message: 'No meals found'
        });
      }

      // Find and remove meal
      const mealIndex = dailyIntake.meals.findIndex(meal => meal.id === mealId);
      if (mealIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Meal not found'
        });
      }

      const removedMeal = dailyIntake.meals[mealIndex];
      dailyIntake.meals.splice(mealIndex, 1);

      // Update totals
      dailyIntake.calories -= removedMeal.calories;
      dailyIntake.protein -= removedMeal.protein;
      dailyIntake.carbs -= removedMeal.carbs;
      dailyIntake.fat -= removedMeal.fat;

      // Update in Firestore
      await firebaseService.storeInFirestore('users', userId, {
        ...userProfile,
        dailyIntake,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Meal removed from daily intake',
        data: dailyIntake
      });
    } catch (error) {
      console.error('Remove from daily intake error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove meal from daily intake',
        error: error.message
      });
    }
  }

  async resetDailyIntake(req, res) {
    try {
      const userId = req.user.id;

      // Get user profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const resetIntake = {
        date: new Date(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        meals: []
      };

      // Update in Firestore
      await firebaseService.storeInFirestore('users', userId, {
        ...userProfile,
        dailyIntake: resetIntake,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Daily intake reset successfully',
        data: resetIntake
      });
    } catch (error) {
      console.error('Reset daily intake error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset daily intake',
        error: error.message
      });
    }
  }

  async updateDailyIntake(req, res) {
    try {
      const { mealId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      // Get user profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      const dailyIntake = userProfile.dailyIntake;
      if (!dailyIntake || !dailyIntake.meals) {
        return res.status(404).json({
          success: false,
          message: 'No meals found'
        });
      }

      // Find and update meal
      const mealIndex = dailyIntake.meals.findIndex(meal => meal.id === mealId);
      if (mealIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Meal not found'
        });
      }

      const oldMeal = dailyIntake.meals[mealIndex];
      
      // Update totals
      dailyIntake.calories -= oldMeal.calories;
      dailyIntake.protein -= oldMeal.protein;
      dailyIntake.carbs -= oldMeal.carbs;
      dailyIntake.fat -= oldMeal.fat;

      // Update meal
      const updatedMeal = { ...oldMeal, ...updates, id: mealId };
      dailyIntake.meals[mealIndex] = updatedMeal;

      // Update new totals
      dailyIntake.calories += updates.calories || oldMeal.calories;
      dailyIntake.protein += updates.protein || oldMeal.protein;
      dailyIntake.carbs += updates.carbs || oldMeal.carbs;
      dailyIntake.fat += updates.fat || oldMeal.fat;

      // Update in Firestore
      await firebaseService.storeInFirestore('users', userId, {
        ...userProfile,
        dailyIntake,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Meal updated successfully',
        data: dailyIntake
      });
    } catch (error) {
      console.error('Update daily intake error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update daily intake',
        error: error.message
      });
    }
  }

  async getIntakeHistory(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, limit = 30 } = req.query;

      // Get intake history from Firestore (stored as separate collection)
      const intakeHistory = await firebaseService.queryFirestore(
        'intakeHistory', 
        'userId', 
        '==', 
        userId,
        parseInt(limit)
      );

      // Filter by date range if provided
      let filteredHistory = intakeHistory;
      if (startDate && endDate) {
        filteredHistory = intakeHistory.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
        });
      }

      // Sort by date (most recent first)
      filteredHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.json({
        success: true,
        data: filteredHistory
      });
    } catch (error) {
      console.error('Get intake history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get intake history',
        error: error.message
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile and progress data
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

      // Get favorite recipes count
      const favoriteRecipes = await firebaseService.getFavoriteRecipes(userId);

      // Sort progress by date (most recent first)
      const sortedProgress = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate stats
      const stats = {
        currentWeight: userProfile.profile.weight,
        targetWeight: userProfile.profile.targetWeight,
        weightChange: sortedProgress.length > 0 
          ? userProfile.profile.weight - sortedProgress[sortedProgress.length - 1].weight 
          : 0,
        daysOnPlatform: Math.floor((Date.now() - new Date(userProfile.createdAt)) / (1000 * 60 * 60 * 24)),
        totalWorkouts: sortedProgress.filter(p => p.workoutCompleted).length,
        averageCalories: userProfile.profile.dailyCalories,
        favoriteRecipesCount: favoriteRecipes.length,
        currentStreak: this.calculateStreak(sortedProgress),
        goalProgress: this.calculateGoalProgress(userProfile.profile, sortedProgress),
        weeklyAverage: this.calculateWeeklyAverage(sortedProgress)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user stats',
        error: error.message
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Note: Firebase Admin SDK doesn't verify passwords directly
      // In a real implementation, you would need to verify the current password
      // For now, we'll just update the password
      
      try {
        await firebaseService.updateUser(userId, { password: newPassword });

        res.json({
          success: true,
          message: 'Password changed successfully'
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Failed to change password',
          error: error.message
        });
      }
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }

  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;

      // Delete user from Firebase Auth
      await firebaseService.deleteUser(userId);

      // Delete user data from Firestore
      await firebaseService.deleteFromFirestore('users', userId);

      // Delete related data
      const progressData = await firebaseService.queryFirestore('progress', 'userId', '==', userId, 1000);
      const deletePromises = progressData.map(progress => 
        firebaseService.deleteFromFirestore('progress', progress.id)
      );
      await Promise.all(deletePromises);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        error: error.message
      });
    }
  }

  // Helper methods
  calculateStreak(progressData) {
    if (!progressData || progressData.length === 0) return 0;
    
    let streak = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    
    for (let i = 0; i < progressData.length; i++) {
      const progressDate = new Date(progressData[i].date).setHours(0, 0, 0, 0);
      const expectedDate = today - (i * 24 * 60 * 60 * 1000);
      
      if (progressDate === expectedDate) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  calculateGoalProgress(profile, progressData) {
    if (!progressData.length) return 0;
    
    const { weight: currentWeight, targetWeight, goal } = profile;
    const startWeight = progressData[progressData.length - 1]?.weight || currentWeight;
    
    let progress = 0;
    if (goal === 'lose') {
      progress = ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100;
    } else if (goal === 'gain') {
      progress = ((currentWeight - startWeight) / (targetWeight - startWeight)) * 100;
    } else {
      progress = Math.abs(currentWeight - targetWeight) <= 1 ? 100 : 0;
    }
    
    return Math.max(0, Math.min(100, progress));
  }

  calculateWeeklyAverage(progressData) {
    const lastWeek = progressData.slice(0, 7);
    if (lastWeek.length === 0) return 0;
    
    return lastWeek.reduce((sum, entry) => sum + entry.weight, 0) / lastWeek.length;
  }

  // Helper method to calculate macros (same as in auth controller)
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
}

module.exports = new UserController();