import React, { useState, useEffect, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { UserContext } from '../../context/UserContext';
import { userService } from '../../services/user.service';
import { aiService } from '../../services/ai.service';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, dailyIntake, setDailyIntake } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [macros, setMacros] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, insightsData, macrosData, intakeData] = await Promise.all([
        userService.getUserStats(),
        aiService.getInsights(),
        userService.calculateMacros(),
        userService.getDailyIntake()
      ]);

      setStats(statsData.data);
      setInsights(insightsData.data);
      setMacros(macrosData.data);
      setDailyIntake(intakeData.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNutritionChartOption = () => {
    if (!macros || !dailyIntake) return {};

    const remaining = {
      calories: Math.max(0, macros.calories - dailyIntake.calories),
      protein: Math.max(0, macros.protein - dailyIntake.protein),
      carbs: Math.max(0, macros.carbs - dailyIntake.carbs),
      fat: Math.max(0, macros.fat - dailyIntake.fat)
    };

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['Target', 'Current', 'Remaining'],
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
        data: ['Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#fff' }
      },
      series: [
        {
          name: 'Target',
          type: 'bar',
          data: [macros.calories, macros.protein, macros.carbs, macros.fat],
          itemStyle: { color: 'rgba(102, 126, 234, 0.8)' }
        },
        {
          name: 'Current',
          type: 'bar',
          data: [dailyIntake.calories, dailyIntake.protein, dailyIntake.carbs, dailyIntake.fat],
          itemStyle: { color: 'rgba(72, 199, 116, 0.8)' }
        },
        {
          name: 'Remaining',
          type: 'bar',
          data: [remaining.calories, remaining.protein, remaining.carbs, remaining.fat],
          itemStyle: { color: 'rgba(255, 221, 87, 0.8)' }
        }
      ]
    };
  };

  const getProgressChartOption = () => {
    if (!stats) return {};

    return {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          name: 'Goal Progress',
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 5,
          itemStyle: {
            color: '#667eea'
          },
          progress: {
            show: true,
            width: 30
          },
          pointer: {
            show: false
          },
          axisLine: {
            lineStyle: {
              width: 30,
              color: [[1, 'rgba(255, 255, 255, 0.1)']]
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          axisLabel: {
            show: false
          },
          title: {
            show: false
          },
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
            value: Math.round((1 - Math.abs(stats.currentWeight - stats.targetWeight) / 
                    Math.abs(stats.currentWeight - userProfile?.weight || 70)) * 100)
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
        <h1 className="text-white">Welcome back, {user?.displayName}!</h1>
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
              <h3 className="stat-value">{stats?.currentWeight || userProfile?.weight} kg</h3>
              <small className="stat-change text-success">
                {stats?.weightChange > 0 ? '+' : ''}{stats?.weightChange || 0} kg
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-bullseye"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Target Weight</h5>
              <h3 className="stat-value">{stats?.targetWeight || userProfile?.targetWeight} kg</h3>
              <small className="stat-change">
                {Math.abs((stats?.currentWeight || userProfile?.weight) - (stats?.targetWeight || userProfile?.targetWeight))} kg to go
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
              <h3 className="stat-value">{dailyIntake?.calories || 0}</h3>
              <small className="stat-change">
                / {macros?.calories || 2000} kcal
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
              <h5 className="stat-label">Current Streak</h5>
              <h3 className="stat-value">{stats?.currentStreak || 0} days</h3>
              <small className="stat-change text-warning">
                Keep it up!
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-8 mb-3">
          <div className="glass-container">
            <h4 className="text-white mb-3">Today's Nutrition Overview</h4>
            <ReactECharts 
              option={getNutritionChartOption()} 
              style={{ height: '400px' }}
              theme="dark"
            />
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="glass-container">
            <h4 className="text-white mb-3">Goal Progress</h4>
            <ReactECharts 
              option={getProgressChartOption()} 
              style={{ height: '400px' }}
              theme="dark"
            />
          </div>
        </div>
      </div>

      {/* Macros Progress */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="glass-container">
            <h4 className="text-white mb-4">Macro Nutrients Progress</h4>
            <div className="row">
              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Protein</span>
                    <span className="macro-value">{dailyIntake?.protein || 0}g / {macros?.protein || 0}g</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-success"
                      style={{ width: `${Math.min(100, ((dailyIntake?.protein || 0) / (macros?.protein || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Carbs</span>
                    <span className="macro-value">{dailyIntake?.carbs || 0}g / {macros?.carbs || 0}g</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-warning"
                      style={{ width: `${Math.min(100, ((dailyIntake?.carbs || 0) / (macros?.carbs || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Fat</span>
                    <span className="macro-value">{dailyIntake?.fat || 0}g / {macros?.fat || 0}g</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-danger"
                      style={{ width: `${Math.min(100, ((dailyIntake?.fat || 0) / (macros?.fat || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Water</span>
                    <span className="macro-value">0ml / {Math.round((userProfile?.weight || 70) * 35)}ml</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-info"
                      style={{ width: '0%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="glass-container">
              <h4 className="text-white mb-3">
                <i className="fas fa-brain me-2"></i>
                AI Insights
              </h4>
              <div className="insights-grid">
                {insights.dailyInsights && (
                  <div className="insight-card">
                    <h6 className="text-white">Daily Goals</h6>
                    <ul className="insight-list">
                      <li>Calorie Target: {insights.dailyInsights.calorieTarget} kcal</li>
                      <li>Water Goal: {insights.dailyInsights.waterGoal} ml</li>
                      <li>Step Goal: {insights.dailyInsights.stepGoal} steps</li>
                      <li>Sleep: {insights.dailyInsights.sleepRecommendation}</li>
                    </ul>
                  </div>
                )}
                
                {insights.motivationalMessage && (
                  <div className="insight-card">
                    <h6 className="text-white">Motivation</h6>
                    <p className="text-white-50 mb-0">
                      <i className="fas fa-quote-left me-2"></i>
                      {insights.motivationalMessage}
                      <i className="fas fa-quote-right ms-2"></i>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Meals */}
      <div className="row">
        <div className="col-12">
          <div className="glass-container">
            <h4 className="text-white mb-3">Today's Meals</h4>
            {dailyIntake?.meals && dailyIntake.meals.length > 0 ? (
              <div className="meals-list">
                {dailyIntake.meals.map((meal, index) => (
                  <div key={index} className="meal-item">
                    <div className="meal-info">
                      <h6 className="text-white mb-1">{meal.recipeName}</h6>
                      <small className="text-white-50">
                        {new Date(meal.consumedAt).toLocaleTimeString()}
                      </small>
                    </div>
                    <div className="meal-macros">
                      <span className="badge bg-primary">{meal.calories} kcal</span>
                      <span className="badge bg-success">{meal.protein}g protein</span>
                      <span className="badge bg-warning">{meal.carbs}g carbs</span>
                      <span className="badge bg-danger">{meal.fat}g fat</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white-50 text-center py-4">
                No meals logged today. Start by adding your breakfast!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;import React, { useState, useEffect, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { UserContext } from '../../context/UserContext';
import { userService } from '../../services/user.service';
import { aiService } from '../../services/ai.service';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, dailyIntake, setDailyIntake } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [macros, setMacros] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, insightsData, macrosData, intakeData] = await Promise.all([
        userService.getUserStats(),
        aiService.getInsights(),
        userService.calculateMacros(),
        userService.getDailyIntake()
      ]);

      setStats(statsData.data);
      setInsights(insightsData.data);
      setMacros(macrosData.data);
      setDailyIntake(intakeData.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNutritionChartOption = () => {
    if (!macros || !dailyIntake) return {};

    const remaining = {
      calories: Math.max(0, macros.calories - dailyIntake.calories),
      protein: Math.max(0, macros.protein - dailyIntake.protein),
      carbs: Math.max(0, macros.carbs - dailyIntake.carbs),
      fat: Math.max(0, macros.fat - dailyIntake.fat)
    };

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['Target', 'Current', 'Remaining'],
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
        data: ['Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#fff' }
      },
      series: [
        {
          name: 'Target',
          type: 'bar',
          data: [macros.calories, macros.protein, macros.carbs, macros.fat],
          itemStyle: { color: 'rgba(102, 126, 234, 0.8)' }
        },
        {
          name: 'Current',
          type: 'bar',
          data: [dailyIntake.calories, dailyIntake.protein, dailyIntake.carbs, dailyIntake.fat],
          itemStyle: { color: 'rgba(72, 199, 116, 0.8)' }
        },
        {
          name: 'Remaining',
          type: 'bar',
          data: [remaining.calories, remaining.protein, remaining.carbs, remaining.fat],
          itemStyle: { color: 'rgba(255, 221, 87, 0.8)' }
        }
      ]
    };
  };

  const getProgressChartOption = () => {
    if (!stats) return {};

    return {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          name: 'Goal Progress',
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 5,
          itemStyle: {
            color: '#667eea'
          },
          progress: {
            show: true,
            width: 30
          },
          pointer: {
            show: false
          },
          axisLine: {
            lineStyle: {
              width: 30,
              color: [[1, 'rgba(255, 255, 255, 0.1)']]
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          axisLabel: {
            show: false
          },
          title: {
            show: false
          },
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
            value: Math.round((1 - Math.abs(stats.currentWeight - stats.targetWeight) / 
                    Math.abs(stats.currentWeight - userProfile?.weight || 70)) * 100)
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
        <h1 className="text-white">Welcome back, {user?.displayName}!</h1>
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
              <h3 className="stat-value">{stats?.currentWeight || userProfile?.weight} kg</h3>
              <small className="stat-change text-success">
                {stats?.weightChange > 0 ? '+' : ''}{stats?.weightChange || 0} kg
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="glass-container stat-card">
            <div className="stat-icon">
              <i className="fas fa-bullseye"></i>
            </div>
            <div className="stat-content">
              <h5 className="stat-label">Target Weight</h5>
              <h3 className="stat-value">{stats?.targetWeight || userProfile?.targetWeight} kg</h3>
              <small className="stat-change">
                {Math.abs((stats?.currentWeight || userProfile?.weight) - (stats?.targetWeight || userProfile?.targetWeight))} kg to go
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
              <h3 className="stat-value">{dailyIntake?.calories || 0}</h3>
              <small className="stat-change">
                / {macros?.calories || 2000} kcal
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
              <h5 className="stat-label">Current Streak</h5>
              <h3 className="stat-value">{stats?.currentStreak || 0} days</h3>
              <small className="stat-change text-warning">
                Keep it up!
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-8 mb-3">
          <div className="glass-container">
            <h4 className="text-white mb-3">Today's Nutrition Overview</h4>
            <ReactECharts 
              option={getNutritionChartOption()} 
              style={{ height: '400px' }}
              theme="dark"
            />
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="glass-container">
            <h4 className="text-white mb-3">Goal Progress</h4>
            <ReactECharts 
              option={getProgressChartOption()} 
              style={{ height: '400px' }}
              theme="dark"
            />
          </div>
        </div>
      </div>

      {/* Macros Progress */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="glass-container">
            <h4 className="text-white mb-4">Macro Nutrients Progress</h4>
            <div className="row">
              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Protein</span>
                    <span className="macro-value">{dailyIntake?.protein || 0}g / {macros?.protein || 0}g</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-success"
                      style={{ width: `${Math.min(100, ((dailyIntake?.protein || 0) / (macros?.protein || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Carbs</span>
                    <span className="macro-value">{dailyIntake?.carbs || 0}g / {macros?.carbs || 0}g</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-warning"
                      style={{ width: `${Math.min(100, ((dailyIntake?.carbs || 0) / (macros?.carbs || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Fat</span>
                    <span className="macro-value">{dailyIntake?.fat || 0}g / {macros?.fat || 0}g</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-danger"
                      style={{ width: `${Math.min(100, ((dailyIntake?.fat || 0) / (macros?.fat || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="macro-card">
                  <div className="macro-header">
                    <span className="macro-label">Water</span>
                    <span className="macro-value">0ml / {Math.round((userProfile?.weight || 70) * 35)}ml</span>
                  </div>
                  <div className="progress mt-2">
                    <div 
                      className="progress-bar bg-info"
                      style={{ width: '0%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="glass-container">
              <h4 className="text-white mb-3">
                <i className="fas fa-brain me-2"></i>
                AI Insights
              </h4>
              <div className="insights-grid">
                {insights.dailyInsights && (
                  <div className="insight-card">
                    <h6 className="text-white">Daily Goals</h6>
                    <ul className="insight-list">
                      <li>Calorie Target: {insights.dailyInsights.calorieTarget} kcal</li>
                      <li>Water Goal: {insights.dailyInsights.waterGoal} ml</li>
                      <li>Step Goal: {insights.dailyInsights.stepGoal} steps</li>
                      <li>Sleep: {insights.dailyInsights.sleepRecommendation}</li>
                    </ul>
                  </div>
                )}
                
                {insights.motivationalMessage && (
                  <div className="insight-card">
                    <h6 className="text-white">Motivation</h6>
                    <p className="text-white-50 mb-0">
                      <i className="fas fa-quote-left me-2"></i>
                      {insights.motivationalMessage}
                      <i className="fas fa-quote-right ms-2"></i>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Meals */}
      <div className="row">
        <div className="col-12">
          <div className="glass-container">
            <h4 className="text-white mb-3">Today's Meals</h4>
            {dailyIntake?.meals && dailyIntake.meals.length > 0 ? (
              <div className="meals-list">
                {dailyIntake.meals.map((meal, index) => (
                  <div key={index} className="meal-item">
                    <div className="meal-info">
                      <h6 className="text-white mb-1">{meal.recipeName}</h6>
                      <small className="text-white-50">
                        {new Date(meal.consumedAt).toLocaleTimeString()}
                      </small>
                    </div>
                    <div className="meal-macros">
                      <span className="badge bg-primary">{meal.calories} kcal</span>
                      <span className="badge bg-success">{meal.protein}g protein</span>
                      <span className="badge bg-warning">{meal.carbs}g carbs</span>
                      <span className="badge bg-danger">{meal.fat}g fat</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white-50 text-center py-4">
                No meals logged today. Start by adding your breakfast!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;