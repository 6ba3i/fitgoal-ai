// client/src/components/Profile/Profile.jsx
import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { UserContext } from '../../context/UserContext';
import { firebaseDataService } from '../../services/firebase.data.service';
import { firebaseAuthService } from '../../services/firebase.auth.service';
import './Profile.css';

const Profile = () => {
  const { user, logout, updateProfile: updateAuthProfile } = useContext(AuthContext);
  const { userProfile, updateProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState(null);
  const [macros, setMacros] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
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
    if (user && userProfile) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        weight: userProfile.weight || 70,
        height: userProfile.height || 170,
        age: userProfile.age || 25,
        gender: userProfile.gender || 'male',
        activityLevel: userProfile.activityLevel || 'moderate',
        goal: userProfile.goal || 'maintain',
        targetWeight: userProfile.targetWeight || userProfile.weight || 70,
        targetDate: userProfile.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      
      // Calculate macros based on profile
      const calculatedMacros = firebaseAuthService.calculateMacros(userProfile);
      setMacros(calculatedMacros);
      
      fetchUserStats();
    }
  }, [user, userProfile]);

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      const statsData = await firebaseDataService.getUserStats(user.uid);
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
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
    setLoading(true);

    try {
      const profileData = {
        weight: formData.weight,
        height: formData.height,
        age: formData.age,
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goal: formData.goal,
        targetWeight: formData.targetWeight,
        targetDate: formData.targetDate
      };

      // Calculate new macros
      const newMacros = firebaseAuthService.calculateMacros(profileData);
      
      // Update profile with calculated macros
      const fullProfileData = {
        ...profileData,
        ...newMacros
      };

      const response = await updateProfile(fullProfileData);
      
      if (response.success) {
        setMacros(newMacros);
        toast.success('Profile updated successfully!');
        setEditMode(false);
      } else {
        toast.error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Logged out successfully');
  };

  return (
    <div className="container profile-container">
      <div className="profile-header mb-4">
        <h1 className="text-white">My Profile</h1>
        <p className="text-white-50">Manage your personal information and settings</p>
      </div>

      {/* Profile Navigation */}
      <div className="profile-nav mb-4">
        <button 
          className={`profile-nav-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <i className="fas fa-user me-2"></i>
          Personal Info
        </button>
        <button 
          className={`profile-nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <i className="fas fa-chart-bar me-2"></i>
          Statistics
        </button>
        <button 
          className={`profile-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <i className="fas fa-cog me-2"></i>
          Settings
        </button>
      </div>

      {/* Personal Information Tab */}
      {activeTab === 'personal' && (
        <div className="glass-container p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="text-white">Personal Information</h3>
            <button 
              className="btn btn-outline-light"
              onClick={() => setEditMode(!editMode)}
            >
              <i className={`fas fa-${editMode ? 'times' : 'edit'} me-2`}></i>
              {editMode ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label text-white">Display Name</label>
                <input 
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label text-white">Email</label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  className="form-control glass-input"
                  disabled
                />
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label text-white">Weight (kg)</label>
                <input 
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                  step="0.1"
                  min="20"
                  max="500"
                />
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label text-white">Height (cm)</label>
                <input 
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                  min="50"
                  max="300"
                />
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label text-white">Age</label>
                <input 
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                  min="10"
                  max="120"
                />
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label text-white">Gender</label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-select glass-input"
                  disabled={!editMode}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label text-white">Activity Level</label>
                <select 
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  className="form-select glass-input"
                  disabled={!editMode}
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="active">Very Active</option>
                  <option value="veryActive">Extremely Active</option>
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label text-white">Goal</label>
                <select 
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="form-select glass-input"
                  disabled={!editMode}
                >
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Gain Weight</option>
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label text-white">Target Weight (kg)</label>
                <input 
                  type="number"
                  name="targetWeight"
                  value={formData.targetWeight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                  step="0.1"
                  min="20"
                  max="500"
                />
              </div>
            </div>

            {editMode && (
              <div className="mt-4">
                <button 
                  type="submit" 
                  className="btn btn-primary me-2"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </form>

          {/* Calculated Macros */}
          {macros && (
            <div className="mt-4 p-3 macro-display">
              <h5 className="text-white mb-3">Your Daily Targets</h5>
              <div className="row">
                <div className="col-md-3">
                  <div className="macro-item">
                    <span className="macro-label">Calories</span>
                    <span className="macro-value">{macros.dailyCalories}</span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="macro-item">
                    <span className="macro-label">Protein</span>
                    <span className="macro-value">{macros.dailyProtein}g</span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="macro-item">
                    <span className="macro-label">Carbs</span>
                    <span className="macro-value">{macros.dailyCarbs}g</span>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="macro-item">
                    <span className="macro-label">Fat</span>
                    <span className="macro-value">{macros.dailyFat}g</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="glass-container p-4">
          <h3 className="text-white mb-4">Your Statistics</h3>
          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-weight"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.currentWeight || 0} kg</div>
                  <div className="stat-label">Current Weight</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-trending-down"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.weightChange || 0} kg</div>
                  <div className="stat-label">Weight Change</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.streakDays || 0} days</div>
                  <div className="stat-label">Current Streak</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-dumbbell"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalWorkouts || 0}</div>
                  <div className="stat-label">Workouts Completed</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-utensils"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.favoriteRecipesCount || 0}</div>
                  <div className="stat-label">Favorite Recipes</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-calculator"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{macros?.bmr || 0}</div>
                  <div className="stat-label">BMR (kcal)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="glass-container p-4">
          <h3 className="text-white mb-4">Settings</h3>
          
          <div className="settings-section">
            <h5 className="text-white mb-3">Account</h5>
            <button 
              className="btn btn-danger"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;