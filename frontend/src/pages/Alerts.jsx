import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { qcApi } from '../api/qcApi';
import { toast } from 'react-toastify';
import {
  FiBell, FiAlertTriangle, FiPackage, FiClock, FiXCircle,
  FiCheck, FiCheckCircle, FiRefreshCw, FiX, FiArrowRight,
  FiInbox, FiZap, FiFilter, FiTrendingDown, FiTrash2,
  FiTrash, FiSearch, FiShield, FiActivity
} from 'react-icons/fi';
import './QcAlerts.css';

/* ── Alert type config ───────────────────────────────── */
const ALERT_CONFIG = {
  NEW_BATCH:        { label: 'New Batch',     icon: FiPackage,       color: '#3b82f6', bg: '#dbeafe' },
  REJECTED:         { label: 'Rejection',     icon: FiXCircle,       color: '#ef4444', bg: '#fee2e2' },
  HOLD_REMINDER:    { label: 'Hold Reminder', icon: FiClock,         color: '#8b5cf6', bg: '#ede9fe' },
  OVERDUE:          { label: 'Overdue',       icon: FiAlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
  STOCK_OUT_DAMAGE: { label: 'Damage OUT',    icon: FiAlertTriangle, color: '#d97706', bg: '#fffbeb' },
  STOCK_OUT_SCRAP:  { label: 'Scrap OUT',     icon: FiTrendingDown,  color: '#dc2626', bg: '#fef2f2' },
};

const SEVERITY_STYLE = {
  HIGH:   { color: '#dc2626', bg: '#fee2e2', label: 'High'   },
  MEDIUM: { color: '#d97706', bg: '#fef3c7', label: 'Medium' },
  LOW:    { color: '#0284c7', bg: '#e0f2fe', label: 'Low'    },
};

/* ── Poll intervals ──────────────────────────────────── */
const BADGE_POLL_MS   = 30_000;          // 30 sec  — check for NEW alerts (badge count only)
const OVERDUE_POLL_MS = 4 * 60 * 60_000; // 4 hours — full page reload (does NOT create alerts)
// NOTE: Alerts are created ONCE by backend when event happens (batch rejected, overdue etc.)
// The frontend only READS alerts — never triggers alert creation

/* ★ The raw-axios import and the hand-rolled auth() helper are gone: every
   call now goes through qcApi, so the interceptors (base URL, token refresh,
   401 handling) apply consistently. They only existed because qcApi had no
   delete / unread-count methods, so this file reached around the API layer. */

/* ════════════════════════════════════════════════════════
   DELETE CONFIRM MODAL
   ════════════════════════════════════════════════════════ */
const DeleteModal = ({ count, onConfirm, onCancel }) => (
  <div className="qa-modal-overlay" onClick={onCancel}>
    <div className="qa-modal" onClick={e => e.stopPropagation()}>
      <div className="qa-modal-icon"><FiTrash size={28} /></div>
      <h3 className="qa-modal-title">Delete {count > 1 ? `${count} alerts` : 'alert'}?</h3>
      <p className="qa-modal-body">
        This cannot be undone. The alert{count > 1 ? 's' : ''} will be permanently removed.
      </p>
      <div className="qa-modal-actions">
        <button className="qa-modal-cancel" onClick={onCancel}>Cancel</button>
        <button className="qa-modal-confirm" onClick={onConfirm}>
          <FiTrash size={13} /> Delete
        </button>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
const QcAlerts = () => {
  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filterType,   setFilterType]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(new Set()); // selected alert IDs
  const [deleteModal,  setDeleteModal]  = useState(null); // null | 'single' | 'bulk' | 'read'
  const [deletingId,   setDeletingId]   = useState(null);
  const [nextRefresh,  setNextRefresh]  = useState(null); // countdown display
  const prevUnread = useRef(0);
  const overdueTimer = useRef(null);
  const badgeTimer   = useRef(null);
  const countdownTimer = useRef(null);

  /* ── Load all alerts ─────────────────────────────────
     ★ FIX: the old signature was load(silent). One boolean carried two
     unrelated concerns — which spinner to show AND whether to toast — and
     they drifted into opposite meanings: load(true) showed a toast (not
     silent at all) while load(false) blanked the page to a full-screen
     spinner. The 4-hour auto-refresh is a THIRD case needing neither, so it
     picked the closest-looking flag and got it exactly backwards.

     Three real modes, named:
       'initial' — first mount:      full-page spinner, no toast
       'manual'  — user hit Refresh: inline spinner + confirmation toast
       'auto'    — background poll:  nothing at all (actually silent)
  ── */
  const load = useCallback(async (mode = 'initial') => {
    try {
      if (mode === 'initial') setLoading(true);
      else if (mode === 'manual') setRefreshing(true);

      const res  = await qcApi.getAlerts();
      const data = res.data?.data || [];

      // ★ FIX: prevUnread now has ONE writer — this function. pollBadge used
      //   to update it too, and because load() is async-and-unawaited the
      //   synchronous write in pollBadge always won the race, so this
      //   comparison was permanently false and the toast was dead code.
      const unread = data.filter(a => !a.isRead).length;
      if (mode !== 'initial' && unread > prevUnread.current) {
        const diff = unread - prevUnread.current;
        toast.info(`🔔 ${diff} new QC alert${diff > 1 ? 's' : ''}!`, { autoClose: 3000 });
      }
      prevUnread.current = unread;

      setAlerts(data);
      if (mode === 'manual') toast.success('Alerts refreshed', { autoClose: 1200 });
    } catch {
      if (mode !== 'auto') toast.error('Failed to load alerts');
      if (mode === 'initial') setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* ── Badge poll (30s) ────────────────────────────── */
  const pollBadge = useCallback(async () => {
    try {
      // ★ FIX: was raw axios + hand-rolled auth header, bypassing the
      //   interceptors the rest of the file relies on.
      const res   = await qcApi.getUnreadAlertsCount();
      const count = res.data?.data?.count ?? 0;

      // ★ FIX: do NOT write prevUnread here. It is load()'s to own — this
      //   write used to land before the awaited load() could read it, which
      //   silently killed the "new alert" toast.
      if (count > prevUnread.current) load('manual');
    } catch { /* badge poll failing is not worth a toast */ }
  }, [load]);

  /* ── Setup timers ────────────────────────────────── */
  useEffect(() => {
    load('initial');

    // Badge poll every 30 seconds
    badgeTimer.current = setInterval(pollBadge, BADGE_POLL_MS);

    // Background reload every 4 hours. Reads only — the backend raises alerts.
    const resetOverdue = () => {
      setNextRefresh(Date.now() + OVERDUE_POLL_MS);
      overdueTimer.current = setTimeout(() => {
        load('auto');   // ★ FIX: was load(false), which blanked the list to a
                        //   full-page spinner every 4 hours. The comment said
                        //   "quiet reload"; it was the loudest option available.
        resetOverdue();
      }, OVERDUE_POLL_MS);
    };
    resetOverdue();

    return () => {
      clearInterval(badgeTimer.current);
      clearTimeout(overdueTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [load, pollBadge]);

  /* ── Countdown display ───────────────────────────────
     ★ FIX: was setNextRefresh(prev => prev) — setting state to the value it
     already holds. React bails out on an Object.is-equal update, so it
     rendered nothing and the countdown sat frozen forever.

     The mistake was using state as a render trigger. The value that actually
     changes every minute is the CLOCK, not the deadline — so tick the clock.
  ── */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    countdownTimer.current = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(countdownTimer.current);
  }, []);

  const fmtCountdown = () => {
    if (!nextRefresh) return '';
    const ms = nextRefresh - now;
    if (ms <= 0) return 'refreshing…';
    const hrs = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  /* ── Mark read ───────────────────────────────────── */
  const handleMarkRead = async (alertId) => {
    setAlerts(prev => prev.map(a =>
      a.alertId === alertId ? { ...a, isRead: true, readAt: new Date().toISOString() } : a
    ));
    try { await qcApi.markAlertAsRead(alertId); }
    catch { toast.error('Failed'); load('manual'); }
  };

  const handleMarkAllRead = async () => {
    const unread = alerts.filter(a => !a.isRead).length;
    if (!unread) return;
    setAlerts(prev => prev.map(a => a.isRead ? a : { ...a, isRead: true, readAt: new Date().toISOString() }));
    try {
      await qcApi.markAllAlertsAsRead();
      toast.success(`${unread} alerts marked as read`);
    } catch { toast.error('Failed'); load('manual'); }
  };

  /* ── Delete ──────────────────────────────────────── */
  const doDelete = async (ids) => {
    try {
      // ★ FIX: was Promise.all(ids.map(id => axios.delete(...))) — one HTTP
      //   request per alert. "Delete all read (27)" fired 27 requests, and a
      //   partial failure left the list half-deleted with no way to tell.
      //   DELETE /api/qc/alerts/bulk already existed server-side; qcApi just
      //   had no method for it, so the component reached around the API layer
      //   and looped the single-delete. One call now.
      if (ids.length === 1) await qcApi.deleteAlert(ids[0]);
      else                  await qcApi.deleteAlertsBulk(ids);

      setAlerts(prev => prev.filter(a => !ids.includes(a.alertId)));
      setSelected(new Set());
      toast.success(`${ids.length} alert${ids.length > 1 ? 's' : ''} deleted`);
    } catch {
      toast.error('Delete failed');
      load('manual');
    } finally {
      setDeleteModal(null);
      setDeletingId(null);
    }
  };

  const handleDeleteSingle = (alertId) => {
    setDeletingId(alertId);
    setDeleteModal('single');
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    setDeleteModal('bulk');
  };

  const handleDeleteRead = () => {
    const readIds = alerts.filter(a => a.isRead).map(a => a.alertId);
    if (readIds.length === 0) { toast.info('No read alerts to delete'); return; }
    setDeleteModal('read');
  };

  const confirmDelete = () => {
    if (deleteModal === 'single') doDelete([deletingId]);
    else if (deleteModal === 'bulk') doDelete([...selected]);
    else if (deleteModal === 'read') doDelete(alerts.filter(a => a.isRead).map(a => a.alertId));
  };

  const deleteCount = deleteModal === 'single' ? 1
    : deleteModal === 'bulk' ? selected.size
    : alerts.filter(a => a.isRead).length;

  /* ── Selection ───────────────────────────────────── */
  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const clearSel  = () => setSelected(new Set());

  /* ★ Recurrence helpers removed — alerts fire once and never repeat, so
     there is no occurrence count and no next-due to show. createdAt is both
     when the problem started and when it was reported. */

  /* ── Filter ──────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = alerts;
    if (filterType !== 'all')      list = list.filter(a => a.alertType === filterType);
    if (filterStatus === 'unread') list = list.filter(a => !a.isRead);
    if (filterStatus === 'read')   list = list.filter(a => a.isRead);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        [a.title, a.message, a.alertType].filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [alerts, filterType, filterStatus, search]);

  /* ── Group by date ───────────────────────────────── */
  const grouped = useMemo(() => {
    const today = [], yesterday = [], thisWeek = [], earlier = [];
    const ref = new Date();          // renamed: `now` is state in this scope
    const t0  = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const t1  = new Date(t0); t1.setDate(t1.getDate() - 1);
    const t7  = new Date(t0); t7.setDate(t7.getDate() - 7);
    filtered.forEach(a => {
      const d = new Date(a.createdAt);
      if (d >= t0)      today.push(a);
      else if (d >= t1) yesterday.push(a);
      else if (d >= t7) thisWeek.push(a);
      else              earlier.push(a);
    });
    return { today, yesterday, thisWeek, earlier };
  }, [filtered]);

  const stats = useMemo(() => ({
    total:  alerts.length,
    unread: alerts.filter(a => !a.isRead).length,
    high:   alerts.filter(a => a.severity === 'HIGH').length,
    read:   alerts.filter(a => a.isRead).length,
  }), [alerts]);

  const availableTypes = useMemo(() => {
    const s = new Set(); alerts.forEach(a => s.add(a.alertType)); return [...s];
  }, [alerts]);

  const fmtTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) return (
    <div className="qa-loading">
      <div className="qa-spinner"/>
      <span>Loading alerts…</span>
    </div>
  );

  return (
    <div className="qa-page">

      {/* ── HEADER ── */}
      <div className="qa-header">
        <div className="qa-header-left">
          <div className="qa-header-icon">
            <FiBell size={20}/>
            {stats.unread > 0 && <span className="qa-header-badge">{stats.unread}</span>}
          </div>
          <div>
            <h1 className="qa-title">QC Alerts</h1>
            <p className="qa-subtitle">
              {stats.unread > 0
                ? <><strong>{stats.unread}</strong> unread · auto-refresh in {fmtCountdown()}</>
                : <>All caught up · next refresh in {fmtCountdown()}</>}
            </p>
          </div>
        </div>
        <div className="qa-header-actions">
          {/* Poll info badge */}
          <span className="qa-poll-badge">
            <FiActivity size={11}/> Live · 30s
          </span>
          <button className="qa-btn-secondary" onClick={() => load('manual')} disabled={refreshing}>
            <FiRefreshCw size={13} className={refreshing ? 'qa-spin' : ''}/> Refresh
          </button>
          {stats.unread > 0 && (
            <button className="qa-btn-primary" onClick={handleMarkAllRead}>
              <FiCheckCircle size={13}/> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="qa-stats">
        <button className={`qa-stat qa-stat-total ${filterStatus==='all'?'active':''}`}
          onClick={() => setFilterStatus('all')}>
          <FiBell size={18}/><div><strong>{stats.total}</strong><span>Total</span></div>
        </button>
        <button className={`qa-stat qa-stat-unread ${filterStatus==='unread'?'active':''}`}
          onClick={() => setFilterStatus('unread')}>
          <FiZap size={18}/><div><strong>{stats.unread}</strong><span>Unread</span></div>
        </button>
        <button className="qa-stat qa-stat-high">
          <FiAlertTriangle size={18}/><div><strong>{stats.high}</strong><span>High Priority</span></div>
        </button>
        <button className={`qa-stat qa-stat-read ${filterStatus==='read'?'active':''}`}
          onClick={() => setFilterStatus('read')}>
          <FiCheckCircle size={18}/><div><strong>{stats.read}</strong><span>Read</span></div>
        </button>
      </div>

      {/* ── SEARCH + FILTERS ── */}
      <div className="qa-card qa-controls-card">
        {/* Search */}
        <div className="qa-search-row">
          <FiSearch size={14} className="qa-search-icon"/>
          <input
            className="qa-search-input"
            placeholder="Search alerts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="qa-search-clear" onClick={() => setSearch('')}><FiX size={12}/></button>}
        </div>

        {/* Type pills */}
        <div className="qa-filter-section">
          <FiFilter size={13} className="qa-filter-icon"/>
          <span className="qa-filter-label">Type:</span>
          <button className={`qa-pill ${filterType==='all'?'active':''}`} onClick={() => setFilterType('all')}>
            All <span className="qa-pill-count">{alerts.length}</span>
          </button>
          {availableTypes.map(t => {
            const cfg = ALERT_CONFIG[t] || { label: t, icon: FiBell, color: '#64748b', bg: '#f1f5f9' };
            const Icon = cfg.icon;
            const count = alerts.filter(a => a.alertType === t).length;
            const active = filterType === t;
            return (
              <button key={t}
                className={`qa-pill ${active?'active':''}`}
                onClick={() => setFilterType(t)}
                style={active ? { background: cfg.color, borderColor: cfg.color, color: '#fff' } : { color: cfg.color }}>
                <Icon size={11}/> {cfg.label}
                <span className="qa-pill-count" style={active ? { background: 'rgba(255,255,255,0.25)' } : {}}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="qa-bulk-bar">
            <span className="qa-bulk-count">{selected.size} selected</span>
            <button className="qa-bulk-btn read" onClick={() => {
              [...selected].forEach(id => handleMarkRead(id));
              clearSel();
            }}>
              <FiCheck size={12}/> Mark read
            </button>
            <button className="qa-bulk-btn delete" onClick={handleDeleteSelected}>
              <FiTrash2 size={12}/> Delete selected
            </button>
            <button className="qa-bulk-btn clear" onClick={clearSel}>
              <FiX size={12}/> Clear
            </button>
          </div>
        )}
      </div>

      {/* ── MANAGEMENT ROW ── */}
      <div className="qa-mgmt-row">
        <button className="qa-mgmt-btn"
          onClick={() => setSelected(new Set(filtered.map(a => a.alertId)))}>
          <FiCheckCircle size={12}/> Select all ({filtered.length})
        </button>
        {stats.read > 0 && (
          <button className="qa-mgmt-btn danger" onClick={handleDeleteRead}>
            <FiTrash2 size={12}/> Delete all read ({stats.read})
          </button>
        )}
        <span className="qa-mgmt-info">
          Showing {filtered.length} of {alerts.length} alerts
        </span>
      </div>

      {/* ── ALERT LIST ── */}
      {filtered.length === 0 ? (
        <div className="qa-empty">
          <div className="qa-empty-icon"><FiInbox size={40}/></div>
          <h3>{filterStatus==='unread' ? "You're all caught up!" : 'No alerts'}</h3>
          <p>{filterStatus==='unread' ? 'No unread QC alerts.' : 'Try a different filter.'}</p>
        </div>
      ) : (
        <div className="qa-list">
          {Object.entries(grouped).map(([key, list]) => {
            if (!list.length) return null;
            const labels = { today:'Today', yesterday:'Yesterday', thisWeek:'Earlier this week', earlier:'Earlier' };
            return (
              <div key={key} className="qa-group">
                <div className="qa-group-header">
                  <span className="qa-group-title">{labels[key]}</span>
                  <span className="qa-group-count">{list.length}</span>
                </div>
                <div className="qa-group-items">
                  {list.map(a => {
                    const cfg = ALERT_CONFIG[a.alertType] || { label: a.alertType, icon: FiBell, color: '#64748b', bg: '#f1f5f9' };
                    const sev = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.MEDIUM;
                    const Icon = cfg.icon;
                    const isSel = selected.has(a.alertId);
                    return (
                      <div key={a.alertId}
                        className={`qa-card-item ${!a.isRead?'unread':''} ${isSel?'selected':''}`}
                        style={{ '--type-color': cfg.color }}>

                        {/* Color strip */}
                        <div className="qa-strip" style={{ background: cfg.color }}/>

                        {/* Checkbox */}
                        <div className="qa-checkbox-wrap" onClick={() => toggleSelect(a.alertId)}>
                          <div className={`qa-checkbox ${isSel?'checked':''}`}>
                            {isSel && <FiCheck size={10}/>}
                          </div>
                        </div>

                        {/* Icon */}
                        <div className="qa-card-icon" style={{ background: cfg.bg, color: cfg.color }}>
                          <Icon size={18}/>
                        </div>

                        {/* Body */}
                        <div className="qa-card-body">
                          <div className="qa-card-meta">
                            <span className="qa-type-badge" style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <span className="qa-sev-badge" style={{ background: sev.bg, color: sev.color }}>
                              {sev.label}
                            </span>
                            {!a.isRead && <span className="qa-new-dot">NEW</span>}
                            <span className="qa-time">{fmtTime(a.createdAt)}</span>
                          </div>
                          <h4 className="qa-card-title">{a.title}</h4>
                          <p className="qa-card-message">{a.message}</p>
                          <div className="qa-card-footer">
                            {a.batchId && (
                              <Link to={`/qc/batches/${a.batchId}`} className="qa-link-btn">
                                Open batch <FiArrowRight size={11}/>
                              </Link>
                            )}
                            {a.inspectionId && (
                              <Link to="/qc/history" className="qa-link-btn">
                                View inspection <FiArrowRight size={11}/>
                              </Link>
                            )}
                            {!a.isRead && (
                              <button className="qa-mark-btn" onClick={() => handleMarkRead(a.alertId)}>
                                <FiCheck size={11}/> Mark read
                              </button>
                            )}
                            <button className="qa-delete-btn" onClick={() => handleDeleteSingle(a.alertId)}>
                              <FiTrash2 size={11}/> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteModal && (
        <DeleteModal
          count={deleteCount}
          onConfirm={confirmDelete}
          onCancel={() => { setDeleteModal(null); setDeletingId(null); }}
        />
      )}
    </div>
  );
};

export default QcAlerts;