import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { recipeService } from '../../services/recipe.service';
import { aiService } from '../../services/ai.service';
import './Recipes.css';

const Recipes = () => {
  const { userProfile, favoriteRecipes, addFavoriteRecipe, removeFavoriteRecipe, addMealToIntake } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    diet: '',
    minCalories: '',
    maxCalories: '',
    intolerances: ''
  });
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [mealPlan, setMealPlan] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await recipeService.getPersonalizedRecommendations();
      if (response.success && response.data) {
        setRecommendations(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
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
      const response = await recipeService.searchRecipes({
        query: searchQuery,
        ...filters
      });

      if (response.success) {
        // Apply AI clustering if available
        if (response.data && response.data.length > 0) {
          const clustered = await aiService.clusterRecipes(response.data);
          if (clustered.success && clustered.data.length > 0) {
            // Use the best cluster
            const bestCluster = clustered.data[0];
            setRecipes(bestCluster.recipes || response.data);
            toast.success(`Found ${bestCluster.recipes?.length || response.data.length} recipes matching your goals!`);
          } else {
            setRecipes(response.data);
          }
        } else {
          setRecipes([]);
          toast.info('No recipes found. Try adjusting your search criteria.');
        }
      }
    } catch (error) {
      toast.error('Failed to search recipes');
      console.error('Recipe search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFavorites = async (recipe) => {
    try {
      const response = await recipeService.addToFavorites(recipe.id || recipe.spoonacularId);
      if (response.success) {
        addFavoriteRecipe(recipe);
        toast.success('Added to favorites!');
      }
    } catch (error) {
      toast.error('Failed to add to favorites');
    }
  };

  const handleRemoveFromFavorites = async (recipeId) => {
    try {
      const response = await recipeService.removeFromFavorites(recipeId);
      if (response.success) {
        removeFavoriteRecipe(recipeId);
        toast.success('Removed from favorites');
      }
    } catch (error) {
      toast.error('Failed to remove from favorites');
    }
  };

  const handleAddToDaily = async (recipe) => {
    const mealData = {
      recipeId: recipe.id || recipe.spoonacularId,
      recipeName: recipe.title,
      calories: recipe.nutrition?.calories || 0,
      protein: recipe.nutrition?.protein || 0,
      carbs: recipe.nutrition?.carbs || 0,
      fat: recipe.nutrition?.fat || 0
    };

    const response = await addMealToIntake(mealData);
    if (response.success) {
      toast.success('Added to daily intake!');
    } else {
      toast.error('Failed to add to daily intake');
    }
  };

  const handleGenerateMealPlan = async () => {
    setLoading(true);
    try {
      const response = await recipeService.generateMealPlan({
        diet: filters.diet,
        exclude: filters.intolerances
      });

      if (response.success) {
        setMealPlan(response.data);
        toast.success('Meal plan generated!');
      }
    } catch (error) {
      toast.error('Failed to generate meal plan');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (recipe) => {
    setLoading(true);
    try {
      const response = await recipeService.getRecipeDetails(recipe.id || recipe.spoonacularId);
      if (response.success) {
        setSelectedRecipe(response.data);
      }
    } catch (error) {
      toast.error('Failed to load recipe details');
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (recipeId) => {
    return favoriteRecipes.some(r => r.id === recipeId || r.spoonacularId === recipeId);
  };

  const getCalorieColor = (calories) => {
    const target = userProfile?.profile?.dailyCalories / 3 || 600;
    if (calories <= target - 100) return 'text-info';
    if (calories <= target + 100) return 'text-success';
    return 'text-warning';
  };

  const RecipeCard = ({ recipe }) => (
    <div className="recipe-card glass-container">
      <div className="recipe-image-container">
        <img 
          src={recipe.image || 'https://via.placeholder.com/300x200'} 
          alt={recipe.title}
          className="recipe-image"
        />
        <div className="recipe-badges">
          {recipe.veryHealthy && (
            <span className="badge bg-success">Healthy</span>
          )}
          {recipe.veryPopular && (
            <span className="badge bg-info">Popular</span>
          )}
          {recipe.cheap && (
            <span className="badge bg-warning">Budget</span>
          )}
        </div>
      </div>
      
      <div className="recipe-content">
        <h5 className="recipe-title">{recipe.title}</h5>
        
        <div className="recipe-nutrition">
          <div className="nutrition-item">
            <i className="fas fa-fire"></i>
            <span className={getCalorieColor(recipe.nutrition?.calories)}>
              {recipe.nutrition?.calories || 0} cal
            </span>
          </div>
          <div className="nutrition-item">
            <i className="fas fa-drumstick-bite"></i>
            <span>{recipe.nutrition?.protein || 0}g</span>
          </div>
          <div className="nutrition-item">
            <i className="fas fa-bread-slice"></i>
            <span>{recipe.nutrition?.carbs || 0}g</span>
          </div>
          <div className="nutrition-item">
            <i className="fas fa-cheese"></i>
            <span>{recipe.nutrition?.fat || 0}g</span>
          </div>
        </div>

        {recipe.readyInMinutes && (
          <div className="recipe-time">
            <i className="fas fa-clock"></i>
            <span>{recipe.readyInMinutes} minutes</span>
          </div>
        )}

        {recipe.diets && recipe.diets.length > 0 && (
          <div className="recipe-diets">
            {recipe.diets.map((diet, index) => (
              <span key={index} className="diet-tag">{diet}</span>
            ))}
          </div>
        )}

        <div className="recipe-actions">
          <button
            className={`action-btn ${isFavorite(recipe.id || recipe.spoonacularId) ? 'favorited' : ''}`}
            onClick={() => isFavorite(recipe.id || recipe.spoonacularId) 
              ? handleRemoveFromFavorites(recipe.id || recipe.spoonacularId)
              : handleAddToFavorites(recipe)}
            title="Add to favorites"
          >
            <i className={`${isFavorite(recipe.id || recipe.spoonacularId) ? 'fas' : 'far'} fa-heart`}></i>
          </button>
          <button
            className="action-btn"
            onClick={() => handleAddToDaily(recipe)}
            title="Add to daily intake"
          >
            <i className="fas fa-plus-circle"></i>
          </button>
          <button
            className="action-btn"
            onClick={() => handleViewDetails(recipe)}
            title="View details"
          >
            <i className="fas fa-info-circle"></i>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container recipes-container">
      <div className="recipes-header mb-4">
        <h1 className="text-white">Recipe Discovery</h1>
        <p className="text-white-50">Find healthy recipes tailored to your goals</p>
      </div>

      {/* Tabs */}
      <div className="recipe-tabs mb-4">
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <i className="fas fa-search me-2"></i>Search
        </button>
        <button
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <i className="fas fa-heart me-2"></i>Favorites
        </button>
        <button
          className={`tab-btn ${activeTab === 'recommended' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommended')}
        >
          <i className="fas fa-star me-2"></i>Recommended
        </button>
        <button
          className={`tab-btn ${activeTab === 'mealplan' ? 'active' : ''}`}
          onClick={() => setActiveTab('mealplan')}
        >
          <i className="fas fa-calendar-alt me-2"></i>Meal Plan
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <>
          <div className="glass-container mb-4">
            <form onSubmit={handleSearch}>
              <div className="search-bar">
                <input
                  type="text"
                  className="form-control glass-input search-input"
                  placeholder="Search for recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="filter-toggle-btn"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <i className="fas fa-filter"></i>
                </button>
                <button type="submit" className="glass-button search-btn" disabled={loading}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <i className="fas fa-search"></i>
                  )}
                  Search
                </button>
              </div>

              {showFilters && (
                <div className="filters-section mt-3">
                  <div className="row">
                    <div className="col-md-3 mb-2">
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
                        <option value="pescetarian">Pescetarian</option>
                        <option value="paleo">Paleo</option>
                      </select>
                    </div>
                    <div className="col-md-3 mb-2">
                      <input
                        type="number"
                        className="form-control glass-input"
                        placeholder="Min Calories"
                        value={filters.minCalories}
                        onChange={(e) => setFilters({...filters, minCalories: e.target.value})}
                      />
                    </div>
                    <div className="col-md-3 mb-2">
                      <input
                        type="number"
                        className="form-control glass-input"
                        placeholder="Max Calories"
                        value={filters.maxCalories}
                        onChange={(e) => setFilters({...filters, maxCalories: e.target.value})}
                      />
                    </div>
                    <div className="col-md-3 mb-2">
                      <input
                        type="text"
                        className="form-control glass-input"
                        placeholder="Intolerances (comma separated)"
                        value={filters.intolerances}
                        onChange={(e) => setFilters({...filters, intolerances: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>

            {userProfile && (
              <div className="recommendations-bar mt-3">
                <span className="text-white-50">
                  <i className="fas fa-info-circle me-2"></i>
                  Recommended per meal: ~{Math.round(userProfile.profile.dailyCalories / 3)} calories
                </span>
              </div>
            )}
          </div>

          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id || recipe.spoonacularId} recipe={recipe} />
            ))}
          </div>

          {recipes.length === 0 && !loading && (
            <div className="empty-state">
              <i className="fas fa-search fa-3x text-white-50 mb-3"></i>
              <p className="text-white-50">Search for delicious recipes to get started</p>
            </div>
          )}
        </>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="recipes-grid">
          {favoriteRecipes.length > 0 ? (
            favoriteRecipes.map((recipe) => (
              <RecipeCard key={recipe.id || recipe.spoonacularId} recipe={recipe} />
            ))
          ) : (
            <div className="empty-state">
              <i className="fas fa-heart fa-3x text-white-50 mb-3"></i>
              <p className="text-white-50">No favorite recipes yet. Start exploring!</p>
            </div>
          )}
        </div>
      )}

      {/* Recommended Tab */}
      {activeTab === 'recommended' && (
        <div className="recipes-grid">
          {recommendations.length > 0 ? (
            recommendations.map((recipe) => (
              <RecipeCard key={recipe.id || recipe.spoonacularId} recipe={recipe} />
            ))
          ) : (
            <div className="text-center py-5">
              <div className="spinner-border text-light" role="status">
                <span className="visually-hidden">Loading recommendations...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meal Plan Tab */}
      {activeTab === 'mealplan' && (
        <div className="glass-container">
          <div className="meal-plan-header">
            <h4 className="text-white">AI-Generated Meal Plan</h4>
            <button 
              className="glass-button"
              onClick={handleGenerateMealPlan}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2"></span>
              ) : (
                <i className="fas fa-magic me-2"></i>
              )}
              Generate Plan
            </button>
          </div>

          {mealPlan ? (
            <div className="meal-plan-content mt-4">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="meal-section">
                    <h5 className="text-white mb-3">
                      <i className="fas fa-sun me-2"></i>Breakfast
                    </h5>
                    {mealPlan.meals?.[0] && (
                      <div className="meal-item">
                        <p className="text-white">{mealPlan.meals[0].title}</p>
                        <small className="text-white-50">
                          Ready in {mealPlan.meals[0].readyInMinutes} min
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="meal-section">
                    <h5 className="text-white mb-3">
                      <i className="fas fa-sun me-2"></i>Lunch
                    </h5>
                    {mealPlan.meals?.[1] && (
                      <div className="meal-item">
                        <p className="text-white">{mealPlan.meals[1].title}</p>
                        <small className="text-white-50">
                          Ready in {mealPlan.meals[1].readyInMinutes} min
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="meal-section">
                    <h5 className="text-white mb-3">
                      <i className="fas fa-moon me-2"></i>Dinner
                    </h5>
                    {mealPlan.meals?.[2] && (
                      <div className="meal-item">
                        <p className="text-white">{mealPlan.meals[2].title}</p>
                        <small className="text-white-50">
                          Ready in {mealPlan.meals[2].readyInMinutes} min
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {mealPlan.nutrients && (
                <div className="meal-plan-nutrition mt-4">
                  <h5 className="text-white mb-3">Daily Nutrition</h5>
                  <div className="nutrition-summary">
                    <div className="nutrition-stat">
                      <span className="stat-label">Calories</span>
                      <span className="stat-value">{mealPlan.nutrients.calories}</span>
                    </div>
                    <div className="nutrition-stat">
                      <span className="stat-label">Protein</span>
                      <span className="stat-value">{mealPlan.nutrients.protein}g</span>
                    </div>
                    <div className="nutrition-stat">
                      <span className="stat-label">Carbs</span>
                      <span className="stat-value">{mealPlan.nutrients.carbohydrates}g</span>
                    </div>
                    <div className="nutrition-stat">
                      <span className="stat-label">Fat</span>
                      <span className="stat-value">{mealPlan.nutrients.fat}g</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state mt-4">
              <i className="fas fa-calendar-alt fa-3x text-white-50 mb-3"></i>
              <p className="text-white-50">Generate a personalized meal plan based on your goals</p>
            </div>
          )}
        </div>
      )}

      {/* Recipe Details Modal */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-content glass-container recipe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white">{selectedRecipe.title}</h3>
              <button 
                className="close-button"
                onClick={() => setSelectedRecipe(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="recipe-details">
              <img 
                src={selectedRecipe.image || 'https://via.placeholder.com/600x400'} 
                alt={selectedRecipe.title}
                className="recipe-detail-image"
              />

              <div className="recipe-meta">
                <div className="meta-item">
                  <i className="fas fa-clock"></i>
                  <span>{selectedRecipe.readyInMinutes} minutes</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-users"></i>
                  <span>{selectedRecipe.servings} servings</span>
                </div>
                {selectedRecipe.healthScore && (
                  <div className="meta-item">
                    <i className="fas fa-heartbeat"></i>
                    <span>Health Score: {selectedRecipe.healthScore}/100</span>
                  </div>
                )}
              </div>

              {selectedRecipe.ingredients && (
                <div className="ingredients-section">
                  <h5 className="text-white mb-3">Ingredients</h5>
                  <ul className="ingredients-list">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-white-50">
                        {ingredient.original || `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecipe.instructions && (
                <div className="instructions-section">
                  <h5 className="text-white mb-3">Instructions</h5>
                  <ol className="instructions-list">
                    {(typeof selectedRecipe.instructions === 'string' 
                      ? selectedRecipe.instructions.split('\n')
                      : selectedRecipe.instructions
                    ).map((instruction, index) => (
                      <li key={index} className="text-white-50 mb-2">
                        {typeof instruction === 'object' ? instruction.step : instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="recipe-actions-modal">
                <button
                  className="glass-button"
                  onClick={() => handleAddToFavorites(selectedRecipe)}
                >
                  <i className="fas fa-heart me-2"></i>
                  Add to Favorites
                </button>
                <button
                  className="glass-button"
                  onClick={() => handleAddToDaily(selectedRecipe)}
                >
                  <i className="fas fa-plus-circle me-2"></i>
                  Add to Daily Intake
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recipes;