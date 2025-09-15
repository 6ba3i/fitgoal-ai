const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  googleId: {
    type: String,
    sparse: true
  },
  firebaseUid: {
    type: String,
    sparse: true
  },
  displayName: {
    type: String,
    required: true
  },
  profile: {
    weight: {
      type: Number,
      default: 70
    },
    height: {
      type: Number,
      default: 170
    },
    age: {
      type: Number,
      default: 25
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male'
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'veryActive'],
      default: 'moderate'
    },
    goal: {
      type: String,
      enum: ['lose', 'maintain', 'gain'],
      default: 'maintain'
    },
    targetWeight: {
      type: Number,
      default: 70
    },
    targetDate: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    },
    dailyCalories: {
      type: Number,
      default: 2000
    },
    dailyProtein: {
      type: Number,
      default: 150
    },
    dailyCarbs: {
      type: Number,
      default: 250
    },
    dailyFat: {
      type: Number,
      default: 65
    }
  },
  favoriteRecipes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe'
  }],
  dailyIntake: {
    date: {
      type: Date,
      default: Date.now
    },
    calories: {
      type: Number,
      default: 0
    },
    protein: {
      type: Number,
      default: 0
    },
    carbs: {
      type: Number,
      default: 0
    },
    fat: {
      type: Number,
      default: 0
    },
    meals: [{
      recipeId: String,
      recipeName: String,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      consumedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Calculate macros based on profile
userSchema.methods.calculateMacros = function() {
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
};

module.exports = mongoose.model('User', userSchema);