import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { stockApi } from '../api/stockApi';
import { productApi } from '../api/productApi';
import { supplierApi } from '../api/supplierApi';
import { rackApi } from '../api/rackApi';
import { boxApi } from '../api/boxApi';
import { categoryApi } from '../api/categoryApi';

import { toast } from 'react-toastify';
import {
  FiPlus, FiSearch, FiX, FiShoppingCart, FiPackage,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiTrash2, FiEdit2, FiCheckCircle, FiSave, FiList,
  FiTrendingUp, FiClock, FiArrowLeft, FiMapPin, FiAlertTriangle,
  FiDollarSign, FiInfo, FiTag, FiBox, FiUser, FiCalendar,
  FiLayers, FiHash, FiMove, FiDownload, FiFileText, FiGrid,
  FiRotateCw, FiMenu, FiZap
} from 'react-icons/fi';
import './StockIn.css';
import BomImport from './BomImport';

// ══════════════════════════════════════════════════════════════
// DRAFT STORAGE
// ══════════════════════════════════════════════════════════════
const DRAFT_KEY = 'si-draft-items';

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch { return null; }
};

const saveDraftNow = (items) => {
  try {
    const total = items.reduce((s, i) => s + (i.totalValue || 0), 0);
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      items,
      savedAt: new Date().toISOString(),
      total,
    }));
    return true;
  } catch { return false; }
};

const clearDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// ══════════════════════════════════════════════════════════════
// EXCEL / PDF EXPORT
// ══════════════════════════════════════════════════════════════
const loadXLSX = async () => {
  try { return (await import('xlsx')); }
  catch { toast.error('Excel library not installed. Run: npm i xlsx'); return null; }
};

const loadPDF = async () => {
  try {
    const jspdfMod     = await import('jspdf');
    const autoTableMod = await import('jspdf-autotable');
    const jsPDF     = jspdfMod.default || jspdfMod.jsPDF;
    const autoTable = autoTableMod.default || autoTableMod.autoTable;
    return { jsPDF, autoTable };
  } catch {
    toast.error('PDF library not installed. Run: npm i jspdf jspdf-autotable');
    return null;
  }
};

const exportItemsToExcel = async (items, filename = 'stock-items.xlsx') => {
  if (!items || items.length === 0) { toast.info('No items to export'); return; }
  const XLSX = await loadXLSX();
  if (!XLSX) return;

  const rows = items.map((item, idx) => ({
    '#':               idx + 1,
    'Category':        item.categoryDisplay    || '-',
    'Part No.':        item.partNumberDisplay  || '-',
    'Description':     item.descriptionDisplay || '-',
    'Package':         item.packageType        || '-',
    'Manufacturer PN': item.manufacturerPn     || '-',
    'HSN Code':        item.hsnCode            || '-',
    'GST %':           item.gstPercent         || '-',
    'Quantity':        item.quantity           || 0,
    'Price (INR)':     item.purchasePrice      || 0,
    'Total (INR)':     (item.totalValue || 0).toFixed(2),
    'Rack':            item.rackDisplay        || '-',
    'Box':             item.boxDisplay         || '-',
    'Supplier':        item.supplierDisplay    || '-',
    'Invoice No.':     item.invoiceNumber      || '-',
    'Purchase Date':   item.purchaseDate       || '-',
    'Remarks':         item.remarks            || '-',
  }));
  const grandTotal = items.reduce((s, i) => s + (i.totalValue || 0), 0);
  rows.push({});
  rows.push({
    '#': '', 'Category': '', 'Part No.': '', 'Description': '', 'Package': '',
    'Manufacturer PN': '', 'HSN Code': '', 'GST %': '',
    'Quantity': 'GRAND TOTAL', 'Price (INR)': '', 'Total (INR)': grandTotal.toFixed(2),
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    {wch:4},{wch:14},{wch:16},{wch:28},{wch:12},{wch:18},
    {wch:14},{wch:8},{wch:10},{wch:12},{wch:14},{wch:12},{wch:12},{wch:16},{wch:14},{wch:14},{wch:20}
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Items');
  XLSX.writeFile(wb, filename);
  toast.success('Excel downloaded');
};

const exportItemsToPDF = async (items, title = 'Stock Items Report', filename = 'stock-items.pdf') => {
  if (!items || items.length === 0) { toast.info('No items to export'); return; }
  const pdf = await loadPDF();
  if (!pdf) return;
  const { jsPDF, autoTable } = pdf;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(16); doc.setTextColor(30, 64, 175); doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 40);
  doc.setFontSize(10); doc.setTextColor(100,116,139); doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
  doc.text(`Total items: ${items.length}`, 40, 72);

  const body = items.map((item, idx) => [
    idx + 1,
    item.categoryDisplay    || '-',
    item.partNumberDisplay  || '-',
    item.descriptionDisplay || '-',
    item.packageType        || '-',
    item.hsnCode            || '-',
    item.gstPercent ? `${item.gstPercent}%` : '-',
    item.quantity           || 0,
    `₹${item.purchasePrice || 0}`,
    `₹${(item.totalValue || 0).toFixed(2)}`,
    `${item.rackDisplay || '-'} / ${item.boxDisplay || '-'}`,
    item.supplierDisplay    || '-',
    item.purchaseDate       || '-',
  ]);
  const grandTotal = items.reduce((s, i) => s + (i.totalValue || 0), 0);

  autoTable(doc, {
    startY: 88,
    head: [['#','Category','Part No.','Description','Pkg','HSN','GST','Qty','Price','Total','Rack/Box','Supplier','Date']],
    body,
    styles:     { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    foot: [['', '', '', '', '', '', '', '', 'Grand Total', `₹${grandTotal.toFixed(2)}`, '', '', '']],
    footStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
  });
  doc.save(filename);
  toast.success('PDF downloaded');
};

const exportStockedToExcel = async (products, filename = 'stocked-products.xlsx') => {
  if (!products || products.length === 0) { toast.info('No products to export'); return; }
  const XLSX = await loadXLSX();
  if (!XLSX) return;
  const rows = products.map((p, idx) => ({
    '#':            idx + 1,
    'Category':     p.categoryName || '-',
    'Part No.':     p.partNumber   || '-',
    'Description':  p.description  || '-',
    'Package':      p.packageType  || '-',
    'HSN Code':     p.hsnCode      || '-',
    'GST %':        p.gstPercent   || '-',
    'Stock Qty':    p.totalStock   || 0,
    'Unit Price':   p.unitPrice    || 0,
    'Total Value':  ((p.totalStock || 0) * (p.unitPrice || 0)).toFixed(2),
    'Status':       p.stockStatus  || '-',
    'Rack':         p.rackName     || '-',
    'Box':          p.boxLabel     || '-',
    'Supplier':     p.supplierName || '-',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:4},{wch:14},{wch:16},{wch:28},{wch:12},{wch:14},{wch:8},{wch:10},{wch:12},{wch:14},{wch:12},{wch:12},{wch:12},{wch:16}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stocked Products');
  XLSX.writeFile(wb, filename);
  toast.success('Excel downloaded');
};

const exportStockedToPDF = async (products, filename = 'stocked-products.pdf') => {
  if (!products || products.length === 0) { toast.info('No products to export'); return; }
  const pdf = await loadPDF();
  if (!pdf) return;
  const { jsPDF, autoTable } = pdf;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(16); doc.setTextColor(30, 64, 175); doc.setFont('helvetica','bold');
  doc.text('Stocked Products Report', 40, 40);
  doc.setFontSize(10); doc.setTextColor(100,116,139); doc.setFont('helvetica','normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
  doc.text(`Total products: ${products.length}`, 40, 72);

  const body = products.map((p, idx) => [
    idx + 1,
    p.categoryName || '-',
    p.partNumber   || '-',
    p.description  || '-',
    p.packageType  || '-',
    p.hsnCode      || '-',
    p.gstPercent ? `${p.gstPercent}%` : '-',
    p.totalStock   || 0,
    `₹${(p.unitPrice || 0).toFixed(2)}`,
    `₹${((p.totalStock || 0) * (p.unitPrice || 0)).toFixed(2)}`,
    p.stockStatus === 'LOW_STOCK' ? 'Low' : 'OK',
  ]);
  autoTable(doc, {
    startY: 88,
    head: [['#','Category','Part No.','Description','Pkg','HSN','GST','Qty','Price','Value','Status']],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(filename);
  toast.success('PDF downloaded');
};

// ── VIEW ENUM ─────────────────────────────────────────────────
const VIEW = { MAIN: 'main', FORM: 'form', REVIEW: 'review', DETAIL: 'detail', BOM: 'bom' };

// ══════════════════════════════════════════════════════════════
// DRAFT RECOVERY BANNER
// ══════════════════════════════════════════════════════════════
const DraftBanner = ({ draft, onRestore, onDiscard }) => {
  if (!draft) return null;
  const total = draft.total || 0;
  const count = draft.items?.length || 0;
  return (
    <div className="si-draft-banner">
      <div className="si-draft-icon"><FiRotateCw size={18}/></div>
      <div className="si-draft-info">
        <div className="si-draft-title">Draft found — {count} item{count > 1 ? 's' : ''}</div>
        <div className="si-draft-sub">
          Saved {timeAgo(draft.savedAt)} · Total ₹{total.toFixed(2)}
        </div>
      </div>
      <button className="si-draft-restore" onClick={onRestore}>
        <FiRotateCw size={13}/> Restore
      </button>
      <button className="si-draft-discard" onClick={onDiscard}>
        <FiX size={13}/> Discard
      </button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// DRAFT SAVED-AT HELPER
// ══════════════════════════════════════════════════════════════
const getDraftSavedAt = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw).savedAt || null;
  } catch { return null; }
};

// ══════════════════════════════════════════════════════════════
// FLOATING SPEED-DIAL
// ══════════════════════════════════════════════════════════════
const FloatingControls = ({ items, onReview, onEdit, onDelete, editingIndex, onDiscardDraft }) => {
  const [open, setOpen]           = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(() => getDraftSavedAt());
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    setDraftSavedAt(getDraftSavedAt());
    const t = setInterval(() => setDraftSavedAt(getDraftSavedAt()), 60000);
    return () => clearInterval(t);
  }, [items]);

  const defaultPos = () => ({
    x: window.innerWidth - 80,
    y: Math.max(100, window.innerHeight / 2 - 30),
  });

  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('si-allitems-pos');
      if (saved) {
        const p = JSON.parse(saved);
        return {
          x: Math.min(Math.max(0, p.x), window.innerWidth  - 64),
          y: Math.min(Math.max(0, p.y), window.innerHeight - 200),
        };
      }
    } catch {}
    return defaultPos();
  });

  const dragState = useRef({ dragging: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    try { localStorage.setItem('si-allitems-pos', JSON.stringify(pos)); } catch {}
  }, [pos]);

  useEffect(() => {
    const onResize = () => setPos(p => ({
      x: Math.min(Math.max(0, p.x), window.innerWidth  - 64),
      y: Math.min(Math.max(0, p.y), window.innerHeight - 200),
    }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest('.si-speeddial-wrap') && !e.target.closest('.si-speeddial-discard-dialog'))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handlePointerDown = (e) => {
    const pt = e.touches ? e.touches[0] : e;
    dragState.current = {
      dragging: true, moved: false,
      startX: pt.clientX, startY: pt.clientY,
      origX: pos.x, origY: pos.y,
    };
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup',   handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend',  handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.dragging) return;
    if (e.touches) e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragState.current.startX;
    const dy = pt.clientY - dragState.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragState.current.moved = true;
    setPos({
      x: Math.min(Math.max(0, dragState.current.origX + dx), window.innerWidth  - 64),
      y: Math.min(Math.max(0, dragState.current.origY + dy), window.innerHeight - 200),
    });
  };

  const handlePointerUp = () => {
    document.removeEventListener('mousemove', handlePointerMove);
    document.removeEventListener('mouseup',   handlePointerUp);
    document.removeEventListener('touchmove', handlePointerMove);
    document.removeEventListener('touchend',  handlePointerUp);
    if (dragState.current.dragging && !dragState.current.moved) setOpen(prev => !prev);
    dragState.current.dragging = false;
  };

  const total    = items.reduce((s, i) => s + (i.totalValue || 0), 0);
  const totalQty = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
  const hasDraft = items.length > 0 || !!draftSavedAt;

  return (
    <>
      <div className="si-speeddial-wrap" style={{ left: pos.x + 'px', top: pos.y + 'px' }}>
        <div className={`si-speeddial-actions ${open ? 'open' : ''}`}>
          <div className="si-speeddial-item" style={{ '--delay': '0s' }}>
            <span className="si-speeddial-label">
              All Items
              {items.length > 0 && <span className="si-speeddial-badge">{items.length}</span>}
            </span>
            <button className="si-speeddial-btn si-speeddial-btn--indigo"
              onClick={() => { setOpen(false); setPanelOpen(true); }} title="All Items">
              <FiShoppingCart size={18}/>
            </button>
          </div>

          {hasDraft && (
            <div className="si-speeddial-item si-speeddial-item--draftrow" style={{ '--delay': '0.06s' }}>
              <button className="si-speeddial-discard-btn" onClick={() => setShowDiscardConfirm(true)} title="Discard draft">
                <FiTrash2 size={12}/>
              </button>
              {draftSavedAt && (
                <span className="si-speeddial-time-chip">
                  <FiSave size={10}/> {timeAgo(draftSavedAt)}
                </span>
              )}
              <button className="si-speeddial-btn si-speeddial-btn--amber" title="Draft auto-saved" style={{ cursor: 'default' }}>
                <FiSave size={18}/>
              </button>
            </div>
          )}
        </div>

        <div className={`si-speeddial-main ${open ? 'active' : ''}`}
          onMouseDown={handlePointerDown} onTouchStart={handlePointerDown}>
          {items.length > 0 && !open && <span className="si-speeddial-main-badge">{items.length}</span>}
          <span className={`si-speeddial-main-icon ${open ? 'rotated' : ''}`}>
            {open ? <FiX size={22}/> : <FiZap size={22}/>}
          </span>
          <span className="si-speeddial-drag-hint"><FiMove size={10}/></span>
        </div>
      </div>

      {showDiscardConfirm && (
        <div className="si-form-overlay" onClick={() => setShowDiscardConfirm(false)}>
          <div className="si-confirm-dialog si-speeddial-discard-dialog" onClick={e => e.stopPropagation()}>
            <FiTrash2 size={36} style={{ color: '#dc2626', marginBottom: 12 }}/>
            <h3>Discard Draft?</h3>
            <p>All {items.length > 0 ? items.length + ' unsaved item' + (items.length > 1 ? 's' : '') : 'draft data'} will be permanently deleted.</p>
            <div className="si-confirm-dialog-actions">
              <button className="si-fp-cancel" onClick={() => setShowDiscardConfirm(false)}>Cancel</button>
              <button className="si-fp-danger" onClick={() => { setShowDiscardConfirm(false); setOpen(false); onDiscardDraft(); }}>
                <FiTrash2 size={13}/> Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {panelOpen && (
        <>
          <div className="si-panel-overlay" onClick={() => setPanelOpen(false)}/>
          <aside className="si-panel">
            <div className="si-panel-head">
              <div className="si-panel-title">
                <FiShoppingCart size={16}/>
                <span>All Items</span>
                <span className="si-panel-count">{items.length}</span>
              </div>
              <button className="si-panel-close" onClick={() => setPanelOpen(false)}><FiX size={18}/></button>
            </div>

            {items.length > 0 && (
              <div className="si-panel-summary">
                <div className="si-panel-sum-stat">
                  <span className="si-panel-sum-label">Items</span>
                  <strong>{items.length}</strong>
                </div>
                <div className="si-panel-sum-stat">
                  <span className="si-panel-sum-label">Total Qty</span>
                  <strong>{totalQty}</strong>
                </div>
                <div className="si-panel-sum-stat">
                  <span className="si-panel-sum-label">Total Value</span>
                  <strong className="si-panel-sum-price">₹{total.toFixed(2)}</strong>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="si-panel-empty">
                <div className="si-panel-empty-icon"><FiShoppingCart size={36}/></div>
                <p className="si-panel-empty-title">No items yet</p>
                <p className="si-panel-empty-sub">Fill the form and click<br/><b>Add to All Items</b> to start</p>
              </div>
            ) : (
              <>
                <div className="si-panel-list">
                  {items.map((item, idx) => (
                    <div key={idx} className={`si-panel-item ${editingIndex === idx ? 'editing' : ''}`}>
                      <div className="si-panel-item-top">
                        <span className="si-panel-idx">#{idx + 1}</span>
                        <span className="si-panel-cat">{item.categoryDisplay}</span>
                        <div className="si-panel-actions">
                          <button className="si-panel-edit" title="Edit"
                            onClick={() => { onEdit(item, idx); setPanelOpen(false); }}>
                            <FiEdit2 size={12}/>
                          </button>
                          <button className="si-panel-del" title="Remove" onClick={() => onDelete(idx)}>
                            <FiTrash2 size={12}/>
                          </button>
                        </div>
                      </div>
                      <div className="si-panel-part">{item.partNumberDisplay}</div>
                      <div className="si-panel-desc" title={item.descriptionDisplay}>
                        {item.descriptionDisplay}
                      </div>
                      {/* HSN / GST chips in panel */}
                      {(item.hsnCode || item.gstPercent) && (
                        <div className="si-panel-hsn-row">
                          {item.hsnCode && (
                            <span className="si-panel-hsn-chip"><FiHash size={9}/> {item.hsnCode}</span>
                          )}
                          {item.gstPercent && (
                            <span className="si-panel-gst-chip"><FiTag size={9}/> {item.gstPercent}% GST</span>
                          )}
                        </div>
                      )}
                      <div className="si-panel-foot-row">
                        <span className="si-panel-qty">{item.quantity} × ₹{item.purchasePrice}</span>
                        <span className="si-panel-total">₹{(item.totalValue || 0).toFixed(2)}</span>
                      </div>
                      {editingIndex === idx && <div className="si-panel-editing-badge">Editing…</div>}
                    </div>
                  ))}
                </div>

                <div className="si-panel-foot">
                  <div className="si-panel-grand">
                    <span>Grand Total</span>
                    <strong>₹{total.toFixed(2)}</strong>
                  </div>
                  <button className="si-panel-submit" onClick={() => { setPanelOpen(false); onReview(); }}>
                    <FiCheckCircle size={15}/> Review &amp; Submit All
                  </button>
                </div>
              </>
            )}
          </aside>
        </>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════
// SUCCESS DIALOG
// ══════════════════════════════════════════════════════════════
const SuccessDialog = ({ items, onClose }) => {
  const grandTotal = items.reduce((s, i) => s + (i.totalValue || 0), 0);
  return (
    <div className="si-form-overlay" onClick={onClose}>
      <div className="si-success-dialog" onClick={e => e.stopPropagation()}>
        <div className="si-success-icon-wrap"><FiCheckCircle size={48}/></div>
        <h3>Submission Successful!</h3>
        <p className="si-success-sub">
          <strong>{items.length}</strong> item{items.length > 1 ? 's' : ''} added to stock
          <br/>Total value: <strong className="si-success-total">₹{grandTotal.toFixed(2)}</strong>
        </p>
        <div className="si-success-download-title"><FiDownload size={13}/> Download receipt</div>
        <div className="si-success-download-row">
          <button className="si-dl-btn si-dl-excel"
            onClick={() => exportItemsToExcel(items, `stock-submitted-${Date.now()}.xlsx`)}>
            <FiGrid size={16}/>
            <div className="si-dl-text">
              <span className="si-dl-title">Excel</span>
              <span className="si-dl-sub">.xlsx</span>
            </div>
          </button>
          <button className="si-dl-btn si-dl-pdf"
            onClick={() => exportItemsToPDF(items, 'Stock Submission Receipt', `stock-submitted-${Date.now()}.pdf`)}>
            <FiFileText size={16}/>
            <div className="si-dl-text">
              <span className="si-dl-title">PDF</span>
              <span className="si-dl-sub">.pdf</span>
            </div>
          </button>
        </div>
        <button className="si-success-close" onClick={onClose}>Done</button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// RECENT POPUP
// ══════════════════════════════════════════════════════════════
const RecentPopup = ({ items, onClose }) => (
  <div className="si-recent-overlay" onClick={onClose}>
    <div className="si-recent-popup" onClick={e => e.stopPropagation()}>
      <div className="si-recent-popup-header">
        <span><FiClock size={14}/> Recent Stock IN</span>
        <button onClick={onClose}><FiX size={14}/></button>
      </div>
      <div className="si-recent-popup-list">
        {items.length === 0
          ? <div className="si-recent-empty">No recent stock ins</div>
          : items.map((item, i) => (
            <div key={i} className="si-recent-popup-item">
              <div className="si-recent-dot"/>
              <div>
                <div className="si-recent-pn">{item.product}</div>
                <div className="si-recent-meta">{item.qty} units · ₹{item.value} · {item.date}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// DETAIL PAGE — shows HSN/GST from StockedProductResponse
// ══════════════════════════════════════════════════════════════
const DetailPage = ({ product, onBack, onAddStock }) => {
  if (!product) return null;
  const unitPrice  = parseFloat(product.unitPrice  || 0);
  const gstPct     = parseFloat(product.gstPercent || 0);
  const totalStock = parseFloat(product.totalStock || 0);
  const gstAmount  = gstPct > 0 ? unitPrice * gstPct / 100 : 0;
  const totalValue = totalStock * unitPrice;

  return (
    <div className="si-page">
      <div className="si-header">
        <div className="si-header-left">
          <button className="si-back-btn" onClick={onBack}><FiArrowLeft size={16}/> Back</button>
          <div className="si-header-icon" style={{background:'#7c3aed'}}><FiPackage size={20}/></div>
          <div>
            <p className="si-title">{product.partNumber || '—'} · {product.description || '—'}</p>
            <p className="si-subtitle">{product.categoryName || '—'}</p>
          </div>
        </div>
        <button className="si-add-new-btn" onClick={onAddStock}><FiPlus size={14}/> Add Stock</button>
      </div>

      <div className="si-detail-status-bar">
        <div className="si-detail-stat">
          <span className="si-detail-stat-label">Total Stock</span>
          <span className={`si-detail-stat-val ${product.stockStatus === 'LOW_STOCK' ? 'warn' : 'ok'}`}>
            {totalStock.toFixed(0)}
            {product.stockStatus === 'LOW_STOCK' && <span className="si-low-badge" style={{marginLeft:6}}>Low</span>}
          </span>
        </div>
        <div className="si-detail-stat">
          <span className="si-detail-stat-label">Unit Price</span>
          <span className="si-detail-stat-val">₹{unitPrice.toFixed(2)}</span>
        </div>
        <div className="si-detail-stat">
          <span className="si-detail-stat-label">Total Value</span>
          <span className="si-detail-stat-val ok">₹{totalValue.toFixed(2)}</span>
        </div>
        <div className="si-detail-stat">
          <span className="si-detail-stat-label">Status</span>
          <span className={`si-detail-badge ${product.stockStatus === 'LOW_STOCK' ? 'warn' : 'ok'}`}>
            {product.stockStatus === 'LOW_STOCK' ? '⚠ Low Stock' : '✓ In Stock'}
          </span>
        </div>
      </div>

      <div className="si-detail-grid">
        {/* Product Info */}
        <div className="si-detail-card">
          <div className="si-detail-card-title"><FiPackage size={14}/> Product Info</div>
          <div className="si-detail-row">
            <span className="si-detail-label"><FiHash size={11}/> Part Number</span>
            <span className="si-detail-value si-mono">{product.partNumber || '—'}</span>
          </div>
          <div className="si-detail-row">
            <span className="si-detail-label"><FiInfo size={11}/> Description</span>
            <span className="si-detail-value">{product.description || '—'}</span>
          </div>
          <div className="si-detail-row">
            <span className="si-detail-label"><FiTag size={11}/> Package</span>
            <span className="si-detail-value si-mono">{product.packageType || '—'}</span>
          </div>
          <div className="si-detail-row">
            <span className="si-detail-label"><FiHash size={11}/> Manufacturer P/N</span>
            <span className="si-detail-value si-mono">{product.manufacturerPn || '—'}</span>
          </div>
          <div className="si-detail-row">
            <span className="si-detail-label"><FiLayers size={11}/> Category</span>
            <span className="si-detail-value"><span className="si-cat-badge">{product.categoryName || '—'}</span></span>
          </div>
        </div>

        {/* Location */}
        <div className="si-detail-card">
          <div className="si-detail-card-title"><FiMapPin size={14}/> Location</div>
          <div className="si-detail-row">
            <span className="si-detail-label"><FiLayers size={11}/> Rack</span>
            <span className="si-detail-value">{product.rackName || '—'}</span>
          </div>
          <div className="si-detail-row">
            <span className="si-detail-label"><FiBox size={11}/> Box</span>
            <span className="si-detail-value">{product.boxLabel || '—'}</span>
          </div>
        </div>

        {/* Pricing & Tax — full HSN/GST display */}
        <div className="si-detail-card">
          <div className="si-detail-card-title"><FiDollarSign size={14}/> Pricing &amp; Tax</div>
          <div className="si-detail-row">
            <span className="si-detail-label">Unit Price</span>
            <span className="si-detail-value si-price">₹{unitPrice.toFixed(2)}</span>
          </div>

          {/* HSN Code */}
          {product.hsnCode && (
            <div className="si-detail-row">
              <span className="si-detail-label"><FiHash size={11}/> HSN / SAC Code</span>
              <span className="si-detail-value si-mono">{product.hsnCode}</span>
            </div>
          )}

          {/* GST % + calculated amounts */}
          {gstPct > 0 && (
            <>
              <div className="si-detail-row">
                <span className="si-detail-label"><FiTag size={11}/> GST %</span>
                <span className="si-detail-value">
                  <span className="si-gst-badge-detail">{product.gstPercent}%</span>
                </span>
              </div>
              <div className="si-detail-row">
                <span className="si-detail-label">GST per unit</span>
                <span className="si-detail-value" style={{color:'#f59e0b',fontWeight:700}}>
                  ₹{gstAmount.toFixed(2)}
                </span>
              </div>
              <div className="si-detail-row">
                <span className="si-detail-label">Price + GST</span>
                <span className="si-detail-value si-price-green">
                  ₹{(unitPrice + gstAmount).toFixed(2)}
                </span>
              </div>
            </>
          )}

          <div className="si-detail-row">
            <span className="si-detail-label">Total Stock</span>
            <span className="si-detail-value">{totalStock.toFixed(0)} pcs</span>
          </div>
          <div className="si-detail-row">
            <span className="si-detail-label">Total Value</span>
            <span className="si-detail-value si-price-green">₹{totalValue.toFixed(2)}</span>
          </div>
        </div>

        {/* Supplier */}
        <div className="si-detail-card">
          <div className="si-detail-card-title"><FiUser size={14}/> Supplier</div>
          <div className="si-detail-row">
            <span className="si-detail-label">Supplier Name</span>
            <span className="si-detail-value">{product.supplierName || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// STOCK FORM PAGE
// ══════════════════════════════════════════════════════════════
const StockFormPage = ({
  products, suppliers, racks, categories,
  editItem, editingIndex, itemCount, bulkItems, persistedValues,
  onSaveNext, onSaveDone, onCancel, onGoReview
}) => {
  const [form, setForm] = useState({
    categoryId:     editItem?.categoryId     || '',
    productId:      editItem?.productId      || '',
    partNumber:     editItem?.partNumber     || '',
    description:    editItem?.description    || '',
    packageType:    editItem?.packageType    || '',
    manufacturerPn: editItem?.manufacturerPn || '',
    quantity:       editItem?.quantity       || '',
    purchasePrice:  editItem?.purchasePrice  || '',
    supplierId:     editItem?.supplierId     || persistedValues?.supplierId     || '',
    invoiceNumber:  editItem?.invoiceNumber  || persistedValues?.invoiceNumber  || '',
    rackId:         editItem?.rackId         || '',
    boxId:          editItem?.boxId          || '',
    purchaseDate:   editItem?.purchaseDate   || persistedValues?.purchaseDate   || new Date().toISOString().split('T')[0],
    remarks:        editItem?.remarks        || '',
    // ── HSN / GST — auto-filled from product ──────────────────
    hsnCode:        editItem?.hsnCode        || '',
    gstPercent:     editItem?.gstPercent     || '',
    // ─────────────────────────────────────────────────────────
  });

  const [boxes, setBoxes]               = useState([]);
  const [catSearch, setCatSearch]       = useState('');
  const [showCatDrop, setShowCatDrop]   = useState(false);
  const catRef  = useRef(null);
  const [showProdDrop, setShowProdDrop] = useState(false);
  const prodRef = useRef(null);
  const [existingLotPrices, setExistingLotPrices] = useState([]);
  const [showErrors, setShowErrors]     = useState(!!editItem);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e) => { if (catRef.current  && !catRef.current.contains(e.target))  setShowCatDrop(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    const h = (e) => { if (prodRef.current && !prodRef.current.contains(e.target)) setShowProdDrop(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  // Filtered categories
  const filteredCats = useMemo(() => {
    if (!catSearch.trim()) return categories;
    return categories.filter(c => c.categoryName.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catSearch]);

  // Products filtered by selected category
  const filteredProducts = useMemo(() => {
    if (!form.categoryId) return [];
    return products.filter(p => p.category?.categoryId === parseInt(form.categoryId));
  }, [products, form.categoryId]);

  // Products filtered by description search
  const filteredProdSearch = useMemo(() => {
    if (!filteredProducts.length) return [];
    if (!form.description?.trim()) return filteredProducts;
    const q = form.description.toLowerCase();
    return filteredProducts.filter(p =>
      [p.description, p.packageType, p.manufacturerPn]
        .filter(Boolean).some(v => v.toLowerCase().includes(q))
    );
  }, [filteredProducts, form.description]);

  // Auto-select if only one product in category
  useEffect(() => {
    if (filteredProducts.length === 1 && !form.productId) selectProduct(filteredProducts[0]);
  }, [filteredProducts]);

  // Load boxes when rack changes
  useEffect(() => { if (form.rackId) loadBoxes(form.rackId); }, [form.rackId]);

  // On edit: pre-load rack boxes + product lots
  useEffect(() => {
    if (editItem?.rackId)    loadBoxes(editItem.rackId);
    if (editItem?.productId) handleProductChange(editItem.productId);
  }, []);

  // Pre-fill category search label on edit
  useEffect(() => {
    if (editItem?.categoryId) {
      const cat = categories.find(c => c.categoryId === parseInt(editItem.categoryId));
      if (cat) setCatSearch(cat.categoryName);
    }
  }, [editItem, categories]);

  const loadBoxes = async (rackId) => {
    try { const r = await boxApi.getByRack(rackId); setBoxes(r.data.data || []); }
    catch { setBoxes([]); }
  };

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const selectCategory = (cat) => {
    setForm(prev => ({
      ...prev,
      categoryId: cat.categoryId,
      productId:  '',
      hsnCode:    '',   // clear when category changes
      gstPercent: '',
    }));
    setCatSearch(cat.categoryName);
    setShowCatDrop(false);
  };

  // ── KEY: auto-fill hsnCode + gstPercent from product ──────────
  const handleProductChange = async (productId) => {
    const product = products.find(p => p.productId === parseInt(productId));
    if (!product) return;

    // Fetch existing lot prices for price-diff warning
    try {
      const res = await stockApi.getLotsByProduct(productId);
      const lots = res.data.data || [];
      const prices = lots.filter(l => l.remainingQuantity > 0)
        .map(l => parseFloat(l.purchasePrice)).filter(p => p > 0);
      setExistingLotPrices(prices);
    } catch { setExistingLotPrices([]); }

    setForm(prev => ({
      ...prev,
      productId:      product.productId,
      partNumber:     product.partNumber && product.partNumber !== '—' ? product.partNumber : prev.partNumber || '',
      description:    product.description    || '',
      packageType:    product.packageType    || '',
      manufacturerPn: product.manufacturerPn || '',
      purchasePrice:  product.unitPrice      || '',
      supplierId:     product.supplier?.supplierId || prev.supplierId,
      rackId:         product.rack?.rackId         || prev.rackId,
      boxId:          product.box?.boxId           || prev.boxId,
      categoryId:     product.category?.categoryId || prev.categoryId,
      // ── AUTO-FILL HSN / GST from product ──────────────────────
      hsnCode:        product.hsnCode    || '',
      gstPercent:     product.gstPercent || '',
      // ─────────────────────────────────────────────────────────
    }));
    if (product.rack?.rackId) loadBoxes(product.rack.rackId);
  };

  const selectProduct = (prod) => { setShowProdDrop(false); handleProductChange(prod.productId); };

  const buildItem = () => {
    const product  = products.find(p  => p.productId   === parseInt(form.productId));
    const rack     = racks.find(r     => r.rackId       === parseInt(form.rackId));
    const box      = boxes.find(b     => b.boxId        === parseInt(form.boxId));
    const supplier = suppliers.find(s => s.supplierId   === parseInt(form.supplierId));
    const category = categories.find(c => c.categoryId  === parseInt(form.categoryId));
    const qty   = parseFloat(form.quantity)      || 0;
    const price = parseFloat(form.purchasePrice) || 0;
    return {
      ...form,
      productId:          parseInt(form.productId)  || 0,
      supplierId:         form.supplierId ? parseInt(form.supplierId) : null,
      rackId:             parseInt(form.rackId)     || 0,
      boxId:              parseInt(form.boxId)      || 0,
      quantity:           qty,
      purchasePrice:      price,
      totalValue:         qty * price,
      // ── include HSN/GST in cart item ──────────────────────────
      hsnCode:            form.hsnCode    || null,
      gstPercent:         form.gstPercent || null,
      // ─────────────────────────────────────────────────────────
      partNumberDisplay:  product?.partNumber    || form.partNumber || '—',
      descriptionDisplay: product?.description   || form.description || '—',
      categoryDisplay:    category?.categoryName || '—',
      supplierDisplay:    supplier?.supplierName || '—',
      rackDisplay:        rack?.rackName         || '—',
      boxDisplay:         box?.boxLabel          || '—',
    };
  };

  const formIsEmpty = () =>
    !form.categoryId && !form.productId && !form.description
    && (!form.quantity || parseFloat(form.quantity) === 0)
    && (!form.purchasePrice || parseFloat(form.purchasePrice) === 0);

  const validate = () => {
    if (!form.categoryId) { toast.error('Select a category'); return false; }
    if (!form.productId)  { toast.error('Select a product'); return false; }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { toast.error('Enter quantity'); return false; }
    const dup = bulkItems.findIndex((it, i) =>
      it.productId && it.productId === parseInt(form.productId) && i !== editingIndex
    );
    if (dup !== -1) { toast.error(`Product already added at item #${dup + 1}`); return false; }
    return true;
  };

  const fieldErrors = {
    category:  showErrors && !form.categoryId,
    product:   showErrors && !form.productId,
    quantity:  showErrors && (!form.quantity || parseFloat(form.quantity) <= 0),
    price:     showErrors && (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0),
    rack:      showErrors && !form.rackId,
    box:       showErrors && !form.boxId,
  };

  const handleSaveReviewClick = () => {
    if (formIsEmpty() && bulkItems.length > 0) { onGoReview(); return; }
    setShowErrors(true);
    if (!validate()) return;
    onSaveDone(buildItem());
  };

  // Calculations
  const totalValue       = (parseFloat(form.quantity) || 0) * (parseFloat(form.purchasePrice) || 0);
  const currentPrice     = parseFloat(form.purchasePrice) || 0;
  const gstAmount        = form.gstPercent ? currentPrice * parseFloat(form.gstPercent) / 100 : 0;
  const maxExistingPrice = existingLotPrices.length > 0 ? Math.max(...existingLotPrices) : null;
  const minExistingPrice = existingLotPrices.length > 0 ? Math.min(...existingLotPrices) : null;
  const priceHigher      = currentPrice > 0 && maxExistingPrice !== null && currentPrice > maxExistingPrice;
  const priceIncPct      = priceHigher ? (((currentPrice - maxExistingPrice) / maxExistingPrice) * 100).toFixed(1) : null;
  const selectedRack     = racks.find(r => r.rackId === parseInt(form.rackId));

  const saveReviewLabel = formIsEmpty() && bulkItems.length > 0
    ? `REVIEW ${bulkItems.length} ITEM${bulkItems.length > 1 ? 'S' : ''}` : 'SAVE & REVIEW';
  const saveReviewSub   = formIsEmpty() && bulkItems.length > 0
    ? 'Skip form & review saved items' : 'Finish and submit all';

  return (
    <div className="si-page">
      <div className="si-header">
        <div className="si-header-left">
          <div className="si-header-icon"><FiShoppingCart size={20}/></div>
          <div>
            <p className="si-title">
              {editingIndex !== null ? `Editing Item #${editingIndex + 1}` : 'Add New Stock'}
            </p>
            <p className="si-subtitle">
              {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''} in All Items` : 'Fill details and save'}
            </p>
          </div>
        </div>
        <button className="si-back-btn" onClick={onCancel}><FiArrowLeft size={14}/> Back</button>
      </div>

      <div className="si-form-page-card">
        <div className="si-form-page-title">
          <FiPackage size={16}/> Stock Entry Form
          {editingIndex !== null && <span className="si-form-edit-badge">EDITING</span>}
        </div>

        <div className="si-form-two-col">
          {/* ── LEFT COLUMN ── */}
          <div className="si-form-col">

            {/* CATEGORY */}
            <div className="si-fp-field" ref={catRef}>
              <label className={fieldErrors.category ? 'si-fp-label-err' : ''}>
                CATEGORY {fieldErrors.category && <span className="si-fp-err-tag">Required</span>}
              </label>
              <div className="si-cat-autocomplete">
                <div className={`si-cat-input-wrap ${fieldErrors.category ? 'si-input-err' : ''}`}>
                  <FiSearch size={13} className="si-cat-ico"/>
                  <input className="si-cat-input" placeholder="Type to search category..."
                    value={catSearch}
                    onChange={e => { setCatSearch(e.target.value); setShowCatDrop(true); if (!e.target.value) f('categoryId', ''); }}
                    onFocus={() => setShowCatDrop(true)}
                    onBlur={() => setTimeout(() => setShowCatDrop(false), 150)}
                  />
                  {catSearch && (
                    <button type="button" className="si-cat-clr" onClick={() => {
                      setCatSearch(''); f('categoryId', ''); f('productId', '');
                      f('hsnCode', ''); f('gstPercent', '');
                    }}><FiX size={12}/></button>
                  )}
                </div>
                {showCatDrop && filteredCats.length > 0 && (
                  <div className="si-cat-dropdown">
                    {filteredCats.map(c => (
                      <div key={c.categoryId}
                        className={`si-cat-option ${form.categoryId == c.categoryId ? 'selected' : ''}`}
                        onMouseDown={() => selectCategory(c)}>
                        {c.categoryName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PART NO */}
            <div className="si-fp-field">
              <label>PART No.</label>
              <input className="si-fp-input" value={form.partNumber || ''}
                onChange={e => f('partNumber', e.target.value)}/>
            </div>

            {/* MANUFACTURER PART NO */}
            <div className="si-fp-field">
              <label>MANUFACTURER PART No.</label>
              <input className="si-fp-input" value={form.manufacturerPn}
                onChange={e => f('manufacturerPn', e.target.value)}/>
            </div>

            {/* PRICE */}
            <div className="si-fp-field">
              <label className={fieldErrors.price ? 'si-fp-label-err' : ''}>
                PRICE (₹) {fieldErrors.price && <span className="si-fp-err-tag">Required</span>}
                {maxExistingPrice !== null && (
                  <span className="si-fp-hint">
                    — existing: ₹{minExistingPrice?.toFixed(2)}
                    {minExistingPrice !== maxExistingPrice ? ` – ₹${maxExistingPrice?.toFixed(2)}` : ''}
                  </span>
                )}
              </label>
              <input
                className={`si-fp-input ${priceHigher ? 'si-fp-input-warn' : ''} ${fieldErrors.price ? 'si-fp-input-err' : ''}`}
                type="number" step="0.01" value={form.purchasePrice}
                onChange={e => f('purchasePrice', e.target.value)}/>
              {priceHigher && (
                <div className="si-price-higher-warn">
                  <FiAlertTriangle size={13}/>
                  <div>
                    <strong>Price higher than existing stock!</strong>
                    <span> ₹{currentPrice.toFixed(2)} vs ₹{maxExistingPrice.toFixed(2)} (+{priceIncPct}%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* INVOICE NO */}
            <div className="si-fp-field">
              <label>INVOICE No.</label>
              <input className="si-fp-input" value={form.invoiceNumber}
                onChange={e => f('invoiceNumber', e.target.value)}/>
            </div>

            {/* REMARKS */}
            <div className="si-fp-field">
              <label>REMARKS</label>
              <textarea className="si-fp-textarea" value={form.remarks}
                onChange={e => f('remarks', e.target.value)} rows={3} placeholder="Optional notes..."/>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="si-form-col">

            {/* DESCRIPTION — searchable autocomplete */}
            <div className="si-fp-field" ref={prodRef}>
              <label className={fieldErrors.product ? 'si-fp-label-err' : ''}>
                DESCRIPTION {fieldErrors.product && <span className="si-fp-err-tag">Required</span>}
              </label>
              {!form.categoryId ? (
                <div className="si-fp-disabled-hint">Select a category first</div>
              ) : (
                <div className="si-cat-autocomplete">
                  <div className={`si-cat-input-wrap ${fieldErrors.product ? 'si-input-err' : ''}`}>
                    <FiSearch size={13} className="si-cat-ico"/>
                    <input className="si-cat-input" placeholder="Search description..."
                      value={form.description}
                      onChange={e => {
                        f('description', e.target.value);
                        setShowProdDrop(true);
                        f('productId', '');
                        setExistingLotPrices([]);
                        f('hsnCode', '');
                        f('gstPercent', '');
                      }}
                      onFocus={() => setShowProdDrop(true)}
                      onBlur={() => setTimeout(() => setShowProdDrop(false), 150)}
                    />
                    {form.description && (
                      <button type="button" className="si-cat-clr" onClick={() => {
                        f('description', ''); f('productId', '');
                        setExistingLotPrices([]);
                        f('hsnCode', ''); f('gstPercent', '');
                      }}><FiX size={12}/></button>
                    )}
                  </div>
                  {showProdDrop && filteredProdSearch.length > 0 && (
                    <div className="si-cat-dropdown">
                      {filteredProdSearch.map(p => (
                        <div key={p.productId}
                          className={`si-cat-option ${form.productId == p.productId ? 'selected' : ''}`}
                          onMouseDown={() => selectProduct(p)}>
                          <span style={{color:'#334155',fontWeight:600}}>{p.description || '—'}</span>
                          {p.packageType && <span style={{color:'#94a3b8',marginLeft:6,fontSize:11}}>{p.packageType}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PACKAGE */}
            <div className="si-fp-field">
              <label>PACKAGE</label>
              <input className="si-fp-input" value={form.packageType}
                onChange={e => f('packageType', e.target.value)}/>
            </div>

            {/* QUANTITY */}
            <div className="si-fp-field">
              <label className={fieldErrors.quantity ? 'si-fp-label-err' : ''}>
                QUANTITY {fieldErrors.quantity && <span className="si-fp-err-tag">Required</span>}
              </label>
              <input
                className={`si-fp-input ${fieldErrors.quantity ? 'si-fp-input-err' : ''}`}
                type="number" step="0.01" value={form.quantity}
                onChange={e => f('quantity', e.target.value)} placeholder="0"/>
              <div className="si-quick-btns">
                {['10','50','100','500'].map(q => (
                  <button key={q} type="button" className="si-quick-btn" onClick={() => f('quantity', q)}>{q}</button>
                ))}
              </div>
            </div>

            {/* SUPPLIER */}
            <div className="si-fp-field">
              <label>SUPPLIER</label>
              <select className="si-fp-select" value={form.supplierId}
                onChange={e => f('supplierId', e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
              </select>
            </div>

            {/* PURCHASE DATE */}
            <div className="si-fp-field">
              <label>PURCHASE DATE</label>
              <input className="si-fp-input" type="date" value={form.purchaseDate}
                onChange={e => f('purchaseDate', e.target.value)}/>
            </div>

            {/* TOTAL VALUE preview */}
            {totalValue > 0 && (
              <div className="si-fp-total">
                <span>Total Value</span>
                <strong>₹{totalValue.toFixed(2)}</strong>
              </div>
            )}

            {/* ── HSN CODE — read-only chip, auto-filled from product ── */}
            {form.hsnCode && (
              <div className="si-fp-field">
                <label>HSN / SAC CODE <span className="si-fp-hint">— from product</span></label>
                <div className="si-fp-readonly-chip">
                  <FiHash size={12}/> {form.hsnCode}
                </div>
              </div>
            )}

            {/* ── GST % — read-only chip with live calculation ── */}
            {form.gstPercent && (
              <div className="si-fp-field">
                <label>GST % <span className="si-fp-hint">— from product</span></label>
                <div className="si-fp-readonly-chip si-fp-readonly-gst">
                  <FiTag size={12}/> {form.gstPercent}%
                  {currentPrice > 0 && (
                    <span className="si-fp-gst-calc">
                      → ₹{gstAmount.toFixed(2)} GST · Total ₹{(currentPrice + gstAmount).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RACK / BOX ── */}
        <div className="si-rackbox-section">
          <div className="si-rackbox-grid">
            <div className="si-rackbox-col">
              <div className={`si-rackbox-head ${fieldErrors.rack ? 'si-rackbox-head-err' : ''}`}>
                <FiMapPin size={13}/> RACK
                {fieldErrors.rack && <span className="si-fp-err-tag">Required</span>}
                {selectedRack && <span className="si-rackbox-selected">Rack {selectedRack.rackName || selectedRack.rackNumber}</span>}
              </div>
              {racks.length === 0 ? (
                <div className="si-rackbox-empty">No racks available</div>
              ) : (
                <div className={`si-rack-pills ${fieldErrors.rack ? 'si-rackbox-err-border' : ''}`}>
                  {racks.map(r => (
                    <button key={r.rackId} type="button"
                      className={`si-rack-pill ${form.rackId == r.rackId ? 'active' : ''}`}
                      onClick={() => { f('rackId', r.rackId); f('boxId', ''); }}>
                      {r.rackNumber || r.rackName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="si-rackbox-col">
              <div className={`si-rackbox-head ${fieldErrors.box ? 'si-rackbox-head-err' : ''}`}>
                <FiBox size={13}/> BOX
                {fieldErrors.box && <span className="si-fp-err-tag">Required</span>}
                {!form.rackId && <span className="si-rackbox-hint-small">Pick rack first</span>}
              </div>
              {!form.rackId ? (
                <div className="si-rackbox-empty">Select a rack to see boxes</div>
              ) : boxes.length === 0 ? (
                <div className="si-rackbox-empty">No boxes in this rack</div>
              ) : (
                <div className={`si-box-tiles ${fieldErrors.box ? 'si-rackbox-err-border' : ''}`}>
                  {boxes.map(b => (
                    <button key={b.boxId} type="button"
                      className={`si-box-tile ${form.boxId == b.boxId ? 'active' : ''}`}
                      onClick={() => f('boxId', b.boxId)}>
                      <span className="si-box-tile-num">{b.boxNumber}</span>
                      <span className="si-box-tile-label">{b.boxLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER BUTTONS ── */}
        <div className="si-form-page-footer">
          <button type="button" className="si-btn-add-items"
            onClick={() => { setShowErrors(true); if (!validate()) return; onSaveNext(buildItem()); }}>
            <div className="si-btn-add-icon"><FiPlus size={18} strokeWidth={3}/></div>
            <div className="si-btn-add-text">
              <span className="si-btn-add-title">
                {editingIndex !== null ? 'UPDATE ITEM' : 'ADD TO ALL ITEMS'}
              </span>
              <span className="si-btn-add-sub">
                {editingIndex !== null ? 'Save changes and continue' : 'Save & add another item'}
              </span>
            </div>
          </button>
          <button type="button" className="si-btn-save-review" onClick={handleSaveReviewClick}>
            <div className="si-btn-save-text">
              <span className="si-btn-save-title"><FiCheckCircle size={14}/> {saveReviewLabel}</span>
              <span className="si-btn-save-sub">{saveReviewSub}</span>
            </div>
            <FiChevronRight size={20}/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// REVIEW PAGE
// ══════════════════════════════════════════════════════════════
const ReviewPage = ({ items, onAddMore, onEdit, onDelete, onSubmit, submitting }) => {
  const grandTotal = items.reduce((s, i) => s + (i.totalValue || 0), 0);
  const [showConfirm, setShowConfirm] = useState(false);

  const getItemErrors = (item) => {
    const e = [];
    if (!item.productId || item.productId === 0)                    e.push('No product');
    if (!item.quantity   || parseFloat(item.quantity) <= 0)         e.push('Qty = 0');
    if (!item.purchasePrice || parseFloat(item.purchasePrice) <= 0) e.push('Price = 0');
    if (!item.rackId || item.rackId === 0)                          e.push('No rack');
    if (!item.boxId  || item.boxId  === 0)                          e.push('No box');
    return e;
  };
  const invalidCount = items.filter(i => getItemErrors(i).length > 0).length;

  return (
    <div className="si-page">
      <div className="si-header">
        <div className="si-header-left">
          <div className="si-header-icon" style={{background:'#10b981'}}><FiCheckCircle size={20}/></div>
          <div>
            <p className="si-title">Review All Items</p>
            <p className="si-subtitle">{items.length} item{items.length > 1 ? 's' : ''} · Grand Total ₹{grandTotal.toFixed(2)}</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="si-export-btn si-export-excel"
            onClick={() => exportItemsToExcel(items, `stock-review-${Date.now()}.xlsx`)} disabled={!items.length}>
            <FiGrid size={13}/> Excel
          </button>
          <button className="si-export-btn si-export-pdf"
            onClick={() => exportItemsToPDF(items, 'Stock Items Review', `stock-review-${Date.now()}.pdf`)} disabled={!items.length}>
            <FiFileText size={13}/> PDF
          </button>
          <button className="si-add-more-btn" onClick={onAddMore}><FiPlus size={13}/> Add More</button>
          <button className="si-confirm-btn"
            onClick={() => setShowConfirm(true)}
            disabled={!items.length || invalidCount > 0}
            title={invalidCount > 0 ? `Fix ${invalidCount} invalid item${invalidCount > 1 ? 's' : ''} first` : ''}>
            <FiCheckCircle size={14}/> Submit All ({items.length})
          </button>
        </div>
      </div>

      {invalidCount > 0 && (
        <div className="si-review-error-banner">
          <FiAlertTriangle size={16}/>
          <div>
            <strong>{invalidCount} item{invalidCount > 1 ? 's' : ''} need to be fixed before submitting.</strong>
            <span> Click ✏️ edit on the highlighted rows to complete missing fields.</span>
          </div>
        </div>
      )}

      <div className="si-card">
        <div className="si-card-head">
          <FiList className="si-card-icon" size={15}/>
          All Items Summary — Review before submitting
          <span className="si-card-total">Total: ₹{grandTotal.toFixed(2)}</span>
        </div>
        <div className="si-product-table-wrap">
          {items.length === 0 ? (
            <div className="si-empty"><FiShoppingCart size={32}/><span>No items yet.</span></div>
          ) : (
            <table className="si-product-table">
              <thead>
                <tr>
                  <th>#</th><th>Category</th><th>Part #</th><th>Description</th>
                  <th>Pkg</th><th>HSN</th><th>GST</th><th>Qty</th>
                  <th>Price/Unit</th><th>Total</th>
                  <th>Rack/Box</th><th>Supplier</th><th>Invoice</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const errs = getItemErrors(item);
                  return (
                    <tr key={idx} className={`si-product-row ${errs.length > 0 ? 'si-row-invalid' : ''}`}>
                      <td className="si-row-num">
                        {errs.length > 0
                          ? <span title={errs.join(', ')} style={{color:'#dc2626',fontWeight:900}}>⚠</span>
                          : idx + 1}
                      </td>
                      <td><span className="si-cat-badge">{item.categoryDisplay}</span></td>
                      <td><span className="si-part-num">{item.partNumberDisplay}</span></td>
                      <td>{item.descriptionDisplay}</td>
                      <td><span className="si-pkg">{item.packageType || '—'}</span></td>
                      {/* HSN */}
                      <td><span className="si-review-hsn">{item.hsnCode || '—'}</span></td>
                      {/* GST */}
                      <td>
                        {item.gstPercent
                          ? <span className="si-review-gst">{item.gstPercent}%</span>
                          : <span style={{color:'#cbd5e1'}}>—</span>}
                      </td>
                      <td style={{fontWeight:700, color: parseFloat(item.quantity) <= 0 ? '#dc2626' : 'inherit'}}>
                        {item.quantity}
                      </td>
                      <td>₹{item.purchasePrice}</td>
                      <td style={{fontWeight:700,color:'#10b981'}}>₹{(item.totalValue || 0).toFixed(2)}</td>
                      <td style={{fontSize:12,color:'#64748b'}}>{item.rackDisplay}/{item.boxDisplay}</td>
                      <td style={{fontSize:12}}>{item.supplierDisplay}</td>
                      <td style={{fontSize:12}}>{item.invoiceNumber || '—'}</td>
                      <td style={{fontSize:12}}>{item.purchaseDate}</td>
                      <td>
                        <div style={{display:'flex',gap:5}}>
                          <button className="si-tbl-edit-btn" onClick={() => onEdit(item, idx)}><FiEdit2 size={13}/></button>
                          <button className="si-tbl-del-btn" onClick={() => onDelete(idx)}><FiTrash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'#f8fafc',fontWeight:700}}>
                  <td colSpan="9" style={{textAlign:'right',padding:'12px 14px',color:'#475569'}}>Grand Total:</td>
                  <td style={{padding:'12px 14px',color:'#10b981',fontSize:16}}>₹{grandTotal.toFixed(2)}</td>
                  <td colSpan="5"/>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        {items.length > 0 && (
          <div className="si-list-actions">
            <button className="si-add-more-btn" onClick={onAddMore}><FiPlus size={13}/> Add More Items</button>
            <button className="si-submit-all-btn"
              onClick={() => setShowConfirm(true)}
              disabled={invalidCount > 0}
              style={invalidCount > 0 ? {opacity:0.5,cursor:'not-allowed'} : {}}>
              <FiCheckCircle size={14}/>
              {invalidCount > 0
                ? `Fix ${invalidCount} item${invalidCount > 1 ? 's' : ''} first`
                : `Confirm & Submit All (${items.length} items)`}
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="si-form-overlay" onClick={() => setShowConfirm(false)}>
          <div className="si-confirm-dialog" onClick={e => e.stopPropagation()}>
            <FiCheckCircle size={40} style={{color:'#10b981',marginBottom:12}}/>
            <h3>Confirm Submission</h3>
            <p>{items.length} item{items.length > 1 ? 's' : ''} · Total ₹{grandTotal.toFixed(2)}</p>
            <div className="si-confirm-dialog-actions">
              <button className="si-fp-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="si-fp-done"
                onClick={() => { setShowConfirm(false); onSubmit(); }} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN StockIn
// ══════════════════════════════════════════════════════════════
const StockIn = () => {
  const location = useLocation();
  const [view, setView]               = useState(VIEW.MAIN);
  const [detailProduct, setDetailProduct] = useState(null);

  const [products, setProducts]               = useState([]);
  const [stockedProducts, setStockedProducts] = useState([]);
  const [suppliers, setSuppliers]             = useState([]);
  const [racks, setRacks]                     = useState([]);
  const [categories, setCategories]           = useState([]);

  const [bulkItems, setBulkItems]       = useState([]);
  const [editingItem, setEditingItem]   = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [showRecent, setShowRecent]     = useState(false);
  const [formKey, setFormKey]           = useState(0);
  const [draftFound, setDraftFound]     = useState(null);
  const [submittedItems, setSubmittedItems] = useState([]);
  const [showSuccess, setShowSuccess]       = useState(false);

  const [recentItems, setRecentItems] = useState([
    { product: 'C1 - 10uF',   qty: 100, value: 250,  date: '2026-04-18' },
    { product: 'R1 - 10K',    qty: 200, value: 20,   date: '2026-04-17' },
    { product: 'IC1 - ESP32', qty: 10,  value: 1500, date: '2026-04-16' },
    { product: 'D1 - 1N4007', qty: 500, value: 5,    date: '2026-04-15' },
    { product: 'Q1 - BC547',  qty: 300, value: 8,    date: '2026-04-14' },
  ]);

  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [page, setPage]                     = useState(1);
  const SI_PAGE_SIZE = 15;

  const [persistedValues, setPersistedValues] = useState({
    supplierId: '', invoiceNumber: '', purchaseDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
    const draft = loadDraft();
    if (draft) setDraftFound(draft);
  }, []);

  useEffect(() => { setPage(1); }, [searchQuery, activeCategory]);

  useEffect(() => {
    if (location.state?.productId && products.length > 0) setView(VIEW.FORM);
  }, [products, location.state]);

  useEffect(() => {
    if (bulkItems.length > 0) saveDraftNow(bulkItems);
  }, [bulkItems]);

  const loadData = async () => {
    try {
      const [pRes, sRes, rRes, cRes, stockedRes] = await Promise.all([
        productApi.getActive(),
        supplierApi.getActive(),
        rackApi.getActive(),
        categoryApi.getActive(),
        stockApi.getStockedProducts(),
      ]);
      setProducts(pRes.data.data || []);
      setSuppliers(sRes.data.data || []);
      setRacks(rRes.data.data || []);
      setCategories(cRes.data.data || []);
      setStockedProducts(stockedRes.data.data || []);
    } catch { toast.error('Failed to load data'); }
  };

  const reloadStockedProducts = async () => {
    try {
      const res = await stockApi.getStockedProducts();
      setStockedProducts(res.data.data || []);
    } catch {}
  };

  // Category pills from stocked products
  const catList = useMemo(() => {
    const cats = new Set();
    stockedProducts.forEach(p => { if (p.categoryName) cats.add(p.categoryName); });
    return ['all', ...Array.from(cats)];
  }, [stockedProducts]);

  // Filtered + paginated stocked products
  const filtered = useMemo(() => {
    let list = stockedProducts;
    if (activeCategory !== 'all') list = list.filter(p => p.categoryName === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        [p.partNumber, p.description, p.packageType, p.categoryName]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [stockedProducts, searchQuery, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SI_PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * SI_PAGE_SIZE, safePage * SI_PAGE_SIZE);
  const goTo       = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const pageNums   = () => {
    const pages = []; let s = Math.max(1, safePage - 2), e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) pages.push(i);
    return pages;
  };

  // ── Handlers ─────────────────────────────────────────────────

  const handleSaveNext = (item) => {
    const updated = editingIndex !== null
      ? bulkItems.map((it, i) => i === editingIndex ? item : it)
      : [...bulkItems, item];
    setBulkItems(updated);
    setEditingItem(null); setEditingIndex(null);
    setPersistedValues({
      supplierId: item.supplierId || '',
      invoiceNumber: item.invoiceNumber || '',
      purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0],
    });
    setFormKey(k => k + 1);
    toast.success(editingIndex !== null ? 'Item updated' : `Added (${updated.length} items)`,
      { position: 'top-center', autoClose: 1200 });
  };

  const handleSaveDone = (item) => {
    const updated = editingIndex !== null
      ? bulkItems.map((it, i) => i === editingIndex ? item : it)
      : [...bulkItems, item];
    setBulkItems(updated);
    setEditingItem(null); setEditingIndex(null);
    setView(VIEW.REVIEW);
    toast.success('Review and submit!', { position: 'top-center' });
  };

  const handleDeleteCartItem = (idx) => {
    const updated = bulkItems.filter((_, i) => i !== idx);
    setBulkItems(updated);
    if (editingIndex === idx) { setEditingItem(null); setEditingIndex(null); setFormKey(k => k + 1); }
    toast.info('Item removed');
  };

  const handleEditCartItem = (item, idx) => {
    setEditingItem(item); setEditingIndex(idx);
    setFormKey(k => k + 1);
    if (view !== VIEW.FORM) setView(VIEW.FORM);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewCart = () => {
    if (bulkItems.length === 0) { toast.info('No items yet'); return; }
    setView(VIEW.REVIEW);
  };

  const handleRestoreDraft = () => {
    if (!draftFound) return;
    setBulkItems(draftFound.items || []);
    setDraftFound(null); clearDraft();
    toast.success(`Restored ${draftFound.items.length} item${draftFound.items.length > 1 ? 's' : ''}`,
      { position: 'top-center' });
  };

  const handleDiscardDraft = () => {
    setDraftFound(null); clearDraft();
    toast.info('Draft discarded');
  };

  const handleSubmit = async () => {
    // Validate all items
    const invalid = bulkItems.map((item, idx) => {
      const errors = [];
      if (!item.productId || item.productId === 0)                    errors.push('no product selected');
      if (!item.quantity   || parseFloat(item.quantity) <= 0)         errors.push('quantity is 0');
      if (!item.purchasePrice || parseFloat(item.purchasePrice) <= 0) errors.push('price is 0');
      if (!item.rackId || item.rackId === 0)                          errors.push('no rack selected');
      if (!item.boxId  || item.boxId  === 0)                          errors.push('no box selected');
      return errors.length > 0 ? { idx: idx + 1, errors } : null;
    }).filter(Boolean);

    if (invalid.length > 0) {
      toast.error(
        `Fix before submitting:\n${invalid.map(i => `Item #${i.idx}: ${i.errors.join(', ')}`).join('\n')}`,
        { position: 'top-center', autoClose: 5000, style: { whiteSpace: 'pre-line' } }
      );
      return;
    }

    setSubmitting(true);
    try {
      // Build payload — include hsnCode + gstPercent
      const buildPayload = (item) => ({
        productId:       parseInt(item.productId),
        supplierId:      item.supplierId ? parseInt(item.supplierId) : null,
        quantity:        parseFloat(item.quantity),
        purchasePrice:   parseFloat(item.purchasePrice),
        purchaseDate:    item.purchaseDate || new Date().toISOString().split('T')[0],
        rackId:          parseInt(item.rackId),
        boxId:           parseInt(item.boxId),
        referenceNumber: item.invoiceNumber || null,
        notes:           item.remarks       || null,
        // ── HSN / GST sent to backend ──────────────────────────
        hsnCode:         item.hsnCode    || null,
        gstPercent:      item.gstPercent ? parseFloat(item.gstPercent) : null,
        // ──────────────────────────────────────────────────────
      });

      if (bulkItems.length === 1) {
        await stockApi.stockIn(buildPayload(bulkItems[0]));
      } else {
        await stockApi.bulkStockIn({ items: bulkItems.map(buildPayload) });
      }

      setRecentItems(prev => [
        ...bulkItems.map(item => ({
          product: item.partNumberDisplay || item.descriptionDisplay,
          qty: item.quantity, value: (item.totalValue || 0).toFixed(2), date: item.purchaseDate,
        })),
        ...prev,
      ].slice(0, 10));

      toast.success(`🎉 ${bulkItems.length} item${bulkItems.length > 1 ? 's' : ''} added!`,
        { position: 'top-center' });

      setSubmittedItems(bulkItems);
      setShowSuccess(true);
      setBulkItems([]);
      clearDraft();
      await reloadStockedProducts();
      setView(VIEW.MAIN);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.errors
        ? Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join('\n')
        : data?.message || data?.error || 'Failed to add stock';
      toast.error(msg, { position: 'top-center', autoClose: 6000, style: { whiteSpace: 'pre-line' } });
    } finally { setSubmitting(false); }
  };

  const handleBomItemsReady = (importedItems) => {
    setBulkItems(prev => [...prev, ...importedItems]);
    setView(VIEW.REVIEW);
    toast.success(
      `${importedItems.length} BOM item${importedItems.length > 1 ? 's' : ''} imported — review before submitting`,
      { position: 'top-center' }
    );
  };

  const showFloating = view === VIEW.FORM || view === VIEW.MAIN || view === VIEW.DETAIL || view === VIEW.BOM;

  // ── RENDER ────────────────────────────────────────────────────
  let body = null;

  if (view === VIEW.BOM) {
    body = <BomImport onBack={() => setView(VIEW.MAIN)} onItemsReady={handleBomItemsReady}/>;

  } else if (view === VIEW.DETAIL) {
    body = (
      <DetailPage
        product={detailProduct}
        onBack={() => setView(VIEW.MAIN)}
        onAddStock={() => {
          setEditingItem({ productId: detailProduct.productId, categoryId: detailProduct.categoryId });
          setEditingIndex(null);
          setView(VIEW.FORM);
        }}
      />
    );

  } else if (view === VIEW.FORM) {
    body = (
      <StockFormPage
        key={formKey}
        products={products} suppliers={suppliers} racks={racks} categories={categories}
        editItem={editingItem} editingIndex={editingIndex}
        bulkItems={bulkItems} itemCount={bulkItems.length}
        persistedValues={persistedValues}
        onSaveNext={handleSaveNext}
        onSaveDone={handleSaveDone}
        onGoReview={handleReviewCart}
        onCancel={() => {
          setView(bulkItems.length > 0 ? VIEW.REVIEW : VIEW.MAIN);
          setEditingItem(null); setEditingIndex(null);
        }}
      />
    );

  } else if (view === VIEW.REVIEW) {
    body = (
      <ReviewPage
        items={bulkItems}
        onAddMore={() => { setEditingItem(null); setEditingIndex(null); setView(VIEW.FORM); }}
        onEdit={(item, idx) => { setEditingItem(item); setEditingIndex(idx); setView(VIEW.FORM); }}
        onDelete={(idx) => {
          const updated = bulkItems.filter((_, i) => i !== idx);
          setBulkItems(updated);
          if (updated.length === 0) setView(VIEW.MAIN);
          toast.info('Item removed');
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    );

  } 
  else
	 {
    // ── MAIN VIEW ─────────────────────────────────────────────
    body = (
      <div className="si-page">
        {draftFound && (
          <DraftBanner draft={draftFound} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft}/>
        )}

        <div className="si-header">
          <div className="si-header-left">
            <div className="si-header-icon"><FiShoppingCart size={20}/></div>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <p className="si-title">Stock IN</p>
                <button className="si-recent-btn" onClick={() => setShowRecent(true)}>
                  <FiTrendingUp size={13}/> Recent Additions
                </button>
              </div>
              <p className="si-subtitle">Inventory Management</p>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <button className="si-export-btn si-export-excel"
              onClick={() => exportStockedToExcel(filtered, `stocked-products-${Date.now()}.xlsx`)}
              disabled={!filtered.length}>
              <FiGrid size={13}/> Excel
            </button>
            <button className="si-export-btn si-export-pdf"
              onClick={() => exportStockedToPDF(filtered, `stocked-products-${Date.now()}.pdf`)}
              disabled={!filtered.length}>
              <FiFileText size={13}/> PDF
            </button>
            {bulkItems.length > 0 && (
              <button className="si-confirm-btn" onClick={() => setView(VIEW.REVIEW)}>
                <FiList size={14}/> Review {bulkItems.length}
              </button>
            )}
            <button className="si-add-new-btn" style={{background:'#7c3aed'}} onClick={() => setView(VIEW.BOM)}>
              <FiFileText size={14}/> BOM Import
            </button>
            <button className="si-add-new-btn"
              onClick={() => { setEditingItem(null); setEditingIndex(null); setView(VIEW.FORM); }}>
              <FiPlus size={14}/> Add New Stock
            </button>
          </div>
        </div>

        <div className="si-card">
          <div className="si-card-head">
            <FiPackage className="si-card-icon" size={15}/> Products with Stock
            <span className="si-card-count">{filtered.length} of {stockedProducts.length} stocked products</span>
          </div>

          {/* Search */}
          <div className="si-search-bar">
            <FiSearch className="si-search-icon" size={15}/>
            <input className="si-search-input" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search part#, description, category..."/>
            {searchQuery && (
              <button className="si-search-clear" onClick={() => setSearchQuery('')}><FiX size={14}/></button>
            )}
          </div>

          {/* Category pills */}
          <div className="si-cat-pills">
            {catList.map(cat => (
              <button key={cat} className={`si-pill ${activeCategory === cat ? 'si-pill-active' : ''}`}
                onClick={() => setActiveCategory(cat)}>
                {cat === 'all' ? 'All' : cat}
                {cat !== 'all' && (
                  <span className="si-pill-count">
                    {stockedProducts.filter(p => p.categoryName === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="si-product-table-wrap">
            {paged.length === 0 ? (
              <div className="si-empty">
                <FiSearch size={32}/>
                <span>{searchQuery ? `No results for "${searchQuery}"` : 'No stocked products yet.'}</span>
              </div>
            ) : (
              <table className="si-product-table">
                <thead>
                  <tr>
                    <th style={{width:40}}>#</th>
                    <th>Category</th><th>Part #</th><th>Description</th>
                    <th>Package</th><th>HSN</th><th>GST</th>
                    <th>Stock Qty</th><th>Price</th>
                    <th style={{width:190}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((product, idx) => (
                    <tr key={product.productId} className="si-product-row">
                      <td className="si-row-num">{(safePage - 1) * SI_PAGE_SIZE + idx + 1}</td>
                      <td>
                        {product.categoryName && <span className="si-cat-badge">{product.categoryName}</span>}
                      </td>
                      <td><span className="si-part-num">{product.partNumber || '—'}</span></td>
                      <td><span className="si-desc">{product.description || '—'}</span></td>
                      <td><span className="si-pkg">{product.packageType || '—'}</span></td>
                      {/* HSN column */}
                      <td>
                        {product.hsnCode
                          ? <span className="si-review-hsn">{product.hsnCode}</span>
                          : <span style={{color:'#cbd5e1'}}>—</span>}
                      </td>
                      {/* GST column */}
                      <td>
                        {product.gstPercent
                          ? <span className="si-review-gst">{product.gstPercent}%</span>
                          : <span style={{color:'#cbd5e1'}}>—</span>}
                      </td>
                      <td>
                        <span className={`si-stock-qty ${product.stockStatus === 'LOW_STOCK' ? 'si-stock-low' : ''}`}>
                          {product.totalStock?.toFixed ? product.totalStock.toFixed(0) : product.totalStock}
                          {product.stockStatus === 'LOW_STOCK' && <span className="si-low-badge">Low</span>}
                        </span>
                      </td>
                      <td><span className="si-price">₹{product.unitPrice?.toFixed(2) || '0.00'}</span></td>
                      <td>
                        <div style={{display:'flex',gap:5}}>
                          <button className="si-details-btn"
                            onClick={() => { setDetailProduct(product); setView(VIEW.DETAIL); }}>
                            <FiInfo size={13}/> Details
                          </button>
                          <button className="si-edit-row-btn"
                            onClick={() => {
                              setEditingItem({ productId: product.productId, categoryId: product.categoryId });
                              setEditingIndex(null);
                              setView(VIEW.FORM);
                            }}>
                            <FiEdit2 size={13}/> Add Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="si-pagination">
            <span className="si-pg-info">
              {filtered.length > 0
                ? `${(safePage - 1) * SI_PAGE_SIZE + 1}–${Math.min(safePage * SI_PAGE_SIZE, filtered.length)} of ${filtered.length}`
                : '0 products'}
            </span>
            <div className="si-pg-controls">
              <button className="si-pg-btn" onClick={() => goTo(1)} disabled={safePage === 1}><FiChevronsLeft size={13}/></button>
              <button className="si-pg-btn" onClick={() => goTo(safePage - 1)} disabled={safePage === 1}><FiChevronLeft size={13}/></button>
              {pageNums().map(p => (
                <button key={p} className={`si-pg-btn si-pg-num ${p === safePage ? 'si-pg-active' : ''}`}
                  onClick={() => goTo(p)}>{p}</button>
              ))}
              <button className="si-pg-btn" onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages}><FiChevronRight size={13}/></button>
              <button className="si-pg-btn" onClick={() => goTo(totalPages)} disabled={safePage === totalPages}><FiChevronsRight size={13}/></button>
            </div>
          </div>
        </div>

        {showRecent && <RecentPopup items={recentItems} onClose={() => setShowRecent(false)}/>}
      </div>
    );
  }

  return (
    <>
      {body}
      {showFloating && (
        <FloatingControls
          items={bulkItems}
          editingIndex={editingIndex}
          onReview={handleReviewCart}
          onEdit={handleEditCartItem}
          onDelete={handleDeleteCartItem}
          onDiscardDraft={() => {
            setBulkItems([]); clearDraft();
            setDraftFound(null); setEditingItem(null); setEditingIndex(null);
            toast.info('Draft discarded');
          }}
        />
      )}
      {showSuccess && (
        <SuccessDialog
          items={submittedItems}
          onClose={() => { setShowSuccess(false); setSubmittedItems([]); }}
        />
      )}
    </>
  );
};

export default StockIn;