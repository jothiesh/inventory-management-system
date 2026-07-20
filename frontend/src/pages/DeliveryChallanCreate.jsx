import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiSearch, FiX, FiPlus, FiCheck, FiTrash2, FiRefreshCw, FiTruck, FiEdit2, FiRotateCcw,
  FiPackage, FiList, FiInfo, FiPrinter, FiFileText, FiExternalLink, FiSend
} from 'react-icons/fi';
import DeliveryChallanPrintModal, { DeliveryChallanDoc } from './DeliveryChallanPrintModal';
import './ReturnChallan.css';
import './DeliveryChallanFlow.css';

/* ════════════════════════════════════════════════════════════════
   DELIVERY CHALLAN — CREATE (Job Work)
   • ALL components always visible — supplier NEVER filters the list
   • Selecting a supplier only fills To / Address / GSTIN (editable)
   • Submit issues stock (FIFO, JobWork) and creates the DC
   Route: <Route path="/delivery-challan" element={<DeliveryChallanCreate/>}/>
   ════════════════════════════════════════════════════════════════ */

const authHdr = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
};
const fmtNum = (n) => parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
const PAGE_SIZE = 12;   // rows per page — increase/decrease to match preview length

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

const DeliveryChallanCreate = () => {
  const navigate = useNavigate();

  const [products,  setProducts]  = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');
  const [page,     setPage]     = useState(1);

  const [selected, setSelected] = useState({});   // productId → {qty, rate, partNumber, description, categoryName, stock}
  const [qtyDraft, setQtyDraft] = useState({});   // productId → string (before Add)

  // deliver-to (supplier fills these ONLY — never filters products)
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen,   setSupplierOpen]   = useState(false);
  const [supplierId,     setSupplierId]     = useState(null);
  const [toName,    setToName]    = useState('');
  const [toAddress, setToAddress] = useState('');
  const [toGstin,   setToGstin]   = useState('');

  const [dcDate,  setDcDate]  = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [printDc,    setPrintDc]    = useState(null);
  const [createdId,  setCreatedId]  = useState(null);
  const [previewEdit, setPreviewEdit] = useState(false);
  const [docExtra,    setDocExtra]    = useState({});   // edited doc fields (company block, title, basis, footer…)

  const loadAll = async () => {
    setLoading(true);
    try {
      const r = await axios.get('/api/stock/stocked-products', authHdr());
      setProducts(r.data.data || []);
    } catch { toast.error('Failed to load components'); }
    try {
      const r = await axios.get('/api/suppliers', authHdr());
      const raw = r.data.data || r.data || [];
      setSuppliers(Array.isArray(raw) ? raw : []);
    } catch { setSuppliers([]); }
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach(p => { if (p.categoryName) set.add(p.categoryName); });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category !== 'All' && p.categoryName !== category) return false;
      if (!q) return true;
      return (p.partNumber||'').toLowerCase().includes(q)
          || (p.description||'').toLowerCase().includes(q);
    });
  }, [products, search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, category]);

  /* ── supplier pick: FILLS DETAILS ONLY ── */
  const pickSupplier = (s) => {
    const name = s.supplierName || s.name || '';
    setSupplierId(s.supplierId ?? s.id ?? null);
    setToName(name);
    setToAddress(
      s.address || s.supplierAddress ||
      [s.addressLine1, s.addressLine2, s.city, s.state, s.pincode].filter(Boolean).join(', ') || ''
    );
    setToGstin(s.gstin || s.gstNumber || s.gstNo || s.tinNumber || '');
    setSupplierSearch(name);
    setSupplierOpen(false);
    toast.info('Supplier details filled — components list unchanged', { autoClose: 1400 });
  };

  const supplierMatches = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    const list = !q ? suppliers
      : suppliers.filter(s => ((s.supplierName || s.name || '')).toLowerCase().includes(q));
    return list.slice(0, 12);
  }, [suppliers, supplierSearch]);

  /* ── select components ── */
  const addItem = (p) => {
    const raw = qtyDraft[p.productId];
    const qty = parseFloat(raw);
    if (!raw || isNaN(qty) || qty <= 0) { toast.warn('Enter a quantity first'); return; }
    const stock = parseFloat(p.totalStock || 0);
    if (qty > stock) { toast.error(`Only ${stock} in stock for ${p.partNumber}`); return; }
    setSelected(prev => ({ ...prev, [p.productId]: {
      qty,
      rate: p.lastPurchasePrice ?? p.unitPrice ?? '',
      partNumber: p.partNumber, description: p.description,
      categoryName: p.categoryName, stock, remarks: '',
    }}));
  };
  const removeItem = (id) => setSelected(prev => {
    const next = { ...prev }; delete next[id]; return next;
  });
  const updateSelQty = (id, v) => {
    const clean = v.replace(/[^\d.]/g, '');
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], qty: clean } }));
  };

  const selEntries = Object.entries(selected);
  const selCount   = selEntries.length;
  const selQty     = selEntries.reduce((s,[,i]) => s + (parseFloat(i.qty)||0), 0);

  /* ── live preview data — FULLY EDITABLE ──
     To / Address / GSTIN / qty / rate / remarks / part / description
     sync BACK into the form & payload. Company block, title, basis
     line, footer, signatures are stored as doc overrides.          */
  const previewItems = selEntries.map(([pid, i]) => ({
    id: pid,
    partNumber: i.partNumber, description: i.description,
    quantity: i.qty, rate: i.rate, remarks: i.remarks || '',
  }));
  const previewDoc = {
    ...COMPANY_DOC,
    ...docExtra,
    toName, toAddress, tinGstin: toGstin,
    dcDateText: docExtra.dcDateText ?? fmtDate(dcDate),
  };

  const setPreviewDoc = (updater) => {
    const next = typeof updater === 'function' ? updater(previewDoc) : updater;
    setToName(next.toName ?? '');
    setToAddress(next.toAddress ?? '');
    setToGstin(next.tinGstin ?? '');
    setDocExtra({
      companyName: next.companyName, companyAddr: next.companyAddr,
      companyPhone: next.companyPhone, title: next.title, gstin: next.gstin,
      basisLine: next.basisLine, footerRight: next.footerRight,
      sigLeft: next.sigLeft, sigRight: next.sigRight,
      dcDateText: next.dcDateText,
    });
  };

  const setPreviewItems = (updater) => {
    setSelected(prevSel => {
      const entries = Object.entries(prevSel);
      const cur = entries.map(([pid, i]) => ({
        id: pid,
        partNumber: i.partNumber, description: i.description,
        quantity: i.qty, rate: i.rate, remarks: i.remarks || '',
      }));
      const next = typeof updater === 'function' ? updater(cur) : updater;
      const copy = { ...prevSel };
      entries.forEach(([pid], idx) => {
        const n = next[idx];
        if (!n) return;
        copy[pid] = {
          ...copy[pid],
          partNumber: n.partNumber, description: n.description,
          qty: n.quantity, rate: n.rate, remarks: n.remarks,
        };
      });
      return copy;
    });
  };

  const resetPreviewDoc = () => { setDocExtra({}); toast.info('Preview reset', { autoClose: 900 }); };

  /* ── submit ── */
  const handleSubmit = async (print) => {
    if (selCount === 0) { toast.warn('Add at least one component'); return; }
    for (const [, i] of selEntries) {
      const q = parseFloat(i.qty);
      if (!q || q <= 0) { toast.error(`Invalid qty for ${i.partNumber}`); return; }
      if (q > i.stock)  { toast.error(`Only ${i.stock} in stock for ${i.partNumber}`); return; }
    }
    if (!toName.trim() && !supplierId) { toast.warn('Select or type the supplier (Deliver To)'); return; }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        supplierName:    toName.trim() || null,
        supplierAddress: toAddress.trim() || null,
        supplierGstin:   toGstin.trim() || null,
        dcDate, remarks: remarks.trim() || null,
        sendNow: false,
        items: selEntries.map(([pid, i]) => ({
          productId: Number(pid),
          partNumber: i.partNumber, description: i.description,
          categoryName: i.categoryName,
          qty: parseFloat(i.qty),
          rate: i.rate !== '' && i.rate != null ? parseFloat(i.rate) : null,
          remarks: i.remarks && i.remarks.trim() ? i.remarks.trim() : null,
        })),
      };
      const r  = await axios.post('/api/delivery-challans', payload, authHdr());
      const dc = r.data.data;
      toast.success(`✅ ${dc.dcNumber} created — stock issued`);
      setCreatedId(dc.id);
      if (print) {
        setPrintDc({
          dcNumber: dc.dcNumber, dcDate: dc.dcDate,
          toName: dc.supplierName, toAddress: dc.supplierAddress, tinGstin: dc.supplierGstin,
          items: (dc.items || []).map(i => ({
            partNumber: i.partNumber, description: i.description,
            quantity: i.qty, rate: i.rate, remarks: i.remarks,
          })),
        });
      } else {
        navigate(`/delivery-challans/${dc.id}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create challan');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="rc-page">
      <div className="rc-loading"><div className="rc-spinner dcx-spinner"/><p>Loading components…</p></div>
    </div>
  );

  return (
    <div className="rc-page">

      {/* HEADER */}
      <div className="rc-header rcd-fade">
        <div className="rc-header-left">
          <div className="rc-header-icon dcx-icon"><FiTruck size={20}/></div>
          <div>
            <h1 className="rc-title">Delivery Challan</h1>
            <p className="rc-subtitle">Send your components for job work — supplier fills the address only</p>
          </div>
        </div>
        <div className="rc-header-right">
          <button className="rc-btn-refresh" onClick={() => navigate('/delivery-challans')}>
            <FiExternalLink size={14}/> All Challans
          </button>
          <button className="rc-btn-refresh" onClick={loadAll}>
            <FiRefreshCw size={14}/> Refresh
          </button>
        </div>
      </div>

      <div className="dcx-grid">

        {/* ── LEFT: ALL COMPONENTS ── */}
        <div className="dcx-left">
          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '60ms' }}>
            <div className="rc-card-title">
              <FiList size={13}/> All Components
              <span className="rc-badge">{filtered.length} of {products.length}</span>
              <span className="dcx-note"><FiCheck size={10}/> never filtered by supplier</span>
            </div>

            <div className="rc-search-bar">
              <FiSearch size={15} className="rc-search-icon"/>
              <input className="rc-search-input" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search part no. / description…"/>
              {search && (
                <button className="rc-search-clear" onClick={() => setSearch('')}><FiX size={13}/></button>
              )}
            </div>

            <div className="dcx-chips">
              {categories.map(c => (
                <button key={c} className={`dcx-chip ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>

            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead><tr>
                  <th>#</th><th>Part No.</th><th>Description</th><th>Category</th>
                  <th className="num">Stock</th><th className="num">Price</th>
                  <th className="num">Send Qty</th><th></th>
                </tr></thead>
                <tbody>
                  {paged.length === 0 && (
                    <tr><td colSpan={8}>
                      <div className="rc-empty"><FiPackage size={26}/><p>No components match</p></div>
                    </td></tr>
                  )}
                  {paged.map((p, idx) => {
                    const isSel = !!selected[p.productId];
                    const price = p.lastPurchasePrice ?? p.unitPrice;
                    return (
                      <tr key={p.productId} className={`rc-row ${isSel ? 'dcx-row-sel' : ''}`}>
                        <td className="rc-num">{(safePage-1)*PAGE_SIZE + idx + 1}</td>
                        <td><span style={{ fontFamily:'monospace', fontWeight:800, color:'#1d4ed8', fontSize:12 }}>
                          {p.partNumber || '—'}
                        </span></td>
                        <td style={{ fontSize:12, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {p.description || '—'}
                        </td>
                        <td>{p.categoryName
                          ? <span className="rc-chip">{p.categoryName}</span>
                          : <span style={{ color:'#cbd5e1' }}>—</span>}
                        </td>
                        <td className="num" style={{ fontWeight:800, color:'#059669' }}>
                          {parseFloat(p.totalStock||0).toFixed(0)}
                        </td>
                        <td className="num" style={{ color:'#64748b', fontSize:12 }}>
                          {price ? `₹${fmtNum(price)}` : '—'}
                        </td>
                        <td className="num">
                          <input className={`dcx-qty ${isSel ? 'sel' : ''}`}
                            value={isSel ? selected[p.productId].qty : (qtyDraft[p.productId] || '')}
                            placeholder="qty"
                            onChange={e => isSel
                              ? updateSelQty(p.productId, e.target.value)
                              : setQtyDraft(prev => ({ ...prev, [p.productId]: e.target.value.replace(/[^\d.]/g, '') }))}
                            onKeyDown={e => { if (e.key === 'Enter' && !isSel) addItem(p); }}/>
                        </td>
                        <td>
                          {isSel ? (
                            <button className="dcx-added" onClick={() => removeItem(p.productId)}
                              title="Click to remove">
                              <FiCheck size={12}/> Added
                            </button>
                          ) : (
                            <button className="dcx-add" onClick={() => addItem(p)}>
                              <FiPlus size={12}/> Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rc-pagination">
              <span className="rc-pg-info">
                {filtered.length === 0 ? '0' :
                  `${(safePage-1)*PAGE_SIZE + 1}–${Math.min(safePage*PAGE_SIZE, filtered.length)}`} of {filtered.length}
              </span>
              <div className="rc-pg-controls">
                <button disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
                <button disabled={safePage === 1} onClick={() => setPage(p => p-1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                  const n = start + i;
                  if (n > totalPages) return null;
                  return (
                    <button key={n} className={n === safePage ? 'rc-pg-active' : ''}
                      onClick={() => setPage(n)}>{n}</button>
                  );
                })}
                <button disabled={safePage === totalPages} onClick={() => setPage(p => p+1)}>›</button>
                <button disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            </div>
          </div>

          {/* STICKY SUBMIT BAR */}
          <div className="dcx-bottom-bar rcd-fade" style={{ animationDelay: '120ms' }}>
            <div className="dcx-bar-info">
              <strong>{selCount}</strong> component{selCount === 1 ? '' : 's'} · <strong>{selQty.toFixed(0)}</strong> qty
              {toName ? <span style={{ color:'#94a3b8' }}> → {toName}</span> : null}
            </div>
            <div className="dcx-bar-btns">
              <button className="dcx-btn-ghost" disabled={submitting} onClick={() => handleSubmit(false)}>
                {submitting ? <FiRefreshCw size={13} className="rc-spin"/> : <FiSend size={13}/>} Submit Only
              </button>
              <button className="dcx-btn-primary" disabled={submitting} onClick={() => handleSubmit(true)}>
                <FiPrinter size={13}/> Submit &amp; Print Challan
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: DELIVER TO + SELECTED + PREVIEW ── */}
        <div className="dcx-right">

          <div className="rc-card dcx-sup-card rcd-fade" style={{ animationDelay: '90ms' }}>
            <div className="rc-card-title"><FiTruck size={13}/> Deliver To (Supplier)</div>
            <div className="dcx-sup-body">
              <div className="dcx-sup-search">
                <FiSearch size={14}/>
                <input value={supplierSearch}
                  onChange={e => { setSupplierSearch(e.target.value); setSupplierOpen(true); }}
                  onFocus={() => setSupplierOpen(true)}
                  onBlur={() => setTimeout(() => setSupplierOpen(false), 180)}
                  placeholder="Search supplier…"/>
                {supplierOpen && supplierMatches.length > 0 && (
                  <div className="dcx-sup-dd">
                    {supplierMatches.map((s, i) => (
                      <button key={s.supplierId ?? s.id ?? i} onMouseDown={() => pickSupplier(s)}>
                        <strong>{s.supplierName || s.name}</strong>
                        <span>{s.gstin || s.gstNumber || s.city || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="dcx-sup-hint">
                <FiInfo size={12}/>
                <span>Selecting a supplier only fills the details below — the components list is <strong>never</strong> filtered. Send any of your stock.</span>
              </div>
              <div className="dcx-field">
                <label>To, M/s. (Name)</label>
                <input value={toName} onChange={e => setToName(e.target.value)} placeholder="Company / person"/>
              </div>
              <div className="dcx-field">
                <label>Address</label>
                <textarea rows={2} value={toAddress} onChange={e => setToAddress(e.target.value)}
                  placeholder="Delivery address (optional)"/>
              </div>
              <div className="dcx-field">
                <label>TIN / GSTIN</label>
                <input value={toGstin} onChange={e => setToGstin(e.target.value)} placeholder="e.g. 29AADCT9485G1ZP"/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="dcx-field">
                  <label>DC Date</label>
                  <input type="date" value={dcDate}
                    onChange={e => { setDcDate(e.target.value); setDocExtra(p => ({ ...p, dcDateText: undefined })); }}/>
                </div>
                <div className="dcx-field">
                  <label>Remarks</label>
                  <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="optional"/>
                </div>
              </div>
            </div>
          </div>

          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '150ms' }}>
            <div className="rc-card-title">
              <FiPackage size={13}/> Selected Components
              <span className="rc-badge">{selCount} · {selQty.toFixed(0)} qty</span>
            </div>
            {selCount === 0 ? (
              <div className="dcx-sel-empty">Nothing selected — enter a qty and click Add</div>
            ) : (
              <div className="dcx-sel-list">
                {selEntries.map(([pid, i]) => (
                  <div key={pid} className="dcx-sel-item">
                    <span className="pn">{i.partNumber}</span>
                    <span className="desc">{i.description}</span>
                    <span className="qty">× {parseFloat(i.qty||0).toFixed(0)}</span>
                    <button className="dcx-sel-rm" onClick={() => removeItem(pid)} title="Remove">
                      <FiTrash2 size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay: '210ms' }}>
            <div className="rc-card-title">
              <FiFileText size={13}/> Live Preview
              <span style={{ marginLeft:'auto', display:'inline-flex', gap:6 }}>
                {previewEdit && (
                  <button className="dcx-prev-btn" onClick={resetPreviewDoc} title="Reset edited fields">
                    <FiRotateCcw size={11}/> Reset
                  </button>
                )}
                <button className={`dcx-prev-btn ${previewEdit ? 'on' : ''}`}
                  onClick={() => setPreviewEdit(e => !e)}
                  title="Edit any field directly on the challan">
                  <FiEdit2 size={11}/> {previewEdit ? 'Done' : 'Edit Fields'}
                </button>
              </span>
            </div>
            {previewEdit && (
              <div className="dcx-prev-hint">
                <FiInfo size={11}/> Click any red-dashed field to type. To / Address / GSTIN / qty / rate / remarks save into the challan — company block &amp; titles are print-layout edits.
              </div>
            )}
            <div className="dcx-preview">
              <DeliveryChallanDoc dc={{ dcNumber: '(auto)' }} editable={previewEdit}
                doc={previewDoc} setDoc={setPreviewDoc}
                items={previewItems} setItems={setPreviewItems}/>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT MODAL after Submit & Print */}
      {printDc && (
        <DeliveryChallanPrintModal
          dc={printDc}
          onClose={() => { setPrintDc(null); if (createdId) navigate(`/delivery-challans/${createdId}`); }}
        />
      )}
    </div>
  );
};

export default DeliveryChallanCreate;