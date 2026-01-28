// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HapticsService } from '../../services/capacitorService';
import './LoginScreen.css';

export default function LoginScreen() {
  const { login, signup, isLoading } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await HapticsService.vibrate(100);
      await login(formData.phone, formData.password);
      await HapticsService.notification('Success');
    } catch (err: any) {
      await HapticsService.notification('Error');
      setError(err.message || 'Login failed');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setError('');
      await HapticsService.vibrate(100);
      await signup(formData.name, formData.phone, formData.password);
      await HapticsService.notification('Success');
    } catch (err: any) {
      await HapticsService.notification('Error');
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>🏪 Kirana Store</h1>
        <p>Your neighborhood store, delivered</p>
      </div>

      <form onSubmit={isSignup ? handleSignup : handleLogin} className="login-form">
        <h2>{isSignup ? 'Create Account' : 'Sign In'}</h2>

        {isSignup && (
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input"
          />
        )}

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number (10 digits)"
          value={formData.phone}
          onChange={handleChange}
          required
          pattern="[0-9]{10}"
          className="input"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="input"
        />

        {isSignup && (
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="input"
          />
        )}

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {isLoading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <div className="login-footer">
        <p>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
            className="toggle-btn"
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
