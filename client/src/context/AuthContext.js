// client/src/context/AuthContext.js - KEEP USER LOGGED IN
import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { firebaseAuthService } from '../services/firebase.auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Setting up Firebase auth listener...');
    
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      
      if (firebaseUser) {
        // User is signed in, get their profile from Firestore
        console.log('📝 Fetching user profile for:', firebaseUser.uid);
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
        console.log('🚪 User signed out');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await firebaseAuthService.logout();
      setUser(null);
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error('Logout error:', error);
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