const admin = require('firebase-admin');

class Goal {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.userId;
    this.type = data.type; // 'weight', 'body_fat', 'muscle', 'fitness', 'nutrition', 'custom'
    this.title = data.title;
    this.description = data.description || null;
    this.startValue = data.startValue;
    this.currentValue = data.currentValue;
    this.targetValue = data.targetValue;
    this.unit = data.unit;
    this.startDate = data.startDate || new Date();
    this.targetDate = data.targetDate;
    this.status = data.status || 'active'; // 'active', 'completed', 'paused', 'cancelled'
    this.priority = data.priority || 'medium'; // 'low', 'medium', 'high'
    this.progress = data.progress || 0;
    this.milestones = data.milestones || [];
    this.reminders = data.reminders || [];
    this.notes = data.notes || [];
    this.completedDate = data.completedDate || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Get Firestore reference
  static getCollection() {
    return admin.firestore().collection('goals');
  }

  // Calculate progress percentage
  calculateProgress() {
    const totalChange = Math.abs(this.targetValue - this.startValue);
    const currentChange = Math.abs(this.currentValue - this.startValue);
    
    if (totalChange === 0) {
      this.progress = 100;
    } else {
      this.progress = Math.min(100, Math.round((currentChange / totalChange) * 100));
    }
    
    // Check if goal is completed
    if (this.startValue > this.targetValue) {
      // Decreasing goal (like weight loss)
      if (this.currentValue <= this.targetValue) {
        this.status = 'completed';
        this.completedDate = new Date();
        this.progress = 100;
      }
    } else {
      // Increasing goal (like muscle gain)
      if (this.currentValue >= this.targetValue) {
        this.status = 'completed';
        this.completedDate = new Date();
        this.progress = 100;
      }
    }
    
    return this.progress;
  }

  // Check and update milestones
  checkMilestones() {
    this.milestones.forEach(milestone => {
      if (!milestone.achieved) {
        if (this.startValue > this.targetValue) {
          // Decreasing goal
          if (this.currentValue <= milestone.value) {
            milestone.achieved = true;
            milestone.achievedDate = new Date();
          }
        } else {
          // Increasing goal
          if (this.currentValue >= milestone.value) {
            milestone.achieved = true;
            milestone.achievedDate = new Date();
          }
        }
      }
    });
  }

  // Add a note
  addNote(content) {
    this.notes.push({
      content,
      date: new Date()
    });
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      userId: this.userId,
      type: this.type,
      title: this.title,
      description: this.description,
      startValue: this.startValue,
      currentValue: this.currentValue,
      targetValue: this.targetValue,
      unit: this.unit,
      startDate: this.startDate,
      targetDate: this.targetDate,
      status: this.status,
      priority: this.priority,
      progress: this.progress,
      milestones: this.milestones,
      reminders: this.reminders,
      notes: this.notes,
      completedDate: this.completedDate,
      createdAt: this.createdAt,
      updatedAt: new Date()
    };
  }

  // Save to Firestore
  async save() {
    this.updatedAt = new Date();
    this.calculateProgress();
    this.checkMilestones();
    
    if (!this.id) {
      // Create new goal
      const docRef = await Goal.getCollection().add(this.toFirestore());
      this.id = docRef.id;
    } else {
      // Update existing goal
      await Goal.getCollection().doc(this.id).update(this.toFirestore());
    }
    
    return this;
  }

  // Static Methods

  // Find goal by ID
  static async findById(goalId) {
    const doc = await Goal.getCollection().doc(goalId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return new Goal({ id: doc.id, ...doc.data() });
  }

  // Get all goals for user
  static async findByUser(userId) {
    const snapshot = await Goal.getCollection()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => new Goal({ id: doc.id, ...doc.data() }));
  }

  // Get active goals for user
  static async getActiveGoals(userId) {
    const snapshot = await Goal.getCollection()
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => new Goal({ id: doc.id, ...doc.data() }));
  }

  // Get goals by type
  static async getByType(userId, type) {
    const snapshot = await Goal.getCollection()
      .where('userId', '==', userId)
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => new Goal({ id: doc.id, ...doc.data() }));
  }

  // Get completed goals
  static async getCompletedGoals(userId) {
    const snapshot = await Goal.getCollection()
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .orderBy('completedDate', 'desc')
      .get();
    
    return snapshot.docs.map(doc => new Goal({ id: doc.id, ...doc.data() }));
  }

  // Get goals statistics
  static async getStatistics(userId) {
    const allGoals = await Goal.findByUser(userId);
    
    if (allGoals.length === 0) {
      return null;
    }

    const active = allGoals.filter(g => g.status === 'active');
    const completed = allGoals.filter(g => g.status === 'completed');
    const paused = allGoals.filter(g => g.status === 'paused');
    const cancelled = allGoals.filter(g => g.status === 'cancelled');

    const avgProgress = active.length > 0 
      ? active.reduce((sum, g) => sum + g.progress, 0) / active.length 
      : 0;

    return {
      total: allGoals.length,
      active: active.length,
      completed: completed.length,
      paused: paused.length,
      cancelled: cancelled.length,
      completionRate: allGoals.length > 0 ? (completed.length / allGoals.length) * 100 : 0,
      averageProgress: avgProgress
    };
  }

  // Update goal progress
  async updateProgress(newValue) {
    this.currentValue = newValue;
    this.calculateProgress();
    await this.save();
  }

  // Mark as completed
  async markCompleted() {
    this.status = 'completed';
    this.completedDate = new Date();
    this.progress = 100;
    await this.save();
  }

  // Pause goal
  async pause() {
    this.status = 'paused';
    await this.save();
  }

  // Resume goal
  async resume() {
    this.status = 'active';
    await this.save();
  }

  // Cancel goal
  async cancel() {
    this.status = 'cancelled';
    await this.save();
  }

  // Delete goal
  async delete() {
    if (this.id) {
      await Goal.getCollection().doc(this.id).delete();
    }
  }

  // Delete all goals for user
  static async deleteAllForUser(userId) {
    const snapshot = await Goal.getCollection()
      .where('userId', '==', userId)
      .get();
    
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
}

module.exports = Goal;