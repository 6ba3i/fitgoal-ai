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
  
  const loadedUserIdRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const predictionCacheRef = useRef(null);
  const lastPredictionTimeRef = useRef(0);

  useEffect(() => {
    if (user?.uid && userProfile && !hasLoadedRef.current) {
      console.log('✅ Auth ready - Loading dashboard for:', user.uid);
      hasLoadedRef.current = true;
      loadedUserIdRef.current = user.uid;
      loadDashboardData();
    } else if (!user?.uid) {
      console.log('⏳ Waiting for authentication...');
      hasLoadedRef.current = false;
      loadedUserIdRef.current = null;
      setLoading(false);
    } else if (user?.uid && !userProfile) {
      console.log('⏳ User authenticated, waiting for profile...');
    }
  }, [user?.uid, userProfile]);

  const loadDashboardData = async () => {
    if (!user?.uid) {
      console.log('❌ No authenticated user');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📊 Loading dashboard data...');
      
      const statsResult = await firebaseDataService.getUserStats(user.uid);
      if (statsResult.success) {
        setStats(statsResult.data);
        console.log('✅ Stats loaded');
      }

      if (userProfile) {
        setMacros({
          calories: userProfile.dailyCalories || 2000,
          protein: userProfile.dailyProtein || 150,
          carbs: userProfile.dailyCarbs || 250,
          fat: userProfile.dailyFat || 65
        });
        console.log('✅ Macros set');
      }

      const intakeResult = await firebaseDataService.getDailyIntake(user.uid);
      if (intakeResult.success) {
        setDailyIntake(intakeResult.data);
        console.log('✅ Daily intake loaded');
      }

      const progressResult = await firebaseDataService.getProgress(user.uid, 30);
      
      console.log('📊 Progress data loaded:', {
        success: progressResult.success,
        count: progressResult.data?.length || 0
      });

      if (progressResult.success && progressResult.data && progressResult.data.length >= 2) {
        console.log('✅ Enough data for predictions - scheduling AI call...');
        setTimeout(() => {
          loadWeightPrediction();
        }, 2000);
      } else {
        console.log('⚠️ Not enough progress data for predictions:', progressResult.data?.length || 0);
      }
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Dashboard error:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load some dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWeightPrediction = async () => {
    if (!user?.uid) {
      console.log('⚠️ Skipping prediction - user not authenticated');
      return;
    }

    const now = Date.now();
    const CACHE_DURATION = 60 * 60 * 1000;
    const MIN_CALL_INTERVAL = 10000;
    
    if (predictionCacheRef.current && 
        (now - lastPredictionTimeRef.current) < CACHE_DURATION) {
      console.log('✅ Using cached prediction');
      setWeightPrediction(predictionCacheRef.current);
      return;
    }

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
        console.log('🔒 Prediction skipped - authentication issue');
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
    
    const dates = predictions.map(p => {
      const date = new Date(p.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const weights = predictions.map(p => parseFloat(p.weight));
    
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const param = params[0];
          const date = param.axisValue;
          const weight = parseFloat(param.value).toFixed(1);
          return `<strong>${date}</strong><br/>Predicted Weight: <strong>${weight} kg</strong>`;
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
          rotate: 45
        },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.3)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Weight (kg)',
        nameTextStyle: { color: '#fff' },
        axisLabel: { 
          color: '#fff',
          formatter: (value) => value.toFixed(1)
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
                formatter: () => `Target: ${target.toFixed(1)} kg`,
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

  const getAIInsightMessage = () => {
    if (!weightPrediction?.trend) return 'Keep logging your progress to see AI insights!';
    
    const { trend } = weightPrediction;
    const direction = trend.direction;
    const onTrack = trend.onTrack;
    
    const userGoal = userProfile?.goal || 'maintain';
    
    if (direction === 'losing') {
      if (userGoal === 'lose') {
        return `Great progress! You're losing weight at ${Math.abs(trend.weeklyChange).toFixed(2)} kg/week. ${onTrack ? "You're on track to reach your goal!" : "Consider adjusting your target date."}`;
      } else if (userGoal === 'gain') {
        return `Your weight is decreasing, but your goal is to gain weight. Consider increasing your calorie intake.`;
      } else {
        return `Your weight is decreasing. Make sure this aligns with your goals!`;
      }
    } else if (direction === 'gaining') {
      if (userGoal === 'gain') {
        return `Excellent! You're gaining weight at ${Math.abs(trend.weeklyChange).toFixed(2)} kg/week. Keep up the good work!`;
      } else if (userGoal === 'lose') {
        return `Your weight is increasing, but your goal is to lose weight. Consider reducing your calorie intake or increasing activity.`;
      } else {
        return `Your weight is increasing. Make sure this aligns with your goals!`;
      }
    } else {
      return `Your weight is stable. ${userGoal === 'maintain' ? 'Perfect for maintenance!' : 'Consider adjusting your approach to reach your goals.'}`;
    }
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
              <h3 className="stat-value">{parseFloat(stats?.currentWeight || userProfile?.weight || 0).toFixed(1)} kg</h3>
              <small className="stat-change text-success">
                {stats?.weightChange > 0 ? '+' : ''}{parseFloat(stats?.weightChange || 0).toFixed(1)} kg
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
              <small className="stat-change">
                Goal: {macros?.calories || 0} cal
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon"><i className="fas fa-calendar-check"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Streak</h5>
              <h3 className="stat-value">{stats?.streakDays || 0} days</h3>
              <small className="stat-change">Keep it up!</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon"><i className="fas fa-chart-line"></i></div>
            <div className="stat-content">
              <h5 className="stat-label">Progress</h5>
              <h3 className="stat-value">
                {userProfile?.targetWeight && stats.currentWeight 
                  ? Math.round(Math.min(100, (1 - Math.abs(stats.currentWeight - userProfile.targetWeight) / 
                    Math.abs(userProfile.weight - userProfile.targetWeight || 1)) * 100))
                  : 0}%
              </h3>
              <small className="stat-change">To Goal</small>
            </div>
          </div>
        </div>
      </div>

      {/* Macros Cards + Today's Meals */}
      <div className="row mb-4">
        {/* Macros - Left Side */}
        <div className="col-lg-8 mb-3">
          <div className="row">
            <div className="col-md-4 mb-3">
              <div className="glass-container macro-card-large">
                <div className="macro-header-large">
                  <div className="macro-icon-large protein-icon">
                    <i className="fas fa-drumstick-bite"></i>
                  </div>
                  <div className="macro-info">
                    <span className="macro-label-large">Protein</span>
                    <span className="macro-value-large">
                      {dailyIntake?.protein || 0}g <span className="text-white-50">/ {macros?.protein || 0}g</span>
                    </span>
                  </div>
                </div>
                <div className="macro-progress-container">
                  <div className="macro-progress-bar">
                    <div 
                      className="macro-progress-fill protein" 
                      style={{ width: `${Math.min(100, ((dailyIntake?.protein || 0) / (macros?.protein || 1)) * 100)}%` }}
                    >
                      <span className="progress-percentage">
                        {Math.round(((dailyIntake?.protein || 0) / (macros?.protein || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="macro-remaining">
                    {Math.max(0, (macros?.protein || 0) - (dailyIntake?.protein || 0))}g remaining
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-3">
              <div className="glass-container macro-card-large">
                <div className="macro-header-large">
                  <div className="macro-icon-large carbs-icon">
                    <i className="fas fa-bread-slice"></i>
                  </div>
                  <div className="macro-info">
                    <span className="macro-label-large">Carbs</span>
                    <span className="macro-value-large">
                      {dailyIntake?.carbs || 0}g <span className="text-white-50">/ {macros?.carbs || 0}g</span>
                    </span>
                  </div>
                </div>
                <div className="macro-progress-container">
                  <div className="macro-progress-bar">
                    <div 
                      className="macro-progress-fill carbs" 
                      style={{ width: `${Math.min(100, ((dailyIntake?.carbs || 0) / (macros?.carbs || 1)) * 100)}%` }}
                    >
                      <span className="progress-percentage">
                        {Math.round(((dailyIntake?.carbs || 0) / (macros?.carbs || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="macro-remaining">
                    {Math.max(0, (macros?.carbs || 0) - (dailyIntake?.carbs || 0))}g remaining
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-3">
              <div className="glass-container macro-card-large">
                <div className="macro-header-large">
                  <div className="macro-icon-large fat-icon">
                    <i className="fas fa-cheese"></i>
                  </div>
                  <div className="macro-info">
                    <span className="macro-label-large">Fat</span>
                    <span className="macro-value-large">
                      {dailyIntake?.fat || 0}g <span className="text-white-50">/ {macros?.fat || 0}g</span>
                    </span>
                  </div>
                </div>
                <div className="macro-progress-container">
                  <div className="macro-progress-bar">
                    <div 
                      className="macro-progress-fill fat" 
                      style={{ width: `${Math.min(100, ((dailyIntake?.fat || 0) / (macros?.fat || 1)) * 100)}%` }}
                    >
                      <span className="progress-percentage">
                        {Math.round(((dailyIntake?.fat || 0) / (macros?.fat || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="macro-remaining">
                    {Math.max(0, (macros?.fat || 0) - (dailyIntake?.fat || 0))}g remaining
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Meals - Right Side */}
        <div className="col-lg-4 mb-3">
          <div className="glass-container p-4 h-100">
            <h4 className="text-white mb-3">Today's Meals</h4>
            {dailyIntake?.meals && dailyIntake.meals.length > 0 ? (
              <div className="meals-list">
                {dailyIntake.meals.map((meal, index) => (
                  <div key={index} className="meal-item">
                    <div>
                      <h6 className="text-white mb-1">{meal.recipeName}</h6>
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

      {}
      <div className="row mb-4">
        <div className="col-lg-6 mb-3">
          <div className="glass-container p-4">
            <h4 className="text-white mb-3">
              Weight Prediction
              {predictionLoading && (
                <span className="spinner-border spinner-border-sm ms-2" role="status"></span>
              )}
            </h4>
            {weightPrediction?.predictions ? (
              <ReactECharts option={getWeightPredictionChartOption()} style={{ height: '400px' }} />
            ) : (
              <div className="text-center py-5">
                <p className="text-white-50">
                  {predictionLoading ? 'Loading predictions...' : 'Log at least 2 progress entries to see AI predictions'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-6 mb-3">
          <div className="glass-container p-4">
            <h4 className="text-white mb-3">Goal Progress</h4>
            <ReactECharts option={getWeightProgressOption()} style={{ height: '340px' }} />
            <div className="text-center mt-3">
              <p className="text-white">
                <strong>{stats.currentWeight?.toFixed(1) || 0} kg</strong> / {userProfile?.targetWeight?.toFixed(1) || 0} kg
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {weightPrediction && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="glass-container p-4">
              <h4 className="text-white mb-3">
                <i className="fas fa-robot me-2"></i>
                AI Insights
              </h4>
              <div className="insight-card">
                <p className="text-white mb-0">{getAIInsightMessage()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;