import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiTruck, FiCopy, FiRefreshCw, FiPrinter, FiSend, FiPackage,
  FiCheckCircle, FiX, FiPlus, FiTrash2, FiInfo, FiClock, FiFileText, FiHash, FiList
} from 'react-icons/fi';
import DeliveryChallanPrintModal, { DeliveryChallanDoc } from './DeliveryChallanPrintModal';
import './ReturnChallan.css';
import './DeliveryChallanFlow.css';

/* ════════════════════════════════════════════════════════════════
   DELIVERY CHALLAN — DETAIL (Job Work)
   DRAFT → SENT → ASSEMBLY_RECEIVED → CLOSED
   Route: <Route path="/delivery-challans/:id" element={<DeliveryChallanDetail/>}/>
   ════════════════════════════════════════════════════════════════ */

const authHdr = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
};
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return '—'; }
};
const fmtNum = (n) => parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
const daysSince = (iso) => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
};

const COMPANY_DOC = {
  companyName:  'Thinture Technologies Pvt. Ltd.,',
  companyAddr:  'No. 508, 2nd Floor, 2nd Block, 8th Main, HMT Layout, Vidyaranayapura, Bangalore – 560 097',
  companyPhone: 'Phone: +91 80 2364 6920 / 4166 6965',
  title:        'DELIVERY CHALLAN',
  gstin:        '29AADCT9485G1ZP',
  basisLine:    'Please receive the following goods on returnable basis.',
  footerRight:  'For Thinture Technologies PVT. LTD.,',
  sigLeft:      "(Receiver's Signature)",
  sigRight:     'Authorised Signature',
};

const STATUS_FLOW = ['DRAFT', 'SENT', 'ASSEMBLY_RECEIVED', 'CLOSED'];
const STATUS_META = {
  DRAFT:             { label:'Draft',             color:'#f59e0b', bg:'#fef3c7', icon:'📋', desc:'components issued' },
  SENT:              { label:'Sent',              color:'#3b82f6', bg:'#dbeafe', icon:'📤', desc:'with supplier' },
  ASSEMBLY_RECEIVED: { label:'Assembly Received', color:'#10b981', bg:'#d1fae5', icon:'📦', desc:'batch in QC queue' },
  CLOSED:            { label:'Closed',            color:'#6b7280', bg:'#f3f4f6', icon:'✅', desc:'cycle complete' },
};
const EVENT_STYLE = {
  DC_CREATED:        { icon:'📋', color:'#f59e0b', bg:'#fef3c7' },
  DC_SENT:           { icon:'📤', color:'#3b82f6', bg:'#dbeafe' },
  ASSEMBLY_RECEIVED: { icon:'📦', color:'#10b981', bg:'#d1fae5' },
  CLOSED:            { icon:'🏁', color:'#6b7280', bg:'#f3f4f6' },
};

const mapDcForPrint = (dc) => ({
  dcNumber:  dc.dcNumber,
  dcDate:    dc.dcDate,
  toName:    dc.supplierName,
  toAddress: dc.supplierAddress,
  tinGstin:  dc.supplierGstin,
  items: (dc.items || []).map(i => ({
    partNumber: i.partNumber, description: i.description,
    quantity: i.qty, rate: i.rate, remarks: i.remarks,
  })),
});

/* ── TIMELINE ── */
const DcTimeline = ({ dcId, refreshKey }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await axios.get(`/api/delivery-challans/${dcId}/timeline`, authHdr());
        if (alive) setEvents(r.data.data || []);
      } catch { /* silent */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [dcId, refreshKey]);

  if (loading) return <div className="dcx-tl-empty">Loading timeline…</div>;
  if (events.length === 0) return <div className="dcx-tl-empty">No events yet</div>;

  return (
    <div className="dcx-tl">
      {events.map((e, idx) => {
        const s = EVENT_STYLE[e.eventType] || EVENT_STYLE.DC_CREATED;
        return (
          <div key={e.id ?? idx} className="dcx-tl-item" style={{ animationDelay: `${idx*60}ms` }}>
            <div className="dcx-tl-dot" style={{ background: s.bg, borderColor: s.color }}>{s.icon}</div>
            <div className="dcx-tl-body">
              <div className="dcx-tl-title">{e.title}</div>
              {e.detail && <div className="dcx-tl-detail">{e.detail}</div>}
              <div className="dcx-tl-time"><FiClock size={9} style={{ verticalAlign:'-1px' }}/> {fmtDateTime(e.happenedAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── ASSEMBLY RECEIVED MODAL ── */
const AssemblyModal = ({ dc, onClose, onDone }) => {
  const [products, setProducts] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState([{ key: 1, productId: '', quantity: '', unitPrice: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get('/api/products', authHdr());
        const raw = r.data.data || r.data || [];
        setProducts(Array.isArray(raw) ? raw : []);
      } catch { toast.warn('Product list unavailable — check /api/products'); }
    })();
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const addRow = () => setRows(prev => [...prev, { key: Date.now(), productId: '', quantity: '', unitPrice: '' }]);
  const rmRow  = (key) => setRows(prev => prev.filter(r => r.key !== key));
  const upRow  = (key, field, value) => setRows(prev =>
    prev.map(r => r.key === key ? { ...r, [field]: value } : r));

  const submit = async () => {
    const assemblyItems = rows
      .filter(r => r.productId && parseFloat(r.quantity) > 0)
      .map(r => ({
        productId: Number(r.productId),
        quantity:  parseFloat(r.quantity),
        unitPrice: r.unitPrice !== '' ? parseFloat(r.unitPrice) : null,
      }));
    setSaving(true);
    try {
      const r = await axios.post(`/api/delivery-challans/${dc.id}/assembly-received`, {
        invoiceNo: invoiceNo.trim() || null,
        receivedDate,
        assemblyItems,
      }, authHdr());
      const updated = r.data.data;
      toast.success(`📦 Assembly received — batch ${updated.assemblyBatchRef} → QC queue`);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to record assembly');
    } finally { setSaving(false); }
  };

  return (
    <div className="dcx-modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dcx-modal">
        <div className="dcx-modal-head">
          <span><FiPackage size={15} style={{ verticalAlign:'-2px' }}/> Mark Assembly Received — {dc.dcNumber}</span>
          <button className="dcx-modal-close" onClick={onClose}><FiX size={15}/></button>
        </div>
        <div className="dcx-modal-body">
          <div className="dcx-modal-note">
            <FiInfo size={12}/>
            <span>A new batch will be created and sent to the <strong>QC queue</strong>. Assembly rows are optional — leave empty to log the receipt only and stock the items later via Stock IN.</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="dcx-field">
              <label>Supplier Invoice / DC No.</label>
              <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                placeholder={`blank = ${dc.dcNumber}`}/>
            </div>
            <div className="dcx-field">
              <label>Received Date</label>
              <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}/>
            </div>
          </div>

          <div className="dcx-field">
            <label>Assembly Product(s) Received</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {rows.map(r => (
                <div key={r.key} className="dcx-asm-row">
                  <select value={r.productId} onChange={e => upRow(r.key, 'productId', e.target.value)}>
                    <option value="">— select product —</option>
                    {products.map(p => (
                      <option key={p.productId ?? p.id} value={p.productId ?? p.id}>
                        {(p.partNumber || '') + (p.description ? ` — ${p.description}` : '')}
                      </option>
                    ))}
                  </select>
                  <input placeholder="qty" value={r.quantity}
                    onChange={e => upRow(r.key, 'quantity', e.target.value.replace(/[^\d.]/g, ''))}/>
                  <input placeholder="₹ price" value={r.unitPrice}
                    onChange={e => upRow(r.key, 'unitPrice', e.target.value.replace(/[^\d.]/g, ''))}/>
                  <button className="dcx-sel-rm" onClick={() => rmRow(r.key)} title="Remove row">
                    <FiTrash2 size={12}/>
                  </button>
                </div>
              ))}
              <button className="dcx-asm-add" onClick={addRow}><FiPlus size={12}/> Add row</button>
            </div>
          </div>
        </div>
        <div className="dcx-modal-foot">
          <button className="dcx-act dcx-act-gray" onClick={onClose}>Cancel</button>
          <button className="dcx-act dcx-act-green" disabled={saving} onClick={submit}>
            {saving ? <FiRefreshCw size={13} className="rc-spin"/> : <FiCheckCircle size={13}/>}
            Receive &amp; Send to QC
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── MAIN ── */
const DeliveryChallanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dc, setDc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showAssembly, setShowAssembly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const r = await axios.get(`/api/delivery-challans/${id}`, authHdr());
      setDc(r.data.data);
      setRefreshKey(k => k + 1);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load challan');
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const copyDc = () => {
    navigator.clipboard?.writeText(dc.dcNumber);
    toast.info('DC number copied', { autoClose: 800 });
  };

  const doSend = async () => {
    if (!window.confirm(`Mark ${dc.dcNumber} as SENT to ${dc.supplierName || 'supplier'}?`)) return;
    setActing(true);
    try {
      const r = await axios.post(`/api/delivery-challans/${dc.id}/send`, {}, authHdr());
      setDc(r.data.data);
      setRefreshKey(k => k + 1);
      toast.success('📤 Challan marked as sent');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to send'); }
    finally { setActing(false); }
  };

  const doClose = async () => {
    if (!window.confirm(`Close ${dc.dcNumber}? Job work cycle will be completed.`)) return;
    setActing(true);
    try {
      const r = await axios.post(`/api/delivery-challans/${dc.id}/close`, {}, authHdr());
      setDc(r.data.data);
      setRefreshKey(k => k + 1);
      toast.success('✅ Challan closed');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to close'); }
    finally { setActing(false); }
  };

  if (loading) return (
    <div className="rc-page">
      <div className="rc-loading"><div className="rc-spinner dcx-spinner"/><p>Loading challan…</p></div>
    </div>
  );
  if (!dc) return (
    <div className="rc-page">
      <div className="rc-empty"><FiPackage size={28}/><p>Delivery Challan not found</p></div>
    </div>
  );

  const meta = STATUS_META[dc.status] || STATUS_META.DRAFT;
  const currentIdx = STATUS_FLOW.indexOf(dc.status);
  const items = dc.items || [];
  const totalQty = items.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0);
  const totalVal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);

  const staticDoc = {
    ...COMPANY_DOC,
    toName: dc.supplierName || '', toAddress: dc.supplierAddress || '',
    tinGstin: dc.supplierGstin || '', dcDateText: fmtDate(dc.dcDate),
  };
  const previewItems = items.map(i => ({
    partNumber: i.partNumber, description: i.description,
    quantity: i.qty, rate: i.rate, remarks: i.remarks,
  }));
  const noop = () => {};

  return (
    <div className="rc-page">

      {/* HEADER */}
      <div className="rc-header rcd-fade">
        <div className="rc-header-left">
          <button className="dcx-back" onClick={() => navigate('/delivery-challans')}>
            <FiArrowLeft size={13}/> Back
          </button>
          <div className="rc-header-icon dcx-icon"><FiTruck size={20}/></div>
          <div>
            <h1 className="rc-title" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <FiHash size={16} style={{ color:'#3b82f6' }}/>{dc.dcNumber}
              <button className="dcx-copy" onClick={copyDc} title="Copy DC number"><FiCopy size={11}/></button>
              <span className="dcx-pill" style={{ background: meta.bg, color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
            </h1>
            <p className="rc-subtitle">
              Job Work · {dc.supplierName || 'supplier'} · {fmtDate(dc.dcDate)}
              {dc.assemblyBatchRef && (
                <span className="dcx-batch-chip" style={{ marginLeft: 8 }}>
                  <FiPackage size={11}/> {dc.assemblyBatchRef}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="rc-header-right" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="rc-btn-refresh" onClick={() => load(true)}>
            <FiRefreshCw size={14}/> Refresh
          </button>
          <button className="dcx-act dcx-act-gray" onClick={() => setShowPrint(true)}>
            <FiPrinter size={13}/> Print / PDF
          </button>
          {dc.status === 'DRAFT' && (
            <button className="dcx-act dcx-act-blue" disabled={acting} onClick={doSend}>
              <FiSend size={13}/> Send to Supplier
            </button>
          )}
          {dc.status === 'SENT' && (
            <button className="dcx-act dcx-act-green" disabled={acting} onClick={() => setShowAssembly(true)}>
              <FiPackage size={13}/> Mark Assembly Received
            </button>
          )}
          {dc.status === 'ASSEMBLY_RECEIVED' && (
            <button className="dcx-act dcx-act-gray" disabled={acting} onClick={doClose}>
              <FiCheckCircle size={13}/> Close Challan
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="dcx-stats rcd-fade" style={{ animationDelay: '60ms', marginBottom: 14 }}>
        <div className="dcx-stat"><div className="lbl">Components</div>
          <div className="val">{dc.itemCount ?? items.length}</div></div>
        <div className="dcx-stat"><div className="lbl">Total Qty</div>
          <div className="val">{parseFloat(dc.totalQty || totalQty).toFixed(0)}</div></div>
        <div className="dcx-stat"><div className="lbl">Value</div>
          <div className="val">₹{fmtNum(totalVal)}</div></div>
        <div className="dcx-stat"><div className="lbl">DC Age</div>
          <div className="val">{daysSince(dc.createdAt)}<small>days</small></div></div>
      </div>

      <div className="dcx-detail-grid">

        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, minWidth:0 }}>

          {/* STEPPER */}
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '90ms' }}>
            <div className="rc-card-title"><FiTruck size={13}/> Job Work Progress</div>
            <div className="dcx-steps">
              {STATUS_FLOW.map((s, idx) => {
                const m = STATUS_META[s];
                const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : '';
                return (
                  <div key={s} className={`dcx-step ${state}`}>
                    <div className="dcx-step-dot">{state === 'done' ? '✓' : m.icon}</div>
                    <div className="dcx-step-lbl">{m.label}</div>
                    <div className="dcx-step-desc">{m.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INFO */}
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '120ms' }}>
            <div className="rc-card-title"><FiInfo size={13}/> Challan Information</div>
            <div className="dcx-info">
              <div className="dcx-info-item"><div className="lbl">DC Number</div>
                <div className="val" style={{ fontFamily:'monospace', color:'#1d4ed8', fontWeight:800 }}>{dc.dcNumber}</div></div>
              <div className="dcx-info-item"><div className="lbl">DC Date</div>
                <div className="val">{fmtDate(dc.dcDate)}</div></div>
              <div className="dcx-info-item"><div className="lbl">Deliver To (Supplier)</div>
                <div className="val">{dc.supplierName || '—'}</div></div>
              <div className="dcx-info-item"><div className="lbl">TIN / GSTIN</div>
                <div className="val" style={{ fontFamily:'monospace' }}>{dc.supplierGstin || '—'}</div></div>
              <div className="dcx-info-item span2"><div className="lbl">Address</div>
                <div className="val">{dc.supplierAddress || '—'}</div></div>
              <div className="dcx-info-item"><div className="lbl">Assembly Batch</div>
                <div className="val">{dc.assemblyBatchRef
                  ? <span style={{ fontFamily:'monospace', fontWeight:800, color:'#10b981' }}>{dc.assemblyBatchRef}</span>
                  : '—'}</div></div>
              <div className="dcx-info-item"><div className="lbl">Created By</div>
                <div className="val">{dc.createdByName || '—'}</div></div>
              {dc.remarks && (
                <div className="dcx-info-item span2"><div className="lbl">Remarks</div>
                  <div className="val">{dc.remarks}</div></div>
              )}
            </div>
          </div>

          {/* CHALLAN PREVIEW */}
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '150ms' }}>
            <div className="rc-card-title"><FiFileText size={13}/> Challan Document
              <span className="rc-badge">click to print</span></div>
            <div className="dcx-preview clickable" onClick={() => setShowPrint(true)}
              title="Open print view">
              <DeliveryChallanDoc dc={{ dcNumber: dc.dcNumber }} preview
                doc={staticDoc} setDoc={noop}
                items={previewItems} setItems={noop}/>
            </div>
          </div>

          {/* ITEMS */}
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '180ms' }}>
            <div className="rc-card-title"><FiList size={13}/> Components Sent
              <span className="rc-badge">{items.length}</span></div>
            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead><tr>
                  <th>#</th><th>Part No.</th><th>Description</th><th>Category</th>
                  <th className="num">Qty</th><th className="num">Rate</th><th className="num">Value</th>
                </tr></thead>
                <tbody>
                  {items.map((i, idx) => (
                    <tr key={i.id ?? idx} className="rc-row">
                      <td className="rc-num">{idx + 1}</td>
                      <td><span style={{ fontFamily:'monospace', fontWeight:800, color:'#1d4ed8', fontSize:12 }}>
                        {i.partNumber || '—'}</span></td>
                      <td style={{ fontSize:12 }}>{i.description || '—'}</td>
                      <td>{i.categoryName
                        ? <span className="rc-chip">{i.categoryName}</span>
                        : <span style={{ color:'#cbd5e1' }}>—</span>}</td>
                      <td className="num" style={{ fontWeight:800 }}>{parseFloat(i.qty||0).toFixed(0)}</td>
                      <td className="num" style={{ color:'#64748b', fontSize:12 }}>
                        {i.rate ? `₹${fmtNum(i.rate)}` : '—'}</td>
                      <td className="num" style={{ fontWeight:700 }}>
                        {i.rate ? `₹${fmtNum((parseFloat(i.qty)||0)*(parseFloat(i.rate)||0))}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'#f8fafc', fontWeight:800 }}>
                    <td colSpan={4} style={{ padding:'9px 12px', fontSize:12 }}>Total</td>
                    <td className="num" style={{ padding:'9px 12px', color:'#1d4ed8' }}>{totalQty.toFixed(0)}</td>
                    <td></td>
                    <td className="num" style={{ padding:'9px 12px' }}>₹{fmtNum(totalVal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: TIMELINE */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, minWidth:0 }}>
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '120ms' }}>
            <div className="rc-card-title"><FiClock size={13}/> Timeline</div>
            <DcTimeline dcId={dc.id} refreshKey={refreshKey}/>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showPrint && (
        <DeliveryChallanPrintModal dc={mapDcForPrint(dc)} onClose={() => setShowPrint(false)}/>
      )}
      {showAssembly && (
        <AssemblyModal dc={dc}
          onClose={() => setShowAssembly(false)}
          onDone={() => { setShowAssembly(false); load(true); }}/>
      )}
    </div>
  );
};

export default DeliveryChallanDetail;
