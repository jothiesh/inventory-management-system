import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiBox, FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiUser } from 'react-icons/fi';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(credentials);

    if (result.success) {
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      toast.error(result.message || 'Invalid credentials');
    }

    setLoading(false);
  };

  const fillDemo = (type) => {
    if (type === 'owner') {
      setCredentials({ username: 'owner', password: 'owner123' });
    } else {
      setCredentials({ username: 'manager', password: 'manager123' });
    }
  };

  return (
    <div className="login-page">
      {/* ===== LEFT PANEL - Branding ===== */}
      <div className="login-left">
        {/* Decorative blobs */}
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />

        <div className="login-brand-wrap">
          <div className="login-brand-icon">
            <FiBox size={32} />
          </div>
          <h1 className="login-brand-title">InvenTrak</h1>
          <p className="login-brand-sub">Inventory Management System</p>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-dot" style={{ background: '#10b981' }} />
              <span>FIFO stock tracking with lot management</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" style={{ background: '#667eea' }} />
              <span>Real-time alerts & notifications</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" style={{ background: '#f59e0b' }} />
              <span>Multi-role access control</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" style={{ background: '#ef4444' }} />
              <span>Category & supplier management</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL - Login Form ===== */}
      <div className="login-right">
        <div className="login-card">

          {/* Header */}
          <div className="login-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">

            {/* Username */}
            <div className="login-input-group">
              <label>Username</label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><FiUser size={18} /></span>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  required
                  autoFocus
                  autoComplete="off"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-input-group">
              <label>Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><FiLock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="login-demo">
            <span className="login-demo-label">Quick login</span>
            <div className="login-demo-btns">
              <button type="button" className="login-demo-btn owner" onClick={() => fillDemo('owner')}>
                Owner
              </button>
              <button type="button" className="login-demo-btn manager" onClick={() => fillDemo('manager')}>
                Manager
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;