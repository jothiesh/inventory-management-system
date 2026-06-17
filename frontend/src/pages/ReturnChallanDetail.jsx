import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiSend, FiPackage, FiRefreshCw, FiX,
  FiCheckCircle, FiHash, FiInfo, FiAlertTriangle,
  FiClock, FiList, FiPrinter, FiDownload, FiCopy,
  FiLayers, FiDollarSign, FiCalendar
} from 'react-icons/fi';
import './ReturnChallan.css';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
};
const fmtNum = (n) => parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtTime = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(iso);
};
const daysSince = (iso) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d < 0 ? 0 : d;
};

const STATUS_FLOW = ['DRAFT','SENT','REPLACEMENT_RECEIVED','CLOSED'];
const STATUS_META = {
  DRAFT:                { label:'Draft',               color:'#f59e0b', bg:'#fef3c7', icon:'📋', desc:'DC created, not yet sent' },
  SENT:                 { label:'Sent to Supplier',    color:'#3b82f6', bg:'#dbeafe', icon:'📤', desc:'Waiting for replacement' },
  REPLACEMENT_RECEIVED: { label:'Replacement Arrived', color:'#10b981', bg:'#d1fae5', icon:'📦', desc:'New batch pending QC' },
  CLOSED:               { label:'Closed',              color:'#6b7280', bg:'#f3f4f6', icon:'✅', desc:'Fully resolved' },
};

// ════════════════════════════════════════════════════════════════
// ★ RETURN CHALLAN PRINT DOCUMENT — same style as Delivery Challan
// ════════════════════════════════════════════════════════════════
const ReturnChallanDoc = ({ dc, preview = false }) => {
  if (!dc) return null;
  const MIN_ROWS = preview ? 6 : 10;
  const items = dc.items || [];
  const printRows = [...items];
  while (printRows.length < MIN_ROWS) {
    printRows.push({ _pad: true, id: `pad-${printRows.length}` });
  }
  const totalQty   = items.reduce((s,i) => s + parseFloat(i.qtyReturned||0), 0);
  const totalValue = items.reduce((s,i) => s + (parseFloat(i.qtyReturned||0) * parseFloat(i.unitPrice||0)), 0);

  return (
    <div className={`challan-doc rdc-doc ${preview ? 'challan-preview' : ''}`}>
      {/* HEADER — same as Delivery Challan */}
      <div className="ch-header">
        <div className="ch-logo-col">
          <div className="ch-brand">Thinture<sup>®</sup></div>
          <div className="ch-tagline">Think Future</div>
        </div>
        <div className="ch-company-col">
          <div className="ch-company-name">Thinture Technologies Pvt. Ltd.,</div>
          <div className="ch-company-addr">No. 508, 2nd Floor, 2nd Block, 8th Main, HMT Layout, Vidyaranayapura, Bangalore – 560 097</div>
          <div className="ch-company-phone">Phone: +91 80 2364 6920 / 4166 6965</div>
        </div>
      </div>

      {/* TITLE ROW */}
      <div className="ch-title-row">
        <div className="ch-title" style={{ color:'#dc2626' }}>MATERIAL RETURN CHALLAN</div>
        <div className="ch-gstin">GSTIN: 29AADCT9485G1ZP</div>
      </div>

      {/* META — DC ref + Supplier */}
      <div className="ch-meta">
        <div className="ch-to-box">
          <div className="ch-to-label">To,</div>
          <div className="ch-to-label">M/s. <strong>{dc.supplierName || '\u00A0'}</strong></div>
          <div className="ch-to-label" style={{ marginTop: 4, fontSize: preview ? 7 : 11 }}>
            Original Batch: <strong style={{ fontFamily:'monospace', color:'#dc2626' }}>{dc.originalBatchRef || '—'}</strong>
          </div>
          <div className="ch-to-label" style={{ fontSize: preview ? 7 : 11 }}>
            Reason: <strong>{dc.reason?.replace(/_/g,' ') || 'QC Rejection'}</strong>
          </div>
        </div>
        <div className="ch-ref-box">
          <div className="ch-ref-row">
            <span className="ch-ref-label">Challan No.:</span>
            <span className="ch-ref-val ch-challan-no">{dc.dcNumber}</span>
          </div>
          <div className="ch-ref-row" style={{ marginTop: 6 }}>
            <span className="ch-ref-label">Date:</span>
            <span className="ch-ref-val">{fmtDate(dc.dcDate)}</span>
          </div>
          <div className="ch-ref-row" style={{ marginTop: 6 }}>
            <span className="ch-ref-label">Status:</span>
            <span className="ch-ref-val" style={{ fontWeight:800, color: STATUS_META[dc.status]?.color || '#333' }}>
              {STATUS_META[dc.status]?.label || dc.status}
            </span>
          </div>
        </div>
      </div>

      {/* REASON ROW */}
      <div className="ch-basis-row">
        Returning the following goods due to <strong>QC Rejection</strong> — please arrange replacement at earliest.
      </div>

      {/* ITEMS TABLE */}
      <table className="ch-table">
        <thead>
          <tr>
            <th className="ch-th ch-th-sl">SL. No.</th>
            <th className="ch-th ch-th-desc">Part # / Description</th>
            <th className="ch-th" style={{ width:'12%' }}>Category</th>
            <th className="ch-th ch-th-qty">Qty Returned</th>
            <th className="ch-th ch-th-rate">Unit Price</th>
            <th className="ch-th ch-th-rem">Total Value</th>
          </tr>
        </thead>
        <tbody>
          {printRows.map((row, idx) => {
            if (row._pad) {
              return (
                <tr key={row.id} className="ch-tr">
                  <td className="ch-td ch-td-sl">&nbsp;</td>
                  <td className="ch-td ch-td-desc">&nbsp;</td>
                  <td className="ch-td">&nbsp;</td>
                  <td className="ch-td ch-td-qty">&nbsp;</td>
                  <td className="ch-td ch-td-rate">&nbsp;</td>
                  <td className="ch-td ch-td-rem">&nbsp;</td>
                </tr>
              );
            }
            const total = parseFloat(row.qtyReturned||0) * parseFloat(row.unitPrice||0);
            return (
              <tr key={row.id || idx} className="ch-tr">
                <td className="ch-td ch-td-sl">{idx + 1}</td>
                <td className="ch-td ch-td-desc">
                  {row.partNumber && (
                    <span className="ch-pn">[{row.partNumber}] </span>
                  )}
                  {row.description || '—'}
                </td>
                <td className="ch-td" style={{ textAlign:'center', fontSize: preview ? 7 : 11 }}>
                  {row.categoryName || '—'}
                </td>
                <td className="ch-td ch-td-qty" style={{ color:'#dc2626', fontWeight:800 }}>
                  {parseFloat(row.qtyReturned||0).toFixed(0)}
                </td>
                <td className="ch-td ch-td-rate">
                  {row.unitPrice ? `₹${fmtNum(row.unitPrice)}` : '—'}
                </td>
                <td className="ch-td ch-td-rem" style={{ textAlign:'right' }}>
                  {total > 0 ? `₹${fmtNum(total)}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* TOTALS ROW */}
        <tfoot>
          <tr>
            <td className="ch-td" colSpan={3}
              style={{ fontWeight:900, textAlign:'right', fontSize: preview ? 7 : 12 }}>
              Total
            </td>
            <td className="ch-td ch-td-qty" style={{ fontWeight:900, color:'#dc2626', fontSize: preview ? 8 : 13 }}>
              {totalQty.toFixed(0)}
            </td>
            <td className="ch-td"/>
            <td className="ch-td" style={{ textAlign:'right', fontWeight:900, fontSize: preview ? 7 : 12 }}>
              {totalValue > 0 ? `₹${fmtNum(totalValue)}` : '—'}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* REMARKS */}
      {dc.remarks && (
        <div style={{ padding: preview ? '3px 7px' : '6px 11px', fontSize: preview ? 7 : 11, borderTop:'1px solid #000' }}>
          <strong>Remarks:</strong> {dc.remarks}
        </div>
      )}

      {/* FOOTER — same as Delivery Challan */}
      <div className="ch-footer">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: preview ? 4 : 8 }}>
          <div style={{ fontSize: preview ? 7 : 10, color:'#555' }}>
            Original Batch Ref: <strong style={{ fontFamily:'monospace' }}>{dc.originalBatchRef || '—'}</strong>
          </div>
          <div className="ch-footer-right">For Thinture Technologies PVT. LTD.,</div>
        </div>
        <div className="ch-sig-row">
          <div className="ch-sig">
            <div className="ch-sig-line"/>
            <div className="ch-sig-label">(Supplier's Acknowledgement)</div>
          </div>
          <div className="ch-sig ch-sig-r">
            <div className="ch-sig-line"/>
            <div className="ch-sig-label">Authorised Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// PRINT MODAL  (★ smooth: Esc to close, animated in)
// ════════════════════════════════════════════════════════════════
const PrintModal = ({ dc, onClose }) => {
  const handlePrint = () => window.print();

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="dc-modal-bg rcd-modal-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dc-modal" style={{ maxWidth: 780 }}>
        <div className="dc-modal-head">
          <span>{dc.dcNumber} — Material Return Challan</span>
          <div style={{ display:'flex', gap:8 }}>
            <button className="dc-btn dc-btn-primary" onClick={handlePrint}>
              <FiPrinter size={13}/> Print / Save PDF
            </button>
            <button className="dc-modal-close" onClick={onClose} title="Close (Esc)"><FiX size={16}/></button>
          </div>
        </div>
        <div className="dc-modal-body" id="rdc-print-area">
          <ReturnChallanDoc dc={dc}/>
        </div>
      </div>
    </div>
  );
};

/* ── Replacement Modal (★ smooth: Esc to close) ── */
const ReplacementModal = ({ dc, onClose, onDone }) => {
  const [invoiceNo,  setInvoiceNo]  = useState('');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, submitting]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const t = localStorage.getItem('token');
      const r = await axios.post(
        `/api/qc/return-challans/${dc.id}/replacement-received`,
        { invoiceNo: invoiceNo||null, receivedDate: date },
        { headers: { Authorization: `Bearer ${t}` } }
      );
      toast.success(`✅ Replacement batch created: ${r.data.data?.replacementBatchRef}`);
      onDone(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="rc-modal-overlay" onClick={onClose}>
      <div className="rc-modal" onClick={e => e.stopPropagation()}>
        <div className="rc-modal-head">
          <div className="rc-modal-icon" style={{ background:'#d1fae5', color:'#065f46' }}>
            <FiPackage size={18}/>
          </div>
          <div>
            <h3 className="rc-modal-title">Replacement Received</h3>
            <p className="rc-modal-sub">DC# {dc.dcNumber} · {dc.supplierName}</p>
          </div>
          <button className="rc-modal-close" onClick={onClose}><FiX size={16}/></button>
        </div>
        <div className="rc-modal-body">
          <div style={{ background:'#f0fdf4', borderColor:'#bbf7d0', color:'#065f46',
            display:'flex', gap:10, padding:'12px 14px', borderRadius:8, border:'1px solid' }}>
            <FiPackage size={14} style={{ flexShrink:0, marginTop:2 }}/>
            <div>
              <strong style={{ display:'block', marginBottom:4 }}>A new batch will be created for QC</strong>
              <p style={{ margin:0, fontSize:12 }}>Replacement items will be linked to the original batch and sent to QC queue.</p>
            </div>
          </div>
          <label className="rc-modal-label">New Invoice Number (optional)</label>
          <input className="rc-modal-input" value={invoiceNo}
            onChange={e => setInvoiceNo(e.target.value)}
            placeholder="Leave blank to use original invoice"/>
          <label className="rc-modal-label" style={{ marginTop:12 }}>Received Date</label>
          <input type="date" className="rc-modal-input" value={date}
            onChange={e => setDate(e.target.value)}/>
        </div>
        <div className="rc-modal-foot">
          <button className="rc-modal-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="rc-modal-confirm" style={{ background:'#10b981' }}
            onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <><FiRefreshCw size={13} className="rc-spin"/> Processing…</>
              : <><FiPackage size={13}/> Confirm Replacement</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Batch Timeline (★ smooth: staggered slide-in) ── */
const BatchTimeline = ({ batchId }) => {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  const EVENT_STYLE = {
    STOCK_IN:             { icon:'📦', color:'#4f46e5' },
    QC_INSPECTED:         { icon:'🔍', color:'#7c3aed' },
    QC_ACCEPTED:          { icon:'✅', color:'#10b981' },
    QC_REJECTED:          { icon:'❌', color:'#ef4444' },
    QC_PARTIAL:           { icon:'⚠',  color:'#f59e0b' },
    QC_HOLD:              { icon:'⏸', color:'#8b5cf6' },
    DC_RAISED:            { icon:'📋', color:'#f59e0b' },
    DC_SENT:              { icon:'📤', color:'#3b82f6' },
    REPLACEMENT_RECEIVED: { icon:'🔄', color:'#10b981' },
    REPLACEMENT_QC_PASS:  { icon:'✅', color:'#10b981' },
    REPLACEMENT_QC_FAIL:  { icon:'❌', color:'#ef4444' },
    CLOSED:               { icon:'🏁', color:'#6b7280' },
  };

  useEffect(() => {
    if (!batchId) return;
    const load = async () => {
      try {
        setLoading(true);
        const t = localStorage.getItem('token');
        const r = await axios.get(`/api/qc/return-challans/timeline/${batchId}`,
          { headers: { Authorization: `Bearer ${t}` } });
        setEvents(r.data.data || []);
      } catch { setEvents([]); }
      finally { setLoading(false); }
    };
    load();
  }, [batchId]);

  if (loading) return (
    <div className="rc-timeline-loading"><FiRefreshCw size={16} className="rc-spin"/> Loading timeline…</div>
  );
  if (!events.length) return (
    <div className="rc-timeline-empty"><FiClock size={20}/> No timeline events yet</div>
  );

  return (
    <div className="rc-timeline">
      {events.map((e, idx) => {
        const s      = EVENT_STYLE[e.eventType] || { icon:'•', color:'#94a3b8' };
        const isLast = idx === events.length - 1;
        return (
          <div key={e.id} className="rc-tl-item rcd-tl-anim" style={{ animationDelay: `${idx * 60}ms` }}>
            <div className="rc-tl-left">
              <div className="rc-tl-dot" style={{ background:s.color, borderColor:s.color }}>
                <span style={{ fontSize:13 }}>{s.icon}</span>
              </div>
              {!isLast && <div className="rc-tl-line"/>}
            </div>
            <div className="rc-tl-content">
              <div className="rc-tl-header">
                <span className="rc-tl-title" style={{ color:s.color }}>{e.title}</span>
                <span className="rc-tl-time">{fmtTime(e.happenedAt)}</span>
              </div>
              {e.detail && <p className="rc-tl-detail">{e.detail}</p>}
              <div className="rc-tl-meta">{fmtDate(e.happenedAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════════════════════════
   MAIN PAGE  (★ IMPROVED — smooth + advanced)
   ══════════════════════════════════════ */
const ReturnChallanDetail = () => {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [dc,           setDc]           = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const [showRepModal, setShowRepModal] = useState(false);
  const [showPrint,    setShowPrint]    = useState(false);

  const load = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const t = localStorage.getItem('token');
      const r = await axios.get(`/api/qc/return-challans/${id}`,
        { headers: { Authorization: `Bearer ${t}` } });
      setDc(r.data.data);
      if (silent) toast.success('Refreshed', { autoClose: 800 });
    } catch { toast.error('Failed to load DC'); }
    finally { silent ? setRefreshing(false) : setLoading(false); }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleSend = async () => {
    if (!window.confirm('Mark this DC as sent to supplier?')) return;
    setSending(true);
    try {
      const t = localStorage.getItem('token');
      await axios.post(`/api/qc/return-challans/${id}/send`, {},
        { headers: { Authorization: `Bearer ${t}` } });
      toast.success('✅ DC marked as sent!');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSending(false); }
  };

  // ★ copy DC number to clipboard
  const copyDcNo = () => {
    try {
      navigator.clipboard.writeText(dc.dcNumber);
      toast.success(`Copied ${dc.dcNumber}`, { autoClose: 900 });
    } catch { toast.info(dc.dcNumber); }
  };

  if (loading) return (
    <div className="rc-page">
      <div className="rc-loading"><div className="rc-spinner"/><p>Loading DC…</p></div>
    </div>
  );
  if (!dc) return (
    <div className="rc-page">
      <div className="rc-empty-page">
        <FiAlertTriangle size={32}/>
        <h3>DC not found</h3>
        <button className="rc-back-btn" onClick={() => navigate('/qc/return-challans')}>
          <FiArrowLeft size={14}/> Back to List
        </button>
      </div>
    </div>
  );

  const statusMeta  = STATUS_META[dc.status] || STATUS_META.DRAFT;
  const currentStep = STATUS_FLOW.indexOf(dc.status);

  // ★ stats strip values
  const items      = dc.items || [];
  const totalValue = items.reduce((s,i) => s + (parseFloat(i.qtyReturned||0) * parseFloat(i.unitPrice||0)), 0);
  const dcAge      = daysSince(dc.dcDate);

  return (
    <div className="rc-page">

      {/* HEADER */}
      <div className="rc-detail-header rcd-fade" style={{ animationDelay: '0ms' }}>
        <button className="rc-back-btn" onClick={() => navigate('/qc/return-challans')}>
          <FiArrowLeft size={14}/> Back
        </button>

        <div className="rc-detail-title-block">
          <div className="rc-detail-icon"><FiSend size={20}/></div>
          <div>
            <h1 className="rc-title">
              {dc.dcNumber}
              <button className="rcd-copy-btn" onClick={copyDcNo} title="Copy DC number">
                <FiCopy size={12}/>
              </button>
              <span className="rcd-status-pill" style={{ background:statusMeta.bg, color:statusMeta.color }}>
                {statusMeta.icon} {statusMeta.label}
              </span>
            </h1>
            <p className="rc-subtitle">Return DC · {dc.supplierName} · {fmtDate(dc.dcDate)}</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="rc-detail-actions">

          {/* ★ Refresh */}
          <button className="rcd-refresh-btn" onClick={() => load(true)} disabled={refreshing} title="Refresh">
            <FiRefreshCw size={14} className={refreshing ? 'rc-spin' : ''}/>
          </button>

          {/* ★ PRINT BUTTON — always visible */}
          <button
            className="rc-action-btn rcd-print-btn"
            onClick={() => setShowPrint(true)}>
            <FiPrinter size={14}/> Print / PDF
          </button>

          {dc.status === 'DRAFT' && (
            <button className="rc-action-btn send" onClick={handleSend} disabled={sending}>
              {sending
                ? <><FiRefreshCw size={14} className="rc-spin"/> Sending…</>
                : <><FiSend size={14}/> Send DC to Supplier</>}
            </button>
          )}
          {dc.status === 'SENT' && (
            <button className="rc-action-btn replacement" onClick={() => setShowRepModal(true)}>
              <FiPackage size={14}/> Mark Replacement Received
            </button>
          )}
          {dc.status === 'REPLACEMENT_RECEIVED' && dc.replacementBatchRef && (
            <div className="rc-replacement-info">
              <FiCheckCircle size={14} style={{ color:'#10b981' }}/>
              New batch: <strong>{dc.replacementBatchRef}</strong> → In QC Queue
            </div>
          )}
        </div>
      </div>

      {/* ★ NEW — STATS STRIP */}
      <div className="rcd-stats rcd-fade" style={{ animationDelay: '60ms' }}>
        <div className="rcd-stat">
          <div className="rcd-stat-icon" style={{ background:'#eef2ff', color:'#4f46e5' }}><FiLayers size={15}/></div>
          <div><span>Items Returned</span><strong>{dc.itemCount || items.length || 0}</strong></div>
        </div>
        <div className="rcd-stat">
          <div className="rcd-stat-icon" style={{ background:'#fef2f2', color:'#dc2626' }}><FiPackage size={15}/></div>
          <div><span>Total Qty</span><strong style={{ color:'#dc2626' }}>{parseFloat(dc.totalQty||0).toFixed(0)}</strong></div>
        </div>
        <div className="rcd-stat">
          <div className="rcd-stat-icon" style={{ background:'#ecfdf5', color:'#059669' }}><FiDollarSign size={15}/></div>
          <div><span>Return Value</span><strong>{totalValue > 0 ? `₹${fmtNum(totalValue)}` : '—'}</strong></div>
        </div>
        <div className="rcd-stat">
          <div className="rcd-stat-icon" style={{ background:'#fffbeb', color:'#d97706' }}><FiCalendar size={15}/></div>
          <div><span>DC Age</span><strong>{dcAge === null ? '—' : dcAge === 0 ? 'Today' : `${dcAge} day${dcAge>1?'s':''}`}</strong></div>
        </div>
      </div>

      {/* STATUS STEPPER */}
      <div className="rc-stepper rcd-fade" style={{ animationDelay: '120ms' }}>
        {STATUS_FLOW.map((s, idx) => {
          const m       = STATUS_META[s];
          const done    = idx <= currentStep;
          const current = idx === currentStep;
          return (
            <React.Fragment key={s}>
              <div className={`rc-step ${done?'done':''} ${current?'current':''}`}>
                <div className={`rc-step-dot ${current ? 'rcd-pulse' : ''}`} style={done?{background:m.color,borderColor:m.color}:{}}>
                  {done ? <FiCheckCircle size={14}/> : <span>{idx+1}</span>}
                </div>
                <div className="rc-step-label">{m.label}</div>
                <div className="rc-step-desc">{m.desc}</div>
              </div>
              {idx < STATUS_FLOW.length - 1 && (
                <div className={`rc-step-line ${idx < currentStep ? 'done' : ''}`}/>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* DETAIL GRID */}
      <div className="rc-detail-grid">

        {/* LEFT */}
        <div className="rc-detail-left">

          {/* DC Info */}
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '180ms' }}>
            <div className="rc-card-title"><FiInfo size={13}/> Challan Information</div>
            <div className="rc-info-grid">
              <div className="rc-info-item">
                <span>DC Number</span>
                <strong style={{ fontFamily:'monospace', color:'#4f46e5' }}>{dc.dcNumber}</strong>
              </div>
              <div className="rc-info-item">
                <span>DC Date</span>
                <strong>{fmtDate(dc.dcDate)}</strong>
              </div>
              <div className="rc-info-item">
                <span>Supplier</span>
                <strong>{dc.supplierName || '—'}</strong>
              </div>
              <div className="rc-info-item">
                <span>Reason</span>
                <strong>{dc.reason?.replace(/_/g,' ') || 'QC Rejection'}</strong>
              </div>
              <div className="rc-info-item">
                <span>Original Batch</span>
                <strong style={{ fontFamily:'monospace', color:'#dc2626' }}>
                  {dc.originalBatchRef || `#${dc.originalBatchId}`}
                </strong>
              </div>
              {dc.replacementBatchRef && (
                <div className="rc-info-item">
                  <span>Replacement Batch</span>
                  <strong style={{ fontFamily:'monospace', color:'#10b981' }}>{dc.replacementBatchRef}</strong>
                </div>
              )}
              {dc.remarks && (
                <div className="rc-info-item" style={{ gridColumn:'span 2' }}>
                  <span>Remarks</span>
                  <strong>{dc.remarks}</strong>
                </div>
              )}
            </div>
          </div>

          {/* ★ LIVE CHALLAN PREVIEW — click to open print modal */}
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '240ms' }}>
            <div className="rc-card-title">
              <FiList size={13}/> Challan Preview
              <button className="rcd-print-mini" onClick={() => setShowPrint(true)}>
                <FiPrinter size={11}/> Print / PDF
              </button>
            </div>
            {/* Preview — scaled down, smooth hover hint */}
            <div className="rdc-preview-wrap" onClick={() => setShowPrint(true)} title="Click to open full print view">
              <div className="rdc-preview-hint"><FiPrinter size={12}/> Click to print</div>
              <ReturnChallanDoc dc={dc} preview/>
            </div>
          </div>

          {/* Items Table */}
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '300ms' }}>
            <div className="rc-card-title">
              <FiList size={13}/> Returned Items
              <span className="rc-badge">
                {dc.itemCount||0} items · {parseFloat(dc.totalQty||0).toFixed(0)} units
              </span>
            </div>
            {!(dc.items||[]).length ? (
              <div className="rc-empty-items"><FiPackage size={24}/> No items</div>
            ) : (
              <div className="rc-items-table-wrap">
                <table className="rc-items-table">
                  <thead><tr>
                    <th>#</th><th>Part #</th><th>Description</th><th>Category</th>
                    <th className="num">Qty Returned</th>
                    <th className="num">Unit Price</th>
                    <th className="num">Total</th>
                    <th>Remarks</th>
                  </tr></thead>
                  <tbody>
                    {dc.items.map((item, idx) => (
                      <tr key={item.id||idx} className="rcd-row-anim" style={{ animationDelay: `${idx * 40}ms` }}>
                        <td style={{ color:'#94a3b8', fontWeight:700 }}>{idx+1}</td>
                        <td><span style={{ fontFamily:'monospace', color:'#4f46e5', fontWeight:700, fontSize:12 }}>
                          {item.partNumber||'—'}
                        </span></td>
                        <td style={{ fontSize:12 }}>{item.description||'—'}</td>
                        <td>{item.categoryName
                          ? <span className="rc-chip">{item.categoryName}</span>
                          : <span style={{ color:'#cbd5e1' }}>—</span>}
                        </td>
                        <td className="num" style={{ fontWeight:800, color:'#dc2626' }}>
                          {parseFloat(item.qtyReturned||0).toFixed(0)}
                        </td>
                        <td className="num" style={{ color:'#64748b' }}>
                          {item.unitPrice ? `₹${parseFloat(item.unitPrice).toFixed(2)}` : '—'}
                        </td>
                        <td className="num" style={{ fontWeight:700 }}>
                          {item.unitPrice && item.qtyReturned
                            ? `₹${(parseFloat(item.unitPrice)*parseFloat(item.qtyReturned)).toFixed(2)}`
                            : '—'}
                        </td>
                        <td style={{ fontSize:11, color:'#64748b' }}>{item.remarks||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={4} style={{ fontWeight:800, color:'#475569', padding:'10px 8px' }}>Total</td>
                    <td className="num" style={{ fontWeight:800, color:'#dc2626', padding:'10px 8px' }}>
                      {parseFloat(dc.totalQty||0).toFixed(0)}
                    </td>
                    <td colSpan={3}/>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Timeline */}
        <div className="rc-detail-right">
          <div className="rc-card rcd-fade" style={{ animationDelay: '360ms' }}>
            <div className="rc-card-title"><FiClock size={13}/> Batch Timeline</div>
            <BatchTimeline batchId={dc.originalBatchId}/>
          </div>
        </div>
      </div>

      {/* ★ PRINT MODAL */}
      {showPrint && <PrintModal dc={dc} onClose={() => setShowPrint(false)}/>}

      {/* REPLACEMENT MODAL */}
      {showRepModal && (
        <ReplacementModal
          dc={dc}
          onClose={() => setShowRepModal(false)}
          onDone={load}
        />
      )}
    </div>
  );
};

export { BatchTimeline };
export default ReturnChallanDetail;