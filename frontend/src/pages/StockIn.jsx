import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { stockApi } from '../api/stockApi';
import { productApi } from '../api/productApi';
import { supplierApi } from '../api/supplierApi';
import { rackApi } from '../api/rackApi';
import { boxApi } from '../api/boxApi';
import { categoryApi } from '../api/categoryApi';
import Invoices from './Invoices';
import { toast } from 'react-toastify';
import {
  FiPlus, FiSearch, FiX, FiShoppingCart, FiPackage,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiTrash2, FiEdit2, FiCheckCircle, FiList, FiArrowLeft,
  FiAlertTriangle, FiFileText, FiGrid, FiRefreshCw,
  FiZap, FiSave, FiRotateCw, FiPrinter, FiCalendar,
  FiUser, FiHash, FiDollarSign, FiMapPin, FiInfo, FiLock
} from 'react-icons/fi';
import axios from 'axios';
import './StockIn.css';
import BomImport from './BomImport';

// ─── Units ───────────────────────────────────────────────────
const UNITS = [
  { v: 'PCS',    label: 'pcs'    },
  { v: 'METER',  label: 'm'      },
  { v: 'LITER',  label: 'L'      },
  { v: 'KG',     label: 'kg'     },
  { v: 'PACKET', label: 'packet' },
  { v: 'NOS',    label: 'nos'    },
];
const UKEY    = 'si-product-units';
const getUnit = (pid) => { if (!pid) return 'PCS'; try { return JSON.parse(localStorage.getItem(UKEY) || '{}')[pid] || 'PCS'; } catch { return 'PCS'; } };
const setUnit = (pid, u) => { if (!pid) return; try { const m = JSON.parse(localStorage.getItem(UKEY) || '{}'); m[pid] = u; localStorage.setItem(UKEY, JSON.stringify(m)); } catch {} };
const uShort  = (u) => UNITS.find(x => x.v === u)?.label || 'pcs';

// ─── ★ API ERROR EXTRACTOR ───────────────────────────────────
// Pulls the REAL reason out of any backend error:
//   1. Spring @Valid field errors → "purchasePrice: Purchase price must be positive"
//   2. ApiResponse.error(message) → the message string
//   3. Network / axios error      → e.message ("Network Error", timeout…)
//   4. Fallback text
const apiErr = (e, fallback = 'Something went wrong') => {
  const d = e?.response?.data;
  if (d?.errors && typeof d.errors === 'object' && Object.keys(d.errors).length > 0) {
    return Object.entries(d.errors).map(([field, msg]) => `${field}: ${msg}`).join(' · ');
  }
  if (typeof d?.message === 'string' && d.message.trim()) return d.message;
  if (typeof d === 'string' && d.trim()) return d;
  if (e?.message) {
    if (e.message === 'Network Error') return 'Cannot reach server — check backend is running';
    return e.message;
  }
  return fallback;
};

// Uniform toast helpers so every alert looks consistent
const toastErr  = (msg, ms = 5000) => toast.error(`⛔ ${msg}`,  { autoClose: ms });
const toastWarn = (msg, ms = 4000) => toast.warn(`⚠️ ${msg}`,   { autoClose: ms });
const toastOk   = (msg, ms = 1500) => toast.success(msg,        { autoClose: ms });
const toastInfo = (msg, ms = 2500) => toast.info(msg,           { autoClose: ms });

// ─── Reason / reference helpers ──────────────────────────────
// YYYYMMDD stamp for auto-generated references (e.g. INTERNAL-20260707)
const dateStamp = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};
const INTERNAL_REF = () => `INTERNAL-${dateStamp()}`;

const REASON_OPTIONS = [
  { v: 'INVOICE',  label: 'Has Invoice' },
  { v: 'INTERNAL', label: 'Internal / Already in store' },
];

// ─── Draft ───────────────────────────────────────────────────
const DRAFT_KEY  = 'sx-cart-draft';
const saveDraft  = (cart, sticky) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ cart, sticky, savedAt: new Date().toISOString() })); } catch {} };
const loadDraft  = () => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };
const timeAgo    = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ─── Status ──────────────────────────────────────────────────
const STATUS = {
  PENDING_QC:       { label: 'Pending',  color: '#92400e', bg: '#fef3c7', icon: '⏳' },
  QC_APPROVED:      { label: 'Approved', color: '#065f46', bg: '#d1fae5', icon: '✓'  },
  QC_REJECTED:      { label: 'Rejected', color: '#991b1b', bg: '#fee2e2', icon: '✕'  },
  PARTIAL_APPROVED: { label: 'Partial',  color: '#9a3412', bg: '#ffedd5', icon: '◐'  },
  QC_HOLD:          { label: 'Hold',     color: '#6b21a8', bg: '#f3e8ff', icon: '⏸'  },
};
const StatusPill = ({ status }) => {
  const c = STATUS[status] || { label: status, color: '#64748b', bg: '#f1f5f9', icon: '•' };
  return (
    <span className="sx-status" style={{ background: c.bg, color: c.color }}>
      <span>{c.icon}</span>{c.label}
    </span>
  );
};

// ─── Formatters ──────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; }
};
const fmtDateShort = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return '—'; }
};
const fmtCurrency = (n) => {
  const num = parseFloat(n || 0);
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const VIEW = { MAIN: 'main', ADD: 'add', BATCHES: 'batches', REJECTED: 'rejected', BOM: 'bom', INVOICES: 'invoices' };

// ════════════════════════════════════════════════════════════
// SUB-PAGE SLIM HEADER
// ════════════════════════════════════════════════════════════
const SubBar = ({ icon, tone = '', title, meta, children }) => (
  <div className="sx-subbar sx-animate-in">
    <div className={`sx-subbar-icon ${tone}`}>{icon}</div>
    <span className="sx-subbar-title">{title}</span>
    {meta && <span className="sx-subbar-meta">{meta}</span>}
    <div className="sx-subbar-right">{children}</div>
  </div>
);

// ════════════════════════════════════════════════════════════
// INVOICE BILL VIEW
// ════════════════════════════════════════════════════════════
const InvoiceBill = ({ batch, lots, loading }) => {
  if (loading) {
    return (
      <div className="sx-bill-skeleton">
        <FiRefreshCw size={24} className="sx-spin" />
        <span>Loading invoice details…</span>
      </div>
    );
  }

  const totalQty   = lots.reduce((s, l) => s + parseFloat(l.purchaseQuantity || 0), 0);
  const subtotal   = lots.reduce((s, l) => s + (parseFloat(l.purchaseQuantity || 0) * parseFloat(l.purchasePrice || 0)), 0);
  const totalGst   = lots.reduce((s, l) => s + parseFloat(l.gstAmount || 0), 0);
  const grandTotal = subtotal + totalGst;

  return (
    <div className="sx-bill">
      <div className="sx-bill-head">
        <div className="sx-bill-brand">
          <div className="sx-bill-logo"><FiFileText size={22} /></div>
          <div>
            <h2 className="sx-bill-title">INVOICE DETAILS</h2>
            <div className="sx-bill-batch">Batch: <strong>{batch.batchRef}</strong></div>
          </div>
        </div>
        <div className="sx-bill-status-wrap">
          <StatusPill status={batch.qcStatus} />
          <button className="sx-bill-print" onClick={() => window.print()}>
            <FiPrinter size={12} /> Print
          </button>
        </div>
      </div>

      <div className="sx-bill-meta-grid">
        <div className="sx-bill-meta-cell">
          <div className="sx-bill-meta-icon"><FiHash size={13} /></div>
          <div>
            <div className="sx-bill-meta-k">Invoice No.</div>
            <div className="sx-bill-meta-v">{batch.invoiceNo || '—'}</div>
          </div>
        </div>
        <div className="sx-bill-meta-cell">
          <div className="sx-bill-meta-icon"><FiUser size={13} /></div>
          <div>
            <div className="sx-bill-meta-k">Supplier</div>
            <div className="sx-bill-meta-v">{batch.supplierName || '—'}</div>
          </div>
        </div>
        <div className="sx-bill-meta-cell">
          <div className="sx-bill-meta-icon"><FiCalendar size={13} /></div>
          <div>
            <div className="sx-bill-meta-k">Received Date</div>
            <div className="sx-bill-meta-v">{fmtDate(batch.receivedDate)}</div>
          </div>
        </div>
        <div className="sx-bill-meta-cell">
          <div className="sx-bill-meta-icon"><FiPackage size={13} /></div>
          <div>
            <div className="sx-bill-meta-k">Line Items</div>
            <div className="sx-bill-meta-v">{lots.length} items</div>
          </div>
        </div>
      </div>

      {lots.length === 0 ? (
        <div className="sx-empty sx-empty-sm">
          <FiPackage size={24} /><span>No line items in this invoice</span>
        </div>
      ) : (
        <div className="sx-bill-table-wrap">
          <table className="sx-bill-table">
            <colgroup>
              <col style={{ width: '34px'  }} />
              <col style={{ width: '13%'   }} />
              <col style={{ width: '19%'   }} />
              <col style={{ width: '9%'    }} />
              <col style={{ width: '12%'   }} />
              <col style={{ width: '10%'   }} />
              <col style={{ width: '8%'    }} />
              <col style={{ width: '5%'    }} />
              <col style={{ width: '9%'    }} />
              <col style={{ width: '8%'    }} />
              <col style={{ width: '10%'   }} />
            </colgroup>
            <thead>
              <tr>
                <th className="sx-center">#</th>
                <th>Part No.</th>
                <th>Description</th>
                <th>Category</th>
                <th>Lot Number</th>
                <th>Location</th>
                <th>HSN</th>
                <th className="sx-right">Qty</th>
                <th className="sx-right">Rate (₹)</th>
                <th className="sx-right">GST</th>
                <th className="sx-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l, idx) => {
                const qty   = parseFloat(l.purchaseQuantity || 0);
                const rate  = parseFloat(l.purchasePrice || 0);
                const base  = qty * rate;
                const gstA  = parseFloat(l.gstAmount || 0);
                const total = base + gstA;
                const loc   = l.rackName
                  ? `${l.rackName}${l.boxLabel ? ' / ' + l.boxLabel : ''}`
                  : null;
                return (
                  <tr key={l.lotId} className="sx-bill-row" style={{ animationDelay: `${idx * 30}ms` }}>
                    <td className="sx-center sx-num-cell">{idx + 1}</td>
                    <td><div className="sx-clip-cell sx-mono-sm" title={l.partNumber}>{l.partNumber || '—'}</div></td>
                    <td><div className="sx-clip-cell" title={l.description}>{l.description || '—'}</div></td>
                    <td>{l.categoryName ? <span className="sx-chip">{l.categoryName}</span> : <span className="sx-faded">—</span>}</td>
                    <td><div className="sx-clip-cell sx-faded" title={l.lotNumber}>{l.lotNumber || '—'}</div></td>
                    <td>
                      {loc
                        ? <div className="sx-clip-cell" title={loc}><span className="sx-loc"><FiMapPin size={9} />{loc}</span></div>
                        : <span className="sx-faded">—</span>}
                    </td>
                    <td className="sx-faded">{l.hsnCode || '—'}</td>
                    <td className="sx-right sx-qty">{qty}</td>
                    <td className="sx-right sx-mono-num">{fmtCurrency(rate)}</td>
                    <td className="sx-right">
                      {l.gstPercent
                        ? <span className="sx-gst-cell">
                            <span className="sx-gst-pct">{l.gstPercent}%</span>
                            <span className="sx-gst-amt">₹{fmtCurrency(gstA)}</span>
                          </span>
                        : <span className="sx-faded">—</span>}
                    </td>
                    <td className="sx-right sx-bill-total">₹{fmtCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lots.length > 0 && (
        <div className="sx-bill-totals">
          <div className="sx-bill-totals-card">
            <div className="sx-bill-total-row">
              <span>Total Quantity</span>
              <strong className="sx-mono">{totalQty}</strong>
            </div>
            <div className="sx-bill-total-row">
              <span>Subtotal (Base)</span>
              <strong>₹{fmtCurrency(subtotal)}</strong>
            </div>
            <div className="sx-bill-total-row">
              <span>Total GST</span>
              <strong>₹{fmtCurrency(totalGst)}</strong>
            </div>
            <div className="sx-bill-total-row sx-bill-grand">
              <span>Grand Total</span>
              <strong>₹{fmtCurrency(grandTotal)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// BATCH EDIT MODAL
// ════════════════════════════════════════════════════════════
const BatchEditModal = ({ batch, suppliers, onClose, onSaved }) => {
  const [form, setForm] = useState({
    supplierId:   batch.supplier?.supplierId || batch.supplierId || '',
    invoiceNo:    batch.invoiceNo   || '',
    receivedDate: batch.receivedDate ? batch.receivedDate.split('T')[0] : '',
    notes:        batch.notes       || '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        invoiceNo:    form.invoiceNo    || null,
        receivedDate: form.receivedDate || null,
        notes:        form.notes        || null,
        supplierId:   form.supplierId !== '' ? parseInt(form.supplierId) : 0,
      };
      const r = await axios.patch(
        `/api/stock/batches/${batch.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toastOk('Batch updated!');
      onSaved(r.data.data);
      onClose();
    } catch (e) {
      // ★ 409 = not PENDING_QC · 404 = batch gone · 400 = bad supplier
      const status = e?.response?.status;
      let msg = apiErr(e, 'Batch save failed');
      if (status === 409) msg = `Cannot edit — ${msg}`;
      if (status === 404) msg = `Batch not found on server — refresh the list. (${msg})`;
      setErr(msg);
      toastErr(msg);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const missingFields = [];
  if (!form.supplierId)   missingFields.push('Supplier');
  if (!form.invoiceNo)    missingFields.push('Invoice No.');
  if (!form.receivedDate) missingFields.push('Received Date');

  return (
    <div className="sx-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sx-modal">
        <div className="sx-modal-head">
          <div className="sx-modal-head-left">
            <div className="sx-modal-icon"><FiEdit2 size={16} /></div>
            <div>
              <div className="sx-modal-title">Edit Batch Details</div>
              <div className="sx-modal-sub">
                <span className="sx-mono">{batch.batchRef}</span>
                &nbsp;·&nbsp;
                <StatusPill status={batch.qcStatus} />
              </div>
            </div>
          </div>
          <button className="sx-modal-close" onClick={onClose} title="Close (Esc)">
            <FiX size={16} />
          </button>
        </div>

        {missingFields.length > 0 && (
          <div className="sx-modal-warn">
            <FiAlertTriangle size={13} />
            <span>Missing: <strong>{missingFields.join(', ')}</strong></span>
          </div>
        )}

        <div className="sx-modal-body">
          <div className="sx-modal-field">
            <label className="sx-modal-label">
              <FiUser size={11} /> Supplier
              {!form.supplierId && <span className="sx-modal-req">required</span>}
            </label>
            <select
              className={`sx-modal-input ${!form.supplierId ? 'sx-modal-input-warn' : ''}`}
              value={form.supplierId}
              onChange={e => set('supplierId', e.target.value)}
            >
              <option value="">— Select supplier —</option>
              {suppliers.map(s => (
                <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
              ))}
            </select>
          </div>

          <div className="sx-modal-field">
            <label className="sx-modal-label">
              <FiHash size={11} /> Invoice Number
              {!form.invoiceNo && <span className="sx-modal-req">required</span>}
            </label>
            <input
              className={`sx-modal-input ${!form.invoiceNo ? 'sx-modal-input-warn' : ''}`}
              value={form.invoiceNo}
              onChange={e => set('invoiceNo', e.target.value)}
              placeholder="e.g. INV-2026-0042"
            />
          </div>

          <div className="sx-modal-field">
            <label className="sx-modal-label"><FiCalendar size={11} /> Received Date</label>
            <input
              type="date"
              className="sx-modal-input"
              value={form.receivedDate}
              onChange={e => set('receivedDate', e.target.value)}
            />
          </div>

          <div className="sx-modal-field">
            <label className="sx-modal-label"><FiInfo size={11} /> Notes / Remarks</label>
            <textarea
              className="sx-modal-input sx-modal-textarea"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="QC notes, delivery remarks…"
            />
          </div>

          {err && (
            <div className="sx-modal-err">
              <FiAlertTriangle size={12} /> {err}
            </div>
          )}
        </div>

        <div className="sx-modal-foot">
          <div className="sx-modal-foot-info">
            <FiInfo size={11} /> Only PENDING batches can be edited
          </div>
          <div className="sx-modal-foot-actions">
            <button className="sx-modal-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="sx-modal-save" onClick={save} disabled={saving}>
              {saving
                ? <><FiRefreshCw size={13} className="sx-spin" /> Saving…</>
                : <><FiCheckCircle size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// MY STOCK-INS PAGE
// ════════════════════════════════════════════════════════════
const MyStockInsPage = ({ suppliers = [] }) => {
  const [batches, setBatches]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('all');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [expandedId, setExpandedId]     = useState(null);
  const [lotsByBatch, setLotsByBatch]   = useState({});
  const [loadingLots, setLoadingLots]   = useState({});
  const [editingBatch, setEditingBatch] = useState(null);
  const [qcProgress, setQcProgress]     = useState({});
  const PS = 15;

  const loadQcProgress = async () => {
    try {
      const t = localStorage.getItem('token');
      const r = await axios.get('/api/qc/progress/batches', {
        headers: { Authorization: `Bearer ${t}` },
      });
      setQcProgress(r.data?.data || {});
    } catch { /* badge is optional — ignore errors */ }
  };

  useEffect(() => { loadQcProgress(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await axios.get('/api/stock/batches/all', {
        headers: { Authorization: `Bearer ${t}` },
      });
      setBatches(r.data.data || []);
      await loadQcProgress();
    } catch (e) {
      toastErr(apiErr(e, 'Failed to load batches'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const loadLots = async (batchId) => {
    if (lotsByBatch[batchId]) return;
    try {
      setLoadingLots(prev => ({ ...prev, [batchId]: true }));
      const t = localStorage.getItem('token');
      const r = await axios.get(`/api/stock/batches/${batchId}/lots`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setLotsByBatch(prev => ({ ...prev, [batchId]: r.data.data || [] }));
    } catch (e) {
      toastErr(apiErr(e, 'Failed to load invoice items'));
    } finally {
      setLoadingLots(prev => ({ ...prev, [batchId]: false }));
    }
  };

  const toggleExpand = (batchId) => {
    if (expandedId === batchId) { setExpandedId(null); }
    else { setExpandedId(batchId); loadLots(batchId); }
  };

  const handleBatchSaved = (updated) => {
    setBatches(prev =>
      prev.map(b =>
        b.id === updated.id
          ? { ...b, invoiceNo: updated.invoiceNo, supplierName: updated.supplierName, receivedDate: updated.receivedDate, notes: updated.notes }
          : b
      )
    );
  };

  const counts = useMemo(() => {
    const c = { all: batches.length, PENDING_QC: 0, QC_APPROVED: 0, QC_REJECTED: 0, PARTIAL_APPROVED: 0 };
    batches.forEach(b => { if (c[b.qcStatus] !== undefined) c[b.qcStatus]++; });
    return c;
  }, [batches]);

  const filtered = useMemo(() => {
    let l = batches;
    if (tab !== 'all') l = l.filter(b => b.qcStatus === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(b =>
        [b.batchRef, b.invoiceNo, b.supplierName]
          .filter(Boolean)
          .some(f => f.toLowerCase().includes(q))
      );
    }
    return l;
  }, [batches, tab, search]);

  const tp = Math.max(1, Math.ceil(filtered.length / PS));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp - 1) * PS, sp * PS);
  useEffect(() => { setPage(1); setExpandedId(null); }, [tab, search]);

  const TABS = [
    { v: 'all',              label: 'All',      n: counts.all,              c: '#4f46e5' },
    { v: 'PENDING_QC',       label: 'Pending',  n: counts.PENDING_QC,       c: '#f59e0b' },
    { v: 'QC_APPROVED',      label: 'Approved', n: counts.QC_APPROVED,      c: '#10b981' },
    { v: 'QC_REJECTED',      label: 'Rejected', n: counts.QC_REJECTED,      c: '#ef4444' },
    { v: 'PARTIAL_APPROVED', label: 'Partial',  n: counts.PARTIAL_APPROVED, c: '#f97316' },
  ];

  return (
    <div className="sx-view">
      {editingBatch && (
        <BatchEditModal
          batch={editingBatch}
          suppliers={suppliers}
          onClose={() => setEditingBatch(null)}
          onSaved={handleBatchSaved}
        />
      )}

      <SubBar
        icon={<FiList size={15} />}
        title="My Stock-In Batches"
        meta={loading ? 'Loading…' : `${filtered.length} of ${batches.length} batches`}
      >
        <button className="sx-icon-btn" onClick={load} disabled={loading} title="Refresh">
          <FiRefreshCw size={14} className={loading ? 'sx-spin' : ''} />
        </button>
      </SubBar>

      <div className="sx-stats-grid">
        {TABS.map((t, i) => (
          <button
            key={t.v}
            className={`sx-stat-card ${tab === t.v ? 'sx-stat-active' : ''}`}
            onClick={() => setTab(t.v)}
            style={{ '--c': t.c, animationDelay: `${i * 50}ms` }}
          >
            <div className="sx-stat-label"><span className="sx-stat-dot" /> {t.label}</div>
            <div className="sx-stat-num">{t.n}</div>
          </button>
        ))}
      </div>

      <div className="sx-card sx-animate-in" style={{ animationDelay: '200ms' }}>
        <div className="sx-card-search">
          <FiSearch size={15} className="sx-search-icon" />
          <input
            className="sx-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice no., batch ref, supplier…"
          />
          {search && (
            <button className="sx-clear" onClick={() => setSearch('')}>
              <FiX size={13} />
            </button>
          )}
        </div>

        {search.trim() && (
          <div className={`sx-search-bar ${filtered.length === 0 ? 'sx-search-bar-empty' : ''}`}>
            {filtered.length === 0
              ? <><FiAlertTriangle size={12} /><span>No results for <em>"{search}"</em></span></>
              : <><FiFileText size={12} /><span>Found <strong>{filtered.length}</strong> batch{filtered.length > 1 ? 'es' : ''} matching <em>"{search}"</em></span></>}
          </div>
        )}

        <div className="sx-table-wrap">
          {loading ? (
            <div className="sx-empty"><FiRefreshCw size={32} className="sx-spin" /></div>
          ) : paged.length === 0 ? (
            <div className="sx-empty"><FiPackage size={36} /><span>No batches found</span></div>
          ) : (
            <table className="sx-grid-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th style={{ width: 36 }}>#</th>
                  <th>BATCH REF</th>
                  <th>INVOICE NO.</th>
                  <th>SUPPLIER</th>
                  <th>DATE</th>
                  <th style={{ width: 60 }}>ITEMS</th>
                  <th style={{ width: 70 }}>QTY</th>
                  <th style={{ width: 100 }}>STATUS</th>
                  <th style={{ width: 64, textAlign: 'center' }}>EDIT</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((b, i) => {
                  const isOpen          = expandedId === b.id;
                  const isPending       = b.qcStatus === 'PENDING_QC';
                  const missingSupplier = !b.supplierName;
                  const missingInvoice  = !b.invoiceNo;
                  const isInvMatch      = search.trim() && b.invoiceNo?.toLowerCase().includes(search.toLowerCase());

                  return (
                    <Fragment key={b.id || i}>
                      <tr
                        className={`sx-grid-row sx-grid-row-clickable ${isOpen ? 'sx-row-open' : ''} ${isInvMatch ? 'sx-row-inv-match' : ''}`}
                        onClick={() => toggleExpand(b.id)}
                      >
                        <td className="sx-expand-cell">
                          <FiChevronRight size={14} className={`sx-chevron ${isOpen ? 'sx-chevron-open' : ''}`} />
                        </td>
                        <td className="sx-num">{(sp - 1) * PS + i + 1}</td>
                        <td><span className="sx-mono">{b.batchRef || '—'}</span></td>

                        <td>
                          {b.invoiceNo
                            ? <span className={`sx-invoice-val ${isInvMatch ? 'sx-invoice-highlight' : ''}`}>{b.invoiceNo}</span>
                            : isPending
                              ? <span className="sx-missing-badge"><FiAlertTriangle size={10} /> missing</span>
                              : <span className="sx-faded">—</span>}
                        </td>

                        <td>
                          {b.supplierName
                            ? b.supplierName
                            : isPending
                              ? <span className="sx-missing-badge"><FiAlertTriangle size={10} /> missing</span>
                              : <span className="sx-faded">—</span>}
                        </td>

                        <td className="sx-faded">{fmtDateShort(b.receivedDate)}</td>
                        <td><span className="sx-chip">{b.itemCount || 0}</span></td>
                        <td className="sx-qty">{b.totalQty?.toFixed ? b.totalQty.toFixed(0) : b.totalQty || 0}</td>

                        <td>
                          {b.qcStatus === 'PENDING_QC' ? (
                            <span className="sib-badge-pending">
                              <StatusPill status={b.qcStatus} />
                              {qcProgress[b.id]?.decided > 0 && (
                                <span className="sib-progress-chip">
                                  {qcProgress[b.id].decided}/{qcProgress[b.id].total} done
                                </span>
                              )}
                            </span>
                          ) : (
                            <StatusPill status={b.qcStatus} />
                          )}
                        </td>

                        <td className="sx-edit-cell" onClick={e => { e.stopPropagation(); if (isPending) setEditingBatch(b); }}>
                          {isPending ? (
                            <button
                              className={`sx-batch-edit-btn ${missingSupplier || missingInvoice ? 'sx-batch-edit-btn-warn' : ''}`}
                              title="Edit batch"
                            >
                              <FiEdit2 size={12} />
                              {(missingSupplier || missingInvoice) && <span className="sx-edit-dot" />}
                            </button>
                          ) : (
                            <span className="sx-edit-locked" title="Locked after QC">
                              <FiLock size={12} />
                            </span>
                          )}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="sx-detail-row">
                          <td colSpan={10}>
                            <InvoiceBill
                              batch={b}
                              lots={lotsByBatch[b.id] || []}
                              loading={loadingLots[b.id]}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > PS && (
          <div className="sx-pagination">
            <span className="sx-pg-info">{`${(sp - 1) * PS + 1}–${Math.min(sp * PS, filtered.length)} of ${filtered.length}`}</span>
            <div className="sx-pg-controls">
              <button className="sx-pg-btn" onClick={() => setPage(1)} disabled={sp === 1}><FiChevronsLeft size={13} /></button>
              <button className="sx-pg-btn" onClick={() => setPage(sp - 1)} disabled={sp === 1}><FiChevronLeft size={13} /></button>
              {Array.from({ length: Math.min(5, tp) }, (_, k) => Math.max(1, Math.min(sp - 2, tp - 4)) + k).map(p => (
                <button key={p} className={`sx-pg-btn ${p === sp ? 'sx-pg-active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="sx-pg-btn" onClick={() => setPage(sp + 1)} disabled={sp === tp}><FiChevronRight size={13} /></button>
              <button className="sx-pg-btn" onClick={() => setPage(tp)} disabled={sp === tp}><FiChevronsRight size={13} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// REJECTED PAGE
// ════════════════════════════════════════════════════════════
const RejectedPage = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await axios.get('/api/stock/batches/rejected', { headers: { Authorization: `Bearer ${t}` } });
      setBatches(r.data.data || []);
    } catch (e) {
      toastErr(apiErr(e, 'Failed to load rejected batches'));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.toLowerCase();
    return batches.filter(b =>
      [b.batchRef, b.invoiceNo, b.supplierName, b.notes].filter(Boolean).some(f => f.toLowerCase().includes(q))
    );
  }, [batches, search]);

  return (
    <div className="sx-view">
      <SubBar
        icon={<FiAlertTriangle size={15} />}
        tone="sx-subbar-icon-red"
        title="Rejected Batches"
        meta={loading ? 'Loading…' : `${filtered.length} of ${batches.length} rejected`}
      >
        <button className="sx-icon-btn" onClick={load} disabled={loading}>
          <FiRefreshCw size={14} className={loading ? 'sx-spin' : ''} />
        </button>
      </SubBar>

      <div className="sx-card sx-animate-in">
        <div className="sx-card-search">
          <FiSearch size={15} className="sx-search-icon" />
          <input className="sx-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
        </div>
        <div className="sx-table-wrap">
          {loading
            ? <div className="sx-empty"><FiRefreshCw size={32} className="sx-spin" /></div>
            : filtered.length === 0
              ? <div className="sx-empty"><FiCheckCircle size={40} style={{ color: '#10b981' }} /><span style={{ color: '#065f46', fontWeight: 600 }}>No rejected batches</span></div>
              : (
                <table className="sx-grid-table">
                  <thead>
                    <tr><th>#</th><th>BATCH</th><th>INVOICE</th><th>SUPPLIER</th><th>DATE</th><th>ITEMS</th><th>QTY LOST</th><th>NOTES</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((b, i) => (
                      <tr key={b.id || i} className="sx-grid-row sx-row-bad">
                        <td className="sx-num">{i + 1}</td>
                        <td><span className="sx-mono" style={{ color: '#dc2626' }}>{b.batchRef || '—'}</span></td>
                        <td className="sx-faded">{b.invoiceNo || '—'}</td>
                        <td className="sx-strong">{b.supplierName || '—'}</td>
                        <td className="sx-faded">{fmtDateShort(b.receivedDate)}</td>
                        <td><span className="sx-chip sx-chip-warn">{b.itemCount || 0}</span></td>
                        <td className="sx-qty" style={{ color: '#dc2626' }}>{b.totalQty?.toFixed ? b.totalQty.toFixed(0) : b.totalQty || 0}</td>
                        <td className="sx-faded sx-truncate-cell" title={b.notes}>{b.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </div>
      </div>
    </div>
  );
};


// ════════════════════════════════════════════════════════════
// ADD STOCK PAGE
// ★ Reason-aware validation (INVOICE vs INTERNAL)
// ★ Every failure now raises a SPECIFIC toast:
//    - which cart row / part failed
//    - which field the backend rejected
//    - HTTP status meaning (401/403/404/409/400/network)
// ════════════════════════════════════════════════════════════
const AddStockPage = ({ onSuccess, products, suppliers, racks, categories, reloadAll }) => {
  const today = new Date().toISOString().split('T')[0];
  const blank = {
    partNumber: '', description: '', categoryId: '', categoryName: '',
    packageType: '', manufacturerPn: '', make: '', hsnCode: '', gstPercent: '',
    quantity: '', unitOfMeasure: 'PCS', purchasePrice: '',
    rackId: '', boxId: '', remarks: '',
  };

  const [sticky, setSticky]             = useState({ supplierId: '', invoiceReason: 'INVOICE', invoiceNumber: '', purchaseDate: today });
  const [cart, setCart]                 = useState([]);
  const [editIdx, setEditIdx]           = useState(null);
  const [row, setRow]                   = useState(blank);
  const [boxes, setBoxes]               = useState([]);
  const [productState, setProductState] = useState('empty');
  const [matched, setMatched]           = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState('existing');
  const [selectedCatId, setSelectedCatId]   = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [catText, setCatText]     = useState('');
  const [showCatDD, setShowCatDD] = useState(false);
  const [draftFound, setDraftFound]     = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const catRef = useRef(null);

  useEffect(() => { const d = loadDraft(); if (d && d.cart?.length > 0) setDraftFound(d); }, []);
  useEffect(() => { if (cart.length > 0) { saveDraft(cart, sticky); setDraftSavedAt(new Date().toISOString()); } }, [cart, sticky]);
  useEffect(() => { const h = (e) => { if (cart.length > 0) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [cart]);
  useEffect(() => { const h = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setShowCatDD(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => {
    if (!row.rackId) { setBoxes([]); return; }
    boxApi.getByRack(row.rackId)
      .then(r => setBoxes(r.data.data || []))
      .catch((e) => { setBoxes([]); toastWarn(apiErr(e, 'Could not load boxes for this rack')); });
  }, [row.rackId]);

  const productsInSelectedCategory = useMemo(() => { if (!selectedCatId) return []; return products.filter(p => p.category?.categoryId === parseInt(selectedCatId)); }, [selectedCatId, products]);

  const handleSelectExistingProduct = (prodId) => {
    setSelectedProdId(prodId);
    if (!prodId) { setRow(prev => ({ ...prev, partNumber: '', description: '', categoryId: '', categoryName: '' })); setProductState('empty'); setMatched(null); return; }
    const p = products.find(x => x.productId === parseInt(prodId));
    if (!p) { toastErr('Selected product not found in catalog — refresh the page'); return; }
    setProductState('existing'); setMatched(p);
    setRow(prev => ({ ...prev, partNumber: p.partNumber || '', description: p.description || '', categoryId: p.category?.categoryId || '', categoryName: p.category?.categoryName || '', packageType: p.packageType || '', manufacturerPn: p.manufacturerPn || '', make: p.make || '', hsnCode: p.hsnCode || '', gstPercent: p.gstPercent !== undefined && p.gstPercent !== null ? String(p.gstPercent) : '', purchasePrice: prev.purchasePrice || p.unitPrice || '', rackId: prev.rackId || p.rack?.rackId || '', boxId: prev.boxId || p.box?.boxId || '', unitOfMeasure: getUnit(p.productId) || 'PCS' }));
  };
  const handleProductFieldChange = (field, value) => { if (field === 'partNumber' || field === 'description') { setProductState('new'); setMatched(null); } setRow(prev => ({ ...prev, [field]: value })); };
  const pickCategoryFresh = (c) => { setRow(prev => ({ ...prev, categoryId: c.categoryId, categoryName: c.categoryName })); setCatText(c.categoryName); setShowCatDD(false); };
  const filteredCats = useMemo(() => { if (!catText.trim()) return categories; const q = catText.toLowerCase(); return categories.filter(c => (c.categoryName || '').toLowerCase().includes(q) || (c.categoryCode || '').toLowerCase().includes(q)); }, [categories, catText]);

  // ★ Reason-aware validation with a SPECIFIC message for every failure
  const validate = () => {
    const isInternal = sticky.invoiceReason === 'INTERNAL';

    // 1. A real product must exist in BOTH modes — backend cannot create a lot without one
    if (activeWorkflow === 'existing' && !matched?.productId)
      return 'Select a product first (Category → Component)';
    if (activeWorkflow === 'fresh' && !row.categoryId)
      return 'Select a Category — required to register the new product';

    // 2. Quantity is ALWAYS required — a 0-qty lot is invalid even for internal stock
    if (!row.quantity || isNaN(parseFloat(row.quantity)))
      return 'Enter Qty — quantity is required';
    if (parseFloat(row.quantity) <= 0)
      return `Qty must be greater than 0 (you entered ${row.quantity})`;

    // 3. Price rules by reason:
    //    INVOICE  → must be > 0
    //    INTERNAL → 0 or above allowed; blank treated as 0; negative blocked
    if (!isInternal) {
      if (!row.purchasePrice || isNaN(parseFloat(row.purchasePrice)))
        return 'Enter Price — required when reason is "Has Invoice"';
      if (parseFloat(row.purchasePrice) <= 0)
        return `Price must be greater than 0 for invoice stock (you entered ${row.purchasePrice})`;
    } else {
      if (row.purchasePrice && parseFloat(row.purchasePrice) < 0)
        return 'Price cannot be negative';
    }

    // 4. GST sanity (both modes)
    if (row.gstPercent && (parseFloat(row.gstPercent) < 0 || parseFloat(row.gstPercent) > 100))
      return `GST % must be between 0 and 100 (you entered ${row.gstPercent})`;

    // 5. Duplicate check
    if (row.partNumber?.trim()) {
      const dup = cart.findIndex((it, i) =>
        i !== editIdx && it.partNumber &&
        it.partNumber.toLowerCase() === row.partNumber.trim().toLowerCase());
      if (dup !== -1) return `"${row.partNumber.trim()}" is already in cart at row #${dup + 1} — edit that row instead`;
    }
    return null;
  };

  const buildItem = () => {
    const qty = parseFloat(row.quantity) || 0; const price = parseFloat(row.purchasePrice) || 0; const gstPct = parseFloat(row.gstPercent) || 0;
    const baseValue = qty * price; const gstAmount = baseValue * gstPct / 100;
    const r = racks.find(x => x.rackId === parseInt(row.rackId)); const b = boxes.find(x => x.boxId === parseInt(row.boxId));
    return { isNew: productState === 'new', existingProductId: matched?.productId || null, partNumber: row.partNumber.trim() || matched?.partNumber || null, description: row.description || matched?.description || null, categoryId: parseInt(row.categoryId) || null, categoryName: row.categoryName, packageType: row.packageType, manufacturerPn: row.manufacturerPn, make: row.make, hsnCode: row.hsnCode || null, gstPercent: row.gstPercent || null, quantity: qty, purchasePrice: price, baseValue, gstAmount, totalValue: baseValue + gstAmount, unitOfMeasure: row.unitOfMeasure || 'PCS', rackId: parseInt(row.rackId) || null, boxId: parseInt(row.boxId) || null, rackDisp: r?.rackName || r?.rackNumber || '—', boxDisp: b?.boxLabel || b?.boxNumber || '—', remarks: row.remarks || null };
  };
  const addToCart = () => {
    const err = validate();
    if (err) { toastErr(err); return; }
    const it = buildItem();
    if (editIdx !== null) { const c = [...cart]; c[editIdx] = it; setCart(c); toastOk(`Row #${editIdx + 1} updated`); setEditIdx(null); }
    else { setCart([...cart, it]); toastOk(`Added "${it.partNumber || it.description || 'item'}" · ${cart.length + 1} in cart`); }
    if (matched?.productId) setUnit(matched.productId, row.unitOfMeasure);
    setRow(prev => ({ ...blank, rackId: prev.rackId, boxId: prev.boxId }));
    setSelectedCatId(''); setSelectedProdId(''); setCatText(''); setProductState('empty'); setMatched(null);
  };
  const editCart = (i) => { const it = cart[i]; setEditIdx(i); if (!it.isNew && it.existingProductId) { setActiveWorkflow('existing'); const p = products.find(x => x.productId === it.existingProductId); if (p?.category?.categoryId) { setSelectedCatId(String(p.category.categoryId)); setSelectedProdId(String(p.productId)); } } else { setActiveWorkflow('fresh'); setCatText(it.categoryName || ''); } setRow({ partNumber: it.partNumber || '', description: it.description || '', categoryId: it.categoryId || '', categoryName: it.categoryName || '', packageType: it.packageType || '', manufacturerPn: it.manufacturerPn || '', make: it.make || '', hsnCode: it.hsnCode || '', gstPercent: it.gstPercent || '', quantity: it.quantity || '', unitOfMeasure: it.unitOfMeasure || 'PCS', purchasePrice: it.purchasePrice || '', rackId: it.rackId || '', boxId: it.boxId || '', remarks: it.remarks || '' }); setProductState(it.isNew ? 'new' : 'existing'); setMatched(it.existingProductId ? products.find(p => p.productId === it.existingProductId) : null); window.scrollTo({ top: 200, behavior: 'smooth' }); };
  const removeCart = (i) => { const name = cart[i]?.partNumber || cart[i]?.description || `row #${i + 1}`; setCart(cart.filter((_, j) => j !== i)); if (editIdx === i) { setEditIdx(null); setRow(blank); setCatText(''); setSelectedCatId(''); setSelectedProdId(''); } toastInfo(`Removed "${name}" from cart`); };
  const clearAll = () => { if (!window.confirm('Clear cart?')) return; setCart([]); setEditIdx(null); setRow(blank); setCatText(''); setSelectedCatId(''); setSelectedProdId(''); clearDraft(); setDraftSavedAt(null); toastInfo('Cart cleared'); };

  const submit = async () => {
    // ── PRE-FLIGHT CHECKS — each failure names its exact cause ──
    if (cart.length === 0) { toastWarn('Cart is empty — add at least one item before submitting'); return; }

    const isInternal = sticky.invoiceReason === 'INTERNAL';

    if (!isInternal && !sticky.supplierId) {
      toastErr('SUPPLIER is required when reason is "Has Invoice" — select one at the top');
      return;
    }
    if (!isInternal && !sticky.invoiceNumber?.trim()) {
      toastErr('INVOICE NO. is required when reason is "Has Invoice" — enter it at the top');
      return;
    }
    if (!sticky.purchaseDate) {
      toastErr('DATE is missing — pick the purchase / received date at the top');
      return;
    }

    // Cart-level sanity re-check (in case a draft was restored with bad rows)
    for (let i = 0; i < cart.length; i++) {
      const it = cart[i];
      if (!it.isNew && !it.existingProductId) {
        toastErr(`Cart row #${i + 1} ("${it.partNumber || it.description || '?'}") has no product linked — remove and re-add it`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        toastErr(`Cart row #${i + 1} ("${it.partNumber || it.description || '?'}") has invalid quantity — edit the row`);
        return;
      }
      if (!isInternal && (!it.purchasePrice || it.purchasePrice <= 0)) {
        toastErr(`Cart row #${i + 1} ("${it.partNumber || it.description || '?'}") has price ₹0 but reason is "Has Invoice" — edit the row or switch reason to Internal`);
        return;
      }
    }

    const resolvedRef = isInternal
      ? (sticky.invoiceNumber?.trim() || INTERNAL_REF())
      : sticky.invoiceNumber.trim();
    const supplierIdNum = sticky.supplierId ? parseInt(sticky.supplierId) : null;

    if (isInternal) {
      toastInfo(`Internal stock — reference "${resolvedRef}" will be used${supplierIdNum ? '' : ' (no supplier)'}`, 3000);
    }

    if (!window.confirm(`Submit ${cart.length} item${cart.length > 1 ? 's' : ''} to QC?`)) return;
    setSubmitting(true);
    const createdProductsTrack = [];
    try {
      const token = localStorage.getItem('token');
      if (!token) { toastErr('You are not logged in — session token missing. Log in again.'); setSubmitting(false); return; }

      const stocks = [];
      for (let i = 0; i < cart.length; i++) {
        const it = cart[i];
        let pid;
        if (it.isNew) {
          // ── PRODUCT REGISTRATION — name the exact row that fails ──
          let r;
          try {
            r = await axios.post('/api/products', { categoryId: it.categoryId, partNumber: it.partNumber, description: it.description, packageType: it.packageType || null, manufacturerPn: it.manufacturerPn || null, make: it.make || null, hsnCode: it.hsnCode || null, gstPercent: it.gstPercent ? parseFloat(it.gstPercent) : null, unitPrice: it.purchasePrice || 0, supplierId: supplierIdNum, rackId: it.rackId, boxId: it.boxId, isActive: true }, { headers: { Authorization: `Bearer ${token}` } });
          } catch (pe) {
            throw new Error(`Row #${i + 1} "${it.partNumber || it.description || 'new item'}" — product registration failed: ${apiErr(pe)}`);
          }
          pid = r.data?.data?.productId || r.data?.productId;
          if (!pid) throw new Error(`Row #${i + 1} "${it.partNumber || it.description || 'new item'}" — server did not return a product ID`);
          createdProductsTrack.push(pid);
          if (it.unitOfMeasure) setUnit(pid, it.unitOfMeasure);
        } else { pid = it.existingProductId; }
        stocks.push({ productId: pid, supplierId: supplierIdNum, quantity: it.quantity || 0, purchasePrice: it.purchasePrice || 0, purchaseDate: sticky.purchaseDate, rackId: it.rackId, boxId: it.boxId, referenceNumber: resolvedRef, notes: it.remarks, hsnCode: it.hsnCode, gstPercent: it.gstPercent ? parseFloat(it.gstPercent) : null });
      }

      if (stocks.length === 1) {
        await axios.post('/api/stock/in', stocks[0], { headers: { Authorization: `Bearer ${token}` } });
      } else {
        // ── BULK: server returns per-item success/failure — report each failed item ──
        const br = await axios.post('/api/stock/in/bulk', { supplierId: supplierIdNum, invoiceNumber: resolvedRef, items: stocks }, { headers: { Authorization: `Bearer ${token}` } });
        const bulk = br.data?.data;
        if (bulk && bulk.failedCount > 0) {
          const fails = (bulk.results || []).filter(x => !x.success);
          fails.slice(0, 3).forEach((f, k) => {
            toastErr(`Item failed: ${f.partNumber || 'productId ' + f.productId || '#' + (k + 1)} — ${f.errorMessage || 'unknown reason'}`, 8000);
          });
          if (fails.length > 3) toastErr(`…and ${fails.length - 3} more items failed. Check "My Batches".`, 8000);
          if (bulk.successCount > 0) toastWarn(`Partial: ${bulk.successCount} succeeded, ${bulk.failedCount} failed`, 6000);
          if (bulk.successCount === 0) throw new Error('All items failed — nothing was stocked in');
        }
      }

      toastOk(`🎉 ${cart.length} item${cart.length > 1 ? 's' : ''} sent to QC! Ref: ${resolvedRef}`, 3000);
      setCart([]); setRow(blank); setCatText(''); setSelectedCatId(''); setSelectedProdId(''); clearDraft(); setDraftSavedAt(null);
      await reloadAll(); onSuccess();
    } catch (e) {
      // ── ROLLBACK any products created before the failure ──
      if (createdProductsTrack.length > 0) {
        toastWarn(`Rolling back ${createdProductsTrack.length} newly created product(s)…`, 3000);
        for (const p of createdProductsTrack) {
          try { await axios.delete(`/api/products/${p}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); }
          catch (de) { toastErr(`Rollback failed for productId ${p} — delete it manually. (${apiErr(de)})`, 8000); }
        }
      }
      // ── NAME THE REAL CAUSE by HTTP status ──
      const status = e?.response?.status;
      let msg = apiErr(e, 'Failed processing transaction');
      if (status === 400) msg = `Backend rejected the data → ${msg}`;
      else if (status === 401) msg = 'Session expired — log in again';
      else if (status === 403) msg = `Permission denied — your role cannot do this. (${msg})`;
      else if (status === 404) msg = `Endpoint / record not found → ${msg}`;
      else if (status === 409) msg = `Conflict → ${msg}`;
      else if (status >= 500)  msg = `Server error (${status}) → ${msg}`;
      toastErr(msg, 8000);
    } finally { setSubmitting(false); }
  };

  const cartBaseTotal = cart.reduce((s, i) => s + (i.baseValue  || 0), 0);
  const cartGstTotal  = cart.reduce((s, i) => s + (i.gstAmount  || 0), 0);
  const cartTotal     = cart.reduce((s, i) => s + (i.totalValue || 0), 0);
  const cartQty       = cart.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
  const currentBase   = (parseFloat(row.quantity) || 0) * (parseFloat(row.purchasePrice) || 0);
  const currentGst    = currentBase * (parseFloat(row.gstPercent) || 0) / 100;
  const currentTotal  = currentBase + currentGst;

  const isInternalReason = sticky.invoiceReason === 'INTERNAL';
  const invoiceMissing = !isInternalReason && !sticky.invoiceNumber?.trim();

  return (
    <div className="sx-view">
      <SubBar
        icon={<FiZap size={15} />}
        tone="sx-subbar-icon-green"
        title="Add New Stock"
        meta="Select existing or create fresh products"
      >
        {draftSavedAt && cart.length > 0 && (<span className="sx-draft-saved-chip"><FiSave size={11} /> Draft saved {timeAgo(draftSavedAt)}</span>)}
        <span className={`sx-cart-badge ${cart.length > 0 ? 'sx-cart-active' : ''}`}><FiShoppingCart size={14} /><span>Cart: {cart.length}</span></span>
      </SubBar>

      {draftFound && (
        <div className="sx-draft-banner">
          <div className="sx-draft-icon"><FiRotateCw size={16} /></div>
          <div className="sx-draft-info"><div className="sx-draft-title">Draft found — {draftFound.cart.length} item{draftFound.cart.length > 1 ? 's' : ''} unsaved</div><div className="sx-draft-sub">Saved {timeAgo(draftFound.savedAt)} · Total ₹{fmtCurrency(draftFound.cart.reduce((s, i) => s + (i.totalValue || 0), 0))}</div></div>
          <button className="sx-draft-restore" onClick={() => { setCart(draftFound.cart); setSticky(prev => ({ ...prev, ...draftFound.sticky })); setDraftFound(null); toastOk(`Restored ${draftFound.cart.length} items from draft`, 2500); }}><FiRotateCw size={12} /> Restore</button>
          <button className="sx-draft-discard" onClick={() => { clearDraft(); setDraftFound(null); toastInfo('Draft discarded'); }}><FiX size={12} /> Discard</button>
        </div>
      )}

      <div className="sxt-sticky-bar sx-animate-in">
        <div className="sxt-sticky-item"><label>SUPPLIER {!isInternalReason && <span className="sx-req">*</span>}</label><select className="sxt-sticky-input" value={sticky.supplierId} onChange={e => setSticky({ ...sticky, supplierId: e.target.value })}><option value="">{isInternalReason ? 'Select supplier (optional)' : 'Select supplier'}</option>{suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}</select></div>
        {/* Reason dropdown — INVOICE requires a number, INTERNAL auto-fills a ref */}
        <div className="sxt-sticky-item"><label>REASON</label><select className="sxt-sticky-input" value={sticky.invoiceReason} onChange={e => { const reason = e.target.value; setSticky(prev => ({ ...prev, invoiceReason: reason, invoiceNumber: reason === 'INTERNAL' ? INTERNAL_REF() : '' })); if (reason === 'INTERNAL') toastInfo('Internal mode: supplier & price optional, invoice auto-generated', 3500); }}>{REASON_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</select></div>
        {/* INVOICE → required & editable · INTERNAL → auto-filled & locked */}
        <div className="sxt-sticky-item">
          <label>INVOICE NO. {!isInternalReason && <span className="sx-req">*</span>}</label>
          <input
            className={`sxt-sticky-input ${invoiceMissing ? 'sxt-sticky-input-warn' : ''}`}
            value={sticky.invoiceNumber}
            onChange={e => setSticky({ ...sticky, invoiceNumber: e.target.value })}
            placeholder={isInternalReason ? 'Auto: INTERNAL-YYYYMMDD' : 'INV-001 (required)'}
            disabled={isInternalReason}
            title={isInternalReason ? 'Auto-filled for internal / already-in-store stock' : ''}
          />
        </div>
        <div className="sxt-sticky-item"><label>DATE</label><input type="date" className="sxt-sticky-input" value={sticky.purchaseDate} onChange={e => setSticky({ ...sticky, purchaseDate: e.target.value })} /></div>
      </div>

      <div className="sxa-segmented sx-animate-in">
        <button className={`sxa-seg-btn ${activeWorkflow === 'existing' ? 'sxa-seg-active' : ''}`} onClick={() => { setActiveWorkflow('existing'); setRow(blank); setProductState('empty'); setEditIdx(null); }}>Select Existing Product</button>
        <button className={`sxa-seg-btn ${activeWorkflow === 'fresh' ? 'sxa-seg-active' : ''}`} onClick={() => { setActiveWorkflow('fresh'); setRow(blank); setProductState('new'); setEditIdx(null); setCatText(''); }}>Create Fresh Product</button>
      </div>

      <div className="sxa-form-card sx-animate-in">
        <div className="sxa-form-head">
          <span className="sxa-form-title">{editIdx !== null ? `Editing Row #${editIdx + 1}` : activeWorkflow === 'existing' ? 'Add Existing Item' : 'Register New Item'}</span>
          {editIdx !== null && (<button className="sxt-cancel-edit" onClick={() => { setEditIdx(null); setRow(blank); setCatText(''); setSelectedCatId(''); setSelectedProdId(''); }}><FiX size={11} /> Cancel</button>)}
        </div>

        {activeWorkflow === 'existing' && (
          <div className="sxa-workflow-pane">
            <div className="sxa-form-row">
              <div className="sxa-field" style={{ flex: '1' }}><label>1. Filter by Category</label><select className="sxa-input" value={selectedCatId} onChange={e => { setSelectedCatId(e.target.value); handleSelectExistingProduct(''); }}><option value="">Select category</option>{categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}</select></div>
              <div className="sxa-field" style={{ flex: '2' }}><label>2. Choose Component</label><select className="sxa-input" value={selectedProdId} onChange={e => handleSelectExistingProduct(e.target.value)} disabled={!selectedCatId}><option value="">Select part number or description</option>{productsInSelectedCategory.map(p => (<option key={p.productId} value={p.productId}>{p.partNumber ? `[${p.partNumber}] ` : ''}{p.description}</option>))}</select></div>
            </div>
            {matched && (<div className="sxa-match-banner"><FiInfo size={13} /><strong>{row.partNumber || '(no part #)'}</strong><span>·</span><span className="sx-faded">{row.description}</span></div>)}
          </div>
        )}

        {activeWorkflow === 'fresh' && (
          <div className="sxa-workflow-pane">
            <div className="sxa-form-row">
              <div className="sxa-field" style={{ flex: '1' }}><label>New Part Number <span className="sx-optional">optional</span></label><input className="sxa-input" value={row.partNumber} onChange={e => handleProductFieldChange('partNumber', e.target.value)} placeholder="e.g. PIC16F913" /></div>
              <div className="sxa-field" style={{ flex: '2' }}><label>Description <span className="sx-optional">optional</span></label><input className="sxa-input" value={row.description} onChange={e => handleProductFieldChange('description', e.target.value)} placeholder="Item description…" /></div>
            </div>
            <div className="sxa-form-row">
              <div className="sxa-field" style={{ flex: '1', position: 'relative' }} ref={catRef}>
                <label>Link to Category <span className="sx-req">*</span></label>
                <div className="sxa-input-wrap">
                  <input className="sxa-input" value={catText} onChange={e => { setCatText(e.target.value); setShowCatDD(true); }} onFocus={() => setShowCatDD(true)} placeholder="Search categories…" autoComplete="off" />
                  {catText && (<button className="sxa-input-clear" onClick={() => { setCatText(''); handleProductFieldChange('categoryId', ''); handleProductFieldChange('categoryName', ''); }}><FiX size={11} /></button>)}
                </div>
                {showCatDD && filteredCats.length > 0 && (
                  <div className="sxa-dd">{filteredCats.map(c => (<div key={c.categoryId} className="sxa-dd-row" onMouseDown={() => pickCategoryFresh(c)}><div className="sxa-dd-part">{c.categoryName}</div></div>))}</div>
                )}
              </div>
              <div style={{ flex: '2' }} />
            </div>
          </div>
        )}

        <div className="sxa-divider"><span>Inventory Details</span></div>
        <div className="sxa-form-row">
          <div className="sxa-field" style={{ flex: '1 1 100px' }}><label>Qty <span className="sx-req">*</span></label><input type="number" className="sxa-input" value={row.quantity} onChange={e => handleProductFieldChange('quantity', e.target.value)} placeholder="0" /></div>
          <div className="sxa-field" style={{ flex: '1 1 100px' }}><label>Unit</label><select className="sxa-input" value={row.unitOfMeasure} onChange={e => handleProductFieldChange('unitOfMeasure', e.target.value)}>{UNITS.map(u => <option key={u.v} value={u.v}>{u.label}</option>)}</select></div>
          <div className="sxa-field" style={{ flex: '1 1 120px' }}><label>Price {!isInternalReason && <span className="sx-req">*</span>}</label><input type="number" className="sxa-input" value={row.purchasePrice} onChange={e => handleProductFieldChange('purchasePrice', e.target.value)} placeholder={isInternalReason ? '0.00 (0 allowed)' : '0.00'} /></div>
          <div className="sxa-field" style={{ flex: '1 1 100px' }}><label>GST %</label><input type="number" className="sxa-input" value={row.gstPercent} onChange={e => handleProductFieldChange('gstPercent', e.target.value)} placeholder="0" disabled={activeWorkflow === 'existing'} /></div>
          <div className="sxa-field" style={{ flex: '1 1 140px' }}><label>Row Total</label><div className="sxa-total-display">₹{fmtCurrency(currentTotal)}</div></div>
        </div>
        <div className="sxa-form-row">
          <div className="sxa-field" style={{ flex: '1 1 140px' }}><label>Package</label><input className="sxa-input" value={row.packageType} onChange={e => handleProductFieldChange('packageType', e.target.value)} placeholder="SMD / DIP" disabled={activeWorkflow === 'existing'} /></div>
          <div className="sxa-field" style={{ flex: '1 1 140px' }}><label>Mfg Part No.</label><input className="sxa-input" value={row.manufacturerPn} onChange={e => handleProductFieldChange('manufacturerPn', e.target.value)} placeholder="Mfg PN" disabled={activeWorkflow === 'existing'} /></div>
          <div className="sxa-field" style={{ flex: '1 1 140px' }}><label>Make</label><input className="sxa-input" value={row.make} onChange={e => handleProductFieldChange('make', e.target.value)} placeholder="e.g. Espressif" disabled={activeWorkflow === 'existing'} /></div>
          <div className="sxa-field" style={{ flex: '1 1 120px' }}><label>HSN Code</label><input className="sxa-input" value={row.hsnCode} onChange={e => handleProductFieldChange('hsnCode', e.target.value)} placeholder="HSN" disabled={activeWorkflow === 'existing'} /></div>
          <div className="sxa-field" style={{ flex: '1 1 160px' }}><label>Rack</label><select className="sxa-input" value={row.rackId} onChange={e => { handleProductFieldChange('rackId', e.target.value); handleProductFieldChange('boxId', ''); }}><option value="">Select rack</option>{racks.map(r => <option key={r.rackId} value={r.rackId}>{r.rackName || r.rackNumber}</option>)}</select></div>
          <div className="sxa-field" style={{ flex: '1 1 160px' }}><label>Box</label><select className="sxa-input" value={row.boxId} onChange={e => handleProductFieldChange('boxId', e.target.value)} disabled={!row.rackId}><option value="">Select box</option>{boxes.map(b => <option key={b.boxId} value={b.boxId}>{b.boxLabel || b.boxNumber}</option>)}</select></div>
        </div>
        <div className="sxa-form-row" style={{ alignItems: 'flex-end' }}>
          <div className="sxa-field" style={{ flex: '1' }}><label>Remarks</label><input className="sxa-input" value={row.remarks} onChange={e => handleProductFieldChange('remarks', e.target.value)} placeholder="Add notes…" /></div>
          <button className="sxa-btn-primary" onClick={addToCart}>{editIdx !== null ? <FiCheckCircle size={15} /> : <FiPlus size={15} />}{editIdx !== null ? 'Update Row' : 'Add to Cart'}</button>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="sx-card sx-animate-in">
          <div className="sxt-list-head"><FiShoppingCart size={15} style={{ color: '#4f46e5' }} /><span className="sxt-cart-title">Cart Queue</span><span className="sxt-list-meta">{cart.length} items</span><button className="sxt-cancel-edit" style={{ marginLeft: 'auto' }} onClick={clearAll}><FiTrash2 size={11} /> Clear</button></div>
          <div className="sx-table-wrap">
            <table className="sx-grid-table">
              <thead><tr><th>#</th><th>PART</th><th>DESCRIPTION</th><th>LOCATION</th><th>QTY</th><th>PRICE</th><th>GST</th><th>TOTAL</th><th style={{ textAlign: 'center' }}>ACTIONS</th></tr></thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i} className={`sx-grid-row ${editIdx === i ? 'sx-row-editing' : ''}`}>
                    <td className="sx-num">{i + 1}</td>
                    <td><span className="sx-mono">{item.partNumber || '—'}</span>{item.isNew && <span className="sx-tag sx-tag-green">NEW</span>}</td>
                    <td className="sx-truncate-cell" title={item.description}>{item.description || '—'}</td>
                    <td className="sx-strong">{item.rackDisp} / {item.boxDisp}</td>
                    <td className="sx-qty">{item.quantity} <small className="sx-stock-unit">{uShort(item.unitOfMeasure)}</small></td>
                    <td>₹{fmtCurrency(item.purchasePrice)}</td>
                    <td className="sx-faded">{item.gstPercent ? `${item.gstPercent}%` : '0%'}</td>
                    <td className="sx-strong">₹{fmtCurrency(item.totalValue)}</td>
                    <td><div className="sx-row-actions"><button className="sx-action sx-action-edit" onClick={() => editCart(i)}><FiEdit2 size={12} /></button><button className="sx-action sx-action-del" onClick={() => removeCart(i)}><FiTrash2 size={12} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sx-cart-foot">
            <div className="sx-cart-stats"><div><span>Volume</span><strong>{cartQty} units</strong></div><div><span>Subtotal</span><strong>₹{fmtCurrency(cartBaseTotal)}</strong></div><div><span>GST</span><strong>₹{fmtCurrency(cartGstTotal)}</strong></div></div>
            <div className="sx-cart-cta"><div className="sx-cart-grand"><span>Grand Total</span><strong>₹{fmtCurrency(cartTotal)}</strong></div><button className="sx-submit-btn" onClick={submit} disabled={submitting}>{submitting ? <FiRefreshCw className="sx-spin" size={15} /> : <FiCheckCircle size={15} />}Submit to QC</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// MAIN STOCK IN PAGE
// ════════════════════════════════════════════════════════════
const StockIn = () => {
  const { state } = useLocation();
  const [view, setView] = useState(VIEW.MAIN);

  const [products,        setProducts]        = useState([]);
  const [stockedProducts, setStockedProducts] = useState([]);
  const [suppliers,       setSuppliers]       = useState([]);
  const [racks,           setRacks]           = useState([]);
  const [categories,      setCategories]      = useState([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [activeCategory,  setActiveCategory]  = useState('all');
  const [page,            setPage]            = useState(1);
  const PS = 10;

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setPage(1); }, [searchQuery, activeCategory]);

  const loadAll = async () => {
    // ★ Load each dataset independently so ONE failure names itself
    //   instead of one generic "Failed to load catalog datasets"
    const jobs = [
      { name: 'Products',   fn: productApi.getActive,          set: setProducts },
      { name: 'Suppliers',  fn: supplierApi.getActive,         set: setSuppliers },
      { name: 'Racks',      fn: rackApi.getActive,             set: setRacks },
      { name: 'Categories', fn: categoryApi.getActive,         set: setCategories },
      { name: 'Stock list', fn: stockApi.getStockedProducts,   set: setStockedProducts },
    ];
    const results = await Promise.allSettled(jobs.map(j => j.fn()));
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        jobs[i].set(res.value.data.data || []);
      } else {
        toastErr(`${jobs[i].name} failed to load — ${apiErr(res.reason)}`);
      }
    });
  };

  const catList = useMemo(() => {
    const s = new Set(); stockedProducts.forEach(p => { if (p.categoryName) s.add(p.categoryName); });
    return ['all', ...Array.from(s)];
  }, [stockedProducts]);

  const filtered = useMemo(() => {
    let l = stockedProducts;
    if (activeCategory !== 'all') l = l.filter(p => p.categoryName === activeCategory);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); l = l.filter(p => [p.partNumber, p.description, p.categoryName].filter(Boolean).some(f => f.toLowerCase().includes(q))); }
    return l;
  }, [stockedProducts, searchQuery, activeCategory]);

  const tp = Math.max(1, Math.ceil(filtered.length / PS));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp - 1) * PS, sp * PS);
  const goTo = (p) => setPage(Math.max(1, Math.min(p, tp)));
  const pageNums = () => { const a = []; let s = Math.max(1, sp - 2), e = Math.min(tp, s + 4); if (e - s < 4) s = Math.max(1, e - 4); for (let i = s; i <= e; i++) a.push(i); return a; };

  // ── tab helper: highlights the active view ──
  const tabCls = (base, v) => `${base} ${view === v ? 'sx-btn-tab-active' : ''}`;

  // ── which content to render under the persistent header ──
  const renderView = () => {
    switch (view) {
      case VIEW.ADD:
        return <AddStockPage onSuccess={() => setView(VIEW.BATCHES)} products={products} suppliers={suppliers} racks={racks} categories={categories} reloadAll={loadAll} />;
      case VIEW.BATCHES:
        return <MyStockInsPage suppliers={suppliers} />;
      case VIEW.REJECTED:
        return <RejectedPage />;
      case VIEW.BOM:
        return <div className="sx-view"><BomImport onBack={() => setView(VIEW.MAIN)} onItemsReady={() => setView(VIEW.BATCHES)} /></div>;
		// In renderView():
		case VIEW.INVOICES:
		  return <Invoices />;
      default:
        return (
          <div className="sx-view">
            <div className="sx-card sx-animate-in" style={{ animationDelay: '100ms' }}>
              <div className="sxt-list-head">
                <FiPackage size={15} style={{ color: '#4f46e5' }} />
                <span className="sxt-cart-title">Approved Products</span>
                <span className="sxt-list-meta">{filtered.length} of {stockedProducts.length}</span>
              </div>

              <div className="sx-card-search">
                <FiSearch size={15} className="sx-search-icon" />
                <input className="sx-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search part#, description, category…" />
                {searchQuery && <button className="sx-clear" onClick={() => setSearchQuery('')}><FiX size={13} /></button>}
              </div>

              <div className="sx-cat-pills">
                {catList.map(cat => (
                  <button key={cat} className={`sx-cat-pill ${activeCategory === cat ? 'sx-cat-active' : ''}`} onClick={() => setActiveCategory(cat)}>
                    {cat === 'all' ? 'All' : cat}
                    {cat !== 'all' && <span className="sx-cat-count">{stockedProducts.filter(p => p.categoryName === cat).length}</span>}
                  </button>
                ))}
              </div>

              <div className="sx-table-wrap">
                {paged.length === 0
                  ? <div className="sx-empty"><FiSearch size={32} /><span>{searchQuery ? 'No results' : 'No products yet'}</span></div>
                  : (
                    <table className="sx-grid-table sx-grid-table-dark">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>CATEGORY</th>
                          <th>PART #</th>
                          <th>DESCRIPTION</th>
                          <th>STOCK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((p, i) => {
                          const us    = uShort(getUnit(p.productId));
                          const isLow = p.stockStatus === 'LOW_STOCK';
                          return (
                            <tr key={p.productId} className={`sx-grid-row ${isLow ? 'sx-row-low' : ''}`}>
                              <td className="sx-num">{(sp - 1) * PS + i + 1}</td>
                              <td>{p.categoryName ? <span className="sx-chip">{p.categoryName}</span> : '—'}</td>
                              <td><span className="sx-mono">{p.partNumber || '—'}</span></td>
                              <td><span className="sx-truncate-cell" title={p.description}>{p.description || '—'}</span></td>
                              <td>
                                <span className={`sx-stock ${isLow ? 'sx-stock-low' : ''}`}>
                                  {p.totalStock?.toFixed ? p.totalStock.toFixed(0) : p.totalStock}
                                  <span className="sx-stock-unit">{us}</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
              </div>

              <div className="sx-pagination">
                <span className="sx-pg-info">{filtered.length > 0 ? `${(sp - 1) * PS + 1}–${Math.min(sp * PS, filtered.length)} of ${filtered.length}` : '0 products'}</span>
                <div className="sx-pg-controls">
                  <button className="sx-pg-btn" onClick={() => goTo(1)}      disabled={sp === 1}><FiChevronsLeft  size={13} /></button>
                  <button className="sx-pg-btn" onClick={() => goTo(sp - 1)} disabled={sp === 1}><FiChevronLeft   size={13} /></button>
                  {pageNums().map(p => (<button key={p} className={`sx-pg-btn ${p === sp ? 'sx-pg-active' : ''}`} onClick={() => goTo(p)}>{p}</button>))}
                  <button className="sx-pg-btn" onClick={() => goTo(sp + 1)} disabled={sp === tp}><FiChevronRight  size={13} /></button>
                  <button className="sx-pg-btn" onClick={() => goTo(tp)}     disabled={sp === tp}><FiChevronsRight size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="sx-page">
      {/* PERSISTENT HEADER — always visible on every sub-view */}
      <div className="sx-hero sx-animate-in">
        <div
          className="sx-hero-content sx-hero-clickable"
          onClick={() => setView(VIEW.MAIN)}
          title="Back to Stock IN home"
        >
          <div className="sx-hero-icon"><FiShoppingCart size={20} /></div>
          <div>
            <h1 className="sx-hero-title">Stock IN</h1>
            <p className="sx-hero-sub"><span className="sx-hero-sub-count">{stockedProducts.length}</span> approved products</p>
          </div>
        </div>
        <div className="sx-hero-actions">
          <button className={tabCls('sx-btn sx-btn-green', VIEW.BATCHES)}  onClick={() => setView(VIEW.BATCHES)}><FiList size={13} /> My Batches</button>
          <button className={tabCls('sx-btn sx-btn-red', VIEW.REJECTED)}   onClick={() => setView(VIEW.REJECTED)}><FiAlertTriangle size={13} /> Rejected</button>
          <button className="sx-btn sx-btn-excel"   onClick={() => exportExcel(filtered)} disabled={!filtered.length}><FiGrid size={13} /> Excel</button>
          <button className="sx-btn sx-btn-pdf"     onClick={() => exportPDF(filtered)}   disabled={!filtered.length}><FiFileText size={13} /> PDF</button>
          <button className={tabCls('sx-btn sx-btn-bom', VIEW.BOM)}        onClick={() => setView(VIEW.BOM)}><FiFileText size={13} /> BOM</button>
          <button className={tabCls('sx-btn sx-btn-amber', VIEW.INVOICES)} onClick={() => setView(VIEW.INVOICES)}><FiFileText size={13} /> Invoices</button>
          <button className={tabCls('sx-btn sx-btn-primary', VIEW.ADD)}    onClick={() => setView(VIEW.ADD)}><FiPlus size={14} /> Add Stock</button>
        </div>
      </div>

      {renderView()}
    </div>
  );
};

const exportExcel = async (products) => { /* unchanged */ };
const exportPDF   = async (products) => { /* unchanged */ };


export default StockIn;