import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { userService } from '../services/user.service';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState(null);
  const [dailyIntake, setDailyIntake] = useState({
    date: new Date(),
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    meals: []
  });
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [profileData, intakeData] = await Promise.all([
        userService.getProfile(),
        userService.getDailyIntake()
      ]);

      if (profileData.success) {
        setUserProfile(profileData.data);
        setFavoriteRecipes(profileData.data.favoriteRecipes || []);
      }

      if (intakeData.success) {
        setDailyIntake(intakeData.data);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await userService.updateProfile(profileData);
      if (response.success) {
        setUserProfile(response.data);
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      return { success: false, error: error.message };
    }
  };

  const addMealToIntake = async (mealData) => {
    try {
      const response = await userService.addToDailyIntake(mealData);
      if (response.success) {
        setDailyIntake(response.data);
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to add meal:', error);
      return { success: false, error: error.message };
    }
  };

  const removeMealFromIntake = async (mealId) => {
    try {
      const response = await userService.removeFromDailyIntake(mealId);
      if (response.success) {
        setDailyIntake(response.data);
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to remove meal:', error);
      return { success: false, error: error.message };
    }
  };

  const resetIntake = async () => {
    try {
      const response = await userService.resetDailyIntake();
      if (response.success) {
        setDailyIntake(response.data);
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to reset intake:', error);
      return { success: false, error: error.message };
    }
  };

  const addFavoriteRecipe = (recipe) => {
    setFavoriteRecipes([...favoriteRecipes, recipe]);
  };

  const removeFavoriteRecipe = (recipeId) => {
    setFavoriteRecipes(favoriteRecipes.filter(r => r.id !== recipeId));
  };

  const addProgress = (progressEntry) => {
    setProgressData([progressEntry, ...progressData]);
  };

  const updateGoals = (newGoals) => {
    setGoals(newGoals);
  };

  const calculateRemainingMacros = () => {
    if (!userProfile) return null;
    
    return {
      calories: Math.max(0, userProfile.profile.dailyCalories - dailyIntake.calories),
      protein: Math.max(0, userProfile.profile.dailyProtein - dailyIntake.protein),
      carbs: Math.max(0, userProfile.profile.dailyCarbs - dailyIntake.carbs),
      fat: Math.max(0, userProfile.profile.dailyFat - dailyIntake.fat)
    };
  };

  const getMacroPercentages = () => {
    if (!userProfile) return null;
    
    return {
      calories: Math.min(100, (dailyIntake.calories / userProfile.profile.dailyCalories) * 100),
      protein: Math.min(100, (dailyIntake.protein / userProfile.profile.dailyProtein) * 100),
      carbs: Math.min(100, (dailyIntake.carbs / userProfile.profile.dailyCarbs) * 100),
      fat: Math.min(100, (dailyIntake.fat / userProfile.profile.dailyFat) * 100)
    };
  };

  const value = {
    userProfile,
    setUserProfile,
    dailyIntake,
    setDailyIntake,
    favoriteRecipes,
    setFavoriteRecipes,
    progressData,
    setProgressData,
    goals,
    setGoals,
    loading,
    updateProfile,
    addMealToIntake,
    removeMealFromIntake,
    resetIntake,
    addFavoriteRecipe,
    removeFavoriteRecipe,
    addProgress,
    updateGoals,
    calculateRemainingMacros,
    getMacroPercentages,
    fetchUserData
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};