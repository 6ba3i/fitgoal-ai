// client/src/components/Goals/Goals.jsx
import React, { useState, useEffect, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import './Goals.css';

const Goals = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, updateProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [adjustedGoals, setAdjustedGoals] = useState(null);
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

  useEffect(() => {
    if (userProfile) {
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
      generatePredictions();
    }
  }, [userProfile]);

  const generatePredictions = () => {
    if (!userProfile) return;
    
    // Simple weight prediction logic
    const currentWeight = userProfile.weight || 70;
    const targetWeight = userProfile.targetWeight || currentWeight;
    const daysToTarget = 90;
    const weightDifference = targetWeight - currentWeight;
    const dailyChange = weightDifference / daysToTarget;
    
    const predictions = [];
    for (let i = 0; i <= daysToTarget; i += 7) {
      predictions.push({
        day: i,
        weight: currentWeight + (dailyChange * i)
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
        generatePredictions();
      } else {
        toast.error('Failed to update goals');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error('Update goals error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!userProfile) return 0;
    
    const current = userProfile.weight || 70;
    const target = userProfile.targetWeight || current;
    const start = userProfile.startingWeight || current;
    
    if (target === start) return 0;
    
    const progress = Math.abs((current - start) / (target - start)) * 100;
    return Math.min(Math.round(progress), 100);
  };

  const calculateDaysRemaining = () => {
    if (!userProfile?.targetDate) return 90;
    
    const target = new Date(userProfile.targetDate);
    const today = new Date();
    const days = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, days);
  };

  const getPredictionChartOption = () => {
    if (!predictions || !predictions.predictions) return {};

    return {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: {c} kg',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: predictions.predictions.map((p, i) => `Week ${Math.floor(i)}`),
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        name: 'Weight (kg)',
        axisLabel: { color: '#fff' },
        nameTextStyle: { color: '#fff' }
      },
      series: [{
        name: 'Predicted Weight',
        type: 'line',
        data: predictions.predictions.map(p => p.weight.toFixed(1)),
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

  if (!userProfile) {
    return (
      <div className="container goals-container">
        <div className="glass-container p-4">
          <h3 className="text-white mb-3">Set Your Goals</h3>
          <p className="text-white-50">Please complete your profile first to set your fitness goals.</p>
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

      {/* Progress Overview */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-bullseye"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Goal Progress</h5>
              <h3 className="stat-value">{calculateProgress()}%</h3>
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

      {/* Goals Form */}
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

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Goals'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-md-6 mb-3">
          <div className="glass-container p-4">
            <h3 className="text-white mb-4">Weight Prediction</h3>
            {predictions ? (
              <ReactECharts option={getPredictionChartOption()} style={{ height: '400px' }} />
            ) : (
              <p className="text-white-50">Set your goals to see predictions</p>
            )}
          </div>
        </div>
      </div>

      {/* Goal Tips */}
      <div className="glass-container p-4">
        <h3 className="text-white mb-3">Goal Achievement Tips</h3>
        <div className="row">
          <div className="col-md-4">
            <h5 className="text-white">
              <i className="fas fa-utensils me-2"></i>Nutrition
            </h5>
            <ul className="text-white-50">
              <li>Track your daily calories</li>
              <li>Eat protein with every meal</li>
              <li>Stay hydrated (8 glasses/day)</li>
            </ul>
          </div>
          <div className="col-md-4">
            <h5 className="text-white">
              <i className="fas fa-dumbbell me-2"></i>Exercise
            </h5>
            <ul className="text-white-50">
              <li>Exercise 3-5 times per week</li>
              <li>Mix cardio and strength training</li>
              <li>Progressive overload for gains</li>
            </ul>
          </div>
          <div className="col-md-4">
            <h5 className="text-white">
              <i className="fas fa-bed me-2"></i>Recovery
            </h5>
            <ul className="text-white-50">
              <li>Sleep 7-9 hours per night</li>
              <li>Take rest days seriously</li>
              <li>Manage stress levels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Goals;