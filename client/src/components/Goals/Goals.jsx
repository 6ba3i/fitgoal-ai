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
  const hasInitializedRef = useRef(false);
  const lastWeightRef = useRef(null);

  useEffect(() => {
    // CRITICAL: Wait for BOTH user AND userProfile to be ready
    if (user?.uid && userProfile && !hasInitializedRef.current) {
      console.log('✅ Auth ready - Initializing Goals for:', user.uid);
      hasInitializedRef.current = true;
      
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
      
      // Check for plateau (don't await)
      checkForPlateau();
      
      // Generate predictions
      generatePredictions();
      
      // Store initial weight
      lastWeightRef.current = userProfile.weight;
    } else if (!user?.uid) {
      console.log('⏳ Waiting for authentication...');
      // Reset when user logs out
      hasInitializedRef.current = false;
      lastWeightRef.current = null;
    } else if (user?.uid && !userProfile) {
      console.log('⏳ User authenticated, waiting for profile...');
    }
  }, [user?.uid, userProfile]); // Watch BOTH

  // Separate effect to handle weight changes (only after initialization)
  useEffect(() => {
    if (hasInitializedRef.current && 
        userProfile?.weight && 
        lastWeightRef.current !== null && 
        userProfile.weight !== lastWeightRef.current) {
      console.log('📊 Weight changed, regenerating predictions');
      lastWeightRef.current = userProfile.weight;
      generatePredictions();
    }
  }, [userProfile?.weight]);

  const checkForPlateau = async () => {
    // Check authentication
    if (!user?.uid) {
      console.log('⚠️ Skipping plateau check - user not authenticated');
      return;
    }

    try {
      const result = await aiService.detectPlateau();
      if (result.success && result.data && result.data.plateauDetected) {
        setPlateauAlert(result.data);
      }
    } catch (error) {
      // Handle errors gracefully
      if (error.response?.status === 401) {
        console.log('🔒 Plateau check skipped - authentication issue');
      } else {
        console.error('❌ Plateau check failed:', error.message);
      }
    }
  };

  const generatePredictions = () => {
    if (!userProfile) {
      console.log('⚠️ No user profile, skipping prediction generation');
      return;
    }
    
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
    console.log('📈 Local predictions generated');
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
    
    // Check authentication
    if (!user?.uid) {
      toast.error('Please log in to update your goals');
      return;
    }

    setLoading(true);

    try {
      const response = await updateProfile(formData);
      if (response.success) {
        toast.success('Goals updated successfully!');
        
        // Get AI recommendation (don't await)
        getCalorieRecommendation();
      } else {
        toast.error('Failed to update goals');
      }
    } catch (error) {
      console.error('Goal update error:', error);
      if (error.response?.status !== 401) {
        toast.error('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCalorieRecommendation = async () => {
    // Check authentication
    if (!user?.uid) {
      console.log('⚠️ Skipping calorie recommendation - user not authenticated');
      return;
    }

    try {
      const result = await aiService.recommendCalories();
      
      if (result.success && result.data) {
        setCalorieRecommendation(result.data);
        setShowCalorieModal(true);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔒 Calorie recommendation skipped - authentication issue');
      } else {
        console.error('❌ Calorie recommendation failed:', error.message);
      }
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
      } else {
        toast.error('Failed to apply recommendations');
      }
    } catch (error) {
      console.error('Apply recommendation error:', error);
      if (error.response?.status !== 401) {
        toast.error('An error occurred');
      }
    }
  };

  const getProgressChartOption = () => {
    if (!predictions?.predictions) return {};

    const days = predictions.predictions.map(p => `Day ${p.day}`);
    const weights = predictions.predictions.map(p => p.weight);
    const target = formData.targetWeight;

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' }
      },
      legend: {
        data: ['Projected Weight', 'Target'],
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
        data: days,
        axisLine: { lineStyle: { color: '#fff' } },
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#fff' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#fff' }
      },
      series: [
        {
          name: 'Projected Weight',
          type: 'line',
          data: weights,
          smooth: true,
          lineStyle: { color: '#667eea', width: 3 },
          itemStyle: { color: '#667eea' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
                { offset: 1, color: 'rgba(102, 126, 234, 0)' }
              ]
            }
          }
        },
        {
          name: 'Target',
          type: 'line',
          data: new Array(days.length).fill(target),
          lineStyle: { color: '#48c774', width: 2, type: 'dashed' },
          itemStyle: { color: '#48c774' }
        }
      ]
    };
  };

  return (
    <div className="goals-container container">
      <div className="goals-header">
        <h1 className="gradient-text">Set Your Goals</h1>
        <p className="text-white-50">Define your fitness objectives and let AI guide you</p>
      </div>

      {/* Plateau Alert */}
      {plateauAlert && (
        <div className="alert alert-warning glass-card mb-4">
          <h5><i className="fas fa-exclamation-triangle me-2"></i>Plateau Detected</h5>
          <p className="mb-0">{plateauAlert.message}</p>
        </div>
      )}

      <div className="row">
        {/* Goals Form */}
        <div className="col-md-6 mb-3">
          <div className="glass-container p-4">
            <h3 className="text-white mb-4">Your Information</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-6">
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
                <div className="col-md-6">
                  <label className="form-label text-white">Height (cm)</label>
                  <input 
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className="form-control glass-input"
                    required
                  />
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label text-white">Age</label>
                  <input 
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="form-control glass-input"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-white">Gender</label>
                  <select 
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-select glass-input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
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
                  <option value="gain">Gain Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="muscle">Build Muscle</option>
                </select>
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
                  required
                />
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

        {/* Progress Chart */}
        <div className="col-md-6 mb-3">
          <div className="glass-container p-4">
            <h3 className="text-white mb-4">Progress Projection</h3>
            {predictions && (
              <ReactECharts 
                option={getProgressChartOption()} 
                style={{ height: '400px' }} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Calorie Recommendation Modal */}
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
                <p className="text-white-50 mb-4">
                  Based on your profile and goals, we recommend the following daily intake:
                </p>
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <div className="recommendation-card glass-card p-3">
                      <h5 className="text-white">Calories</h5>
                      <h3 className="gradient-text">{calorieRecommendation.calories}</h3>
                      <small className="text-white-50">per day</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="recommendation-card glass-card p-3">
                      <h5 className="text-white">Protein</h5>
                      <h3 className="gradient-text">{calorieRecommendation.protein}g</h3>
                      <small className="text-white-50">per day</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="recommendation-card glass-card p-3">
                      <h5 className="text-white">Carbs</h5>
                      <h3 className="gradient-text">{calorieRecommendation.carbs}g</h3>
                      <small className="text-white-50">per day</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="recommendation-card glass-card p-3">
                      <h5 className="text-white">Fat</h5>
                      <h3 className="gradient-text">{calorieRecommendation.fat}g</h3>
                      <small className="text-white-50">per day</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCalorieModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={applyCalorieRecommendation}
                >
                  Apply Recommendations
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