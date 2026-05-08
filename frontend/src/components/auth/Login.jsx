import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  // Trigger mount animations
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.username.trim() || !credentials.password.trim()) {
      toast.error('Please enter username and password');
      return;
    }
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
    <div className="lp">
      {/* ===== LEFT — IMMERSIVE VISUAL ===== */}
      <div className="lp-visual">
        <canvas ref={canvasRef} className="lp-canvas" />

        <div className="lp-visual-overlay" />

        <div className={`lp-visual-content ${mounted ? 'show' : ''}`}>
          {/* Logo */}
          <div className="lp-logo" style={{ animationDelay: '0.1s' }}>
            <img src="/thinlogo.png" alt="Thinture" />
          </div>

          <h1 className="lp-hero" style={{ animationDelay: '0.25s' }}>
            Thinture Inventory<br />
            <span className="lp-hero-accent">Management.</span>
          </h1>

          <p className="lp-hero-sub" style={{ animationDelay: '0.4s' }}>
            Track, manage, and optimize your store operations with precision and ease.
          </p>

          {/* Feature pills */}
          <div className="lp-pills" style={{ animationDelay: '0.55s' }}>
            <div className="lp-pill">
              <span className="lp-pill-dot" style={{ background: '#34d399' }} />
              FIFO Tracking
            </div>
            <div className="lp-pill">
              <span className="lp-pill-dot" style={{ background: '#818cf8' }} />
              Real-time Alerts
            </div>
            <div className="lp-pill">
              <span className="lp-pill-dot" style={{ background: '#fb923c' }} />
              Multi-role Access
            </div>
            <div className="lp-pill">
              <span className="lp-pill-dot" style={{ background: '#f472b6' }} />
              Smart Reports
            </div>
          </div>

          {/* Metrics */}
          <div className="lp-metrics" style={{ animationDelay: '0.7s' }}>
            <div className="lp-metric">
              <span className="lp-metric-value">99.9%</span>
              <span className="lp-metric-label">Uptime</span>
            </div>
            <div className="lp-metric-sep" />
            <div className="lp-metric">
              <span className="lp-metric-value">&lt;1s</span>
              <span className="lp-metric-label">Response</span>
            </div>
            <div className="lp-metric-sep" />
            <div className="lp-metric">
              <span className="lp-metric-value">FIFO</span>
              <span className="lp-metric-label">Lot Based</span>
            </div>
          </div>
        </div>

        <div className="lp-visual-footer">
          &copy; {new Date().getFullYear()} Thinture Technologies Pvt Ltd. All rights reserved.
        </div>
      </div>

      {/* ===== RIGHT — LOGIN ===== */}
      <div className="lp-form-side">
        <div className={`lp-form-wrap ${mounted ? 'show' : ''}`}>
          {/* Mobile brand */}
          <div className="lp-m-brand" style={{ animationDelay: '0.1s' }}>
            <img src="/thinlogo.png" alt="Thinture" />
            <span>Thinture</span>
          </div>

          {/* Header */}
          <div className="lp-header" style={{ animationDelay: '0.15s' }}>
            <span className="lp-header-tag">Welcome back</span>
            <h2>Sign in to your account</h2>
            <p>Enter your credentials to access the dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lp-form" autoComplete="off">
            {/* Username — floating label */}
            <div className={`lp-field ${credentials.username ? 'has-value' : ''}`} style={{ animationDelay: '0.25s' }}>
              <input
                type="text"
                id="lp-user"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                required
                autoComplete="off"
                spellCheck="false"
                placeholder=" "
              />
              <label htmlFor="lp-user">Username</label>
              <div className="lp-field-bar" />
            </div>

            {/* Password — floating label */}
            <div className={`lp-field ${credentials.password ? 'has-value' : ''}`} style={{ animationDelay: '0.35s' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="lp-pass"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
                autoComplete="new-password"
                placeholder=" "
              />
              <label htmlFor="lp-pass">Password</label>
              <div className="lp-field-bar" />
              <button
                type="button"
                className="lp-pw-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="lp-submit"
              disabled={loading}
              style={{ animationDelay: '0.45s' }}
            >
              {loading ? (
                <div className="lp-loader">
                  <span /><span /><span />
                </div>
              ) : (
                <>
                  Sign In
                  <span className="lp-submit-arrow">&#8594;</span>
                </>
              )}
            </button>
          </form>

          {/* Demo */}
          <div className="lp-demo" style={{ animationDelay: '0.55s' }}>
            <div className="lp-demo-line">
              <span>Demo Access</span>
            </div>
            <div className="lp-demo-cards">
              <button type="button" className="lp-demo-card lp-demo-owner" onClick={() => fillDemo('owner')}>
                <div className="lp-demo-avatar">
                  <span>O</span>
                  <div className="lp-demo-pulse" />
                </div>
                <div className="lp-demo-info">
                  <strong>Owner</strong>
                  <span>Full access to all features</span>
                </div>
                <span className="lp-demo-arrow">&#8594;</span>
              </button>
              <button type="button" className="lp-demo-card lp-demo-mgr" onClick={() => fillDemo('manager')}>
                <div className="lp-demo-avatar">
                  <span>M</span>
                  <div className="lp-demo-pulse" />
                </div>
                <div className="lp-demo-info">
                  <strong>Manager</strong>
                  <span>Store management access</span>
                </div>
                <span className="lp-demo-arrow">&#8594;</span>
              </button>
            </div>
          </div>

          <div className="lp-footer-text">
            Thinture Inventory Management System v1.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;