const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('../config/firebase');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, displayName, ...profileData } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        displayName,
        profile: profileData
      });

      // Calculate initial macros
      user.calculateMacros();
      
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profile: user.profile
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

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profile: user.profile
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  async googleAuth(req, res) {
    try {
      const { idToken } = req.body;

      // Verify Google ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      // Find or create user
      let user = await User.findOne({ googleId: uid });
      
      if (!user) {
        user = await User.findOne({ email });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = uid;
          await user.save();
        } else {
          // Create new user
          user = new User({
            googleId: uid,
            firebaseUid: uid,
            email,
            displayName: name || email.split('@')[0],
            profile: {
              picture
            }
          });
          
          user.calculateMacros();
          await user.save();
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Google authentication successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profile: user.profile
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

  async firebaseAuth(req, res) {
    try {
      const { idToken } = req.body;

      // Verify Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name } = decodedToken;

      // Find or create user
      let user = await User.findOne({ firebaseUid: uid });
      
      if (!user) {
        user = await User.findOne({ email });
        
        if (user) {
          // Link Firebase account to existing user
          user.firebaseUid = uid;
          await user.save();
        } else {
          // Create new user
          user = new User({
            firebaseUid: uid,
            email,
            displayName: name || email.split('@')[0]
          });
          
          user.calculateMacros();
          await user.save();
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Firebase authentication successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profile: user.profile
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

  async refreshToken(req, res) {
    try {
      const { token } = req.body;

      // Verify current token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Generate new token
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token: newToken
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  }

  async logout(req, res) {
    try {
      // In a production app, you might want to blacklist the token here
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

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: user._id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // In production, send email with reset link
      // For now, just return the token
      res.json({
        success: true,
        message: 'Password reset token generated',
        resetToken // Remove this in production
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

      // Update password
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.password = password;
      await user.save();

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

  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('favoriteRecipes');

      res.json({
        success: true,
        user
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
}

module.exports = new AuthController();