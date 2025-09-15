import React, { useState, useEffect, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { aiService } from '../../services/ai.service';
import './Goals.css';

const Goals = () => {
  const { userProfile, updateProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [adjustedGoals, setAdjustedGoals] = useState(null);
  const [formData, setFormData] = useState({
    weight: userProfile?.profile?.weight || 70,
    height: userProfile?.profile?.height || 170,
    age: userProfile?.profile?.age || 25,
    gender: userProfile?.profile?.gender || 'male',
    activityLevel: userProfile?.profile?.activityLevel || 'moderate',
    goal: userProfile?.profile?.goal || 'maintain',
    targetWeight: userProfile?.profile?.targetWeight || 70,
    targetDate: userProfile?.profile?.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        weight: userProfile.profile.weight,
        height: userProfile.profile.height,
        age: userProfile.profile.age,
        gender: userProfile.profile.gender,
        activityLevel: userProfile.profile.activityLevel,
        goal: userProfile.profile.goal,
        targetWeight: userProfile.profile.targetWeight,
        targetDate: new Date(userProfile.profile.targetDate).toISOString().split('T')[0]
      });
      fetchPredictions();
    }
  }, [userProfile]);

  const fetchPredictions = async () => {
    try {
      const response = await aiService.predictWeight(90);
      if (response.success) {
        setPredictions(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'weight' || name === 'height' || name === 'age' || name === 'targetWeight' 
        ? parseFloat(value) 
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
        await fetchPredictions();
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

  const handleAdjustGoals = async () => {
    setLoading(true);
    try {
      const response = await aiService.adjustGoals();
      if (response.success) {
        setAdjustedGoals(response.data);
        toast.info('AI has analyzed your progress and suggested adjustments');
      }
    } catch (error) {
      toast.error('Failed to get goal adjustments');
      console.error('Adjust goals error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPredictionChartOption = () => {
    if (!predictions || !predictions.predictions) return {};

    return {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: {c} kg'
      },
      xAxis: {
        type: 'category',
        data: predictions.predictions.map((p, i) => `Week ${Math.floor(i / 7) + 1}`),
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
        data: predictions.predictions.map(p => p.weight),
        smooth: true,
        lineStyle: {
          color: '#667eea',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(102, 126, 234, 0.5)'
            }, {
              offset: 1,
              color: 'rgba(102, 126, 234, 0.1)'
            }]
          }
        },
        markLine: {
          data: [{
            yAxis: formData.targetWeight,
            label: {
              show: true,
              position: 'end',
              formatter: 'Target: {c} kg',
              color: '#fff'
            },
            lineStyle: {
              color: '#48c774',
              type: 'dashed'
            }
          }]
        }
      }]
    };
  };

  return (
    <div className="container goals-container">
      <div className="goals-header mb-4">
        <h1 className="text-white">Set Your Goals</h1>
        <p className="text-white-50">Define your fitness journey with AI-powered insights</p>
      </div>

      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="glass-container">
            <h4 className="text-white mb-4">Personal Information</h4>
            
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Current Weight (kg)</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    step="0.1"
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Height (cm)</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select glass-input"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Activity Level</label>
                <select
                  className="form-select glass-input"
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                >
                  <option value="sedentary">Sedentary (little or no exercise)</option>
                  <option value="light">Light (exercise 1-3 days/week)</option>
                  <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                  <option value="active">Active (exercise 6-7 days/week)</option>
                  <option value="veryActive">Very Active (intense exercise daily)</option>
                </select>
              </div>

              <button type="submit" className="glass-button w-100" disabled={loading}>
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : (
                  <i className="fas fa-save me-2"></i>
                )}
                Save Personal Information
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="glass-container">
            <h4 className="text-white mb-4">Fitness Goals</h4>
            
            <div className="mb-3">
              <label className="form-label">Primary Goal</label>
              <select
                className="form-select glass-input"
                name="goal"
                value={formData.goal}
                onChange={handleChange}
              >
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain">Gain Weight/Muscle</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Target Weight (kg)</label>
              <input
                type="number"
                className="form-control glass-input"
                name="targetWeight"
                value={formData.targetWeight}
                onChange={handleChange}
                step="0.1"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Target Date</label>
              <input
                type="date"
                className="form-control glass-input"
                name="targetDate"
                value={formData.targetDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="goal-summary">
              <h5 className="text-white mb-3">Goal Summary</h5>
              <div className="summary-items">
                <div className="summary-item">
                  <span className="summary-label">Weight Change:</span>
                  <span className="summary-value">
                    {Math.abs(formData.targetWeight - formData.weight).toFixed(1)} kg
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Time Frame:</span>
                  <span className="summary-value">
                    {Math.ceil((new Date(formData.targetDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Weekly Target:</span>
                  <span className="summary-value">
                    {(Math.abs(formData.targetWeight - formData.weight) / 
                      (Math.ceil((new Date(formData.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) / 7)).toFixed(2)} kg/week
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleAdjustGoals} 
              className="glass-button w-100 mt-3"
              disabled={loading}
            >
              <i className="fas fa-brain me-2"></i>
              Get AI Goal Recommendations
            </button>
          </div>
        </div>
      </div>

      {predictions && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="glass-container">
              <h4 className="text-white mb-3">AI Weight Prediction</h4>
              <ReactECharts 
                option={getPredictionChartOption()} 
                style={{ height: '400px' }}
                theme="dark"
              />
              {predictions.trend && (
                <div className="prediction-insights mt-3">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="insight-box">
                        <span className="insight-label">Trend Direction:</span>
                        <span className={`insight-value ${predictions.trend.direction === 'losing' ? 'text-success' : 'text-warning'}`}>
                          {predictions.trend.direction}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="insight-box">
                        <span className="insight-label">Weekly Change:</span>
                        <span className="insight-value">
                          {predictions.trend.weeklyChange.toFixed(2)} kg
                        </span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="insight-box">
                        <span className="insight-label">Progress Pace:</span>
                        <span className="insight-value">
                          {predictions.trend.pace}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {adjustedGoals && (
        <div className="row">
          <div className="col-12">
            <div className="glass-container">
              <h4 className="text-white mb-3">
                <i className="fas fa-lightbulb me-2"></i>
                AI Recommendations
              </h4>
              <div className="ai-recommendations">
                {adjustedGoals.adjustmentNeeded && (
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Goal adjustment recommended
                  </div>
                )}
                <p className="text-white">{adjustedGoals.recommendation}</p>
                {adjustedGoals.adjustmentNeeded && (
                  <div className="adjusted-goals">
                    <div className="adjusted-item">
                      <span className="adjusted-label">Suggested Target Date:</span>
                      <span className="adjusted-value">
                        {new Date(adjustedGoals.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;