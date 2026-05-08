import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { stockApi } from '../api/stockApi';
import { alertApi } from '../api/alertApi';
import {
  FiPackage, FiTag, FiAlertTriangle, FiBell,
  FiTrendingUp, FiBarChart2, FiPlusCircle,
  FiArrowUpRight, FiArrowDownRight,
  FiDatabase, FiRefreshCw, FiChevronRight,
  FiCheckCircle, FiEye
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [prodRes, alertRes] = await Promise.allSettled([
        productApi.getActive(),
        alertApi.getAll(),
      ]);

      const prods = prodRes.status === 'fulfilled' ? (prodRes.value.data.data || []) : [];
      const alts = alertRes.status === 'fulfilled' ? (alertRes.value.data.data || []) : [];

      setProducts(prods);
      setAlerts(alts);

      const stockEntries = {};
      await Promise.allSettled(
        prods.map(async (p) => {
          try {
            const res = await stockApi.getCurrentStock(p.productId);
            stockEntries[p.productId] = res.data.data;
          } catch {
            stockEntries[p.productId] = null;
          }
        })
      );
      setStockMap(stockEntries);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived stats ──
  const stats = useMemo(() => {
    let inStock = 0, outOfStock = 0, lowStock = 0, totalValue = 0;
    products.forEach((p) => {
      const sd = stockMap[p.productId];
      const total = parseFloat(sd?.totalStock || 0);
      const lots = sd?.lots || [];
      if (total > 0) {
        inStock++;
        lots.forEach(l => {
          totalValue += parseFloat(l.remainingQuantity || 0) * parseFloat(l.purchasePrice || 0);
        });
        if (p.minStockLevel && total <= parseFloat(p.minStockLevel)) lowStock++;
      } else {
        outOfStock++;
      }
    });
    return {
      total: products.length, inStock, outOfStock, lowStock, totalValue,
      unreadAlerts: alerts.filter(a => !a.isRead).length,
    };
  }, [products, stockMap, alerts]);

  // Category breakdown
  const categories = useMemo(() => {
    const map = {};
    products.forEach(p => {
      const name = p.category?.categoryName || 'Uncategorized';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [products]);

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  // ── Helpers ──
  const fmtCurrency = (v) => {
    if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
    if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + ' L';
    if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + ' K';
    return '₹' + v.toFixed(0);
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const diff = Math.floor((Date.now() - date) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return diff + 'd ago';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const alertMeta = (type) => {
    const m = {
      LOW_STOCK:      { color: '#e67e22', icon: <FiAlertTriangle size={14} /> },
      PRICE_CHANGE:   { color: '#3498db', icon: <FiTrendingUp size={14} /> },
      DEAD_STOCK:     { color: '#e74c3c', icon: <FiAlertTriangle size={14} /> },
      NEW_PRODUCT:    { color: '#8e44ad', icon: <FiPlusCircle size={14} /> },
      STOCK_ADDED:    { color: '#27ae60', icon: <FiArrowUpRight size={14} /> },
      CATEGORY_ADDED: { color: '#16a085', icon: <FiTag size={14} /> },
    };
    return m[type] || { color: '#7f8c8d', icon: <FiBell size={14} /> };
  };

  // ── Stock health ──
  const healthPcts = useMemo(() => {
    const t = stats.total || 1;
    const safe = Math.max(stats.inStock - stats.lowStock, 0);
    return {
      ok: (safe / t * 100).toFixed(1),
      low: (stats.lowStock / t * 100).toFixed(1),
      out: (stats.outOfStock / t * 100).toFixed(1),
    };
  }, [stats]);

  // ── Donut ──
  const DONUT_COLORS = ['#2c6fbb', '#1e8a5e', '#c77c14', '#c0392b', '#7d3c98', '#117a7a', '#6c757d'];
  const donutPaths = useMemo(() => {
    const total = categories.reduce((s, c) => s + c.count, 0) || 1;
    const paths = [];
    let cum = -90;
    categories.forEach((cat, i) => {
      const angle = (cat.count / total) * 360;
      const s = (cum * Math.PI) / 180;
      const e = ((cum + angle) * Math.PI) / 180;
      const r = 70, cx = 90, cy = 90;
      paths.push({
        d: `M${cx} ${cy}L${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)}A${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)}Z`,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
        name: cat.name,
        count: cat.count,
        pct: ((cat.count / total) * 100).toFixed(0),
      });
      cum += angle;
    });
    return paths;
  }, [categories]);

  if (loading) {
    return (
      <div className="inv-loading">
        <div className="inv-spinner" />
        <span>Loading inventory data…</span>
      </div>
    );
  }

  return (
    <div className="inv-dash">

      {/* ═══ ZONE 1: GREETING ═══ */}
      <header className="inv-head">
        <div className="inv-head-left">
          <div className="inv-avatar">{user?.fullName?.charAt(0) || 'U'}</div>
          <div>
            <h1>Welcome back, <span className="inv-name">{user?.fullName}</span></h1>
            <span className="inv-pill">{user?.role}</span>
          </div>
        </div>
        <button className="inv-refresh" onClick={loadDashboardData}>
          <FiRefreshCw size={15} /> Refresh
        </button>
      </header>

      {/* ═══ ZONE 2: KPI STRIP ═══ */}
      <div className="inv-kpis">
        <Link to="/products" className="inv-kpi">
          <span className="inv-kpi-ic"><FiPackage size={20} /></span>
          <strong>{stats.total}</strong>
          <small>Products</small>
        </Link>
        <Link to="/current-stock" className="inv-kpi">
          <span className="inv-kpi-ic ic-g"><FiDatabase size={20} /></span>
          <strong>{stats.inStock}</strong>
          <small>In stock</small>
        </Link>
        <div className="inv-kpi">
          <span className="inv-kpi-ic ic-i"><FiBarChart2 size={20} /></span>
          <strong>{fmtCurrency(stats.totalValue)}</strong>
          <small>Inventory value</small>
        </div>
        <Link to="/alerts" className="inv-kpi kpi-w">
          <span className="inv-kpi-ic ic-a"><FiAlertTriangle size={20} /></span>
          <strong>{stats.lowStock}</strong>
          <small>Low stock</small>
          {stats.lowStock > 0 && <span className="inv-kpi-pip" />}
        </Link>
      </div>

      {/* ═══ ZONE 3: STOCK HEALTH BAR ═══ */}
      <section className="inv-health">
        <div className="inv-health-top">
          <h2>Stock health</h2>
          <span className="inv-health-ct">{stats.total} products</span>
        </div>
        <div className="inv-bar-track">
          {parseFloat(healthPcts.ok) > 0 && (
            <div className="inv-bar ok" style={{ width: `${healthPcts.ok}%` }}>
              {parseFloat(healthPcts.ok) > 8 && <span>{healthPcts.ok}%</span>}
            </div>
          )}
          {parseFloat(healthPcts.low) > 0 && (
            <div className="inv-bar low" style={{ width: `${healthPcts.low}%` }}>
              {parseFloat(healthPcts.low) > 8 && <span>{healthPcts.low}%</span>}
            </div>
          )}
          {parseFloat(healthPcts.out) > 0 && (
            <div className="inv-bar out" style={{ width: `${healthPcts.out}%` }}>
              {parseFloat(healthPcts.out) > 8 && <span>{healthPcts.out}%</span>}
            </div>
          )}
        </div>
        <div className="inv-legend">
          <span><i className="dot-ok" /> In stock <b>{Math.max(stats.inStock - stats.lowStock, 0)}</b></span>
          <span><i className="dot-low" /> Low stock <b>{stats.lowStock}</b></span>
          <span><i className="dot-out" /> Out of stock <b>{stats.outOfStock}</b></span>
        </div>
      </section>

      {/* ═══ ZONE 4: TWO COLUMNS ═══ */}
      <div className="inv-cols">

        {/* Categories donut */}
        <section className="inv-card">
          <div className="inv-card-hd">
            <h2><FiTag size={15} /> By category</h2>
            <Link to="/categories" className="inv-link">All <FiChevronRight size={13} /></Link>
          </div>
          {categories.length === 0 ? (
            <p className="inv-empty">No categories yet</p>
          ) : (
            <div className="inv-cat-wrap">
              <svg viewBox="0 0 180 180" className="inv-donut">
                {donutPaths.map((p, i) => (
                  <path key={i} d={p.d} fill={p.color} stroke="var(--inv-surface)" strokeWidth="2.5" />
                ))}
                <circle cx="90" cy="90" r="42" fill="var(--inv-surface)" />
                <text x="90" y="84" textAnchor="middle" dominantBaseline="central"
                  fill="var(--inv-text)" fontSize="22" fontWeight="700">{stats.total}</text>
                <text x="90" y="104" textAnchor="middle" dominantBaseline="central"
                  fill="var(--inv-muted)" fontSize="10" fontWeight="500">products</text>
              </svg>
              <div className="inv-cat-legend">
                {donutPaths.map((p, i) => (
                  <div key={i} className="inv-cat-row">
                    <span className="inv-cat-dot" style={{ background: p.color }} />
                    <span className="inv-cat-nm">{p.name}</span>
                    <span className="inv-cat-ct">{p.count} <small>({p.pct}%)</small></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Alerts */}
        <section className="inv-card">
          <div className="inv-card-hd">
            <h2>
              <FiBell size={15} /> Recent alerts
              {stats.unreadAlerts > 0 && <span className="inv-badge">{stats.unreadAlerts}</span>}
            </h2>
            <Link to="/alerts" className="inv-link">All <FiChevronRight size={13} /></Link>
          </div>
          {recentAlerts.length === 0 ? (
            <div className="inv-empty-block">
              <FiCheckCircle size={26} />
              <span>All clear — no alerts</span>
            </div>
          ) : (
            <div className="inv-alert-list">
              {recentAlerts.map((a) => {
                const m = alertMeta(a.alertType);
                return (
                  <div key={a.alertId} className={`inv-alert ${!a.isRead ? 'unread' : ''}`}>
                    <span className="inv-alert-ic" style={{ color: m.color }}>{m.icon}</span>
                    <div className="inv-alert-body">
                      <p>{a.message}</p>
                      <small>{a.alertType.replace(/_/g, ' ')} · {fmtDate(a.createdAt)}</small>
                    </div>
                    {!a.isRead && <span className="inv-pip" />}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ═══ ZONE 5: QUICK ACTIONS ═══ */}
      <nav className="inv-actions">
        <Link to="/stock-in" className="inv-act in"><FiArrowUpRight size={18} /> Stock IN</Link>
        <Link to="/stock-out" className="inv-act out"><FiArrowDownRight size={18} /> Stock OUT</Link>
        <Link to="/products" className="inv-act add"><FiPlusCircle size={18} /> Add product</Link>
        <Link to="/current-stock" className="inv-act view"><FiEye size={18} /> View stock</Link>
      </nav>
    </div>
  );
};

export default Dashboard;