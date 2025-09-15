import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { UserContext } from '../../context/UserContext';
import { userService } from '../../services/user.service';
import { aiService } from '../../services/ai.service';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const { userProfile, updateProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState(null);
  const [macros, setMacros] = useState(null);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    weight: userProfile?.profile?.weight || 70,
    height: userProfile?.profile?.height || 170,
    age: userProfile?.profile?.age || 25,
    gender: userProfile?.profile?.gender || 'male',
    activityLevel: userProfile?.profile?.activityLevel || 'moderate',
    goal: userProfile?.profile?.goal || 'maintain',
    targetWeight: userProfile?.profile?.targetWeight || 70,
    targetDate: userProfile?.profile?.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: user?.displayName || '',
        email: user?.email || '',
        weight: userProfile.profile.weight,
        height: userProfile.profile.height,
        age: userProfile.profile.age,
        gender: userProfile.profile.gender,
        activityLevel: userProfile.profile.activityLevel,
        goal: userProfile.profile.goal,
        targetWeight: userProfile.profile.targetWeight,
        targetDate: new Date(userProfile.profile.targetDate).toISOString().split('T')[0]
      });
    }
  }, [userProfile, user]);

  const fetchUserData = async () => {
    try {
      const [statsData, macrosData] = await Promise.all([
        userService.getUserStats(),
        userService.calculateMacros()
      ]);
      setStats(statsData.data);
      setMacros(macrosData.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await updateProfile(formData);
      if (response.success) {
        toast.success('Profile updated successfully!');
        setEditMode(false);
        await fetchUserData();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error('Update profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await userService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (response.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('This will permanently delete all your data. Are you absolutely sure?')) {
        try {
          await userService.deleteAccount();
          toast.success('Account deleted successfully');
          logout();
        } catch (error) {
          toast.error('Failed to delete account');
        }
      }
    }
  };

  const calculateBMI = () => {
    const heightInMeters = formData.height / 100;
    const bmi = formData.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-warning' };
    if (bmi < 25) return { category: 'Normal weight', color: 'text-success' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-warning' };
    return { category: 'Obese', color: 'text-danger' };
  };

  const bmi = calculateBMI();
  const bmiInfo = getBMICategory(bmi);

  return (
    <div className="container profile-container">
      <div className="profile-header mb-4">
        <h1 className="text-white">My Profile</h1>
        <p className="text-white-50">Manage your account and personal information</p>
      </div>

      {/* Profile Tabs */}
      <div className="profile-tabs mb-4">
        <button
          className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <i className="fas fa-user me-2"></i>
          Personal Info
        </button>
        <button
          className={`tab-button ${activeTab === 'fitness' ? 'active' : ''}`}
          onClick={() => setActiveTab('fitness')}
        >
          <i className="fas fa-heartbeat me-2"></i>
          Fitness Data
        </button>
        <button
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="fas fa-lock me-2"></i>
          Security
        </button>
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <i className="fas fa-chart-bar me-2"></i>
          Statistics
        </button>
      </div>

      {/* Personal Information Tab */}
      {activeTab === 'personal' && (
        <div className="glass-container">
          <div className="profile-section-header">
            <h4 className="text-white">Personal Information</h4>
            {!editMode ? (
              <button 
                className="glass-button edit-button"
                onClick={() => setEditMode(true)}
              >
                <i className="fas fa-edit me-2"></i>Edit
              </button>
            ) : (
              <div>
                <button 
                  className="glass-button save-button me-2"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  <i className="fas fa-save me-2"></i>Save
                </button>
                <button 
                  className="glass-button cancel-button"
                  onClick={() => setEditMode(false)}
                >
                  <i className="fas fa-times me-2"></i>Cancel
                </button>
              </div>
            )}
          </div>

          <div className="row mt-4">
            <div className="col-md-6 mb-3">
              <label className="form-label">Display Name</label>
              <input
                type="text"
                className="form-control glass-input"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                disabled={!editMode}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control glass-input"
                value={formData.email}
                disabled
              />
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Age</label>
              <input
                type="number"
                className="form-control glass-input"
                name="age"
                value={formData.age}
                onChange={handleChange}
                disabled={!editMode}
              />
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Gender</label>
              <select
                className="form-select glass-input"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                className="form-control glass-input"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.1"
                disabled={!editMode}
              />
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Height (cm)</label>
              <input
                type="number"
                className="form-control glass-input"
                name="height"
                value={formData.height}
                onChange={handleChange}
                disabled={!editMode}
              />
            </div>
          </div>

          <div className="bmi-display mt-4">
            <h5 className="text-white mb-3">Body Mass Index (BMI)</h5>
            <div className="bmi-card">
              <div className="bmi-value">{bmi}</div>
              <div className={`bmi-category ${bmiInfo.color}`}>
                {bmiInfo.category}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fitness Data Tab */}
      {activeTab === 'fitness' && (
        <div className="glass-container">
          <h4 className="text-white mb-4">Fitness Information</h4>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Activity Level</label>
              <select
                className="form-select glass-input"
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Light (exercise 1-3 days/week)</option>
                <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                <option value="active">Active (exercise 6-7 days/week)</option>
                <option value="veryActive">Very Active (intense exercise daily)</option>
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Fitness Goal</label>
              <select
                className="form-select glass-input"
                name="goal"
                value={formData.goal}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain">Gain Weight/Muscle</option>
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Target Weight (kg)</label>
              <input
                type="number"
                className="form-control glass-input"
                name="targetWeight"
                value={formData.targetWeight}
                onChange={handleChange}
                step="0.1"
                disabled={!editMode}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Target Date</label>
              <input
                type="date"
                className="form-control glass-input"
                name="targetDate"
                value={formData.targetDate}
                onChange={handleChange}
                disabled={!editMode}
              />
            </div>
          </div>

          {macros && (
            <div className="macros-display mt-4">
              <h5 className="text-white mb-3">Daily Nutrition Targets</h5>
              <div className="row">
                <div className="col-md-3">
                  <div className="macro-card-profile">
                    <div className="macro-icon">
                      <i className="fas fa-fire"></i>
                    </div>
                    <div className="macro-value">{macros.calories}</div>
                    <div className="macro-label">Calories</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="macro-card-profile">
                    <div className="macro-icon protein">
                      <i className="fas fa-drumstick-bite"></i>
                    </div>
                    <div className="macro-value">{macros.protein}g</div>
                    <div className="macro-label">Protein</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="macro-card-profile">
                    <div className="macro-icon carbs">
                      <i className="fas fa-bread-slice"></i>
                    </div>
                    <div className="macro-value">{macros.carbs}g</div>
                    <div className="macro-label">Carbs</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="macro-card-profile">
                    <div className="macro-icon fat">
                      <i className="fas fa-cheese"></i>
                    </div>
                    <div className="macro-value">{macros.fat}g</div>
                    <div className="macro-label">Fat</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="glass-container">
          <h4 className="text-white mb-4">Security Settings</h4>

          <div className="security-section mb-5">
            <h5 className="text-white mb-3">Change Password</h5>
            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control glass-input"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control glass-input"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control glass-input"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <button type="submit" className="glass-button" disabled={loading}>
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : (
                  <i className="fas fa-key me-2"></i>
                )}
                Change Password
              </button>
            </form>
          </div>

          <div className="danger-zone">
            <h5 className="text-danger mb-3">Danger Zone</h5>
            <p className="text-white-50 mb-3">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button 
              className="glass-button danger-button"
              onClick={handleDeleteAccount}
            >
              <i className="fas fa-trash-alt me-2"></i>
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="glass-container">
          <h4 className="text-white mb-4">Your Statistics</h4>

          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.daysOnPlatform}</div>
                  <div className="stat-label">Days on Platform</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-fire"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.currentStreak}</div>
                  <div className="stat-label">Day Streak</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-dumbbell"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalWorkouts}</div>
                  <div className="stat-label">Workouts Completed</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-weight"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.weightChange || 0} kg</div>
                  <div className="stat-label">Total Weight Change</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-utensils"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.favoriteRecipesCount}</div>
                  <div className="stat-label">Favorite Recipes</div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="stat-card-profile">
                <div className="stat-icon">
                  <i className="fas fa-bullseye"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{macros?.bmr || 0}</div>
                  <div className="stat-label">BMR (kcal)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="achievement-section mt-4">
            <h5 className="text-white mb-3">Achievements</h5>
            <div className="achievements-grid">
              {stats.currentStreak >= 7 && (
                <div className="achievement-badge">
                  <i className="fas fa-fire"></i>
                  <span>Week Warrior</span>
                </div>
              )}
              {stats.currentStreak >= 30 && (
                <div className="achievement-badge gold">
                  <i className="fas fa-trophy"></i>
                  <span>Monthly Master</span>
                </div>
              )}
              {stats.totalWorkouts >= 10 && (
                <div className="achievement-badge">
                  <i className="fas fa-dumbbell"></i>
                  <span>Fitness Enthusiast</span>
                </div>
              )}
              {stats.favoriteRecipesCount >= 5 && (
                <div className="achievement-badge">
                  <i className="fas fa-utensils"></i>
                  <span>Recipe Collector</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;