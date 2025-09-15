const admin = require('../config/firebase');

class FirebaseService {
  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      throw new Error('Invalid Firebase token');
    }
  }

  /**
   * Create custom token for user
   */
  async createCustomToken(userId, claims = {}) {
    try {
      const customToken = await admin.auth().createCustomToken(userId, claims);
      return customToken;
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw new Error('Failed to create custom token');
    }
  }

  /**
   * Get user by email from Firebase
   */
  async getUserByEmail(email) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create user in Firebase
   */
  async createUser(email, password, displayName) {
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false
      });
      return userRecord;
    } catch (error) {
      console.error('Error creating Firebase user:', error);
      throw new Error('Failed to create user in Firebase');
    }
  }

  /**
   * Update user in Firebase
   */
  async updateUser(uid, updates) {
    try {
      const userRecord = await admin.auth().updateUser(uid, updates);
      return userRecord;
    } catch (error) {
      console.error('Error updating Firebase user:', error);
      throw new Error('Failed to update user in Firebase');
    }
  }

  /**
   * Delete user from Firebase
   */
  async deleteUser(uid) {
    try {
      await admin.auth().deleteUser(uid);
      return true;
    } catch (error) {
      console.error('Error deleting Firebase user:', error);
      throw new Error('Failed to delete user from Firebase');
    }
  }

  /**
   * Store data in Firestore
   */
  async storeInFirestore(collection, documentId, data) {
    try {
      const db = admin.firestore();
      await db.collection(collection).doc(documentId).set(data, { merge: true });
      return true;
    } catch (error) {
      console.error('Error storing in Firestore:', error);
      throw new Error('Failed to store data in Firestore');
    }
  }

  /**
   * Get data from Firestore
   */
  async getFromFirestore(collection, documentId) {
    try {
      const db = admin.firestore();
      const doc = await db.collection(collection).doc(documentId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting from Firestore:', error);
      throw new Error('Failed to get data from Firestore');
    }
  }

  /**
   * Query Firestore collection
   */
  async queryFirestore(collection, field, operator, value, limit = 10) {
    try {
      const db = admin.firestore();
      const query = db.collection(collection)
        .where(field, operator, value)
        .limit(limit);
      
      const snapshot = await query.get();
      const results = [];
      
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      
      return results;
    } catch (error) {
      console.error('Error querying Firestore:', error);
      throw new Error('Failed to query Firestore');
    }
  }

  /**
   * Delete from Firestore
   */
  async deleteFromFirestore(collection, documentId) {
    try {
      const db = admin.firestore();
      await db.collection(collection).doc(documentId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      throw new Error('Failed to delete from Firestore');
    }
  }

  /**
   * Store user favorites in Firebase
   */
  async storeFavoriteRecipe(userId, recipe) {
    try {
      const db = admin.firestore();
      await db.collection('users').doc(userId)
        .collection('favoriteRecipes').doc(recipe.id)
        .set({
          ...recipe,
          addedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      return true;
    } catch (error) {
      console.error('Error storing favorite recipe:', error);
      throw new Error('Failed to store favorite recipe');
    }
  }

  /**
   * Get user favorites from Firebase
   */
  async getFavoriteRecipes(userId) {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection('users').doc(userId)
        .collection('favoriteRecipes')
        .orderBy('addedAt', 'desc')
        .get();
      
      const favorites = [];
      snapshot.forEach(doc => {
        favorites.push({ id: doc.id, ...doc.data() });
      });
      
      return favorites;
    } catch (error) {
      console.error('Error getting favorite recipes:', error);
      throw new Error('Failed to get favorite recipes');
    }
  }

  /**
   * Remove favorite recipe
   */
  async removeFavoriteRecipe(userId, recipeId) {
    try {
      const db = admin.firestore();
      await db.collection('users').doc(userId)
        .collection('favoriteRecipes').doc(recipeId)
        .delete();
      return true;
    } catch (error) {
      console.error('Error removing favorite recipe:', error);
      throw new Error('Failed to remove favorite recipe');
    }
  }

  /**
   * Real-time database operations
   */
  async updateRealtimeDatabase(path, data) {
    try {
      const db = admin.database();
      await db.ref(path).set(data);
      return true;
    } catch (error) {
      console.error('Error updating realtime database:', error);
      throw new Error('Failed to update realtime database');
    }
  }

  async getFromRealtimeDatabase(path) {
    try {
      const db = admin.database();
      const snapshot = await db.ref(path).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Error getting from realtime database:', error);
      throw new Error('Failed to get from realtime database');
    }
  }
}

module.exports = new FirebaseService();