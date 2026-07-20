/* ============================================================================
   INVENTORY DASHBOARD — "INDUSTRIAL CLEAN PRO"
   Pairs with Dashboard.css (inv-* classes).

   ADVANCED FEATURES:
   · Dark / light theme toggle (persisted in localStorage, honours OS setting)
   · Animated count-up KPIs (respects prefers-reduced-motion)
   · Real deltas — compared against the snapshot saved on your previous visit
   · Skeleton loading + error banner with retry
   · Auto-refresh (60 s, toggleable) with "updated Xs ago" ticker
   · Watchlist card: low/out items ranked by severity with stock-vs-min bars
   · Alerts: All / Unread tabs + optimistic mark-as-read
   · Donut with centre total

   WIRING:
   · API imports use named imports from ../api/*.js
     (matches your project structure and export style).
   · If your alertApi has no markAsRead endpoint, the optimistic update still
     works locally — see markRead() below.
   ============================================================================ */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  FiPackage, FiDatabase, FiAlertTriangle, FiBell, FiChevronRight, FiTag,
  FiArrowUpCircle, FiArrowDownCircle, FiPlusCircle, FiEye, FiRefreshCw,
  FiCheckCircle, FiBarChart2, FiMoon, FiSun, FiZap, FiCheck,
  FiArrowUpRight, FiArrowDownRight, FiCrosshair,
} from 'react-icons/fi';
import { productApi } from '../api/productApi';
import { alertApi } from '../api/alertApi';
import { stockApi } from '../api/stockApi';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

/* ── constants ──────────────────────────────────────────────────────────── */
const AUTO_REFRESH_MS = 60000;
const SNAPSHOT_KEY = 'inv-dash-snapshot';
const THEME_KEY = 'inv-dash-theme';
const CAT_COLORS = ['#2c6fbb', '#4a5899', '#1a7a4c', '#b86e0d', '#c0392b', '#0e8f88', '#6b7689'];

const ALERT_META = {
  LOW_STOCK:      { Icon: FiAlertTriangle, color: 'var(--inv-amber)',  label: 'Low stock' },
  DEAD_STOCK:     { Icon: FiAlertTriangle, color: 'var(--inv-red)',    label: 'Dead stock' },
  STOCK_ADDED:    { Icon: FiArrowUpCircle, color: 'var(--inv-green)',  label: 'Stock added' },
  PRICE_CHANGE:   { Icon: FiBarChart2,     color: 'var(--inv-accent)', label: 'Price change' },
  NEW_PRODUCT:    { Icon: FiPlusCircle,    color: 'var(--inv-indigo)', label: 'New product' },
  CATEGORY_ADDED: { Icon: FiTag,           color: 'var(--inv-indigo)', label: 'Category' },
};

/* ── helpers ────────────────────────────────────────────────────────────── */
const reducedMotion = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const fmtCurrency = (v) => {
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + ' L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1) + ' K';
  return '₹' + Math.round(v);
};

const fmtNum = (v) => Math.round(v).toLocaleString('en-IN');

const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const diff = Math.floor((Date.now() - date) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return diff + 'd ago';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const fmtAgo = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

/* safe localStorage (SSR / private mode) */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

/* ── count-up hook (eases out, respects reduced motion) ─────────────────── */
function useCountUp(target, duration = 650) {
  const [val, setVal] = useState(reducedMotion ? target : 0);
  const valRef = useRef(val);
  valRef.current = val;
  const raf = useRef();
  useEffect(() => {
    if (reducedMotion) { setVal(target); return undefined; }
    cancelAnimationFrame(raf.current);
    const from = valRef.current; // animate from currently shown value on refresh
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

/* ── KPI card ───────────────────────────────────────────────────────────── */
function Kpi({ label, value, fmt = fmtNum, Icon, iconClass = '', to, warn, pip, delta, goodDown }) {
  const shown = useCountUp(value);
  const Wrap = to ? Link : 'div';
  const wrapProps = to ? { to } : {};
  const showDelta = typeof delta === 'number' && delta !== 0 && !pip;
  const good = goodDown ? delta < 0 : delta > 0;
  return (
    <Wrap {...wrapProps} className={`inv-kpi${warn ? ' kpi-w' : ''}`}>
      {pip && <span className="inv-kpi-pip" />}
      {showDelta && (
        <span className={`inv-delta ${good ? 'up' : 'down'}`}>
          {delta > 0 ? <FiArrowUpRight size={10} /> : <FiArrowDownRight size={10} />}
          {fmt === fmtCurrency ? fmtCurrency(Math.abs(delta)) : fmtNum(Math.abs(delta))}
        </span>
      )}
      <div className={`inv-kpi-ic ${iconClass}`}><Icon size={18} /></div>
      <div>
        <strong>{fmt(shown)}</strong>
        <small>{label}</small>
      </div>
    </Wrap>
  );
}

/* ── skeleton screen ────────────────────────────────────────────────────── */
function Skeleton({ theme }) {
  return (
    <div className="inv-loading" data-theme={theme}>
      <div className="inv-skel h-head" />
      <div className="inv-skel-row">
        {[0, 1, 2, 3].map((i) => <div key={i} className="inv-skel h-kpi" />)}
      </div>
      <div className="inv-skel h-bar" />
      <div className="inv-skel-cols">
        {[0, 1, 2].map((i) => <div key={i} className="inv-skel h-card" />)}
      </div>
      <div className="inv-skel-row">
        {[0, 1, 2, 3].map((i) => <div key={i} className="inv-skel h-act" />)}
      </div>
    </div>
  );
}

/* ── component ──────────────────────────────────────────────────────────── */
export default function InventoryDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [agoTick, setAgoTick] = useState(0); // re-render ticker for "Xs ago"
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertTab, setAlertTab] = useState('all'); // 'all' | 'unread'
  const [snapshot] = useState(() => store.get(SNAPSHOT_KEY)); // baseline from last visit
  const snapshotSaved = useRef(false);

  const [theme, setTheme] = useState(() => {
    const saved = store.get(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      store.set(THEME_KEY, next);
      return next;
    });
  };

  /* ── loader (your original API flow) ── */
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const [prodRes, alertRes] = await Promise.allSettled([
        productApi.getActive(),
        alertApi.getAll(),
      ]);
      if (prodRes.status === 'rejected' && alertRes.status === 'rejected') {
        throw new Error('Both product and alert requests failed');
      }
      const prods = prodRes.status === 'fulfilled' ? (prodRes.value.data.data || []) : [];
      const alts  = alertRes.status === 'fulfilled' ? (alertRes.value.data.data || []) : [];
      setProducts(prods);
      setAlerts(alts);

      const stockEntries = {};
      await Promise.allSettled(prods.map(async (p) => {
        try {
          const res = await stockApi.getCurrentStock(p.productId);
          stockEntries[p.productId] = res.data.data;
        } catch {
          stockEntries[p.productId] = null;
        }
      }));
      setStockMap(stockEntries);
      setUpdatedAt(Date.now());
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Could not load dashboard data. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  /* auto-refresh */
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => loadDashboardData(true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, loadDashboardData]);

  /* "updated Xs ago" ticker */
  useEffect(() => {
    const id = setInterval(() => setAgoTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  /* ── derived stats (your original logic) ── */
  const stats = useMemo(() => {
    let inStock = 0, outOfStock = 0, lowStock = 0, totalValue = 0;
    products.forEach((p) => {
      const sd = stockMap[p.productId];
      const total = parseFloat(sd?.totalStock || 0);
      const lots = sd?.lots || [];
      if (total > 0) {
        inStock++;
        lots.forEach((l) => {
          totalValue += parseFloat(l.remainingQuantity || 0) * parseFloat(l.purchasePrice || 0);
        });
        if (p.minStockLevel && total <= parseFloat(p.minStockLevel)) lowStock++;
      } else {
        outOfStock++;
      }
    });
    return {
      total: products.length, inStock, outOfStock, lowStock, totalValue,
      unreadAlerts: alerts.filter((a) => !a.isRead).length,
    };
  }, [products, stockMap, alerts]);

  /* deltas vs the snapshot saved on the previous visit */
  const deltas = useMemo(() => {
    if (!snapshot) return {};
    return {
      total: stats.total - (snapshot.total || 0),
      inStock: stats.inStock - (snapshot.inStock || 0),
      totalValue: stats.totalValue - (snapshot.totalValue || 0),
      attention: (stats.lowStock + stats.outOfStock)
        - ((snapshot.lowStock || 0) + (snapshot.outOfStock || 0)),
    };
  }, [stats, snapshot]);

  /* persist a fresh snapshot once real data has landed (once per visit) */
  useEffect(() => {
    if (loading || snapshotSaved.current || stats.total === 0) return;
    snapshotSaved.current = true;
    store.set(SNAPSHOT_KEY, {
      total: stats.total, inStock: stats.inStock, lowStock: stats.lowStock,
      outOfStock: stats.outOfStock, totalValue: stats.totalValue, at: Date.now(),
    });
  }, [loading, stats]);

  const categories = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const n = p.category?.categoryName || 'Uncategorized';
      map[n] = (map[n] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [products]);

  /* watchlist: OUT first, then LOW ranked by how far below min */
  const watchlist = useMemo(() => {
    const rows = [];
    products.forEach((p) => {
      const total = parseFloat(stockMap[p.productId]?.totalStock || 0);
      const min = parseFloat(p.minStockLevel || 0);
      if (total === 0) rows.push({ ...p, total, min, status: 'out', ratio: 0 });
      else if (min && total <= min) rows.push({ ...p, total, min, status: 'low', ratio: total / min });
    });
    return rows
      .sort((a, b) => (a.status === b.status ? a.ratio - b.ratio : a.status === 'out' ? -1 : 1))
      .slice(0, 6);
  }, [products, stockMap]);

  const visibleAlerts = useMemo(() => {
    const list = alertTab === 'unread' ? alerts.filter((a) => !a.isRead) : alerts;
    return list.slice(0, 8);
  }, [alerts, alertTab]);

  /* optimistic mark-as-read; syncs to API if the endpoint exists */
  const markRead = useCallback(async (alertId) => {
    setAlerts((prev) => prev.map((a) => (a.alertId === alertId ? { ...a, isRead: true } : a)));
    try {
      if (typeof alertApi.markAsRead === 'function') await alertApi.markAsRead(alertId);
    } catch (err) {
      console.error('markAsRead failed, reverting:', err);
      setAlerts((prev) => prev.map((a) => (a.alertId === alertId ? { ...a, isRead: false } : a)));
    }
  }, []);

  /* health segments */
  const okCount = Math.max(stats.inStock - stats.lowStock, 0);
  const pct = (n) => (stats.total ? (n / stats.total) * 100 : 0);
  const segments = [
    { key: 'ok',  count: okCount,          cls: 'ok'  },
    { key: 'low', count: stats.lowStock,   cls: 'low' },
    { key: 'out', count: stats.outOfStock, cls: 'out' },
  ].filter((s) => s.count > 0);

  const initial = (user?.fullName || 'U').charAt(0).toUpperCase();

  if (loading) return <Skeleton theme={theme} />;

  return (
    <div className="inv-dash" data-theme={theme}>

      {/* ══ Error banner ══ */}
      {error && (
        <div className="inv-error" role="alert">
          <FiAlertTriangle size={16} />
          {error}
          <button onClick={() => loadDashboardData()}>Retry</button>
        </div>
      )}

      {/* ══ Zone 1: Header ══ */}
      <header className="inv-head">
        <div className="inv-head-left">
          <div className="inv-avatar">{initial}</div>
          <div>
            <h1>Welcome back, <span className="inv-name">{user?.fullName || 'User'}</span></h1>
            <span className="inv-pill">{user?.role || 'Member'}</span>
          </div>
        </div>
        <div className="inv-head-right">
          {updatedAt && (
            <span className="inv-updated" data-tick={agoTick}>Updated {fmtAgo(updatedAt)}</span>
          )}
          <button
            className={`inv-iconbtn${autoRefresh ? ' on' : ''}`}
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? 'Auto-refresh on (60 s)' : 'Auto-refresh off'}
            aria-pressed={autoRefresh}
          >
            <FiZap size={14} />
          </button>
          <button className="inv-iconbtn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
          <button
            className={`inv-refresh${refreshing ? ' busy' : ''}`}
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
          >
            <FiRefreshCw size={13} /> {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* ══ Zone 2: KPI strip ══ */}
      <section className="inv-kpis">
        <Kpi label="Total products" value={stats.total} Icon={FiPackage}
             to="/products" delta={deltas.total} />
        <Kpi label="In stock" value={stats.inStock} Icon={FiDatabase} iconClass="ic-g"
             to="/current-stock" delta={deltas.inStock} />
        <Kpi label="Inventory value" value={stats.totalValue} fmt={fmtCurrency}
             Icon={FiBarChart2} iconClass="ic-i" delta={deltas.totalValue} />
        <Kpi label="Low / out of stock" value={stats.lowStock + stats.outOfStock}
             Icon={FiAlertTriangle} iconClass="ic-a" to="/alerts" warn
             pip={(stats.lowStock + stats.outOfStock) > 0}
             delta={deltas.attention} goodDown />
      </section>

      {/* ══ Zone 3: Stock health bar ══ */}
      <section className="inv-health">
        <div className="inv-health-top">
          <h2>Stock health</h2>
          <span className="inv-health-ct">{fmtNum(stats.total)} products tracked</span>
        </div>

        {stats.total === 0 ? (
          <p className="inv-empty">No products yet — add your first product to see stock health.</p>
        ) : (
          <>
            <div className="inv-bar-track">
              {segments.map((s) => (
                <div key={s.key} className={`inv-bar ${s.cls}`}
                     style={{ width: `${pct(s.count)}%` }} title={`${s.count} products`}>
                  {pct(s.count) >= 9 && <span>{Math.round(pct(s.count))}%</span>}
                </div>
              ))}
            </div>
            <div className="inv-legend">
              <span><i className="dot-ok" /> Healthy <b>{okCount}</b></span>
              <span><i className="dot-low" /> Low stock <b>{stats.lowStock}</b></span>
              <span><i className="dot-out" /> Out of stock <b>{stats.outOfStock}</b></span>
            </div>
          </>
        )}
      </section>

      {/* ══ Zone 4: Three columns ══ */}
      <section className="inv-cols">

        {/* Category distribution */}
        <div className="inv-card">
          <div className="inv-card-hd">
            <h2><FiTag size={14} /> Categories</h2>
            <Link to="/categories" className="inv-link">Manage <FiChevronRight size={12} /></Link>
          </div>

          {categories.length === 0 ? (
            <p className="inv-empty">No categories yet</p>
          ) : (
            <div className="inv-cat-wrap">
              <div className="inv-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="count" nameKey="name"
                         innerRadius="62%" outerRadius="94%" paddingAngle={2} strokeWidth={0}>
                      {categories.map((_, i) => (
                        <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} products`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="inv-donut-center">
                  <strong>{stats.total}</strong>
                  <small>Products</small>
                </div>
              </div>

              <div className="inv-cat-legend">
                {categories.map((c, i) => (
                  <div key={c.name} className="inv-cat-row">
                    <span className="inv-cat-dot"
                          style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="inv-cat-nm">{c.name}</span>
                    <span className="inv-cat-ct">
                      {c.count} <small>({Math.round((c.count / stats.total) * 100)}%)</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="inv-card">
          <div className="inv-card-hd">
            <h2><FiCrosshair size={14} /> Watchlist</h2>
            <Link to="/current-stock" className="inv-link">Stock <FiChevronRight size={12} /></Link>
          </div>

          {watchlist.length === 0 ? (
            <div className="inv-empty-block">
              <FiCheckCircle size={22} color="var(--inv-green)" />
              <span>Nothing on watch — levels are healthy</span>
            </div>
          ) : (
            <div className="inv-watch-list">
              {watchlist.map((w) => (
                <Link key={w.productId} to={`/products/${w.productId}`} className="inv-watch">
                  <div className="inv-watch-top">
                    <span className={`inv-tag ${w.status}`}>{w.status}</span>
                    <span className="inv-watch-nm">{w.productName}</span>
                    <span className="inv-watch-qty">
                      {fmtNum(w.total)}{w.min ? ` / ${fmtNum(w.min)} min` : ''}
                    </span>
                  </div>
                  <span className="inv-watch-bar">
                    <i className={w.status}
                       style={{ width: `${w.min ? Math.min((w.total / w.min) * 100, 100) : 0}%` }} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="inv-card">
          <div className="inv-card-hd">
            <h2>
              <FiBell size={14} /> Alerts
              {stats.unreadAlerts > 0 && <span className="inv-badge">{stats.unreadAlerts}</span>}
            </h2>
            <Link to="/alerts" className="inv-link">View all <FiChevronRight size={12} /></Link>
          </div>

          <div className="inv-tabs" role="tablist">
            <button role="tab" aria-selected={alertTab === 'all'}
                    className={`inv-tab${alertTab === 'all' ? ' on' : ''}`}
                    onClick={() => setAlertTab('all')}>
              All
            </button>
            <button role="tab" aria-selected={alertTab === 'unread'}
                    className={`inv-tab${alertTab === 'unread' ? ' on' : ''}`}
                    onClick={() => setAlertTab('unread')}>
              Unread{stats.unreadAlerts > 0 ? ` (${stats.unreadAlerts})` : ''}
            </button>
          </div>

          {visibleAlerts.length === 0 ? (
            <div className="inv-empty-block">
              <FiCheckCircle size={22} color="var(--inv-green)" />
              <span>{alertTab === 'unread' ? 'No unread alerts' : 'All clear — no alerts'}</span>
            </div>
          ) : (
            <div className="inv-alert-list">
              {visibleAlerts.map((a) => {
                const meta = ALERT_META[a.alertType]
                  || { Icon: FiBell, color: 'var(--inv-muted)', label: a.alertType };
                const { Icon } = meta;
                return (
                  <div key={a.alertId} className={`inv-alert${a.isRead ? '' : ' unread'}`}>
                    <span className="inv-alert-ic" style={{ color: meta.color }}>
                      <Icon size={16} />
                    </span>
                    <div className="inv-alert-body">
                      <p>{a.message}</p>
                      <small>{meta.label} · {fmtDate(a.createdAt)}</small>
                    </div>
                    {!a.isRead && (
                      <button className="inv-mark" title="Mark as read"
                              onClick={() => markRead(a.alertId)}>
                        <FiCheck size={14} />
                      </button>
                    )}
                    {!a.isRead && <span className="inv-pip" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══ Zone 5: Quick actions ══ */}
      <section className="inv-actions">
        <Link to="/stock-in" className="inv-act in"><FiArrowUpCircle size={16} /> Stock in</Link>
        <Link to="/stock-out" className="inv-act out"><FiArrowDownCircle size={16} /> Stock out</Link>
        <Link to="/products/new" className="inv-act add"><FiPlusCircle size={16} /> Add product</Link>
        <Link to="/current-stock" className="inv-act view"><FiEye size={16} /> View inventory</Link>
      </section>

    </div>
  );
}