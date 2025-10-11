// client/src/components/Dashboard/Dashboard.jsx - WAIT FOR AUTH TO BE READY
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
  const hasLoadedRef = useRef(false);
  
  // Cache for predictions
  const predictionCacheRef = useRef(null);
  const lastPredictionTimeRef = useRef(0);

  useEffect(() => {
    // CRITICAL: Wait for BOTH user AND userProfile to be ready
    // Don't load multiple times for the same user
    if (user?.uid && userProfile && !hasLoadedRef.current) {
      console.log('✅ Auth ready - Loading dashboard for:', user.uid);
      hasLoadedRef.current = true;
      loadedUserIdRef.current = user.uid;
      loadDashboardData();
    } else if (!user?.uid) {
      console.log('⏳ Waiting for authentication...');
      // Reset when user logs out
      hasLoadedRef.current = false;
      loadedUserIdRef.current = null;
      setLoading(false);
    } else if (user?.uid && !userProfile) {
      console.log('⏳ User authenticated, waiting for profile...');
    }
  }, [user?.uid, userProfile]); // Watch BOTH user.uid and userProfile

  const loadDashboardData = async () => {
    // Triple-check we have authentication
    if (!user?.uid) {
      console.log('❌ No authenticated user');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📊 Loading dashboard data...');
      
      // Get stats
      const statsResult = await firebaseDataService.getUserStats(user.uid);
      if (statsResult.success) {
        setStats(statsResult.data);
        console.log('✅ Stats loaded');
      }

      // Set macros from profile
      if (userProfile) {
        setMacros({
          calories: userProfile.dailyCalories || 2000,
          protein: userProfile.dailyProtein || 150,
          carbs: userProfile.dailyCarbs || 250,
          fat: userProfile.dailyFat || 65
        });
        console.log('✅ Macros set');
      }

      // Get daily intake
      const intakeResult = await firebaseDataService.getDailyIntake(user.uid);
      if (intakeResult.success) {
        setDailyIntake(intakeResult.data);
        console.log('✅ Daily intake loaded');
      }

      // Get progress history
      const progressResult = await firebaseDataService.getProgress(user.uid, 30);
      
      console.log('📊 Progress data loaded:', {
        success: progressResult.success,
        count: progressResult.data?.length || 0
      });

      // Load predictions if we have enough data
      if (progressResult.success && progressResult.data && progressResult.data.length >= 2) {
        console.log('✅ Enough data for predictions - scheduling AI call...');
        // Wait a bit before calling AI prediction
        setTimeout(() => {
          loadWeightPrediction();
        }, 2000); // 2 second delay
      } else {
        console.log('⚠️ Not enough progress data for predictions:', progressResult.data?.length || 0);
      }
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Dashboard error:', error);
      // Only show toast if it's not an auth error
      if (error.response?.status !== 401) {
        toast.error('Failed to load some dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWeightPrediction = async () => {
    // Check authentication
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
      // Handle errors gracefully
      if (error.response?.status === 401) {
        console.log('🔒 Prediction skipped - authentication issue (token may be expired)');
      } else if (error.response?.status === 429) {
        console.log('⏱️ Predictions rate limited');
      } else if (error.response?.status === 400) {
        console.log('⚠️ Not enough data for predictions');
      } else {
        console.error('❌ Prediction error:', error.message);
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
        <p className="text-white mt-3">Loading your dashboard...</p>
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
                {stats?.weightChange > 0 ? '+' : ''}{parseFloat(stats?.weightChange || 0).toFixed(2)} kg this week
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon bg-success"><i className="fas fa-fire"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Today's Calories</h5>
              <h3 className="stat-value">{dailyIntake?.calories || 0}</h3>
              <small className="stat-change">
                / {macros?.calories || 2000} cal
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon bg-warning"><i className="fas fa-chart-line"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Avg Calories</h5>
              <h3 className="stat-value">{Math.round(stats?.averageCalories || 0)}</h3>
              <small className="stat-change">Last 7 days</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon bg-info"><i className="fas fa-trophy"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Streak</h5>
              <h3 className="stat-value">{stats?.streak || 0}</h3>
              <small className="stat-change">Days logging</small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-8 mb-3">
          <div className="glass-container p-4">
            <h4 className="text-white mb-3">
              <i className="fas fa-robot me-2"></i>
              AI Weight Prediction (30 Days)
            </h4>
            {weightPrediction && weightPrediction.predictions ? (
              <>
                <ReactECharts 
                  option={getWeightPredictionChartOption()} 
                  style={{ height: '350px' }} 
                />
                <div className="mt-3 p-3 bg-dark bg-opacity-25 rounded">
                  <h6 className="text-white mb-2">
                    <i className="fas fa-lightbulb me-2"></i>
                    AI Insights
                  </h6>
                  <span className="text-white-50">
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