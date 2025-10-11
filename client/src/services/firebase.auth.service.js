// client/src/services/firebase.auth.service.js - FIXED
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
  serverTimestamp 
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { authService } from './auth.service'; // Import the API auth service

class FirebaseAuthService {
  // ✅ NEW METHOD: Exchange Firebase token for JWT
  async exchangeFirebaseTokenForJWT(firebaseUser) {
    try {
      console.log('🔄 Exchanging Firebase token for JWT...');
      
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();
      
      // Exchange it for JWT from your backend
      const response = await authService.firebaseAuth(idToken);
      
      if (response.success && response.token) {
        // Store JWT in localStorage for API calls
        localStorage.setItem('authToken', response.token);
        console.log('✅ JWT token stored in localStorage');
        return response;
      }
      
      console.error('❌ Failed to get JWT from backend');
      return response;
    } catch (error) {
      console.error('❌ Token exchange error:', error);
      return { success: false, error: error.message };
    }
  }

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

      // ✅ CRITICAL FIX: Exchange Firebase token for JWT
      await this.exchangeFirebaseTokenForJWT(user);

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
      
      // ✅ CRITICAL FIX: Exchange Firebase token for JWT
      await this.exchangeFirebaseTokenForJWT(user);
      
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

      // ✅ CRITICAL FIX: Exchange Firebase token for JWT
      await this.exchangeFirebaseTokenForJWT(user);

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
      // ✅ IMPORTANT: Remove JWT token
      localStorage.removeItem('authToken');
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

  // Get user profile
  async getUserProfile(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          success: true,
          data: docSnap.data()
        };
      } else {
        return {
          success: false,
          error: 'User profile not found'
        };
      }
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send password reset email
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate macros based on user data
  calculateMacros(userData) {
    const { weight = 70, height = 170, age = 25, gender = 'male', activityLevel = 'moderate', goal = 'maintain' } = userData;

    // Mifflin-St Jeor Equation for BMR
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };

    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

    // Adjust for goal
    let targetCalories = tdee;
    if (goal === 'lose') {
      targetCalories = tdee - 500;
    } else if (goal === 'gain') {
      targetCalories = tdee + 500;
    }

    // Calculate macros
    const protein = Math.round((targetCalories * 0.30) / 4);
    const carbs = Math.round((targetCalories * 0.40) / 4);
    const fat = Math.round((targetCalories * 0.30) / 9);

    return {
      dailyCalories: Math.round(targetCalories),
      dailyProtein: protein,
      dailyCarbs: carbs,
      dailyFat: fat
    };
  }
}

export const firebaseAuthService = new FirebaseAuthService();