// client/src/components/Dashboard/Dashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { UserContext } from '../../context/UserContext';
import { firebaseDataService } from '../../services/firebase.data.service';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, dailyIntake, setDailyIntake } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentWeight: 0,
    weightChange: 0,
    averageCalories: 0,
    streakDays: 0,
    totalWorkouts: 0,
    favoriteRecipesCount: 0
  });
  const [macros, setMacros] = useState(null);

  useEffect(() => {
    if (user && userProfile) {
      fetchDashboardData();
    }
  }, [user, userProfile]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user stats from Firebase
      const statsResult = await firebaseDataService.getUserStats(user.uid);
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Use macros from user profile
      if (userProfile) {
        setMacros({
          calories: userProfile.dailyCalories || 2000,
          protein: userProfile.dailyProtein || 150,
          carbs: userProfile.dailyCarbs || 250,
          fat: userProfile.dailyFat || 65
        });
      }

      // Get today's intake
      const intakeResult = await firebaseDataService.getDailyIntake(user.uid);
      if (intakeResult.success) {
        setDailyIntake(intakeResult.data);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getNutritionChartOption = () => {
    if (!macros || !dailyIntake) return {};

    const consumed = {
      calories: dailyIntake.calories || 0,
      protein: dailyIntake.protein || 0,
      carbs: dailyIntake.carbs || 0,
      fat: dailyIntake.fat || 0
    };

    const remaining = {
      calories: Math.max(0, macros.calories - consumed.calories),
      protein: Math.max(0, macros.protein - consumed.protein),
      carbs: Math.max(0, macros.carbs - consumed.carbs),
      fat: Math.max(0, macros.fat - consumed.fat)
    };

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' }
      },
      legend: {
        data: ['Consumed', 'Remaining'],
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: ['Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#fff' }
      },
      series: [
        {
          name: 'Consumed',
          type: 'bar',
          data: [consumed.calories, consumed.protein, consumed.carbs, consumed.fat],
          itemStyle: {
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
        {
          name: 'Remaining',
          type: 'bar',
          data: [remaining.calories, remaining.protein, remaining.carbs, remaining.fat],
          itemStyle: { color: 'rgba(255, 255, 255, 0.2)' }
        }
      ]
    };
  };

  const getWeightProgressOption = () => {
    return {
      series: [
        {
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
        }
      ]
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
            <div className="stat-icon">
              <i className="fas fa-weight"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Current Weight</h5>
              <h3 className="stat-value">{stats?.currentWeight || userProfile?.weight || 0} kg</h3>
              <small className="stat-change text-success">
                {stats?.weightChange > 0 ? `+${stats.weightChange}` : stats?.weightChange || 0} kg
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-fire"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Daily Calories</h5>
              <h3 className="stat-value">{macros?.calories || 0}</h3>
              <small className="stat-change">
                {dailyIntake?.calories || 0} consumed
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Streak</h5>
              <h3 className="stat-value">{stats?.streakDays || 0} days</h3>
              <small className="stat-change text-success">Keep it up!</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Goal</h5>
              <h3 className="stat-value">{userProfile?.goal || 'Maintain'}</h3>
              <small className="stat-change">
                Target: {userProfile?.targetWeight || userProfile?.weight || 0} kg
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-8 mb-3">
          <div className="glass-container p-4">
            <h4 className="text-white mb-3">Nutrition Overview</h4>
            {macros && <ReactECharts option={getNutritionChartOption()} style={{ height: '300px' }} />}
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="glass-container p-4">
            <h4 className="text-white mb-3">Weight Progress</h4>
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