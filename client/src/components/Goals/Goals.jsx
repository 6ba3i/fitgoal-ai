// client/src/components/Goals/Goals.jsx - FIXED INFINITE LOOP
import React, { useState, useEffect, useContext, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import { aiService } from '../../services/ai.service';
import './Goals.css';

const Goals = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, updateProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [plateauAlert, setPlateauAlert] = useState(null);
  const [calorieRecommendation, setCalorieRecommendation] = useState(null);
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [formData, setFormData] = useState({
    weight: 70,
    height: 170,
    age: 25,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
    targetWeight: 70,
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Use ref to prevent infinite loops
  const initializedRef = useRef(false);

  useEffect(() => {
    if (userProfile && !initializedRef.current) {
      initializedRef.current = true;
      
      // Initialize form data
      setFormData({
        weight: userProfile.weight || 70,
        height: userProfile.height || 170,
        age: userProfile.age || 25,
        gender: userProfile.gender || 'male',
        activityLevel: userProfile.activityLevel || 'moderate',
        goal: userProfile.goal || 'maintain',
        targetWeight: userProfile.targetWeight || userProfile.weight || 70,
        targetDate: userProfile.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      
      // Check for plateau (don't await - let it run in background)
      checkForPlateau();
      
      // Generate predictions
      generatePredictions();
    }
  }, [userProfile?.weight]); // Only re-run if weight changes

  const checkForPlateau = async () => {
    try {
      const result = await aiService.detectPlateau();
      if (result.success && result.data && result.data.plateauDetected) {
        setPlateauAlert(result.data);
      }
    } catch (error) {
      console.error('Plateau check failed:', error);
    }
  };

  const generatePredictions = () => {
    if (!userProfile) return;
    
    const currentWeight = userProfile.weight || 70;
    const targetWeight = userProfile.targetWeight || currentWeight;
    const daysToTarget = 90;
    const weightDifference = targetWeight - currentWeight;
    const dailyChange = weightDifference / daysToTarget;
    
    const predictions = [];
    for (let i = 0; i <= daysToTarget; i += 7) {
      predictions.push({
        day: i,
        weight: parseFloat((currentWeight + (dailyChange * i)).toFixed(1))
      });
    }
    
    setPredictions({ predictions });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ['weight', 'height', 'age', 'targetWeight'].includes(name)
        ? parseFloat(value) || 0
        : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await updateProfile(formData);
      if (response.success) {
        toast.success('Goals updated successfully!');
        
        // Get AI recommendation (don't await - show modal when ready)
        getCalorieRecommendation();
      } else {
        toast.error('Failed to update goals');
      }
    } catch (error) {
      console.error('Goal update error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCalorieRecommendation = async () => {
    try {
      const result = await aiService.recommendCalories();
      
      if (result.success && result.data) {
        setCalorieRecommendation(result.data);
        setShowCalorieModal(true);
      }
    } catch (error) {
      console.error('Calorie recommendation failed:', error);
    }
  };

  const applyCalorieRecommendation = async () => {
    if (!calorieRecommendation) return;
    
    try {
      const updated = await updateProfile({
        ...formData,
        dailyCalories: calorieRecommendation.calories,
        dailyProtein: calorieRecommendation.protein,
        dailyCarbs: calorieRecommendation.carbs,
        dailyFat: calorieRecommendation.fat
      });

      if (updated.success) {
        toast.success('✓ Goals updated with AI recommendations!');
        setShowCalorieModal(false);
      }
    } catch (error) {
      toast.error('Failed to apply recommendations');
    }
  };

  const dismissPlateau = () => {
    setPlateauAlert(null);
  };

  const calculateProgress = () => {
    if (!userProfile || !userProfile.weight || !userProfile.targetWeight) return 0;
    const total = Math.abs(userProfile.weight - userProfile.targetWeight);
    const current = userProfile.weight;
    const target = userProfile.targetWeight;
    const progress = ((current - target) / total) * 100;
    return Math.max(0, Math.min(100, 100 - Math.abs(progress)));
  };

  const calculateDaysRemaining = () => {
    if (!userProfile?.targetDate) return 0;
    const today = new Date();
    const target = new Date(userProfile.targetDate);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getProgressChartOption = () => {
    if (!predictions) return {};

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: predictions.predictions.map((p) => `Day ${p.day}`),
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        name: 'Weight (kg)',
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' }
      },
      series: [{
        data: predictions.predictions.map(p => p.weight),
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#667eea',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
            ]
          }
        },
        markLine: {
          data: [
            {
              name: 'Target',
              yAxis: formData.targetWeight,
              lineStyle: {
                color: '#48c774',
                type: 'dashed'
              },
              label: {
                color: '#48c774',
                formatter: 'Target: {c} kg'
              }
            }
          ]
        }
      }]
    };
  };

  // Early return for no user - prevent infinite loops
  if (!user) {
    return (
      <div className="container goals-container">
        <div className="text-center py-5">
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Initial setup form if no profile
  if (!userProfile) {
    return (
      <div className="container goals-container">
        <div className="glass-container p-4">
          <h3 className="text-white mb-3">Set Your Goals</h3>
          <p className="text-white-50">Please complete your profile first.</p>
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label text-white">Current Weight (kg)</label>
                <input 
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  step="0.1"
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label text-white">Target Weight (kg)</label>
                <input 
                  type="number"
                  name="targetWeight"
                  value={formData.targetWeight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  step="0.1"
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label text-white">Goal</label>
                <select 
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="form-select glass-input"
                >
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Gain Weight</option>
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label text-white">Activity Level</label>
                <select 
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  className="form-select glass-input"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="active">Very Active</option>
                  <option value="veryActive">Extremely Active</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Goals'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container goals-container">
      <div className="goals-header mb-4">
        <h1 className="text-white">Your Fitness Goals</h1>
        <p className="text-white-50">Track and adjust your fitness objectives</p>
      </div>

      {/* PLATEAU ALERT */}
      {plateauAlert && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="glass-container p-4" style={{ background: 'rgba(255, 193, 7, 0.1)', border: '2px solid rgba(255, 193, 7, 0.5)' }}>
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <h4 className="text-warning mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Plateau Detected!
                  </h4>
                  <p className="text-white mb-3">
                    Your weight hasn't changed significantly in {plateauAlert.duration} days.
                  </p>
                  
                  <div className="mb-3">
                    <h6 className="text-white mb-2">💪 How to Break Through:</h6>
                    <ul className="text-white-50 mb-0">
                      <li>Reduce daily calories by 100-200</li>
                      <li>Increase workout intensity or frequency</li>
                      <li>Try a different workout routine</li>
                      <li>Check your food tracking accuracy</li>
                    </ul>
                  </div>

                  {plateauAlert.recommendation && (
                    <div className="alert alert-warning mt-3 mb-0">
                      <strong>🤖 AI Suggestion:</strong> {plateauAlert.recommendation}
                    </div>
                  )}
                </div>
                <button 
                  className="btn btn-sm btn-outline-light ms-3"
                  onClick={dismissPlateau}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-bullseye"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Goal Progress</h5>
              <h3 className="stat-value">{calculateProgress().toFixed(0)}%</h3>
              <div className="progress mt-2" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Days Remaining</h5>
              <h3 className="stat-value">{calculateDaysRemaining()}</h3>
              <small className="stat-change">Until target date</small>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-weight"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Weight to Go</h5>
              <h3 className="stat-value">
                {Math.abs((userProfile.targetWeight || userProfile.weight || 70) - (userProfile.weight || 70)).toFixed(1)} kg
              </h3>
              <small className="stat-change">
                {userProfile.goal === 'lose' ? 'to lose' : userProfile.goal === 'gain' ? 'to gain' : 'to maintain'}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Form and Chart */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="glass-container p-4">
            <h3 className="text-white mb-4">Update Your Goals</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label text-white">Current Weight (kg)</label>
                <input 
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  step="0.1"
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Target Weight (kg)</label>
                <input 
                  type="number"
                  name="targetWeight"
                  value={formData.targetWeight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  step="0.1"
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Goal</label>
                <select 
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="form-select glass-input"
                >
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Gain Weight</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Activity Level</label>
                <select 
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  className="form-select glass-input"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="active">Very Active</option>
                  <option value="veryActive">Extremely Active</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Target Date</label>
                <input 
                  type="date"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleChange}
                  className="form-control glass-input"
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Calculating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-robot me-2"></i>
                    Save & Get AI Recommendations
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="col-md-6 mb-3">
          <div className="glass-container p-4">
            <h3 className="text-white mb-4">Progress Projection</h3>
            {predictions && <ReactECharts option={getProgressChartOption()} style={{ height: '400px' }} />}
          </div>
        </div>
      </div>

      {/* CALORIE MODAL */}
      {showCalorieModal && calorieRecommendation && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content glass-container">
              <div className="modal-header border-0">
                <h4 className="modal-title text-white">
                  <i className="fas fa-robot me-2"></i>
                  AI Calorie Calculator
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowCalorieModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-white mb-4">
                  Based on your goals, I've calculated your optimal daily nutrition:
                </p>

                <div className="row mb-4">
                  <div className="col-12">
                    <div className="p-4" style={{ background: 'rgba(102, 126, 234, 0.1)', borderRadius: '12px', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                      <h3 className="text-white mb-3 text-center">
                        {calorieRecommendation.calories} <small>calories/day</small>
                      </h3>
                      
                      <div className="row">
                        <div className="col-4 text-center">
                          <div className="text-white-50">Protein</div>
                          <div className="h4 text-white">{calorieRecommendation.protein}g</div>
                        </div>
                        <div className="col-4 text-center">
                          <div className="text-white-50">Carbs</div>
                          <div className="h4 text-white">{calorieRecommendation.carbs}g</div>
                        </div>
                        <div className="col-4 text-center">
                          <div className="text-white-50">Fat</div>
                          <div className="h4 text-white">{calorieRecommendation.fat}g</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                  <div className="text-white">
                    <strong>📈 Expected Results:</strong>
                    <p className="mb-0 mt-2">{calorieRecommendation.recommendation}</p>
                  </div>
                </div>

                {calorieRecommendation.weeklyWeightChange && (
                  <div className="text-white-50 small">
                    <i className="fas fa-info-circle me-2"></i>
                    Expected change: {Math.abs(calorieRecommendation.weeklyWeightChange).toFixed(2)} kg/week
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowCalorieModal(false)}
                >
                  Keep Current Settings
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={applyCalorieRecommendation}
                >
                  <i className="fas fa-check me-2"></i>
                  Apply These Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;