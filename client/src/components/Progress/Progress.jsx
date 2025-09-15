import React, { useState, useEffect, useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import { progressService } from '../../services/progress.service';
import { aiService } from '../../services/ai.service';
import './Progress.css';

const Progress = () => {
  const { userProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState([]);
  const [progressSummary, setProgressSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [activeView, setActiveView] = useState('chart');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    weight: userProfile?.profile?.weight || 70,
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
    fetchProgressData();
  }, [dateRange]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const [progress, summary, trendsData] = await Promise.all([
        progressService.getProgress({ limit: parseInt(dateRange) }),
        progressService.getProgressSummary(),
        progressService.getProgressTrends()
      ]);

      setProgressData(progress.data || []);
      setProgressSummary(summary.data);
      setTrends(trendsData.data);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
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
      const response = await progressService.addProgress(newEntry);
      if (response.success) {
        toast.success('Progress entry added successfully!');
        setShowAddModal(false);
        setNewEntry({
          weight: userProfile?.profile?.weight || 70,
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
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add progress entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await progressService.deleteProgress(entryId);
        toast.success('Entry deleted successfully');
        await fetchProgressData();
      } catch (error) {
        toast.error('Failed to delete entry');
      }
    }
  };

  const getWeightChartOption = () => {
    if (!progressData || progressData.length === 0) return {};

    const sortedData = [...progressData].sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const data = params[0];
          return `${data.name}<br/>Weight: ${data.value} kg`;
        }
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(p => new Date(p.date).toLocaleDateString()),
        axisLabel: { 
          color: '#fff',
          rotate: 45
        }
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
        data: sortedData.map(p => p.weight),
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
        markPoint: {
          data: [
            { type: 'max', name: 'Max' },
            { type: 'min', name: 'Min' }
          ]
        },
        markLine: {
          data: [
            { type: 'average', name: 'Average' },
            {
              yAxis: userProfile?.profile?.targetWeight,
              name: 'Target',
              label: {
                formatter: 'Target: {c} kg',
                position: 'end'
              },
              lineStyle: {
                color: '#48c774',
                type: 'dashed'
              }
            }
          ]
        }
      }]
    };
  };

  const getBodyCompositionChartOption = () => {
    if (!progressData || progressData.length === 0) return {};

    const sortedData = [...progressData]
      .filter(p => p.bodyFat || p.muscleMass)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['Body Fat %', 'Muscle Mass'],
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(p => new Date(p.date).toLocaleDateString()),
        axisLabel: { 
          color: '#fff',
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#fff' }
      },
      series: [
        {
          name: 'Body Fat %',
          type: 'line',
          data: sortedData.map(p => p.bodyFat),
          smooth: true,
          lineStyle: { color: '#f14668' }
        },
        {
          name: 'Muscle Mass',
          type: 'line',
          data: sortedData.map(p => p.muscleMass),
          smooth: true,
          lineStyle: { color: '#48c774' }
        }
      ]
    };
  };

  const getActivityChartOption = () => {
    if (!progressData || progressData.length === 0) return {};

    const sortedData = [...progressData]
      .filter(p => p.dailySteps || p.workoutCompleted)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-14); // Last 14 days

    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['Daily Steps', 'Workout'],
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(p => new Date(p.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' })),
        axisLabel: { color: '#fff' }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Steps',
          axisLabel: { color: '#fff' },
          nameTextStyle: { color: '#fff' }
        },
        {
          type: 'value',
          name: 'Workout',
          max: 1,
          axisLabel: { 
            color: '#fff',
            formatter: (value) => value === 1 ? 'Yes' : 'No'
          },
          nameTextStyle: { color: '#fff' }
        }
      ],
      series: [
        {
          name: 'Daily Steps',
          type: 'bar',
          data: sortedData.map(p => p.dailySteps || 0),
          itemStyle: { color: '#667eea' }
        },
        {
          name: 'Workout',
          type: 'scatter',
          yAxisIndex: 1,
          data: sortedData.map(p => p.workoutCompleted ? 1 : 0),
          symbolSize: 15,
          itemStyle: { color: '#48c774' }
        }
      ]
    };
  };

  const getMoodColor = (mood) => {
    const colors = {
      excellent: 'text-success',
      good: 'text-info',
      neutral: 'text-warning',
      tired: 'text-orange',
      exhausted: 'text-danger'
    };
    return colors[mood] || 'text-white';
  };

  const getMoodIcon = (mood) => {
    const icons = {
      excellent: '😄',
      good: '😊',
      neutral: '😐',
      tired: '😴',
      exhausted: '😫'
    };
    return icons[mood] || '😐';
  };

  return (
    <div className="container progress-container">
      <div className="progress-header mb-4">
        <div>
          <h1 className="text-white">Your Progress</h1>
          <p className="text-white-50">Track your fitness journey over time</p>
        </div>
        <button 
          className="glass-button add-button"
          onClick={() => setShowAddModal(true)}
        >
          <i className="fas fa-plus me-2"></i>
          Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      {progressSummary && (
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="glass-container summary-card">
              <div className="summary-icon">
                <i className="fas fa-weight"></i>
              </div>
              <div className="summary-content">
                <div className="summary-label">Current Weight</div>
                <div className="summary-value">{progressSummary.currentWeight} kg</div>
                <div className="summary-change">
                  {progressSummary.totalWeightChange > 0 ? '+' : ''}{progressSummary.totalWeightChange} kg total
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="glass-container summary-card">
              <div className="summary-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="summary-content">
                <div className="summary-label">Avg Weight</div>
                <div className="summary-value">{progressSummary.averageWeight?.toFixed(1)} kg</div>
                <div className="summary-change">
                  Range: {progressSummary.lowestWeight} - {progressSummary.highestWeight} kg
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="glass-container summary-card">
              <div className="summary-icon">
                <i className="fas fa-dumbbell"></i>
              </div>
              <div className="summary-content">
                <div className="summary-label">Workout Rate</div>
                <div className="summary-value">{progressSummary.workoutCompletionRate?.toFixed(0)}%</div>
                <div className="summary-change">
                  {progressSummary.totalEntries} total entries
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="glass-container summary-card">
              <div className="summary-icon">
                <i className="fas fa-smile"></i>
              </div>
              <div className="summary-content">
                <div className="summary-label">Avg Mood</div>
                <div className="summary-value">{progressSummary.averageMood}</div>
                <div className="summary-change">
                  Energy: {progressSummary.averageEnergyLevel?.toFixed(1)}/10
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Controls */}
      <div className="view-controls mb-4">
        <div className="view-buttons">
          <button
            className={`view-button ${activeView === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveView('chart')}
          >
            <i className="fas fa-chart-line me-2"></i>Charts
          </button>
          <button
            className={`view-button ${activeView === 'table' ? 'active' : ''}`}
            onClick={() => setActiveView('table')}
          >
            <i className="fas fa-table me-2"></i>Table
          </button>
          <button
            className={`view-button ${activeView === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveView('insights')}
          >
            <i className="fas fa-brain me-2"></i>Insights
          </button>
        </div>
        
        <select
          className="form-select glass-input date-range-select"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Charts View */}
      {activeView === 'chart' && (
        <div>
          <div className="glass-container mb-4">
            <h4 className="text-white mb-3">Weight Progress</h4>
            <ReactECharts 
              option={getWeightChartOption()} 
              style={{ height: '400px' }}
              theme="dark"
            />
          </div>

          {progressData.some(p => p.bodyFat || p.muscleMass) && (
            <div className="glass-container mb-4">
              <h4 className="text-white mb-3">Body Composition</h4>
              <ReactECharts 
                option={getBodyCompositionChartOption()} 
                style={{ height: '350px' }}
                theme="dark"
              />
            </div>
          )}

          <div className="glass-container">
            <h4 className="text-white mb-3">Activity Tracking</h4>
            <ReactECharts 
              option={getActivityChartOption()} 
              style={{ height: '350px' }}
              theme="dark"
            />
          </div>
        </div>
      )}

      {/* Table View */}
      {activeView === 'table' && (
        <div className="glass-container">
          <h4 className="text-white mb-3">Progress History</h4>
          <div className="table-responsive">
            <table className="table table-dark progress-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>Body Fat</th>
                  <th>Muscle</th>
                  <th>Mood</th>
                  <th>Workout</th>
                  <th>Steps</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {progressData.map((entry) => (
                  <tr key={entry._id}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{entry.weight} kg</td>
                    <td>{entry.bodyFat ? `${entry.bodyFat}%` : '-'}</td>
                    <td>{entry.muscleMass ? `${entry.muscleMass} kg` : '-'}</td>
                    <td>
                      <span className={getMoodColor(entry.mood)}>
                        {getMoodIcon(entry.mood)} {entry.mood}
                      </span>
                    </td>
                    <td>
                      {entry.workoutCompleted ? (
                        <i className="fas fa-check text-success"></i>
                      ) : (
                        <i className="fas fa-times text-danger"></i>
                      )}
                    </td>
                    <td>{entry.dailySteps || '-'}</td>
                    <td>{entry.notes || '-'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteEntry(entry._id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights View */}
      {activeView === 'insights' && trends && (
        <div className="glass-container">
          <h4 className="text-white mb-4">AI Insights & Predictions</h4>
          
          {trends.trends && (
            <div className="insights-section mb-4">
              <h5 className="text-white mb-3">Current Trends</h5>
              <div className="row">
                <div className="col-md-4">
                  <div className="insight-card">
                    <div className="insight-label">Direction</div>
                    <div className={`insight-value ${trends.trends.direction === 'losing' ? 'text-success' : 'text-warning'}`}>
                      {trends.trends.direction === 'losing' ? '📉' : trends.trends.direction === 'gaining' ? '📈' : '➡️'}
                      {' '}{trends.trends.direction}
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="insight-card">
                    <div className="insight-label">Weekly Change</div>
                    <div className="insight-value">
                      {trends.trends.weeklyChange.toFixed(2)} kg/week
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="insight-card">
                    <div className="insight-label">Pace</div>
                    <div className="insight-value">
                      {trends.trends.pace}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {trends.predictions && (
            <div className="predictions-section">
              <h5 className="text-white mb-3">30-Day Prediction</h5>
              <div className="prediction-cards">
                {trends.predictions.slice(0, 4).map((pred, index) => (
                  <div key={index} className="prediction-card">
                    <div className="prediction-week">Week {index + 1}</div>
                    <div className="prediction-weight">{pred.weight.toFixed(1)} kg</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-white">Add Progress Entry</h3>
              <button 
                className="close-button"
                onClick={() => setShowAddModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Weight (kg)*</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="weight"
                    value={newEntry.weight}
                    onChange={handleInputChange}
                    step="0.1"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Body Fat %</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="bodyFat"
                    value={newEntry.bodyFat}
                    onChange={handleInputChange}
                    step="0.1"
                    min="1"
                    max="80"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Muscle Mass (kg)</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="muscleMass"
                    value={newEntry.muscleMass}
                    onChange={handleInputChange}
                    step="0.1"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Mood</label>
                  <select
                    className="form-select glass-input"
                    name="mood"
                    value={newEntry.mood}
                    onChange={handleInputChange}
                  >
                    <option value="excellent">😄 Excellent</option>
                    <option value="good">😊 Good</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="tired">😴 Tired</option>
                    <option value="exhausted">😫 Exhausted</option>
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Energy Level (1-10)</label>
                  <input
                    type="range"
                    className="form-range"
                    name="energyLevel"
                    value={newEntry.energyLevel}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                  />
                  <div className="text-center text-white">{newEntry.energyLevel}</div>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Daily Steps</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="dailySteps"
                    value={newEntry.dailySteps}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Water Intake (ml)</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="waterIntake"
                    value={newEntry.waterIntake}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Sleep Hours</label>
                  <input
                    type="number"
                    className="form-control glass-input"
                    name="sleepHours"
                    value={newEntry.sleepHours}
                    onChange={handleInputChange}
                    step="0.5"
                    min="0"
                    max="24"
                  />
                </div>

                <div className="col-12 mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="workoutCompleted"
                      name="workoutCompleted"
                      checked={newEntry.workoutCompleted}
                      onChange={handleInputChange}
                    />
                    <label className="form-check-label text-white" htmlFor="workoutCompleted">
                      Workout Completed
                    </label>
                  </div>
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control glass-input"
                    name="notes"
                    value={newEntry.notes}
                    onChange={handleInputChange}
                    rows="3"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="glass-button cancel-button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="glass-button"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : (
                    <i className="fas fa-save me-2"></i>
                  )}
                  Save Entry
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