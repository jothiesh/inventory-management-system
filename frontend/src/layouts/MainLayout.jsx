import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { alertApi } from '../api/alertApi';
import {
  FiHome, FiPackage, FiGrid, FiBox, FiUsers,
  FiTrendingUp, FiTrendingDown, FiLayers, FiBell,
  FiBarChart2, FiLogOut, FiMenu, FiUpload,
  FiChevronLeft, FiChevronRight, FiClipboard,
  FiCheckSquare, FiAward, FiActivity,
  FiCheckCircle, FiXCircle, FiClock,
  FiFileText, FiSend,
} from 'react-icons/fi';
import './MainLayout.css';

const hexToRgba = (hex, alpha) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Roles from InitController: OWNER / STORE_MANAGER / QC
const ROLES = {
  OWNER:         'OWNER',
  STORE_MANAGER: 'STORE_MANAGER',
  QC:            'QC',
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [qcUnreadCount, setQcUnreadCount] = useState(0);
  const [mobileOpen,    setMobileOpen]    = useState(false);

  const role = user?.role || '';

  // General alert count (OWNER only)
  useEffect(() => {
    if (role === ROLES.OWNER) loadUnreadCount();
  }, [user]);

  // QC alert badge (QC + OWNER + STORE_MANAGER)
  useEffect(() => {
    if (![ROLES.QC, ROLES.OWNER, ROLES.STORE_MANAGER].includes(role)) return;
    const load = async () => {
      try {
        const { qcApi } = await import('../api/qcApi');
        const res = await qcApi.getUnreadAlertsCount();
        setQcUnreadCount(res.data?.data?.count || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (location.pathname === '/alerts' && role === ROLES.OWNER) {
      const t = setTimeout(() => loadUnreadCount(), 2000);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  const loadUnreadCount = async () => {
    try {
      const res = await alertApi.getAll();
      setUnreadCount((res.data.data || []).filter(a => !a.isRead).length);
    } catch {}
  };

  // NAV SECTIONS
  // roles: which of [OWNER, STORE_MANAGER, QC] can see this item
  const navSections = [

    // Overview
    {
      label: 'Overview',
      items: [
        {
          path: '/dashboard', label: 'Dashboard',
          icon: <FiHome size={18}/>, color: '#667eea',
          roles: [ROLES.OWNER, ROLES.STORE_MANAGER],
        },
      ],
    },

    // Master Data
    {
      label: 'Master Data',
      items: [
        { path: '/categories', label: 'Categories',    icon: <FiGrid size={18}/>,    color: '#8b5cf6', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
        { path: '/products',   label: 'Products',      icon: <FiPackage size={18}/>, color: '#6366f1', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
        { path: '/racks',      label: 'Racks & Boxes', icon: <FiBox size={18}/>,     color: '#0ea5e9', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
        { path: '/suppliers',  label: 'Suppliers',     icon: <FiUsers size={18}/>,   color: '#14b8a6', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
      ],
    },

    // Procurement
    {
      label: 'Procurement',
      items: [
        {
          path: '/purchase-requests', label: 'Purchase Requests',
          icon: <FiClipboard size={18}/>, color: '#f59e0b',
          roles: [ROLES.OWNER, ROLES.STORE_MANAGER],
        },
      ],
    },

    // Inventory
    {
      label: 'Inventory',
      items: [
        { path: '/stock-in',          label: 'Stock IN',          icon: <FiTrendingUp size={18}/>,   color: '#10b981', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
        { path: '/stock-out',         label: 'Stock OUT',         icon: <FiTrendingDown size={18}/>, color: '#ef4444', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
        { path: '/stock-out/history', label: 'Stock OUT History', icon: <FiClock size={18}/>,        color: '#f97316', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
        { path: '/invoices',          label: 'Invoices',          icon: <FiFileText size={18}/>,     color: '#f59e0b', roles: [ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC] },
        { path: '/delivery-challan',  label: 'Delivery Challan',  icon: <FiFileText size={18}/>,     color: '#06b6d4', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
        { path: '/current-stock',     label: 'Current Stock',     icon: <FiLayers size={18}/>,       color: '#3b82f6', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
      ],
    },

    // Reports & Alerts
    {
      label: 'Reports & Alerts',
      items: [
        { path: '/alerts',       label: 'Alerts',       icon: <FiBell size={18}/>,      color: '#ef4444', roles: [ROLES.OWNER],             badge: unreadCount },
        { path: '/reports',      label: 'Reports',      icon: <FiBarChart2 size={18}/>, color: '#8b5cf6', roles: [ROLES.OWNER] },
        { path: '/excel-import', label: 'Import Excel', icon: <FiUpload size={18}/>,    color: '#22c55e', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
      ],
    },

    // QC Overview
    {
      label: 'QC Overview',
      items: [
        { path: '/qc/dashboard', label: 'QC Dashboard', icon: <FiBarChart2 size={18}/>, color: '#0ea5e9', roles: [ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC] },
        { path: '/qc/alerts',    label: 'QC Alerts',    icon: <FiBell size={18}/>,      color: '#f59e0b', roles: [ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC], badge: qcUnreadCount },
      ],
    },

    // Inspection
    {
      label: 'Inspection',
      items: [
        { path: '/qc/queue',   label: 'QC Queue',           icon: <FiCheckSquare size={18}/>, color: '#6366f1', roles: [ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC] },
        { path: '/qc/history', label: 'Inspection History', icon: <FiActivity size={18}/>,    color: '#64748b', roles: [ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC] },
      ],
    },

    // QC Results
    {
      label: 'QC Results',
      items: [
        { path: '/qc/approved', label: 'Approved', icon: <FiCheckCircle size={18}/>, color: '#10b981', roles: [ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC] },
        { path: '/qc/rejected', label: 'Rejected', icon: <FiXCircle size={18}/>,     color: '#ef4444', roles: [ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC] },
        { path: '/qc/return-challans', label: 'Return Challans', icon: <FiSend size={18}/>, color: '#dc2626', roles: [ROLES.OWNER, ROLES.STORE_MANAGER] },
      ],
    },

    // QC Tools
    {
      label: 'QC Tools',
      items: [
        { path: '/qc/templates', label: 'Templates', icon: <FiAward size={18}/>, color: '#a855f7', roles: [ROLES.OWNER, ROLES.QC] },
      ],
    },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="ml-layout">
      {mobileOpen && <div className="ml-overlay" onClick={() => setMobileOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={`ml-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Brand */}
        <div className="ml-sidebar-brand">
          <div className="ml-brand-logo">
            <img src="/thinlogo.png" alt="Thinture" className="ml-logo-img"/>
          </div>
          {sidebarOpen && (
            <div className="ml-brand-text">
              <span className="ml-brand-name">Thinture</span>
              <span className="ml-brand-sub">Inventory System</span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <button className="ml-sidebar-toggle"
          onClick={() => setSidebarOpen(s => !s)}
          title={sidebarOpen ? 'Collapse' : 'Expand'}>
          {sidebarOpen ? <FiChevronLeft size={16}/> : <FiChevronRight size={16}/>}
        </button>

        {/* Nav */}
        <nav className="ml-nav">
          {navSections.map(section => {
            const visible = section.items.filter(item => item.roles.includes(role));
            if (visible.length === 0) return null;

            return (
              <div key={section.label} className="ml-nav-section">
                {sidebarOpen && (
                  <span className="ml-nav-section-label">{section.label}</span>
                )}
                {visible.map(item => {
                  const isActive = location.pathname === item.path
                    || location.pathname.startsWith(item.path + '/');
                  const iconStyle = {
                    color: item.color,
                    background: isActive
                      ? hexToRgba(item.color, 0.16)
                      : hexToRgba(item.color, 0.10),
                  };
                  return (
                    <Link key={item.path} to={item.path}
                      className={`ml-nav-item ${isActive ? 'active' : ''}`}
                      title={!sidebarOpen ? item.label : undefined}
                      style={isActive ? {
                        background: hexToRgba(item.color, 0.10),
                        color: item.color,
                      } : undefined}>
                      <span className="ml-nav-icon" style={iconStyle}>
                        {item.icon}
                      </span>
                      {sidebarOpen && (
                        <>
                          <span className="ml-nav-label">{item.label}</span>
                          {item.badge > 0 && (
                            <span className="ml-nav-badge">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {!sidebarOpen && item.badge > 0 && (
                        <span className="ml-nav-badge-dot" style={{ background: item.color }}/>
                      )}
                      {isActive && (
                        <span className="ml-nav-active-bar" style={{ background: item.color }}/>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="ml-sidebar-user">
          <div className="ml-user-avatar">
            <span>{user?.fullName?.charAt(0) || 'U'}</span>
          </div>
          {sidebarOpen && (
            <div className="ml-user-info">
              <span className="ml-user-name">{user?.fullName}</span>
              <span className={`ml-user-role ${
                role === ROLES.OWNER ? 'owner' :
                role === ROLES.QC    ? 'qc'    : 'manager'
              }`}>
                {role === ROLES.OWNER ? 'Owner' :
                 role === ROLES.QC    ? 'QC Inspector' : 'Store Manager'}
              </span>
            </div>
          )}
          <button className="ml-logout-btn" onClick={handleLogout} title="Logout">
            <FiLogOut size={18}/>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className={`ml-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>

        {/* Header */}
        <header className="ml-header">
          <div className="ml-header-left">
            <button className="ml-mobile-btn" onClick={() => setMobileOpen(o => !o)}>
              <FiMenu size={22}/>
            </button>
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
            {/* General alerts bell — OWNER only */}
            {role === ROLES.OWNER && (
              <Link to="/alerts" className="ml-header-bell">
                <FiBell size={20}/>
                {unreadCount > 0 && (
                  <span className="ml-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            )}

            {/* QC alerts bell — all 3 roles */}
            {[ROLES.OWNER, ROLES.STORE_MANAGER, ROLES.QC].includes(role) && (
              <Link to="/qc/alerts" className="ml-header-bell">
                <FiBell size={20} style={{ color: role === ROLES.QC ? '#4f46e5' : undefined }}/>
                {qcUnreadCount > 0 && (
                  <span className="ml-bell-badge">{qcUnreadCount > 99 ? '99+' : qcUnreadCount}</span>
                )}
              </Link>
            )}

            <div className="ml-header-avatar">
              <span>{user?.fullName?.charAt(0) || 'U'}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="ml-page">
          <Outlet/>
        </main>
      </div>
    </div>
  );
};

// Page titles
function getPageTitle(pathname) {
  const titles = {
    '/dashboard':             'Dashboard',
    '/categories':            'Categories',
    '/products':              'Products',
    '/racks':                 'Racks & Boxes',
    '/suppliers':             'Suppliers',
    '/purchase-requests':     'Purchase Requests',
    '/purchase-requests/new': 'New Purchase Request',
    '/purchase-orders':       'Purchase Orders',
    '/purchase-orders/new':   'New Purchase Order',
    '/stock-in':              'Stock IN',
    '/stock-out':             'Stock OUT',
    '/stock-out/history':     'Stock OUT History',
    '/invoices':              'Purchase Invoices',
    '/current-stock':         'Current Stock',
    '/delivery-challan':      'Delivery Challan',
    '/alerts':                'Alerts',
    '/reports':               'Reports',
    '/excel-import':          'Import Excel',
    '/qc/dashboard':          'QC Dashboard',
    '/qc/queue':              'QC Inspection Queue',
    '/qc/templates':          'QC Checklist Templates',
    '/qc/approved':           'Approved Inspections',
    '/qc/rejected':           'Rejected Inspections',
    '/qc/history':            'Inspection History',
    '/qc/alerts':             'QC Alerts',
    '/qc/return-challans':    'Return Challans',
  };

  if (pathname.startsWith('/qc/batches/'))              return 'QC Batch Inspection';
  if (pathname.startsWith('/qc/return-challans/') &&
      pathname !== '/qc/return-challans')               return 'Return Challan Detail';
  if (pathname.startsWith('/purchase-requests/') &&
      pathname !== '/purchase-requests/new')            return 'Purchase Request Details';
  if (pathname.startsWith('/purchase-orders/') &&
      pathname !== '/purchase-orders/new')              return 'Purchase Order Details';
  if (pathname.startsWith('/suppliers/'))               return 'Supplier Details';

  return titles[pathname] || 'Dashboard';
}

export default MainLayout;