const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  weight: {
    type: Number,
    required: true
  },
  bodyFat: {
    type: Number
  },
  muscleMass: {
    type: Number
  },
  measurements: {
    chest: Number,
    waist: Number,
    hips: Number,
    arms: Number,
    thighs: Number
  },
  photos: [{
    url: String,
    type: {
      type: String,
      enum: ['front', 'side', 'back']
    }
  }],
  notes: {
    type: String
  },
  mood: {
    type: String,
    enum: ['excellent', 'good', 'neutral', 'tired', 'exhausted']
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 10
  },
  workoutCompleted: {
    type: Boolean,
    default: false
  },
  dailySteps: {
    type: Number
  },
  waterIntake: {
    type: Number // in ml
  },
  sleepHours: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for user and date
progressSchema.index({ userId: 1, date: -1 });

// Static method to get user's progress history
progressSchema.statics.getUserProgress = async function(userId, limit = 30) {
  return await this.find({ userId })
    .sort({ date: -1 })
    .limit(limit);
};

// Static method to get progress for date range
progressSchema.statics.getProgressByDateRange = async function(userId, startDate, endDate) {
  return await this.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

// Calculate weight change
progressSchema.methods.calculateWeightChange = async function() {
  const previousEntry = await this.constructor.findOne({
    userId: this.userId,
    date: { $lt: this.date }
  }).sort({ date: -1 });
  
  if (previousEntry) {
    return {
      change: this.weight - previousEntry.weight,
      percentage: ((this.weight - previousEntry.weight) / previousEntry.weight) * 100,
      days: Math.ceil((this.date - previousEntry.date) / (1000 * 60 * 60 * 24))
    };
  }
  
  return null;
};

module.exports = mongoose.model('Progress', progressSchema);