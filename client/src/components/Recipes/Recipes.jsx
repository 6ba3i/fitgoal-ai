  // client/src/components/Recipes/Recipes.jsx - COMPLETE WITH ALL FEATURES
  import React, { useState, useEffect, useContext } from 'react';
  import { toast } from 'react-toastify';
  import { UserContext } from '../../context/UserContext';
  import { AuthContext } from '../../context/AuthContext';
  import { spoonacularService } from '../../services/spoonacular.service';
  import { aiService } from '../../services/ai.service';
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
    const [clusteredRecipes, setClusteredRecipes] = useState(null);
    const [viewMode, setViewMode] = useState('flat');
    const [recommendations, setRecommendations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [recommendationOffset, setRecommendationOffset] = useState(0);
    const [filters, setFilters] = useState({
      diet: '',
      minCalories: '',
      maxCalories: '',
      intolerances: ''
    });
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [activeTab, setActiveTab] = useState('search');
    const [mealPlan, setMealPlan] = useState(null);
    const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
    const [excludedIngredients, setExcludedIngredients] = useState([]);

    useEffect(() => {
      const saved = localStorage.getItem('excludedIngredients');
      if (saved) {
        setExcludedIngredients(JSON.parse(saved));
      }
      const savedOffset = localStorage.getItem('recommendationOffset');
      if (savedOffset) {
        setRecommendationOffset(parseInt(savedOffset));
      }
    }, []);

    useEffect(() => {
      if (activeTab === 'recommended') {
        fetchRecommendations();
      }
    }, [activeTab, excludedIngredients, userProfile, recommendationOffset]);

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const result = await spoonacularService.getPersonalizedRecommendations(
          userProfile, 
          excludedIngredients,
          recommendationOffset
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

    const handleRefreshRecommendations = () => {
      const newOffset = recommendationOffset + 12;
      setRecommendationOffset(newOffset);
      localStorage.setItem('recommendationOffset', newOffset.toString());
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
          
          // Try AI clustering
          if (result.data.length >= 6 && userProfile) {
            await clusterRecipes(result.data);
          } else {
            setClusteredRecipes(null);
            setViewMode('flat');
          }

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

    const clusterRecipes = async (recipesToCluster) => {
      try {
        const recipesWithNutrition = recipesToCluster.map(recipe => ({
          ...recipe,
          nutrition: {
            calories: getNutrient(recipe, 'Calories'),
            protein: getNutrient(recipe, 'Protein'),
            carbs: getNutrient(recipe, 'Carbohydrates'),
            fat: getNutrient(recipe, 'Fat')
          }
        }));

        const result = await aiService.clusterRecipes(recipesWithNutrition, 3);
        
        if (result.success && result.data) {
          setClusteredRecipes(result.data);
          setViewMode('clustered');
          toast.success('🤖 AI sorted recipes by nutritional match!', { autoClose: 2000 });
        }
      } catch (error) {
        console.error('Clustering failed:', error);
        setViewMode('flat');
      }
    };

    const getNutrient = (recipe, nutrientName) => {
      if (!recipe.nutrition || !recipe.nutrition.nutrients) return 0;
      const nutrient = recipe.nutrition.nutrients.find(n => n.name === nutrientName);
      return Math.round(nutrient?.amount || 0);
    };

    const toggleIngredientExclusion = (ingredient) => {
      setExcludedIngredients(prev => {
        const newExcluded = prev.includes(ingredient)
          ? prev.filter(i => i !== ingredient)
          : [...prev, ingredient];
        
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
        calories: getNutrient(recipe, 'Calories'),
        protein: getNutrient(recipe, 'Protein'),
        carbs: getNutrient(recipe, 'Carbohydrates'),
        fat: getNutrient(recipe, 'Fat'),
        servings: recipe.servings || 1
      };

      try {
        const result = await addMealToIntake(mealData);
        if (result.success) {
          toast.success('Added to today\'s meals!');
        }
      } catch (error) {
        toast.error('Failed to add meal');
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
          userProfile,
          filters.diet,
          excludedIngredients.join(',')
        );

        if (result.success) {
          setMealPlan(result.data);
          toast.success('Smart meal plan generated!');
        } else {
          toast.error('Failed to generate meal plan');
        }
      } catch (error) {
        console.error('Meal plan error:', error);
        toast.error('Error generating meal plan');
      } finally {
        setLoading(false);
      }
    };

    const getScoreBadgeColor = (score) => {
      if (score >= 70) return 'success';
      if (score >= 45) return 'warning';
      return 'secondary';
    };

    const getScoreIcon = (score) => {
      if (score >= 70) return '🟢';
      if (score >= 45) return '🟡';
      return '🟠';
    };

    const RecipeCard = ({ recipe }) => {
      const isFavorited = favoriteRecipes.some(r => r.id === recipe.id);
  
      // FIXED: Handle both formats + define readyInMinutes in scope
      const readyInMinutes = recipe.readyInMinutes || 30;
  
      const calories = recipe.nutrition?.calories 
        ? Math.round(recipe.nutrition.calories)
        : getNutrient(recipe, 'Calories');
    
  const protein = recipe.nutrition?.protein
    ? Math.round(recipe.nutrition.protein)
    : getNutrient(recipe, 'Protein');

      return (
        <div className="recipe-card glass-container">
          <div className="recipe-image-container">
            <div 
              className="recipe-image" 
              style={{ backgroundImage: `url(${recipe.image})` }}
            >
              <button 
                className="favorite-btn"
                onClick={() => toggleFavorite(recipe)}
              >
                <i className={`fas fa-heart ${isFavorited ? 'text-danger' : 'text-white'}`}></i>
              </button>
            </div>
          </div>
          
          <div className="recipe-content">
            <h5 className="recipe-title">{recipe.title}</h5>
            
            <div className="recipe-stats-horizontal">
              <div className="stat-item">
                <i className="fas fa-fire"></i>
                <span>{calories} cal</span>
              </div>
              <div className="stat-item">
                <i className="fas fa-dumbbell"></i>
                <span>{protein}g</span>
              </div>
              <div className="stat-item">
                <i className="fas fa-clock"></i>
                <span>{readyInMinutes} min</span>
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
        {/* Tabs */}
        <div className="recipe-tabs mb-4">
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <i className="fas fa-search me-2"></i>Search
          </button>
          <button
            className={`tab-btn ${activeTab === 'recommended' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommended')}
          >
            <i className="fas fa-star me-2"></i>Recommended
          </button>
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <i className="fas fa-heart me-2"></i>Favorites
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
            <div className="glass-container p-4 mb-4">
              <form onSubmit={handleSearch}>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <input
                      type="text"
                      className="form-control glass-input"
                      placeholder="Search recipes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select glass-input"
                      value={filters.diet}
                      onChange={(e) => setFilters({ ...filters, diet: e.target.value })}
                    >
                      <option value="">Any Diet</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="ketogenic">Keto</option>
                      <option value="paleo">Paleo</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                      {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-search me-2"></i>}
                      Search
                    </button>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-3">
                    <label className="form-label text-white-50 small">Min Calories</label>
                    <input
                      type="number"
                      className="form-control glass-input"
                      placeholder="e.g., 200"
                      value={filters.minCalories}
                      onChange={(e) => setFilters({ ...filters, minCalories: e.target.value })}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label text-white-50 small">Max Calories</label>
                    <input
                      type="number"
                      className="form-control glass-input"
                      placeholder="e.g., 600"
                      value={filters.maxCalories}
                      onChange={(e) => setFilters({ ...filters, maxCalories: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-white-50 small">Intolerances</label>
                    <input
                      type="text"
                      className="form-control glass-input"
                      placeholder="e.g., dairy, gluten"
                      value={filters.intolerances}
                      onChange={(e) => setFilters({ ...filters, intolerances: e.target.value })}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* View Toggle */}
            {clusteredRecipes && (
              <div className="mb-3 d-flex justify-content-between align-items-center">
                <div className="text-white">
                  <i className="fas fa-robot me-2"></i>
                  AI sorted {recipes.length} recipes into {clusteredRecipes.length} groups
                </div>
                <div className="d-flex gap-3">
                  <button
                    className={`btn ${viewMode === 'clustered' ? 'btn-primary' : 'btn-outline-light'}`}
                    onClick={() => setViewMode('clustered')}
                    style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      minWidth: '140px'
                    }}
                  >
                    <i className="fas fa-layer-group me-2"></i>AI Grouped
                  </button>
                  <button
                    className={`btn ${viewMode === 'flat' ? 'btn-primary' : 'btn-outline-light'}`}
                    onClick={() => setViewMode('flat')}
                    style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      minWidth: '140px'
                    }}
                  >
                    <i className="fas fa-list me-2"></i>All Results
                  </button>
                </div>
              </div>
            )}
            {/* AI CLUSTERED VIEW */}
            {viewMode === 'clustered' && clusteredRecipes ? (
              <div className="clustered-recipes">
                {clusteredRecipes.map((cluster, clusterIndex) => (
                  <div key={clusterIndex} className="cluster-group mb-4">
                    <div className="cluster-header glass-container p-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h4 className="text-white mb-1">
                            {getScoreIcon(cluster.score)} 
                            <span className="ms-2">
                              {cluster.score >= 90 ? 'PERFECT MATCH' : 
                              cluster.score >= 75 ? 'GOOD MATCH' : 
                              'OKAY MATCH'}
                            </span>
                            <span className={`badge bg-${getScoreBadgeColor(cluster.score)} ms-3`}>
                              {cluster.score.toFixed(0)}/100
                            </span>
                          </h4>
                          <p className="text-white-50 mb-0 small">
                            {cluster.recommendation}
                          </p>
                        </div>
                        <div className="text-end">
                          <div className="text-white-50 small">Average Nutrition</div>
                          <div className="text-white small">
                            {Math.round(cluster.avgNutrition.calories)} cal | 
                            {Math.round(cluster.avgNutrition.protein)}g protein | 
                            {Math.round(cluster.avgNutrition.carbs)}g carbs | 
                            {Math.round(cluster.avgNutrition.fat)}g fat
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="recipes-grid">
                      {cluster.recipes.map(recipe => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* FLAT VIEW */
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
                {!loading && recipes.length === 0 && (
                  <div className="empty-state">
                    <p className="text-white-50">Start searching for delicious recipes!</p>
                  </div>
                )}
              </div>
            )}
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
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-light"
                  onClick={() => setShowPersonalizationModal(true)}
                >
                  <i className="fas fa-sliders-h me-2"></i>Customize
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleRefreshRecommendations}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2"></i>Refresh
                </button>
              </div>
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
            <div className="meal-plan-header mb-4 d-flex justify-content-between align-items-center">
              <h3 className="text-white mb-0">Daily Meal Plan</h3>
              <button 
                className="btn btn-primary"
                onClick={generateMealPlan}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate New Plan'}
              </button>
            </div>

            {mealPlan && mealPlan.meals && (
              <div className="meal-plan-content">
                <div className="row">
                  {mealPlan.meals.map((meal, index) => (
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
                  Select ingredients you want to exclude
                </p>
                
                <div className="ingredients-grid">
                  {COMMON_INGREDIENTS.map(ingredient => (
                    <button
                      key={ingredient}
                      className={`ingredient-tag ${excludedIngredients.includes(ingredient) ? 'excluded' : ''}`}
                      onClick={() => toggleIngredientExclusion(ingredient)}
                    >
                      {ingredient}
                    </button>
                  ))}
                </div>

                {excludedIngredients.length > 0 && (
                  <button 
                    className="btn btn-outline-light mt-3"
                    onClick={clearAllExclusions}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
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
                <div className="macros-grid mb-4">
                  <div className="macro-card">
                    <div className="macro-icon">
                      <i className="fas fa-fire text-danger"></i>
                    </div>
                    <div className="macro-info">
                      <div className="macro-label">Calories</div>
                      <div className="macro-value">{getNutrient(selectedRecipe, 'Calories')}</div>
                    </div>
                  </div>
                  <div className="macro-card">
                    <div className="macro-icon">
                      <i className="fas fa-dumbbell text-info"></i>
                    </div>
                    <div className="macro-info">
                      <div className="macro-label">Protein</div>
                      <div className="macro-value">{getNutrient(selectedRecipe, 'Protein')}g</div>
                    </div>
                  </div>
                  <div className="macro-card">
                    <div className="macro-icon">
                      <i className="fas fa-bread-slice text-warning"></i>
                    </div>
                    <div className="macro-info">
                      <div className="macro-label">Carbs</div>
                      <div className="macro-value">{getNutrient(selectedRecipe, 'Carbohydrates')}g</div>
                    </div>
                  </div>
                  <div className="macro-card">
                    <div className="macro-icon">
                      <i className="fas fa-cheese text-warning"></i>
                    </div>
                    <div className="macro-info">
                      <div className="macro-label">Fat</div>
                      <div className="macro-value">{getNutrient(selectedRecipe, 'Fat')}g</div>
                    </div>
                  </div>
                </div>

                {selectedRecipe.summary && (
                  <div className="mb-4">
                    <h5 className="text-white mb-2">Summary</h5>
                    <div 
                      className="text-white-50" 
                      dangerouslySetInnerHTML={{ __html: selectedRecipe.summary }}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <button 
                    className="btn btn-success me-2"
                    onClick={() => {
                      addToMeals(selectedRecipe);
                      setSelectedRecipe(null);
                    }}
                  >
                    <i className="fas fa-plus me-2"></i>Add to Meals
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => toggleFavorite(selectedRecipe)}
                  >
                    <i className={`fas fa-heart me-2 ${favoriteRecipes.some(r => r.id === selectedRecipe.id) ? '' : 'far'}`}></i>
                    {favoriteRecipes.some(r => r.id === selectedRecipe.id) ? 'Remove from Favorites' : 'Add to Favorites'}
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