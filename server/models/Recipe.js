const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  spoonacularId: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  imageType: {
    type: String
  },
  servings: {
    type: Number,
    default: 1
  },
  readyInMinutes: {
    type: Number
  },
  nutrition: {
    calories: {
      type: Number,
      required: true
    },
    protein: {
      type: Number,
      required: true
    },
    carbs: {
      type: Number,
      required: true
    },
    fat: {
      type: Number,
      required: true
    },
    fiber: Number,
    sugar: Number,
    sodium: Number,
    cholesterol: Number,
    saturatedFat: Number,
    vitamins: [{
      name: String,
      amount: Number,
      unit: String,
      percentOfDailyNeeds: Number
    }],
    minerals: [{
      name: String,
      amount: Number,
      unit: String,
      percentOfDailyNeeds: Number
    }]
  },
  ingredients: [{
    id: Number,
    name: String,
    amount: Number,
    unit: String,
    original: String,
    aisle: String,
    image: String
  }],
  instructions: [{
    number: Number,
    step: String,
    ingredients: [{
      id: Number,
      name: String,
      image: String
    }],
    equipment: [{
      id: Number,
      name: String,
      image: String
    }]
  }],
  analyzedInstructions: [{
    name: String,
    steps: [{
      number: Number,
      step: String,
      ingredients: Array,
      equipment: Array
    }]
  }],
  diets: [{
    type: String,
    enum: ['gluten free', 'ketogenic', 'vegetarian', 'lacto-vegetarian', 
           'ovo-vegetarian', 'vegan', 'pescetarian', 'paleo', 'primal', 'whole30']
  }],
  cuisines: [String],
  dishTypes: [String],
  occasions: [String],
  winePairing: {
    pairedWines: [String],
    pairingText: String
  },
  sourceUrl: String,
  sourceName: String,
  creditsText: String,
  author: String,
  aggregateLikes: {
    type: Number,
    default: 0
  },
  healthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  pricePerServing: Number,
  cheap: Boolean,
  veryHealthy: Boolean,
  sustainable: Boolean,
  veryPopular: Boolean,
  weightWatcherSmartPoints: Number,
  gaps: String,
  lowFodmap: Boolean,
  preparationMinutes: Number,
  cookingMinutes: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  userCreated: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ratings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  }
});

// Index for text search
recipeSchema.index({ title: 'text', 'ingredients.name': 'text' });

// Index for filtering
recipeSchema.index({ 'nutrition.calories': 1, 'nutrition.protein': 1 });
recipeSchema.index({ diets: 1, cuisines: 1 });

// Calculate average rating
recipeSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
  } else {
    const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    this.averageRating = sum / this.ratings.length;
  }
  return this.averageRating;
};

// Update timestamps
recipeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Recipe', recipeSchema);