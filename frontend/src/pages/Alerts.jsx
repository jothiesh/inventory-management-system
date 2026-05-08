import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { alertApi } from '../api/alertApi';
import { toast } from 'react-toastify';
import {
  FiBell, FiCheck, FiCheckCircle, FiAlertTriangle, FiAlertCircle,
  FiXCircle, FiTrendingDown, FiDollarSign, FiPackage, FiFilter,
  FiRefreshCw, FiTrash2, FiPlus, FiTrendingUp, FiTag, FiSearch,
  FiX, FiClock, FiInbox, FiZap
} from 'react-icons/fi';
import './Alerts.css';

// ─── alert type config (single source of truth) ─────────────

const ALERT_TYPE_CONFIG = {
  LOW_STOCK:      { label: 'Low Stock',      icon: FiAlertTriangle, color: '#f59e0b', bg: '#fef3c7', deep: '#92400e' },
  PRICE_CHANGE:   { label: 'Price Change',   icon: FiDollarSign,    color: '#3b82f6', bg: '#dbeafe', deep: '#1e40af' },
  DEAD_STOCK:     { label: 'Dead Stock',     icon: FiXCircle,       color: '#ef4444', bg: '#fee2e2', deep: '#991b1b' },
  SLOW_MOVING:    { label: 'Slow Moving',    icon: FiTrendingDown,  color: '#f97316', bg: '#ffedd5', deep: '#9a3412' },
  EXCESS_STOCK:   { label: 'Excess Stock',   icon: FiPackage,       color: '#10b981', bg: '#d1fae5', deep: '#065f46' },
  NEW_PRODUCT:    { label: 'New Product',    icon: FiPlus,          color: '#8b5cf6', bg: '#ede9fe', deep: '#5b21b6' },
  STOCK_ADDED:    { label: 'Stock Added',    icon: FiTrendingUp,    color: '#10b981', bg: '#d1fae5', deep: '#065f46' },
  CATEGORY_ADDED: { label: 'Category Added', icon: FiTag,           color: '#06b6d4', bg: '#cffafe', deep: '#155e75' },
};

const SEVERITY_CONFIG = {
  HIGH:   { color: '#dc2626', bg: '#fee2e2', label: 'High' },
  MEDIUM: { color: '#d97706', bg: '#fef3c7', label: 'Medium' },
  LOW:    { color: '#0284c7', bg: '#e0f2fe', label: 'Low' },
};

const getTypeConfig = (type) =>
  ALERT_TYPE_CONFIG[type] || { label: type, icon: FiBell, color: '#6b7280', bg: '#f3f4f6', deep: '#374151' };

const getSeverityConfig = (sev) =>
  SEVERITY_CONFIG[sev] || { color: '#6b7280', bg: '#f3f4f6', label: 'Unknown' };

// ─── helpers ────────────────────────────────────────────────

const formatRelativeTime = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7)   return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const groupByDate = (alerts) => {
  const groups = { today: [], yesterday: [], thisWeek: [], earlier: [] };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 7);

  alerts.forEach(a => {
    const d = new Date(a.createdAt);
    if (d >= startOfToday)        groups.today.push(a);
    else if (d >= startOfYesterday) groups.yesterday.push(a);
    else if (d >= startOfWeek)    groups.thisWeek.push(a);
    else                          groups.earlier.push(a);
  });
  return groups;
};

// ─── sub-components ─────────────────────────────────────────

const LoadingState = () => (
  <div className="al-loading">
    <div className="al-loading-stack">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="al-loading-card" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
    <p>Loading alerts…</p>
  </div>
);

const StatCard = ({ icon: Icon, value, label, variant, active, onClick }) => (
  <button
    className={`al-stat al-stat-${variant} ${active ? 'al-stat-active' : ''}`}
    onClick={onClick}
    type="button"
  >
    <div className="al-stat-icon"><Icon size={20} /></div>
    <div className="al-stat-body">
      <span className="al-stat-val">{value}</span>
      <span className="al-stat-lbl">{label}</span>
    </div>
    <div className="al-stat-glow" />
  </button>
);

const FilterPill = ({ active, onClick, children, variant = '', count }) => (
  <button
    className={`al-pill ${active ? 'al-pill-active' : ''} ${variant ? `al-pill-${variant}` : ''}`}
    onClick={onClick}
    type="button"
  >
    {children}
    {count !== undefined && <span className="al-pill-count">{count}</span>}
  </button>
);



const AlertCard = ({ alert, onMarkRead, onDelete, animDelay }) => {
  const type = getTypeConfig(alert.alertType);
  const severity = getSeverityConfig(alert.severity);
  const TypeIcon = type.icon;

  return (
    <div
      className={`al-card ${!alert.isRead ? 'al-card-unread' : ''}`}
      style={{
        '--type-color': type.color,
        '--type-bg': type.bg,
        animationDelay: `${animDelay}s`,
      }}
    >
      <div className="al-card-strip" style={{ background: type.color }} />

      <div className="al-card-icon" style={{ background: type.bg, color: type.color }}>
        <TypeIcon size={20} />
        {!alert.isRead && <div className="al-card-icon-pulse" style={{ background: type.color }} />}
      </div>

      <div className="al-card-body">
        <div className="al-card-top">
          <div className="al-card-meta">
            <span className="al-type-badge" style={{ background: type.bg, color: type.deep }}>
              {type.label}
            </span>
            <span className="al-severity-badge" style={{ background: severity.bg, color: severity.color }}>
              {severity.label} priority
            </span>
            {!alert.isRead && <span className="al-new-dot">NEW</span>}
          </div>
          <span className="al-time" title={new Date(alert.createdAt).toLocaleString()}>
            <FiClock size={11} /> {formatRelativeTime(alert.createdAt)}
          </span>
        </div>

        <p className="al-message">{alert.message}</p>

        {alert.product && (
          <div className="al-product">
            <FiPackage size={12} />
            <span>
              <strong>{alert.product.partNumber || 'N/A'}</strong>
              {alert.product.description && <> — {alert.product.description}</>}
            </span>
          </div>
        )}

        <div className="al-card-footer">
          {alert.isRead ? (
            <span className="al-read-status">
              <FiCheckCircle size={13} />
              Read{alert.acknowledgedAt && ` · ${formatRelativeTime(alert.acknowledgedAt)}`}
            </span>
          ) : (
            <div className="al-actions">
              <button
                className="al-btn al-btn-success"
                onClick={() => onMarkRead(alert.alertId)}
              >
                <FiCheck size={13} /> Mark as Read
              </button>
              <button
                className="al-btn al-btn-ghost"
                onClick={() => onDelete(alert.alertId)}
                title="Dismiss"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ filter, onReset }) => (
  <div className="al-empty">
    <div className="al-empty-icon">
      {filter === 'unread' ? <FiCheckCircle size={36} /> : <FiInbox size={36} />}
    </div>
    <h3>{filter === 'unread' ? "You're all caught up!" : 'No alerts found'}</h3>
    <p>
      {filter === 'unread'
        ? 'No unread alerts at the moment. Take a break — everything is under control.'
        : 'Try adjusting your filters to see more results.'}
    </p>
    {filter !== 'unread' && (
      <button className="al-btn al-btn-primary" onClick={onReset}>
        <FiX size={13} /> Reset filters
      </button>
    )}
  </div>
);

// ─── main component ─────────────────────────────────────────

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all'); // all | unread | read
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── data loading ───────────────────────────────────────

  const loadAlerts = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const response = await alertApi.getAll();
      setAlerts(response.data?.data || []);
      if (silent) toast.success('Alerts refreshed', { autoClose: 1200 });
    } catch {
      toast.error('Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  // ─── handlers ───────────────────────────────────────────

  const handleMarkAsRead = async (alertId) => {
    // Optimistic update
    setAlerts(prev => prev.map(a =>
      a.alertId === alertId
        ? { ...a, isRead: true, acknowledgedAt: new Date().toISOString() }
        : a
    ));
    try {
      await alertApi.markAsRead(alertId);
      toast.success('Marked as read', { autoClose: 1200 });
    } catch {
      toast.error('Failed to mark as read');
      loadAlerts(true); // revert by reloading
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = alerts.filter(a => !a.isRead).map(a => a.alertId);
    if (unreadIds.length === 0) return;

    setAlerts(prev => prev.map(a => a.isRead ? a : {
      ...a, isRead: true, acknowledgedAt: new Date().toISOString()
    }));
    try {
      await alertApi.markAllAsRead();
      toast.success(`${unreadIds.length} alerts marked as read`);
    } catch {
      toast.error('Failed to mark all as read');
      loadAlerts(true);
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('Dismiss this alert?')) return;
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
    try {
      // Backend doesn't have a delete endpoint; mark as read instead
      await alertApi.markAsRead(alertId);
      toast.success('Alert dismissed');
    } catch {
      toast.error('Failed to dismiss alert');
      loadAlerts(true);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSeverityFilter('all');
    setSearchQuery('');
  };

  // ─── derived data ───────────────────────────────────────

  const stats = useMemo(() => ({
    total:  alerts.length,
    unread: alerts.filter(a => !a.isRead).length,
    read:   alerts.filter(a => a.isRead).length,
    high:   alerts.filter(a => a.severity === 'HIGH').length,
    medium: alerts.filter(a => a.severity === 'MEDIUM').length,
    low:    alerts.filter(a => a.severity === 'LOW').length,
  }), [alerts]);

  const availableTypes = useMemo(() => {
    const set = new Set(alerts.map(a => a.alertType));
    return Array.from(set);
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let list = alerts;

    if (statusFilter === 'unread')   list = list.filter(a => !a.isRead);
    else if (statusFilter === 'read') list = list.filter(a => a.isRead);

    if (typeFilter !== 'all')     list = list.filter(a => a.alertType === typeFilter);
    if (severityFilter !== 'all') list = list.filter(a => a.severity === severityFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.message || '').toLowerCase().includes(q) ||
        (a.product?.partNumber || '').toLowerCase().includes(q) ||
        (a.product?.description || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts, statusFilter, typeFilter, severityFilter, searchQuery]);

  const grouped = useMemo(() => groupByDate(filteredAlerts), [filteredAlerts]);

  const hasActiveFilters =
    statusFilter !== 'all' || typeFilter !== 'all' || severityFilter !== 'all' || searchQuery !== '';

  if (loading) return <LoadingState />;

  return (
    <div className="al-page">
      {/* ── HEADER ── */}
      <div className="al-header">
        <div className="al-header-left">
          <div className="al-header-icon">
            <FiBell size={22} />
            {stats.unread > 0 && <span className="al-header-badge">{stats.unread}</span>}
          </div>
          <div>
            <h1 className="al-title">Alerts & Notifications</h1>
            <p className="al-subtitle">
              {stats.unread > 0
                ? <>You have <strong>{stats.unread}</strong> unread alert{stats.unread !== 1 ? 's' : ''}</>
                : 'All caught up · System running smoothly'}
            </p>
          </div>
        </div>
        <div className="al-header-actions">
          <button
            className="al-btn al-btn-ghost"
            onClick={() => loadAlerts(true)}
            disabled={refreshing}
          >
            <FiRefreshCw size={13} className={refreshing ? 'al-spin' : ''} />
            Refresh
          </button>
          {stats.unread > 0 && (
            <button className="al-btn al-btn-primary" onClick={handleMarkAllAsRead}>
              <FiCheckCircle size={13} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="al-stats-row">
        <StatCard
          icon={FiBell} value={stats.total} label="Total Alerts"
          variant="primary" active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard
          icon={FiZap} value={stats.unread} label="Unread"
          variant="warning" active={statusFilter === 'unread'}
          onClick={() => setStatusFilter('unread')}
        />
        <StatCard
          icon={FiAlertTriangle} value={stats.high} label="High Priority"
          variant="danger" active={severityFilter === 'HIGH'}
          onClick={() => setSeverityFilter(severityFilter === 'HIGH' ? 'all' : 'HIGH')}
        />
        <StatCard
          icon={FiCheckCircle} value={stats.read} label="Resolved"
          variant="success" active={statusFilter === 'read'}
          onClick={() => setStatusFilter('read')}
        />
      </div>

      {/* ── FILTER CARD ── */}
      <div className="al-filter-card">
        <div className="al-search-bar">
          <FiSearch size={15} className="al-search-icon" />
          <input
            type="text" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts by message, part number, or description…"
            className="al-search-input"
          />
          {searchQuery && (
            <button className="al-search-clear" onClick={() => setSearchQuery('')}>
              <FiX size={13} />
            </button>
          )}
        </div>

        <div className="al-filter-section">
          <div className="al-filter-label"><FiFilter size={12} /> Type</div>
          <div className="al-pills-row">
            <FilterPill
              active={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
              count={alerts.length}
            >
              All Types
            </FilterPill>
            {availableTypes.map(t => {
              const c = getTypeConfig(t);
              const Icon = c.icon;
              const count = alerts.filter(a => a.alertType === t).length;
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  className={`al-pill ${active ? 'al-pill-active-typed' : ''}`}
                  onClick={() => setTypeFilter(t)}
                  style={active ? { background: c.color, borderColor: c.color, color: 'white' } : { color: c.color }}
                >
                  <Icon size={12} /> {c.label}
                  <span className="al-pill-count" style={active ? { background: 'rgba(255,255,255,0.25)' } : {}}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="al-filter-section">
          <div className="al-filter-label"><FiAlertTriangle size={12} /> Severity</div>
          <div className="al-pills-row">
            <FilterPill active={severityFilter === 'all'} onClick={() => setSeverityFilter('all')}>
              All Severities
            </FilterPill>
            <FilterPill
              active={severityFilter === 'HIGH'}
              onClick={() => setSeverityFilter('HIGH')}
              variant="danger"
              count={stats.high}
            >
              High
            </FilterPill>
            <FilterPill
              active={severityFilter === 'MEDIUM'}
              onClick={() => setSeverityFilter('MEDIUM')}
              variant="warning"
              count={stats.medium}
            >
              Medium
            </FilterPill>
            <FilterPill
              active={severityFilter === 'LOW'}
              onClick={() => setSeverityFilter('LOW')}
              variant="info"
              count={stats.low}
            >
              Low
            </FilterPill>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="al-active-filters">
            <span className="al-active-filters-text">
              Showing <strong>{filteredAlerts.length}</strong> of <strong>{alerts.length}</strong>
            </span>
            <button className="al-btn-clear-all" onClick={handleResetFilters}>
              <FiX size={11} /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── ALERTS LIST ── */}
      {filteredAlerts.length === 0 ? (
        <EmptyState filter={statusFilter} onReset={handleResetFilters} />
      ) : (
        <div className="al-list">
          {Object.entries(grouped).map(([groupKey, items]) => {
            if (items.length === 0) return null;
            const groupLabels = {
              today: 'Today',
              yesterday: 'Yesterday',
              thisWeek: 'Earlier this week',
              earlier: 'Earlier',
            };
            return (
              <div key={groupKey} className="al-group">
                <div className="al-group-header">
                  <span className="al-group-title">{groupLabels[groupKey]}</span>
                  <span className="al-group-count">{items.length}</span>
                </div>
                <div className="al-group-items">
                  {items.map((alert, idx) => (
                    <AlertCard
                      key={alert.alertId}
                      alert={alert}
                      onMarkRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      animDelay={idx * 0.04}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;