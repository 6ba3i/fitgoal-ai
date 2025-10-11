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
    }
  }, [user, userProfile]);

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

  const calculateBMI = () => {
    if (!formData.weight || !formData.height) return '0.0';
    const heightInMeters = formData.height / 100;
    return (formData.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = () => {
    const bmi = parseFloat(calculateBMI());
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  return (
    <div className="container profile-container">
      <div className="profile-header mb-4">
        <h1 className="text-white">My Profile</h1>
        <p className="text-white-50">Manage your personal information and settings</p>
      </div>

      {/* Tabs - REMOVED STATISTICS TAB */}
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <i className="fas fa-user me-2"></i>
          Personal Info
        </button>
        <button 
          className={`tab-button ${activeTab === 'macros' ? 'active' : ''}`}
          onClick={() => setActiveTab('macros')}
        >
          <i className="fas fa-chart-pie me-2"></i>
          Macros
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <i className="fas fa-cog me-2"></i>
          Settings
        </button>
      </div>

      {/* Personal Information Tab */}
      {activeTab === 'personal' && (
        <div className="glass-container p-4">
          <div className="profile-section-header">
            <h3 className="text-white">Personal Information</h3>
            {!editMode ? (
              <button 
                className="btn btn-outline-light edit-button"
                onClick={() => setEditMode(true)}
              >
                <i className="fas fa-edit me-2"></i>
                Edit Profile
              </button>
            ) : (
              <button 
                className="btn btn-outline-light cancel-button"
                onClick={() => setEditMode(false)}
              >
                <i className="fas fa-times me-2"></i>
                Cancel
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
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
              <div className="col-md-6">
                <label className="form-label text-white">Email</label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  className="form-control glass-input"
                  disabled
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label text-white">Current Weight (kg)</label>
                <input 
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  step="0.1"
                  disabled={!editMode}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-white">Height (cm)</label>
                <input 
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                  required
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label text-white">Age</label>
                <input 
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-white">Gender</label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-select glass-input"
                  disabled={!editMode}
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-white">Activity Level</label>
              <select 
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleChange}
                className="form-select glass-input"
                disabled={!editMode}
                required
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Light (1-3 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="very_active">Very Active (2x/day)</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label text-white">Goal</label>
              <select 
                name="goal"
                value={formData.goal}
                onChange={handleChange}
                className="form-select glass-input"
                disabled={!editMode}
                required
              >
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain">Gain Weight</option>
              </select>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label text-white">Target Weight (kg)</label>
                <input 
                  type="number"
                  name="targetWeight"
                  value={formData.targetWeight}
                  onChange={handleChange}
                  className="form-control glass-input"
                  step="0.1"
                  disabled={!editMode}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-white">Target Date</label>
                <input 
                  type="date"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleChange}
                  className="form-control glass-input"
                  disabled={!editMode}
                  required
                />
              </div>
            </div>

            {editMode && (
              <div className="d-flex gap-2">
                <button 
                  type="submit" 
                  className="btn btn-primary save-button"
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
        </div>
      )}

      {/* Macros Tab */}
      {activeTab === 'macros' && macros && (
        <div className="glass-container p-4">
          <h3 className="text-white mb-4">Your Daily Macros</h3>
          <div className="row">
            <div className="col-md-3 mb-4">
              <div className="macro-card-profile">
                <div className="macro-icon">
                  <i className="fas fa-fire"></i>
                </div>
                <div className="macro-value">{macros?.calories || 0}</div>
                <div className="macro-label">Calories</div>
              </div>
            </div>

            <div className="col-md-3 mb-4">
              <div className="macro-card-profile">
                <div className="macro-icon protein">
                  <i className="fas fa-drumstick-bite"></i>
                </div>
                <div className="macro-value">{macros?.protein || 0}g</div>
                <div className="macro-label">Protein</div>
              </div>
            </div>

            <div className="col-md-3 mb-4">
              <div className="macro-card-profile">
                <div className="macro-icon carbs">
                  <i className="fas fa-bread-slice"></i>
                </div>
                <div className="macro-value">{macros?.carbs || 0}g</div>
                <div className="macro-label">Carbs</div>
              </div>
            </div>

            <div className="col-md-3 mb-4">
              <div className="macro-card-profile">
                <div className="macro-icon fat">
                  <i className="fas fa-cheese"></i>
                </div>
                <div className="macro-value">{macros?.fat || 0}g</div>
                <div className="macro-label">Fat</div>
              </div>
            </div>
          </div>

          {/* BMI Display */}
          {formData.weight && formData.height && (
            <div className="bmi-display mt-4">
              <h5 className="text-white mb-3">Body Mass Index (BMI)</h5>
              <div className="bmi-card">
                <div className="bmi-value">{calculateBMI()}</div>
                <div className="bmi-info">
                  <div className="bmi-category">{getBMICategory()}</div>
                  <div className="text-white-50">Based on your height and weight</div>
                </div>
              </div>
            </div>
          )}
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