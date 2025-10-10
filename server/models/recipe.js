const admin = require('firebase-admin');

class Recipe {
  constructor(data) {
    this.id = data.id || null;
    this.spoonacularId = data.spoonacularId || null;
    this.title = data.title;
    this.image = data.image || null;
    this.imageType = data.imageType || null;
    this.servings = data.servings || 1;
    this.readyInMinutes = data.readyInMinutes || null;
    this.nutrition = {
      calories: data.nutrition?.calories || 0,
      protein: data.nutrition?.protein || 0,
      carbs: data.nutrition?.carbs || 0,
      fat: data.nutrition?.fat || 0,
      fiber: data.nutrition?.fiber || 0,
      sugar: data.nutrition?.sugar || 0,
      sodium: data.nutrition?.sodium || 0,
      cholesterol: data.nutrition?.cholesterol || 0,
      saturatedFat: data.nutrition?.saturatedFat || 0,
      vitamins: data.nutrition?.vitamins || [],
      minerals: data.nutrition?.minerals || []
    };
    this.ingredients = data.ingredients || [];
    this.instructions = data.instructions || [];
    this.analyzedInstructions = data.analyzedInstructions || [];
    this.diets = data.diets || [];
    this.cuisines = data.cuisines || [];
    this.dishTypes = data.dishTypes || [];
    this.occasions = data.occasions || [];
    this.winePairing = data.winePairing || null;
    this.sourceUrl = data.sourceUrl || null;
    this.sourceName = data.sourceName || null;
    this.creditsText = data.creditsText || null;
    this.author = data.author || null;
    this.aggregateLikes = data.aggregateLikes || 0;
    this.healthScore = data.healthScore || 0;
    this.pricePerServing = data.pricePerServing || null;
    this.cheap = data.cheap || false;
    this.veryHealthy = data.veryHealthy || false;
    this.sustainable = data.sustainable || false;
    this.veryPopular = data.veryPopular || false;
    this.weightWatcherSmartPoints = data.weightWatcherSmartPoints || null;
    this.gaps = data.gaps || null;
    this.lowFodmap = data.lowFodmap || false;
    this.preparationMinutes = data.preparationMinutes || null;
    this.cookingMinutes = data.cookingMinutes || null;
    this.userCreated = data.userCreated || false;
    this.createdBy = data.createdBy || null;
    this.ratings = data.ratings || [];
    this.averageRating = data.averageRating || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Get Firestore reference
  static getCollection() {
    return admin.firestore().collection('recipes');
  }

  // Calculate average rating
  calculateAverageRating() {
    if (this.ratings.length === 0) {
      this.averageRating = 0;
    } else {
      const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
      this.averageRating = sum / this.ratings.length;
    }
    return this.averageRating;
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      spoonacularId: this.spoonacularId,
      title: this.title,
      image: this.image,
      imageType: this.imageType,
      servings: this.servings,
      readyInMinutes: this.readyInMinutes,
      nutrition: this.nutrition,
      ingredients: this.ingredients,
      instructions: this.instructions,
      analyzedInstructions: this.analyzedInstructions,
      diets: this.diets,
      cuisines: this.cuisines,
      dishTypes: this.dishTypes,
      occasions: this.occasions,
      winePairing: this.winePairing,
      sourceUrl: this.sourceUrl,
      sourceName: this.sourceName,
      creditsText: this.creditsText,
      author: this.author,
      aggregateLikes: this.aggregateLikes,
      healthScore: this.healthScore,
      pricePerServing: this.pricePerServing,
      cheap: this.cheap,
      veryHealthy: this.veryHealthy,
      sustainable: this.sustainable,
      veryPopular: this.veryPopular,
      weightWatcherSmartPoints: this.weightWatcherSmartPoints,
      gaps: this.gaps,
      lowFodmap: this.lowFodmap,
      preparationMinutes: this.preparationMinutes,
      cookingMinutes: this.cookingMinutes,
      userCreated: this.userCreated,
      createdBy: this.createdBy,
      ratings: this.ratings,
      averageRating: this.averageRating,
      createdAt: this.createdAt,
      updatedAt: new Date()
    };
  }

  // Save to Firestore
  async save() {
    this.updatedAt = new Date();
    
    if (!this.id) {
      // Create new recipe
      const docRef = await Recipe.getCollection().add(this.toFirestore());
      this.id = docRef.id;
    } else {
      // Update existing recipe
      await Recipe.getCollection().doc(this.id).update(this.toFirestore());
    }
    
    return this;
  }

  // Static Methods

  // Find recipe by ID
  static async findById(recipeId) {
    const doc = await Recipe.getCollection().doc(recipeId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return new Recipe({ id: doc.id, ...doc.data() });
  }

  // Find recipe by Spoonacular ID
  static async findBySpoonacularId(spoonacularId) {
    const snapshot = await Recipe.getCollection()
      .where('spoonacularId', '==', spoonacularId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return new Recipe({ id: doc.id, ...doc.data() });
  }

  // Get user's custom recipes
  static async findByUser(userId) {
    const snapshot = await Recipe.getCollection()
      .where('createdBy', '==', userId)
      .where('userCreated', '==', true)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => new Recipe({ id: doc.id, ...doc.data() }));
  }

  // Search recipes by title
  static async search(searchTerm, limit = 20) {
    // Note: Firestore doesn't support full-text search natively
    // You might want to use Algolia or similar for production
    const snapshot = await Recipe.getCollection()
      .orderBy('title')
      .startAt(searchTerm)
      .endAt(searchTerm + '\uf8ff')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => new Recipe({ id: doc.id, ...doc.data() }));
  }

  // Get popular recipes
  static async getPopular(limit = 10) {
    const snapshot = await Recipe.getCollection()
      .orderBy('averageRating', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => new Recipe({ id: doc.id, ...doc.data() }));
  }

  // Delete recipe
  async delete() {
    if (this.id) {
      await Recipe.getCollection().doc(this.id).delete();
    }
  }
}

module.exports = Recipe;