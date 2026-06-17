import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { reportApi } from '../api/reportApi';
import { alertApi } from '../api/alertApi';
import { stockApi } from '../api/stockApi';
import { toast } from 'react-toastify';
import {
  FiTrendingDown, FiRefreshCw, FiSearch, FiX, FiCalendar,
  FiPackage, FiHash, FiUser, FiDownload, FiAlertTriangle,
  FiCheckCircle, FiActivity, FiFilter, FiBell, FiCheck,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiClock, FiMapPin, FiTag, FiEdit2, FiRotateCcw, FiSlash
} from 'react-icons/fi';
import './QcApproved.css';   // reuse existing — no new CSS file

/* ─── helpers ─── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return '—'; }
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
};

const toInputDate = (d) => d.toISOString().split('T')[0];

const getPreset = (key) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (key) {
    case 'week': {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay());
      return { start: toInputDate(s), end: toInputDate(new Date()) };
    }
    case 'month': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toInputDate(s), end: toInputDate(new Date()) };
    }
    case 'last30': {
      const s = new Date(today);
      s.setDate(today.getDate() - 29);
      return { start: toInputDate(s), end: toInputDate(new Date()) };
    }
    case 'last90': {
      const s = new Date(today);
      s.setDate(today.getDate() - 89);
      return { start: toInputDate(s), end: toInputDate(new Date()) };
    }
    default: return { start: '', end: '' };
  }
};

/* ─── transaction type styles ─── */
const TX = {
  Production: { color: '#4f46e5', bg: '#eef2ff', label: 'Production' },
  Sale:       { color: '#059669', bg: '#ecfdf5', label: 'Sale'       },
  Damage:     { color: '#d97706', bg: '#fffbeb', label: 'Damage'     },
  Scrap:      { color: '#dc2626', bg: '#fef2f2', label: 'Scrap'      },
  Reversal:   { color: '#0891b2', bg: '#ecfeff', label: 'Reversal'   },
};

/* ─── role from JWT — accepts STORE_MANAGER, ROLE_STORE_MANAGER, or authorities[] ─── */
const getRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'OWNER';
    const p = JSON.parse(atob(token.split('.')[1]));
    let raw = p.role
      || p.authorities?.[0]?.authority
      || (Array.isArray(p.authorities) ? p.authorities[0] : null)
      || 'OWNER';
    if (typeof raw !== 'string') raw = String(raw);
    return raw.replace(/^ROLE_/, '').toUpperCase();   // ROLE_STORE_MANAGER → STORE_MANAGER
  } catch { return 'OWNER'; }
};

const PAGE_SIZE = 20;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/* ══════════════════════════════════════════════════
   CANCEL CONFIRM MODAL
══════════════════════════════════════════════════ */
const CancelModal = ({ group, onConfirm, onClose, loading }) => {
  const [reason, setReason] = useState('');
  const cfg = TX[group.transactionType] || TX.Production;
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ ...modalIcon, background: '#fee2e2', color: '#dc2626' }}>
          <FiRotateCcw size={24} />
        </div>
        <h2 style={modalTitle}>Cancel Stock OUT?</h2>
        <p style={modalSub}>
          This will <strong>reverse</strong> the entire transaction — exact lots
          will be restored to stock. This cannot be undone.
        </p>
        <div style={summaryBox}>
          <div style={summaryRow}>
            <span style={{ fontFamily: 'monospace', color: '#4f46e5', fontWeight: 700 }}>
              {group.partNumber}
            </span>
            <span style={{ padding: '2px 8px', background: cfg.bg, color: cfg.color, borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
              {group.transactionType}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {group.description || '—'} · <strong>{group.totalQty.toFixed(2)} units</strong>
            {group.rows.length > 1 && ` across ${group.rows.length} lots`}
          </div>
        </div>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (optional, e.g. 'wrong quantity entered')"
          style={modalInput}
        />
        <div style={modalActions}>
          <button style={btnGhost} onClick={onClose} disabled={loading}>Keep it</button>
          <button
            style={{ ...btnDanger, opacity: loading ? 0.6 : 1 }}
            onClick={() => onConfirm(reason)}
            disabled={loading}>
            {loading ? <><FiRefreshCw className="qca-spin" size={13} /> Reversing…</>
                     : <><FiRotateCcw size={13} /> Reverse & Restore</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   EDIT MODAL  (reverse + re-issue)
══════════════════════════════════════════════════ */
const EditModal = ({ group, onConfirm, onClose, loading }) => {
  const [form, setForm] = useState({
    quantity: group.totalQty,
    transactionType: group.transactionType,
    referenceNumber: group.referenceNumber || '',
    notes: group.notes || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const qty = parseFloat(form.quantity);
  const valid = qty > 0;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...modalIcon, background: '#eef2ff', color: '#4f46e5' }}>
          <FiEdit2 size={22} />
        </div>
        <h2 style={modalTitle}>Edit Stock OUT</h2>
        <p style={modalSub}>
          The original is fully reversed, then re-issued with your new values
          (FIFO re-runs on restored stock).
        </p>

        <div style={summaryBox}>
          <span style={{ fontFamily: 'monospace', color: '#4f46e5', fontWeight: 700 }}>
            {group.partNumber}
          </span>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
            {group.description || '—'}
          </span>
        </div>

        <label style={fieldLabel}>Quantity</label>
        <input
          type="number" step="0.01" min="0.01"
          value={form.quantity}
          onChange={e => set('quantity', e.target.value)}
          style={modalInput} autoFocus
        />

        <label style={fieldLabel}>Transaction Type</label>
        <select
          value={form.transactionType}
          onChange={e => set('transactionType', e.target.value)}
          style={modalInput}>
          {['Production', 'Sale', 'Damage', 'Scrap'].map(t =>
            <option key={t} value={t}>{t}</option>)}
        </select>

        <label style={fieldLabel}>Reference</label>
        <input
          type="text" value={form.referenceNumber}
          onChange={e => set('referenceNumber', e.target.value)}
          placeholder="WO-001…" style={modalInput}
        />

        <label style={fieldLabel}>Notes</label>
        <input
          type="text" value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Notes…" style={modalInput}
        />

        <div style={modalActions}>
          <button style={btnGhost} onClick={onClose} disabled={loading}>Cancel</button>
          <button
            style={{ ...btnPrimary, opacity: (!valid || loading) ? 0.6 : 1 }}
            onClick={() => onConfirm(form)}
            disabled={!valid || loading}>
            {loading ? <><FiRefreshCw className="qca-spin" size={13} /> Saving…</>
                     : <><FiCheck size={13} /> Reverse & Re-issue</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   STOCK OUT HISTORY PAGE
══════════════════════════════════════════════════ */
const StockOutHistory = () => {
  const role    = getRole();
  const isQc    = role === 'QC';
  const isOwner = role === 'OWNER';
  const canEdit = !isQc && (role === 'OWNER' || role === 'STORE_MANAGER');
  console.log('DEBUG role =', role, '| canEdit =', canEdit);   // ← add

  /* state */
  const [movements, setMovements]   = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [startDate, setStartDate]   = useState(() => getPreset('last30').start);
  const [endDate, setEndDate]       = useState(() => getPreset('last30').end);
  const [preset, setPreset]         = useState('last30');
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState(isQc ? 'Damage' : 'ALL');
  const [page, setPage]             = useState(1);
  const [activeTab, setActiveTab]   = useState('history');

  /* action modals */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editTarget, setEditTarget]     = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* fetch history */
  const fetchHistory = useCallback(async (sd, ed) => {
    if (!sd || !ed) return;
    try {
      setLoading(true);
      const res = await reportApi.getStockOutHistory(sd + 'T00:00:00', ed + 'T23:59:59');
      setMovements(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load stock out history');
      setMovements([]);
    } finally { setLoading(false); }
  }, []);

  /* fetch alerts (Owner / Manager only) */
  const fetchAlerts = useCallback(async () => {
    if (isQc) return;
    try {
      setAlertsLoading(true);
      const res = await alertApi.getStockOutAlerts();
      setAlerts(res.data.data || []);
    } catch {
      toast.error('Failed to load stock out alerts');
      setAlerts([]);
    } finally { setAlertsLoading(false); }
  }, [isQc]);

  useEffect(() => {
    fetchHistory(startDate, endDate);
    fetchAlerts();
  }, []);

  /* preset click */
  const applyPreset = (key) => {
    const { start, end } = getPreset(key);
    setStartDate(start); setEndDate(end); setPreset(key); setPage(1);
    fetchHistory(start, end);
  };

  /* manual apply */
  const handleApply = () => {
    if (!startDate || !endDate) { toast.warning('Select both dates'); return; }
    if (startDate > endDate) { toast.warning('Start must be before end'); return; }
    setPreset(''); setPage(1);
    fetchHistory(startDate, endDate);
  };

  /* mark alert as read */
  const markAlertRead = async (alertId) => {
    setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, isRead: true } : a));
    try { await alertApi.markAsRead(alertId); }
    catch { fetchAlerts(); }
  };

  const markAllAlertsRead = async () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    try {
      await alertApi.markAllStockOutAsRead();
      toast.success('All alerts marked as read');
    } catch { fetchAlerts(); }
  };

  /* ── CANCEL handler ── */
  const handleCancel = async (reason) => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await stockApi.cancelStockOut(cancelTarget.groupId, reason);
      toast.success('Stock OUT reversed — stock restored', { position: 'top-center' });
      setCancelTarget(null);
      fetchHistory(startDate, endDate);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to reverse stock out';
      toast.error(msg);
    } finally { setActionLoading(false); }
  };

  /* ── EDIT handler ── */
  const handleEdit = async (form) => {
    if (!editTarget) return;
    setActionLoading(true);
    try {
      await stockApi.editStockOut(editTarget.groupId, {
        productId:       editTarget.productId,
        quantity:        parseFloat(form.quantity),
        transactionType: form.transactionType,
        referenceNumber: form.referenceNumber,
        notes:           form.notes,
      });
      toast.success('Stock OUT edited successfully', { position: 'top-center' });
      setEditTarget(null);
      fetchHistory(startDate, endDate);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to edit stock out';
      toast.error(msg);
    } finally { setActionLoading(false); }
  };

  /* filter movements */
  const filtered = useMemo(() => {
    let list = movements;
    if (isQc) {
      list = list.filter(m => m.transactionType === 'Damage' || m.transactionType === 'Scrap');
    } else if (filterType !== 'ALL') {
      list = list.filter(m => m.transactionType === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        [m.partNumber, m.description, m.referenceNumber,
         m.performedBy, m.transactionType, m.categoryName]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [movements, filterType, search, isQc]);

  /* group movements by transactionGroupId (one OUT may span multiple lots) */
  const groups = useMemo(() => {
    const map = {};
    movements.forEach(m => {
      const g = m.transactionGroupId;
      if (!g) return;
      if (!map[g]) {
        map[g] = {
          groupId: g, productId: m.productId,
          partNumber: m.partNumber, description: m.description,
          categoryName: m.categoryName, transactionType: m.transactionType,
          referenceNumber: m.referenceNumber, notes: m.notes,
          movementDate: m.movementDate || m.createdAt,
          totalQty: 0, reversed: false, rows: [],
        };
      }
      map[g].totalQty += parseFloat(m.quantity || 0);
      map[g].reversed = map[g].reversed || !!m.reversed;
      map[g].rows.push(m);
    });
    return map;
  }, [movements]);

  /* stats */
  const stats = useMemo(() => ({
    total:      filtered.length,
    totalQty:   filtered.reduce((s, m) => s + parseFloat(m.quantity || 0), 0),
    production: filtered.filter(m => m.transactionType === 'Production').length,
    sale:       filtered.filter(m => m.transactionType === 'Sale').length,
    damage:     filtered.filter(m => m.transactionType === 'Damage').length,
    scrap:      filtered.filter(m => m.transactionType === 'Scrap').length,
  }), [filtered]);

  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filterType]);

  const pageNums = () => {
    let s = Math.max(1, safePage - 2), e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    const a = []; for (let i = s; i <= e; i++) a.push(i); return a;
  };

  /* CSV export */
  const exportCsv = () => {
    const headers = ['Part No', 'Description', 'Category', 'Qty', 'Type', 'Reference', 'Issued By', 'Location', 'Date', 'Status'];
    const rows = filtered.map(m => [
      m.partNumber, m.description, m.categoryName, m.quantity,
      m.transactionType, m.referenceNumber, m.performedBy || m.createdBy,
      m.rackName ? `${m.rackName}${m.boxLabel ? '/' + m.boxLabel : ''}` : '',
      fmtDateTime(m.movementDate || m.createdAt),
      m.reversed ? 'REVERSED' : 'Active'
    ].map(v => `"${v || ''}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stock-out-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  // tracks which groups already rendered an action button on this page
  const renderedGroups = new Set();

  /* ── render ── */
  return (
    <div className="qca-page">

      {/* ── HERO ── */}
      <div className="qca-hero">
        <div className="qca-hero-content">
          <div className="qca-hero-icon"
            style={{ background: isQc
              ? 'linear-gradient(135deg,#d97706,#b45309)'
              : 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            <FiTrendingDown size={20} />
          </div>
          <div>
            <h1 className="qca-hero-title">
              {isQc ? 'Damage & Scrap History' : 'Stock OUT History'}
            </h1>
            <p className="qca-hero-sub">
              {loading ? 'Loading…' : `${filtered.length} records · ${startDate} → ${endDate}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isQc && unreadAlerts > 0 && (
            <button className="qca-refresh"
              style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
              onClick={markAllAlertsRead}>
              <FiCheck size={13} /> Mark {unreadAlerts} alerts read
            </button>
          )}
          <button className="qca-refresh"
            style={{ borderColor: '#a7f3d0', color: '#059669' }}
            onClick={exportCsv} disabled={filtered.length === 0}>
            <FiDownload size={13} /> Export CSV
          </button>
          <button className="qca-refresh"
            onClick={() => { fetchHistory(startDate, endDate); fetchAlerts(); }}
            disabled={loading}>
            <FiRefreshCw size={13} className={loading ? 'qca-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="qca-stats">
        <div className="qca-stat" style={{ '--c': '#ef4444' }}>
          <FiActivity size={18} />
          <div>
            <div className="qca-stat-num">{stats.total}</div>
            <div className="qca-stat-label">Transactions</div>
          </div>
        </div>
        <div className="qca-stat" style={{ '--c': '#4f46e5' }}>
          <FiPackage size={18} />
          <div>
            <div className="qca-stat-num">{stats.totalQty.toFixed(0)}</div>
            <div className="qca-stat-label">Units Issued</div>
          </div>
        </div>
        <div className="qca-stat" style={{ '--c': '#d97706' }}>
          <FiAlertTriangle size={18} />
          <div>
            <div className="qca-stat-num">{stats.damage}</div>
            <div className="qca-stat-label">Damage</div>
          </div>
        </div>
        <div className="qca-stat" style={{ '--c': '#dc2626' }}>
          <FiAlertTriangle size={18} />
          <div>
            <div className="qca-stat-num">{stats.scrap}</div>
            <div className="qca-stat-label">Scrap</div>
          </div>
        </div>
        {!isQc && <>
          <div className="qca-stat" style={{ '--c': '#4f46e5' }}>
            <FiCheckCircle size={18} />
            <div>
              <div className="qca-stat-num">{stats.production}</div>
              <div className="qca-stat-label">Production</div>
            </div>
          </div>
          <div className="qca-stat" style={{ '--c': '#059669' }}>
            <FiCheckCircle size={18} />
            <div>
              <div className="qca-stat-num">{stats.sale}</div>
              <div className="qca-stat-label">Sale</div>
            </div>
          </div>
        </>}
      </div>

      {/* ── TABS (Owner/Manager only) ── */}
      {!isQc && (
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
          {[
            { key: 'history', label: 'History', icon: FiActivity },
            { key: 'alerts',  label: `Alerts${unreadAlerts > 0 ? ` (${unreadAlerts})` : ''}`, icon: FiBell },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', border: 'none', background: 'none',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                color: activeTab === key ? '#4f46e5' : '#64748b',
                borderBottom: activeTab === key ? '2px solid #4f46e5' : '2px solid transparent',
                marginBottom: -2, transition: 'all 0.15s'
              }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ══ TAB: ALERTS (Owner/Manager) ══ */}
      {!isQc && activeTab === 'alerts' && (
        <div className="qca-card" style={{ overflow: 'hidden' }}>
          {alertsLoading ? (
            <div className="qca-empty">
              <FiRefreshCw size={28} className="qca-spin" />
              <span>Loading alerts…</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="qca-empty">
              <FiCheckCircle size={34} style={{ color: '#059669' }} />
              <span style={{ fontWeight: 600, color: '#059669' }}>No stock out alerts yet</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {alerts.map((a) => {
                const type = a.transactionType ||
                  (a.message?.match(/Type: (\w+)/)?.[1]) || 'Production';
                const cfg = TX[type] || TX.Production;
                const severityColor = a.severity === 'HIGH' ? '#dc2626'
                  : a.severity === 'MEDIUM' ? '#d97706' : '#059669';
                const severityBg = a.severity === 'HIGH' ? '#fee2e2'
                  : a.severity === 'MEDIUM' ? '#fffbeb' : '#ecfdf5';
                return (
                  <div key={a.alertId} style={{
                    display: 'flex', gap: 14, padding: '14px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    background: !a.isRead ? '#fffbeb' : '#fff',
                    borderLeft: !a.isRead ? '3px solid #f59e0b' : '3px solid transparent',
                    transition: 'background 0.15s'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: cfg.bg, color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FiTrendingDown size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{
                          padding: '2px 8px', background: cfg.bg, color: cfg.color,
                          borderRadius: 5, fontSize: 10, fontWeight: 700
                        }}>{type}</span>
                        <span style={{
                          padding: '2px 8px', background: severityBg, color: severityColor,
                          borderRadius: 5, fontSize: 10, fontWeight: 700
                        }}>{a.severity}</span>
                        {!a.isRead && <span style={{
                          padding: '2px 8px', background: '#fef3c7', color: '#92400e',
                          borderRadius: 5, fontSize: 9, fontWeight: 800
                        }}>NEW</span>}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FiClock size={10} />
                          {fmtDateTime(a.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                        {a.message}
                      </p>
                      {!a.isRead && (
                        <button onClick={() => markAlertRead(a.alertId)}
                          style={{
                            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', background: 'transparent', border: '1px solid #e2e8f0',
                            borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            color: '#64748b', fontFamily: 'inherit'
                          }}>
                          <FiCheck size={11} /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: HISTORY ══ */}
      {(isQc || activeTab === 'history') && (
        <>
          {/* ── Date filter ── */}
          <div className="qca-card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <FiCalendar size={13} style={{ color: '#4f46e5', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginRight: 4 }}>Quick:</span>
              {[
                { key: 'week',   label: 'This Week'   },
                { key: 'month',  label: 'This Month'  },
                { key: 'last30', label: 'Last 30 Days'},
                { key: 'last90', label: 'Last 90 Days'},
              ].map(({ key, label }) => (
                <button key={key} onClick={() => applyPreset(key)}
                  style={{
                    height: 28, padding: '0 12px',
                    background: preset === key ? '#4f46e5' : '#f1f5f9',
                    color:      preset === key ? '#fff'    : '#475569',
                    border:     `1.5px solid ${preset === key ? '#4f46e5' : '#e2e8f0'}`,
                    borderRadius: 20, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Custom:</span>
              <input type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setPreset(''); }}
                style={{ width: 136, height: 32, padding: '0 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>→</span>
              <input type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setPreset(''); }}
                style={{ width: 136, height: 32, padding: '0 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={handleApply} disabled={loading}
                style={{
                  height: 32, padding: '0 16px',
                  background: '#4f46e5', color: '#fff', border: 'none',
                  borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', opacity: loading ? 0.6 : 1
                }}>
                {loading ? 'Loading…' : 'Apply'}
              </button>
            </div>
          </div>

          {/* ── Search + type filter ── */}
          <div className="qca-search-bar">
            <FiSearch size={14} className="qca-search-icon" />
            <input className="qca-search-input" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Part number, description, reference, issued by…" />
            {search && (
              <button className="qca-search-clear" onClick={() => setSearch('')}>
                <FiX size={13} />
              </button>
            )}
            {!isQc && (
              <div style={{ display: 'flex', gap: 6, marginLeft: 8, flexWrap: 'wrap' }}>
                {['ALL', 'Production', 'Sale', 'Damage', 'Scrap'].map(t => {
                  const cfg = TX[t];
                  const active = filterType === t;
                  return (
                    <button key={t} onClick={() => setFilterType(t)}
                      style={{
                        height: 26, padding: '0 11px',
                        background: active ? (cfg?.color || '#4f46e5') : '#fff',
                        color:      active ? '#fff'                     : (cfg?.color || '#64748b'),
                        border:     `1.5px solid ${active ? (cfg?.color || '#4f46e5') : '#e2e8f0'}`,
                        borderRadius: 20, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                        whiteSpace: 'nowrap'
                      }}>
                      {t === 'ALL' ? 'All Types' : t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div className="qca-card">
            <div className="qca-table-wrap">
              {loading ? (
                <div className="qca-empty">
                  <FiRefreshCw size={30} className="qca-spin" />
                  <span>Loading history…</span>
                </div>
              ) : paged.length === 0 ? (
                <div className="qca-empty">
                  <FiPackage size={34} style={{ color: '#94a3b8' }} />
                  <span style={{ fontWeight: 600, color: '#64748b' }}>
                    {search ? `No results for "${search}"` : 'No records for this period'}
                  </span>
                </div>
              ) : (
                <table className="qca-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>PART NO.</th>
                      <th>DESCRIPTION</th>
                      <th>CATEGORY</th>
                      <th>TYPE</th>
                      <th style={{ textAlign: 'right' }}>QTY</th>
                      <th>REFERENCE</th>
                      <th>ISSUED BY</th>
                      <th>LOCATION</th>
                      <th>DATE & TIME</th>
                      {canEdit && <th style={{ textAlign: 'center' }}>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((m, idx) => {
                      const cfg = TX[m.transactionType] || TX.Production;
                      const gId = m.transactionGroupId;
                      const grp = gId ? groups[gId] : null;
					  
					  console.log('DEBUG row', m.partNumber, '| gId =', gId, '| grp?', !!grp);   // ← add
					  
					  
                      const isReversed = !!m.reversed;

                      // 3-day rule: Owner unlimited, Store Manager only within 3 days
                      const movementDate = new Date(m.movementDate || m.createdAt);
                      const within3Days  = (Date.now() - movementDate.getTime()) <= THREE_DAYS_MS;
                      const allowedByTime = isOwner || within3Days;

                      // show action buttons only once per group (first row on this page)
                      const showActions = canEdit && grp && !renderedGroups.has(gId);
                      if (showActions) renderedGroups.add(gId);

                      return (
                        <tr key={m.movementId || m.id || idx}
                          className="qca-row"
                          style={isReversed ? { opacity: 0.55, background: '#fafafa' } : undefined}>
                          <td className="qca-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                          <td>
                            <span className="qca-batch-ref" style={{ color: '#4f46e5' }}>
                              <FiHash size={9} />{m.partNumber || '—'}
                            </span>
                          </td>
                          <td>
                            <span className="qca-truncate" title={m.description}
                              style={{ maxWidth: 180, textDecoration: isReversed ? 'line-through' : 'none' }}>
                              {m.description || '—'}
                            </span>
                          </td>
                          <td>
                            {m.categoryName
                              ? <span className="qca-chip"><FiTag size={9} /> {m.categoryName}</span>
                              : <span className="qca-faded">—</span>}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '3px 9px',
                              background: cfg.bg, color: cfg.color,
                              border: `1px solid ${cfg.color}33`,
                              borderRadius: 5, fontSize: 10, fontWeight: 700
                            }}>
                              {m.transactionType}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="qca-qty" style={{ color: cfg.color }}>
                              {parseFloat(m.quantity || 0).toFixed(2)}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }} className="qca-faded">
                            {m.referenceNumber || '—'}
                          </td>
                          <td>
                            <span className="qca-inspector">
                              <FiUser size={10} />
                              {m.performedBy || m.createdBy || '—'}
                            </span>
                          </td>
                          <td className="qca-faded" style={{ fontSize: 11 }}>
                            {m.rackName
                              ? <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <FiMapPin size={10} />
                                  {m.rackName}{m.boxLabel ? `/${m.boxLabel}` : ''}
                                </span>
                              : '—'}
                          </td>
                          <td className="qca-faded" style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                            {fmtDateTime(m.movementDate || m.createdAt)}
                          </td>

                          {/* ── ACTIONS ── */}
                          {canEdit && (
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {isReversed ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 9px', background: '#f1f5f9', color: '#94a3b8',
                                  borderRadius: 5, fontSize: 10, fontWeight: 700
                                }}>
                                  <FiSlash size={10} /> Reversed
                                </span>
                              ) : showActions ? (
                                allowedByTime ? (
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button
                                      onClick={() => setEditTarget(grp)}
                                      title="Edit (reverse + re-issue)"
                                      style={actionBtn('#4f46e5', '#eef2ff')}>
                                      <FiEdit2 size={12} /> Edit
                                    </button>
                                    <button
                                      onClick={() => setCancelTarget(grp)}
                                      title="Cancel (reverse)"
                                      style={actionBtn('#dc2626', '#fef2f2')}>
                                      <FiRotateCcw size={12} /> Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '3px 9px', background: '#fff7ed', color: '#c2410c',
                                    borderRadius: 5, fontSize: 10, fontWeight: 700
                                  }} title="Older than 3 days — only the Owner can reverse this">
                                    <FiClock size={10} /> 3-day limit
                                  </span>
                                )
                              ) : (
                                <span style={{ fontSize: 10, color: '#cbd5e1' }} title="Part of the transaction above">↳</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="qca-pagination">
                <span className="qca-pg-info">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="qca-pg-controls">
                  <button className="qca-pg-btn" onClick={() => setPage(1)} disabled={safePage === 1}>
                    <FiChevronsLeft size={12} />
                  </button>
                  <button className="qca-pg-btn" onClick={() => setPage(safePage - 1)} disabled={safePage === 1}>
                    <FiChevronLeft size={12} />
                  </button>
                  {pageNums().map(p => (
                    <button key={p}
                      className={`qca-pg-btn ${p === safePage ? 'qca-pg-active' : ''}`}
                      onClick={() => setPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="qca-pg-btn" onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}>
                    <FiChevronRight size={12} />
                  </button>
                  <button className="qca-pg-btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>
                    <FiChevronsRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MODALS ── */}
      {cancelTarget && (
        <CancelModal
          group={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => !actionLoading && setCancelTarget(null)}
          loading={actionLoading}
        />
      )}
      {editTarget && (
        <EditModal
          group={editTarget}
          onConfirm={handleEdit}
          onClose={() => !actionLoading && setEditTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

/* ─── inline style helpers (no new CSS file) ─── */
const actionBtn = (color, bg) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', background: bg, color,
  border: `1px solid ${color}33`, borderRadius: 6,
  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
});

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 20,
};
const modalBox = {
  background: '#fff', borderRadius: 16, padding: '28px 26px',
  width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  fontFamily: 'inherit',
};
const modalIcon = {
  width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modalTitle = { textAlign: 'center', fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' };
const modalSub   = { textAlign: 'center', fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 };
const summaryBox = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 14 };
const summaryRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const fieldLabel = { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', margin: '10px 0 4px' };
const modalInput = {
  width: '100%', height: 38, padding: '0 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const modalActions = { display: 'flex', gap: 10, marginTop: 18 };
const btnGhost   = { flex: 1, height: 40, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const btnPrimary = { flex: 1, height: 40, background: 'linear-gradient(135deg,#4f46e5,#4338ca)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
const btnDanger  = { flex: 1, height: 40, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 };

export default StockOutHistory;