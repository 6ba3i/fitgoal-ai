import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar navbar-expand-lg glass-nav">
      <div className="container">
        <Link className="navbar-brand" to="/dashboard">
          <i className="fas fa-heartbeat me-2"></i>
          <span className="gradient-text fw-bold">FitGoal AI</span>
        </Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav mx-auto">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/dashboard')}`} to="/dashboard">
                <i className="fas fa-tachometer-alt me-1"></i>
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/goals')}`} to="/goals">
                <i className="fas fa-bullseye me-1"></i>
                Goals
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/recipes')}`} to="/recipes">
                <i className="fas fa-utensils me-1"></i>
                Recipes
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/progress')}`} to="/progress">
                <i className="fas fa-chart-line me-1"></i>
                Progress
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/profile')}`} to="/profile">
                <i className="fas fa-user-circle me-1"></i>
                Profile
              </Link>
            </li>
          </ul>

          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <button 
                className="nav-link dropdown-toggle user-menu" 
                data-bs-toggle="dropdown"
              >
                <span className="user-avatar">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
                <span className="user-name">{user?.displayName}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end glass-dropdown">
                <li>
                  <Link className="dropdown-item" to="/profile">
                    <i className="fas fa-user me-2"></i>
                    My Profile
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/settings">
                    <i className="fas fa-cog me-2"></i>
                    Settings
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;