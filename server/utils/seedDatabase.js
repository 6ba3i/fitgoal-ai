require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

// Import models
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Progress = require('../models/Progress');
const Goal = require('../models/Goal');

// Sample data
const sampleUsers = [
  {
    email: 'demo@fitgoalai.com',
    password: 'Demo123!',
    displayName: 'Demo User',
    profile: {
      weight: 75,
      height: 175,
      age: 28,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'lose',
      targetWeight: 70,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    }
  },
  {
    email: 'john.doe@example.com',
    password: 'Password123!',
    displayName: 'John Doe',
    profile: {
      weight: 85,
      height: 180,
      age: 32,
      gender: 'male',
      activityLevel: 'active',
      goal: 'gain',
      targetWeight: 90,
      targetDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
    }
  },
  {
    email: 'jane.smith@example.com',
    password: 'Password123!',
    displayName: 'Jane Smith',
    profile: {
      weight: 65,
      height: 165,
      age: 26,
      gender: 'female',
      activityLevel: 'light',
      goal: 'maintain',
      targetWeight: 65,
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    }
  }
];

const sampleRecipes = [
  {
    title: 'Grilled Chicken Salad',
    image: 'https://via.placeholder.com/400x300',
    servings: 2,
    readyInMinutes: 20,
    nutrition: {
      calories: 350,
      protein: 35,
      carbs: 20,
      fat: 15,
      fiber: 5,
      sugar: 8,
      sodium: 450
    },
    ingredients: [
      { name: 'Chicken breast', amount: 200, unit: 'g' },
      { name: 'Mixed greens', amount: 100, unit: 'g' },
      { name: 'Cherry tomatoes', amount: 50, unit: 'g' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp' },
      { name: 'Lemon juice', amount: 1, unit: 'tbsp' }
    ],
    instructions: [
      { number: 1, step: 'Season chicken breast with salt and pepper' },
      { number: 2, step: 'Grill chicken for 6-7 minutes per side' },
      { number: 3, step: 'Mix greens and tomatoes in a bowl' },
      { number: 4, step: 'Slice chicken and place on salad' },
      { number: 5, step: 'Drizzle with olive oil and lemon juice' }
    ],
    diets: ['gluten free', 'paleo'],
    healthScore: 85,
    veryHealthy: true,
    cheap: true,
    veryPopular: true
  },
  {
    title: 'Protein Smoothie Bowl',
    image: 'https://via.placeholder.com/400x300',
    servings: 1,
    readyInMinutes: 10,
    nutrition: {
      calories: 420,
      protein: 30,
      carbs: 45,
      fat: 12,
      fiber: 8,
      sugar: 20,
      sodium: 200
    },
    ingredients: [
      { name: 'Protein powder', amount: 1, unit: 'scoop' },
      { name: 'Banana', amount: 1, unit: 'medium' },
      { name: 'Berries', amount: 100, unit: 'g' },
      { name: 'Almond milk', amount: 200, unit: 'ml' },
      { name: 'Granola', amount: 30, unit: 'g' }
    ],
    instructions: [
      { number: 1, step: 'Blend protein powder, banana, berries, and almond milk' },
      { number: 2, step: 'Pour into a bowl' },
      { number: 3, step: 'Top with granola and additional berries' }
    ],
    diets: ['vegetarian'],
    healthScore: 78,
    veryHealthy: true,
    cheap: true,
    veryPopular: true
  },
  {
    title: 'Quinoa Buddha Bowl',
    image: 'https://via.placeholder.com/400x300',
    servings: 2,
    readyInMinutes: 30,
    nutrition: {
      calories: 450,
      protein: 18,
      carbs: 60,
      fat: 18,
      fiber: 12,
      sugar: 10,
      sodium: 380
    },
    ingredients: [
      { name: 'Quinoa', amount: 150, unit: 'g' },
      { name: 'Chickpeas', amount: 100, unit: 'g' },
      { name: 'Avocado', amount: 1, unit: 'whole' },
      { name: 'Sweet potato', amount: 200, unit: 'g' },
      { name: 'Tahini', amount: 2, unit: 'tbsp' }
    ],
    instructions: [
      { number: 1, step: 'Cook quinoa according to package instructions' },
      { number: 2, step: 'Roast sweet potato cubes at 200°C for 25 minutes' },
      { number: 3, step: 'Heat chickpeas in a pan with spices' },
      { number: 4, step: 'Assemble bowl with quinoa, sweet potato, chickpeas, and avocado' },
      { number: 5, step: 'Drizzle with tahini sauce' }
    ],
    diets: ['vegan', 'vegetarian', 'gluten free'],
    healthScore: 92,
    veryHealthy: true,
    cheap: true,
    veryPopular: true
  }
];

const generateProgressData = (userId, startWeight, targetWeight, days = 30) => {
  const progressData = [];
  let currentWeight = startWeight;
  const weightChangePerDay = (targetWeight - startWeight) / days;
  
  for (let i = 0; i < days; i++) {
    // Add some randomness to make it realistic
    const randomFactor = (Math.random() - 0.5) * 0.5;
    currentWeight += weightChangePerDay + randomFactor;
    
    progressData.push({
      userId,
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
      weight: Math.round(currentWeight * 10) / 10,
      bodyFat: 20 + Math.random() * 10,
      muscleMass: 30 + Math.random() * 10,
      mood: ['excellent', 'good', 'neutral', 'tired'][Math.floor(Math.random() * 4)],
      energyLevel: Math.floor(Math.random() * 10) + 1,
      workoutCompleted: Math.random() > 0.3,
      dailySteps: Math.floor(Math.random() * 10000) + 5000,
      waterIntake: Math.floor(Math.random() * 2000) + 1500,
      sleepHours: Math.random() * 3 + 6,
      notes: i % 5 === 0 ? 'Feeling great today!' : null
    });
  }
  
  return progressData;
};

const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.success('Connected to MongoDB');
    
    // Clear existing data
    logger.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Recipe.deleteMany({}),
      Progress.deleteMany({}),
      Goal.deleteMany({})
    ]);
    logger.success('Existing data cleared');
    
    // Seed users
    logger.info('Seeding users...');
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      const user = new User(userData);
      user.calculateMacros();
      await user.save();
      createdUsers.push(user);
      logger.success(`Created user: ${user.email}`);
    }
    
    // Seed recipes
    logger.info('Seeding recipes...');
    const createdRecipes = [];
    
    for (const recipeData of sampleRecipes) {
      const recipe = new Recipe({
        ...recipeData,
        createdBy: createdUsers[0]._id,
        userCreated: false
      });
      await recipe.save();
      createdRecipes.push(recipe);
      logger.success(`Created recipe: ${recipe.title}`);
    }
    
    // Add recipes to user favorites
    createdUsers[0].favoriteRecipes = createdRecipes.map(r => r._id);
    await createdUsers[0].save();
    
    // Seed progress data for each user
    logger.info('Seeding progress data...');
    
    for (const user of createdUsers) {
      const progressData = generateProgressData(
        user._id,
        user.profile.weight + 5, // Start 5kg heavier
        user.profile.weight,
        30
      );
      
      await Progress.insertMany(progressData);
      logger.success(`Created ${progressData.length} progress entries for ${user.email}`);
    }
    
    // Seed goals for users
    logger.info('Seeding goals...');
    
    const goals = [
      {
        userId: createdUsers[0]._id,
        type: 'weight',
        title: 'Reach target weight',
        description: 'Lose 5kg in 3 months',
        startValue: createdUsers[0].profile.weight,
        currentValue: createdUsers[0].profile.weight - 2,
        targetValue: createdUsers[0].profile.targetWeight,
        unit: 'kg',
        targetDate: createdUsers[0].profile.targetDate,
        status: 'active',
        priority: 'high'
      },
      {
        userId: createdUsers[0]._id,
        type: 'fitness',
        title: 'Run 5K',
        description: 'Complete a 5K run in under 30 minutes',
        startValue: 0,
        currentValue: 3,
        targetValue: 5,
        unit: 'km',
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'active',
        priority: 'medium'
      },
      {
        userId: createdUsers[1]._id,
        type: 'muscle',
        title: 'Build muscle mass',
        description: 'Gain 5kg of muscle mass',
        startValue: 30,
        currentValue: 32,
        targetValue: 35,
        unit: 'kg',
        targetDate: createdUsers[1].profile.targetDate,
        status: 'active',
        priority: 'high'
      }
    ];
    
    for (const goalData of goals) {
      const goal = new Goal(goalData);
      await goal.save();
      logger.success(`Created goal: ${goal.title}`);
    }
    
    // Summary
    logger.info('Database seeding completed!');
    logger.info(`Created ${createdUsers.length} users`);
    logger.info(`Created ${createdRecipes.length} recipes`);
    logger.info(`Created progress data for all users`);
    logger.info(`Created ${goals.length} goals`);
    
    logger.success('\n✅ Database seeded successfully!');
    logger.info('\nYou can now login with:');
    logger.info('Email: demo@fitgoalai.com');
    logger.info('Password: Demo123!');
    
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;