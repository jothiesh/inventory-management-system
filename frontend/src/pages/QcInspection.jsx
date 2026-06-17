import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiPauseCircle,
  FiAlertTriangle, FiPackage, FiUser, FiCalendar,
  FiFileText, FiClipboard, FiList, FiGrid, FiCheck,
  FiInfo, FiDownload, FiEye, FiX, FiChevronDown, FiEdit2,
} from 'react-icons/fi';
import './QcInspection.css';

const token = () => localStorage.getItem('token');
const api   = (url, opts = {}) => axios({ url, headers: { Authorization: `Bearer ${token()}` }, ...opts });

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  : '—';

const DECISIONS = {
  ACCEPTED: { label:'Accept All', color:'#10b981', bg:'#d1fae5', icon: FiCheckCircle },
  REJECTED: { label:'Reject All', color:'#ef4444', bg:'#fee2e2', icon: FiXCircle },
  HOLD:     { label:'Hold',       color:'#f59e0b', bg:'#fef3c7', icon: FiPauseCircle },
};

const INSPECTOR_LS_KEY = 'qcInspectorName';
const safeName = (s) => String(s || '').trim().replace(/[^\w\-.]+/g, '_') || 'NA';

// ── Checklist per-row dialog ───────────────────────────────────
// ★ TASK 1: each stage now has a tick — only ticked stages are
//   applicable / counted / submitted. Unticked rows are dimmed.
const ChecklistDialog = ({ lot, stages, results, selStages, onToggleStage,
                           onSelectAll, onChange, onClose }) => {
  const selectedList = stages.filter(s => selStages.has(s.id));
  const filledCount  = selectedList.filter(s => results[`${lot.lotId}-${s.id}`]?.result).length;

  return (
    <div className="qci-dialog-overlay" onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="qci-dialog">
        <div className="qci-dialog-head">
          <div>
            <div className="qci-dialog-title">{lot.partNumber||'Item'} — Checklist</div>
            <div className="qci-dialog-sub">{lot.description} · tick only the checkpoints that apply</div>
          </div>
          <button className="qci-dialog-close" onClick={onClose}><FiX size={16}/></button>
        </div>
        <div className="qci-dialog-body">
          {stages.map((stage, idx) => {
            const key      = `${lot.lotId}-${stage.id}`;
            const current  = results[key]?.result;
            const selected = selStages.has(stage.id);
            return (
              <div key={stage.id} className={`qci-dialog-stage ${selected ? '' : 'qci-stage-off'}`}>
                {/* ★ TASK 1 — applicability tick */}
                <label className="qci-stage-select" title={selected ? 'Included in inspection' : 'Excluded — tick to include'}>
                  <input type="checkbox" checked={selected}
                    onChange={() => onToggleStage(stage.id)}/>
                </label>
                <div className="qci-dialog-stage-num">{stage.slNo || idx+1}</div>
                <div className="qci-dialog-stage-info">
                  {stage.stageOperation && (
                    <span className="qci-dialog-op">{stage.stageOperation}</span>
                  )}
                  <div className="qci-dialog-stage-name">{stage.checkPoint}</div>
                  {stage.aqlLabel && <span className="qci-dialog-aql">AQL: {stage.aqlLabel}</span>}
                </div>
                <div className="qci-dialog-btns">
                  {[{k:'PASS',l:'Pass',c:'#10b981'},{k:'FAIL',l:'Fail',c:'#ef4444'},{k:'NA',l:'N/A',c:'#94a3b8'}].map(({k,l,c})=>(
                    <button key={k} disabled={!selected}
                      className={`qci-dialog-btn ${current===k?'active':''}`}
                      style={current===k?{background:c,borderColor:c,color:'#fff'}:{color:c,borderColor:c}}
                      onClick={()=>onChange(key,'result',k)}>{l}</button>
                  ))}
                </div>
                <input className="qci-dialog-remark" placeholder="Remarks…" disabled={!selected}
                  value={results[key]?.remarks||''}
                  onChange={e=>onChange(key,'remarks',e.target.value)}/>
              </div>
            );
          })}
        </div>
        <div className="qci-dialog-foot">
          <span className="qci-dialog-progress">
            {filledCount} / {selectedList.length} selected filled
            <span className="qci-dialog-sel-info"> · {selectedList.length} of {stages.length} checkpoints selected</span>
          </span>
          <div className="qci-dialog-foot-actions">
            <button className="qci-sel-link" onClick={()=>onSelectAll(true)}>Select All</button>
            <button className="qci-sel-link" onClick={()=>onSelectAll(false)}>None</button>
            <button className="qci-btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Template Live Preview ──────────────────────────────────────
// ★ TASK 4: shows LIVE values — Pass/Fail ticked from the checklist
//   answers, remarks filled, Verified By = inspector name, and the
//   Lot decision box ticked automatically.
const TemplatePreview = ({ template, batch, selStages, getStageResult,
                           inspectorName, liveDecision,
                           inspQty, onInspQty, lotQtyDisplay }) => {
  if (!template) return null;
  const stages = template.stages || [];
  const padCount = Math.max(0, 6 - stages.length);

  const tick = (checked) => checked ? '☑' : '☐';

  return (
    <div className="qci-preview-doc">
      <div className="qci-preview-header">
        <div className="qci-preview-brand">
          <div className="qci-preview-logo">Thinture<sup>®</sup></div>
          <div className="qci-preview-tagline">Think Future</div>
        </div>
        <div className="qci-preview-company">
          <div className="qci-preview-company-name">Thinture Technologies Pvt. Ltd.</div>
          <div className="qci-preview-company-addr">No. 508, 2nd Floor, HMT Layout, Vidyaranayapura, Bangalore – 560 097</div>
        </div>
      </div>
      <div className="qci-preview-title-row">
        <span className="qci-preview-title">{template.categoryName?.toUpperCase()} INSPECTION CHECK LIST</span>
        <span className="qci-preview-formno">F No: {template.formNo}</span>
      </div>
      <div className="qci-preview-meta">
        <div className="qci-preview-meta-row">
          <span>Invoice No:</span><strong>{batch?.invoiceNo||batch?.invoiceNumber||'___________'}</strong>
          <span>Received Date:</span><strong>{fmtDate(batch?.receivedDate)}</strong>
          {/* ★ TASK 2: individual item quantities (e.g. 500 + 400), not the batch total */}
          <span>Lot Qty:</span><strong>{lotQtyDisplay || batch?.totalQty || batch?.totalQuantity || '____'}</strong>
        </div>
        <div className="qci-preview-meta-row">
          <span>Supplier Name:</span><strong>{batch?.supplierName||'_____________________________'}</strong>
          <span>Batch Ref:</span><strong>{batch?.batchRef||'____________'}</strong>
        </div>
      </div>
      <table className="qci-preview-table">
        <thead><tr>
          <th style={{width:'6%'}}>Sl No</th>
          <th style={{width:'20%'}}>Stage / Operation</th>
          <th style={{width:'32%'}}>Check Points</th>
          <th style={{width:'12%'}}>Inspected Qty (AQL)</th>
          <th style={{width:'16%'}}>Remarks</th>
          <th style={{width:'14%'}}>Pass/Fail/NA</th>
        </tr></thead>
        <tbody>
          {stages.map((s, i) => {
            const selected = selStages.has(s.id);
            const live     = selected ? getStageResult(s.id) : { result:null, remarks:'' };
            const res      = live.result;
            return (
              <tr key={s.id||i} className={selected ? '' : 'qci-preview-row-off'}>
                <td style={{textAlign:'center'}}>{s.slNo||i+1}</td>
                <td>{s.stageOperation||''}</td>
                <td>{s.checkPoint||''}</td>
                {/* ★ TASK 1: Inspected Qty is now EDITABLE directly in the preview */}
                <td style={{textAlign:'center'}}>
                  {selected
                    ? <input
                        className="qci-preview-qty-input"
                        value={inspQty?.[s.id] ?? ''}
                        onChange={e => onInspQty && onInspQty(s.id, e.target.value)}
                        placeholder={s.aqlLabel || 'Qty'}
                        title="Inspected Qty (AQL) — editable"
                      />
                    : '—'}
                </td>
                <td className="qci-preview-remarks-cell">{selected ? (live.remarks||'') : 'Not Applicable'}</td>
                <td style={{textAlign:'center',fontSize:9}}>
                  {selected
                    ? <>
                        <span className={res==='PASS'?'qci-tick-pass':''}>{tick(res==='PASS')} Pass</span>{' '}
                        <span className={res==='FAIL'?'qci-tick-fail':''}>{tick(res==='FAIL')} Fail</span>{' '}
                        <span className={res==='NA'?'qci-tick-na':''}>{tick(res==='NA')} N/A</span>
                      </>
                    : '—'}
                </td>
              </tr>
            );
          })}
          {Array.from({length: padCount}).map((_, i) => (
            <tr key={`pad-${i}`}><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          ))}
        </tbody>
      </table>
      <div className="qci-preview-footer">
        <div className="qci-preview-sign">
          <div className="qci-preview-sign-name">{inspectorName||''}</div>
          <div className="qci-preview-sign-line"/>
          <div>Verified By (Name &amp; Signature)</div>
        </div>
        <div className="qci-preview-decision">
          Lot is&nbsp;
          <span className={liveDecision==='ACCEPTED'?'qci-tick-pass':''}>{tick(liveDecision==='ACCEPTED')} Accepted</span>&nbsp;
          <span className={liveDecision==='REJECTED'?'qci-tick-fail':''}>{tick(liveDecision==='REJECTED')} Rejected</span>&nbsp;
          <span className={liveDecision==='HOLD'?'qci-tick-hold':''}>{tick(liveDecision==='HOLD')} Hold</span>&nbsp;
          <span className={liveDecision==='PARTIAL'?'qci-tick-hold':''}>{tick(liveDecision==='PARTIAL')} Partial</span>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
const QcInspection = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [batch,         setBatch]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [mode,          setMode]          = useState('bulk');

  // Bulk
  const [bulkDecision,  setBulkDecision]  = useState('');
  const [bulkRemarks,   setBulkRemarks]   = useState('');
  // Per-item qty
  const [perItem,       setPerItem]       = useState({});
  // Checklist results key=`${lotId}-${stageId}` → { result, remarks }
  const [clResults,     setClResults]     = useState({});

  // ★ TASK 1: Inspected Qty (AQL) — editable per checkpoint in the preview
  const [inspQty,       setInspQty]       = useState({});
  const setStageInspQty = (stageId, v) => setInspQty(prev => ({ ...prev, [stageId]: v }));

  // ★ TASK 3: inspector name — editable + remembered (localStorage)
  const [inspectorName, setInspectorName] = useState(
    () => localStorage.getItem(INSPECTOR_LS_KEY) || 'QC Inspector'
  );
  const [editingName,   setEditingName]   = useState(false);

  // ★ TASK 1: which checkpoints are applicable (Set of stage ids)
  const [selStages,     setSelStages]     = useState(new Set());

  // ★ NEW: which batch ITEMS are selected for this submission.
  //   Unticked items are NOT decided — they stay in the QC waiting
  //   list (batch remains PENDING_QC with the remaining items).
  const [selLots,       setSelLots]       = useState(new Set());

  // Template
  const [allTemplates,  setAllTemplates]  = useState([]);
  const [selTemplate,   setSelTemplate]   = useState(null);
  const [showPreview,   setShowPreview]   = useState(false);
  const [loadingTpl,    setLoadingTpl]    = useState(false);

  // Dialog
  const [dialogLot,     setDialogLot]     = useState(null);

  useEffect(() => {
    // only override with logged-in user name if nothing was saved before
    if (!localStorage.getItem(INSPECTOR_LS_KEY)) {
      if (user?.fullName)      setInspectorName(user.fullName);
      else if (user?.username) setInspectorName(user.username);
    }
  }, [user]);

  // persist inspector name so "Sowmya Shree" stays for next batches
  const saveInspectorName = (name) => {
    setInspectorName(name);
    localStorage.setItem(INSPECTOR_LS_KEY, name);
  };

  useEffect(() => { loadBatch(); loadTemplates(); }, [id]);

  const loadBatch = async () => {
    try {
      setLoading(true);
      const res  = await api(`/api/qc/batches/${id}`);
      const data = res.data.data || res.data;
      setBatch(data);
      const items = data.lots || data.items || [];
      const init = {};
      items.forEach(lot => {
        const received = parseFloat(lot.qtyReceived||lot.quantity||lot.receivedQty||0);
        init[lot.lotId] = { accepted: received, rejected: 0, held: 0, remarks: '' };
      });
      setPerItem(init);
      // ★ default: all items ticked
      setSelLots(new Set(items.map(l => l.lotId)));
    } catch { toast.error('Failed to load batch'); setBatch(null); }
    finally { setLoading(false); }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTpl(true);
      const res  = await api('/api/qc/templates');
      const data = res.data?.data || res.data || [];
      setAllTemplates(Array.isArray(data) ? data : []);
    } catch (e) { console.warn('Templates load failed:', e.message); }
    finally { setLoadingTpl(false); }
  };

  // Auto-match template by category
  useEffect(() => {
    if (!batch || allTemplates.length === 0 || selTemplate) return;
    const cat = (batch.categoryCode || batch.categoryName || '').toUpperCase().trim();
    const match = allTemplates.find(t =>
      t.categoryCode?.toUpperCase()?.trim() === cat ||
      t.categoryName?.toUpperCase()?.trim() === cat
    );
    if (match) setSelTemplate(match);
  }, [batch, allTemplates]);

  const stages = useMemo(() => selTemplate?.stages || [], [selTemplate]);

  // ★ TASK 1: when template changes, default = all stages selected
  useEffect(() => {
    setSelStages(new Set(stages.map(s => s.id)));
  }, [selTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStage = (stageId) => {
    setSelStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };
  const selectAllStages = (all) =>
    setSelStages(all ? new Set(stages.map(s => s.id)) : new Set());

  // ★ NEW: item (lot) selection helpers
  const lots = batch?.lots || batch?.items || [];
  const toggleLot = (lotId) => {
    setSelLots(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };
  const selectAllLots = (all) =>
    setSelLots(all ? new Set(lots.map(l => l.lotId)) : new Set());

  const handleClChange = (key, field, value) =>
    setClResults(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const updatePerItem = (lotId, field, value) =>
    setPerItem(prev => ({ ...prev, [lotId]: { ...prev[lotId], [field]: value } }));

  // Totals
  const totalLots   = lots.length;
  const totalQty    = lots.reduce((s,l)=>s+parseFloat(l.qtyReceived||l.quantity||l.receivedQty||0),0);

  // ★ per-item totals are over SELECTED items only
  const selLotsArr  = lots.filter(l => selLots.has(l.lotId));
  const selReceived = selLotsArr.reduce((s,l)=>s+parseFloat(l.qtyReceived||l.quantity||l.receivedQty||0),0);
  const totAccepted = selLotsArr.reduce((s,l)=>s+parseFloat(perItem[l.lotId]?.accepted||0),0);
  const totRejected = selLotsArr.reduce((s,l)=>s+parseFloat(perItem[l.lotId]?.rejected||0),0);
  const totHeld     = selLotsArr.reduce((s,l)=>s+parseFloat(perItem[l.lotId]?.held||0),0);

  // ★ BUG FIX + TASK 4: merge per-lot checklist answers into one
  //   result per stage. FAIL wins over PASS wins over NA.
  const getStageResult = (stageId) => {
    let result = null, remarks = '';
    const consider = (r) => {
      if (!r) return;
      if (r.result) {
        if (r.result === 'FAIL') result = 'FAIL';
        else if (r.result === 'PASS' && result !== 'FAIL') result = 'PASS';
        else if (r.result === 'NA' && !result) result = 'NA';
      }
      if (r.remarks) remarks = remarks ? `${remarks}; ${r.remarks}` : r.remarks;
    };
    lots.forEach(l => consider(clResults[`${l.lotId}-${stageId}`]));
    consider(clResults[`global-${stageId}`]); // backward compat
    return { result, remarks };
  };

  // Only selected stages carry real results; unselected go as NA
  // ★ TASK 1: inspectedQty included in the checklist payload
  const buildChecklist = () => stages.map(s => {
    if (!selStages.has(s.id)) {
      return { stageId: s.id, result: 'NA', remarks: 'Not applicable', inspectedQty: null };
    }
    const live = getStageResult(s.id);
    return {
      stageId:      s.id,
      result:       live.result  || 'NA',
      remarks:      live.remarks || null,
      inspectedQty: (inspQty[s.id] ?? '').toString().trim() || null,
    };
  });

  // ★ TASK 2: individual lot quantities for the preview header —
  //   per-item mode with ticked rows → "500 + 400"; otherwise all lots.
  const lotQtyDisplay = useMemo(() => {
    const qtyOf = (l) => parseFloat(l.qtyReceived || l.quantity || l.receivedQty || 0);
    const src = (mode === 'per-item' && selLotsArr.length > 0) ? selLotsArr : lots;
    if (!src.length) return String(batch?.totalQty || batch?.totalQuantity || '____');
    if (src.length === 1) return qtyOf(src[0]).toFixed(0);
    return src.map(l => qtyOf(l).toFixed(0)).join(' + ');
  }, [mode, selLotsArr, lots, batch]);

  // ★ TASK 4: live overall decision for the preview footer
  const liveDecision = useMemo(() => {
    if (mode === 'bulk') return bulkDecision || '';
    const a = totAccepted, r = totRejected, h = totHeld;
    if (a > 0 && r === 0 && h === 0) return 'ACCEPTED';
    if (r > 0 && a === 0 && h === 0) return 'REJECTED';
    if (h > 0 && a === 0 && r === 0) return 'HOLD';
    if (a + r + h > 0)               return 'PARTIAL';
    return '';
  }, [mode, bulkDecision, totAccepted, totRejected, totHeld]);

  const downloadTemplate = async (type) => {
    if (!selTemplate) return;
    try {
      const res  = await api(`/api/qc/templates/blank/${selTemplate.categoryCode}/${type}`, { responseType:'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `QC_${selTemplate.categoryCode}.${type==='excel'?'xlsx':'docx'}`;
      a.click();
    } catch { toast.error('Download failed'); }
  };

  // ★ NEW: auto-download the generated inspection PDF, named with
  //   invoice no (or batch ref) + inspector name.
  const autoDownloadPdf = async (respData) => {
    const pdfUrl = respData?.pdfDownloadUrl;
    if (!pdfUrl) return;
    try {
      const res = await api(pdfUrl, { responseType: 'blob' });
      const invoice = (batch?.invoiceNo && batch.invoiceNo !== '—')
        ? batch.invoiceNo
        : (batch?.batchRef || `Batch-${id}`);
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `QC_${safeName(invoice)}_${safeName(inspectorName)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.warn('Decision saved, but PDF download failed — open it from History'); }
  };

  const stageCount = (lotId) => {
    const selected = stages.filter(s => selStages.has(s.id));
    if (!selected.length) return stages.length ? '0 sel' : null;
    const done = selected.filter(s=>clResults[`${lotId}-${s.id}`]?.result).length;
    return `${done}/${selected.length}`;
  };

  // ── SUBMIT ────────────────────────────────────────────────────
  const handleBulkSubmit = async (pdf=false) => {
    if (!bulkDecision) { toast.error('Select a decision first'); return; }
    if (!window.confirm(`${DECISIONS[bulkDecision].label} all ${totalLots} items?`)) return;
    try {
      setSubmitting(true);
      const res = await api('/api/qc/decisions/bulk', {
        method:'POST',
        data: { batchId:parseInt(id), decision:bulkDecision, remarks:bulkRemarks||null,
                inspectorName:inspectorName||null, checklistResults:buildChecklist() },
        params: pdf ? { generatePdf:true } : {}
      });
      toast.success('QC decision recorded!');
      if (pdf) await autoDownloadPdf(res.data?.data || res.data);
      setTimeout(() => navigate('/qc/queue'), 1200);
    } catch (err) { toast.error(err.response?.data?.message||'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const handlePerItemSubmit = async (pdf=false) => {
    // ★ only SELECTED items are validated and submitted
    if (selLotsArr.length === 0) { toast.error('Tick at least one item to submit'); return; }
    const errs = [];
    selLotsArr.forEach((lot) => {
      const d  = perItem[lot.lotId]||{};
      const t  = parseFloat(d.accepted||0)+parseFloat(d.rejected||0)+parseFloat(d.held||0);
      const r  = parseFloat(lot.qtyReceived||lot.quantity||lot.receivedQty||0);
      const idx = lots.findIndex(l => l.lotId === lot.lotId);
      if (Math.abs(t-r)>0.001) errs.push(`Item #${idx+1}: ${t} ≠ ${r}`);
    });
    if (errs.length) { toast.error(errs.slice(0,3).join('\n'), {autoClose:5000,style:{whiteSpace:'pre-line'}}); return; }

    const remaining = totalLots - selLotsArr.length;
    const confirmMsg = remaining > 0
      ? `Submit ${selLotsArr.length} of ${totalLots} items?\n${remaining} unticked item(s) will stay in the QC waiting list.`
      : 'Submit per-item QC decisions?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmitting(true);
      const res = await api('/api/qc/decisions/per-item', {
        method:'POST',
        data: {
          batchId:parseInt(id), inspectorName:inspectorName||null, checklistResults:buildChecklist(),
          // ★ FIX: backend DTO field is `items` (req.getItems()) — was `itemDecisions`,
          //   which deserialized to an empty list → "At least one item decision is required"
          items: selLotsArr.map(lot => ({
            lotId:           lot.lotId,
            qtyAccepted:     parseFloat(perItem[lot.lotId]?.accepted||0),
            qtyRejected:     parseFloat(perItem[lot.lotId]?.rejected||0),
            qtyHeld:         parseFloat(perItem[lot.lotId]?.held||0),
            rejectionReason: perItem[lot.lotId]?.remarks||null,
          })),
        },
        params: pdf ? { generatePdf:true } : {}
      });

      const respData = res.data?.data || res.data;
      if (pdf) await autoDownloadPdf(respData);

      const stillPending = respData?.batchStatus === 'PENDING_QC';
      if (stillPending) {
        toast.success(`${selLotsArr.length} item(s) decided — ${remaining} item(s) remain in the waiting list`);
        // stay on the page; reload so only the remaining items show
        await loadBatch();
      } else {
        toast.success('Per-item decisions recorded!');
        setTimeout(() => navigate('/qc/queue'), 1200);
      }
    } catch (err) { toast.error(err.response?.data?.message||'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="qci-loading"><div className="qci-spinner"/><span>Loading batch…</span></div>;
  if (!batch)  return (
    <div className="qci-page">
      <div className="qci-error"><FiAlertTriangle size={32}/><h3>Batch not found</h3>
        <button className="qci-btn-secondary" onClick={()=>navigate('/qc/queue')}><FiArrowLeft size={14}/> Back</button>
      </div>
    </div>
  );

  return (
    <div className="qci-page">

      {/* CHECKLIST DIALOG */}
      {dialogLot && (
        <ChecklistDialog lot={dialogLot} stages={stages} results={clResults}
          selStages={selStages} onToggleStage={toggleStage} onSelectAll={selectAllStages}
          onChange={handleClChange} onClose={()=>setDialogLot(null)}/>
      )}

      {/* HEADER */}
      <div className="qci-header">
        <div className="qci-header-left">
          <button className="qci-back-btn" onClick={()=>navigate('/qc/queue')}><FiArrowLeft size={16}/></button>
          <div className="qci-header-icon"><FiClipboard size={20}/></div>
          <div>
            <h1 className="qci-title">{batch.batchRef||`Batch #${id}`}</h1>
            <p className="qci-subtitle">QC Inspection · {totalLots} item{totalLots!==1?'s':''} · {totalQty} units</p>
          </div>
        </div>
        <span className="qci-status-badge">PENDING QC</span>
      </div>

      {/* META CARDS */}
      <div className="qci-meta-row">
        {[
          { icon:FiPackage,  label:'CATEGORY', value:batch.categoryName||batch.categoryCode||'—' },
          { icon:FiUser,     label:'SUPPLIER',  value:batch.supplierName||'—' },
          { icon:FiFileText, label:'INVOICE',   value:batch.invoiceNo||batch.invoiceNumber||'—' },
          { icon:FiCalendar, label:'RECEIVED',  value:fmtDate(batch.receivedDate) },
        ].map(({icon:Icon,label,value})=>(
          <div key={label} className="qci-meta-card">
            <Icon size={16} className="qci-meta-icon"/>
            <div><span className="qci-meta-label">{label}</span><span className="qci-meta-value">{value}</span></div>
          </div>
        ))}
      </div>

      {/* ── TEMPLATE SELECTOR ─────────────────────────────────── */}
      <div className="qci-card">
        <div className="qci-card-head"><FiList size={15}/> Checklist Template</div>
        <div className="qci-card-body">
          {!selTemplate && (
            <div className="qci-tpl-hint">
              <FiInfo size={14}/>
              Category <strong>"{batch.categoryName||batch.categoryCode}"</strong> — please select the correct checklist template:
            </div>
          )}
          <div className="qci-tpl-row">
            <div className="qci-tpl-select-wrap">
              <label className="qci-tpl-label">Inspection Checklist:</label>
              <select className="qci-tpl-select" value={selTemplate?.id||''}
                onChange={e => { const t=allTemplates.find(x=>String(x.id)===e.target.value); setSelTemplate(t||null); setShowPreview(false); }}>
                <option value="">— Choose a checklist template —</option>
                {loadingTpl && <option disabled>Loading templates…</option>}
                {allTemplates.map(t=>(
                  <option key={t.id} value={t.id}>
                    {t.categoryName} ({t.categoryCode}) · {t.formNo}
                  </option>
                ))}
              </select>
            </div>
            {selTemplate && (
              <div className="qci-tpl-actions">
                <span className="qci-tpl-badge">{selTemplate.categoryCode}</span>
                <span className="qci-tpl-info">{selTemplate.categoryName} · {selTemplate.formNo} · {stages.length} stages</span>
                <button className="qci-tpl-btn excel" onClick={()=>downloadTemplate('excel')}><FiDownload size={12}/> Excel</button>
                <button className="qci-tpl-btn word"  onClick={()=>downloadTemplate('docx')}><FiDownload size={12}/> Word</button>
                <button className="qci-tpl-btn preview" onClick={()=>setShowPreview(p=>!p)}><FiEye size={12}/> {showPreview?'Hide':'Preview'}</button>
                <button className="qci-tpl-btn clear" onClick={()=>{setSelTemplate(null);setShowPreview(false);}}>Clear</button>
              </div>
            )}
          </div>
          {showPreview && selTemplate && (
            <div className="qci-tpl-preview-wrap">
              {/* ★ TASK 4: live preview wired to real inspection values */}
              <TemplatePreview template={selTemplate} batch={batch}
                selStages={selStages} getStageResult={getStageResult}
                inspectorName={inspectorName} liveDecision={liveDecision}
                inspQty={inspQty} onInspQty={setStageInspQty}
                lotQtyDisplay={lotQtyDisplay}/>
            </div>
          )}
        </div>
      </div>

      {/* ── INSPECTOR + MODE TOGGLE ── */}
      <div className="qci-split-header-row">
        <div className="qci-card qci-inspector-panel">
          <div className="qci-card-head">
            <FiUser size={14}/> Inspector Details
            {/* ★ TASK 3: edit toggle */}
            <button className="qci-name-edit-btn" title="Edit inspector name"
              onClick={()=>setEditingName(e=>!e)}>
              <FiEdit2 size={12}/>
            </button>
          </div>
          <div className="qci-card-body">
            {editingName ? (
              <div className="qci-name-edit-row">
                <input type="text" className="qci-input" placeholder="Inspector name" autoFocus
                  value={inspectorName}
                  onChange={e=>saveInspectorName(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') setEditingName(false); }}/>
                <button className="qci-name-save-btn" onClick={()=>setEditingName(false)}>
                  <FiCheck size={13}/>
                </button>
              </div>
            ) : (
              <div className="qci-name-display" onClick={()=>setEditingName(true)} title="Click to edit">
                <span>{inspectorName||'—'}</span>
                <FiEdit2 size={12} className="qci-name-display-pen"/>
              </div>
            )}
          </div>
        </div>
        <div className="qci-mode-toggle-panel">
          <button className={`qci-toggle-btn ${mode==='bulk'?'active':''}`} onClick={()=>setMode('bulk')}>
            <FiGrid size={14}/> Bulk Decision{mode==='bulk'&&<span className="qci-mode-dot"/>}
          </button>
          <button className={`qci-toggle-btn ${mode==='per-item'?'active':''}`} onClick={()=>setMode('per-item')}>
            <FiList size={14}/> Per-Item Decision{mode==='per-item'&&<span className="qci-mode-dot"/>}
          </button>
        </div>
      </div>

      {/* ══ BULK DECISION ══════════════════════════════════════ */}
      {mode === 'bulk' && (
        <>
          {/* ★ Batch items table ONLY in bulk mode */}
          <div className="qci-card">
            <div className="qci-card-head">
              <FiPackage size={14}/> Batch Items ({totalLots}) — {totalQty} total units
            </div>
            <table className="qci-batch-table">
              <thead><tr><th>#</th><th>Part #</th><th>Description</th><th className="num">Qty</th><th>Category</th></tr></thead>
              <tbody>
                {lots.map((lot,idx)=>(
                  <tr key={lot.lotId}>
                    <td className="qci-row-num">{idx+1}</td>
                    <td className="qci-part-num">{lot.partNumber||'—'}</td>
                    <td>{lot.description||'—'}</td>
                    <td className="num">{parseFloat(lot.qtyReceived||lot.quantity||lot.receivedQty||0).toFixed(0)}</td>
                    <td><span className="qci-cat-tag">{lot.categoryName||lot.category||'—'}</span></td>
                  </tr>
                ))}
                <tr className="qci-totals-row">
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{totalQty}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="qci-card">
            <div className="qci-card-head"><FiCheckCircle size={15}/> Bulk Decision</div>
            <div className="qci-card-body">
              {/* ★ TASK 2: compact decision buttons */}
              <div className="qci-bulk-options">
                {Object.entries(DECISIONS).map(([key,cfg])=>{
                  const Icon=cfg.icon; const active=bulkDecision===key;
                  return (
                    <button key={key} className={`qci-decision-card ${active?'active':''}`}
                      onClick={()=>setBulkDecision(key)}
                      style={active?{background:cfg.bg,borderColor:cfg.color}:{}}>
                      <Icon size={16} style={{color:cfg.color}}/>
                      <span style={{color:cfg.color,fontWeight:700}}>{cfg.label}</span>
                      {active&&<span className="qci-decision-check" style={{background:cfg.color}}><FiCheck size={10}/></span>}
                    </button>
                  );
                })}
              </div>
              <div className="qci-field">
                <label>Remarks (optional)</label>
                <textarea className="qci-textarea" rows={3} placeholder="Add notes for this bulk decision…"
                  value={bulkRemarks} onChange={e=>setBulkRemarks(e.target.value)}/>
              </div>
              <div className="qci-submit-row">
                <button className="qci-btn-secondary" onClick={()=>navigate('/qc/queue')} disabled={submitting}>Cancel</button>
                <button className="qci-btn-secondary" onClick={()=>handleBulkSubmit(false)} disabled={submitting||!bulkDecision}>
                  {submitting?'Submitting…':'Submit Decision Only'}
                </button>
                <button className="qci-btn-primary" onClick={()=>handleBulkSubmit(true)} disabled={submitting||!bulkDecision}>
                  {submitting?'Submitting…':'Submit & Generate PDF'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ PER-ITEM DECISION ══════════════════════════════════ */}
      {mode === 'per-item' && (
        <div className="qci-card">
          <div className="qci-card-head">
            <FiList size={15}/> Per-Item Decision Workspace
            <span className="qci-head-sel-info qci-head-sel-items">
              {selLotsArr.length}/{totalLots} items selected
            </span>
            {stages.length>0 && (
              <span className="qci-head-sel-info">
                {selStages.size}/{stages.length} checkpoints selected
              </span>
            )}
          </div>
          <div className="qci-per-item-table-wrap">
            <table className="qci-per-item-table">
              <thead>
                <tr>
                  {/* ★ NEW: select-all items tick */}
                  <th style={{width:34, textAlign:'center'}}>
                    <input type="checkbox" className="qci-lot-checkbox"
                      title="Select / deselect all items"
                      checked={selLotsArr.length === totalLots && totalLots > 0}
                      onChange={e=>selectAllLots(e.target.checked)}/>
                  </th>
                  <th style={{width:36}}>#</th>
                  <th>Part #</th>
                  <th>Description</th>
                  <th className="num-col" style={{width:76}}>Received</th>
                  <th className="num-col" style={{width:82}}>Accepted</th>
                  <th className="num-col" style={{width:78}}>Rejected</th>
                  <th className="num-col" style={{width:70}}>Held</th>
                  <th>Remarks</th>
                  {stages.length>0 && <th style={{width:90}}>Checklist</th>}
                </tr>
              </thead>
              <tbody>
                {lots.map((lot,idx)=>{
                  const selected = selLots.has(lot.lotId);
                  const d  = perItem[lot.lotId]||{};
                  const r  = parseFloat(lot.qtyReceived||lot.quantity||lot.receivedQty||0);
                  const t  = parseFloat(d.accepted||0)+parseFloat(d.rejected||0)+parseFloat(d.held||0);
                  const mm = selected && Math.abs(t-r)>0.001;
                  const sc = stageCount(lot.lotId);
                  return (
                    <tr key={lot.lotId}
                        className={`${mm?'qci-row-mismatch':''} ${selected?'':'qci-lot-off'}`}>
                      {/* ★ NEW: item tick — unticked rows stay in waiting list */}
                      <td style={{textAlign:'center'}}>
                        <input type="checkbox" className="qci-lot-checkbox"
                          checked={selected}
                          title={selected ? 'Included in this submission' : 'Stays in QC waiting list'}
                          onChange={()=>toggleLot(lot.lotId)}/>
                      </td>
                      <td className="qci-row-num">{idx+1}</td>
                      <td className="qci-part-num">{lot.partNumber||'—'}</td>
                      <td style={{fontSize:12}}>{lot.description||'—'}</td>
                      <td className="num-col qci-received">{r}</td>
                      <td className="num-col">
                        <input type="number" step="1" min="0" max={r} disabled={!selected}
                          className="qci-qty-input qci-qty-accepted"
                          value={d.accepted??0}
                          onChange={e=>updatePerItem(lot.lotId,'accepted',e.target.value)}/>
                      </td>
                      <td className="num-col">
                        <input type="number" step="1" min="0" max={r} disabled={!selected}
                          className="qci-qty-input qci-qty-rejected"
                          value={d.rejected??0}
                          onChange={e=>updatePerItem(lot.lotId,'rejected',e.target.value)}/>
                      </td>
                      <td className="num-col">
                        <input type="number" step="1" min="0" max={r} disabled={!selected}
                          className="qci-qty-input qci-qty-held"
                          value={d.held??0}
                          onChange={e=>updatePerItem(lot.lotId,'held',e.target.value)}/>
                      </td>
                      <td>
                        <input type="text" className="qci-remarks-input" placeholder="Notes…" disabled={!selected}
                          value={d.remarks??''}
                          onChange={e=>updatePerItem(lot.lotId,'remarks',e.target.value)}/>
                      </td>
                      {stages.length>0 && (
                        <td>
                          <button className="qci-checklist-open-btn" disabled={!selected}
                            onClick={()=>setDialogLot(lot)}>
                            <FiList size={11}/> {sc} <FiChevronDown size={10}/>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="qci-totals-row">
                  <td colSpan={4}>Totals (selected)</td>
                  <td className="num-col">{selReceived}</td>
                  <td className="num-col qci-tot-accepted">{totAccepted}</td>
                  <td className="num-col qci-tot-rejected">{totRejected}</td>
                  <td className="num-col qci-tot-held">{totHeld}</td>
                  <td colSpan={stages.length>0?2:1}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="qci-per-item-foot">
            <div className="qci-warn-banner">
              <FiInfo size={14}/>
              <span>Each ticked row: <strong>Accepted + Rejected + Held = Received</strong>.
                Unticked items are <strong>not decided now</strong> — they stay in the QC waiting list.</span>
            </div>
            {selLotsArr.length < totalLots && (
              <div className="qci-waiting-banner">
                <FiPauseCircle size={14}/>
                <span><strong>{totalLots - selLotsArr.length}</strong> item(s) will remain pending in the queue after submit.</span>
              </div>
            )}
            <div className="qci-submit-row" style={{marginTop:12}}>
              <button className="qci-btn-secondary" onClick={()=>navigate('/qc/queue')} disabled={submitting}>Cancel</button>
              <button className="qci-btn-secondary" onClick={()=>handlePerItemSubmit(false)} disabled={submitting||selLotsArr.length===0}>
                {submitting?'Submitting…':`Submit ${selLotsArr.length} Item${selLotsArr.length!==1?'s':''}`}
              </button>
              <button className="qci-btn-primary" onClick={()=>handlePerItemSubmit(true)} disabled={submitting||selLotsArr.length===0}>
                {submitting?'Submitting…':'Submit & Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QcInspection;