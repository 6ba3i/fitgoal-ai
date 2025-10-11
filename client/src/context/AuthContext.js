import React, { createContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { firebaseAuthService } from '../services/firebase.auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRefreshIntervalRef = useRef(null);

  // ✅ Setup automatic token refresh
  const setupTokenRefresh = async (firebaseUser) => {
    // Clear any existing interval
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }

    // Refresh token immediately
    try {
      await firebaseAuthService.exchangeFirebaseTokenForJWT(firebaseUser);
      console.log('🔄 Token refreshed on auth state change');
    } catch (error) {
      console.error('❌ Initial token refresh failed:', error);
    }

    // Set up interval to refresh token every 45 minutes
    // Firebase tokens expire after 60 minutes, so we refresh at 45 to be safe
    tokenRefreshIntervalRef.current = setInterval(async () => {
      console.log('🔄 Auto-refreshing authentication token...');
      try {
        if (auth.currentUser) {
          await firebaseAuthService.exchangeFirebaseTokenForJWT(auth.currentUser);
          console.log('✅ Token auto-refresh successful');
        }
      } catch (error) {
        console.error('❌ Token auto-refresh failed:', error);
      }
    }, 45 * 60 * 1000); // 45 minutes
  };

  useEffect(() => {
    console.log('🔐 Setting up Firebase auth listener...');
    
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      
      if (firebaseUser) {
        // User is signed in
        console.log('📝 Fetching user profile for:', firebaseUser.uid);
        
        // ✅ Setup token refresh for this user
        await setupTokenRefresh(firebaseUser);
        
        // Get user profile from Firestore
        const profileResult = await firebaseAuthService.getUserProfile(firebaseUser.uid);
        
        if (profileResult.success) {
          const userData = profileResult.data;
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            profile: userData.profile || {}
          });
          console.log('✅ User profile loaded successfully');
        } else {
          // If profile doesn't exist, set basic user info
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            profile: {}
          });
          console.log('⚠️ User profile not found, using basic info');
        }
      } else {
        // User is signed out
        setUser(null);
        
        // ✅ Clear token refresh interval
        if (tokenRefreshIntervalRef.current) {
          clearInterval(tokenRefreshIntervalRef.current);
          tokenRefreshIntervalRef.current = null;
          console.log('🧹 Token refresh interval cleared');
        }
        
        console.log('🚪 User signed out');
      }
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up auth listener');
      unsubscribe();
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, []);

  const logout = async () => {
    try {
      // Clear token refresh interval
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
      
      await firebaseAuthService.logout();
      setUser(null);
      localStorage.removeItem('authToken');
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const updateProfile = async (profileData) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await firebaseAuthService.updateUserProfile(user.uid, profileData);
      if (result.success) {
        setUser(prev => ({
          ...prev,
          profile: result.profile
        }));
      }
      return result;
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    setUser,
    loading,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};