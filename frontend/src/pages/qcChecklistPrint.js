// ══════════════════════════════════════════════════════════════
// Shared checklist print pipeline.
//
// Single source of truth for BOTH:
//   · QcInspection.jsx        (inspect a pending batch)
//   · QcChecklistModal.jsx    (re-print from Approved / Rejected lists)
//
// Keeping this in one file is the whole point — the printed QC form must
// look the same no matter which screen produced it.
// ══════════════════════════════════════════════════════════════

export const PRINT_CSS = `
  body{margin:12px;font-family:'Times New Roman',serif;color:#000;}
  .qci-page-break{page-break-after:always;}
  .qci-preview-doc{border:2px solid #1e293b;font-size:11px;}
  .qci-preview-header{display:flex;align-items:center;border-bottom:2px solid #000;padding:6px 10px;gap:14px;}
  .qci-preview-logo{font-size:15px;font-weight:900;font-style:italic;}
  .qci-preview-tagline{font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#555;}
  .qci-preview-company{flex:1;text-align:center;}
  .qci-preview-company-name{font-size:12px;font-weight:800;}
  .qci-preview-company-addr{font-size:8px;color:#333;}
  .qci-preview-title-row{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding:4px 10px;background:#f5f5f5;}
  .qci-preview-title{font-size:11px;font-weight:900;letter-spacing:.07em;}
  .qci-preview-formno{font-size:9px;font-weight:700;}
  .qci-preview-meta{border-bottom:1px solid #000;}
  .qci-preview-meta-row{display:flex;gap:10px;align-items:baseline;padding:4px 10px;border-bottom:1px solid #ccc;flex-wrap:wrap;font-size:10px;}
  .qci-preview-meta-row span{color:#555;font-size:8px;}
  .qci-preview-meta-row strong{color:#1e293b;min-width:60px;}
  .qci-preview-matdesc{flex:1;}
  .qci-preview-table{width:100%;border-collapse:collapse;}
  .qci-preview-table th{border:1px solid #000;padding:4px 5px;font-weight:900;text-align:center;background:#f0f0f0;font-size:8px;}
  .qci-preview-table td{border:1px solid #000;padding:3px 5px;font-size:8px;height:18px;}
  .qci-preview-footer{padding:6px 10px;border-top:1px solid #000;display:flex;justify-content:space-between;align-items:flex-end;}
  .qci-preview-sign{display:flex;flex-direction:column;gap:2px;font-size:8px;}
  .qci-preview-sign-name-row{display:flex;align-items:center;gap:8px;}
  .qci-preview-sign-line{height:16px;border-bottom:1px solid #000;width:140px;}
  .qci-preview-sign-name{font-size:11px;font-weight:800;font-style:italic;color:#1e3a8a;}
  .qci-preview-decision{font-size:11px;font-weight:700;}
  .qci-tick-pass{color:#059669;font-weight:900;}
  .qci-tick-fail{color:#dc2626;font-weight:900;}
  .qci-tick-hold{color:#d97706;font-weight:900;}
  .qci-preview-row-off td{color:#b7bec9;background:#fafafa;font-style:italic;}
  @page{size:A4 landscape;margin:10mm;}
`;

/** Filename-safe token. */
export const safeName = (s) =>
  String(s || '').trim().replace(/[^\w\-.]+/g, '_') || 'NA';

/**
 * Freeze a live `.qci-preview-doc` node into static printable HTML:
 * inputs become their typed text, buttons become their tick label.
 * The node may be hidden (display:none) — values are still readable.
 */
export const snapshotHtml = (node) => {
  if (!node) return '';
  const clone = node.cloneNode(true);

  // strip UI-only controls
  clone.querySelectorAll('.qci-preview-dl-btn, .qci-no-print').forEach(el => el.remove());

  // inputs → plain text so entered values print
  clone.querySelectorAll('input, textarea').forEach(inp => {
    const span = document.createElement('span');
    span.textContent = inp.value || '';
    span.style.cssText = 'font-style:italic;font-weight:600;';
    inp.replaceWith(span);
  });

  // buttons → their tick text (☑ Pass etc.)
  clone.querySelectorAll('button').forEach(btn => {
    const span = document.createElement('span');
    span.textContent = btn.textContent.trim();
    span.style.cssText = btn.classList.contains('active')
      ? 'font-weight:900;margin-right:6px;'
      : 'margin-right:6px;color:#94a3b8;';
    btn.replaceWith(span);
  });

  return clone.outerHTML;
};

/**
 * Open a print window for already-snapshotted HTML.
 * Returns false if the popup was blocked — caller shows the message.
 */
export const openPrintWindow = (title, bodyHtml) => {
  const win = window.open('', '_blank', 'width=1000,height=700');
  if (!win) return false;
  win.document.write(
    `<!doctype html><html><head><title>${title}</title><style>${PRINT_CSS}</style></head>` +
    `<body>${bodyHtml}<scr` + `ipt>window.onload=()=>setTimeout(()=>window.print(),300);</scr` + `ipt></body></html>`
  );
  win.document.close();
  return true;
};

/** Match a template to a row's category, the same way on every screen. */
export const matchTemplate = (templates, ...candidates) => {
  const wanted = candidates
    .filter(Boolean)
    .map(c => String(c).toUpperCase().trim());
  if (!wanted.length) return null;
  return templates.find(t =>
    wanted.includes(String(t.categoryCode || '').toUpperCase().trim()) ||
    wanted.includes(String(t.categoryName || '').toUpperCase().trim())
  ) || null;
};
