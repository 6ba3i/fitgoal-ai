const User = require('../models/User');
const Progress = require('../models/Progress');

class UserController {
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('favoriteRecipes');

      res.json({
        success: true,
        data: user
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
      const updates = req.body;
      const user = await User.findById(req.user.id);

      // Update profile fields
      Object.keys(updates).forEach(key => {
        if (key !== 'email' && key !== 'password') {
          if (typeof user.profile[key] !== 'undefined') {
            user.profile[key] = updates[key];
          } else {
            user[key] = updates[key];
          }
        }
      });

      // Recalculate macros if relevant fields changed
      if (updates.weight || updates.height || updates.age || 
          updates.gender || updates.activityLevel || updates.goal) {
        user.calculateMacros();
      }

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user
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
      const user = await User.findById(req.user.id);
      const macros = user.calculateMacros();

      await user.save();

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
      const user = await User.findById(req.user.id);
      
      // Reset if it's a new day
      const today = new Date().setHours(0, 0, 0, 0);
      const intakeDate = new Date(user.dailyIntake.date).setHours(0, 0, 0, 0);
      
      if (today !== intakeDate) {
        user.dailyIntake = {
          date: new Date(),
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          meals: []
        };
        await user.save();
      }

      res.json({
        success: true,
        data: user.dailyIntake
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
      const { recipeId, recipeName, calories, protein, carbs, fat } = req.body;
      const user = await User.findById(req.user.id);

      // Reset if it's a new day
      const today = new Date().setHours(0, 0, 0, 0);
      const intakeDate = new Date(user.dailyIntake.date).setHours(0, 0, 0, 0);
      
      if (today !== intakeDate) {
        user.dailyIntake = {
          date: new Date(),
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          meals: []
        };
      }

      // Add meal to daily intake
      user.dailyIntake.meals.push({
        recipeId,
        recipeName,
        calories,
        protein,
        carbs,
        fat,
        consumedAt: new Date()
      });

      // Update totals
      user.dailyIntake.calories += calories;
      user.dailyIntake.protein += protein;
      user.dailyIntake.carbs += carbs;
      user.dailyIntake.fat += fat;

      await user.save();

      res.json({
        success: true,
        message: 'Meal added to daily intake',
        data: user.dailyIntake
      });
    } catch (error) {
      console.error('Add to daily intake error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add to daily intake',
        error: error.message
      });
    }
  }

  async updateDailyIntake(req, res) {
    try {
      const { mealId } = req.params;
      const updates = req.body;
      const user = await User.findById(req.user.id);

      const mealIndex = user.dailyIntake.meals.findIndex(
        meal => meal._id.toString() === mealId
      );

      if (mealIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Meal not found'
        });
      }

      const oldMeal = user.dailyIntake.meals[mealIndex];
      
      // Update totals
      user.dailyIntake.calories -= oldMeal.calories;
      user.dailyIntake.protein -= oldMeal.protein;
      user.dailyIntake.carbs -= oldMeal.carbs;
      user.dailyIntake.fat -= oldMeal.fat;

      // Update meal
      user.dailyIntake.meals[mealIndex] = { ...oldMeal.toObject(), ...updates };

      // Update new totals
      user.dailyIntake.calories += updates.calories || oldMeal.calories;
      user.dailyIntake.protein += updates.protein || oldMeal.protein;
      user.dailyIntake.carbs += updates.carbs || oldMeal.carbs;
      user.dailyIntake.fat += updates.fat || oldMeal.fat;

      await user.save();

      res.json({
        success: true,
        message: 'Meal updated successfully',
        data: user.dailyIntake
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

  async removeFromDailyIntake(req, res) {
    try {
      const { mealId } = req.params;
      const user = await User.findById(req.user.id);

      const mealIndex = user.dailyIntake.meals.findIndex(
        meal => meal._id.toString() === mealId
      );

      if (mealIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Meal not found'
        });
      }

      const meal = user.dailyIntake.meals[mealIndex];
      
      // Update totals
      user.dailyIntake.calories -= meal.calories;
      user.dailyIntake.protein -= meal.protein;
      user.dailyIntake.carbs -= meal.carbs;
      user.dailyIntake.fat -= meal.fat;

      // Remove meal
      user.dailyIntake.meals.splice(mealIndex, 1);

      await user.save();

      res.json({
        success: true,
        message: 'Meal removed from daily intake',
        data: user.dailyIntake
      });
    } catch (error) {
      console.error('Remove from daily intake error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from daily intake',
        error: error.message
      });
    }
  }

  async resetDailyIntake(req, res) {
    try {
      const user = await User.findById(req.user.id);

      user.dailyIntake = {
        date: new Date(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        meals: []
      };

      await user.save();

      res.json({
        success: true,
        message: 'Daily intake reset successfully',
        data: user.dailyIntake
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

  async getIntakeHistory(req, res) {
    try {
      const { startDate, endDate, limit = 30 } = req.query;
      
      // This would require a separate IntakeHistory collection in production
      // For now, returning current daily intake
      const user = await User.findById(req.user.id);

      res.json({
        success: true,
        data: [user.dailyIntake]
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
      const user = await User.findById(req.user.id);
      const progress = await Progress.getUserProgress(req.user.id, 30);

      // Calculate stats
      const stats = {
        currentWeight: user.profile.weight,
        targetWeight: user.profile.targetWeight,
        weightChange: progress.length > 0 
          ? user.profile.weight - progress[progress.length - 1].weight 
          : 0,
        daysOnPlatform: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)),
        totalWorkouts: progress.filter(p => p.workoutCompleted).length,
        averageCalories: user.profile.dailyCalories,
        favoriteRecipesCount: user.favoriteRecipes.length,
        currentStreak: this.calculateStreak(progress)
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

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      // Verify current password
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
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
      await User.findByIdAndDelete(req.user.id);
      await Progress.deleteMany({ userId: req.user.id });

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
}

module.exports = new UserController();