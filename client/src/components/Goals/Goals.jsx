import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import { aiService } from '../../services/ai.service';
import { toast } from 'react-toastify';
import './Goals.css';

const Goals = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, updateProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [plateauData, setPlateauData] = useState(null);
  const hasInitializedRef = useRef(false);
  const lastWeightRef = useRef(null);

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

  // Initialize form data once when component mounts or user changes
  useEffect(() => {
    if (user?.uid && userProfile && !hasInitializedRef.current) {
      console.log('🎯 Initializing Goals with user profile');
      hasInitializedRef.current = true;
      
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
      
      // Check for plateau
      checkForPlateau();
      
      // Store initial weight
      lastWeightRef.current = userProfile.weight;
    } else if (!user?.uid) {
      console.log('⏳ Waiting for authentication...');
      hasInitializedRef.current = false;
      lastWeightRef.current = null;
    }
  }, [user?.uid, userProfile]);

  // Separate effect to handle weight changes (only after initialization)
  useEffect(() => {
    if (hasInitializedRef.current && 
        userProfile?.weight && 
        lastWeightRef.current !== null && 
        userProfile.weight !== lastWeightRef.current) {
      console.log('📊 Weight changed, rechecking plateau');
      lastWeightRef.current = userProfile.weight;
      checkForPlateau();
    }
  }, [userProfile?.weight]);

  const checkForPlateau = async () => {
    if (!user?.uid) {
      console.log('⚠️ Skipping plateau check - user not authenticated');
      return;
    }

    try {
      const result = await aiService.detectPlateau();
      console.log('🔍 Plateau detection result:', result);
      if (result.success) {
        // The data is in the result object itself, not nested under result.data
        setPlateauData(result);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔒 Plateau check skipped - authentication issue');
      } else {
        console.error('❌ Plateau check failed:', error.message);
      }
    }
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
    
    if (!user?.uid) {
      toast.error('Please log in to update your goals');
      return;
    }

    setLoading(true);

    try {
      const response = await updateProfile(formData);
      if (response.success) {
        toast.success('Goals updated successfully!');
        // Recheck plateau after goal update
        checkForPlateau();
      } else {
        toast.error(response.message || 'Failed to update goals');
      }
    } catch (error) {
      console.error('Update goals error:', error);
      toast.error(error.message || 'Failed to update goals');
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    const heightInMeters = formData.height / 100;
    return (formData.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const calculateWeightToLose = () => {
    if (formData.goal === 'lose') {
      return Math.abs(formData.weight - formData.targetWeight).toFixed(1);
    }
    return 0;
  };

  const calculateDaysToTarget = () => {
    const today = new Date();
    const target = new Date(formData.targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const renderPlateauAlert = () => {
    if (!plateauData) {
      return (
        <div className="glass-container p-4 mb-4">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading plateau detection...</span>
            </div>
            <p className="text-white-50 mt-2">Analyzing your progress...</p>
          </div>
        </div>
      );
    }

    if (plateauData.plateauDetected) {
      return (
        <div className="glass-container p-4 mb-4" style={{ border: '2px solid rgba(255, 221, 87, 0.3)' }}>
          {/* Header */}
          <div className="plateau-header mb-3" style={{ 
            background: 'rgba(255, 221, 87, 0.1)', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid rgba(255, 221, 87, 0.3)'
          }}>
            <h5 className="mb-0" style={{ color: '#ffdd57' }}>
              <i className="fas fa-exclamation-triangle me-2"></i>
              PLATEAU DETECTED
            </h5>
          </div>

          {/* Message */}
          <p className="text-white mb-3">
            {plateauData.message || `Your weight hasn't changed in ${plateauData.duration || 14} days`}
          </p>

          {/* Why This Happens */}
          <div className="mb-3">
            <h6 className="text-white mb-2">
              <i className="fas fa-lightbulb me-2" style={{ color: '#ffdd57' }}></i>
              Why This Happens:
            </h6>
            <p className="text-white-50 mb-0" style={{ fontSize: '0.9rem' }}>
              Your body has adapted to your current routine. Weight stable at {plateauData.avgWeight}kg for {plateauData.duration} days.
            </p>
          </div>

          {/* How to Break Through */}
          <div className="mb-3" style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h6 className="text-white mb-3">
              <i className="fas fa-dumbbell me-2" style={{ color: '#48c774' }}></i>
              How to Break Through:
            </h6>
            <div className="recommendations">
              {plateauData.suggestions && plateauData.suggestions.map((suggestion, index) => (
                <div key={index} className="mb-2">
                  <i className="fas fa-check text-success me-2"></i>
                  <span className="text-white" style={{ fontSize: '0.9rem' }}>
                    {typeof suggestion === 'string' ? suggestion : suggestion.title}
                  </span>
                  {suggestion.description && (
                    <small className="d-block text-white-50 ms-4" style={{ fontSize: '0.8rem' }}>
                      {suggestion.description}
                    </small>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendation */}
          {plateauData.recommendedPlan && (
            <div className="mb-3" style={{ 
              background: 'rgba(102, 126, 234, 0.1)', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid rgba(102, 126, 234, 0.3)'
            }}>
              <h6 className="text-white mb-2">
                <i className="fas fa-brain me-2" style={{ color: '#667eea' }}></i>
                AI Recommendation:
              </h6>
              <p className="text-white mb-2" style={{ fontSize: '0.9rem' }}>
                Adjust your nutrition plan:
              </p>
              <ul className="text-white-50 mb-0" style={{ fontSize: '0.85rem' }}>
                <li>Calories: {plateauData.recommendedPlan.newCalories} kcal/day</li>
                <li>Protein: {plateauData.recommendedPlan.newProtein}g</li>
                <li>Carbs: {plateauData.recommendedPlan.newCarbs}g</li>
                <li>Fat: {plateauData.recommendedPlan.newFat}g</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex gap-2">
            <button className="btn btn-sm" style={{ 
              background: 'rgba(102, 126, 234, 0.2)', 
              color: '#667eea',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              flex: 1
            }}>
              Apply AI Plan
            </button>
            <button className="btn btn-sm" style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              flex: 1
            }}>
              Custom Adjust
            </button>
            <button 
              onClick={() => setPlateauData(null)}
              className="btn btn-sm" 
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
              Dismiss
            </button>
          </div>
        </div>
      );
    } else {
      // No plateau - show positive message
      return (
        <div className="glass-container p-4 mb-4" style={{ border: '2px solid rgba(72, 199, 116, 0.3)' }}>
          <div className="text-center">
            <div className="mb-3">
              <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#48c774' }}></i>
            </div>
            <h5 className="text-white mb-2">Keep Going! You're Doing Great! 🎉</h5>
            <p className="text-white-50 mb-3">
              {plateauData.message || 'Your weight is changing consistently. Keep up the excellent work!'}
            </p>
            
            {/* Tips */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'left'
            }}>
              <h6 className="text-white mb-2">
                <i className="fas fa-lightbulb me-2" style={{ color: '#48c774' }}></i>
                Tips to Stay on Track:
              </h6>
              <div className="recommendations">
                {plateauData.suggestions && plateauData.suggestions.map((suggestion, index) => (
                  <div key={index} className="mb-2">
                    <i className="fas fa-check text-success me-2"></i>
                    <span className="text-white" style={{ fontSize: '0.9rem' }}>
                      {typeof suggestion === 'string' ? suggestion : suggestion.title}
                    </span>
                    {suggestion.description && (
                      <small className="d-block text-white-50 ms-4" style={{ fontSize: '0.8rem' }}>
                        {suggestion.description}
                      </small>
                    )}
                  </div>
                ))}
                {(!plateauData.suggestions || plateauData.suggestions.length === 0) && (
                  <>
                    <div className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      <span className="text-white" style={{ fontSize: '0.9rem' }}>Maintain your current calorie intake</span>
                    </div>
                    <div className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      <span className="text-white" style={{ fontSize: '0.9rem' }}>Stay consistent with your workouts</span>
                    </div>
                    <div className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      <span className="text-white" style={{ fontSize: '0.9rem' }}>Keep tracking your progress daily</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="goals-container container">
      <div className="goals-header">
        <h1 className="gradient-text">Set Your Goals</h1>
        <p className="text-white-50">Define your fitness objectives and let AI guide you</p>
      </div>

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
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Activity Level</label>
                <select 
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  className="form-select glass-input"
                  required
                >
                  <option value="sedentary">Sedentary (little or no exercise)</option>
                  <option value="light">Light (1-3 days/week)</option>
                  <option value="moderate">Moderate (3-5 days/week)</option>
                  <option value="active">Active (6-7 days/week)</option>
                  <option value="very_active">Very Active (2x/day)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Goal</label>
                <select 
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="form-select glass-input"
                  required
                >
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Gain Weight</option>
                </select>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
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
                <div className="col-md-6">
                  <label className="form-label text-white">Target Date</label>
                  <input 
                    type="date"
                    name="targetDate"
                    value={formData.targetDate}
                    onChange={handleChange}
                    className="form-control glass-input"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Updating...
                  </>
                ) : (
                  'Update Goals'
                )}
              </button>
            </form>

            <div className="goal-summary mt-4">
              <h5 className="text-white mb-3">Summary</h5>
              <div className="summary-items">
                <div className="summary-item">
                  <span className="summary-label">BMI</span>
                  <span className="summary-value">{calculateBMI()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Weight to {formData.goal}</span>
                  <span className="summary-value">{calculateWeightToLose()} kg</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Days to Target</span>
                  <span className="summary-value">{calculateDaysToTarget()} days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plateau Detection & Breaking Alert */}
        <div className="col-md-6 mb-3">
          {renderPlateauAlert()}
        </div>
      </div>
    </div>
  );
};

export default Goals;