// client/src/services/firebase.auth.service.js
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

class FirebaseAuthService {
  // Register new user
  async register(email, password, displayName, profileData = {}) {
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Calculate initial macros based on profile
      const macros = this.calculateMacros(profileData);

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        displayName,
        profile: {
          ...profileData,
          ...macros,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        favoriteRecipes: [],
        settings: {
          notifications: true,
          darkMode: false
        }
      });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profile: { ...profileData, ...macros }
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Login with email/password
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profile: userData?.profile || {}
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Google Sign-In
  async googleSignIn() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document for first-time Google users
        const defaultProfile = {
          weight: 70,
          height: 170,
          age: 25,
          gender: 'male',
          activityLevel: 'moderate',
          goal: 'maintain'
        };
        
        const macros = this.calculateMacros(defaultProfile);
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          profile: {
            ...defaultProfile,
            ...macros,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          },
          favoriteRecipes: [],
          settings: {
            notifications: true,
            darkMode: false
          }
        });

        return {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            profile: { ...defaultProfile, ...macros }
          }
        };
      }

      // Return existing user data
      const userData = userDoc.data();
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          profile: userData.profile
        }
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Logout
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Update user profile
  async updateUserProfile(uid, profileData) {
    try {
      const macros = this.calculateMacros(profileData);
      
      await updateDoc(doc(db, 'users', uid), {
        'profile': {
          ...profileData,
          ...macros,
          updatedAt: serverTimestamp()
        }
      });

      return { success: true, profile: { ...profileData, ...macros } };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate macros (moved from backend)
  calculateMacros(profile) {
    const { weight, height, age, gender, activityLevel, goal } = profile;
    
    // Calculate BMR (Basal Metabolic Rate)
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

    // Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = bmr * activityMultipliers[activityLevel];

    // Adjust calories based on goal
    let dailyCalories = tdee;
    if (goal === 'lose') {
      dailyCalories = tdee - 500; // 500 calorie deficit
    } else if (goal === 'gain') {
      dailyCalories = tdee + 500; // 500 calorie surplus
    }

    // Calculate macros (protein, carbs, fat)
    const proteinRatio = goal === 'gain' ? 0.3 : 0.25;
    const fatRatio = 0.25;
    const carbRatio = 1 - proteinRatio - fatRatio;

    return {
      dailyCalories: Math.round(dailyCalories),
      dailyProtein: Math.round((dailyCalories * proteinRatio) / 4),
      dailyCarbs: Math.round((dailyCalories * carbRatio) / 4),
      dailyFat: Math.round((dailyCalories * fatRatio) / 9),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee)
    };
  }
}

export const firebaseAuthService = new FirebaseAuthService();