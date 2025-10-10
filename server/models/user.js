const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id || null;
    this.email = data.email;
    this.password = data.password;
    this.googleId = data.googleId || null;
    this.firebaseUid = data.firebaseUid || null;
    this.displayName = data.displayName;
    this.profile = {
      weight: data.profile?.weight || 70,
      height: data.profile?.height || 170,
      age: data.profile?.age || 25,
      gender: data.profile?.gender || 'male',
      activityLevel: data.profile?.activityLevel || 'moderate',
      goal: data.profile?.goal || 'maintain',
      targetWeight: data.profile?.targetWeight || 70,
      targetDate: data.profile?.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      dailyCalories: data.profile?.dailyCalories || 2000,
      dailyProtein: data.profile?.dailyProtein || 150,
      dailyCarbs: data.profile?.dailyCarbs || 250,
      dailyFat: data.profile?.dailyFat || 65
    };
    this.favoriteRecipes = data.favoriteRecipes || [];
    this.dailyIntake = {
      date: data.dailyIntake?.date || new Date(),
      calories: data.dailyIntake?.calories || 0,
      protein: data.dailyIntake?.protein || 0,
      carbs: data.dailyIntake?.carbs || 0,
      fat: data.dailyIntake?.fat || 0,
      meals: data.dailyIntake?.meals || []
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Get Firestore reference
  static getCollection() {
    return admin.firestore().collection('users');
  }

  // Hash password
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  // Compare password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Calculate macros based on profile
  calculateMacros() {
    const { weight, height, age, gender, activityLevel, goal } = this.profile;
    
    // Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };
    
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
    
    let targetCalories = tdee;
    if (goal === 'lose') {
      targetCalories = tdee - 500;
    } else if (goal === 'gain') {
      targetCalories = tdee + 500;
    }
    
    this.profile.dailyCalories = Math.round(targetCalories);
    this.profile.dailyProtein = Math.round(weight * 2.2 * 0.8);
    this.profile.dailyCarbs = Math.round(targetCalories * 0.4 / 4);
    this.profile.dailyFat = Math.round(targetCalories * 0.3 / 9);
    
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calories: this.profile.dailyCalories,
      protein: this.profile.dailyProtein,
      carbs: this.profile.dailyCarbs,
      fat: this.profile.dailyFat
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      email: this.email,
      password: this.password,
      googleId: this.googleId,
      firebaseUid: this.firebaseUid,
      displayName: this.displayName,
      profile: this.profile,
      favoriteRecipes: this.favoriteRecipes,
      dailyIntake: this.dailyIntake,
      createdAt: this.createdAt,
      updatedAt: new Date()
    };
  }

  // Save to Firestore
  async save() {
    this.updatedAt = new Date();
    
    if (!this.id) {
      // Create new user
      const docRef = await User.getCollection().add(this.toFirestore());
      this.id = docRef.id;
    } else {
      // Update existing user
      await User.getCollection().doc(this.id).update(this.toFirestore());
    }
    
    return this;
  }

  // Static Methods

  // Find user by ID
  static async findById(userId) {
    const doc = await User.getCollection().doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return new User({ id: doc.id, ...doc.data() });
  }

  // Find user by email
  static async findByEmail(email) {
    const snapshot = await User.getCollection()
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return new User({ id: doc.id, ...doc.data() });
  }

  // Find user by Firebase UID
  static async findByFirebaseUid(firebaseUid) {
    const snapshot = await User.getCollection()
      .where('firebaseUid', '==', firebaseUid)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return new User({ id: doc.id, ...doc.data() });
  }

  // Create new user
  static async create(userData) {
    const user = new User(userData);
    
    if (user.password) {
      await user.hashPassword();
    }
    
    await user.save();
    return user;
  }

  // Delete user
  async delete() {
    if (this.id) {
      await User.getCollection().doc(this.id).delete();
    }
  }
}

module.exports = User;