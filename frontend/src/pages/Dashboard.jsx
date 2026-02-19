import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { stockApi } from '../api/stockApi';
import { alertApi } from '../api/alertApi';
import {
  FiPackage, FiTag, FiBox, FiUsers, FiAlertTriangle, FiBell,
  FiTrendingUp, FiTrendingDown, FiBarChart2, FiPlusCircle,
  FiArrowUpRight, FiArrowDownRight, FiClock, FiCheckCircle,
  FiArrowRight, FiDatabase, FiActivity, FiShoppingCart
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

  // Live stats from API
  const [stats, setStats] = useState({
    totalProducts: 0,
    categories: 0,
    racks: 4,
    suppliers: 0,
    lowStockCount: 0,
    activeAlerts: 0,
    totalStockValue: 0,
    totalLots: 0,
    inStockProducts: 0,
    outOfStockProducts: 0,
  });

  const [recentAlerts, setRecentAlerts] = useState([]);
  const [stockActivity, setStockActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load products
      let products = [];
      try {
        const prodRes = await productApi.getActive();
        products = prodRes.data.data || [];
      } catch (e) { console.error('Products load failed', e); }

      // Load alerts
      let alerts = [];
      try {
        const alertRes = await alertApi.getAll();
        alerts = alertRes.data.data || [];
      } catch (e) { console.error('Alerts load failed', e); }

      // Load stock for each product
      let totalValue = 0;
      let totalLots = 0;
      let inStock = 0;
      let outOfStock = 0;
      let lowStockCount = 0;
      let catMap = {};
      let activityList = [];

      for (const product of products) {
        // Track categories
        const catName = product.category?.categoryName || 'Uncategorized';
        catMap[catName] = (catMap[catName] || 0) + 1;

        try {
          const stockRes = await stockApi.getCurrentStock(product.productId);
          const stockData = stockRes.data.data;
          const totalStock = parseFloat(stockData?.totalStock || 0);
          const lots = stockData?.lots || [];

          totalLots += lots.length;

          if (totalStock > 0) {
            inStock++;
            // Calculate value from lots
            lots.forEach(lot => {
              totalValue += parseFloat(lot.remainingQuantity || 0) * parseFloat(lot.purchasePrice || 0);
            });
          } else {
            outOfStock++;
          }

          // Low stock check
          if (product.minStockLevel && totalStock > 0 && totalStock <= parseFloat(product.minStockLevel)) {
            lowStockCount++;
          }

          // Build activity from lots (recent stock additions)
          lots.slice(0, 2).forEach(lot => {
            if (lot.purchaseDate) {
              activityList.push({
                type: 'IN',
                product: product.partNumber,
                description: product.description,
                quantity: lot.remainingQuantity,
                date: lot.purchaseDate,
                price: lot.purchasePrice,
              });
            }
          });
        } catch (e) {
          outOfStock++;
        }
      }

      // Sort activity by date desc, take top 6
      activityList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setStockActivity(activityList.slice(0, 6));

      // Category breakdown sorted by count desc
      const catArray = Object.entries(catMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setCategoryBreakdown(catArray);

      // Unread alerts count + recent alerts
      const unreadAlerts = alerts.filter(a => !a.isRead);
      setRecentAlerts(alerts.slice(0, 5));

      setStats({
        totalProducts: products.length,
        categories: catArray.length,
        racks: 4,
        suppliers: 0,
        lowStockCount,
        activeAlerts: unreadAlerts.length,
        totalStockValue: totalValue,
        totalLots,
        inStockProducts: inStock,
        outOfStockProducts: outOfStock,
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val.toFixed(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return diffDays + 'd ago';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'LOW_STOCK': return '#f59e0b';
      case 'PRICE_CHANGE': return '#3b82f6';
      case 'DEAD_STOCK': return '#ef4444';
      case 'NEW_PRODUCT': return '#8b5cf6';
      case 'STOCK_ADDED': return '#10b981';
      case 'CATEGORY_ADDED': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK': return <FiAlertTriangle size={16} />;
      case 'STOCK_ADDED': return <FiTrendingUp size={16} />;
      case 'NEW_PRODUCT': return <FiPlusCircle size={16} />;
      case 'CATEGORY_ADDED': return <FiTag size={16} />;
      default: return <FiBell size={16} />;
    }
  };

  // Max value for category bar chart
  const maxCatCount = categoryBreakdown.length > 0 ? Math.max(...categoryBreakdown.map(c => c.count)) : 1;

  const catColors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dash-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* ========== HEADER ========== */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-avatar">
            <span>{user?.fullName?.charAt(0) || 'U'}</span>
          </div>
          <div>
            <h1 className="dash-title">Welcome back, <span className="dash-name">{user?.fullName}</span></h1>
            <p className="dash-subtitle">
              <span className={`dash-role-badge ${user?.role === 'OWNER' ? 'owner' : 'manager'}`}>{user?.role}</span>
              <span className="dash-divider">•</span>
              {user?.email}
              <span className="dash-divider">•</span>
              <FiClock size={13} /> Last login: Today
            </p>
          </div>
        </div>
        <button className="dash-refresh-btn" onClick={loadDashboardData}>
          <FiActivity size={16} /> Refresh
        </button>
      </div>

      {/* ========== TOP STATS ROW ========== */}
      <div className="dash-stats-row">

        <Link to="/products" className="dash-stat-card">
          <div className="dash-stat-icon-wrap" style={{ background: '#eef2ff' }}>
            <FiPackage size={22} style={{ color: '#667eea' }} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-num">{stats.totalProducts}</span>
            <span className="dash-stat-label">Total Products</span>
          </div>
          <FiArrowRight size={18} className="dash-stat-arrow" />
        </Link>

        <Link to="/current-stock" className="dash-stat-card">
          <div className="dash-stat-icon-wrap" style={{ background: '#ecfdf5' }}>
            <FiDatabase size={22} style={{ color: '#10b981' }} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-num">{stats.inStockProducts}</span>
            <span className="dash-stat-label">In Stock</span>
          </div>
          <FiArrowRight size={18} className="dash-stat-arrow" />
        </Link>

        <Link to="/current-stock" className="dash-stat-card out-of-stock-card">
          <div className="dash-stat-icon-wrap" style={{ background: '#fef2f2' }}>
            <FiBox size={22} style={{ color: '#ef4444' }} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-num">{stats.outOfStockProducts}</span>
            <span className="dash-stat-label">Out of Stock</span>
          </div>
          <FiArrowRight size={18} className="dash-stat-arrow" />
        </Link>

        <Link to="/alerts" className="dash-stat-card alerts-card">
          <div className="dash-stat-icon-wrap" style={{ background: '#fffbeb' }}>
            <FiBell size={22} style={{ color: '#f59e0b' }} />
            {stats.activeAlerts > 0 && (
              <span className="dash-stat-badge">{stats.activeAlerts}</span>
            )}
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-num">{stats.activeAlerts}</span>
            <span className="dash-stat-label">Unread Alerts</span>
          </div>
          <FiArrowRight size={18} className="dash-stat-arrow" />
        </Link>
      </div>

      {/* ========== SECONDARY STATS ========== */}
      <div className="dash-secondary-stats">
        <div className="dash-sec-card">
          <div className="dash-sec-icon" style={{ color: '#667eea' }}><FiBarChart2 size={20} /></div>
          <div>
            <span className="dash-sec-val">{formatCurrency(stats.totalStockValue)}</span>
            <span className="dash-sec-label">Total Inventory Value</span>
          </div>
        </div>
        <div className="dash-sec-card">
          <div className="dash-sec-icon" style={{ color: '#10b981' }}><FiShoppingCart size={20} /></div>
          <div>
            <span className="dash-sec-val">{stats.totalLots}</span>
            <span className="dash-sec-label">Active Lots</span>
          </div>
        </div>
        <div className="dash-sec-card">
          <div className="dash-sec-icon" style={{ color: '#f59e0b' }}><FiAlertTriangle size={20} /></div>
          <div>
            <span className="dash-sec-val">{stats.lowStockCount}</span>
            <span className="dash-sec-label">Low Stock Items</span>
          </div>
        </div>
        <div className="dash-sec-card">
          <div className="dash-sec-icon" style={{ color: '#8b5cf6' }}><FiTag size={20} /></div>
          <div>
            <span className="dash-sec-val">{stats.categories}</span>
            <span className="dash-sec-label">Categories</span>
          </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT: 3 COLUMNS ========== */}
      <div className="dash-main-grid">

        {/* --- COLUMN 1: Quick Actions + Category Breakdown --- */}
        <div className="dash-col dash-col-left">

          {/* Quick Actions */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3><FiActivity size={18} /> Quick Actions</h3>
            </div>
            <div className="dash-actions-grid">
              <Link to="/stock-in" className="dash-action">
                <div className="dash-action-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <FiArrowUpRight size={22} />
                </div>
                <span className="dash-action-label">Stock IN</span>
                <span className="dash-action-sub">Add inventory</span>
              </Link>
              <Link to="/stock-out" className="dash-action">
                <div className="dash-action-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <FiArrowDownRight size={22} />
                </div>
                <span className="dash-action-label">Stock OUT</span>
                <span className="dash-action-sub">Issue stock</span>
              </Link>
              <Link to="/products" className="dash-action">
                <div className="dash-action-icon" style={{ background: '#eef2ff', color: '#667eea' }}>
                  <FiPlusCircle size={22} />
                </div>
                <span className="dash-action-label">Add Product</span>
                <span className="dash-action-sub">New item</span>
              </Link>
              <Link to="/current-stock" className="dash-action">
                <div className="dash-action-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <FiBarChart2 size={22} />
                </div>
                <span className="dash-action-label">Stock View</span>
                <span className="dash-action-sub">Check levels</span>
              </Link>
            </div>
          </div>

          {/* Category Breakdown Bar Chart */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3><FiTag size={18} /> Products by Category</h3>
              <Link to="/categories" className="dash-card-link">View all →</Link>
            </div>
            <div className="dash-cat-list">
              {categoryBreakdown.length === 0 ? (
                <p className="dash-empty-text">No categories yet</p>
              ) : (
                categoryBreakdown.map((cat, i) => (
                  <div key={cat.name} className="dash-cat-item">
                    <div className="dash-cat-top">
                      <span className="dash-cat-name">{cat.name}</span>
                      <span className="dash-cat-count">{cat.count}</span>
                    </div>
                    <div className="dash-cat-bar-bg">
                      <div
                        className="dash-cat-bar-fill"
                        style={{
                          width: `${(cat.count / maxCatCount) * 100}%`,
                          background: catColors[i % catColors.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* --- COLUMN 2: Recent Alerts --- */}
        <div className="dash-col dash-col-mid">

          <div className="dash-card dash-card-full">
            <div className="dash-card-header">
              <h3><FiBell size={18} /> Recent Alerts
                {stats.activeAlerts > 0 && (
                  <span className="dash-header-badge">{stats.activeAlerts} new</span>
                )}
              </h3>
              <Link to="/alerts" className="dash-card-link">View all →</Link>
            </div>
            <div className="dash-alerts-list">
              {recentAlerts.length === 0 ? (
                <div className="dash-empty-state">
                  <FiCheckCircle size={36} style={{ color: '#10b981' }} />
                  <p>No alerts at the moment</p>
                </div>
              ) : (
                recentAlerts.map((alert) => {
                  const color = getAlertColor(alert.alertType);
                  return (
                    <div key={alert.alertId} className={`dash-alert-item ${!alert.isRead ? 'unread' : ''}`}>
                      <div className="dash-alert-icon" style={{ background: `${color}15`, color }}>
                        {getAlertIcon(alert.alertType)}
                      </div>
                      <div className="dash-alert-body">
                        <p className="dash-alert-msg">{alert.message}</p>
                        <div className="dash-alert-meta">
                          <span className="dash-alert-type" style={{ color }}>{alert.alertType.replace(/_/g, ' ')}</span>
                          <span>•</span>
                          <span>{formatDate(alert.createdAt)}</span>
                          {!alert.isRead && <span className="dash-alert-dot" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* --- COLUMN 3: Stock Activity Feed --- */}
        <div className="dash-col dash-col-right">

          <div className="dash-card dash-card-full">
            <div className="dash-card-header">
              <h3><FiTrendingUp size={18} /> Stock Activity</h3>
              <Link to="/current-stock" className="dash-card-link">View all →</Link>
            </div>
            <div className="dash-activity-list">
              {stockActivity.length === 0 ? (
                <div className="dash-empty-state">
                  <FiDatabase size={36} style={{ color: '#667eea' }} />
                  <p>No stock activity yet</p>
                </div>
              ) : (
                stockActivity.map((item, i) => (
                  <div key={i} className="dash-activity-item">
                    <div className="dash-activity-icon-wrap">
                      <div className="dash-activity-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                        <FiArrowUpRight size={14} />
                      </div>
                      {i < stockActivity.length - 1 && <div className="dash-activity-line" />}
                    </div>
                    <div className="dash-activity-body">
                      <p className="dash-activity-title">
                        <span className="dash-activity-badge">Stock IN</span>
                        {item.product}
                      </p>
                      <p className="dash-activity-desc">{item.description}</p>
                      <div className="dash-activity-details">
                        <span className="dash-activity-qty">+{parseFloat(item.quantity || 0).toFixed(0)} units</span>
                        <span className="dash-activity-price">₹{parseFloat(item.price || 0).toFixed(2)}/unit</span>
                        <span className="dash-activity-date">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;