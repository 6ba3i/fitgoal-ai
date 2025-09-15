const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['weight', 'body_fat', 'muscle', 'fitness', 'nutrition', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  startValue: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  targetValue: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  milestones: [{
    title: String,
    value: Number,
    date: Date,
    achieved: {
      type: Boolean,
      default: false
    },
    achievedDate: Date
  }],
  reminders: [{
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    time: String,
    message: String,
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  notes: [{
    content: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  completedDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for user queries
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, type: 1 });

// Calculate progress percentage
goalSchema.methods.calculateProgress = function() {
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
};

// Check and update milestones
goalSchema.methods.checkMilestones = function() {
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
};

// Get active goals for user
goalSchema.statics.getActiveGoals = async function(userId) {
  return await this.find({
    userId,
    status: 'active'
  }).sort({ priority: -1, createdAt: -1 });
};

// Update timestamps
goalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.calculateProgress();
  this.checkMilestones();
  next();
});

module.exports = mongoose.model('Goal', goalSchema);