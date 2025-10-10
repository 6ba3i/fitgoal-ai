import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import { spoonacularService } from '../../services/spoonacular.service';
import './Recipes.css';

const COMMON_INGREDIENTS = [
  'dairy', 'eggs', 'gluten', 'peanuts', 'tree nuts', 'soy', 
  'shellfish', 'fish', 'wheat', 'sesame', 'mushrooms', 
  'tomatoes', 'onions', 'garlic', 'peppers', 'coconut'
];

const Recipes = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, favoriteRecipes, addFavoriteRecipe, removeFavoriteRecipe, addMealToIntake } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    diet: '',
    minCalories: '',
    maxCalories: '',
    intolerances: ''
  });
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [mealPlan, setMealPlan] = useState(null);
  
  // Personalization states
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [excludedIngredients, setExcludedIngredients] = useState([]);

  useEffect(() => {
    // Load excluded ingredients from localStorage
    const saved = localStorage.getItem('excludedIngredients');
    if (saved) {
      setExcludedIngredients(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'recommended') {
      fetchRecommendations();
    }
  }, [activeTab, excludedIngredients, userProfile]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const result = await spoonacularService.getPersonalizedRecommendations(
        userProfile, 
        excludedIngredients
      );
      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() && !filters.diet) {
      toast.warning('Please enter a search term or select filters');
      return;
    }

    setLoading(true);
    try {
      const result = await spoonacularService.searchRecipes(searchQuery, {
        diet: filters.diet,
        minCalories: filters.minCalories,
        maxCalories: filters.maxCalories,
        intolerances: filters.intolerances,
        excludeIngredients: excludedIngredients.join(',')
      });

      if (result.success) {
        setRecipes(result.data);
        if (result.data.length === 0) {
          toast.info('No recipes found. Try different search terms.');
        }
      } else {
        toast.error('Failed to search recipes');
      }
    } catch (error) {
      console.error('Recipe search error:', error);
      toast.error('An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const toggleIngredientExclusion = (ingredient) => {
    setExcludedIngredients(prev => {
      const newExcluded = prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient];
      
      // Save to localStorage
      localStorage.setItem('excludedIngredients', JSON.stringify(newExcluded));
      return newExcluded;
    });
  };

  const clearAllExclusions = () => {
    setExcludedIngredients([]);
    localStorage.removeItem('excludedIngredients');
  };

  const viewRecipeDetails = async (recipe) => {
    setLoading(true);
    try {
      const result = await spoonacularService.getRecipeDetails(recipe.id);
      if (result.success) {
        setSelectedRecipe(result.data);
      } else {
        setSelectedRecipe(recipe);
      }
    } catch (error) {
      console.error('Failed to get recipe details:', error);
      setSelectedRecipe(recipe);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (recipe) => {
    const isFavorited = favoriteRecipes.some(r => r.id === recipe.id);
    
    try {
      if (isFavorited) {
        const result = await removeFavoriteRecipe(recipe.id);
        if (result.success) {
          toast.success('Removed from favorites');
        }
      } else {
        const result = await addFavoriteRecipe(recipe);
        if (result.success) {
          toast.success('Added to favorites');
        }
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const addToMeals = async (recipe) => {
    const mealData = {
      recipeId: recipe.id,
      recipeName: recipe.title,
      calories: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 
                         recipe.nutrition?.calories || 
                         recipe.calories || 0),
      protein: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 
                        recipe.nutrition?.protein || 
                        recipe.protein || 0),
      carbs: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 
                       recipe.nutrition?.carbs || 
                       recipe.carbs || 0),
      fat: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount || 
                     recipe.nutrition?.fat || 
                     recipe.fat || 0),
      servings: recipe.servings || 1
    };

    try {
      const result = await addMealToIntake(mealData);
      if (result.success) {
        toast.success('Added to today\'s meals!');
      } else {
        toast.error('Failed to add meal');
      }
    } catch (error) {
      toast.error('Error adding meal');
    }
  };

  const generateMealPlan = async () => {
    if (!userProfile) {
      toast.warning('Please complete your profile first');
      return;
    }

    setLoading(true);
    try {
      const result = await spoonacularService.getMealPlan(
        userProfile.dailyCalories,
        filters.diet,
        excludedIngredients.join(',')
      );

      if (result.success) {
        setMealPlan(result.data);
        toast.success('Meal plan generated!');
      } else {
        toast.error('Failed to generate meal plan');
      }
    } catch (error) {
      console.error('Meal plan generation error:', error);
      toast.error('Error generating meal plan');
    } finally {
      setLoading(false);
    }
  };

  const RecipeCard = ({ recipe }) => {
    const isFavorited = favoriteRecipes.some(r => r.id === recipe.id);
    const calories = recipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 
                    recipe.nutrition?.calories || 
                    recipe.calories || 0;
    const protein = recipe.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 
                   recipe.nutrition?.protein || 
                   recipe.protein || 0;

    return (
      <div className="recipe-card glass-container">
        <div className="recipe-image" style={{ backgroundImage: `url(${recipe.image})` }}>
          <button 
            className="favorite-btn"
            onClick={() => toggleFavorite(recipe)}
          >
            <i className={`fas fa-heart ${isFavorited ? 'text-danger' : 'text-white'}`}></i>
          </button>
        </div>
        <div className="recipe-content">
          <h5 className="recipe-title text-white">{recipe.title}</h5>
          <div className="recipe-stats">
            <div className="stat">
              <i className="fas fa-fire text-warning"></i>
              <span>{Math.round(calories)} cal</span>
            </div>
            <div className="stat">
              <i className="fas fa-drumstick-bite text-info"></i>
              <span>{Math.round(protein)}g protein</span>
            </div>
            <div className="stat">
              <i className="fas fa-clock text-success"></i>
              <span>{recipe.readyInMinutes || 30} min</span>
            </div>
          </div>
          <div className="recipe-actions">
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => viewRecipeDetails(recipe)}
            >
              View Details
            </button>
            <button 
              className="btn btn-sm btn-success"
              onClick={() => addToMeals(recipe)}
            >
              Add to Meals
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container recipes-container">
      {/* Personalization Modal */}
      {showPersonalizationModal && (
        <div className="personalization-overlay" onClick={() => setShowPersonalizationModal(false)}>
          <div className="personalization-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white">Personalize Your Recipes</h3>
              <button 
                className="close-btn"
                onClick={() => setShowPersonalizationModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <p className="text-white-50 mb-4">
                Select ingredients you want to exclude from recipe recommendations
              </p>
              
              <div className="ingredients-grid">
                {COMMON_INGREDIENTS.map(ingredient => (
                  <button
                    key={ingredient}
                    className={`ingredient-tag ${excludedIngredients.includes(ingredient) ? 'excluded' : ''}`}
                    onClick={() => toggleIngredientExclusion(ingredient)}
                  >
                    {ingredient}
                    {excludedIngredients.includes(ingredient) && (
                      <i className="fas fa-times-circle ms-2"></i>
                    )}
                  </button>
                ))}
              </div>

              {excludedIngredients.length > 0 && (
                <div className="mt-4">
                  <button 
                    className="btn btn-outline-light btn-sm"
                    onClick={clearAllExclusions}
                  >
                    Clear All Exclusions
                  </button>
                  <p className="text-white-50 mt-2 small">
                    {excludedIngredients.length} ingredient(s) excluded
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-primary w-100"
                onClick={() => {
                  setShowPersonalizationModal(false);
                  fetchRecommendations();
                  toast.success('Preferences saved!');
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="recipes-header mb-4">
        <h1 className="text-white">Discover Recipes</h1>
        <p className="text-white-50">Find delicious recipes tailored to your nutritional goals</p>
      </div>

      {/* Tab Navigation */}
      <div className="recipes-nav mb-4">
        <button 
          className={`recipes-nav-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <i className="fas fa-search me-2"></i>Search
        </button>
        <button 
          className={`recipes-nav-btn ${activeTab === 'recommended' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommended')}
        >
          <i className="fas fa-star me-2"></i>Recommended
        </button>
        <button 
          className={`recipes-nav-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <i className="fas fa-heart me-2"></i>Favorites
        </button>
        <button 
          className={`recipes-nav-btn ${activeTab === 'mealplan' ? 'active' : ''}`}
          onClick={() => setActiveTab('mealplan')}
        >
          <i className="fas fa-calendar me-2"></i>Meal Plan
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <>
          <div className="glass-container p-4 mb-4">
            <form onSubmit={handleSearch}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <input 
                    type="text"
                    className="form-control glass-input"
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <select 
                    className="form-select glass-input"
                    value={filters.diet}
                    onChange={(e) => setFilters({...filters, diet: e.target.value})}
                  >
                    <option value="">Any Diet</option>
                    <option value="gluten free">Gluten Free</option>
                    <option value="ketogenic">Ketogenic</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="paleo">Paleo</option>
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="recipes-grid">
            {loading && (
              <div className="text-center w-100">
                <div className="spinner-border text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {!loading && recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
            {!loading && recipes.length === 0 && searchQuery && (
              <div className="empty-state">
                <p className="text-white-50">No recipes found. Try a different search.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Recommended Tab */}
      {activeTab === 'recommended' && (
        <>
          <div className="glass-container p-4 mb-4 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="text-white mb-1">Personalized Recommendations</h5>
              <p className="text-white-50 small mb-0">
                {excludedIngredients.length > 0 
                  ? `Excluding ${excludedIngredients.length} ingredient(s)` 
                  : 'No ingredients excluded'}
              </p>
            </div>
            <button 
              className="btn btn-outline-light"
              onClick={() => setShowPersonalizationModal(true)}
            >
              <i className="fas fa-sliders-h me-2"></i>
              Customize
            </button>
          </div>

          <div className="recipes-grid">
            {loading && (
              <div className="text-center w-100">
                <div className="spinner-border text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {!loading && recommendations.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
            {!loading && recommendations.length === 0 && (
              <div className="empty-state">
                <p className="text-white-50">No recommendations available. Try adjusting your preferences!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="recipes-grid">
          {favoriteRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
          {favoriteRecipes.length === 0 && (
            <div className="empty-state">
              <p className="text-white-50">No favorite recipes yet. Start exploring!</p>
            </div>
          )}
        </div>
      )}

      {/* Meal Plan Tab */}
      {activeTab === 'mealplan' && (
        <div className="glass-container p-4">
          <div className="meal-plan-header mb-4">
            <h3 className="text-white">Daily Meal Plan</h3>
            <button 
              className="btn btn-primary"
              onClick={generateMealPlan}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate New Plan'}
            </button>
          </div>

          {mealPlan && (
            <div className="meal-plan-content">
              <div className="row">
                {mealPlan.meals?.map((meal, index) => (
                  <div key={index} className="col-md-4 mb-3">
                    <div className="meal-section">
                      <h5 className="text-white mb-3">
                        {index === 0 ? 'Breakfast' : index === 1 ? 'Lunch' : 'Dinner'}
                      </h5>
                      <RecipeCard recipe={meal} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!mealPlan && !loading && (
            <div className="empty-state">
              <p className="text-white-50">Generate a meal plan to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Recipe Details Modal */}
      {selectedRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="recipe-modal glass-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-btn"
              onClick={() => setSelectedRecipe(null)}
            >
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-white mb-3">{selectedRecipe.title}</h3>
            {selectedRecipe.image && (
              <img src={selectedRecipe.image} alt={selectedRecipe.title} className="w-100 rounded mb-3" />
            )}
            <div className="recipe-modal-content">
              {selectedRecipe.summary && (
                <div dangerouslySetInnerHTML={{ __html: selectedRecipe.summary }} 
                     className="text-white-50 mb-3" />
              )}
              <button 
                className="btn btn-success w-100"
                onClick={() => {
                  addToMeals(selectedRecipe);
                  setSelectedRecipe(null);
                }}
              >
                Add to Today's Meals
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recipes;