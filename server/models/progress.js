const admin = require('firebase-admin');

class Progress {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.userId;
    this.date = data.date || new Date();
    this.weight = data.weight;
    this.bodyFat = data.bodyFat || null;
    this.muscleMass = data.muscleMass || null;
    this.measurements = {
      chest: data.measurements?.chest || null,
      waist: data.measurements?.waist || null,
      hips: data.measurements?.hips || null,
      arms: data.measurements?.arms || null,
      thighs: data.measurements?.thighs || null
    };
    this.photos = data.photos || [];
    this.notes = data.notes || null;
    this.mood = data.mood || null;
    this.energyLevel = data.energyLevel || null;
    this.workoutCompleted = data.workoutCompleted || false;
    this.dailySteps = data.dailySteps || null;
    this.waterIntake = data.waterIntake || null;
    this.sleepHours = data.sleepHours || null;
    this.createdAt = data.createdAt || new Date();
  }

  // Get Firestore reference
  static getCollection() {
    return admin.firestore().collection('progress');
  }

  // Calculate weight change from previous entry
  async calculateWeightChange() {
    const snapshot = await Progress.getCollection()
      .where('userId', '==', this.userId)
      .where('date', '<', this.date)
      .orderBy('date', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const previousDoc = snapshot.docs[0];
    const previousEntry = new Progress({ id: previousDoc.id, ...previousDoc.data() });
    
    return {
      change: this.weight - previousEntry.weight,
      percentage: ((this.weight - previousEntry.weight) / previousEntry.weight) * 100,
      days: Math.ceil((this.date - previousEntry.date) / (1000 * 60 * 60 * 24))
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      userId: this.userId,
      date: this.date,
      weight: this.weight,
      bodyFat: this.bodyFat,
      muscleMass: this.muscleMass,
      measurements: this.measurements,
      photos: this.photos,
      notes: this.notes,
      mood: this.mood,
      energyLevel: this.energyLevel,
      workoutCompleted: this.workoutCompleted,
      dailySteps: this.dailySteps,
      waterIntake: this.waterIntake,
      sleepHours: this.sleepHours,
      createdAt: this.createdAt
    };
  }

  // Save to Firestore
  async save() {
    if (!this.id) {
      // Create new progress entry
      const docRef = await Progress.getCollection().add(this.toFirestore());
      this.id = docRef.id;
    } else {
      // Update existing progress entry
      await Progress.getCollection().doc(this.id).update(this.toFirestore());
    }
    
    return this;
  }

  // Static Methods

  // Find progress entry by ID
  static async findById(progressId) {
    const doc = await Progress.getCollection().doc(progressId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return new Progress({ id: doc.id, ...doc.data() });
  }

  // Get user's progress history
  static async getUserProgress(userId, limit = 30) {
    const snapshot = await Progress.getCollection()
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => new Progress({ id: doc.id, ...doc.data() }));
  }

  // Get progress for date range
  static async getProgressByDateRange(userId, startDate, endDate) {
    const snapshot = await Progress.getCollection()
      .where('userId', '==', userId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    
    return snapshot.docs.map(doc => new Progress({ id: doc.id, ...doc.data() }));
  }

  // Get latest progress entry
  static async getLatest(userId) {
    const snapshot = await Progress.getCollection()
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return new Progress({ id: doc.id, ...doc.data() });
  }

  // Get progress summary
  static async getSummary(userId) {
    const allProgress = await Progress.getUserProgress(userId, 1000);
    
    if (allProgress.length === 0) {
      return null;
    }

    const weights = allProgress.map(p => p.weight);
    const sortedWeights = [...weights].sort((a, b) => a - b);
    
    return {
      totalEntries: allProgress.length,
      averageWeight: weights.reduce((sum, w) => sum + w, 0) / weights.length,
      lowestWeight: sortedWeights[0],
      highestWeight: sortedWeights[sortedWeights.length - 1],
      totalWeightChange: allProgress[0].weight - allProgress[allProgress.length - 1].weight,
      workoutCompletionRate: (allProgress.filter(p => p.workoutCompleted).length / allProgress.length) * 100,
      averageMood: this.calculateAverageMood(allProgress),
      averageEnergyLevel: this.calculateAverageEnergy(allProgress)
    };
  }

  // Helper: Calculate average mood
  static calculateAverageMood(progressArray) {
    const moodValues = { excellent: 5, good: 4, neutral: 3, tired: 2, exhausted: 1 };
    const moodCounts = progressArray.filter(p => p.mood).map(p => moodValues[p.mood]);
    
    if (moodCounts.length === 0) return 'N/A';
    
    const avgValue = moodCounts.reduce((sum, val) => sum + val, 0) / moodCounts.length;
    const moodLabels = Object.keys(moodValues);
    return moodLabels.find(key => Math.abs(moodValues[key] - avgValue) < 0.6) || 'good';
  }

  // Helper: Calculate average energy
  static calculateAverageEnergy(progressArray) {
    const energyLevels = progressArray.filter(p => p.energyLevel !== null).map(p => p.energyLevel);
    
    if (energyLevels.length === 0) return 0;
    
    return energyLevels.reduce((sum, level) => sum + level, 0) / energyLevels.length;
  }

  // Delete progress entry
  async delete() {
    if (this.id) {
      await Progress.getCollection().doc(this.id).delete();
    }
  }

  // Delete all progress for user
  static async deleteAllForUser(userId) {
    const snapshot = await Progress.getCollection()
      .where('userId', '==', userId)
      .get();
    
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
}

module.exports = Progress;