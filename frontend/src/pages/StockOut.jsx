import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../api/stockApi';
import { toast } from 'react-toastify';
import {
  FiTrendingDown, FiSearch, FiX, FiCheck, FiRefreshCw,
  FiAlertTriangle, FiCheckCircle, FiShoppingCart, FiTrash2,
  FiPackage, FiMapPin, FiLayers,
  FiFilter, FiChevronLeft, FiChevronRight, FiChevronsLeft,
  FiChevronsRight, FiPlus, FiEdit2, FiSave, FiRotateCw,
  FiArrowLeft, FiBookOpen, FiZap, FiFileText, FiTruck,
} from 'react-icons/fi';
import './StockOut.css';

const fmt    = (v, d = 2) => parseFloat(v || 0).toFixed(d);
const fmtCur = (v) => parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TX_CFG = {
  Production:  { icon: '🏭', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', desc: 'Used in manufacturing' },
  Assembly:    { icon: '🔩', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', desc: 'Issued to assembly line' },
  Sale:        { icon: '💰', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', desc: 'Sold to customer'      },
  Semi_Finish: { icon: '🔧', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Semi-finished goods'   },
  Damage:      { icon: '⚠️', color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Damaged / unusable'    },
  Scrap:       { icon: '🗑️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', desc: 'Scrapped / disposed'   },
  Other:       { icon: '✏️', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', desc: 'Custom (type your own)' },
};

const txLabel = (item) => {
  if (item.transactionType === 'Semi_Finish') return 'Semi-Finish';
  if (item.transactionType === 'Other') return item.customType || 'Custom';
  return item.transactionType;
};

const typeOption = (t) => (t === 'Semi_Finish' ? 'Semi-Finish' : t === 'Other' ? 'Custom…' : t);

const DRAFT_KEY = 'so-cart-v3';
const saveDraft  = (cart) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ cart, savedAt: new Date().toISOString() })); } catch {} };
const loadDraft  = () => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };
const timeAgo    = (iso) => { if (!iso) return ''; const m = Math.floor((Date.now() - new Date(iso)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; return `${Math.floor(m/60)}h ago`; };

const HL = ({ text, q }) => {
  if (!q?.trim() || !text) return text;
  const rx = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(rx).map((p, i) => (i % 2 === 1 ? <mark key={i} className="so-hl">{p}</mark> : p));
};

/* ════════════════════════════════════════════════════
   INSTRUCTIONS PAGE
════════════════════════════════════════════════════ */
const InstructionsPage = ({ onClose }) => (
  <div className="so-ins-overlay">
    <div className="so-ins-panel">
      <div className="so-ins-header">
        <div className="so-ins-header-left">
          <div className="so-ins-icon"><FiBookOpen size={20} /></div>
          <div>
            <h2>Stock OUT — How It Works</h2>
            <p>Complete guide to issuing inventory</p>
          </div>
        </div>
        <button className="so-ins-close" onClick={onClose}><FiX size={16} /></button>
      </div>
      <div className="so-ins-body">
        <div className="so-ins-grid">
          <div className="so-ins-section">
            <div className="so-ins-step-num">01</div>
            <h3>Browse & Add to Cart</h3>
            <p>Browse the product table. Click <strong>+ Add</strong> on any row to add it to your issue cart, or <strong>DC</strong> to send it straight to a delivery challan.</p>
            <div className="so-ins-tip">💡 Added rows turn blue — click again to go to cart</div>
          </div>
          <div className="so-ins-section">
            <div className="so-ins-step-num">02</div>
            <h3>Fill In Details</h3>
            <p>Open the <strong>Cart page</strong>. Every field is directly editable — type the quantity, pick an issue type, and optionally add a reference and notes.</p>
            <div className="so-ins-tip">💡 Pick "Custom…" to type your own issue type</div>
          </div>
          <div className="so-ins-section">
            <div className="so-ins-step-num">03</div>
            <h3>Verify & Submit</h3>
            <p>Click <strong>Issue Stock</strong>. Review the confirmation summary. Stock is deducted using <strong>FIFO</strong> — oldest lot first.</p>
            <div className="so-ins-tip">💡 Issued by mistake? Use the "Just issued" panel to Edit or Cancel</div>
          </div>
          <div className="so-ins-section">
            <div className="so-ins-step-num">04</div>
            <h3>Delivery Challan</h3>
            <p>Click the <strong>DC</strong> button on a product, or <strong>Create Delivery Challan</strong> after issuing, to carry products into the challan page.</p>
            <div className="so-ins-tip">💡 Draft cart is auto-saved and restored on return</div>
          </div>
        </div>
        <div className="so-ins-tx-section">
          <h3>Transaction Types</h3>
          <div className="so-ins-tx-grid">
            {Object.entries(TX_CFG).map(([type, cfg]) => (
              <div key={type} className="so-ins-tx-card" style={{ background: cfg.bg, borderColor: cfg.border }}>
                <span className="so-ins-tx-icon">{cfg.icon}</span>
                <div>
                  <strong style={{ color: cfg.color }}>{type === 'Semi_Finish' ? 'Semi-Finish' : type}</strong>
                  <p>{cfg.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="so-ins-warn">
            <FiAlertTriangle size={14} />
            <span><strong>Damage & Scrap</strong> transactions automatically trigger a QC alert for the QC team and manager.</span>
          </div>
        </div>
        <div className="so-ins-fifo">
          <h3>FIFO — First In, First Out</h3>
          <div className="so-ins-fifo-grid">
            {[
              ['Oldest lot first', 'Stock received earliest is always deducted first — ensures correct inventory aging.'],
              ['Multi-lot spanning', 'If quantity exceeds one lot, deduction automatically spans to the next lot.'],
              ['Accurate costing', 'Each lot has its own purchase price — FIFO ensures correct cost of goods sold.'],
              ['Reversible', 'Issued by mistake? Edit or Cancel restores the exact lots that were deducted.'],
            ].map(([t, d]) => (
              <div key={t} className="so-ins-fifo-card">
                <FiZap size={13} style={{ color: '#4f46e5', flexShrink: 0, marginTop: 2 }} />
                <div><strong>{t}</strong><p>{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="so-ins-footer">
        <button className="so-btn-primary" onClick={onClose}><FiCheck size={14} /> Got it, let's go</button>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════
   CART FULL-SCREEN PAGE  — always-editable rows
════════════════════════════════════════════════════ */
const CartPage = ({ cart, setCart, onBack, onSubmit, submitting, products, onAddProduct }) => {
  const [expandedIdx, setExpandedIdx]   = useState(null);   // FIFO lot breakdown toggle
  const [stockData, setStockData]       = useState({});
  const [loadingStock, setLoadingStock] = useState({});
  const [addQuery, setAddQuery]         = useState('');     // ★ add-more-items search

  // Products matching the search that are NOT already in the cart
  const addMatches = useMemo(() => {
    if (!addQuery.trim()) return [];
    const q = addQuery.toLowerCase();
    return (products || [])
      .filter(p => !cart.some(c => c.productId === p.productId))
      .filter(p => [p.partNumber, p.description, p.categoryName, p.supplierName]
        .filter(Boolean).some(v => v.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [addQuery, products, cart]);

  useEffect(() => {
    cart.forEach(async (item) => {
      if (stockData[item.productId] || loadingStock[item.productId]) return;
      try {
        setLoadingStock(prev => ({ ...prev, [item.productId]: true }));
        const res = await stockApi.getCurrentStock(item.productId);
        setStockData(prev => ({ ...prev, [item.productId]: res.data.data }));
      } catch {} finally {
        setLoadingStock(prev => ({ ...prev, [item.productId]: false }));
      }
    });
  }, [cart]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCart = (idx, field, value) => {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeFromCart = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
  };

  const itemReady = (item) => {
    const qty = parseFloat(item.quantity);
    const typeOk = item.transactionType !== 'Other' || (item.customType && item.customType.trim());
    return qty > 0 && qty <= item.maxStock && typeOk;
  };

  const cartValid  = cart.length > 0 && cart.every(itemReady);
  const totalQty   = cart.reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalItems = cart.length;
  const readyItems = cart.filter(itemReady).length;

  const handleSubmit = () => {
    if (!cartValid) {
      const missing  = cart.filter(i => !i.quantity || parseFloat(i.quantity) <= 0);
      const over     = cart.filter(i => parseFloat(i.quantity) > i.maxStock);
      const noCustom = cart.filter(i => i.transactionType === 'Other' && (!i.customType || !i.customType.trim()));
      if (missing.length > 0)       toast.error(`${missing.length} item(s) missing quantity`);
      else if (over.length > 0)     toast.error(`${over.length} item(s) exceed available stock`);
      else if (noCustom.length > 0) toast.error(`${noCustom.length} item(s) need a custom type label`);
      return;
    }
    onSubmit();
  };

  return (
    <div className="so-cart-page">
      <div className="so-hero so-animate-in">
        <button className="so-back-btn" onClick={onBack}><FiArrowLeft size={15} /> Back to Products</button>
        <div className="so-hero-content">
          <div className="so-hero-icon"><FiShoppingCart size={20} /></div>
          <div>
            <h1 className="so-hero-title">Issue Cart</h1>
            <p className="so-hero-sub">
              <span className="so-hero-count">{totalItems}</span> product{totalItems !== 1 ? 's' : ''} ·&nbsp;
              <span className="so-hero-count">{readyItems}</span> ready · {fmt(totalQty, 0)} total units
            </p>
          </div>
        </div>
        <div className="so-hero-actions">
          <button className="so-btn-danger-outline"
            onClick={() => { if (window.confirm('Clear all items from cart?')) { setCart([]); clearDraft(); onBack(); } }}>
            <FiTrash2 size={13} /> Clear Cart
          </button>
          <button className="so-btn-primary-hero" onClick={handleSubmit} disabled={!cartValid || submitting}>
            {submitting
              ? <><FiRefreshCw className="so-spin" size={14} /> Processing…</>
              : <><FiTrendingDown size={14} /> Issue {totalItems} Item{totalItems !== 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>

      <div className="so-cart-progress">
        <div className="so-cp-bar">
          <div className="so-cp-fill" style={{ width: `${totalItems > 0 ? (readyItems / totalItems) * 100 : 0}%` }} />
        </div>
        <span className="so-cp-label">{readyItems}/{totalItems} items ready to issue</span>
      </div>

      {/* ★ ADD MORE ITEMS — search & add without leaving the cart */}
      <div className="so-cart-add so-animate-in">
        <div className="so-cart-add-bar">
          <FiPlus size={14} className="so-cart-add-plus" />
          <input
            className="so-cart-add-input"
            value={addQuery}
            onChange={e => setAddQuery(e.target.value)}
            placeholder="Add more items — search part number, description, supplier…"
          />
          {addQuery && (
            <button className="so-search-clear" onClick={() => setAddQuery('')}><FiX size={12} /></button>
          )}
        </div>
        {addQuery.trim() && (
          <div className="so-cart-add-results">
            {addMatches.length === 0 ? (
              <div className="so-cart-add-empty">
                No matching products{cart.length > 0 ? ' (items already in cart are hidden)' : ''}
              </div>
            ) : addMatches.map(p => (
              <button key={p.productId} className="so-cart-add-row"
                onClick={() => { onAddProduct(p); setAddQuery(''); }}>
                <span className="so-mono" style={{ fontSize: 11 }}>{p.partNumber || '—'}</span>
                <span className="so-cart-add-desc">{p.description || '—'}</span>
                {p.supplierName && <span className="so-supplier">{p.supplierName}</span>}
                <span className={`so-stock-val ${p.stockStatus === 'LOW_STOCK' ? 'low' : 'ok'}`} style={{ marginLeft: 'auto' }}>
                  {fmt(p.totalStock, 0)} in stock
                </span>
                <span className="so-cart-add-cta"><FiPlus size={11} /> Add</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="so-empty" style={{ padding: '80px 20px' }}>
          <FiShoppingCart size={40} />
          <span>Cart is empty — search above to add items, or go back to the product table</span>
          <button className="so-btn-primary" onClick={onBack}><FiArrowLeft size={13} /> Back to Products</button>
        </div>
      ) : (
        <div className="so-card so-animate-in">
          <table className="so-table so-cart-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>PART NO.</th>
                <th>DESCRIPTION</th>
                <th>SUPPLIER</th>
                <th>CATEGORY</th>
                <th>AVAIL.</th>
                <th>UNIT PRICE</th>
                <th>LOTS</th>
                <th>QTY TO ISSUE</th>
                <th>ISSUE TYPE</th>
                <th>REFERENCE</th>
                <th>NOTES</th>
                <th>LINE TOTAL</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACT.</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => {
                const stock      = stockData[item.productId];
                const qty        = parseFloat(item.quantity || 0);
                const isOver     = qty > item.maxStock;
                const isReady    = itemReady(item);
                const cfg        = TX_CFG[item.transactionType] || TX_CFG.Production;
                const lineTotal  = qty * parseFloat(item.unitPrice || 0);
                const isExpanded = expandedIdx === idx;

                return (
                  <Fragment key={item.productId}>
                    <tr className={`so-row so-cart-row ${isOver ? 'so-row-err' : isReady ? 'so-row-ready' : ''}`}>
                      <td className="so-num">{idx + 1}</td>
                      <td><span className="so-mono">{item.partNumber || '—'}</span></td>
                      <td><span className="so-truncate" title={item.description}>{item.description || '—'}</span></td>
                      <td>
                        {item.supplierName
                          ? <span className="so-supplier"><FiTruck size={10} /> {item.supplierName}</span>
                          : <span className="so-faded">—</span>}
                      </td>
                      <td>{item.categoryName ? <span className="so-chip">{item.categoryName}</span> : <span className="so-faded">—</span>}</td>
                      <td>
                        <span className={`so-stock-val ${item.maxStock <= 0 ? 'low' : 'ok'}`}>
                          {fmt(item.maxStock, 0)}
                        </span>
                      </td>
                      <td className="so-faded">
                        {item.unitPrice != null ? `₹${fmtCur(item.unitPrice)}` : '—'}
                      </td>

                      {/* LOTS — click to expand FIFO breakdown */}
                      <td>
                        {loadingStock[item.productId]
                          ? <FiRefreshCw size={11} className="so-spin" style={{ color: '#94a3b8' }} />
                          : (
                            <button
                              className={`so-lots-toggle ${isExpanded ? 'open' : ''}`}
                              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                              title={isExpanded ? 'Hide lot breakdown' : 'Show FIFO lot breakdown'}>
                              <FiLayers size={11} /> {stock?.lots?.length ?? '—'}
                            </button>
                          )}
                      </td>

                      {/* QTY — always editable */}
                      <td>
                        <input type="number" step="0.01" min="0.01" max={item.maxStock}
                          value={item.quantity}
                          onChange={e => updateCart(idx, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className={`so-cell-input so-cell-qty ${isOver ? 'err' : isReady ? 'ok' : ''}`} />
                        {isOver && <div className="so-inline-err">Max: {fmt(item.maxStock)}</div>}
                      </td>

                      {/* ISSUE TYPE — always editable */}
                      <td>
                        <select className="so-cell-select"
                          style={{ borderColor: cfg.border, background: cfg.bg, color: cfg.color }}
                          value={item.transactionType}
                          onChange={e => updateCart(idx, 'transactionType', e.target.value)}>
                          {Object.keys(TX_CFG).map(t => (
                            <option key={t} value={t}>{typeOption(t)}</option>
                          ))}
                        </select>
                        {item.transactionType === 'Other' && (
                          <input type="text" value={item.customType || ''}
                            onChange={e => updateCart(idx, 'customType', e.target.value)}
                            placeholder="Custom type…"
                            className={`so-cell-input ${!item.customType?.trim() ? 'err' : ''}`}
                            style={{ marginTop: 4 }} />
                        )}
                      </td>

                      {/* REFERENCE — always editable */}
                      <td>
                        <input type="text" value={item.referenceNumber}
                          onChange={e => updateCart(idx, 'referenceNumber', e.target.value)}
                          placeholder="WO-001…" className="so-cell-input so-cell-ref" />
                      </td>

                      {/* NOTES — always editable */}
                      <td>
                        <input type="text" value={item.notes}
                          onChange={e => updateCart(idx, 'notes', e.target.value)}
                          placeholder="Notes…" className="so-cell-input so-cell-notes" />
                      </td>

                      <td>
                        <span style={{ font: '700 12px JetBrains Mono, monospace', color: isReady ? '#059669' : '#94a3b8' }}>
                          {isReady && item.unitPrice ? `₹${fmtCur(lineTotal)}` : '—'}
                        </span>
                      </td>

                      <td>
                        {isOver
                          ? <span className="so-status-pill err">⚠ Exceeds</span>
                          : isReady
                            ? <span className="so-status-pill ok">✓ Ready</span>
                            : <span className="so-status-pill empty">● Set qty</span>}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button className="so-action-btn del" onClick={() => removeFromCart(idx)} title="Remove from cart">
                          <FiTrash2 size={12} />
                        </button>
                      </td>
                    </tr>

                    {isExpanded && stock?.lots?.length > 0 && (
                      <tr className="so-lot-row">
                        <td colSpan={15}>
                          <div className="so-lot-detail">
                            <div className="so-lot-title"><FiLayers size={12} /> FIFO Lot Breakdown — {item.partNumber}</div>
                            <table className="so-lots-mini">
                              <thead>
                                <tr><th>#</th><th>Lot Number</th><th>Remaining Qty</th><th>Purchase Price</th><th>Purchase Date</th><th>Share</th></tr>
                              </thead>
                              <tbody>
                                {stock.lots.map((lot, i) => {
                                  const pct = Math.min(100, (parseFloat(lot.remainingQuantity || 0) / parseFloat(stock.totalStock || 1)) * 100);
                                  return (
                                    <tr key={lot.lotId}>
                                      <td className="so-n">#{i+1}</td>
                                      <td className="so-mono-sm">{lot.lotNumber}</td>
                                      <td style={{ font:'700 11px JetBrains Mono,monospace', color:'#4f46e5' }}>{fmt(lot.remainingQuantity)}</td>
                                      <td style={{ color:'#059669', fontWeight:700 }}>₹{fmtCur(lot.purchasePrice)}</td>
                                      <td style={{ color:'#94a3b8', fontSize:11 }}>{lot.purchaseDate ? new Date(lot.purchaseDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                                      <td>
                                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                                          <div style={{ flex:1,height:5,background:'#e2e8f0',borderRadius:3,overflow:'hidden',minWidth:60 }}>
                                            <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#4f46e5,#7c3aed)',borderRadius:3,transition:'width 0.4s' }} />
                                          </div>
                                          <span style={{ fontSize:10,color:'#94a3b8',fontWeight:600 }}>{pct.toFixed(0)}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {(item.transactionType === 'Damage' || item.transactionType === 'Scrap') && (
                              <div className="so-lot-qc-warn">
                                <FiAlertTriangle size={12} /> QC alert will be automatically sent for {item.transactionType} transactions
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            {cart.length > 0 && (
              <tfoot>
                <tr className="so-cart-total-row">
                  <td colSpan={8} style={{ textAlign:'right', fontWeight:700, color:'#64748b', fontSize:12 }}>TOTALS</td>
                  <td><span style={{ font:'800 13px JetBrains Mono,monospace', color:'#4f46e5' }}>{fmt(totalQty, 0)} units</span></td>
                  <td colSpan={3}></td>
                  <td>
                    <span style={{ font:'800 13px JetBrains Mono,monospace', color:'#059669' }}>
                      {cart.some(i => i.unitPrice) ? `₹${fmtCur(cart.reduce((s,i) => s + (parseFloat(i.quantity||0) * parseFloat(i.unitPrice||0)), 0))}` : '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ font:'700 11px Inter,sans-serif', color: readyItems === totalItems ? '#059669' : '#f59e0b' }}>
                      {readyItems}/{totalItems} ready
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>

          <div className="so-cart-action-bar">
            <div className="so-cab-left">
              <span className="so-cab-info">
                {!cartValid && cart.length > 0 && (
                  <span className="so-cab-warn">
                    <FiAlertTriangle size={12} /> Some items need quantity, custom type, or exceed stock
                  </span>
                )}
                {cartValid && <span style={{ color:'#059669', display:'flex', alignItems:'center', gap:5 }}><FiCheckCircle size={12} /> All items ready to issue</span>}
              </span>
            </div>
            <div className="so-cab-right">
              <button className="so-btn-ghost" onClick={onBack}><FiArrowLeft size={12} /> Back</button>
              <button className="so-btn-primary-hero" onClick={handleSubmit} disabled={!cartValid || submitting}>
                {submitting
                  ? <><FiRefreshCw className="so-spin" size={14} /> Processing…</>
                  : <><FiTrendingDown size={14} /> Issue {totalItems} Item{totalItems !== 1 ? 's' : ''} — {fmt(totalQty, 0)} units</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════
   CONFIRM MODAL
════════════════════════════════════════════════════ */
const ConfirmModal = ({ cart, onConfirm, onCancel, loading }) => {
  const totalQty = cart.reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalVal = cart.reduce((s, i) => s + (parseFloat(i.quantity||0) * parseFloat(i.unitPrice||0)), 0);
  return (
    <div className="so-overlay" onClick={onCancel}>
      <div className="so-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="so-confirm-icon"><FiTrendingDown size={26} /></div>
        <h2>Confirm Stock Issue</h2>
        <p className="so-confirm-sub">{cart.length} products · {fmt(totalQty, 0)} units total</p>
        <div className="so-confirm-table">
          {cart.map((item, i) => {
            const cfg = TX_CFG[item.transactionType] || TX_CFG.Production;
            return (
              <div key={i} className="so-confirm-row">
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span className="so-mono" style={{ fontSize:11 }}>{item.partNumber}</span>
                  <span style={{ fontSize:10, color:'#94a3b8' }}>{item.description?.slice(0,40)}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                  <span style={{ font:'700 12px JetBrains Mono,monospace', color:'#4f46e5' }}>{item.quantity} units</span>
                  <span style={{ padding:'2px 7px', background:cfg.bg, color:cfg.color, borderRadius:4, fontSize:10, fontWeight:700 }}>
                    {cfg.icon} {txLabel(item)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {totalVal > 0 && (
          <div className="so-confirm-total">
            Total Value: <strong>₹{fmtCur(totalVal)}</strong>
          </div>
        )}
        <div className="so-confirm-note"><FiAlertTriangle size={11} /> FIFO deduction · you can Edit or Cancel right after issuing</div>
        <div className="so-confirm-actions">
          <button className="so-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="so-btn-issue" onClick={onConfirm} disabled={loading}
            style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            {loading ? <><FiRefreshCw className="so-spin" size={13} /> Processing…</> : <><FiCheck size={13} /> Confirm & Issue All</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════
   EDIT ISSUE MODAL  (reverse + re-issue)
════════════════════════════════════════════════════ */
const EditIssueModal = ({ issue, onConfirm, onCancel, loading }) => {
  const [form, setForm] = useState({
    quantity: issue.quantity,
    transactionType: issue.transactionType,
    customType: issue.customType || '',
    referenceNumber: issue.referenceNumber || '',
    notes: issue.notes || '',
  });
  const [liveMax, setLiveMax] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await stockApi.getCurrentStock(issue.productId);
        if (!cancelled) setLiveMax(parseFloat(res.data.data?.totalStock || 0));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [issue.productId]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const qty = parseFloat(form.quantity);
  const effectiveMax = liveMax != null ? liveMax + parseFloat(issue.quantity || 0) : null;
  const isOver = effectiveMax != null && qty > effectiveMax;
  const typeOk = form.transactionType !== 'Other' || (form.customType && form.customType.trim());
  const valid = qty > 0 && !isOver && typeOk;

  return (
    <div className="so-overlay" onClick={onCancel}>
      <div className="so-confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="so-confirm-icon" style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)' }}>
          <FiEdit2 size={24} />
        </div>
        <h2>Edit Issued Stock</h2>
        <p className="so-confirm-sub">
          <span className="so-mono">{issue.partNumber}</span> — reverses the original, then re-issues with new values
        </p>

        <div style={{ textAlign: 'left', marginTop: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', margin: '8px 0 4px' }}>
            Quantity {effectiveMax != null && <span style={{ color: '#94a3b8', fontWeight: 500 }}>(max {fmt(effectiveMax)})</span>}
          </label>
          <input type="number" step="0.01" min="0.01" value={form.quantity}
            onChange={e => set('quantity', e.target.value)}
            className={`so-cell-input ${isOver ? 'err' : ''}`} style={{ width: '100%' }} autoFocus />
          {isOver && <span className="so-inline-err">Exceeds available stock ({fmt(effectiveMax)})</span>}

          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', margin: '10px 0 4px' }}>Issue Type</label>
          <select value={form.transactionType} onChange={e => set('transactionType', e.target.value)}
            className="so-cell-select" style={{ width: '100%' }}>
            {Object.keys(TX_CFG).map(t => (
              <option key={t} value={t}>{typeOption(t)}</option>
            ))}
          </select>
          {form.transactionType === 'Other' && (
            <input type="text" value={form.customType}
              onChange={e => set('customType', e.target.value)}
              placeholder="Custom type…"
              className={`so-cell-input ${!form.customType?.trim() ? 'err' : ''}`}
              style={{ width: '100%', marginTop: 4 }} />
          )}

          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', margin: '10px 0 4px' }}>Reference</label>
          <input type="text" value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)}
            placeholder="WO-001…" className="so-cell-input" style={{ width: '100%' }} />

          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', margin: '10px 0 4px' }}>Notes</label>
          <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Notes…" className="so-cell-input" style={{ width: '100%' }} />
        </div>

        <div className="so-confirm-note"><FiAlertTriangle size={11} /> Original lots are restored, then FIFO re-runs with the new quantity</div>
        <div className="so-confirm-actions">
          <button className="so-btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="so-btn-issue" onClick={() => onConfirm(form)} disabled={!valid || loading}>
            {loading ? <><FiRefreshCw className="so-spin" size={13} /> Saving…</> : <><FiCheck size={13} /> Reverse & Re-issue</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
const StockOut = () => {
  const navigate = useNavigate();

  const [view, setView]               = useState('products');
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [page, setPage]               = useState(1);
  const [cart, setCart]               = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [draftFound, setDraftFound]   = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  const [recentIssues, setRecentIssues]   = useState([]);
  const [editTarget, setEditTarget]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const PAGE_SIZE = 10;

  // ★ change this to your actual Delivery Challan route path
  const CHALLAN_ROUTE = '/delivery-challan';

  useEffect(() => {
    const d = loadDraft();
    if (d?.cart?.length > 0) setDraftFound(d);
  }, []);

  useEffect(() => {
    if (cart.length > 0) { saveDraft(cart); setDraftSavedAt(new Date().toISOString()); }
  }, [cart]);

  const loadProducts = useCallback(async () => {
    try { setLoading(true); const res = await stockApi.getStockedProducts(); setProducts(res.data.data || []); }
    catch { toast.error('Failed to load products'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setPage(1); }, [searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const s = new Set(); products.forEach(p => { if (p.categoryName) s.add(p.categoryName); }); return ['all', ...Array.from(s)];
  }, [products]);

  const filtered = useMemo(() => {
    let f = products;
    if (activeCategory !== 'all') f = f.filter(p => p.categoryName === activeCategory);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); f = f.filter(p => [p.partNumber, p.description, p.categoryName, p.rackName, p.supplierName].filter(Boolean).some(v => v.toLowerCase().includes(q))); }
    return f;
  }, [products, searchQuery, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const goTo       = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const pageNums   = () => { let s = Math.max(1,safePage-2),e=Math.min(totalPages,s+4); if(e-s<4)s=Math.max(1,e-4); const a=[];for(let i=s;i<=e;i++)a.push(i);return a; };

  const inCart  = (productId) => cart.find(c => c.productId === productId);
  const addToCart = (product) => {
    if (inCart(product.productId)) { toast.info('Already in cart — open cart to edit'); return; }
    setCart(prev => [...prev, {
      productId: product.productId, partNumber: product.partNumber || '—',
      description: product.description || '', categoryName: product.categoryName || '',
      supplierName: product.supplierName || '',                       // ★ supplier now carried into the cart
      rackName: product.rackName || '', boxLabel: product.boxLabel || '',
      maxStock: parseFloat(product.totalStock || 0), unitPrice: product.unitPrice,
      quantity: '', transactionType: 'Production', customType: '', referenceNumber: '', notes: '',
    }]);
    toast.success(`Added: ${product.partNumber || product.description}`, { autoClose: 1000 });
  };

  const buildPayload = (item) => {
    const isCustom = item.transactionType === 'Other';
    const notes = isCustom
      ? `[${(item.customType || 'Custom').trim()}] ${item.notes || ''}`.trim()
      : item.notes;
    return {
      productId: parseInt(item.productId),
      quantity: parseFloat(item.quantity),
      transactionType: item.transactionType,
      referenceNumber: item.referenceNumber,
      notes,
    };
  };

  const confirmSubmit = async () => {
    setSubmitting(true); setShowConfirm(false);
    let failed = 0;
    const issued = [];
    for (const item of cart) {
      try {
        const res = await stockApi.stockOut(buildPayload(item));
        issued.push({
          groupId: res.data.data,
          productId: item.productId,
          partNumber: item.partNumber,
          description: item.description,
          categoryName: item.categoryName,
          supplierName: item.supplierName,                            // ★ carried through
          quantity: item.quantity,
          transactionType: item.transactionType,
          customType: item.customType,
          referenceNumber: item.referenceNumber,
          notes: item.notes,
          maxStock: item.maxStock,
          unitPrice: item.unitPrice,
          rackName: item.rackName,
          boxLabel: item.boxLabel,
          reversed: false,
        });
      } catch { failed++; toast.error(`Failed: ${item.partNumber}`); }
    }
    if (failed === 0) {
      toast.success(`${cart.length} item${cart.length>1?'s':''} issued successfully!`, { position: 'top-center' });
      setRecentIssues(issued);
      setCart([]); clearDraft(); setDraftSavedAt(null); setView('products'); loadProducts();
    }
    setSubmitting(false);
  };

  const cancelIssue = async (groupId) => {
    if (!window.confirm('Reverse this stock issue and restore the stock?')) return;
    setActionLoading(true);
    try {
      await stockApi.cancelStockOut(groupId, 'Cancelled right after issue');
      toast.success('Reversed — stock restored');
      setRecentIssues(prev => prev.map(r => r.groupId === groupId ? { ...r, reversed: true } : r));
      loadProducts();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to reverse');
    } finally { setActionLoading(false); }
  };

  const submitEdit = async (form) => {
    if (!editTarget) return;
    setActionLoading(true);
    try {
      const payload = buildPayload({ ...editTarget, ...form });
      const res = await stockApi.editStockOut(editTarget.groupId, payload);
      const newGroupId = res.data.data;
      toast.success('Stock issue edited');
      setRecentIssues(prev => prev.map(r => r.groupId === editTarget.groupId
        ? { ...r, groupId: newGroupId, quantity: form.quantity, transactionType: form.transactionType,
            customType: form.customType, referenceNumber: form.referenceNumber, notes: form.notes }
        : r));
      setEditTarget(null);
      loadProducts();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to edit');
    } finally { setActionLoading(false); }
  };

  // carry the issued products into the Delivery Challan page
  const createChallan = () => {
    const items = recentIssues.filter(r => !r.reversed).map(r => ({
      productId: r.productId,
      partNumber: r.partNumber,
      description: r.description,
      categoryName: r.categoryName,
      supplierName: r.supplierName || null,                           // ★ supplier goes to the challan too
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      referenceNumber: r.referenceNumber,
    }));
    if (items.length === 0) { toast.info('No active issued items to put on a challan'); return; }
    navigate(CHALLAN_ROUTE, { state: { items, source: 'stock-out' } });
  };

  // open a blank Delivery Challan (header button)
  const openChallan = () => navigate(CHALLAN_ROUTE);

  // send a single product straight to the Delivery Challan page (per-row DC button)
  const sendToChallan = (product) => {
    const items = [{
      productId: product.productId,
      partNumber: product.partNumber,
      description: product.description,
      categoryName: product.categoryName,
      quantity: '1',
      unitPrice: product.unitPrice,
      referenceNumber: '',
      supplierId: product.supplierId || null,
      supplierName: product.supplierName || null,
    }];
    navigate(CHALLAN_ROUTE, { state: { items, source: 'stock-out-direct' } });
  };

  if (view === 'instructions') return <InstructionsPage onClose={() => setView('products')} />;

  if (view === 'cart') return (
    <>
      <CartPage cart={cart} setCart={setCart} onBack={() => setView('products')} onSubmit={() => setShowConfirm(true)} submitting={submitting}
        products={products} onAddProduct={addToCart} />
      {showConfirm && <ConfirmModal cart={cart} onConfirm={confirmSubmit} onCancel={() => setShowConfirm(false)} loading={submitting} />}
    </>
  );

  return (
    <div className="so-page">
      {/* Hero */}
      <div className="so-hero so-animate-in">
        <div className="so-hero-content">
          <div className="so-hero-icon"><FiTrendingDown size={20} /></div>
          <div>
            <h1 className="so-hero-title">Stock OUT</h1>
            <p className="so-hero-sub"><span className="so-hero-count">{products.length}</span> products · FIFO auto-applied</p>
          </div>
        </div>
        <div className="so-hero-actions">
          {draftSavedAt && cart.length > 0 && (
            <span className="so-draft-chip"><FiSave size={11} /> Saved {timeAgo(draftSavedAt)}</span>
          )}
          <button className="so-ins-btn" onClick={openChallan}
            style={{ borderColor: '#c7d2fe', color: '#4f46e5' }}>
            <FiFileText size={13} /> Delivery Challan
          </button>
          <button className="so-ins-btn" onClick={() => setView('instructions')}><FiBookOpen size={13} /> Instructions</button>
          <button className={`so-cart-btn ${cart.length > 0 ? 'active' : ''}`} onClick={() => setView('cart')}>
            <FiShoppingCart size={15} /> Cart
            {cart.length > 0 && <span className="so-cart-count">{cart.length}</span>}
          </button>
          <button className="so-icon-btn" onClick={loadProducts} disabled={loading} title="Refresh">
            <FiRefreshCw size={14} className={loading ? 'so-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Draft banner */}
      {draftFound && (
        <div className="so-draft-banner so-animate-in">
          <div className="so-draft-icon"><FiRotateCw size={15} /></div>
          <div className="so-draft-info">
            <div className="so-draft-title">Draft found — {draftFound.cart.length} item{draftFound.cart.length>1?'s':''} saved</div>
            <div className="so-draft-sub">Saved {timeAgo(draftFound.savedAt)}</div>
          </div>
          <button className="so-draft-restore" onClick={() => { setCart(draftFound.cart); setDraftFound(null); setView('cart'); toast.success('Draft restored!'); }}>
            <FiRotateCw size={12} /> Restore & Review
          </button>
          <button className="so-draft-discard" onClick={() => { clearDraft(); setDraftFound(null); }}><FiX size={12} /> Discard</button>
        </div>
      )}

      {/* Recently issued — edit / cancel + create challan */}
      {recentIssues.length > 0 && (
        <div className="so-draft-banner so-animate-in" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="so-draft-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <FiCheckCircle size={15} />
            </div>
            <div className="so-draft-info">
              <div className="so-draft-title">Just issued — {recentIssues.length} transaction{recentIssues.length>1?'s':''}</div>
              <div className="so-draft-sub">Made a mistake? Edit or Cancel below. Or create a delivery challan.</div>
            </div>
            <button
              onClick={createChallan}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', background: 'linear-gradient(135deg,#4f46e5,#4338ca)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <FiFileText size={13} /> Create Delivery Challan
            </button>
            <button className="so-draft-discard" onClick={() => setRecentIssues([])}>
              <FiX size={12} /> Dismiss
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentIssues.map((r) => {
              const cfg = TX_CFG[r.transactionType] || TX_CFG.Production;
              const label = r.transactionType === 'Semi_Finish' ? 'Semi-Finish'
                : r.transactionType === 'Other' ? (r.customType || 'Custom') : r.transactionType;
              return (
                <div key={r.groupId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: r.reversed ? '#f8fafc' : '#fff',
                    border: '1px solid #e2e8f0', borderRadius: 8,
                    opacity: r.reversed ? 0.55 : 1,
                  }}>
                  <span className="so-mono" style={{ fontSize: 12, color: '#4f46e5',
                    textDecoration: r.reversed ? 'line-through' : 'none' }}>{r.partNumber}</span>
                  <span style={{ fontSize: 11, color: '#64748b', flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description || '—'}
                  </span>
                  <span style={{ font: '700 12px JetBrains Mono,monospace', color: '#0f172a' }}>{r.quantity} units</span>
                  <span style={{ padding: '2px 8px', background: cfg.bg, color: cfg.color,
                    borderRadius: 5, fontSize: 10, fontWeight: 700 }}>{cfg.icon} {label}</span>

                  {r.reversed ? (
                    <span style={{ padding: '3px 9px', background: '#f1f5f9', color: '#94a3b8',
                      borderRadius: 5, fontSize: 10, fontWeight: 700 }}>Reversed</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="so-action-btn edit" disabled={actionLoading}
                        onClick={() => setEditTarget(r)} title="Edit (reverse + re-issue)">
                        <FiEdit2 size={12} /> Edit
                      </button>
                      <button className="so-action-btn del" disabled={actionLoading}
                        onClick={() => cancelIssue(r.groupId)} title="Cancel (reverse)">
                        <FiRotateCw size={12} /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="so-stats-grid so-animate-in" style={{ animationDelay:'60ms' }}>
        {[
          { label:'Total Products', value:products.length,                                        color:'#4f46e5' },
          { label:'Low Stock',      value:products.filter(p=>p.stockStatus==='LOW_STOCK').length,  color:'#f59e0b' },
          { label:'Categories',     value:categories.length-1,                                    color:'#10b981' },
          { label:'In Cart',        value:cart.length,                                             color:'#ef4444' },
        ].map((s,i) => (
          <div key={s.label} className="so-stat-card"
            onClick={s.label==='In Cart' && cart.length>0 ? () => setView('cart') : undefined}
            style={{ '--c':s.color, animationDelay:`${i*50}ms`, cursor: s.label==='In Cart' && cart.length>0 ? 'pointer':undefined }}>
            <div className="so-stat-label"><span className="so-stat-dot" />{s.label}</div>
            <div className="so-stat-num">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Product table */}
      <div className="so-card so-animate-in" style={{ animationDelay:'100ms' }}>
        <div className="so-card-search">
          <FiSearch size={14} className="so-search-icon" />
          <input className="so-search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search part number, description, category, supplier…" />
          {searchQuery && <button className="so-search-clear" onClick={() => setSearchQuery('')}><FiX size={12} /></button>}
        </div>
        <div className="so-cat-pills">
          {categories.map(c => (
            <button key={c} className={`so-cat-pill ${activeCategory===c?'so-cat-active':''}`} onClick={() => setActiveCategory(c)}>
              {c==='all'?'All':c}
              {c!=='all' && <span className="so-cat-count">{products.filter(p=>p.categoryName===c).length}</span>}
            </button>
          ))}
        </div>
        <div className="so-list-head">
          <FiFilter size={11} style={{ color:'#94a3b8' }} />
          <span className="so-list-meta">{filtered.length} products</span>
          {searchQuery && <span className="so-list-query">for "<b>{searchQuery}</b>"</span>}
          {cart.length > 0 && (
            <button className="so-view-cart-link" onClick={() => setView('cart')}>
              <FiShoppingCart size={11} /> {cart.length} in cart — click to review
            </button>
          )}
        </div>
        <div className="so-table-wrap">
          {loading ? (
            <div className="so-empty"><FiRefreshCw size={30} className="so-spin" /></div>
          ) : paged.length === 0 ? (
            <div className="so-empty"><FiPackage size={34} /><span>{searchQuery ? `No results for "${searchQuery}"` : 'No products'}</span></div>
          ) : (
            <table className="so-table">
              <thead>
                <tr>
                  <th>#</th><th>PART NO.</th><th>DESCRIPTION</th><th>SUPPLIER</th><th>CATEGORY</th>
                  <th>LOCATION</th><th>STOCK</th><th>UNIT PRICE</th><th>STATUS</th>
                  <th style={{ textAlign:'center' }}>ADD TO CART</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p, idx) => {
                  const isLow = p.stockStatus === 'LOW_STOCK';
                  const added = !!inCart(p.productId);
                  return (
                    <tr key={p.productId} className={`so-row ${isLow?'so-row-low':''} ${added?'so-row-incart':''}`}>
                      <td className="so-num">{(safePage-1)*PAGE_SIZE+idx+1}</td>
                      <td><span className="so-mono"><HL text={p.partNumber||'—'} q={searchQuery}/></span></td>
                      <td><span className="so-truncate" title={p.description}><HL text={p.description||'—'} q={searchQuery}/></span></td>
                      <td>
                        {p.supplierName
                          ? <span className="so-supplier"><FiTruck size={10} /> <HL text={p.supplierName} q={searchQuery}/></span>
                          : <span className="so-faded">—</span>}
                      </td>
                      <td>{p.categoryName?<span className="so-chip"><HL text={p.categoryName} q={searchQuery}/></span>:<span className="so-faded">—</span>}</td>
                      <td className="so-faded" style={{ fontSize:11 }}>{p.rackName?<span style={{display:'flex',alignItems:'center',gap:3}}><FiMapPin size={10}/>{p.rackName}{p.boxLabel?`/${p.boxLabel}`:''}</span>:'—'}</td>
                      <td><span className={`so-stock-val ${isLow?'low':'ok'}`}>{fmt(p.totalStock,0)}{isLow&&<span className="so-low-tag">LOW</span>}</span></td>
                      <td className="so-faded">{p.unitPrice!=null?`₹${fmtCur(p.unitPrice)}`:'—'}</td>
                      <td><span className={`so-status-pill ${isLow?'warn':'ok'}`}>{isLow?'⚠ Low':'✓ OK'}</span></td>
                      <td style={{ textAlign:'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {added
                            ? <button className="so-added-btn" onClick={() => setView('cart')}><FiCheck size={12}/> In Cart</button>
                            : <button className="so-add-btn" onClick={() => addToCart(p)}><FiPlus size={12}/> Add</button>}
                          <button
                            onClick={() => sendToChallan(p)}
                            title="Send this product straight to Delivery Challan"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '5px 10px', background: '#eef2ff', color: '#4f46e5',
                              border: '1px solid #c7d2fe', borderRadius: 6,
                              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            <FiFileText size={12} /> DC
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="so-pagination">
            <span className="so-pg-info">{(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
            <div className="so-pg-controls">
              <button className="so-pg-btn" onClick={()=>goTo(1)} disabled={safePage===1}><FiChevronsLeft size={12}/></button>
              <button className="so-pg-btn" onClick={()=>goTo(safePage-1)} disabled={safePage===1}><FiChevronLeft size={12}/></button>
              {pageNums().map(p=><button key={p} className={`so-pg-btn ${p===safePage?'so-pg-active':''}`} onClick={()=>goTo(p)}>{p}</button>)}
              <button className="so-pg-btn" onClick={()=>goTo(safePage+1)} disabled={safePage===totalPages}><FiChevronRight size={12}/></button>
              <button className="so-pg-btn" onClick={()=>goTo(totalPages)} disabled={safePage===totalPages}><FiChevronsRight size={12}/></button>
            </div>
          </div>
        )}
      </div>

      {editTarget && (
        <EditIssueModal
          issue={editTarget}
          onConfirm={submitEdit}
          onCancel={() => !actionLoading && setEditTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default StockOut;