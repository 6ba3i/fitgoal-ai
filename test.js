/**
 * Spoonacular API Test Script
 * 
 * Run this to test your Spoonacular API connection
 * Usage: node test-spoonacular.js
 */

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = process.env.SPOONACULAR_BASE_URL || 'https://api.spoonacular.com';

console.log('\n🧪 ====================================');
console.log('   SPOONACULAR API TEST');
console.log('======================================\n');

console.log('📋 Configuration:');
console.log(`   API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : '❌ NOT SET'}`);
console.log(`   Base URL: ${BASE_URL}`);
console.log('');

if (!API_KEY) {
  console.error('❌ ERROR: SPOONACULAR_API_KEY not found in .env file');
  process.exit(1);
}

async function testRandomRecipe() {
  console.log('🎲 Test 1: Random Recipe (Basic Connection Test)');
  console.log('   Testing: GET /recipes/random');
  try {
    const response = await axios.get(`${BASE_URL}/recipes/random`, {
      params: {
        apiKey: API_KEY,
        number: 1
      }
    });
    
    console.log('   ✅ Success!');
    console.log(`   Recipe: ${response.data.recipes[0].title}`);
    
    if (response.headers['x-api-quota-used']) {
      console.log(`   Quota Used: ${response.headers['x-api-quota-used']}`);
      console.log(`   Quota Left: ${response.headers['x-api-quota-left']}`);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status} - ${error.response.statusText}`);
      console.error(`   Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testComplexSearch() {
  console.log('\n🔍 Test 2: Complex Search (Your Main Use Case)');
  console.log('   Testing: GET /recipes/complexSearch');
  console.log('   Query: "pasta"');
  
  try {
    const response = await axios.get(`${BASE_URL}/recipes/complexSearch`, {
      params: {
        apiKey: API_KEY,
        query: 'pasta',
        number: 5,
        addRecipeInformation: true,  // CORRECT PARAMETER
        fillIngredients: true
      }
    });
    
    console.log('   ✅ Success!');
    console.log(`   Total Results: ${response.data.totalResults}`);
    console.log(`   Returned: ${response.data.results.length} recipes`);
    
    if (response.data.results.length > 0) {
      console.log('\n   📝 Sample Results:');
      response.data.results.slice(0, 3).forEach((recipe, index) => {
        console.log(`      ${index + 1}. ${recipe.title}`);
        if (recipe.nutrition) {
          const calories = recipe.nutrition.nutrients?.find(n => n.name === 'Calories');
          if (calories) {
            console.log(`         Calories: ${calories.amount} ${calories.unit}`);
          }
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status} - ${error.response.statusText}`);
      console.error(`   Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testWithWrongParameter() {
  console.log('\n⚠️  Test 3: Search with WRONG Parameter (Should Still Work)');
  console.log('   Testing: addRecipeNutrition instead of addRecipeInformation');
  
  try {
    const response = await axios.get(`${BASE_URL}/recipes/complexSearch`, {
      params: {
        apiKey: API_KEY,
        query: 'pasta',
        number: 2,
        addRecipeNutrition: true,  // WRONG PARAMETER - for comparison
        fillIngredients: true
      }
    });
    
    console.log('   ✅ API responded (parameter ignored)');
    console.log(`   Results: ${response.data.results.length} recipes`);
    console.log('   ⚠️  Note: Nutrition data might be missing');
    
    return true;
  } catch (error) {
    console.error('   ❌ Failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    return false;
  }
}

async function testWithFilters() {
  console.log('\n🎯 Test 4: Search with Filters (Like Your App Does)');
  console.log('   Testing: Search with calorie range and diet');
  
  try {
    const response = await axios.get(`${BASE_URL}/recipes/complexSearch`, {
      params: {
        apiKey: API_KEY,
        query: 'chicken',
        minCalories: 300,
        maxCalories: 600,
        diet: 'vegetarian',
        number: 5,
        addRecipeInformation: true,
        fillIngredients: true
      }
    });
    
    console.log('   ✅ Success!');
    console.log(`   Found: ${response.data.totalResults} total vegetarian chicken recipes`);
    console.log(`   Returned: ${response.data.results.length} recipes`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    return false;
  }
}

async function runAllTests() {
  const results = [];
  
  results.push(await testRandomRecipe());
  results.push(await testComplexSearch());
  results.push(await testWithWrongParameter());
  results.push(await testWithFilters());
  
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  console.log('\n======================================');
  console.log('   TEST RESULTS');
  console.log('======================================');
  console.log(`✅ Passed: ${passed}/4`);
  console.log(`❌ Failed: ${failed}/4`);
  
  if (passed === 4) {
    console.log('\n🎉 All tests passed! Your API is working correctly!');
  } else if (passed > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  } else {
    console.log('\n❌ All tests failed. Please check your API key and internet connection.');
  }
  
  console.log('\n💡 Next Steps:');
  if (failed > 0) {
    console.log('   1. Verify your API key at https://spoonacular.com/food-api/console');
    console.log('   2. Check your .env file has SPOONACULAR_API_KEY set');
    console.log('   3. Ensure you have API quota remaining');
  } else {
    console.log('   1. Update your server files with the fixed code');
    console.log('   2. Restart your server');
    console.log('   3. Try searching in your app!');
  }
  console.log('');
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});