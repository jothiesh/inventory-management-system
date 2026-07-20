import React, { useState, useRef } from 'react';
import './QcTemplatePreview.css';

/**
 * QcTemplatePreview
 * Shows a live preview that exactly matches the printed Excel/PDF checklist.
 *
 * Props:
 *   template  — ChecklistTemplateDto from backend (or FALLBACK_TEMPLATES entry)
 *   mode      — 'excel' | 'pdf' (toggle between Excel-style and PDF-style render)
 *   onClose   — function called when overlay is dismissed
 */
const QcTemplatePreview = ({ template, onClose }) => {
  const [mode, setMode]       = useState('excel'); // 'excel' | 'pdf'
  const [zoom, setZoom]       = useState(1);
  const printRef              = useRef(null);

  if (!template) return null;

  const stages = (template.stages || []).filter(s => s.checkPoint && s.checkPoint.trim());

  // ── Print handler ────────────────────────────────────────────
  const handlePrint = () => {
    const content  = printRef.current.innerHTML;
    const win      = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>QC Checklist - ${template.categoryName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 5px 8px; vertical-align: middle; }
            th { background: #d9e2f3; font-weight: bold; text-align: center; }
            .center { text-align: center; }
            .right { text-align: right; }
            .company { font-size: 14pt; font-weight: bold; text-align: center; }
            .title { font-size: 12pt; font-weight: bold; text-align: center; text-decoration: underline; margin: 6px 0; }
            .formno { text-align: right; font-size: 9pt; }
            .meta-table td { border: 1px solid #999; }
            .sign-row { margin-top: 20px; display: flex; justify-content: space-between; }
            .remarks { margin-top: 12px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="qtp-overlay" onClick={onClose}>
      <div className="qtp-modal" onClick={e => e.stopPropagation()}>

        {/* ── Modal toolbar ── */}
        <div className="qtp-toolbar">
          <div className="qtp-toolbar-left">
            <span className="qtp-toolbar-title">
              Live Preview — {template.categoryName}
            </span>
          </div>

          <div className="qtp-mode-toggle">
            <button
              className={`qtp-mode-btn ${mode === 'excel' ? 'active' : ''}`}
              onClick={() => setMode('excel')}
            >
              <span className="qtp-mode-icon excel-icon">⊞</span> Excel View
            </button>
            <button
              className={`qtp-mode-btn ${mode === 'pdf' ? 'active' : ''}`}
              onClick={() => setMode('pdf')}
            >
              <span className="qtp-mode-icon pdf-icon">⬚</span> PDF View
            </button>
          </div>

          <div className="qtp-toolbar-right">
            <div className="qtp-zoom-controls">
              <button className="qtp-zoom-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>−</button>
              <span className="qtp-zoom-val">{Math.round(zoom * 100)}%</span>
              <button className="qtp-zoom-btn" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>+</button>
              <button className="qtp-zoom-btn" onClick={() => setZoom(1)}>Reset</button>
            </div>
            <button className="qtp-print-btn" onClick={handlePrint}>🖨 Print</button>
            <button className="qtp-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Preview area ── */}
        <div className="qtp-preview-area">
          <div
            className={`qtp-page-wrap ${mode}`}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            <div ref={printRef} className={`qtp-document ${mode}`}>

              {mode === 'excel' ? (
                <ExcelView template={template} stages={stages} />
              ) : (
                <PdfView template={template} stages={stages} />
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   EXCEL VIEW — mimics spreadsheet grid exactly
   ════════════════════════════════════════════════════════════ */
const ExcelView = ({ template, stages }) => {

  return (
    <div className="qtp-excel">

      {/* Row 1: Company + Form No */}
      <div className="qtp-xl-row qtp-xl-header-row">
        <div className="qtp-xl-company">Thinture Technologies Pvt Ltd</div>
        <div className="qtp-xl-formno">F No : {template.formNo}</div>
      </div>

      {/* Row 2: Title */}
      <div className="qtp-xl-row">
        <div className="qtp-xl-title">
          {(template.categoryName || '').toUpperCase()} INSPECTION CHECK LIST
        </div>
      </div>

      {/* Row 3: Invoice / Date / Lot Qty */}
      <table className="qtp-xl-meta-table">
        <tbody>
          <tr>
            <td className="qtp-xl-meta-label">Invoice No:</td>
            <td className="qtp-xl-meta-val" />
            <td className="qtp-xl-meta-label">Received Date:</td>
            <td className="qtp-xl-meta-val" />
            <td className="qtp-xl-meta-label">Lot Qty:</td>
            <td className="qtp-xl-meta-val" />
          </tr>
          <tr>
            <td className="qtp-xl-meta-label">Supplier Name:</td>
            <td className="qtp-xl-meta-val" colSpan={3} />
            <td className="qtp-xl-meta-label">Manufacturer Name:</td>
            <td className="qtp-xl-meta-val" />
          </tr>
          <tr>
            <td className="qtp-xl-meta-label">Material Desc:</td>
            <td className="qtp-xl-meta-val" colSpan={5} />
          </tr>
        </tbody>
      </table>

      {/* Spacer */}
      <div style={{ height: 8 }} />

      {/* Stages table */}
      <table className="qtp-xl-stages-table">
        <thead>
          <tr>
            <th className="qtp-xl-th-sl">Sl No</th>
            <th className="qtp-xl-th-op">Stage /Operation</th>
            <th className="qtp-xl-th-cp">Check Points</th>
            <th className="qtp-xl-th-aql">Inspected Qty<br/>(as per AQL)</th>
            <th className="qtp-xl-th-rem">Remarks</th>
            <th className="qtp-xl-th-pf">Pass / Fail / NA</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => {
            return (
              <tr key={i} className="qtp-xl-stage-row">
                <td className="qtp-xl-td-sl">{s.slNo}</td>
                <td className="qtp-xl-td-op">{s.stageOperation || ''}</td>
                <td className="qtp-xl-td-cp">{s.checkPoint}</td>
                <td className="qtp-xl-td-aql" />
                <td className="qtp-xl-td-rem" />
                <td className="qtp-xl-td-pf">
                  <span className="qtp-xl-checkbox">☐</span> Pass &nbsp;
                  <span className="qtp-xl-checkbox">☐</span> Fail &nbsp;
                  <span className="qtp-xl-checkbox">☐</span> N/A
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Remarks */}
      <div className="qtp-xl-remarks-section">
        <div className="qtp-xl-remarks-label">Remarks:</div>
        <div className="qtp-xl-remarks-lines">
          <div className="qtp-xl-remarks-line" />
          <div className="qtp-xl-remarks-line" />
        </div>
      </div>

      {/* Sign off */}
      <div className="qtp-xl-signoff">
        <span>
          Verified By : <span className="qtp-xl-sign-line">________________________</span>
        </span>
        <span>
          Lot is &nbsp;
          <span className="qtp-xl-checkbox">☐</span> <strong>Accepted</strong> &nbsp;&nbsp;
          <span className="qtp-xl-checkbox">☐</span> <strong>Rejected</strong> &nbsp;&nbsp;
          <span className="qtp-xl-checkbox">☐</span> <strong>Hold</strong>
        </span>
      </div>

    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   PDF VIEW — mimics iText PDF layout exactly
   ════════════════════════════════════════════════════════════ */
const PdfView = ({ template, stages }) => {

  return (
    <div className="qtp-pdf">

      {/* PDF Header box */}
      <div className="qtp-pdf-header-box">
        <div className="qtp-pdf-company">THINTURE TECHNOLOGIES PRIVATE LIMITED</div>
        <div className="qtp-pdf-city">Bangalore</div>
        <div className="qtp-pdf-report-title">INWARD QUALITY INSPECTION REPORT</div>
      </div>

      {/* Meta grid */}
      <table className="qtp-pdf-meta-table">
        <tbody>
          <tr>
            <td className="qtp-pdf-meta-label">Form No</td>
            <td className="qtp-pdf-meta-val">{template.formNo}</td>
            <td className="qtp-pdf-meta-label">Category</td>
            <td className="qtp-pdf-meta-val">{template.categoryName}</td>
          </tr>
          <tr>
            <td className="qtp-pdf-meta-label">Invoice No</td>
            <td className="qtp-pdf-meta-val" />
            <td className="qtp-pdf-meta-label">Inspected At</td>
            <td className="qtp-pdf-meta-val" />
          </tr>
          <tr>
            <td className="qtp-pdf-meta-label">Supplier</td>
            <td className="qtp-pdf-meta-val" />
            <td className="qtp-pdf-meta-label">Received Date</td>
            <td className="qtp-pdf-meta-val" />
          </tr>
          <tr>
            <td className="qtp-pdf-meta-label">Lot Count</td>
            <td className="qtp-pdf-meta-val" />
            <td className="qtp-pdf-meta-label">Inspected By</td>
            <td className="qtp-pdf-meta-val" />
          </tr>
        </tbody>
      </table>

      {/* Checklist title */}
      <div className="qtp-pdf-checklist-title">
        {(template.categoryName || '').toUpperCase()} INSPECTION CHECK LIST
      </div>

      {/* Stages table */}
      <table className="qtp-pdf-stages-table">
        <thead>
          <tr>
            <th className="qtp-pdf-th-sl">Sl No</th>
            <th className="qtp-pdf-th-op">Stage /Operation</th>
            <th className="qtp-pdf-th-cp">Check Points</th>
            <th className="qtp-pdf-th-aql">Inspected Qty<br/>(as per AQL)</th>
            <th className="qtp-pdf-th-rem">Remarks</th>
            <th className="qtp-pdf-th-pf">Pass / Fail / NA</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => {
            return (
              <tr key={i} className={`qtp-pdf-stage-row ${i % 2 === 0 ? 'even' : ''}`}>
                <td className="center">{s.slNo}</td>
                <td>{s.stageOperation || ''}</td>
                <td>{s.checkPoint}</td>
                <td className="center" />
                <td />
                <td className="center">
                  <span className="qtp-pdf-checkbox">☐</span> Pass &nbsp;
                  <span className="qtp-pdf-checkbox">☐</span> Fail &nbsp;
                  <span className="qtp-pdf-checkbox">☐</span> N/A
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Decision banner */}
      <div className="qtp-pdf-decision-box">
        <span className="qtp-pdf-decision-label">Lot Decision:</span>&nbsp;
        <span className="qtp-pdf-checkbox-big">☐</span> <strong>ACCEPTED</strong>&nbsp;&nbsp;&nbsp;
        <span className="qtp-pdf-checkbox-big">☐</span> <strong>REJECTED</strong>&nbsp;&nbsp;&nbsp;
        <span className="qtp-pdf-checkbox-big">☐</span> <strong>HOLD</strong>&nbsp;&nbsp;&nbsp;
        <span className="qtp-pdf-checkbox-big">☐</span> <strong>PARTIAL</strong>
      </div>

      {/* Remarks */}
      <div className="qtp-pdf-remarks">
        <strong>Remarks:</strong>
        <div className="qtp-pdf-remarks-line" />
        <div className="qtp-pdf-remarks-line" />
      </div>

      {/* Signature row */}
      <div className="qtp-pdf-sig-row">
        <div className="qtp-pdf-sig-box">
          <div className="qtp-pdf-sig-label">Inspected By:</div>
          <div className="qtp-pdf-sig-line" />
          <div className="qtp-pdf-sig-sub">Name &amp; Signature</div>
        </div>
        <div className="qtp-pdf-sig-box right">
          <div className="qtp-pdf-sig-label">Approved By (QC Head):</div>
          <div className="qtp-pdf-sig-line" />
          <div className="qtp-pdf-sig-sub">Name &amp; Signature</div>
        </div>
      </div>

    </div>
  );
};

export default QcTemplatePreview;