import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiPauseCircle,
  FiAlertTriangle, FiPackage, FiUser, FiCalendar,
  FiFileText, FiClipboard, FiList, FiGrid, FiCheck,
  FiInfo, FiDownload, FiEye, FiX, FiChevronDown, FiEdit2,
  FiRefreshCw,
} from 'react-icons/fi';
import { snapshotHtml, openPrintWindow, safeName } from './qcChecklistPrint';
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


// ── Template Live Preview (fully inline-editable) ──────────────
// Qty + Pass/Fail/NA + Remarks are all edited directly here.
const TemplatePreview = ({ template, batch, lot, selStages, getStageResult,
                           inspectorName, liveDecision, onDecisionTick,
                           inspQty, onInspQty,
                           onStageResult, onStageRemarks, onDownloadFilled }) => {
  if (!template || !lot) return null;
  const stages = template.stages || [];
  const padCount = Math.max(0, 6 - stages.length);

  const tick = (checked) => checked ? '☑' : '☐';

  // ★ every editable cell is namespaced by lot — switching tabs never
  //   overwrites what was typed on another lot's form.
  const lotId  = lot.lotId;
  const k      = (stageId) => `${lotId}-${stageId}`;
  const lotQty = parseFloat(lot.qtyReceived || lot.quantity || lot.receivedQty || 0);

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
          <span>Lot Qty:</span><strong>{lotQty ? lotQty.toFixed(0) : '____'}</strong>
        </div>
        <div className="qci-preview-meta-row">
          <span>Supplier Name:</span><strong>{batch?.supplierName||'_____________________________'}</strong>
          <span>Batch Ref:</span><strong>{batch?.batchRef||'____________'}</strong>
        </div>
        <div className="qci-preview-meta-row">
          <span>Material Desc:</span>
          <strong className="qci-preview-matdesc">
            {lot.description || lot.partNumber || '_____________________________'}
          </strong>
          <span>Part No:</span><strong>{lot.partNumber||'____________'}</strong>
        </div>
      </div>
      <table className="qci-preview-table">
        <thead><tr>
          <th style={{width:'6%'}}>Sl No</th>
          <th style={{width:'18%'}}>Stage / Operation</th>
          <th style={{width:'26%'}}>Check Points</th>
          <th style={{width:'11%'}}>Inspected Qty (AQL)</th>
          <th style={{width:'17%'}}>Remarks</th>
          <th style={{width:'22%'}}>Pass/Fail/NA</th>
        </tr></thead>
        <tbody>
          {stages.map((s, i) => {
            const selected = selStages.has(s.id);
            const live     = selected ? getStageResult(lotId, s.id) : { result:null, remarks:'' };
            const res      = live.result;
            return (
              <tr key={s.id||i} className={selected ? '' : 'qci-preview-row-off'}>
                <td style={{textAlign:'center'}}>{s.slNo||i+1}</td>
                <td>{s.stageOperation||''}</td>
                <td>{s.checkPoint||''}</td>

                {/* Inspected Qty — editable */}
                <td style={{textAlign:'center'}}>
                  {selected
                    ? <input
                        className="qci-preview-qty-input"
                        value={inspQty?.[k(s.id)] ?? ''}
                        onChange={e => onInspQty && onInspQty(lotId, s.id, e.target.value)}
                        placeholder={s.aqlLabel || 'Qty'}
                        title="Inspected Qty (AQL) — editable"
                      />
                    : '—'}
                </td>

                {/* Remarks — editable */}
                <td className="qci-preview-remarks-cell">
                  {selected
                    ? <input
                        className="qci-preview-remark-input"
                        value={live.remarks || ''}
                        onChange={e => onStageRemarks(lotId, s.id, e.target.value)}
                        placeholder="Remarks…"
                      />
                    : 'Not Applicable'}
                </td>

                {/* Pass/Fail/NA — editable buttons */}
                <td style={{textAlign:'center'}}>
                  {selected
                    ? <div className="qci-preview-pfn">
                        {[
                          {code:'PASS', l:'Pass', c:'#10b981'},
                          {code:'FAIL', l:'Fail', c:'#ef4444'},
                          {code:'NA',   l:'N/A',  c:'#94a3b8'},
                        ].map(({code,l,c}) => (
                          <button
                            key={code}
                            type="button"
                            className={`qci-preview-pfn-btn ${res===code ? 'active' : ''}`}
                            style={res===code ? {background:c, borderColor:c, color:'#fff'} : {color:c, borderColor:c}}
                            onClick={() => onStageResult(lotId, s.id, code)}
                          >
                            {tick(res===code)} {l}
                          </button>
                        ))}
                      </div>
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
          <div className="qci-preview-sign-name-row">
            <div className="qci-preview-sign-name">{inspectorName||''}</div>
            {onDownloadFilled && (
              <button type="button" className="qci-preview-dl-btn"
                onClick={() => onDownloadFilled(lotId)}
                title="Download this lot's filled checklist">
                <FiDownload size={11}/> Download this lot
              </button>
            )}
          </div>
          <div className="qci-preview-sign-line"/>
          <div>Verified By (Name &amp; Signature)</div>
        </div>
        <div className="qci-preview-decision">
          Lot is&nbsp;
          {[
            { code: 'ACCEPTED', l: 'Accepted', cls: 'qci-tick-pass' },
            { code: 'REJECTED', l: 'Rejected', cls: 'qci-tick-fail' },
            { code: 'HOLD',     l: 'Hold',     cls: 'qci-tick-hold' },
            { code: 'PARTIAL',  l: 'Partial',  cls: 'qci-tick-hold' },
          ].map(({ code, l, cls }) => {
            const on = liveDecision === code;
            return (
              <button
                key={code}
                type="button"
                className={`qci-preview-lot-tick ${on ? `active ${cls}` : ''}`}
                onClick={() => onDecisionTick && onDecisionTick(lotId, code)}
                title={on ? 'Click again to clear' : `Tick lot as ${l}`}
              >
                <span className="qci-lot-tick-box">{tick(on)}</span> {l}
              </button>
            );
          })}
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

  // Inspected Qty (AQL) — editable per checkpoint in the preview
  const [inspQty,       setInspQty]       = useState({});
  const setStageInspQty = (lotId, stageId, v) =>
    setInspQty(prev => ({ ...prev, [`${lotId}-${stageId}`]: v }));

  // inspector name — editable + remembered (localStorage)
  const [inspectorName, setInspectorName] = useState(
    () => localStorage.getItem(INSPECTOR_LS_KEY) || 'QC Inspector'
  );
  const [editingName,   setEditingName]   = useState(false);

  // which checkpoints are applicable (Set of stage ids)
  const [selStages,     setSelStages]     = useState(new Set());

  // which batch ITEMS are selected for this submission.
  const [selLots,       setSelLots]       = useState(new Set());

  // ★ Manual tick on each lot's "Lot is …" row, keyed by lotId.
  //   Absent = follow that lot's auto-computed decision. Clicking the same
  //   box again clears the override. Display / print only.
  const [lotTicks,      setLotTicks]      = useState({});
  const toggleLotTick = (lotId, d) =>
    setLotTicks(prev => ({ ...prev, [lotId]: prev[lotId] === d ? null : d }));

  // ★ which lot's checklist is on screen (one form per lot)
  const [activeLotId,   setActiveLotId]   = useState(null);

  // ★ when the checklist was last persisted (set by save-on-download)
  const [draftSavedAt,  setDraftSavedAt]  = useState(null);

  // Template
  const [allTemplates,  setAllTemplates]  = useState([]);
  const [selTemplate,   setSelTemplate]   = useState(null);
  const [showPreview,   setShowPreview]   = useState(true);
  const [loadingTpl,    setLoadingTpl]    = useState(false);

  // ★ ref to the live preview (for filled-checklist download)
  const previewRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem(INSPECTOR_LS_KEY)) {
      if (user?.fullName)      setInspectorName(user.fullName);
      else if (user?.username) setInspectorName(user.username);
    }
  }, [user]);

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
      setSelLots(new Set(items.map(l => l.lotId)));
      setActiveLotId(items[0]?.lotId ?? null);   // ★ open the first lot's form
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

  // when template changes, default = all stages selected
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

  // item (lot) selection helpers
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

  // ★ Rehydrate a previously saved draft.
  //   If the inspector downloaded, walked away, and came back, the form comes
  //   back filled instead of blank. Runs once per batch, after the templates
  //   have loaded so the saved templateCode can select the right one.
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (draftLoaded.current) return;
    if (!id || !allTemplates.length) return;
    draftLoaded.current = true;

    (async () => {
      try {
        const res   = await api(`/api/qc/checklists/draft/${id}`);
        const draft = res.data?.data || null;
        if (!draft || !draft.results?.length) return;

        const tpl = allTemplates.find(t =>
          String(t.categoryCode || '').toUpperCase() ===
          String(draft.templateCode || '').toUpperCase());
        if (tpl) setSelTemplate(tpl);

        const res2 = {}, qty2 = {};
        draft.results.forEach(r => {
          if (!r.stageId) return;
          const key = `${r.lotId}-${r.stageId}`;
          res2[key] = { result: r.result || null, remarks: r.remarks || '' };
          if (r.inspectedQty != null) qty2[key] = r.inspectedQty;
        });
        setClResults(res2);
        setInspQty(qty2);
        setDraftSavedAt(new Date(draft.updatedAt || Date.now()));
        toast.info('Restored your saved checklist', { autoClose: 2000 });
      } catch {
        /* no draft for this batch — normal on a first visit */
      }
    })();
  }, [id, allTemplates]);

  // ── Inline preview editors write ONE result per (lot, stage) ──
  //    Key was `global-${stageId}` — a single shared row for the whole batch.
  //    Now every lot carries its own form data.
  const ck = (lotId, stageId) => `${lotId}-${stageId}`;

  const setStageResult = (lotId, stageId, result) =>
    setClResults(prev => ({
      ...prev,
      [ck(lotId, stageId)]: { ...prev[ck(lotId, stageId)], result },
    }));
  const setStageRemarks = (lotId, stageId, remarks) =>
    setClResults(prev => ({
      ...prev,
      [ck(lotId, stageId)]: { ...prev[ck(lotId, stageId)], remarks },
    }));

  const updatePerItem = (lotId, field, value) =>
    setPerItem(prev => ({ ...prev, [lotId]: { ...prev[lotId], [field]: value } }));

  // Totals
  const totalLots   = lots.length;
  const totalQty    = lots.reduce((s,l)=>s+parseFloat(l.qtyReceived||l.quantity||l.receivedQty||0),0);

  const selLotsArr  = lots.filter(l => selLots.has(l.lotId));
  const selReceived = selLotsArr.reduce((s,l)=>s+parseFloat(l.qtyReceived||l.quantity||l.receivedQty||0),0);
  const totAccepted = selLotsArr.reduce((s,l)=>s+parseFloat(perItem[l.lotId]?.accepted||0),0);
  const totRejected = selLotsArr.reduce((s,l)=>s+parseFloat(perItem[l.lotId]?.rejected||0),0);
  const totHeld     = selLotsArr.reduce((s,l)=>s+parseFloat(perItem[l.lotId]?.held||0),0);

  // one result per (lot, stage)
  const getStageResult = (lotId, stageId) => {
    const r = clResults[ck(lotId, stageId)];
    return { result: r?.result || null, remarks: r?.remarks || '' };
  };

  // ★ One row per (lot, stage). Unselected stages go as NA.
  //   NOTE: the backend has no field for this yet — see notes.
  const buildChecklist = () => {
    const target = mode === 'per-item' && selLotsArr.length ? selLotsArr : lots;
    const out = [];
    target.forEach(lot => {
      stages.forEach(s => {
        if (!selStages.has(s.id)) {
          out.push({ lotId: lot.lotId, stageId: s.id, result: 'NA',
                     remarks: 'Not applicable', inspectedQty: null });
          return;
        }
        const live = getStageResult(lot.lotId, s.id);
        out.push({
          lotId:        lot.lotId,
          stageId:      s.id,
          result:       live.result  || 'NA',
          remarks:      live.remarks || null,
          inspectedQty: (inspQty[ck(lot.lotId, s.id)] ?? '').toString().trim() || null,
        });
      });
    });
    return out;
  };

  // ★ Each lot's own decision. In bulk mode every form shows the bulk pick;
  //   in per-item mode each form reflects that lot's own qty split.
  const autoLotDecision = (lot) => {
    if (mode === 'bulk') return bulkDecision || '';
    const d = perItem[lot.lotId] || {};
    const a = parseFloat(d.accepted || 0);
    const r = parseFloat(d.rejected || 0);
    const h = parseFloat(d.held     || 0);
    if (a > 0 && r === 0 && h === 0) return 'ACCEPTED';
    if (r > 0 && a === 0 && h === 0) return 'REJECTED';
    if (h > 0 && a === 0 && r === 0) return 'HOLD';
    if (a + r + h > 0)               return 'PARTIAL';
    return '';
  };
  // manual tick wins; otherwise fall back to that lot's auto decision
  const shownDecisionFor = (lot) => lotTicks[lot.lotId] ?? autoLotDecision(lot);

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

  // ══ FILLED-CHECKLIST DOWNLOAD ═══════════════════════════════
  // Every lot's form is mounted (inactive ones hidden), so any lot can be
  // printed without switching tabs first.

  // Snapshot one lot's live form as static, printable HTML.
  const paneHtml = (lotId) => {
    const pane = previewRef.current?.querySelector(`[data-lotid="${lotId}"]`);
    return snapshotHtml(pane?.querySelector('.qci-preview-doc'));
  };

  const docTitle = (suffix) => {
    const invoice = (batch?.invoiceNo && batch.invoiceNo !== '—')
      ? batch.invoiceNo : (batch?.batchRef || `Batch-${id}`);
    return `QC_${safeName(invoice)}_${safeName(inspectorName)}${suffix ? '_' + safeName(suffix) : ''}`;
  };

  const printOrWarn = (title, html) => {
    if (!openPrintWindow(title, html)) toast.error('Popup blocked — allow popups to download');
  };

  // ★ SAVE-ON-DOWNLOAD
  //   Clicking Download persists the filled checklist — no separate Save
  //   button. There is no inspection row yet at this point, so the backend
  //   stores it as a draft keyed by batchId and claims it on submit.
  //   Re-downloading upserts the same draft rather than piling up rows.
  //   Fire-and-forget: a failed save must never block the download itself.
  const saveChecklistDraft = async () => {
    if (!selTemplate) return;
    try {
      await api('/api/qc/checklists/draft', {
        method: 'POST',
        data: {
          batchId:      parseInt(id),
          templateCode: selTemplate.categoryCode,
          results:      buildChecklist(),
        },
      });
      setDraftSavedAt(new Date());
    } catch (err) {
      // The inspector still gets their document; only persistence failed.
      console.warn('Checklist draft save failed', err);
      toast.warn('Checklist downloaded, but could not be saved', { autoClose: 2500 });
    }
  };

  // ── 1. THIS LOT — one form, one page ──
  const downloadLot = (lotId) => {
    const html = paneHtml(lotId);
    if (!html) { toast.error('Open the checklist preview first'); return; }
    const lot = lots.find(l => l.lotId === lotId);
    printOrWarn(docTitle(lot?.partNumber || `Lot-${lotId}`), html);
    saveChecklistDraft();   // ★ downloading saves
  };

  // ── 2. ALL LOTS — one file, page break between each ──
  const downloadAllCombined = () => {
    const parts = lots.map(l => paneHtml(l.lotId)).filter(Boolean);
    if (!parts.length) { toast.error('Open the checklist preview first'); return; }
    const body = parts
      .map((h, i) => `<div class="${i < parts.length - 1 ? 'qci-page-break' : ''}">${h}</div>`)
      .join('');
    printOrWarn(docTitle(`All-${parts.length}-lots`), body);
    saveChecklistDraft();   // ★ downloading saves
  };

  // ── 3. ONE BY ONE — a separate file per lot ──
  const downloadEachSeparately = () => {
    if (!lots.length) { toast.error('Open the checklist preview first'); return; }
    lots.forEach((l, i) => {
      // stagger — browsers throttle popups fired in the same tick
      setTimeout(() => {
        const html = paneHtml(l.lotId);
        if (html) printOrWarn(docTitle(l.partNumber || `Lot-${l.lotId}`), html);
      }, i * 700);
    });
    saveChecklistDraft();   // ★ one save covers every lot — not N posts
    toast.info(`Opening ${lots.length} checklists — allow popups if blocked`, { autoClose: 3000 });
  };

  const autoDownloadPdf = async (respData) => {
    // Backend returns the created inspection id; the PDF endpoint is keyed by that id
    // (GET /api/qc/inspections/{inspectionId}/pdf). It does NOT return a ready-made URL.
    const inspectionId =
      respData?.inspectionId ??
      respData?.id ??
      respData?.inspection?.id ??
      (Array.isArray(respData?.inspectionIds) ? respData.inspectionIds[0] : null);

    if (!inspectionId) {
      toast.warn('Decision saved, but no inspection id was returned — open the PDF from History');
      return;
    }
    try {
      const res = await api(`/api/qc/inspections/${inspectionId}/pdf`, { responseType: 'blob' });
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

  // ── SUBMIT ────────────────────────────────────────────────────
  const handleBulkSubmit = async (pdf=false) => {
    if (!bulkDecision) { toast.error('Select a decision first'); return; }
    if (!window.confirm(`${DECISIONS[bulkDecision].label} all ${totalLots} items?`)) return;
    try {
      setSubmitting(true);
      const res = await api('/api/qc/decisions/bulk', {
        method:'POST',
        // ★ overallRemarks — the backend reads getOverallRemarks(); this used
        //   to be sent as `remarks`, so every bulk remark was silently dropped.
        // ★ templateCode — never sent before, which is why insp.templateCode
        //   stayed null and every generated PDF printed a blank checklist.
        data: { batchId:parseInt(id), decision:bulkDecision,
                overallRemarks:bulkRemarks||null,
                templateCode:selTemplate?.categoryCode||null,
                inspectorName:inspectorName||null,
                checklistResults:buildChecklist() },
        params: pdf ? { generatePdf:true } : {}
      });
      toast.success('QC decision recorded!');
      if (pdf) await autoDownloadPdf(res.data?.data || res.data);
      setTimeout(() => navigate('/qc/queue'), 1200);
    } catch (err) { toast.error(err.response?.data?.message||'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const handlePerItemSubmit = async (pdf=false) => {
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
          batchId:parseInt(id), inspectorName:inspectorName||null,
          templateCode:selTemplate?.categoryCode||null,   // ★ was never sent
          checklistResults:buildChecklist(),
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

      {/* ═══ HEADER ═══════════════════════════════════════════
          ★ REDESIGNED. Was: a header bar, then four big meta cards eating a
          whole row, then a separate "Inspector Details" card eating another.
          Three bands of chrome before any actual work. Now one band: identity
          on the left, inspector + status on the right, facts on a thin strip
          underneath. */}
      <div className="qci-hero">
        <div className="qci-hero-top">
          <button className="qci-back-btn" onClick={()=>navigate('/qc/queue')} title="Back to queue">
            <FiArrowLeft size={16}/>
          </button>
          <div className="qci-hero-icon"><FiClipboard size={18}/></div>

          <div className="qci-hero-id">
            <h1 className="qci-title">{batch.batchRef||`Batch #${id}`}</h1>
            <p className="qci-subtitle">
              {totalLots} item{totalLots!==1?'s':''} · {totalQty} units
            </p>
          </div>

          <div className="qci-hero-right">
            {/* ★ TASK 3 — inspector lives here now, next to the status */}
            {editingName ? (
              <div className="qci-hero-name-edit">
                <FiUser size={12}/>
                <input type="text" autoFocus placeholder="Inspector name"
                  value={inspectorName}
                  onChange={e=>saveInspectorName(e.target.value)}
                  onBlur={()=>setEditingName(false)}
                  onKeyDown={e=>{ if(e.key==='Enter'||e.key==='Escape') setEditingName(false); }}/>
                <button onClick={()=>setEditingName(false)} title="Done"><FiCheck size={12}/></button>
              </div>
            ) : (
              <button className="qci-hero-name" onClick={()=>setEditingName(true)}
                title="Inspector — click to change">
                <FiUser size={12}/>
                <span>{inspectorName||'—'}</span>
                <FiEdit2 size={10} className="qci-hero-name-pen"/>
              </button>
            )}
            <span className="qci-status-badge">PENDING QC</span>
          </div>
        </div>

        {/* facts strip — was four cards, now one line */}
        <div className="qci-hero-facts">
          {[
            { icon:FiPackage,  label:'Category', value:batch.categoryName||batch.categoryCode||'—' },
            { icon:FiUser,     label:'Supplier', value:batch.supplierName||'—' },
            { icon:FiFileText, label:'Invoice',  value:batch.invoiceNo||batch.invoiceNumber||'—' },
            { icon:FiCalendar, label:'Received', value:fmtDate(batch.receivedDate) },
          ].map(({icon:Icon,label,value})=>(
            <div key={label} className="qci-fact" title={`${label}: ${value}`}>
              <Icon size={12} className="qci-fact-icon"/>
              <span className="qci-fact-label">{label}</span>
              <span className="qci-fact-value">{value}</span>
            </div>
          ))}
        </div>
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
                onChange={e => { const t=allTemplates.find(x=>String(x.id)===e.target.value); setSelTemplate(t||null); }}>
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
                <button className="qci-tpl-btn preview" onClick={()=>setShowPreview(p=>!p)}><FiEye size={12}/> {showPreview?'Hide':'Show'} Checklist</button>
                <button className="qci-tpl-btn clear" onClick={()=>{setSelTemplate(null);}}>Clear</button>
              </div>
            )}
          </div>

          {/* Stage applicability ticks */}
          {selTemplate && stages.length > 0 && (
            <div className="qci-stage-toggle-row">
              <span className="qci-stage-toggle-label">Applicable checkpoints:</span>
              {stages.map(s => (
                <label key={s.id} className={`qci-stage-toggle ${selStages.has(s.id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={selStages.has(s.id)} onChange={()=>toggleStage(s.id)}/>
                  {s.slNo || ''} {s.checkPoint}
                </label>
              ))}
              <button className="qci-sel-link" onClick={()=>selectAllStages(true)}>All</button>
              <button className="qci-sel-link" onClick={()=>selectAllStages(false)}>None</button>
            </div>
          )}

          {showPreview && selTemplate && lots.length > 0 && (
            <div className="qci-tpl-preview-wrap" ref={previewRef}>

              {/* ★ ONE FORM PER LOT — tab strip */}
              <div className="qci-lot-tabs-row">
                <span className="qci-lot-tabs-label">Checklist for lot:</span>
                {draftSavedAt && (
                  <span className="qci-draft-saved" title="The filled checklist is saved on the server">
                    ✓ Saved {draftSavedAt.toLocaleTimeString('en-IN',
                      { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <div className="qci-lot-tabs">
                  {lots.map((l, i) => {
                    const on  = l.lotId === activeLotId;
                    const qty = parseFloat(l.qtyReceived||l.quantity||l.receivedQty||0);
                    const dec = shownDecisionFor(l);
                    return (
                      <button key={l.lotId} type="button"
                        className={`qci-lot-tab ${on ? 'active' : ''}`}
                        onClick={() => setActiveLotId(l.lotId)}
                        title={l.description || l.partNumber || ''}>
                        <span className="qci-lot-tab-no">{i+1}</span>
                        <span className="qci-lot-tab-part">{l.partNumber || `Lot ${l.lotId}`}</span>
                        <span className="qci-lot-tab-qty">{qty.toFixed(0)}</span>
                        {dec && <span className={`qci-lot-tab-dot ${dec.toLowerCase()}`}/>}
                      </button>
                    );
                  })}
                </div>
                {lots.length > 1 && (
                  <div className="qci-lot-dl-group">
                    <button type="button" className="qci-lot-dl-btn combined"
                      onClick={downloadAllCombined}
                      title="All lots in one file, page break between each">
                      <FiDownload size={11}/> All {lots.length} combined
                    </button>
                    <button type="button" className="qci-lot-dl-btn each"
                      onClick={downloadEachSeparately}
                      title="A separate file per lot">
                      <FiDownload size={11}/> One by one
                    </button>
                  </div>
                )}
              </div>

              {/* Every lot stays mounted so any of them can be printed
                  without switching tabs; only the active one is visible. */}
              {lots.map(l => (
                <div key={l.lotId}
                     className="qci-lot-pane"
                     data-lotid={l.lotId}
                     style={{ display: l.lotId === activeLotId ? 'block' : 'none' }}>
                  <TemplatePreview template={selTemplate} batch={batch} lot={l}
                    selStages={selStages} getStageResult={getStageResult}
                    inspectorName={inspectorName} liveDecision={shownDecisionFor(l)}
                    onDecisionTick={toggleLotTick}
                    inspQty={inspQty} onInspQty={setStageInspQty}
                    onStageResult={setStageResult} onStageRemarks={setStageRemarks}
                    onDownloadFilled={downloadLot}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ★ MODE — was two full-width cards ~100px tall for a binary choice.
          A segmented control says the same thing in a fifth of the space. */}
      <div className="qci-mode-row">
        <span className="qci-mode-label">Decision mode</span>
        <div className="qci-seg">
          <button className={`qci-seg-btn ${mode==='bulk'?'active':''}`} onClick={()=>setMode('bulk')}>
            <FiGrid size={13}/> Bulk
          </button>
          <button className={`qci-seg-btn ${mode==='per-item'?'active':''}`} onClick={()=>setMode('per-item')}>
            <FiList size={13}/> Per-Item
          </button>
        </div>
        <span className="qci-mode-hint">
          {mode==='bulk'
            ? 'One decision applied to every item in the batch'
            : 'Split accepted / rejected / held per item'}
        </span>
      </div>

      {/* ══ BULK DECISION ══════════════════════════════════════ */}
      {mode === 'bulk' && (
        <>
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

          {/* ★ REDESIGNED. Was: three oversized "cards" for what is a
              three-way radio, a 3-row textarea, and THREE submit buttons of
              near-equal weight — so the one destructive-ish path (Submit &
              Generate PDF) looked the same as Cancel. Now: pills sized to
              their label, and a sticky bar with one clear primary. */}
          <div className="qci-card">
            <div className="qci-card-head"><FiCheckCircle size={15}/> Bulk Decision</div>
            <div className="qci-card-body">
              <div className="qci-verdict-row">
                {Object.entries(DECISIONS).map(([key,cfg])=>{
                  const Icon=cfg.icon; const active=bulkDecision===key;
                  return (
                    <button key={key} className={`qci-verdict ${active?'active':''}`}
                      onClick={()=>setBulkDecision(key)}
                      style={active?{background:cfg.bg,borderColor:cfg.color,color:cfg.color}:{}}>
                      <Icon size={14} style={{color:cfg.color}}/>
                      <span>{cfg.label}</span>
                      {active && <FiCheck size={12} className="qci-verdict-tick" style={{color:cfg.color}}/>}
                    </button>
                  );
                })}
              </div>
              <div className="qci-field">
                <label>Remarks <span className="qci-optional">optional</span></label>
                <textarea className="qci-textarea" rows={2} placeholder="Add notes for this bulk decision…"
                  value={bulkRemarks} onChange={e=>setBulkRemarks(e.target.value)}/>
              </div>
            </div>
          </div>

          {/* ★ sticky action bar — the decision is always one reach away,
              and the primary action is unmistakably the primary action */}
          <div className="qci-actionbar">
            <div className="qci-actionbar-state">
              {bulkDecision ? (
                <>
                  <span className="qci-ab-dot" style={{background:DECISIONS[bulkDecision].color}}/>
                  <strong style={{color:DECISIONS[bulkDecision].color}}>{DECISIONS[bulkDecision].label}</strong>
                  <span className="qci-ab-sub">all {totalLots} item{totalLots!==1?'s':''} · {totalQty} units</span>
                </>
              ) : (
                <span className="qci-ab-sub">Pick a verdict above to submit</span>
              )}
            </div>
            <div className="qci-actionbar-btns">
              <button className="qci-btn-ghost" onClick={()=>navigate('/qc/queue')} disabled={submitting}>
                Cancel
              </button>
              <button className="qci-btn-secondary" onClick={()=>handleBulkSubmit(false)}
                disabled={submitting||!bulkDecision} title="Record the decision without producing a PDF">
                {submitting?'Submitting…':'Submit only'}
              </button>
              <button className="qci-btn-primary" onClick={()=>handleBulkSubmit(true)}
                disabled={submitting||!bulkDecision}>
                {submitting
                  ? <><FiRefreshCw size={13} className="qci-spin"/> Submitting…</>
                  : <><FiCheckCircle size={14}/> Submit &amp; Generate PDF</>}
              </button>
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
                </tr>
              </thead>
              <tbody>
                {lots.map((lot,idx)=>{
                  const selected = selLots.has(lot.lotId);
                  const d  = perItem[lot.lotId]||{};
                  const r  = parseFloat(lot.qtyReceived||lot.quantity||lot.receivedQty||0);
                  const t  = parseFloat(d.accepted||0)+parseFloat(d.rejected||0)+parseFloat(d.held||0);
                  const mm = selected && Math.abs(t-r)>0.001;
                  return (
                    <tr key={lot.lotId}
                        className={`${mm?'qci-row-mismatch':''} ${selected?'':'qci-lot-off'}`}>
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
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="qci-per-item-foot">
            <div className="qci-warn-banner">
              <FiInfo size={14}/>
              <span>Each ticked row: <strong>Accepted + Rejected + Held = Received</strong>.
                Unticked items are <strong>not decided now</strong> — they stay in the QC waiting list.
                Tick Pass/Fail/NA and Qty per checkpoint in the checklist preview above.</span>
            </div>
            {selLotsArr.length < totalLots && (
              <div className="qci-waiting-banner">
                <FiPauseCircle size={14}/>
                <span><strong>{totalLots - selLotsArr.length}</strong> item(s) will remain pending in the queue after submit.</span>
              </div>
            )}
          </div>

          {/* ★ same sticky bar as bulk — one interaction model for both modes */}
          <div className="qci-actionbar">
            <div className="qci-actionbar-state">
              {selLotsArr.length ? (
                <>
                  <span className="qci-ab-dot" style={{background:'#4f46e5'}}/>
                  <strong>{selLotsArr.length} of {totalLots}</strong>
                  <span className="qci-ab-sub">
                    {totAccepted} accepted · {totRejected} rejected · {totHeld} held
                  </span>
                </>
              ) : (
                <span className="qci-ab-sub">Tick at least one item to submit</span>
              )}
            </div>
            <div className="qci-actionbar-btns">
              <button className="qci-btn-ghost" onClick={()=>navigate('/qc/queue')} disabled={submitting}>
                Cancel
              </button>
              <button className="qci-btn-secondary" onClick={()=>handlePerItemSubmit(false)}
                disabled={submitting||selLotsArr.length===0} title="Record the decisions without producing a PDF">
                {submitting?'Submitting…':'Submit only'}
              </button>
              <button className="qci-btn-primary" onClick={()=>handlePerItemSubmit(true)}
                disabled={submitting||selLotsArr.length===0}>
                {submitting
                  ? <><FiRefreshCw size={13} className="qci-spin"/> Submitting…</>
                  : <><FiCheckCircle size={14}/> Submit &amp; Generate PDF</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QcInspection;