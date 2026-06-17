import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  // ===== splash with skippable + safe timing =====
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skuCount, setSkuCount] = useState(1247);
  const [logoError, setLogoError] = useState(false);

  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { from: 'bot', text: "Hi! 👋 I'm the Thinture assistant. How can I help you?" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const chatBodyRef = useRef(null);

  // ===== splash timer with proper cleanup + skip option =====
  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 2000);
    const mountTimer = setTimeout(() => setMounted(true), 2200);
    const removeTimer = setTimeout(() => setSplashVisible(false), 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(mountTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // ===== skip splash on click/key =====
  const skipSplash = () => {
    if (!splashFading) {
      setSplashFading(true);
      setMounted(true);
      setTimeout(() => setSplashVisible(false), 400);
    }
  };

  // ===== redirect happens only after splash finishes =====
  useEffect(() => {
    if (isAuthenticated && !splashVisible) {
      const redirectPath = user?.role === 'QC' ? '/qc/dashboard' : '/dashboard';
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, navigate, splashVisible]);

  // ===== pause SKU counter when tab hidden (saves CPU) =====
  useEffect(() => {
    let interval;
    const startInterval = () => {
      interval = setInterval(() => {
        setSkuCount((prev) => prev + Math.floor(Math.random() * 5) - 2);
      }, 4000);
    };
    const handleVisibility = () => {
      if (document.hidden) clearInterval(interval);
      else startInterval();
    };
    startInterval();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // ===== SECURITY blocks: right-click, DevTools, view-source, save =====
  useEffect(() => {
    const handleContextMenu = (e) => { e.preventDefault(); return false; };
    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) { e.preventDefault(); return false; }
      // Ctrl+Shift+I / J / C  (DevTools, console, inspector)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault(); return false;
      }
      // Ctrl+U (view source) / Ctrl+S (save)
      if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) {
        e.preventDefault(); return false;
      }
    };
    const handleSelectStart = (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault(); return false;
      }
    };
    const handleDragStart = (e) => { e.preventDefault(); return false; };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // ===== ripple with try/catch to prevent crashes =====
  const createRipple = (e) => {
    try {
      const button = e.currentTarget;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'th-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      button.appendChild(ripple);
      setTimeout(() => {
        if (ripple.parentNode) ripple.remove();
      }, 700);
    } catch (err) {
      // silent fail
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatMessages, botTyping]);

  // ===== form submit with username + password =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    createRipple(e);
    if (!username.trim()) {
      toast.error('Please enter your username');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }
    setLoading(true);
    try {
      const result = await login({ username, password });
      if (result?.success) {
        toast.success('Welcome back!');
        const role = result.user?.role || result.data?.role;
        navigate(role === 'QC' ? '/qc/dashboard' : '/dashboard');
      } else {
        toast.error(result?.message || 'Login failed');
      }
    } catch (err) {
      toast.error('Login error: ' + (err?.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const getBotReply = (userMsg) => {
    const msg = userMsg.toLowerCase();
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return 'Hello! How can I assist you with Thinture Inventory today?';
    }
    if (msg.includes('login') || msg.includes('sign in') || msg.includes('password')) {
      return 'Enter your username and password, then click Sign In to access the system.';
    }
    if (msg.includes('feature') || msg.includes('what can')) {
      return 'Thinture offers FIFO tracking, real-time alerts, multi-role access, and smart reports.';
    }
    if (msg.includes('fifo') || msg.includes('stock')) {
      return 'FIFO ensures the oldest stock gets used first — perfect for inventory rotation.';
    }
    if (msg.includes('help') || msg.includes('support')) {
      return 'Please contact your administrator at Thinture Technologies for support.';
    }
    if (msg.includes('thank')) return "You're welcome! 😊";
    if (msg.includes('bye') || msg.includes('goodbye')) return 'Goodbye! Have a great day! 👋';
    return "I can help with login, features, FIFO, or support. What would you like?";
  };

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { from: 'user', text }]);
    setChatInput('');
    setBotTyping(true);
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { from: 'bot', text: getBotReply(text) }]);
      setBotTyping(false);
    }, 800);
  };

  const handleChatKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const quickQuestion = (text) => {
    setChatMessages((prev) => [...prev, { from: 'user', text }]);
    setBotTyping(true);
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { from: 'bot', text: getBotReply(text) }]);
      setBotTyping(false);
    }, 800);
  };

  // ===== logo with fallback for failed loads =====
  const LogoImg = ({ className, alt = '', size }) => (
    <img
      src="/thinlogo.png"
      alt={alt}
      className={className}
      draggable="false"
      onError={() => setLogoError(true)}
      style={size ? { width: size, height: size } : undefined}
    />
  );

  return (
    <>
      {/* ===== SPLASH SCREEN — click anywhere to skip ===== */}
      {splashVisible && (
        <div
          className={`th-splash ${splashFading ? 'fade-out' : ''}`}
          onClick={skipSplash}
          role="button"
          tabIndex={0}
          aria-label="Skip splash"
        >
          <div className="th-splash-bg">
            <div className="th-splash-grid" />
            <div className="th-splash-glow th-splash-glow-1" />
            <div className="th-splash-glow th-splash-glow-2" />
          </div>

          <div className="th-splash-content">
            <div className="th-splash-logo-wrap">
              <div className="th-splash-ring th-splash-ring-1" />
              <div className="th-splash-ring th-splash-ring-2" />

              <div className="th-splash-logo">
                <LogoImg alt="Thinture" />
              </div>
            </div>

            <h1 className="th-splash-title">Thinture Inventory</h1>
            <p className="th-splash-sub">STORE MANAGEMENT SYSTEM</p>

            <div className="th-splash-progress">
              <div className="th-splash-progress-bar" />
            </div>

            <p className="th-splash-skip">Tap anywhere to skip</p>
          </div>
        </div>
      )}

      {/* ===== MAIN LOGIN PAGE ===== */}
      <div className="th-page">
        {/* Background */}
        <div className="th-bg">
          <div className="th-blob th-blob-1" />
          <div className="th-blob th-blob-2" />
          <div className="th-blob th-blob-3" />
          <div className="th-grid" />

          <div className="th-shape th-shape-1" />
          <div className="th-shape th-shape-2" />
          <div className="th-shape th-shape-3" />

          <div className="th-scan-h" />

          <img src="/thinlogo.png" alt="" className="th-travel-logo th-travel-1" draggable="false" />
          <img src="/thinlogo.png" alt="" className="th-travel-logo th-travel-2" draggable="false" />
          <img src="/thinlogo.png" alt="" className="th-travel-logo th-travel-3" draggable="false" />
        </div>

        {/* Top bars */}
        <div className={`th-top-left ${mounted ? 'show' : ''}`}>
          <div className="th-live-dot-wrap">
            <div className="th-live-dot" />
            <div className="th-live-dot-pulse" />
          </div>
          <span>SYSTEM ONLINE</span>
        </div>

        <div className={`th-top-right ${mounted ? 'show' : ''}`}>
          <div className="th-pill-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 7v10l9 5 9-5V7l-9-5-9 5z" strokeLinejoin="round" />
              <path d="M3 7l9 5 9-5M12 22V12" strokeLinejoin="round" />
            </svg>
            <span className="th-sku-count">{skuCount.toLocaleString()}</span>
            <span className="th-sku-label">SKUs</span>
          </div>
          <div className="th-pill-badge">99.9%</div>
        </div>

        {/* Main layout */}
        <div className="th-main-wrap">

          {/* Hero LEFT */}
          <div className={`th-hero ${mounted ? 'show' : ''}`}>
            <div className="th-logo-stage">
              <svg className="th-orbits" viewBox="0 0 400 400">
                <g className="th-orbit-a">
                  <circle cx="200" cy="200" r="160" fill="none" stroke="rgba(29,78,216,0.3)" strokeWidth="1" strokeDasharray="3 6" />
                  <circle cx="200" cy="40" r="5" fill="#1d4ed8" />
                  <circle cx="360" cy="200" r="4" fill="#0ea5e9" />
                </g>
                <g className="th-orbit-b">
                  <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(14,165,233,0.25)" strokeWidth="1" strokeDasharray="2 5" />
                  <circle cx="200" cy="70" r="3.5" fill="#0284c7" />
                </g>
                <g className="th-orbit-c">
                  <circle cx="200" cy="200" r="105" fill="none" stroke="rgba(99,102,241,0.3)" strokeWidth="0.8" />
                  <circle cx="305" cy="200" r="3" fill="#4f46e5" />
                </g>
              </svg>

              <div className="th-pulse th-pulse-1" />
              <div className="th-pulse th-pulse-2" />

              <div className="th-gold-dot" />

              <div className="th-logo-card">
                <LogoImg className="th-logo-main" alt="Thinture" />
              </div>
            </div>

            <h1 className="th-title">Thinture Inventory</h1>
            <div className="th-tagline">STORE MANAGEMENT SYSTEM</div>
          </div>

          {/* Login RIGHT */}
          <div className={`th-card ${mounted ? 'show' : ''}`}>
            <div className="th-secure-badge">
              <div className="th-secure-dot" />
              <span>SECURE LOGIN</span>
            </div>

            <h2 className="th-welcome">Welcome back</h2>
            <p className="th-welcome-sub">Enter your credentials to continue</p>

            <form onSubmit={handleSubmit} className="th-form" autoComplete="off">
              <div className="th-field">
                <label htmlFor="th-user" className="th-label">USERNAME</label>
                <input
                  type="text"
                  id="th-user"
                  className="th-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="off"
                  spellCheck="false"
                  required
                />
              </div>

              <div className="th-field">
                <label htmlFor="th-pass" className="th-label">PASSWORD</label>
                <div className="th-pass-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="th-pass"
                    className="th-input th-input-pass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    spellCheck="false"
                    required
                  />
                  <button
                    type="button"
                    className="th-pass-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="th-submit th-btn-ripple" disabled={loading}>
                {loading ? (
                  <div className="th-loader">
                    <span /><span /><span />
                  </div>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <span className="th-arrow">→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Chatbot */}
        {!splashVisible && (
          <div className={`th-chat-wrap ${mounted ? 'show' : ''}`}>
            {chatOpen && (
              <div className="th-chat-window">
                <div className="th-chat-header">
                  <div className="th-chat-avatar">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm-4 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                  </div>
                  <div className="th-chat-title">
                    <strong>Thinture Assistant</strong>
                    <span><span className="th-chat-online-dot" /> Online · Replies instantly</span>
                  </div>
                  <button
                    className="th-chat-close"
                    onClick={() => setChatOpen(false)}
                    aria-label="Close chat"
                  >×</button>
                </div>

                <div className="th-chat-body" ref={chatBodyRef}>
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`th-chat-msg-row th-chat-msg-row-${m.from}`}>
                      {m.from === 'bot' && (
                        <div className="th-chat-msg-avatar">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm-4 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                          </svg>
                        </div>
                      )}
                      <div className={`th-chat-msg th-chat-msg-${m.from}`}>{m.text}</div>
                    </div>
                  ))}
                  {botTyping && (
                    <div className="th-chat-msg-row th-chat-msg-row-bot">
                      <div className="th-chat-msg-avatar">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm-4 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                        </svg>
                      </div>
                      <div className="th-chat-msg th-chat-msg-bot th-chat-typing">
                        <span /><span /><span />
                      </div>
                    </div>
                  )}
                </div>

                {chatMessages.length <= 2 && !botTyping && (
                  <div className="th-chat-chips">
                    <button className="th-chat-chip" onClick={() => quickQuestion('How do I login?')}>How do I login?</button>
                    <button className="th-chat-chip" onClick={() => quickQuestion('What features?')}>Features</button>
                    <button className="th-chat-chip" onClick={() => quickQuestion('Support')}>Support</button>
                  </div>
                )}

                <div className="th-chat-input-row">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKey}
                    placeholder="Type your message..."
                    className="th-chat-input"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="th-chat-send"
                    aria-label="Send"
                    disabled={!chatInput.trim()}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <button
              className={`th-chat-fab ${chatOpen ? 'open' : ''}`}
              onClick={() => setChatOpen(!chatOpen)}
              aria-label={chatOpen ? 'Close chat' : 'Open chat'}
            >
              {chatOpen ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.06 2 11.06c0 2.65 1.27 5.03 3.31 6.65L4 22l4.55-2.27c1.06.31 2.19.5 3.45.5 5.52 0 10-4.06 10-9.06S17.52 2 12 2z"/>
                  </svg>
                  <span className="th-chat-fab-badge" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;