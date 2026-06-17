import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { qcApi } from '../api/qcApi';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FiClipboard, FiCheckCircle, FiXCircle, FiPauseCircle,
  FiClock, FiTrendingUp, FiAlertTriangle, FiRefreshCw,
  FiCalendar, FiActivity, FiChevronRight, FiBarChart2,
  FiPieChart, FiUsers, FiTag, FiZap
} from 'react-icons/fi';
import './QcDashboard.css';

const QcDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const res = await qcApi.getDashboardStats();
      setStats(res.data.data || res.data);
      if (silent) toast.success('Dashboard refreshed', { autoClose: 1200 });
    } catch (e) {
      toast.error('Failed to load dashboard');
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return (
    <div className="qd-loading">
      <div className="qd-spinner" />
      <span>Loading dashboard…</span>
    </div>
  );

  if (!stats) return (
    <div className="qd-page">
      <div className="qd-empty-state">
        <FiAlertTriangle size={36} />
        <h3>Failed to load dashboard</h3>
        <button className="qd-btn-refresh" onClick={() => loadStats()}>
          <FiRefreshCw size={14} /> Try again
        </button>
      </div>
    </div>
  );

  return <DashboardContent stats={stats} loadStats={loadStats} refreshing={refreshing} />;
};

const DashboardContent = ({ stats, loadStats, refreshing }) => {
  // Heatmap grid build
  const heatmapGrid = useMemo(() => {
    // 7 days × 24 hours
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    (stats.activityHeatmap || []).forEach(cell => {
      // MySQL DAYOFWEEK: 1=Sun, 7=Sat → convert to 0=Sun, 6=Sat for display
      const wd = (cell.weekday - 1 + 7) % 7;
      const hr = cell.hour;
      if (wd >= 0 && wd < 7 && hr >= 0 && hr < 24) {
        grid[wd][hr] = cell.count;
        if (cell.count > max) max = cell.count;
      }
    });
    return { grid, max };
  }, [stats]);

  const fmtDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Format trend data for chart
  const trendData = useMemo(() =>
    (stats.dailyTrend || []).map(d => ({
      ...d,
      dateLabel: fmtDate(d.date),
    })), [stats]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const heatColor = (count, max) => {
    if (count === 0) return '#f1f5f9';
    const intensity = count / max;
    if (intensity < 0.2) return '#dbeafe';
    if (intensity < 0.4) return '#93c5fd';
    if (intensity < 0.6) return '#60a5fa';
    if (intensity < 0.8) return '#3b82f6';
    return '#1d4ed8';
  };

  return (
    <div className="qd-page">

      {/* ─── HEADER ─── */}
      <div className="qd-header">
        <div className="qd-header-left">
          <div className="qd-header-icon"><FiBarChart2 size={20} /></div>
          <div>
            <h1 className="qd-title">QC Dashboard</h1>
            <p className="qd-subtitle">
              Live inspection metrics · Last refreshed just now
            </p>
          </div>
        </div>
        <button
          className="qd-btn-refresh"
          onClick={() => loadStats(true)}
          disabled={refreshing}
        >
          <FiRefreshCw size={14} className={refreshing ? 'qd-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ─── KPI STRIP ─── */}
      <div className="qd-kpis">
        <Link to="/qc/queue" className="qd-kpi qd-kpi-pending">
          <div className="qd-kpi-icon"><FiClock size={20} /></div>
          <div className="qd-kpi-body">
            <strong>{stats.pendingCount || 0}</strong>
            <span>Pending QC</span>
          </div>
          {stats.pendingCount > 0 && <div className="qd-kpi-pulse" />}
        </Link>

        <Link to="/qc/approved" className="qd-kpi qd-kpi-approved">
          <div className="qd-kpi-icon"><FiCheckCircle size={20} /></div>
          <div className="qd-kpi-body">
            <strong>{stats.approvedCount || 0}</strong>
            <span>Approved</span>
          </div>
        </Link>

        <Link to="/qc/rejected" className="qd-kpi qd-kpi-rejected">
          <div className="qd-kpi-icon"><FiXCircle size={20} /></div>
          <div className="qd-kpi-body">
            <strong>{stats.rejectedCount || 0}</strong>
            <span>Rejected</span>
          </div>
        </Link>

        <div className="qd-kpi qd-kpi-hold">
          <div className="qd-kpi-icon"><FiPauseCircle size={20} /></div>
          <div className="qd-kpi-body">
            <strong>{stats.holdCount || 0}</strong>
            <span>On Hold</span>
          </div>
        </div>

        <div className="qd-kpi qd-kpi-partial">
          <div className="qd-kpi-icon"><FiActivity size={20} /></div>
          <div className="qd-kpi-body">
            <strong>{stats.partialCount || 0}</strong>
            <span>Partial</span>
          </div>
        </div>
      </div>

      {/* ─── PERIOD CARDS ─── */}
      <div className="qd-periods">
        <div className="qd-period">
          <FiCalendar size={14} />
          <div className="qd-period-body">
            <span className="qd-period-label">Today</span>
            <strong className="qd-period-val">{stats.todayCount || 0}</strong>
            <span className="qd-period-sub">inspections</span>
          </div>
        </div>
        <div className="qd-period">
          <FiCalendar size={14} />
          <div className="qd-period-body">
            <span className="qd-period-label">This Week</span>
            <strong className="qd-period-val">{stats.thisWeekCount || 0}</strong>
            <span className="qd-period-sub">inspections</span>
          </div>
        </div>
        <div className="qd-period">
          <FiCalendar size={14} />
          <div className="qd-period-body">
            <span className="qd-period-label">This Month</span>
            <strong className="qd-period-val">{stats.thisMonthCount || 0}</strong>
            <span className="qd-period-sub">inspections</span>
          </div>
        </div>
        <div className="qd-period qd-period-rate">
          <FiTrendingUp size={14} />
          <div className="qd-period-body">
            <span className="qd-period-label">Approval Rate</span>
            <strong className="qd-period-val qd-rate-good">
              {(stats.approvalRate || 0).toFixed(1)}%
            </strong>
            <span className="qd-period-sub">of all decisions</span>
          </div>
        </div>
        <div className="qd-period qd-period-rate">
          <FiClock size={14} />
          <div className="qd-period-body">
            <span className="qd-period-label">Avg Turnaround</span>
            <strong className="qd-period-val">
              {(stats.avgTurnaroundHours || 0).toFixed(1)}h
            </strong>
            <span className="qd-period-sub">stock-in → decision</span>
          </div>
        </div>
      </div>

      {/* ─── CHARTS ROW 1: Pie + Bar ─── */}
      <div className="qd-charts-row">

        {/* Pie chart */}
        <div className="qd-chart-card">
          <div className="qd-chart-head">
            <FiPieChart size={15} />
            <span>Decision Distribution</span>
            <span className="qd-chart-sub">All time</span>
          </div>
          <div className="qd-chart-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.decisionPie || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry) => entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
                  labelLine={false}
                >
                  {(stats.decisionPie || []).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category bar */}
        <div className="qd-chart-card">
          <div className="qd-chart-head">
            <FiBarChart2 size={15} />
            <span>By Category</span>
            <span className="qd-chart-sub">Last 30 days</span>
          </div>
          <div className="qd-chart-body" style={{ height: 280 }}>
            {(stats.categoryBar || []).length === 0 ? (
              <div className="qd-chart-empty">No data in last 30 days</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="approved" fill="#10b981" name="Approved" />
                  <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                  <Bar dataKey="partial"  fill="#f59e0b" name="Partial" />
                  <Bar dataKey="hold"     fill="#8b5cf6" name="Hold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─── LINE TREND ─── */}
      <div className="qd-chart-card">
        <div className="qd-chart-head">
          <FiTrendingUp size={15} />
          <span>Daily Trend</span>
          <span className="qd-chart-sub">Last 30 days</span>
        </div>
        <div className="qd-chart-body" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} interval={3} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="approved" stroke="#10b981"
                strokeWidth={2} name="Approved" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="rejected" stroke="#ef4444"
                strokeWidth={2} name="Rejected" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="total" stroke="#4f46e5"
                strokeWidth={2} name="Total" dot={{ r: 3 }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── HEATMAP ─── */}
      <div className="qd-chart-card">
        <div className="qd-chart-head">
          <FiActivity size={15} />
          <span>Activity Heatmap</span>
          <span className="qd-chart-sub">Last 90 days · Weekday × Hour</span>
        </div>
        <div className="qd-chart-body qd-heatmap-body">
          <div className="qd-heatmap-wrap">
            {/* Hour header */}
            <div className="qd-heatmap-hours">
              <div className="qd-heatmap-hours-spacer" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="qd-heatmap-hour-label">
                  {h % 3 === 0 ? h : ''}
                </div>
              ))}
            </div>

            {/* Rows */}
            {weekdays.map((day, wd) => (
              <div key={day} className="qd-heatmap-row">
                <div className="qd-heatmap-day-label">{day}</div>
                {heatmapGrid.grid[wd].map((count, hr) => (
                  <div
                    key={hr}
                    className="qd-heatmap-cell"
                    style={{ background: heatColor(count, heatmapGrid.max || 1) }}
                    title={`${day} ${hr}:00 — ${count} inspection${count !== 1 ? 's' : ''}`}
                  >
                    {count > 0 && count >= (heatmapGrid.max * 0.5) && (
                      <span className="qd-heatmap-num">{count}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="qd-heatmap-legend">
            <span>Less</span>
            <div className="qd-heatmap-legend-cell" style={{ background: '#f1f5f9' }} />
            <div className="qd-heatmap-legend-cell" style={{ background: '#dbeafe' }} />
            <div className="qd-heatmap-legend-cell" style={{ background: '#93c5fd' }} />
            <div className="qd-heatmap-legend-cell" style={{ background: '#60a5fa' }} />
            <div className="qd-heatmap-legend-cell" style={{ background: '#3b82f6' }} />
            <div className="qd-heatmap-legend-cell" style={{ background: '#1d4ed8' }} />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* ─── TOP REJECTED + WORST SUPPLIERS ─── */}
      <div className="qd-bottom-row">

        <div className="qd-chart-card">
          <div className="qd-chart-head">
            <FiTag size={15} />
            <span>Top Issue Categories</span>
            <span className="qd-chart-sub">Last 30 days</span>
          </div>
          <div className="qd-chart-body">
            {(stats.topRejectedCategories || []).length === 0 ? (
              <div className="qd-chart-empty">No rejection issues — great work!</div>
            ) : (
              <div className="qd-rank-list">
                {(stats.topRejectedCategories || []).map((cat, idx) => (
                  <div key={cat.category} className="qd-rank-row">
                    <div className="qd-rank-pos">#{idx + 1}</div>
                    <div className="qd-rank-name">{cat.category}</div>
                    <div className="qd-rank-bar">
                      <div
                        className="qd-rank-bar-fill"
                        style={{
                          width: `${(cat.rejectedCount / (stats.topRejectedCategories[0]?.rejectedCount || 1)) * 100}%`,
                          background: '#ef4444'
                        }}
                      />
                    </div>
                    <div className="qd-rank-val">{cat.rejectedCount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="qd-chart-card">
          <div className="qd-chart-head">
            <FiUsers size={15} />
            <span>Suppliers to Watch</span>
            <span className="qd-chart-sub">Highest rejection rates</span>
          </div>
          <div className="qd-chart-body">
            {(stats.worstSuppliers || []).length === 0 ? (
              <div className="qd-chart-empty">All suppliers performing well</div>
            ) : (
              <div className="qd-rank-list">
                {(stats.worstSuppliers || []).map((s, idx) => (
                  <div key={s.supplier} className="qd-rank-row">
                    <div className="qd-rank-pos">#{idx + 1}</div>
                    <div className="qd-rank-name">{s.supplier}</div>
                    <div className="qd-rank-stats">
                      <span className="qd-rank-sub">
                        {s.rejectedCount}/{s.totalInspections}
                      </span>
                    </div>
                    <div className="qd-rank-val qd-rank-val-warn">
                      {s.rejectionRate}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── QUICK LINKS ─── */}
      <div className="qd-actions">
        <Link to="/qc/queue" className="qd-action qd-action-pending">
          <FiClipboard size={18} />
          <div>
            <strong>QC Queue</strong>
            <span>{stats.pendingCount || 0} pending</span>
          </div>
          <FiChevronRight size={14} />
        </Link>
        <Link to="/qc/approved" className="qd-action qd-action-approved">
          <FiCheckCircle size={18} />
          <div>
            <strong>Approved List</strong>
            <span>{stats.approvedCount || 0} total</span>
          </div>
          <FiChevronRight size={14} />
        </Link>
        <Link to="/qc/rejected" className="qd-action qd-action-rejected">
          <FiXCircle size={18} />
          <div>
            <strong>Rejected List</strong>
            <span>{(stats.rejectedCount || 0) + (stats.partialCount || 0)} total</span>
          </div>
          <FiChevronRight size={14} />
        </Link>
        <Link to="/qc/history" className="qd-action qd-action-history">
          <FiActivity size={18} />
          <div>
            <strong>Inspection History</strong>
            <span>{stats.totalInspections || 0} total</span>
          </div>
          <FiChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
};

export default QcDashboard;
