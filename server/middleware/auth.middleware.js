const jwt = require('jsonwebtoken');
const firebaseService = require('../services/firebase.service');

class AuthMiddleware {
  async authenticate(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No authentication token provided'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from Firestore instead of MongoDB
      const user = await firebaseService.getFromFirestore('users', decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Set user data for use in routes
      req.user = {
        id: decoded.id,
        email: decoded.email,
        displayName: user.displayName,
        profile: user.profile
      };
      req.token = token;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  async optionalAuth(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from Firestore
        const user = await firebaseService.getFromFirestore('users', decoded.id);
        
        if (user) {
          req.user = {
            id: decoded.id,
            email: decoded.email,
            displayName: user.displayName,
            profile: user.profile
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  }

  async requireAdmin(req, res, next) {
    try {
      // First authenticate
      await this.authenticate(req, res, () => {});
      
      // Check if user has admin role (you can customize this logic)
      const user = await firebaseService.getFromFirestore('users', req.user.id);
      
      if (!user?.role || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      next();
    } catch (error) {
      console.error('Admin authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Admin authentication failed'
      });
    }
  }
}

module.exports = new AuthMiddleware();