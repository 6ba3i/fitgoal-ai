import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import './Auth.css';

// Firebase imports
import { auth, googleProvider } from '../../config/firebase';
import { signInWithPopup } from 'firebase/auth';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.login(formData.email, formData.password);
      
      if (response.success) {
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const response = await authService.googleAuth(idToken);
      
      if (response.success) {
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
        toast.success('Google login successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Google login failed');
      console.error('Google login error:', error);
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
            <p className="text-white">Your AI-Powered Fitness Journey</p>
          </div>

          <h2 className="text-white text-center mb-4">Welcome Back</h2>

          <form onSubmit={handleSubmit}>
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
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="mb-3 text-end">
              <Link to="/forgot-password" className="text-white-50 text-decoration-none">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="glass-button w-100 mb-3"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : null}
              Sign In
            </button>
          </form>

          <div className="divider">
            <span className="divider-text">OR</span>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="glass-button google-button w-100 mb-3"
            disabled={loading}
          >
            <i className="fab fa-google me-2"></i>
            Sign in with Google
          </button>

          <div className="text-center mt-4">
            <p className="text-white-50">
              Don't have an account?{' '}
              <Link to="/register" className="text-white text-decoration-none fw-bold">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <div className="features-section mt-5">
          <div className="row">
            <div className="col-md-4 text-center mb-3">
              <div className="feature-icon">
                <i className="fas fa-brain fa-3x text-white mb-3"></i>
              </div>
              <h5 className="text-white">AI-Powered</h5>
              <p className="text-white-50">Smart predictions and personalized recommendations</p>
            </div>
            <div className="col-md-4 text-center mb-3">
              <div className="feature-icon">
                <i className="fas fa-chart-line fa-3x text-white mb-3"></i>
              </div>
              <h5 className="text-white">Track Progress</h5>
              <p className="text-white-50">Monitor your fitness journey with detailed analytics</p>
            </div>
            <div className="col-md-4 text-center mb-3">
              <div className="feature-icon">
                <i className="fas fa-utensils fa-3x text-white mb-3"></i>
              </div>
              <h5 className="text-white">Smart Recipes</h5>
              <p className="text-white-50">Get personalized meal recommendations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;