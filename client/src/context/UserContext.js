// client/src/context/UserContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { firebaseDataService } from '../services/firebase.data.service';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState(null);
  const [dailyIntake, setDailyIntake] = useState({
    date: new Date().toISOString().split('T')[0],
    meals: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [progressHistory, setProgressHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      // Reset state when user logs out
      setUserProfile(null);
      setDailyIntake({
        date: new Date().toISOString().split('T')[0],
        meals: [],
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      });
      setFavoriteRecipes([]);
      setProgressHistory([]);
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // User profile is already in the auth context
      setUserProfile({
        ...user.profile,
        displayName: user.displayName,
        email: user.email
      });

      // Fetch daily intake
      const intakeResult = await firebaseDataService.getDailyIntake(user.uid);
      if (intakeResult.success) {
        setDailyIntake(intakeResult.data);
      }

      // Fetch favorite recipes
      const favoritesResult = await firebaseDataService.getFavoriteRecipes(user.uid);
      if (favoritesResult.success) {
        setFavoriteRecipes(favoritesResult.data);
      }

      // Fetch progress history
      const progressResult = await firebaseDataService.getProgress(user.uid, 30);
      if (progressResult.success) {
        setProgressHistory(progressResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await firebaseDataService.updateProfile(user.uid, profileData);
      if (result.success) {
        setUserProfile({
          ...result.data,
          displayName: user.displayName,
          email: user.email
        });
        // Also update in auth context
        if (window.updateAuthProfile) {
          window.updateAuthProfile(result.data);
        }
      }
      return result;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return { success: false, error: error.message };
    }
  };

  const addMealToIntake = async (mealData) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await firebaseDataService.addToDailyIntake(user.uid, mealData);
      if (result.success) {
        // Refresh daily intake
        const intakeResult = await firebaseDataService.getDailyIntake(user.uid);
        if (intakeResult.success) {
          setDailyIntake(intakeResult.data);
        }
      }
      return result;
    } catch (error) {
      console.error('Failed to add meal:', error);
      return { success: false, error: error.message };
    }
  };

  const resetIntake = async () => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    setDailyIntake({
      date: new Date().toISOString().split('T')[0],
      meals: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
    return { success: true };
  };

  const addFavoriteRecipe = async (recipe) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await firebaseDataService.addFavoriteRecipe(user.uid, recipe);
      if (result.success) {
        setFavoriteRecipes([...favoriteRecipes, recipe]);
      }
      return result;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return { success: false, error: error.message };
    }
  };

  const removeFavoriteRecipe = async (recipeId) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await firebaseDataService.removeFavoriteRecipe(user.uid, recipeId);
      if (result.success) {
        setFavoriteRecipes(favoriteRecipes.filter(r => r.id !== recipeId));
      }
      return result;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return { success: false, error: error.message };
    }
  };

  const addProgress = async (progressEntry) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await firebaseDataService.addProgress(user.uid, progressEntry);
      if (result.success) {
        setProgressHistory([progressEntry, ...progressHistory]);
      }
      return result;
    } catch (error) {
      console.error('Failed to add progress:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    userProfile,
    setUserProfile,
    dailyIntake,
    setDailyIntake,
    favoriteRecipes,
    setFavoriteRecipes,
    progressHistory,
    setProgressHistory,
    loading,
    updateProfile,
    addMealToIntake,
    resetIntake,
    addFavoriteRecipe,
    removeFavoriteRecipe,
    addProgress,
    refreshData: fetchUserData
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};