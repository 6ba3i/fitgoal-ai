// client/src/components/Recipes/Recipes.jsx
import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import { spoonacularService } from '../../services/spoonacular.service';
import './Recipes.css';

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

  useEffect(() => {
    if (userProfile) {
      fetchRecommendations();
    }
  }, [userProfile]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const result = await spoonacularService.getPersonalizedRecommendations(userProfile);
      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
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
        intolerances: filters.intolerances
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

  const viewRecipeDetails = async (recipe) => {
    setLoading(true);
    try {
      const result = await spoonacularService.getRecipeDetails(recipe.id);
      if (result.success) {
        setSelectedRecipe(result.data);
      } else {
        // Use the basic recipe data if details fail
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
        setSelectedRecipe(null);
      } else {
        toast.error(result.error || 'Failed to add meal');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const generateMealPlan = async () => {
    if (!userProfile) {
      toast.error('Please complete your profile first');
      return;
    }

    setLoading(true);
    try {
      const result = await spoonacularService.getMealPlan(
        userProfile.dailyCalories || 2000,
        filters.diet,
        filters.intolerances
      );

      if (result.success) {
        setMealPlan(result.data);
        toast.success('Meal plan generated!');
      } else {
        toast.error('Failed to generate meal plan');
      }
    } catch (error) {
      console.error('Meal plan error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const RecipeCard = ({ recipe }) => {
    const isFavorited = favoriteRecipes.some(r => r.id === recipe.id);
    const calories = recipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 
                    recipe.nutrition?.calories || 
                    recipe.calories || 0;

    return (
      <div className="recipe-card glass-container">
        <img 
          src={recipe.image || 'https://via.placeholder.com/300x200?text=No+Image'} 
          alt={recipe.title}
          className="recipe-image"
        />
        <div className="recipe-content">
          <h5 className="recipe-title">{recipe.title}</h5>
          <div className="recipe-info">
            <span><i className="fas fa-clock"></i> {recipe.readyInMinutes || 30} min</span>
            <span><i className="fas fa-fire"></i> {Math.round(calories)} cal</span>
            <span><i className="fas fa-utensils"></i> {recipe.servings || 4} servings</span>
          </div>
          <div className="recipe-actions">
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => viewRecipeDetails(recipe)}
            >
              View Details
            </button>
            <button 
              className={`btn btn-sm ${isFavorited ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => toggleFavorite(recipe)}
            >
              <i className={`fas fa-heart ${isFavorited ? '' : 'text-white'}`}></i>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container recipes-container">
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
              <p className="text-white-50">Complete your profile to get personalized recommendations!</p>
            </div>
          )}
        </div>
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
                      <div className="meal-item">
                        <p className="text-white">{meal.title}</p>
                        <small className="text-white-50">
                          Ready in {meal.readyInMinutes} min
                        </small>
                        <button 
                          className="btn btn-sm btn-outline-light mt-2"
                          onClick={() => viewRecipeDetails(meal)}
                        >
                          View Recipe
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {mealPlan.nutrients && (
                <div className="meal-plan-nutrition mt-4">
                  <h5 className="text-white mb-3">Daily Nutrition</h5>
                  <div className="nutrition-summary">
                    <div className="nutrition-stat">
                      <span className="stat-label">Calories</span>
                      <span className="stat-value">{Math.round(mealPlan.nutrients.calories)}</span>
                    </div>
                    <div className="nutrition-stat">
                      <span className="stat-label">Protein</span>
                      <span className="stat-value">{Math.round(mealPlan.nutrients.protein)}g</span>
                    </div>
                    <div className="nutrition-stat">
                      <span className="stat-label">Carbs</span>
                      <span className="stat-value">{Math.round(mealPlan.nutrients.carbohydrates)}g</span>
                    </div>
                    <div className="nutrition-stat">
                      <span className="stat-label">Fat</span>
                      <span className="stat-value">{Math.round(mealPlan.nutrients.fat)}g</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!mealPlan && !loading && (
            <div className="text-center py-5">
              <p className="text-white-50">Generate a personalized meal plan based on your profile!</p>
            </div>
          )}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="recipe-modal glass-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
              onClick={() => setSelectedRecipe(null)}
            ></button>
            
            <div className="recipe-details">
              <img 
                src={selectedRecipe.image || 'https://via.placeholder.com/600x400'} 
                alt={selectedRecipe.title}
                className="recipe-detail-image"
              />
              
              <h3 className="text-white mb-3">{selectedRecipe.title}</h3>
              
              <div className="recipe-meta mb-4">
                <span className="badge bg-primary me-2">
                  <i className="fas fa-clock"></i> {selectedRecipe.readyInMinutes || 30} min
                </span>
                <span className="badge bg-info me-2">
                  <i className="fas fa-utensils"></i> {selectedRecipe.servings || 4} servings
                </span>
                <span className="badge bg-warning">
                  <i className="fas fa-fire"></i> {
                    Math.round(selectedRecipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 
                    selectedRecipe.nutrition?.calories || 
                    selectedRecipe.calories || 0)
                  } cal
                </span>
              </div>

              <div className="recipe-actions mb-4">
                <button 
                  className="btn btn-success me-2"
                  onClick={() => addToMeals(selectedRecipe)}
                >
                  <i className="fas fa-plus me-2"></i>Add to Today's Meals
                </button>
                <button 
                  className={`btn ${favoriteRecipes.some(r => r.id === selectedRecipe.id) ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => toggleFavorite(selectedRecipe)}
                >
                  <i className="fas fa-heart me-2"></i>
                  {favoriteRecipes.some(r => r.id === selectedRecipe.id) ? 'Remove from' : 'Add to'} Favorites
                </button>
              </div>

              {selectedRecipe.summary && (
                <div className="mb-4">
                  <h5 className="text-white">Description</h5>
                  <p className="text-white-50" dangerouslySetInnerHTML={{ 
                    __html: selectedRecipe.summary 
                  }}></p>
                </div>
              )}

              {selectedRecipe.instructions && (
                <div className="mb-4">
                  <h5 className="text-white">Instructions</h5>
                  <div className="text-white-50" dangerouslySetInnerHTML={{ 
                    __html: selectedRecipe.instructions 
                  }}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recipes;