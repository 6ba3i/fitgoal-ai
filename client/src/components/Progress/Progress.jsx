// client/src/components/Progress/Progress.jsx
import React, { useState, useEffect, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { AuthContext } from '../../context/AuthContext';
import { firebaseDataService } from '../../services/firebase.data.service';
import './Progress.css';

const Progress = () => {
  const { user } = useContext(AuthContext);
  const { userProfile, progressHistory, addProgress } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState([]);
  const [progressSummary, setProgressSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [activeView, setActiveView] = useState('chart');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    weight: 70,
    bodyFat: '',
    muscleMass: '',
    mood: 'good',
    energyLevel: 7,
    workoutCompleted: false,
    dailySteps: '',
    waterIntake: '',
    sleepHours: '',
    notes: ''
  });
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    if (userProfile) {
      setNewEntry(prev => ({
        ...prev,
        weight: userProfile.weight || 70
      }));
    }
  }, [userProfile]);

  useEffect(() => {
    if (user) {
      fetchProgressData();
    }
  }, [user, dateRange]);

  const fetchProgressData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get progress from Firebase
      const progressResult = await firebaseDataService.getProgress(user.uid, parseInt(dateRange));
      if (progressResult.success) {
        setProgressData(progressResult.data || []);
        
        // Calculate summary from the data
        const summary = calculateSummary(progressResult.data);
        setProgressSummary(summary);
        
        // Calculate trends
        const trendsData = calculateTrends(progressResult.data);
        setTrends(trendsData);
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      // Don't show error toast for index issues, just work with empty data
      if (!error.message?.includes('index')) {
        toast.error('Failed to load progress data');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    if (!data || data.length === 0) return null;
    
    const latest = data[0];
    const oldest = data[data.length - 1];
    
    return {
      currentWeight: latest?.weight || 0,
      startingWeight: oldest?.weight || 0,
      weightChange: (latest?.weight || 0) - (oldest?.weight || 0),
      averageEnergyLevel: data.reduce((sum, p) => sum + (p.energyLevel || 0), 0) / data.length,
      workoutStreak: calculateWorkoutStreak(data),
      totalWorkouts: data.filter(p => p.workoutCompleted).length
    };
  };

  const calculateTrends = (data) => {
    if (!data || data.length < 2) return null;
    
    // Simple trend calculation
    const weights = data.map(p => p.weight).filter(w => w);
    const isLosing = weights.length > 1 && weights[0] < weights[weights.length - 1];
    const isGaining = weights.length > 1 && weights[0] > weights[weights.length - 1];
    
    return {
      weightTrend: isLosing ? 'down' : isGaining ? 'up' : 'stable',
      consistency: data.length / parseInt(dateRange) * 100
    };
  };

  const calculateWorkoutStreak = (data) => {
    let streak = 0;
    for (const entry of data) {
      if (entry.workoutCompleted) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEntry({
      ...newEntry,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const entryData = {
        ...newEntry,
        weight: parseFloat(newEntry.weight) || 0,
        bodyFat: parseFloat(newEntry.bodyFat) || null,
        muscleMass: parseFloat(newEntry.muscleMass) || null,
        energyLevel: parseInt(newEntry.energyLevel) || 5,
        dailySteps: parseInt(newEntry.dailySteps) || null,
        waterIntake: parseInt(newEntry.waterIntake) || null,
        sleepHours: parseFloat(newEntry.sleepHours) || null
      };

      const response = await addProgress(entryData);
      if (response.success) {
        toast.success('Progress entry added successfully!');
        setShowAddModal(false);
        setNewEntry({
          weight: userProfile?.weight || 70,
          bodyFat: '',
          muscleMass: '',
          mood: 'good',
          energyLevel: 7,
          workoutCompleted: false,
          dailySteps: '',
          waterIntake: '',
          sleepHours: '',
          notes: ''
        });
        await fetchProgressData();
      } else {
        toast.error(response.error || 'Failed to add progress entry');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeightChartOption = () => {
    if (!progressData || progressData.length === 0) return {};

    const dates = progressData.map(p => {
      const date = p.date?.toDate?.() || new Date(p.date);
      return date.toLocaleDateString();
    }).reverse();

    const weights = progressData.map(p => p.weight).reverse();

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        name: 'Weight (kg)',
        axisLabel: { color: '#fff' },
        nameTextStyle: { color: '#fff' }
      },
      series: [{
        name: 'Weight',
        type: 'line',
        data: weights,
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
        }
      }]
    };
  };

  const getEnergyChartOption = () => {
    if (!progressData || progressData.length === 0) return {};

    const dates = progressData.map(p => {
      const date = p.date?.toDate?.() || new Date(p.date);
      return date.toLocaleDateString();
    }).reverse();

    const energy = progressData.map(p => p.energyLevel || 0).reverse();

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        name: 'Energy Level',
        min: 0,
        max: 10,
        axisLabel: { color: '#fff' },
        nameTextStyle: { color: '#fff' }
      },
      series: [{
        name: 'Energy',
        type: 'bar',
        data: energy,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#48c774' },
              { offset: 1, color: '#3ec46d' }
            ]
          }
        }
      }]
    };
  };

  if (loading && progressData.length === 0) {
    return (
      <div className="container progress-loading">
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container progress-container">
      <div className="progress-header mb-4">
        <h1 className="text-white">Track Your Progress</h1>
        <p className="text-white-50">Monitor your fitness journey over time</p>
      </div>

      {/* Controls Row */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="btn-group" role="group">
            <button 
              className={`btn ${activeView === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveView('chart')}
            >
              <i className="fas fa-chart-line me-2"></i>Charts
            </button>
            <button 
              className={`btn ${activeView === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveView('table')}
            >
              <i className="fas fa-table me-2"></i>Table
            </button>
            <button 
              className={`btn ${activeView === 'stats' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveView('stats')}
            >
              <i className="fas fa-chart-pie me-2"></i>Stats
            </button>
          </div>

          <select 
            className="form-select glass-input ms-3 d-inline-block w-auto"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        <div className="col-md-4 text-end">
          <button 
            className="btn btn-success"
            onClick={() => setShowAddModal(true)}
          >
            <i className="fas fa-plus me-2"></i>Add Entry
          </button>
        </div>
      </div>

      {/* Chart View */}
      {activeView === 'chart' && (
        <>
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <div className="glass-container p-4">
                <h4 className="text-white mb-3">Weight Progress</h4>
                {progressData.length > 0 ? (
                  <ReactECharts option={getWeightChartOption()} style={{ height: '300px' }} />
                ) : (
                  <p className="text-white-50">No weight data available. Add your first entry!</p>
                )}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <div className="glass-container p-4">
                <h4 className="text-white mb-3">Energy Levels</h4>
                {progressData.length > 0 ? (
                  <ReactECharts option={getEnergyChartOption()} style={{ height: '300px' }} />
                ) : (
                  <p className="text-white-50">No energy data available. Start tracking!</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {progressSummary && (
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="glass-container stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-weight"></i>
                  </div>
                  <div className="stat-content">
                    <h5 className="stat-label">Current Weight</h5>
                    <h3 className="stat-value">{progressSummary.currentWeight} kg</h3>
                    <small className="stat-change">
                      {progressSummary.weightChange > 0 ? '+' : ''}{progressSummary.weightChange.toFixed(1)} kg
                    </small>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="glass-container stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-dumbbell"></i>
                  </div>
                  <div className="stat-content">
                    <h5 className="stat-label">Workout Streak</h5>
                    <h3 className="stat-value">{progressSummary.workoutStreak} days</h3>
                    <small className="stat-change">Keep it up!</small>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="glass-container stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div className="stat-content">
                    <h5 className="stat-label">Avg Energy</h5>
                    <h3 className="stat-value">{progressSummary.averageEnergyLevel.toFixed(1)}/10</h3>
                    <small className="stat-change">Energy level</small>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <div className="glass-container stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="stat-content">
                    <h5 className="stat-label">Workouts</h5>
                    <h3 className="stat-value">{progressSummary.totalWorkouts}</h3>
                    <small className="stat-change">Completed</small>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Table View */}
      {activeView === 'table' && (
        <div className="glass-container p-4">
          <div className="table-responsive">
            <table className="table table-dark table-hover">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight (kg)</th>
                  <th>Body Fat (%)</th>
                  <th>Energy Level</th>
                  <th>Workout</th>
                  <th>Mood</th>
                </tr>
              </thead>
              <tbody>
                {progressData.map((entry, index) => {
                  const date = entry.date?.toDate?.() || new Date(entry.date);
                  return (
                    <tr key={index}>
                      <td>{date.toLocaleDateString()}</td>
                      <td>{entry.weight}</td>
                      <td>{entry.bodyFat || '-'}</td>
                      <td>{entry.energyLevel}/10</td>
                      <td>
                        {entry.workoutCompleted ? (
                          <i className="fas fa-check text-success"></i>
                        ) : (
                          <i className="fas fa-times text-danger"></i>
                        )}
                      </td>
                      <td>{entry.mood || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {progressData.length === 0 && (
              <p className="text-center text-white-50 py-4">No progress entries yet</p>
            )}
          </div>
        </div>
      )}

      {/* Stats View */}
      {activeView === 'stats' && trends && (
        <div className="glass-container p-4">
          <h4 className="text-white mb-4">Progress Statistics</h4>
          <div className="row">
            <div className="col-md-6">
              <h6 className="text-white">Weight Trend</h6>
              <p className="text-white-50">
                Your weight is trending {trends.weightTrend === 'down' ? '📉 down' : 
                                         trends.weightTrend === 'up' ? '📈 up' : '➡️ stable'}
              </p>
            </div>
            <div className="col-md-6">
              <h6 className="text-white">Tracking Consistency</h6>
              <div className="progress">
                <div 
                  className="progress-bar bg-success" 
                  style={{ width: `${trends.consistency}%` }}
                >
                  {Math.round(trends.consistency)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-container" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white mb-4">Add Progress Entry</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-white">Weight (kg)</label>
                  <input 
                    type="number"
                    name="weight"
                    value={newEntry.weight}
                    onChange={handleInputChange}
                    className="form-control glass-input"
                    step="0.1"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label text-white">Body Fat (%)</label>
                  <input 
                    type="number"
                    name="bodyFat"
                    value={newEntry.bodyFat}
                    onChange={handleInputChange}
                    className="form-control glass-input"
                    step="0.1"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label text-white">Energy Level (1-10)</label>
                  <input 
                    type="range"
                    name="energyLevel"
                    value={newEntry.energyLevel}
                    onChange={handleInputChange}
                    className="form-range"
                    min="1"
                    max="10"
                  />
                  <span className="text-white">{newEntry.energyLevel}</span>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label text-white">Mood</label>
                  <select 
                    name="mood"
                    value={newEntry.mood}
                    onChange={handleInputChange}
                    className="form-select glass-input"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="neutral">Neutral</option>
                    <option value="tired">Tired</option>
                    <option value="exhausted">Exhausted</option>
                  </select>
                </div>

                <div className="col-12 mb-3">
                  <div className="form-check">
                    <input 
                      type="checkbox"
                      name="workoutCompleted"
                      checked={newEntry.workoutCompleted}
                      onChange={handleInputChange}
                      className="form-check-input"
                      id="workoutCheck"
                    />
                    <label className="form-check-label text-white" htmlFor="workoutCheck">
                      Workout Completed
                    </label>
                  </div>
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label text-white">Notes</label>
                  <textarea 
                    name="notes"
                    value={newEntry.notes}
                    onChange={handleInputChange}
                    className="form-control glass-input"
                    rows="3"
                  ></textarea>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Progress;