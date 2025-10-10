const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const firebaseService = require('../services/firebase.service');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, displayName, ...profileData } = req.body;

      // Check if user exists in Firebase
      const existingUser = await firebaseService.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create user in Firebase Auth
      const userRecord = await firebaseService.createUser(email, password, displayName);

      // Calculate initial macros
      const macros = this.calculateMacros(profileData);

      // Store user profile in Firestore
      const userProfile = {
        email,
        displayName,
        profile: {
          ...profileData,
          dailyCalories: macros.calories,
          dailyProtein: macros.protein,
          dailyCarbs: macros.carbs,
          dailyFat: macros.fat
        },
        favoriteRecipes: [],
        dailyIntake: {
          date: new Date(),
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          meals: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await firebaseService.storeInFirestore('users', userRecord.uid, userProfile);

      // Generate JWT token
      const token = jwt.sign(
        { id: userRecord.uid, email: userRecord.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          profile: userProfile.profile
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Get user from Firebase Auth
      const userRecord = await firebaseService.getUserByEmail(email);
      if (!userRecord) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Note: Firebase Admin SDK doesn't verify passwords directly
      // For password verification, you should use Firebase Auth on client side
      // and send the ID token to verify here, or implement custom token verification

      // Get user profile from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', userRecord.uid);

      // Generate JWT token
      const token = jwt.sign(
        { id: userRecord.uid, email: userRecord.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          profile: userProfile?.profile || {}
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: error.message
      });
    }
  }

  async firebaseAuth(req, res) {
    try {
      const { idToken } = req.body;

      // Verify Firebase ID token
      const decodedToken = await firebaseService.verifyIdToken(idToken);
      const { uid, email, name } = decodedToken;

      // Find or create user in Firestore
      let userProfile = await firebaseService.getFromFirestore('users', uid);
      
      if (!userProfile) {
        // Create new user profile
        const macros = this.calculateMacros({
          weight: 70,
          height: 170,
          age: 25,
          gender: 'male',
          activityLevel: 'moderate',
          goal: 'maintain'
        });

        userProfile = {
          email,
          displayName: name || email.split('@')[0],
          profile: {
            weight: 70,
            height: 170,
            age: 25,
            gender: 'male',
            activityLevel: 'moderate',
            goal: 'maintain',
            targetWeight: 70,
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            dailyCalories: macros.calories,
            dailyProtein: macros.protein,
            dailyCarbs: macros.carbs,
            dailyFat: macros.fat
          },
          favoriteRecipes: [],
          dailyIntake: {
            date: new Date(),
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            meals: []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await firebaseService.storeInFirestore('users', uid, userProfile);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: uid, email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Firebase authentication successful',
        token,
        user: {
          id: uid,
          email,
          displayName: userProfile.displayName,
          profile: userProfile.profile
        }
      });
    } catch (error) {
      console.error('Firebase auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Firebase authentication failed',
        error: error.message
      });
    }
  }

  async getCurrentUser(req, res) {
    try {
      // Get user from Firebase Auth
      const userRecord = await admin.auth().getUser(req.user.id);
      
      // Get user profile from Firestore
      const userProfile = await firebaseService.getFromFirestore('users', req.user.id);

      res.json({
        success: true,
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          profile: userProfile?.profile || {}
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user data',
        error: error.message
      });
    }
  }

  async googleAuth(req, res) {
    try {
      const { idToken } = req.body;

      // Verify Google ID token via Firebase
      const decodedToken = await firebaseService.verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      // Find or create user in Firestore
      let userProfile = await firebaseService.getFromFirestore('users', uid);
      
      if (!userProfile) {
        // Create new user profile
        const macros = this.calculateMacros({
          weight: 70,
          height: 170,
          age: 25,
          gender: 'male',
          activityLevel: 'moderate',
          goal: 'maintain'
        });

        userProfile = {
          email,
          displayName: name || email.split('@')[0],
          googleId: uid,
          profile: {
            weight: 70,
            height: 170,
            age: 25,
            gender: 'male',
            activityLevel: 'moderate',
            goal: 'maintain',
            targetWeight: 70,
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            dailyCalories: macros.calories,
            dailyProtein: macros.protein,
            dailyCarbs: macros.carbs,
            dailyFat: macros.fat,
            picture
          },
          favoriteRecipes: [],
          dailyIntake: {
            date: new Date(),
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            meals: []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await firebaseService.storeInFirestore('users', uid, userProfile);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: uid, email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Google authentication successful',
        token,
        user: {
          id: uid,
          email,
          displayName: userProfile.displayName,
          profile: userProfile.profile
        }
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Google authentication failed',
        error: error.message
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify the existing token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Generate new token
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        token: newToken
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      // In a more sophisticated setup, you might want to blacklist the token
      // For now, we'll just return success (client should remove token)
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Get user from Firebase Auth
      const userRecord = await firebaseService.getUserByEmail(email);
      
      if (!userRecord) {
        // Don't reveal if email exists or not for security
        return res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { 
          id: userRecord.uid, 
          email: userRecord.email,
          purpose: 'password-reset'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // In a real implementation, you would send this via email
      // For now, we'll just return it (remove this in production!)
      res.json({
        success: true,
        message: 'Password reset instructions sent to your email',
        // Remove this in production - only for testing
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset',
        error: error.message
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // Verify reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token'
        });
      }

      // Update password in Firebase Auth
      await firebaseService.updateUser(decoded.id, { password });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }

  async verifyToken(req, res) {
    try {
      res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Token verification failed',
        error: error.message
      });
    }
  }

  // Helper method to calculate macros
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

module.exports = new AuthController();