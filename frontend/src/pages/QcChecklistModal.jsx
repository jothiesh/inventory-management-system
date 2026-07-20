import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiX, FiDownload, FiList, FiInfo, FiRefreshCw } from 'react-icons/fi';
import {
  snapshotHtml, openPrintWindow, safeName, matchTemplate,
} from './qcChecklistPrint';
import './QcInspection.css';        // reuse the exact .qci-preview-* form styling
import './QcChecklistModal.css';

// ══════════════════════════════════════════════════════════════
// QcChecklistModal
//
// The same flow as the QC Inspection screen — pick a template, the live
// checklist fills in, edit it, download — but launched from a finished
// inspection row (Approved / Rejected) instead of a pending batch.
//
// Props:
//   inspection — a row from /api/qc/inspections/{approved|rejected|history}
//   onClose    — dismiss
// ══════════════════════════════════════════════════════════════

const api = (url, opts = {}) => axios({
  url,
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  ...opts,
});

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const num = (...v) => {
  for (const x of v) {
    const n = parseFloat(x);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
};

const QcChecklistModal = ({ inspection: insp, onClose }) => {
  const [templates,   setTemplates]   = useState([]);
  const [loadingTpl,  setLoadingTpl]  = useState(true);
  const [selTemplate, setSelTemplate] = useState(null);

  // ★ the checklist saved at inspection time, if any
  const [saved,      setSaved]      = useState(null);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // editable form state — same shape as the inspection screen
  const [selStages, setSelStages] = useState(new Set());
  const [inspQty,   setInspQty]   = useState({});
  const [clResults, setClResults] = useState({});
  const [matDesc,   setMatDesc]   = useState('');

  // decision starts on the recorded outcome; clicking re-ticks it
  const [decision, setDecision] = useState(
    (insp?.overallDecision || '').toUpperCase()
  );

  const printRef = useRef(null);

  const stages = useMemo(() => selTemplate?.stages || [], [selTemplate]);

  // ── Load templates ───────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res  = await api('/api/qc/templates');
        const data = res.data?.data || res.data || [];
        if (!alive) return;
        setTemplates(Array.isArray(data) ? data : []);
      } catch {
        if (alive) toast.error('Failed to load templates');
      } finally {
        if (alive) setLoadingTpl(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── ★ Load the checklist that was saved during inspection ──
  useEffect(() => {
    let alive = true;
    if (!insp?.id) { setLoadingSaved(false); return; }
    (async () => {
      try {
        const res = await api(`/api/qc/inspections/${insp.id}/checklist`);
        if (alive) setSaved(res.data?.data || null);
      } catch {
        if (alive) setSaved(null);   // nothing saved — fall back to a blank form
      } finally {
        if (alive) setLoadingSaved(false);
      }
    })();
    return () => { alive = false; };
  }, [insp?.id]);

  // ── Template selection ──
  //   The template recorded WITH the checklist wins — it is what was actually
  //   inspected against. Category matching is only the fallback for rows saved
  //   before checklists were persisted.
  useEffect(() => {
    if (!templates.length || selTemplate || loadingSaved) return;
    const byCode = saved?.templateCode
      ? templates.find(t =>
          String(t.categoryCode || '').toUpperCase() ===
          String(saved.templateCode).toUpperCase())
      : null;
    const m = byCode || matchTemplate(templates, insp?.categoryCode, insp?.categoryName);
    if (m) setSelTemplate(m);
  }, [templates, insp, selTemplate, saved, loadingSaved]);

  // ── ★ Seed every Qty / Remark / Pass-Fail cell from what was saved ──
  useEffect(() => {
    if (!selTemplate || !saved?.results?.length) return;
    const rows = {}, qty = {};
    saved.results.forEach(r => {
      if (!r.stageId) return;
      rows[r.stageId] = { result: r.result || null, remarks: r.remarks || '' };
      if (r.inspectedQty != null) qty[r.stageId] = r.inspectedQty;
    });
    setClResults(rows);
    setInspQty(qty);
  }, [selTemplate, saved]);

  // Applicable checkpoints: mirror what was saved, else default to all.
  useEffect(() => {
    if (!stages.length) return;
    const savedIds = saved?.results?.map(r => r.stageId).filter(Boolean) || [];
    setSelStages(savedIds.length
      ? new Set(stages.filter(s => savedIds.includes(s.id)).map(s => s.id))
      : new Set(stages.map(s => s.id)));
  }, [selTemplate, saved]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Editors ──────────────────────────────────────────────────
  const toggleStage = (id) => setSelStages(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const setStageResult  = (id, result)  =>
    setClResults(p => ({ ...p, [id]: { ...p[id], result } }));
  const setStageRemarks = (id, remarks) =>
    setClResults(p => ({ ...p, [id]: { ...p[id], remarks } }));
  const getStage = (id) => {
    const r = clResults[id];
    return { result: r?.result || null, remarks: r?.remarks || '' };
  };
  const toggleDecision = (d) => setDecision(prev => (prev === d ? '' : d));

  const tick = (on) => on ? '☑' : '☐';

  // ── Download ─────────────────────────────────────────────────
  const handleDownload = () => {
    if (!selTemplate) { toast.error('Select a checklist template first'); return; }
    const node = printRef.current?.querySelector('.qci-preview-doc');
    if (!node) { toast.error('Nothing to print'); return; }
    const invoice = insp?.invoiceNo || insp?.invoiceNumber || insp?.batchRef || `Inspection-${insp?.id}`;
    const title = `QC_${safeName(invoice)}_${safeName(decision || 'CHECKLIST')}`;
    if (!openPrintWindow(title, snapshotHtml(node))) {
      toast.error('Popup blocked — allow popups to download');
    }
  };

  if (!insp) return null;

  const lotQty   = num(insp.qtyReceived, insp.totalReceived, 0);
  const padCount = Math.max(0, 6 - stages.length);

  return (
    <div className="qcm-overlay" onClick={onClose}>
      <div className="qcm-modal" onClick={e => e.stopPropagation()}>

        {/* ── Head ── */}
        <div className="qcm-head">
          <div className="qcm-head-left">
            <span className="qcm-head-title">
              {insp.invoiceNo || insp.invoiceNumber || insp.batchRef || `Inspection #${insp.id}`}
            </span>
            <span className="qcm-head-sub">
              {insp.supplierName || '—'} · {insp.categoryName || insp.categoryCode || '—'} · {fmtDate(insp.inspectedAt)}
            </span>
          </div>
          <button className="qcm-close" onClick={onClose}><FiX size={16} /></button>
        </div>

        <div className="qcm-body">

          {/* ── Template selector — same as the inspection screen ── */}
          <div className="qcm-tpl-row">
            <label className="qcm-tpl-label"><FiList size={13} /> Inspection Checklist:</label>
            <select
              className="qcm-tpl-select"
              value={selTemplate?.id || ''}
              onChange={e => {
                const t = templates.find(x => String(x.id) === e.target.value);
                setSelTemplate(t || null);
              }}
            >
              <option value="">— Choose a checklist template —</option>
              {loadingTpl && <option disabled>Loading templates…</option>}
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.categoryName} ({t.categoryCode}) · {t.formNo}
                </option>
              ))}
            </select>
            {selTemplate && (
              <>
                <span className="qcm-tpl-badge">{selTemplate.categoryCode}</span>
                <span className="qcm-tpl-info">{stages.length} stages</span>
              </>
            )}
            <button className="qcm-dl-btn" onClick={handleDownload} disabled={!selTemplate}>
              <FiDownload size={13} /> Download
            </button>
          </div>

          {selTemplate && !loadingSaved && (
            saved?.results?.length ? (
              <div className="qcm-hint saved">
                <FiInfo size={13} />
                Showing the checklist saved at inspection time
                ({saved.results.length} checkpoint{saved.results.length === 1 ? '' : 's'}) — edit and re-download if needed.
              </div>
            ) : (
              <div className="qcm-hint">
                <FiInfo size={13} />
                No checklist was saved for this inspection — fill it in below, then download.
              </div>
            )
          )}

          {!selTemplate && !loadingTpl && (
            <div className="qcm-hint">
              <FiInfo size={13} />
              No template matched category <strong>"{insp.categoryName || insp.categoryCode || '—'}"</strong> — pick one above.
            </div>
          )}

          {loadingTpl && (
            <div className="qcm-hint">
              <FiRefreshCw size={13} className="qcm-spin" /> Loading templates…
            </div>
          )}

          {/* ── Applicable checkpoints ── */}
          {selTemplate && stages.length > 0 && (
            <div className="qcm-stage-toggles">
              <span className="qcm-stage-toggles-label">Applicable checkpoints:</span>
              {stages.map(s => (
                <label key={s.id} className={`qcm-stage-toggle ${selStages.has(s.id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={selStages.has(s.id)} onChange={() => toggleStage(s.id)} />
                  {s.slNo || ''} {s.checkPoint}
                </label>
              ))}
              <button className="qcm-sel-link" onClick={() => setSelStages(new Set(stages.map(s => s.id)))}>All</button>
              <button className="qcm-sel-link" onClick={() => setSelStages(new Set())}>None</button>
            </div>
          )}

          {/* ── Live checklist ── */}
          {selTemplate && (
            <div className="qcm-preview-wrap" ref={printRef}>
              <div className="qci-preview-doc">

                <div className="qci-preview-header">
                  <div className="qci-preview-brand">
                    <div className="qci-preview-logo">Thinture<sup>®</sup></div>
                    <div className="qci-preview-tagline">Think Future</div>
                  </div>
                  <div className="qci-preview-company">
                    <div className="qci-preview-company-name">Thinture Technologies Pvt. Ltd.</div>
                    <div className="qci-preview-company-addr">
                      No. 508, 2nd Floor, HMT Layout, Vidyaranayapura, Bangalore – 560 097
                    </div>
                  </div>
                </div>

                <div className="qci-preview-title-row">
                  <span className="qci-preview-title">
                    {selTemplate.categoryName?.toUpperCase()} INSPECTION CHECK LIST
                  </span>
                  <span className="qci-preview-formno">F No: {selTemplate.formNo}</span>
                </div>

                <div className="qci-preview-meta">
                  <div className="qci-preview-meta-row">
                    <span>Invoice No:</span><strong>{insp.invoiceNo || insp.invoiceNumber || '___________'}</strong>
                    <span>Received Date:</span><strong>{fmtDate(insp.receivedDate)}</strong>
                    <span>Lot Qty:</span><strong>{lotQty ? lotQty.toFixed(0) : '____'}</strong>
                  </div>
                  <div className="qci-preview-meta-row">
                    <span>Supplier Name:</span><strong>{insp.supplierName || '_____________________________'}</strong>
                    <span>Batch Ref:</span><strong>{insp.batchRef || '____________'}</strong>
                  </div>
                  <div className="qci-preview-meta-row">
                    <span>Material Desc:</span>
                    <strong className="qci-preview-matdesc">
                      <input
                        className="qci-preview-remark-input"
                        value={matDesc}
                        onChange={e => setMatDesc(e.target.value)}
                        placeholder="Material description…"
                      />
                    </strong>
                    <span>Items:</span><strong>{insp.itemCount ?? insp.lotCount ?? '—'}</strong>
                  </div>
                </div>

                <table className="qci-preview-table">
                  <thead><tr>
                    <th style={{ width: '6%' }}>Sl No</th>
                    <th style={{ width: '18%' }}>Stage / Operation</th>
                    <th style={{ width: '26%' }}>Check Points</th>
                    <th style={{ width: '11%' }}>Inspected Qty (AQL)</th>
                    <th style={{ width: '17%' }}>Remarks</th>
                    <th style={{ width: '22%' }}>Pass/Fail/NA</th>
                  </tr></thead>
                  <tbody>
                    {stages.map((s, i) => {
                      const on   = selStages.has(s.id);
                      const live = on ? getStage(s.id) : { result: null, remarks: '' };
                      const res  = live.result;
                      return (
                        <tr key={s.id || i} className={on ? '' : 'qci-preview-row-off'}>
                          <td style={{ textAlign: 'center' }}>{s.slNo || i + 1}</td>
                          <td>{s.stageOperation || ''}</td>
                          <td>{s.checkPoint || ''}</td>

                          <td style={{ textAlign: 'center' }}>
                            {on ? (
                              <input
                                className="qci-preview-qty-input"
                                value={inspQty[s.id] ?? ''}
                                onChange={e => setInspQty(p => ({ ...p, [s.id]: e.target.value }))}
                                placeholder={s.aqlLabel || 'Qty'}
                              />
                            ) : '—'}
                          </td>

                          <td className="qci-preview-remarks-cell">
                            {on ? (
                              <input
                                className="qci-preview-remark-input"
                                value={live.remarks || ''}
                                onChange={e => setStageRemarks(s.id, e.target.value)}
                                placeholder="Remarks…"
                              />
                            ) : 'Not Applicable'}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            {on ? (
                              <div className="qci-preview-pfn">
                                {[
                                  { code: 'PASS', l: 'Pass', c: '#10b981' },
                                  { code: 'FAIL', l: 'Fail', c: '#ef4444' },
                                  { code: 'NA',   l: 'N/A',  c: '#94a3b8' },
                                ].map(({ code, l, c }) => (
                                  <button
                                    key={code}
                                    type="button"
                                    className={`qci-preview-pfn-btn ${res === code ? 'active' : ''}`}
                                    style={res === code
                                      ? { background: c, borderColor: c, color: '#fff' }
                                      : { color: c, borderColor: c }}
                                    onClick={() => setStageResult(s.id, code)}
                                  >
                                    {tick(res === code)} {l}
                                  </button>
                                ))}
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {Array.from({ length: padCount }).map((_, i) => (
                      <tr key={`pad-${i}`}>
                        <td /><td /><td /><td /><td /><td />
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="qci-preview-footer">
                  <div className="qci-preview-sign">
                    <div className="qci-preview-sign-name-row">
                      <div className="qci-preview-sign-name">{insp.inspectorName || ''}</div>
                    </div>
                    <div className="qci-preview-sign-line" />
                    <div>Verified By (Name &amp; Signature)</div>
                  </div>

                  {/* recorded decision, pre-ticked — click to re-tick */}
                  <div className="qci-preview-decision">
                    Lot is&nbsp;
                    {[
                      { code: 'ACCEPTED', l: 'Accepted', cls: 'qci-tick-pass' },
                      { code: 'REJECTED', l: 'Rejected', cls: 'qci-tick-fail' },
                      { code: 'HOLD',     l: 'Hold',     cls: 'qci-tick-hold' },
                      { code: 'PARTIAL',  l: 'Partial',  cls: 'qci-tick-hold' },
                    ].map(({ code, l, cls }) => {
                      const on = decision === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`qci-preview-lot-tick ${on ? `active ${cls}` : ''}`}
                          onClick={() => toggleDecision(code)}
                          title={on ? 'Click again to clear' : `Tick lot as ${l}`}
                        >
                          <span className="qci-lot-tick-box">{tick(on)}</span> {l}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        <div className="qcm-foot">
          <span className="qcm-foot-note">
            Recorded decision: <strong>{insp.overallDecision || '—'}</strong>
            {insp.overallRemarks ? ` · ${insp.overallRemarks}` : ''}
          </span>
          <div className="qcm-foot-actions">
            <button className="qcm-btn-cancel" onClick={onClose}>Close</button>
            <button className="qcm-btn-save" onClick={handleDownload} disabled={!selTemplate}>
              <FiDownload size={13} /> Download Checklist
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QcChecklistModal;