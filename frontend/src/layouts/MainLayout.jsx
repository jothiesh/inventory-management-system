import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { alertApi } from '../api/alertApi';
import {
  FiHome,
  FiPackage,
  FiGrid,
  FiBox,
  FiUsers,
  FiTrendingUp,
  FiTrendingDown,
  FiLayers,
  FiBell,
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiX,
  FiUpload,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import './MainLayout.css';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load unread alert count on mount
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Refresh badge when navigating to/from alerts
  useEffect(() => {
    if (location.pathname === '/alerts') {
      // Small delay then reload after user likely read alerts
      const timer = setTimeout(() => loadUnreadCount(), 2000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const loadUnreadCount = async () => {
    try {
      const res = await alertApi.getAll();
      const alerts = res.data.data || [];
      const unread = alerts.filter(a => !a.isRead).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error('Failed to load unread count', e);
    }
  };

  // Nav grouped by section
  const navSections = [
    {
      label: 'Overview',
      items: [
        { path: '/dashboard', icon: <FiHome size={18} />, label: 'Dashboard', roles: ['OWNER', 'STORE_MANAGER'] },
      ]
    },
    {
      label: 'Master Data',
      items: [
        { path: '/categories', icon: <FiGrid size={18} />, label: 'Categories', roles: ['OWNER', 'STORE_MANAGER'] },
        { path: '/products', icon: <FiPackage size={18} />, label: 'Products', roles: ['OWNER', 'STORE_MANAGER'] },
        { path: '/racks', icon: <FiBox size={18} />, label: 'Racks & Boxes', roles: ['OWNER', 'STORE_MANAGER'] },
        { path: '/suppliers', icon: <FiUsers size={18} />, label: 'Suppliers', roles: ['OWNER', 'STORE_MANAGER'] },
      ]
    },
    {
      label: 'Inventory',
      items: [
        { path: '/stock-in', icon: <FiTrendingUp size={18} />, label: 'Stock IN', roles: ['OWNER', 'STORE_MANAGER'] },
        { path: '/stock-out', icon: <FiTrendingDown size={18} />, label: 'Stock OUT', roles: ['OWNER', 'STORE_MANAGER'] },
        { path: '/current-stock', icon: <FiLayers size={18} />, label: 'Current Stock', roles: ['OWNER', 'STORE_MANAGER'] },
      ]
    },
    {
      label: 'Reports & Alerts',
      items: [
        { path: '/alerts', icon: <FiBell size={18} />, label: 'Alerts', roles: ['OWNER'], badge: unreadCount },
        { path: '/reports', icon: <FiBarChart2 size={18} />, label: 'Reports', roles: ['OWNER'] },
        { path: '/excel-import', icon: <FiUpload size={18} />, label: 'Import Excel', roles: ['OWNER', 'STORE_MANAGER'] },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="ml-layout">

      {/* ===== MOBILE OVERLAY ===== */}
      {mobileOpen && (
        <div className="ml-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={`ml-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Logo / Brand */}
        <div className="ml-sidebar-brand">
          <div className="ml-brand-icon">
            <FiBox size={22} />
          </div>
          {sidebarOpen && (
            <div className="ml-brand-text">
              <span className="ml-brand-name">InvenTrak</span>
              <span className="ml-brand-sub">Inventory System</span>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          className="ml-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <FiChevronLeft size={16} /> : <FiChevronRight size={16} />}
        </button>

        {/* Nav Sections */}
        <nav className="ml-nav">
          {navSections.map((section) => {
            // Filter items by role
            const visibleItems = section.items.filter(item => item.roles.includes(user?.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label} className="ml-nav-section">
                {sidebarOpen && (
                  <span className="ml-nav-section-label">{section.label}</span>
                )}
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`ml-nav-item ${isActive ? 'active' : ''}`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <span className={`ml-nav-icon ${isActive ? 'active' : ''}`}>
                        {item.icon}
                      </span>
                      {sidebarOpen && (
                        <>
                          <span className="ml-nav-label">{item.label}</span>
                          {item.badge > 0 && (
                            <span className="ml-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                          )}
                        </>
                      )}
                      {/* Collapsed badge dot */}
                      {!sidebarOpen && item.badge > 0 && (
                        <span className="ml-nav-badge-dot" />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile at bottom */}
        <div className="ml-sidebar-user">
          <div className="ml-user-avatar">
            <span>{user?.fullName?.charAt(0) || 'U'}</span>
          </div>
          {sidebarOpen && (
            <div className="ml-user-info">
              <span className="ml-user-name">{user?.fullName}</span>
              <span className={`ml-user-role ${user?.role === 'OWNER' ? 'owner' : 'manager'}`}>
                {user?.role === 'OWNER' ? 'Owner' : 'Store Manager'}
              </span>
            </div>
          )}
          <button className="ml-logout-btn" onClick={handleLogout} title="Logout">
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className={`ml-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>

        {/* Top Header */}
        <header className="ml-header">
          <div className="ml-header-left">
            {/* Mobile hamburger */}
            <button className="ml-mobile-btn" onClick={() => setMobileOpen(!mobileOpen)}>
              <FiMenu size={22} />
            </button>

            {/* Page title from route */}
            <div className="ml-header-title">
              <h2>{getPageTitle(location.pathname)}</h2>
              <span className="ml-header-breadcrumb">
                {location.pathname !== '/dashboard' && (
                  <>
                    <Link to="/dashboard" className="ml-breadcrumb-link">Dashboard</Link>
                    <span className="ml-breadcrumb-sep">/</span>
                  </>
                )}
                <span>{getPageTitle(location.pathname)}</span>
              </span>
            </div>
          </div>

          <div className="ml-header-right">
            {/* Notification bell */}
            <Link to="/alerts" className="ml-header-bell">
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="ml-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </Link>

            {/* User avatar */}
            <div className="ml-header-avatar">
              <span>{user?.fullName?.charAt(0) || 'U'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="ml-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Helper: route path → readable title
function getPageTitle(pathname) {
  const titles = {
    '/dashboard': 'Dashboard',
    '/categories': 'Categories',
    '/products': 'Products',
    '/racks': 'Racks & Boxes',
    '/suppliers': 'Suppliers',
    '/stock-in': 'Stock IN',
    '/stock-out': 'Stock OUT',
    '/current-stock': 'Current Stock',
    '/alerts': 'Alerts',
    '/reports': 'Reports',
    '/excel-import': 'Import Excel',
  };
  return titles[pathname] || 'Dashboard';
}

export default MainLayout;