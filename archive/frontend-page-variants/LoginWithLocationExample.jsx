import React, { useState } from 'react';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import './LoginWithLocationExample.css';

/**
 * Example Login Page with Location Permission
 * Shows how to integrate location tracking into login flow
 */
const LoginWithLocationExample = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Call your login API
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      const { user, token } = data;

      // Store token
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.name);

      setUserRole(user.role);

      // Show location permission for delivery boys and marketing staff
      if (['delivery_boy', 'marketing_boy'].includes(user.role)) {
        setShowLocationModal(true);
      } else {
        // For other roles, navigate directly
        window.location.href = '/dashboard';
      }

      setLoginSuccess(true);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationPermissionGranted = (granted) => {
    setShowLocationModal(false);

    if (granted) {
      console.log('Location permission granted');
    } else {
      console.log('Location permission skipped');
    }

    // Navigate to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
  };

  return (
    <div className="login-container">
      {/* Background */}
      <div className="login-background">
        <div className="gradient-bg"></div>
      </div>

      {/* Login Card */}
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="logo">🚚</div>
          <h1>EarlyBird Delivery</h1>
          <p>Fast, Reliable Deliveries</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          {/* Remember Me */}
          <div className="form-remember">
            <input
              type="checkbox"
              id="remember"
              defaultChecked
            />
            <label htmlFor="remember">Remember me</label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="login-footer">
          <a href="#forgot">Forgot password?</a>
          <span className="divider">•</span>
          <a href="#signup">Create account</a>
        </div>

        {/* Demo Credentials */}
        <div className="demo-credentials">
          <h4>Demo Credentials</h4>
          <div className="demo-role">
            <strong>Delivery Boy:</strong>
            <p>delivery@example.com / password123</p>
          </div>
          <div className="demo-role">
            <strong>Supervisor:</strong>
            <p>supervisor@example.com / password123</p>
          </div>
        </div>
      </div>

      {/* Location Permission Modal */}
      {showLocationModal && userRole && (
        <LocationPermissionModal
          role={userRole}
          onPermissionGranted={handleLocationPermissionGranted}
          onSkip={() => handleLocationPermissionGranted(false)}
        />
      )}
    </div>
  );
};

export default LoginWithLocationExample;
