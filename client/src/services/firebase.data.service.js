// client/src/services/firebase.data.service.js
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirebaseDataService {
  // ============ USER PROFILE MANAGEMENT ============
  async updateProfile(uid, profileData) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        profile: {
          ...profileData,
          updatedAt: serverTimestamp()
        }
      });
      return { success: true, data: profileData };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============ DAILY INTAKE MANAGEMENT ============
  async getDailyIntake(uid, date = new Date()) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const intakeDoc = await getDoc(doc(db, 'dailyIntakes', `${uid}_${dateStr}`));
      
      if (intakeDoc.exists()) {
        return { success: true, data: intakeDoc.data() };
      } else {
        // Return empty intake for the day
        return { 
          success: true, 
          data: {
            date: dateStr,
            meals: [],
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
          }
        };
      }
    } catch (error) {
      console.error('Get daily intake error:', error);
      return { success: false, error: error.message };
    }
  }

  async addToDailyIntake(uid, mealData) {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const intakeId = `${uid}_${dateStr}`;
      const intakeRef = doc(db, 'dailyIntakes', intakeId);
      
      const intakeDoc = await getDoc(intakeRef);
      
      if (intakeDoc.exists()) {
        // Update existing intake
        const currentData = intakeDoc.data();
        await updateDoc(intakeRef, {
          meals: [...currentData.meals, mealData],
          calories: currentData.calories + mealData.calories,
          protein: currentData.protein + mealData.protein,
          carbs: currentData.carbs + mealData.carbs,
          fat: currentData.fat + mealData.fat,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new intake
        await setDoc(intakeRef, {
          uid,
          date: dateStr,
          meals: [mealData],
          calories: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fat: mealData.fat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Add to daily intake error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============ PROGRESS TRACKING ============
  async addProgress(uid, progressData) {
    try {
      const progressRef = await addDoc(collection(db, 'progress'), {
        uid,
        ...progressData,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      return { success: true, id: progressRef.id };
    } catch (error) {
      console.error('Add progress error:', error);
      return { success: false, error: error.message };
    }
  }

  async getProgress(uid, limitCount = 30) {
    try {
      const q = query(
        collection(db, 'progress'),
        where('uid', '==', uid),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const progress = [];
      querySnapshot.forEach((doc) => {
        progress.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: progress };
    } catch (error) {
      console.error('Get progress error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============ FAVORITE RECIPES ============
  async addFavoriteRecipe(uid, recipeData) {
    try {
      // Add recipe to recipes collection if it doesn't exist
      const recipeRef = doc(db, 'recipes', recipeData.id.toString());
      await setDoc(recipeRef, {
        ...recipeData,
        favoritedBy: arrayUnion(uid),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Add recipe ID to user's favorites
      await updateDoc(doc(db, 'users', uid), {
        favoriteRecipes: arrayUnion(recipeData.id)
      });

      return { success: true };
    } catch (error) {
      console.error('Add favorite error:', error);
      return { success: false, error: error.message };
    }
  }

  async removeFavoriteRecipe(uid, recipeId) {
    try {
      // Remove from user's favorites
      await updateDoc(doc(db, 'users', uid), {
        favoriteRecipes: arrayRemove(recipeId)
      });

      // Remove user from recipe's favoritedBy
      const recipeRef = doc(db, 'recipes', recipeId.toString());
      await updateDoc(recipeRef, {
        favoritedBy: arrayRemove(uid)
      });

      return { success: true };
    } catch (error) {
      console.error('Remove favorite error:', error);
      return { success: false, error: error.message };
    }
  }

  async getFavoriteRecipes(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const favoriteIds = userDoc.data()?.favoriteRecipes || [];
      
      if (favoriteIds.length === 0) {
        return { success: true, data: [] };
      }

      // Get all favorite recipes
      const recipes = [];
      for (const recipeId of favoriteIds) {
        const recipeDoc = await getDoc(doc(db, 'recipes', recipeId.toString()));
        if (recipeDoc.exists()) {
          recipes.push({ id: recipeDoc.id, ...recipeDoc.data() });
        }
      }

      return { success: true, data: recipes };
    } catch (error) {
      console.error('Get favorites error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============ CUSTOM RECIPES ============
  async createCustomRecipe(uid, recipeData) {
    try {
      const recipeRef = await addDoc(collection(db, 'customRecipes'), {
        ...recipeData,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true, id: recipeRef.id };
    } catch (error) {
      console.error('Create custom recipe error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomRecipes(uid) {
    try {
      const q = query(
        collection(db, 'customRecipes'),
        where('createdBy', '==', uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const recipes = [];
      querySnapshot.forEach((doc) => {
        recipes.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: recipes };
    } catch (error) {
      console.error('Get custom recipes error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============ GOALS ============
  async updateGoals(uid, goalsData) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        goals: {
          ...goalsData,
          updatedAt: serverTimestamp()
        }
      });
      return { success: true, data: goalsData };
    } catch (error) {
      console.error('Update goals error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============ STATS CALCULATION ============
  async getUserStats(uid) {
    try {
      // Get recent progress entries
      const progressResult = await this.getProgress(uid, 30);
      
      if (!progressResult.success || progressResult.data.length === 0) {
        return { 
          success: true, 
          data: {
            currentWeight: 0,
            weightChange: 0,
            averageCalories: 0,
            streakDays: 0,
            totalWorkouts: 0,
            favoriteRecipesCount: 0
          }
        };
      }

      const progress = progressResult.data;
      const latestWeight = progress[0]?.weight || 0;
      const oldestWeight = progress[progress.length - 1]?.weight || latestWeight;
      const weightChange = latestWeight - oldestWeight;

      // Get user's favorite recipes count
      const userDoc = await getDoc(doc(db, 'users', uid));
      const favoriteRecipesCount = userDoc.data()?.favoriteRecipes?.length || 0;

      // Calculate workout count
      const totalWorkouts = progress.filter(p => p.workoutCompleted).length;

      return {
        success: true,
        data: {
          currentWeight: latestWeight,
          weightChange,
          averageCalories: 0, // Would need daily intake data
          streakDays: this.calculateStreak(progress),
          totalWorkouts,
          favoriteRecipesCount
        }
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      return { success: false, error: error.message };
    }
  }

  calculateStreak(progressData) {
    if (!progressData || progressData.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < progressData.length; i++) {
      const progressDate = progressData[i].date?.toDate?.() || new Date(progressData[i].date);
      const daysDiff = Math.floor((today - progressDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
}

export const firebaseDataService = new FirebaseDataService();