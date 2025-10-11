// client/src/components/Dashboard/Dashboard.jsx - FIXED DECIMALS + DEBUG PREDICTIONS
import React, { useState, useEffect, useContext, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import { firebaseDataService } from '../../services/firebase.data.service';
import { aiService } from '../../services/ai.service';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, dailyIntake, setDailyIntake, progressHistory } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentWeight: 0,
    weightChange: 0,
    averageCalories: 0,
    streak: 0
  });
  const [macros, setMacros] = useState(null);
  const [weightPrediction, setWeightPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  
  // Track if we've already loaded data for this user
  const loadedUserIdRef = useRef(null);
  
  // Cache for predictions
  const predictionCacheRef = useRef(null);
  const lastPredictionTimeRef = useRef(0);

  useEffect(() => {
    // Only load once per user - prevent loops
    if (user?.uid && userProfile && loadedUserIdRef.current !== user.uid) {
      loadedUserIdRef.current = user.uid;
      loadDashboardData();
    }
  }, [user?.uid]); // Only re-run if user ID changes

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get stats
      const statsResult = await firebaseDataService.getUserStats(user.uid);
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Set macros from profile
      if (userProfile) {
        setMacros({
          calories: userProfile.dailyCalories || 2000,
          protein: userProfile.dailyProtein || 150,
          carbs: userProfile.dailyCarbs || 250,
          fat: userProfile.dailyFat || 65
        });
      }

      // Get daily intake
      const intakeResult = await firebaseDataService.getDailyIntake(user.uid);
      if (intakeResult.success) {
        setDailyIntake(intakeResult.data);
      }

      // Get progress history directly
      const progressResult = await firebaseDataService.getProgress(user.uid, 30);
      
      console.log('📊 Progress data loaded:', {
        success: progressResult.success,
        count: progressResult.data?.length || 0,
        hasData: progressResult.data && progressResult.data.length >= 2
      });

      // Load predictions if we have enough data
      if (progressResult.success && progressResult.data && progressResult.data.length >= 2) {
        console.log('✅ Enough data for predictions - calling AI...');
        // Wait a bit for auth to settle
        setTimeout(() => {
          loadWeightPrediction();
        }, 1500);
      } else {
        console.log('⚠️ Not enough progress data for predictions:', progressResult.data?.length || 0);
      }
      
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeightPrediction = async () => {
    // CRITICAL: Don't call if user not authenticated
    if (!user?.uid) {
      console.log('⚠️ Skipping prediction - user not authenticated');
      return;
    }

    const now = Date.now();
    const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
    const MIN_CALL_INTERVAL = 10000; // 10 seconds
    
    // Use cached data if available and fresh
    if (predictionCacheRef.current && 
        (now - lastPredictionTimeRef.current) < CACHE_DURATION) {
      console.log('✅ Using cached prediction');
      setWeightPrediction(predictionCacheRef.current);
      return;
    }

    // Rate limit: don't call too frequently
    if ((now - lastPredictionTimeRef.current) < MIN_CALL_INTERVAL) {
      console.log('⏳ Rate limited - skipping prediction call');
      return;
    }

    try {
      setPredictionLoading(true);
      lastPredictionTimeRef.current = now;
      
      console.log('🤖 Calling AI prediction API...');
      const result = await aiService.predictWeight(30);
      
      console.log('📈 Prediction result:', {
        success: result.success,
        hasPredictions: !!result.data?.predictions,
        predictionsCount: result.data?.predictions?.length || 0
      });
      
      if (result.success && result.data) {
        predictionCacheRef.current = result.data;
        setWeightPrediction(result.data);
        console.log('✅ Predictions loaded successfully!');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔒 Prediction skipped - authentication required');
        return;
      } else if (error.response?.status === 429) {
        console.log('⏱️ Predictions rate limited - will retry later');
      } else if (error.response?.status === 400) {
        console.log('⚠️ Not enough data for predictions:', error.response?.data);
      } else {
        console.error('❌ Prediction error:', error);
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  const getWeightPredictionChartOption = () => {
    if (!weightPrediction?.predictions) return {};

    const { predictions, trend } = weightPrediction;
    const target = userProfile?.targetWeight || 0;
    const dates = predictions.map(p => p.date);
    const weights = predictions.map(p => parseFloat(p.weight).toFixed(2));
    
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
        formatter: (params) => {
          const date = params[0].axisValue;
          let html = `<strong>${date}</strong><br/>`;
          params.forEach(param => {
            html += `${param.marker} ${param.seriesName}: <strong>${parseFloat(param.value).toFixed(2)} kg</strong><br/>`;
          });
          return html;
        }
      },
      legend: {
        data: ['Predicted Weight', 'Target'],
        textStyle: { color: '#fff' },
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { 
          color: '#fff',
          rotate: 45,
          formatter: (value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.3)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Weight (kg)',
        nameTextStyle: { color: '#fff' },
        axisLabel: { 
          color: '#fff',
          formatter: (value) => parseFloat(value).toFixed(2)
        },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.3)' } },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      series: [
        {
          name: 'Predicted Weight',
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
                { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
                { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
              ]
            }
          },
          markLine: {
            silent: true,
            lineStyle: { color: '#48c774', type: 'dashed', width: 2 },
            data: [{
              yAxis: target,
              label: { 
                formatter: (params) => `Target: ${parseFloat(params.value).toFixed(2)} kg`,
                color: '#48c774' 
              }
            }]
          }
        }
      ]
    };
  };

  const getWeightProgressOption = () => {
    return {
      series: [{
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            borderWidth: 1,
            borderColor: '#464646',
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#667eea' },
                { offset: 1, color: '#764ba2' }
              ]
            }
          }
        },
        axisLine: {
          lineStyle: {
            width: 40,
            color: [[1, 'rgba(255, 255, 255, 0.1)']]
          }
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, '0%'],
          fontSize: 32,
          fontWeight: 'bolder',
          formatter: '{value}%',
          color: '#fff'
        },
        data: [{
          value: userProfile?.targetWeight && stats.currentWeight 
            ? Math.round(Math.min(100, (1 - Math.abs(stats.currentWeight - userProfile.targetWeight) / 
              Math.abs(userProfile.weight - userProfile.targetWeight || 1)) * 100))
            : 0
        }]
      }]
    };
  };

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container dashboard-container">
      <div className="dashboard-header mb-4">
        <h1 className="text-white">Welcome back, {user?.displayName || 'Friend'}!</h1>
        <p className="text-white-50">Here's your fitness overview for today</p>
      </div>

      {/* Quick Stats */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon"><i className="fas fa-weight"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Current Weight</h5>
              <h3 className="stat-value">{parseFloat(stats?.currentWeight || userProfile?.weight || 0).toFixed(2)} kg</h3>
              <small className="stat-change text-success">
                {stats?.weightChange > 0 ? '+' : ''}{parseFloat(stats?.weightChange || 0).toFixed(2)} kg
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon"><i className="fas fa-fire"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Calories Today</h5>
              <h3 className="stat-value">{dailyIntake?.calories || 0}</h3>
              <small className="stat-change">/ {macros?.calories || 0} kcal</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon"><i className="fas fa-dumbbell"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Protein</h5>
              <h3 className="stat-value">{dailyIntake?.protein || 0}g</h3>
              <small className="stat-change">/ {macros?.protein || 0}g</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon"><i className="fas fa-calendar-day"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Streak</h5>
              <h3 className="stat-value">{stats?.streak || 0}</h3>
              <small className="stat-change">days</small>
            </div>
          </div>
        </div>
      </div>

      {/* AI PREDICTION CHART */}
      <div className="row mb-4">
        <div className="col-md-8 mb-3">
          <div className="glass-container p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="text-white mb-0">
                <i className="fas fa-crystal-ball me-2"></i>
                AI Weight Prediction (Next 30 Days)
              </h4>
              {predictionLoading && (
                <div className="spinner-border spinner-border-sm text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
            </div>
            
            {weightPrediction ? (
              <>
                <ReactECharts 
                  option={getWeightPredictionChartOption()} 
                  style={{ height: '300px' }} 
                />
                
                <div className="row mt-3">
                  <div className="col-md-4">
                    <div className="prediction-stat">
                      <label className="text-white-50 small">Current Trend</label>
                      <div className="text-white">
                        {weightPrediction.trend.direction === 'losing' ? '📉' : 
                         weightPrediction.trend.direction === 'gaining' ? '📈' : '➡️'}
                        <strong className="ms-2">
                          {Math.abs(weightPrediction.trend.weeklyChange).toFixed(2)} kg/week
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="prediction-stat">
                      <label className="text-white-50 small">Predicted in 30 Days</label>
                      <div className="text-white">
                        <strong>{parseFloat(weightPrediction.predictions[weightPrediction.predictions.length - 1].weight).toFixed(2)} kg</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="prediction-stat">
                      <label className="text-white-50 small">Confidence</label>
                      <div className="text-white">
                        <strong>{(weightPrediction.r2 * 100).toFixed(1)}%</strong>
                        <span className="ms-2">{weightPrediction.r2 > 0.8 ? '✓ High' : weightPrediction.r2 > 0.5 ? '○ Medium' : '⚠ Low'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info mt-3 mb-0" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                  <i className="fas fa-lightbulb me-2"></i>
                  <span className="text-white">
                    {weightPrediction.trend.direction === 'losing' ? 
                      `You're on track! At this rate, you'll reach your goal ${weightPrediction.trend.onTrack ? 'on time' : 'soon'}.` :
                      weightPrediction.trend.direction === 'gaining' ?
                      `Your weight is increasing. Make sure this aligns with your goals!` :
                      `Your weight is stable. This is perfect for maintenance!`
                    }
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center text-white-50 py-5">
                <i className="fas fa-chart-line fa-3x mb-3 opacity-50"></i>
                <p>Log at least 2 progress entries to see AI predictions</p>
                {predictionLoading && (
                  <small className="text-white-50 d-block mt-2">
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Loading predictions...
                  </small>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="glass-container p-4">
            <h4 className="text-white mb-3">Goal Progress</h4>
            <ReactECharts option={getWeightProgressOption()} style={{ height: '300px' }} />
          </div>
        </div>
      </div>

      {/* Macros Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="glass-container macro-card">
            <div className="macro-header">
              <span className="macro-label">Protein</span>
              <span className="macro-value">{dailyIntake?.protein || 0}g / {macros?.protein || 0}g</span>
            </div>
            <div className="progress">
              <div 
                className="progress-bar bg-info" 
                style={{ width: `${Math.min(100, ((dailyIntake?.protein || 0) / (macros?.protein || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container macro-card">
            <div className="macro-header">
              <span className="macro-label">Carbs</span>
              <span className="macro-value">{dailyIntake?.carbs || 0}g / {macros?.carbs || 0}g</span>
            </div>
            <div className="progress">
              <div 
                className="progress-bar bg-warning" 
                style={{ width: `${Math.min(100, ((dailyIntake?.carbs || 0) / (macros?.carbs || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container macro-card">
            <div className="macro-header">
              <span className="macro-label">Fat</span>
              <span className="macro-value">{dailyIntake?.fat || 0}g / {macros?.fat || 0}g</span>
            </div>
            <div className="progress">
              <div 
                className="progress-bar bg-danger" 
                style={{ width: `${Math.min(100, ((dailyIntake?.fat || 0) / (macros?.fat || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container macro-card">
            <div className="macro-header">
              <span className="macro-label">Water</span>
              <span className="macro-value">0 / 8 glasses</span>
            </div>
            <div className="progress">
              <div className="progress-bar bg-primary" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="row">
        <div className="col-12">
          <div className="glass-container p-4">
            <h4 className="text-white mb-3">Today's Meals</h4>
            {dailyIntake?.meals && dailyIntake.meals.length > 0 ? (
              <div className="meals-list">
                {dailyIntake.meals.map((meal, index) => (
                  <div key={index} className="meal-item">
                    <div>
                      <h6 className="text-white">{meal.recipeName}</h6>
                      <small className="text-white-50">
                        {meal.calories} cal | P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fat}g
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white-50">No meals logged yet. Start by adding your breakfast!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;