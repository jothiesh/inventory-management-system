import React, { useState, useEffect } from 'react';
import { alertApi } from '../api/alertApi';
import { toast } from 'react-toastify';
import { 
  FiBell, FiCheck, FiCheckCircle, FiAlertTriangle, 
  FiAlertCircle, FiXCircle, FiTrendingDown, FiDollarSign,
  FiPackage, FiFilter, FiRefreshCw, FiTrash2,
  FiPlus, FiTrendingUp, FiTag  // ✅ ADDED NEW ICONS
} from 'react-icons/fi';
import './Alerts.css';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertApi.getAll();
      setAlerts(response.data.data || []);
      toast.success('Alerts loaded successfully!');
    } catch (error) {
      toast.error('Failed to load alerts');
      console.error('Load alerts error:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await alertApi.markAsRead(alertId);
      toast.success('Alert marked as read');
      
      setAlerts(alerts.map(alert => 
        alert.alertId === alertId 
          ? { ...alert, isRead: true, acknowledgedAt: new Date().toISOString() }
          : alert
      ));
    } catch (error) {
      toast.error('Failed to mark alert as read');
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertApi.markAllAsRead();
      toast.success('All alerts marked as read');
      
      setAlerts(alerts.map(alert => ({
        ...alert,
        isRead: true,
        acknowledgedAt: new Date().toISOString()
      })));
    } catch (error) {
      toast.error('Failed to mark all as read');
      console.error(error);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    
    try {
      await handleMarkAsRead(alertId);
      toast.success('Alert removed');
    } catch (error) {
      toast.error('Failed to delete alert');
      console.error(error);
    }
  };

  // ✅ UPDATED: Added new alert types
  const getAlertIcon = (type) => {
    switch(type) {
      case 'LOW_STOCK': return <FiAlertTriangle />;
      case 'PRICE_CHANGE': return <FiDollarSign />;
      case 'DEAD_STOCK': return <FiXCircle />;
      case 'SLOW_MOVING': return <FiTrendingDown />;
      case 'EXCESS_STOCK': return <FiPackage />;
      case 'NEW_PRODUCT': return <FiPlus />;
      case 'STOCK_ADDED': return <FiTrendingUp />;
      case 'CATEGORY_ADDED': return <FiTag />;
      default: return <FiBell />;
    }
  };

  const getAlertTypeLabel = (type) => {
    return type.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ✅ UPDATED: Added colors for new alert types
  const getAlertTypeColor = (type) => {
    switch(type) {
      case 'LOW_STOCK': return '#f59e0b';
      case 'PRICE_CHANGE': return '#3b82f6';
      case 'DEAD_STOCK': return '#ef4444';
      case 'SLOW_MOVING': return '#f97316';
      case 'EXCESS_STOCK': return '#10b981';
      case 'NEW_PRODUCT': return '#8b5cf6';      // Purple
      case 'STOCK_ADDED': return '#10b981';      // Green
      case 'CATEGORY_ADDED': return '#06b6d4';   // Cyan
      default: return '#6b7280';
    }
  };

  const getSeverityInfo = (severity) => {
    switch(severity) {
      case 'HIGH':
        return { color: '#ef4444', bg: '#fee2e2', label: 'High Priority' };
      case 'MEDIUM':
        return { color: '#f59e0b', bg: '#fef3c7', label: 'Medium Priority' };
      case 'LOW':
        return { color: '#3b82f6', bg: '#dbeafe', label: 'Low Priority' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', label: 'Unknown' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const getFilteredAlerts = () => {
    let filtered = alerts;

    if (filter === 'unread') {
      filtered = filtered.filter(a => !a.isRead);
    } else if (filter === 'read') {
      filtered = filtered.filter(a => a.isRead);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.alertType === typeFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }

    return filtered;
  };

  const filteredAlerts = getFilteredAlerts();

  const stats = {
    total: alerts.length,
    unread: alerts.filter(a => !a.isRead).length,
    read: alerts.filter(a => a.isRead).length,
    high: alerts.filter(a => a.severity === 'HIGH').length,
    medium: alerts.filter(a => a.severity === 'MEDIUM').length,
    low: alerts.filter(a => a.severity === 'LOW').length,
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <div className="page-header-modern">
        <div className="header-content">
          <div className="header-icon warning-gradient">
            <FiBell size={32} />
          </div>
          <div>
            <h1>Alerts & Notifications</h1>
            <p>System alerts and inventory notifications</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={loadAlerts}>
            <FiRefreshCw /> Refresh
          </button>
          {stats.unread > 0 && (
            <button className="btn-mark-all" onClick={handleMarkAllAsRead}>
              <FiCheckCircle /> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card-modern primary">
          <div className="stat-icon-wrapper">
            <FiBell size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Alerts</span>
          </div>
        </div>

        <div className="stat-card-modern warning">
          <div className="stat-icon-wrapper">
            <FiAlertCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.unread}</span>
            <span className="stat-label">Unread</span>
          </div>
        </div>

        <div className="stat-card-modern danger">
          <div className="stat-icon-wrapper">
            <FiAlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.high}</span>
            <span className="stat-label">High Priority</span>
          </div>
        </div>

        <div className="stat-card-modern success">
          <div className="stat-icon-wrapper">
            <FiCheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.read}</span>
            <span className="stat-label">Resolved</span>
          </div>
        </div>
      </div>

      <div className="card-modern">
        <div className="filters-section">
          <div className="filter-group">
            <label className="filter-label">
              <FiFilter size={14} /> Status
            </label>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({stats.total})
              </button>
              <button 
                className={`filter-btn warning ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                <FiAlertCircle size={14} /> Unread ({stats.unread})
              </button>
              <button 
                className={`filter-btn success ${filter === 'read' ? 'active' : ''}`}
                onClick={() => setFilter('read')}
              >
                <FiCheckCircle size={14} /> Read ({stats.read})
              </button>
            </div>
          </div>

          {/* ✅ UPDATED: Added filter buttons for new alert types */}
          <div className="filter-group">
            <label className="filter-label">Alert Type</label>
            <div className="filter-buttons">
              <button 
                className={`filter-btn-small ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-btn-small ${typeFilter === 'LOW_STOCK' ? 'active' : ''}`}
                onClick={() => setTypeFilter('LOW_STOCK')}
              >
                Low Stock
              </button>
              <button 
                className={`filter-btn-small ${typeFilter === 'PRICE_CHANGE' ? 'active' : ''}`}
                onClick={() => setTypeFilter('PRICE_CHANGE')}
              >
                Price Change
              </button>
              <button 
                className={`filter-btn-small ${typeFilter === 'NEW_PRODUCT' ? 'active' : ''}`}
                onClick={() => setTypeFilter('NEW_PRODUCT')}
              >
                New Product
              </button>
              <button 
                className={`filter-btn-small ${typeFilter === 'STOCK_ADDED' ? 'active' : ''}`}
                onClick={() => setTypeFilter('STOCK_ADDED')}
              >
                Stock Added
              </button>
              <button 
                className={`filter-btn-small ${typeFilter === 'CATEGORY_ADDED' ? 'active' : ''}`}
                onClick={() => setTypeFilter('CATEGORY_ADDED')}
              >
                Category Added
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Severity</label>
            <div className="filter-buttons">
              <button 
                className={`filter-btn-small ${severityFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-btn-small danger ${severityFilter === 'HIGH' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('HIGH')}
              >
                High ({stats.high})
              </button>
              <button 
                className={`filter-btn-small warning ${severityFilter === 'MEDIUM' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('MEDIUM')}
              >
                Medium ({stats.medium})
              </button>
              <button 
                className={`filter-btn-small info ${severityFilter === 'LOW' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('LOW')}
              >
                Low ({stats.low})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="alerts-container">
        {filteredAlerts.length === 0 ? (
          <div className="card-modern">
            <div className="empty-state-modern">
              <FiBell size={48} />
              <h3>No Alerts</h3>
              <p>
                {filter === 'unread' 
                  ? "You're all caught up! No unread alerts." 
                  : "No alerts found matching your filters."}
              </p>
            </div>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const severity = getSeverityInfo(alert.severity);
            const typeColor = getAlertTypeColor(alert.alertType);
            
            return (
              <div
                key={alert.alertId}
                className={`alert-card-modern ${!alert.isRead ? 'unread' : ''}`}
                style={{ borderLeftColor: typeColor }}
              >
                <div className="alert-icon-modern" style={{ color: typeColor }}>
                  {getAlertIcon(alert.alertType)}
                </div>

                <div className="alert-content-modern">
                  <div className="alert-header-modern">
                    <div className="alert-meta">
                      <span className="alert-type-badge-modern" style={{ 
                        background: `${typeColor}20`, 
                        color: typeColor 
                      }}>
                        {getAlertTypeLabel(alert.alertType)}
                      </span>
                      <span className="alert-severity-badge" style={{
                        background: severity.bg,
                        color: severity.color
                      }}>
                        {severity.label}
                      </span>
                    </div>
                    <span className="alert-time">{formatDate(alert.createdAt)}</span>
                  </div>

                  <div className="alert-message-modern">
                    {alert.message}
                  </div>

                  {alert.product && (
                    <div className="alert-product-info">
                      <FiPackage size={14} />
                      <span>
                        <strong>{alert.product.partNumber || 'N/A'}</strong>
                        {alert.product.description && ` - ${alert.product.description}`}
                      </span>
                    </div>
                  )}

                  <div className="alert-footer-modern">
                    {alert.isRead ? (
                      <span className="alert-read-status">
                        <FiCheckCircle size={14} />
                        Read {alert.acknowledgedAt && `on ${formatDate(alert.acknowledgedAt)}`}
                      </span>
                    ) : (
                      <div className="alert-actions">
                        <button
                          className="btn-action-small success"
                          onClick={() => handleMarkAsRead(alert.alertId)}
                          title="Mark as read"
                        >
                          <FiCheck size={14} />
                          Mark as Read
                        </button>
                        <button
                          className="btn-action-small danger"
                          onClick={() => handleDeleteAlert(alert.alertId)}
                          title="Delete alert"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {!alert.isRead && <div className="unread-indicator"></div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Alerts;