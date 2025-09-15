import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    weight: 70,
    height: 170,
    age: 25,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain'
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthClass = () => {
    if (passwordStrength <= 1) return 'weak';
    if (passwordStrength <= 2) return 'medium';
    return 'strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordStrength < 2) {
      toast.warning('Please use a stronger password');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authService.register(registerData);
      
      if (response.success) {
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
        toast.success('Registration successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="glass-container auth-card">
          <div className="text-center mb-4">
            <h1 className="gradient-text display-4 fw-bold">FitGoal AI</h1>
            <p className="text-white">Start Your Fitness Journey Today</p>
          </div>

          <h2 className="text-white text-center mb-4">Create Account</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Display Name</label>
              <input
                type="text"
                className="form-control glass-input"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control glass-input"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control glass-input"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
              />
              {formData.password && (
                <div className={`password-strength ${getPasswordStrengthClass()}`}></div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control glass-input"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
            </div>

            <hr className="my-4" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            <h5 className="text-white mb-3">Basic Information</h5>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  className="form-control glass-input"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  step="0.1"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  className="form-control glass-input"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-control glass-input"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select glass-input"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Activity Level</label>
              <select
                className="form-select glass-input"
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleChange}
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light Activity</option>
                <option value="moderate">Moderate Activity</option>
                <option value="active">Active</option>
                <option value="veryActive">Very Active</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Fitness Goal</label>
              <select
                className="form-select glass-input"
                name="goal"
                value={formData.goal}
                onChange={handleChange}
              >
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain">Gain Weight/Muscle</option>
              </select>
            </div>

            <button
              type="submit"
              className="glass-button w-100 mb-3"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : null}
              Create Account
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-white-50">
              Already have an account?{' '}
              <Link to="/login" className="text-white text-decoration-none fw-bold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;