// Main entry point for FitGoal AI React Application

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';

// Import global styles
import './styles/index.css';
import './styles/variables.css';
import './styles/glassmorphism.css';

// Import context providers
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';

// Import constants for theme detection
import { THEMES, STORAGE_KEYS } from './utils/constants';
import { loadFromStorage } from './utils/helpers';

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  console.error('Application Error:', error);
  
  return (
    <div className="error-boundary">
      <div className="error-container">
        <div className="error-content glass-card">
          <div className="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          
          <h1>Oops! Something went wrong</h1>
          <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
          
          <div className="error-actions">
            <button 
              onClick={resetErrorBoundary}
              className="btn btn-primary"
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-secondary"
            >
              Refresh Page
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="error-details">
              <summary>Error Details (Development Only)</summary>
              <pre>{error.message}</pre>
              <pre>{error.stack}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

// Theme initialization
const initializeTheme = () => {
  const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, THEMES.AUTO);
  
  if (savedTheme === THEMES.AUTO) {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? THEMES.DARK : THEMES.LIGHT);
  } else {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = loadFromStorage(STORAGE_KEYS.THEME, THEMES.AUTO);
    if (currentTheme === THEMES.AUTO) {
      document.documentElement.setAttribute('data-theme', e.matches ? THEMES.DARK : THEMES.LIGHT);
    }
  });
};

// Performance monitoring (development only)
const enablePerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    // Report web vitals
    const reportWebVitals = (metric) => {
      console.log('Performance Metric:', metric);
    };
    
    // Dynamic import of web-vitals for development
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(reportWebVitals);
      getFID(reportWebVitals);
      getFCP(reportWebVitals);
      getLCP(reportWebVitals);
      getTTFB(reportWebVitals);
    }).catch(() => {
      console.log('Web Vitals not available');
    });
  }
};

// Service Worker registration
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Initialize application
const initializeApp = () => {
  // Initialize theme before rendering
  initializeTheme();
  
  // Enable performance monitoring in development
  enablePerformanceMonitoring();
  
  // Register service worker for production
  registerServiceWorker();
  
  // Set up global error handling
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // You can add error reporting service here
  });
  
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // You can add error reporting service here
  });
  
  // Add app metadata
  document.title = 'FitGoal AI - Your Personal Fitness & Nutrition Tracker';
  
  // Set up viewport meta tag for mobile
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
  
  // Add app icons and manifest for PWA
  const manifest = document.querySelector('link[rel="manifest"]');
  if (manifest && !manifest.getAttribute('href')) {
    manifest.setAttribute('href', '/manifest.json');
  }
  
  // Add theme color for mobile browsers
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    themeColorMeta.content = '#667eea';
    document.head.appendChild(themeColorMeta);
  }
  
  // Add apple touch icon
  let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleTouchIcon) {
    appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = '/apple-touch-icon.png';
    document.head.appendChild(appleTouchIcon);
  }
};

// Root component with all providers
const AppWithProviders = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Error Boundary caught an error:', error, errorInfo);
        // You can add error reporting service here
      }}
      onReset={() => {
        // Clear any error state or refresh data
        window.location.reload();
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

// Initialize and render the application
const startApp = () => {
  // Initialize application settings
  initializeApp();
  
  // Create root and render
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  // Enable strict mode in development
  if (process.env.NODE_ENV === 'development') {
    root.render(
      <React.StrictMode>
        <AppWithProviders />
      </React.StrictMode>
    );
  } else {
    root.render(<AppWithProviders />);
  }
  
  // Log app startup in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 FitGoal AI application started successfully!');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('React version:', React.version);
  }
};

// Check if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// Hot module replacement for development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    console.log('🔄 Hot reloading App component...');
  });
}