import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiSearch, FiX, FiPlus, FiTrash2, FiPrinter,
  FiCheckCircle, FiRefreshCw, FiFileText, FiUser,
  FiArrowLeft, FiHash, FiPackage, FiAlertTriangle,
  FiChevronDown, FiChevronUp, FiEye, FiSend,
} from 'react-icons/fi';
import { deliveryChallanApi } from '../api/deliveryChallanApi';
import { returnChallanApi } from '../api/returnChallanApi';
import './DeliveryChallan.css';

// ─── Challan number ────────────────────────────────────────────
const DC_KEY = 'inventrak-dc-counter';
const generateChallanNo = () => {
  try {
    const today  = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const stored = JSON.parse(localStorage.getItem(DC_KEY) || '{"seq":0,"date":""}');
    const seq    = stored.date === today ? stored.seq + 1 : 1;
    localStorage.setItem(DC_KEY, JSON.stringify({ seq, date: today }));
    return `DC-${today}-${String(seq).padStart(3, '0')}`;
  } catch { return `DC-${Date.now()}`; }
};

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const fmtNum = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const blankRow = (supplierId) => ({
  _id: `r-${Date.now()}-${Math.random()}`,
  supplierId, productId: '', partNumber: '', description: '',
  category: '', quantity: '', rate: '', remarks: '',
  availStock: null, stockLoading: false, stockError: false,
});

const blankSection = () => ({
  _sid: `s-${Date.now()}-${Math.random()}`,
  supplier: null, query: '', showDrop: false,
  products: [], categories: [], selCategory: '', loading: false, rows: [],
});

// ─── ★ NEW: Draft (auto-save / restore like Stock OUT) ────────
const DC_DRAFT_KEY = 'dc-challan-draft';
const saveDcDraft  = (data) => { try { localStorage.setItem(DC_DRAFT_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() })); } catch {} };
const loadDcDraft  = () => { try { const r = localStorage.getItem(DC_DRAFT_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const clearDcDraft = () => { try { localStorage.removeItem(DC_DRAFT_KEY); } catch {} };
const timeAgo      = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ════════════════════════════════════════════════════════════════
// ★ NEW: PRODUCT BROWSER — Stock-OUT style table
//   Shows ALL stocked products by default; when a supplier is
//   selected it lists ONLY that supplier's products.
//   "+ Add" puts the product into the active supplier section
//   (cart) and it appears instantly in the Live Preview.
// ════════════════════════════════════════════════════════════════
const ProductBrowser = ({ allProducts, loading, activeSection, addedIds, onAdd, onRefresh, submitted }) => {
  const [search, setSearch]   = useState('');
  const [cat, setCat]         = useState('all');
  const [page, setPage]       = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const PS = 8;

  // source: supplier selected → that supplier's products; else all stock
  const supplierMode = !!(activeSection?.supplier && !activeSection.loading && activeSection.products.length > 0);
  const source = supplierMode ? activeSection.products : allProducts;

  const cats = useMemo(() => {
    const s = new Set(); source.forEach(p => { if (p.category) s.add(p.category); });
    return ['all', ...Array.from(s).sort()];
  }, [source]);

  const filtered = useMemo(() => {
    let f = source;
    if (cat !== 'all') f = f.filter(p => p.category === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(p => [p.partNumber, p.description, p.category].filter(Boolean).some(v => v.toLowerCase().includes(q)));
    }
    return f;
  }, [source, search, cat]);

  useEffect(() => { setPage(1); }, [search, cat, supplierMode]);
  const tp = Math.max(1, Math.ceil(filtered.length / PS));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp - 1) * PS, sp * PS);
  const pageNums = () => { let s = Math.max(1, sp - 2), e = Math.min(tp, s + 4); if (e - s < 4) s = Math.max(1, e - 4); const a = []; for (let i = s; i <= e; i++) a.push(i); return a; };

  if (submitted) return null;

  return (
    <div className="dc-card dcb-card">
      <div className="dcb-head">
        <div className="dcb-head-left">
          <div className="dcb-head-icon"><FiPackage size={14} /></div>
          <div>
            <div className="dcb-title">
              {supplierMode ? `${activeSection.supplier.supplierName} — Products` : 'All Stock Products'}
              <span className="dcb-count">{filtered.length}</span>
            </div>
            <div className="dcb-sub">
              {supplierMode
                ? 'Showing this supplier\u2019s products — click + Add to put in challan'
                : 'All stock shown · select a supplier below, then + Add products'}
            </div>
          </div>
        </div>
        <div className="dcb-head-right">
          <button className="dcb-icon-btn" onClick={onRefresh} disabled={loading} title="Refresh stock">
            <FiRefreshCw size={13} className={loading ? 'dc-spin' : ''} />
          </button>
          <button className="dcb-icon-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="dcb-search-row">
            <FiSearch size={14} className="dcb-search-ico" />
            <input
              className="dcb-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search part number, description, category…"
            />
            {search && <button className="dcb-clear" onClick={() => setSearch('')}><FiX size={12} /></button>}
          </div>

          <div className="dcb-pills">
            {cats.map(c => (
              <button key={c} className={`dcb-pill ${cat === c ? 'dcb-pill-active' : ''}`} onClick={() => setCat(c)}>
                {c === 'all' ? 'All' : c}
                {c !== 'all' && <span className="dcb-pill-n">{source.filter(p => p.category === c).length}</span>}
              </button>
            ))}
          </div>

          <div className="dcb-table-wrap">
            {loading ? (
              <div className="dcb-empty"><FiRefreshCw size={24} className="dc-spin" /></div>
            ) : paged.length === 0 ? (
              <div className="dcb-empty"><FiSearch size={26} /><span>{search ? 'No results' : 'No products'}</span></div>
            ) : (
              <table className="dcb-table">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>#</th>
                    <th>PART NO.</th>
                    <th>DESCRIPTION</th>
                    <th>CATEGORY</th>
                    <th style={{ width: 70, textAlign: 'right' }}>STOCK</th>
                    <th style={{ width: 90, textAlign: 'right' }}>PRICE</th>
                    <th style={{ width: 84, textAlign: 'center' }}>ADD</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p, i) => {
                    const added = addedIds.has(String(p.productId));
                    return (
                      <tr key={p.productId} className={`dcb-row ${added ? 'dcb-row-added' : ''}`}>
                        <td className="dcb-num">{(sp - 1) * PS + i + 1}</td>
                        <td><span className="dcb-pn">{p.partNumber || '—'}</span></td>
                        <td><span className="dcb-desc" title={p.description}>{p.description || '—'}</span></td>
                        <td>{p.category ? <span className="dcb-chip">{p.category}</span> : <span className="dcb-faded">—</span>}</td>
                        <td className="dcb-stock" style={{ textAlign: 'right' }}>{parseFloat(p.totalStock || 0).toFixed(0)}</td>
                        <td style={{ textAlign: 'right' }} className="dcb-price">{p.unitPrice ? `₹${fmtNum(p.unitPrice)}` : '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {added
                            ? <span className="dcb-added-tag"><FiCheckCircle size={11} /> Added</span>
                            : <button className="dcb-add-btn" onClick={() => onAdd(p)}><FiPlus size={12} /> Add</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {filtered.length > PS && (
            <div className="dcb-pagination">
              <span className="dcb-pg-info">{(sp - 1) * PS + 1}–{Math.min(sp * PS, filtered.length)} of {filtered.length}</span>
              <div className="dcb-pg-controls">
                <button className="dcb-pg-btn" onClick={() => setPage(1)} disabled={sp === 1}>«</button>
                <button className="dcb-pg-btn" onClick={() => setPage(sp - 1)} disabled={sp === 1}>‹</button>
                {pageNums().map(p => (
                  <button key={p} className={`dcb-pg-btn ${p === sp ? 'dcb-pg-active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="dcb-pg-btn" onClick={() => setPage(sp + 1)} disabled={sp === tp}>›</button>
                <button className="dcb-pg-btn" onClick={() => setPage(tp)} disabled={sp === tp}>»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ★ REJECTED BATCHES PANEL — button triggered modal
// ════════════════════════════════════════════════════════════════
const RejectedBatchesPanel = ({ onCreateDc }) => {
  const [show,     setShow]     = React.useState(false);
  const [list,     setList]     = React.useState([]);
  const [loading,  setLoading]  = React.useState(false);
  const [creating, setCreating] = React.useState(null);
  const [remarks,  setRemarks]  = React.useState({});
  const [dcMap,    setDcMap]    = React.useState({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const t = localStorage.getItem('token');
      const r = await fetch('/api/qc/inspections/rejected', { headers: { Authorization: 'Bearer ' + t } });
      const data = await r.json();
      const all = data.data || [];
      setList(all);
      for (const insp of all) {
        if (!insp.batchId) continue;
        try {
          const r2 = await fetch('/api/qc/return-challans/batch/' + insp.batchId, { headers: { Authorization: 'Bearer ' + t } });
          const d2 = await r2.json();
          const dcs = d2.data || [];
          if (dcs.length > 0) setDcMap(p => ({ ...p, [insp.batchId]: dcs[0].status }));
        } catch {}
      }
    } catch { setList([]); }
    finally { setLoading(false); }
  };

  const handleOpen = () => { setShow(true); loadAll(); };

  const handleCreate = async (insp) => {
    setCreating(insp.batchId);
    try {
      await returnChallanApi.create(insp.batchId, remarks[insp.batchId] || null);
      toast.success('DC created for ' + insp.batchRef);
      setDcMap(p => ({ ...p, [insp.batchId]: 'DRAFT' }));
      onCreateDc && onCreateDc();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create DC');
    } finally { setCreating(null); }
  };

  const pending = list.filter(i => !dcMap[i.batchId]);
  const done    = list.filter(i =>  dcMap[i.batchId]);

  return (
    <>
      <button className="dc-rej-trigger-btn" type="button" onClick={handleOpen}>
        <FiAlertTriangle size={14}/>
        View Rejected Batches
      </button>

      {show && (
        <div className="dc-rej-overlay" onClick={e => { if (e.target === e.currentTarget) setShow(false); }}>
          <div className="dc-rej-modal">
            <div className="dc-rej-modal-head">
              <div className="dc-rej-modal-title">
                <FiAlertTriangle size={18}/>
                <div>
                  <h3>Rejected Batches</h3>
                  <p>{list.length} total · {pending.length} need DC · {done.length} DC raised</p>
                </div>
              </div>
              <button className="dc-rej-modal-close" onClick={() => setShow(false)}><FiX size={16}/></button>
            </div>
            <div className="dc-rej-modal-body">
              {loading ? (
                <div className="dc-rej-loading"><FiRefreshCw size={16} className="dc-spin"/> Loading rejected batches…</div>
              ) : list.length === 0 ? (
                <div className="dc-rej-empty"><FiCheckCircle size={20} style={{color:'#10b981'}}/> No rejected batches!</div>
              ) : (
                <>
                  {pending.length > 0 && (
                    <>
                      <div className="dc-rej-section-label" style={{background:'#fef2f2',color:'#dc2626',borderColor:'#fecaca'}}>
                        ⚠ Needs DC — {pending.length} batch{pending.length>1?'es':''}
                      </div>
                      <div className="dc-rej-table-wrap">
                        <table className="dc-rej-table">
                          <thead><tr>
                            <th>#</th><th>BATCH</th><th>SUPPLIER</th><th>INVOICE</th>
                            <th className="num">RECEIVED</th>
                            <th className="num" style={{color:'#dc2626'}}>REJECTED</th>
                            <th>DATE</th><th>REMARKS</th><th style={{width:130}}>ACTION</th>
                          </tr></thead>
                          <tbody>
                            {pending.map((insp, idx) => (
                              <tr key={insp.id} className="dc-rej-row">
                                <td style={{color:'#94a3b8',fontWeight:700,textAlign:'center'}}>{idx+1}</td>
                                <td><span className="dc-rej-batch">{insp.batchRef}</span></td>
                                <td style={{fontSize:12}}>{insp.supplierName||'—'}</td>
                                <td style={{fontSize:11,color:'#64748b'}}>{insp.invoiceNo||'—'}</td>
                                <td className="num" style={{fontWeight:700}}>{(parseFloat(insp.qtyReceived)||0).toFixed(0)}</td>
                                <td className="num"><span className="dc-rej-qty-badge">{(parseFloat(insp.qtyRejected)||0).toFixed(0)}</span></td>
                                <td style={{fontSize:11,color:'#64748b'}}>{fmtDate(insp.inspectedAt)}</td>
                                <td>
                                  <input className="dc-rej-remark-input" placeholder="Reason…"
                                    value={remarks[insp.batchId]||''}
                                    onChange={e=>setRemarks(p=>({...p,[insp.batchId]:e.target.value}))}/>
                                </td>
                                <td>
                                  <button className="dc-rej-create-btn" type="button"
                                    onClick={()=>handleCreate(insp)} disabled={creating===insp.batchId}>
                                    {creating===insp.batchId
                                      ?<><FiRefreshCw size={11} className="dc-spin"/> Creating…</>
                                      :<><FiSend size={11}/> Create DC</>}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {done.length > 0 && (
                    <>
                      <div className="dc-rej-section-label" style={{background:'#f0fdf4',color:'#065f46',borderColor:'#bbf7d0',marginTop:16}}>
                        ✓ DC Already Raised — {done.length} batch{done.length>1?'es':''}
                      </div>
                      <div className="dc-rej-table-wrap">
                        <table className="dc-rej-table">
                          <thead><tr>
                            <th>#</th><th>BATCH</th><th>SUPPLIER</th>
                            <th className="num">REJECTED</th><th>DC STATUS</th>
                          </tr></thead>
                          <tbody>
                            {done.map((insp, idx) => {
                              const st = dcMap[insp.batchId];
                              return (
                                <tr key={insp.id} className="dc-rej-row-done">
                                  <td style={{color:'#94a3b8',fontWeight:700,textAlign:'center'}}>{idx+1}</td>
                                  <td><span className="dc-rej-batch" style={{color:'#475569'}}>{insp.batchRef}</span></td>
                                  <td style={{fontSize:12}}>{insp.supplierName||'—'}</td>
                                  <td className="num" style={{color:'#10b981',fontWeight:700}}>
                                    {(parseFloat(insp.qtyRejected)||0).toFixed(0)}
                                  </td>
                                  <td>
                                    <span className="dc-rej-status-badge" style={{
                                      background: st==='SENT'?'#dbeafe':st==='REPLACEMENT_RECEIVED'?'#d1fae5':'#fef3c7',
                                      color: st==='SENT'?'#1e40af':st==='REPLACEMENT_RECEIVED'?'#065f46':'#92400e'
                                    }}>
                                      {st==='DRAFT'?'📋 Draft':st==='SENT'?'📤 Sent':st==='REPLACEMENT_RECEIVED'?'📦 Arrived':'✅ Done'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN DELIVERY CHALLAN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function DeliveryChallan({ onBack }) {
  const location = useLocation();

  const [challanNo,   setChallanNo]   = useState(() => generateChallanNo());
  const [challanDate, setChallanDate] = useState(todayStr());
  const [toName,      setToName]      = useState('');
  const [toAddress,   setToAddress]   = useState('');
  const [tinNo,       setTinNo]       = useState('');
  const [basis,       setBasis]       = useState('returnable');
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [supMasterLoading, setSupMasterLoading] = useState(false);
  const [sections,    setSections]    = useState([blankSection()]);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [issuedChallans, setIssuedChallans] = useState([]);
  const [printIdx,    setPrintIdx]    = useState(0);

  // ★ Track active supplier for rejected panel
  const [activeSupplier, setActiveSupplier] = useState(null);

  // ★ NEW: product browser (all stock) + draft state
  const [allProducts, setAllProducts]       = useState([]);
  const [browserLoading, setBrowserLoading] = useState(true);
  const [draftFound, setDraftFound]         = useState(null);
  const [draftSavedAt, setDraftSavedAt]     = useState(null);
  const restoringDraft = useRef(false);

  // ★ guard so the incoming-items effect only runs once
  const incomingHandled = useRef(false);

  // ★ NEW: load ALL stocked products for the browser (default view)
  const loadAllProducts = useCallback(async () => {
    try {
      setBrowserLoading(true);
      const r = await deliveryChallanApi.getStockedProducts();
      const list = (r.data?.data || []).map(p => ({
        productId: p.productId,
        partNumber: p.partNumber || '',
        description: p.description || '',
        category: p.categoryName || p.category || '',
        unitPrice: p.unitPrice || p.lastPurchasePrice || 0,
        totalStock: p.totalStock || 0,
        supplierId: p.supplierId || null,
        supplierName: p.supplierName || null,
      }));
      setAllProducts(list);
    } catch { toast.error('Failed to load stock products'); }
    finally { setBrowserLoading(false); }
  }, []);

  useEffect(() => { loadAllProducts(); }, [loadAllProducts]);

  useEffect(() => {
    setSupMasterLoading(true);
    deliveryChallanApi.getSuppliers()
      .then(r => setAllSuppliers(r.data?.data || []))
      .catch(() => toast.error('Failed to load suppliers'))
      .finally(() => setSupMasterLoading(false));
  }, []);

  const updateSection = (sid, updates) =>
    setSections(prev => prev.map(s => s._sid === sid ? { ...s, ...updates } : s));

  // ★ NEW: shared product loader for a supplier section
  //   (used by selectSupplier AND draft restore)
  const loadSectionProducts = useCallback(async (sid, sup) => {
    try {
      const r = await deliveryChallanApi.getProductsBySupplier(sup.supplierId);
      const list = r.data?.data || [];
      let products = [];
      if (list.length > 0) {
        products = list.map(p => ({
          productId: p.productId, partNumber: p.partNumber||'',
          description: p.description||p.productName||'', category: p.categoryName||'',
          unitPrice: p.unitPrice||p.lastPurchasePrice||0, totalStock: p.totalStock||p.currentStock||0,
        }));
      } else {
        const r2 = await deliveryChallanApi.getStockedProducts();
        const all = r2.data?.data || [];
        const filtered = all.filter(p => p.supplierId===sup.supplierId||p.supplierName===sup.supplierName);
        products = (filtered.length>0?filtered:all).map(p => ({
          productId: p.productId, partNumber: p.partNumber||'', description: p.description||'',
          category: p.categoryName||p.category||'', unitPrice: p.unitPrice||p.lastPurchasePrice||0,
          totalStock: p.totalStock||0,
        }));
      }
      const categories = [...new Set(products.map(p=>p.category).filter(Boolean))].sort();
      updateSection(sid, { products, categories, loading: false });
    } catch {
      try {
        const r2 = await deliveryChallanApi.getStockedProducts();
        const all = (r2.data?.data||[]).map(p => ({
          productId: p.productId, partNumber: p.partNumber||'', description: p.description||'',
          category: p.categoryName||'', unitPrice: p.unitPrice||0, totalStock: p.totalStock||0,
        }));
        const categories = [...new Set(all.map(p=>p.category).filter(Boolean))].sort();
        updateSection(sid, { products: all, categories, loading: false });
      } catch {
        toast.error('Failed to load products');
        updateSection(sid, { loading: false });
      }
    }
  }, []);

  const selectSupplier = useCallback(async (sid, sup) => {
    setToName(sup.supplierName || '');
    setToAddress(sup.address   || '');
    setTinNo(sup.gstnNumber    || '');
    setActiveSupplier(sup);

    // ★ keep any product rows already present (e.g. from Stock OUT) instead of wiping them
    setSections(prev => prev.map(s => {
      if (s._sid !== sid) return s;
      const existingRows = s.rows.filter(r => r.productId);
      const rows = existingRows.length > 0
        ? existingRows.map(r => ({ ...r, supplierId: sup.supplierId }))
        : [blankRow(sup.supplierId)];
      return { ...s, supplier: sup, query: sup.supplierName, showDrop: false,
        products: [], categories: [], selCategory: '', loading: true, rows };
    }));

    await loadSectionProducts(sid, sup);
  }, [loadSectionProducts]);

  // ★ Receive products from Stock OUT — fill rows + qty, then auto-select supplier
  useEffect(() => {
    const incoming = location.state?.items || [];
    if (!incoming.length || allSuppliers.length === 0 || incomingHandled.current) return;
    incomingHandled.current = true;

    const rows = incoming.map(it => ({
      ...blankRow(null),
      productId:   it.productId || '',
      partNumber:  it.partNumber || '',
      description: it.description || '',
      category:    it.categoryName || '',
      quantity:    it.quantity != null && it.quantity !== '' ? String(it.quantity) : '1',
      rate:        it.unitPrice != null ? it.unitPrice : '',
      remarks:     it.referenceNumber ? `Ref: ${it.referenceNumber}` : '',
      availStock:  null,
    }));

    const sid = `s-incoming-${Date.now()}`;
    setSections([{ ...blankSection(), _sid: sid, rows }]);

    // auto-select supplier if the incoming item carried one
    const supRef = incoming.find(i => i.supplierId || i.supplierName);
    if (supRef) {
      const match = allSuppliers.find(s =>
        String(s.supplierId) === String(supRef.supplierId) ||
        s.supplierName === supRef.supplierName);
      if (match) {
        setTimeout(() => selectSupplier(sid, match), 0);
        toast.success(`Loaded ${rows.length} product(s) · supplier ${match.supplierName} auto-selected`,
          { autoClose: 3500 });
        return;
      }
    }
    toast.success(`${rows.length} product(s) loaded from Stock OUT — select the supplier`,
      { autoClose: 3500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSuppliers]);

  // ★ NEW: detect saved draft on mount (incoming Stock-OUT items take priority)
  useEffect(() => {
    if (location.state?.items?.length) return;
    const d = loadDcDraft();
    if (d && (d.sections || []).some(s => (s.rows || []).some(r => r.productId))) setDraftFound(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ★ NEW: auto-save draft whenever the challan has at least one product
  useEffect(() => {
    if (submitted || restoringDraft.current) return;
    const hasRows = sections.some(s => s.rows.some(r => r.productId));
    if (!hasRows) return;
    saveDcDraft({
      challanDate, toName, toAddress, tinNo, basis,
      sections: sections.map(s => ({ _sid: s._sid, supplier: s.supplier, selCategory: s.selCategory, rows: s.rows })),
    });
    setDraftSavedAt(new Date().toISOString());
  }, [sections, toName, toAddress, tinNo, basis, challanDate, submitted]);

  // ★ NEW: restore draft — rebuild sections + reload supplier products
  const restoreDraft = async () => {
    const d = draftFound;
    if (!d) return;
    restoringDraft.current = true;
    incomingHandled.current = true;
    setChallanDate(d.challanDate || todayStr());
    setToName(d.toName || '');
    setToAddress(d.toAddress || '');
    setTinNo(d.tinNo || '');
    setBasis(d.basis || 'returnable');
    const secs = (d.sections || []).map(s => ({
      ...blankSection(),
      _sid: s._sid || `s-restored-${Date.now()}-${Math.random()}`,
      supplier: s.supplier || null,
      query: s.supplier?.supplierName || '',
      selCategory: s.selCategory || '',
      rows: (s.rows || []).map(r => ({ ...r, stockLoading: false, stockError: false })),
      loading: !!s.supplier,
    }));
    setSections(secs.length > 0 ? secs : [blankSection()]);
    const lastSup = [...secs].reverse().find(s => s.supplier)?.supplier;
    if (lastSup) setActiveSupplier(lastSup);
    setDraftFound(null);
    const n = secs.reduce((c, s) => c + s.rows.filter(r => r.productId).length, 0);
    toast.success(`Restored draft — ${n} product(s)`, { position: 'top-center' });
    for (const s of secs) { if (s.supplier) await loadSectionProducts(s._sid, s.supplier); }
    restoringDraft.current = false;
  };

  const discardDraft = () => { clearDcDraft(); setDraftFound(null); setDraftSavedAt(null); toast.info('Draft discarded'); };

  // ★ NEW: browser → cart. Adds product into the active supplier section.
  const activeBrowserSection = useMemo(
    () => [...sections].reverse().find(s => s.supplier) || null,
    [sections]
  );
  const addedProductIds = useMemo(() => {
    const set = new Set();
    sections.forEach(s => s.rows.forEach(r => { if (r.productId) set.add(String(r.productId)); }));
    return set;
  }, [sections]);

  const addFromBrowser = (prod) => {
    if (!activeBrowserSection) {
      toast.info('Select a supplier first — then add products', { autoClose: 2500 });
      return;
    }
    if (addedProductIds.has(String(prod.productId))) { toast.info('Already in challan'); return; }
    addRowWithProduct(activeBrowserSection._sid, prod);
    toast.success(`Added: ${prod.partNumber || prod.description}`, { autoClose: 900 });
  };

  const clearSupplier = (sid) => {
    setActiveSupplier(null);
    updateSection(sid, { supplier:null, query:'', showDrop:false, products:[], categories:[], selCategory:'', rows:[] });
  };

  const addSection = () => setSections(prev => [...prev, blankSection()]);
  const removeSection = (sid) => { if (sections.length>1) setSections(prev=>prev.filter(s=>s._sid!==sid)); };

  const selectProduct = useCallback(async (sid, rowId, productId) => {
    const section = sections.find(s=>s._sid===sid);
    if (!section) return;
    if (!productId) {
      setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.map(r=>r._id===rowId?{...r,productId:'',partNumber:'',description:'',category:'',rate:'',availStock:null,stockError:false}:r)}:s));
      return;
    }
    const prod = section.products.find(p=>String(p.productId)===String(productId));
    setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.map(r=>r._id===rowId?{...r,productId:prod?.productId||productId,partNumber:prod?.partNumber||'',description:prod?.description||'',category:prod?.category||'',rate:prod?.unitPrice||'',availStock:prod?.totalStock??null,stockLoading:true,stockError:false}:r)}:s));
    try {
      const res = await deliveryChallanApi.getCurrentStock(productId);
      const live = parseFloat(res.data?.data?.totalStock??0);
      setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.map(r=>r._id===rowId?{...r,availStock:live,stockLoading:false}:r)}:s));
    } catch {
      setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.map(r=>r._id===rowId?{...r,stockLoading:false,stockError:true}:r)}:s));
    }
  }, [sections]);

  const updateRow = (sid, rowId, field, value) =>
    setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.map(r=>r._id===rowId?{...r,[field]:value}:r)}:s));

  const addRow = (sid) => {
    const section = sections.find(s=>s._sid===sid);
    if (!section?.supplier) return;
    setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:[...s.rows,blankRow(section.supplier.supplierId)]}:s));
  };

  const addRowWithProduct = useCallback(async (sid, prod) => {
    const section = sections.find(s=>s._sid===sid);
    if (!section?.supplier) return;
    const newRow = { ...blankRow(section.supplier.supplierId), productId:prod.productId, partNumber:prod.partNumber||'', description:prod.description||'', category:prod.category||'', rate:prod.unitPrice||'', quantity:'1', availStock:prod.totalStock??null, stockLoading:true };
    setSections(prev=>prev.map(s=>{
      if(s._sid!==sid) return s;
      const lastRow=s.rows[s.rows.length-1];
      const lastEmpty=lastRow&&!lastRow.productId;
      const newRows=lastEmpty?[...s.rows.slice(0,-1),{...newRow,_id:lastRow._id}]:[...s.rows,newRow];
      return{...s,rows:newRows};
    }));
    try {
      const res = await deliveryChallanApi.getCurrentStock(prod.productId);
      const live = parseFloat(res.data?.data?.totalStock??0);
      setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.map(r=>String(r.productId)===String(prod.productId)&&r.stockLoading?{...r,availStock:live,stockLoading:false}:r)}:s));
    } catch {
      setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.map(r=>String(r.productId)===String(prod.productId)&&r.stockLoading?{...r,stockLoading:false,stockError:true}:r)}:s));
    }
  }, [sections]);

  const removeRow = (sid, rowId) =>
    setSections(prev=>prev.map(s=>s._sid===sid?{...s,rows:s.rows.length>1?s.rows.filter(r=>r._id!==rowId):s.rows}:s));

  const allProductRows = useMemo(()=>sections.flatMap(s=>s.rows.filter(r=>r.productId)),[sections]);
  const allFilledRows  = useMemo(()=>sections.flatMap(s=>s.rows.filter(r=>r.productId&&parseFloat(r.quantity)>0)),[sections]);
  const grandTotal     = allFilledRows.reduce((sum,r)=>sum+(parseFloat(r.quantity)||0)*(parseFloat(r.rate)||0),0);
  const hasStockWarn   = allFilledRows.some(r=>r.availStock!==null&&parseFloat(r.quantity)>parseFloat(r.availStock));

  const validate = () => {
    if (!toName.trim()) return 'Please enter recipient name (To / M/s)';
    if (allFilledRows.length<1) return 'Add at least one item with quantity > 0';
    const noSup = sections.some(s=>s.rows.some(r=>r.productId&&!s.supplier));
    if (noSup) return 'Some items have no supplier selected';
    for (const r of allFilledRows) {
      if (r.availStock!==null&&parseFloat(r.quantity)>parseFloat(r.availStock))
        return `Insufficient stock for "${r.description||r.partNumber}". Available: ${r.availStock}`;
    }
    return null;
  };

  const handleSubmit = async (printAfter=false) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const activeSections = sections.filter(s=>s.supplier&&s.rows.some(r=>r.productId&&parseFloat(r.quantity)>0));
    const totalItems = allFilledRows.length;
    const supCount   = activeSections.length;
    if (!window.confirm(`Issue ${supCount>1?supCount+' separate Delivery Challans':'Delivery Challan'}?\n\n${totalItems} item(s) from ${supCount} supplier(s).\nStock will be deducted immediately.`)) return;
    setSubmitting(true);
    const allFailed=[]; const issued=[];
    for (const sec of activeSections) {
      const secChallanNo = generateChallanNo();
      const secRows = sec.rows.filter(r=>r.productId&&parseFloat(r.quantity)>0);
      const secFailed=[];
      for (const r of secRows) {
        try {
          await deliveryChallanApi.issueStock({ productId:parseInt(r.productId), quantity:parseFloat(r.quantity), transactionType:'Sale', referenceNumber:secChallanNo, notes:`DC: ${toName}${r.remarks?' | '+r.remarks:''}` });
        } catch(e) {
          secFailed.push(`${r.description||r.partNumber}: ${e.response?.data?.message||e.message}`);
          allFailed.push(`[${sec.supplier.supplierName}] ${r.description||r.partNumber}: ${e.response?.data?.message||e.message}`);
        }
      }
      issued.push({ challanNo:secChallanNo, supplierName:sec.supplier.supplierName, gstnNumber:sec.supplier.gstnNumber||'', rows:secRows, failed:secFailed.length });
    }
    setSubmitting(false);
    setIssuedChallans(issued);
    setPrintIdx(0);
    if (allFailed.length===totalItems) { toast.error(`All items failed:\n${allFailed.join('\n')}`,{autoClose:8000}); }
    else {
      if (allFailed.length>0) toast.warning(`${allFailed.length} item(s) failed`,{autoClose:6000});
      else { const nums=issued.map(i=>i.challanNo).join(', '); toast.success(`✅ ${issued.length} Challan(s) issued! [${nums}]`,{position:'top-center',autoClose:5000}); }
      setSubmitted(true);
      clearDcDraft(); setDraftSavedAt(null);   // ★ NEW: challan issued — draft no longer needed
      if (printAfter) setShowModal(true);
    }
  };

  const resetForm = () => {
    setChallanNo(generateChallanNo()); setChallanDate(todayStr());
    setToName(''); setToAddress(''); setTinNo(''); setBasis('returnable');
    setSections([blankSection()]); setSubmitted(false); setShowModal(false);
    setActiveSupplier(null);
    incomingHandled.current = false;
    clearDcDraft(); setDraftSavedAt(null); setDraftFound(null);   // ★ NEW
    loadAllProducts();                                            // ★ NEW: refresh stock after issuing
  };

  const firstSupplier = sections.find(s=>s.supplier)?.supplier || activeSupplier;

  return (
    <div className="dc-page">
      {/* HERO */}
      <div className="dc-hero">
        <div className="dc-hero-left">
          {onBack && <button className="dc-back-btn" onClick={onBack}><FiArrowLeft size={14}/> Back</button>}
          <div className="dc-hero-icon"><FiFileText size={18}/></div>
          <div className="dc-hero-text">
            <h1>Delivery Challan</h1>
            <p>Issue goods · multiple suppliers · deduct stock</p>
          </div>
        </div>
        <div className="dc-hero-right">
          {draftSavedAt && !submitted && (
            <span className="dc-draft-chip"><FiCheckCircle size={11} /> Draft saved {timeAgo(draftSavedAt)}</span>
          )}
          <div className="dc-challan-badge">
            <FiHash size={11}/>
            {submitted&&issuedChallans.length>0?issuedChallans.map(c=>c.challanNo).join(' · '):challanNo}
          </div>
          {submitted && (
            <>
              <button className="dc-btn dc-btn-outline" onClick={()=>setShowModal(true)}><FiPrinter size={13}/> Preview &amp; Print</button>
              <button className="dc-btn dc-btn-primary" onClick={resetForm}><FiPlus size={13}/> New Challan</button>
            </>
          )}
        </div>
      </div>

      <div className="dc-body">
        <div className="dc-left">
          {/* Challan Details */}
          <div className="dc-card">
            <div className="dc-card-title"><FiHash size={13}/> Challan Details</div>
            <div className="dc-header-row">
              <div className="dc-field dc-field-challan">
                <label>Challan No.</label>
                <input className="dc-input dc-mono" value={challanNo} onChange={e=>setChallanNo(e.target.value)} disabled={submitted}/>
              </div>
              <div className="dc-field dc-field-date">
                <label>Date <span className="req">*</span></label>
                <input type="date" className="dc-input" value={challanDate} onChange={e=>setChallanDate(e.target.value)} disabled={submitted}/>
              </div>
              <div className="dc-field dc-field-basis">
                <label>Basis</label>
                <div className="dc-radio-row">
                  {['returnable','non-returnable'].map(v=>(
                    <label key={v} className={`dc-radio ${basis===v?'active':''}`}>
                      <input type="radio" name="dc-basis" value={v} checked={basis===v} onChange={()=>setBasis(v)} disabled={submitted}/>
                      {v.charAt(0).toUpperCase()+v.slice(1)}
                    </label>
                  ))}
                  {/* ★ REJECTED BATCHES PANEL — beside Non-returnable */}
                  <RejectedBatchesPanel onCreateDc={() => {}}/>
                </div>
              </div>
            </div>
          </div>

          {/* ★ NEW: Draft found banner */}
          {draftFound && !submitted && (
            <div className="dc-draft-banner">
              <div className="dc-draft-icon"><FiRefreshCw size={15} /></div>
              <div className="dc-draft-info">
                <div className="dc-draft-title">
                  Draft challan found — {(draftFound.sections || []).reduce((c, s) => c + (s.rows || []).filter(r => r.productId).length, 0)} product(s) unsaved
                </div>
                <div className="dc-draft-sub">
                  Saved {timeAgo(draftFound.savedAt)}{draftFound.toName ? ` · To: ${draftFound.toName}` : ''}
                </div>
              </div>
              <button className="dc-draft-restore" onClick={restoreDraft}><FiRefreshCw size={12} /> Restore</button>
              <button className="dc-draft-discard" onClick={discardDraft}><FiX size={12} /> Discard</button>
            </div>
          )}

          {/* ★ NEW: Product Browser — all stock by default, supplier products when selected */}
          <ProductBrowser
            allProducts={allProducts}
            loading={browserLoading}
            activeSection={activeBrowserSection}
            addedIds={addedProductIds}
            onAdd={addFromBrowser}
            onRefresh={loadAllProducts}
            submitted={submitted}
          />

          {/* Supplier Sections */}
          {sections.map((sec,secIdx)=>(
            <SupplierSection key={sec._sid} sec={sec} secIdx={secIdx}
              allSuppliers={allSuppliers} supMasterLoading={supMasterLoading}
              submitted={submitted} canRemove={sections.length>1}
              onUpdate={updates=>updateSection(sec._sid,updates)}
              onSelectSupplier={sup=>selectSupplier(sec._sid,sup)}
              onClearSupplier={()=>clearSupplier(sec._sid)}
              onSelectProduct={(rowId,pid)=>selectProduct(sec._sid,rowId,pid)}
              onUpdateRow={(rowId,field,val)=>updateRow(sec._sid,rowId,field,val)}
              onAddRow={()=>addRow(sec._sid)}
              onAddRowWithProduct={prod=>addRowWithProduct(sec._sid,prod)}
              onRemoveRow={rowId=>removeRow(sec._sid,rowId)}
              onRemoveSection={()=>removeSection(sec._sid)}
            />
          ))}

          {!submitted && (
            <button className="dc-add-supplier-btn" onClick={addSection}>
              <FiPlus size={14}/> Add Another Supplier
            </button>
          )}

          {!submitted ? (
            <div className="dc-action-bar">
              <div className="dc-action-info">
                <span>{allProductRows.length} product{allProductRows.length!==1?'s':''} selected · {allFilledRows.length} with qty</span>
                {grandTotal>0&&<span>· ₹{fmtNum(grandTotal)}</span>}
                {hasStockWarn&&<span className="dc-action-warn"><FiAlertTriangle size={12}/> Stock exceeded</span>}
              </div>
              <div className="dc-submit-group">
                <button className="dc-submit-btn dc-submit-secondary" onClick={()=>handleSubmit(false)} disabled={submitting}>
                  {submitting?<><FiRefreshCw size={13} className="dc-spin"/> Issuing…</>:<><FiCheckCircle size={13}/> Submit Only</>}
                </button>
                <button className="dc-submit-btn dc-submit-primary" onClick={()=>handleSubmit(true)} disabled={submitting}>
                  {submitting?<><FiRefreshCw size={13} className="dc-spin"/> Issuing…</>:<><FiPrinter size={13}/> Submit &amp; Print Challan</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="dc-success-bar">
              <FiCheckCircle size={16}/>
              <span>{issuedChallans.length>1?<><strong>{issuedChallans.length} Challans</strong> issued — {issuedChallans.map(c=>c.challanNo).join(', ')}</>:<>Challan <strong>{issuedChallans[0]?.challanNo||challanNo}</strong> issued. Stock deducted.</>}</span>
              {issuedChallans.length>1?(
                <div className="dc-multi-print-btns">
                  {issuedChallans.map((c,i)=>(
                    <button key={c.challanNo} className="dc-btn dc-btn-sm dc-btn-outline-dark" onClick={()=>{setPrintIdx(i);setShowModal(true);}}>
                      <FiPrinter size={12}/> {c.challanNo}
                    </button>
                  ))}
                </div>
              ):(
                <button className="dc-btn dc-btn-sm dc-btn-outline-dark" onClick={()=>setShowModal(true)}><FiPrinter size={12}/> Print Challan</button>
              )}
              <button className="dc-btn dc-btn-sm dc-btn-primary" onClick={resetForm}><FiPlus size={12}/> New Challan</button>
            </div>
          )}
        </div>

        {/* RIGHT — sticky preview */}
        <div className="dc-right">
          <div className="dc-card">
            <div className="dc-card-title"><FiUser size={13}/> Recipient (To)</div>
            <div className="dc-stack">
              <div className="dc-field">
                <label>To / M/s <span className="req">*</span></label>
                <input className="dc-input" value={toName} onChange={e=>setToName(e.target.value)} placeholder="Company or person name" disabled={submitted}/>
              </div>
              <div className="dc-field">
                <label>Address</label>
                <textarea className="dc-input dc-textarea" rows={2} value={toAddress} onChange={e=>setToAddress(e.target.value)} placeholder="Delivery address (optional)" disabled={submitted}/>
              </div>
              <div className="dc-field">
                <label>TIN / GSTIN</label>
                <input className="dc-input" value={tinNo} onChange={e=>setTinNo(e.target.value)} placeholder="e.g. 29AADCT9485G1ZP" disabled={submitted}/>
              </div>
            </div>
          </div>

          {sections.filter(s=>s.supplier).length>1?(
            sections.filter(s=>s.supplier).map((sec,i)=>{
              const secRows=sec.rows.filter(r=>r.productId);
              return (
                <div key={sec._sid} style={{marginBottom:18}}>
                  <div className="dc-preview-label">
                    <span>Challan #{i+1} · {sec.supplier.supplierName}</span>
                    <button className="dc-btn dc-btn-sm dc-btn-outline-dark" onClick={()=>{setPrintIdx(i);setShowModal(true);}}><FiEye size={12}/> Open</button>
                  </div>
                  <div className="dc-preview-clickable" onClick={()=>{setPrintIdx(i);setShowModal(true);}} title="Click to open full preview">
                    <div className="dc-preview-click-hint"><FiEye size={12}/> Click to open</div>
                    <ChallanDoc challanNo={`DC-PENDING-${String(i+1).padStart(3,'0')}`} challanDate={challanDate} toName={toName} toAddress={toAddress} tinNo={tinNo} basis={basis} rows={secRows} preview/>
                  </div>
                </div>
              );
            })
          ):(
            <>
              <div className="dc-preview-label">
                <span>Live Preview</span>
                <button className="dc-btn dc-btn-sm dc-btn-outline-dark" onClick={()=>{setPrintIdx(0);setShowModal(true);}}><FiEye size={12}/> Open</button>
              </div>
              <div className="dc-preview-clickable" onClick={()=>{setPrintIdx(0);setShowModal(true);}} title="Click to open full preview">
                <div className="dc-preview-click-hint"><FiEye size={12}/> Click to open</div>
                <ChallanDoc challanNo={challanNo} challanDate={challanDate} toName={toName} toAddress={toAddress} tinNo={tinNo} basis={basis} rows={allProductRows} preview/>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print Modal */}
      {showModal&&(
        <div className="dc-modal-bg" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="dc-modal">
            <div className="dc-modal-head">
              <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
                <span>{issuedChallans.length>1?`Challan ${printIdx+1} of ${issuedChallans.length} — ${issuedChallans[printIdx]?.challanNo}`:`Delivery Challan — ${issuedChallans[0]?.challanNo||challanNo}`}</span>
                {issuedChallans.length>1&&(
                  <div style={{display:'flex',gap:6}}>
                    {issuedChallans.map((c,i)=>(
                      <button key={c.challanNo} onClick={()=>setPrintIdx(i)} style={{padding:'3px 10px',borderRadius:5,fontSize:11,fontWeight:700,cursor:'pointer',border:'1px solid',background:i===printIdx?'#f59e0b':'rgba(255,255,255,0.1)',color:i===printIdx?'#1e293b':'#cbd5e1',borderColor:i===printIdx?'#f59e0b':'rgba(255,255,255,0.2)'}}>
                        {c.challanNo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="dc-btn dc-btn-primary" onClick={()=>window.print()}><FiPrinter size={13}/> Print</button>
                <button className="dc-modal-close" onClick={()=>setShowModal(false)}><FiX size={16}/></button>
              </div>
            </div>
            <div className="dc-modal-body">
              {(()=>{
                const c=issuedChallans[printIdx];
                const printRows=c?c.rows:(allFilledRows.length>0?allFilledRows:allProductRows);
                const printChallanNo=c?c.challanNo:challanNo;
                return <ChallanDoc challanNo={printChallanNo} challanDate={challanDate} toName={toName} toAddress={toAddress} tinNo={tinNo} basis={basis} rows={printRows}/>;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUPPLIER SECTION
// ════════════════════════════════════════════════════════════════
function SupplierSection({ sec, secIdx, allSuppliers, supMasterLoading, submitted, canRemove, onUpdate, onSelectSupplier, onClearSupplier, onSelectProduct, onUpdateRow, onAddRow, onAddRowWithProduct, onRemoveRow, onRemoveSection }) {
  const supRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const h=(e)=>{ if(supRef.current&&!supRef.current.contains(e.target)) onUpdate({showDrop:false}); };
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  const filteredSuppliers = useMemo(()=>{ const q=sec.query.toLowerCase().trim(); if(!q) return allSuppliers; return allSuppliers.filter(s=>s.supplierName?.toLowerCase().includes(q)||s.supplierCode?.toLowerCase().includes(q)); },[allSuppliers,sec.query]);
  const filteredProducts  = useMemo(()=>{ if(!sec.selCategory) return sec.products; return sec.products.filter(p=>p.category===sec.selCategory); },[sec.products,sec.selCategory]);
  const filledRows = sec.rows.filter(r=>r.productId&&parseFloat(r.quantity)>0);

  return (
    <div className="dc-card dc-supplier-section">
      <div className="dc-sec-head">
        <div className="dc-sec-head-left">
          <div className="dc-sec-num">#{secIdx+1}</div>
          <div className="dc-card-title" style={{margin:0}}>
            <FiPackage size={13}/>
            {sec.supplier?sec.supplier.supplierName:'Source Supplier'}
            {sec.supplier?.gstnNumber&&<span className="dc-gstin-tag">GSTIN: {sec.supplier.gstnNumber}</span>}
            {filledRows.length>0&&<span className="dc-row-count">{filledRows.length} item{filledRows.length>1?'s':''}</span>}
          </div>
        </div>
        <div className="dc-sec-head-right">
          {canRemove&&!submitted&&<button className="dc-sec-del" onClick={onRemoveSection} title="Remove supplier"><FiX size={13}/></button>}
          <button className="dc-collapse-btn" onClick={()=>setCollapsed(c=>!c)}>{collapsed?<FiChevronDown size={14}/>:<FiChevronUp size={14}/>}</button>
        </div>
      </div>

      {!collapsed&&(
        <>
          <div ref={supRef} style={{position:'relative',marginBottom:14}}>
            <label className="dc-field-label">Supplier <span className="req">*</span></label>
            <div className="dc-search-wrap">
              <FiSearch size={13} className="dc-search-ico"/>
              <input className="dc-input dc-input-pl" value={sec.query} onChange={e=>onUpdate({query:e.target.value,showDrop:true})} onFocus={()=>onUpdate({showDrop:true})} placeholder={supMasterLoading?'Loading…':'Search supplier…'} disabled={submitted||supMasterLoading} autoComplete="off"/>
              {sec.query&&!submitted&&<button className="dc-clear-btn" onClick={onClearSupplier}><FiX size={12}/></button>}
            </div>
            {sec.showDrop&&filteredSuppliers.length>0&&(
              <div className="dc-dropdown">
                {filteredSuppliers.map(s=>(
                  <div key={s.supplierId} className="dc-dd-item" onMouseDown={()=>onSelectSupplier(s)}>
                    <span className="dc-dd-name">{s.supplierName}</span>
                    {s.supplierCode&&<span className="dc-dd-code">{s.supplierCode}</span>}
                  </div>
                ))}
              </div>
            )}
            {sec.loading&&<div className="dc-loading-hint"><FiRefreshCw size={11} className="dc-spin"/> Loading products…</div>}
            {sec.supplier&&!sec.loading&&sec.products.length>0&&<div className="dc-prod-hint">{sec.products.length} products · {sec.categories.length} categories</div>}
          </div>

          {sec.categories.length>0&&(
            <div style={{marginBottom:8}}>
              <label className="dc-field-label">Filter by Category</label>
              <div className="dc-cat-chips">
                <button className={`dc-cat-chip ${!sec.selCategory?'active':''}`} onClick={()=>onUpdate({selCategory:''})}>All</button>
                {sec.categories.map(cat=>(
                  <button key={cat} className={`dc-cat-chip ${sec.selCategory===cat?'active':''}`} onClick={()=>onUpdate({selCategory:cat})}>{cat}</button>
                ))}
              </div>
            </div>
          )}

          {sec.supplier&&!sec.loading&&filteredProducts.length>0&&!submitted&&(
            <div className="dc-prod-chips-wrap">
              <div className="dc-prod-chips-label"><FiPackage size={11}/> Products — click to add</div>
              <div className="dc-prod-chips">
                {filteredProducts.map(p=>{ const alreadyAdded=sec.rows.some(r=>String(r.productId)===String(p.productId)); return (
                  <button key={p.productId} className={`dc-prod-chip ${alreadyAdded?'dc-prod-chip-added':''}`} onClick={()=>{if(!alreadyAdded) onAddRowWithProduct(p);}} title={`Stock: ${p.totalStock} · ₹${p.unitPrice||0}`} disabled={alreadyAdded}>
                    {p.partNumber&&<span className="dc-chip-pn">{p.partNumber}</span>}
                    <span className="dc-chip-name">{p.description}</span>
                    <span className="dc-chip-stock">{p.totalStock}</span>
                    {alreadyAdded&&<span className="dc-chip-tick">✓</span>}
                  </button>
                );})}
              </div>
            </div>
          )}

          {sec.supplier&&(
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead><tr>
                  <th className="th-sl">SL</th><th className="th-prod">Product / Search <span className="req">*</span></th>
                  <th className="th-desc">Description</th><th className="th-qty">Qty <span className="req">*</span></th>
                  <th className="th-rate">Rate (₹)</th><th className="th-rem">Remarks</th><th className="th-act"></th>
                </tr></thead>
                <tbody>
                  {sec.rows.map((row,idx)=>{
                    const qtyNum=parseFloat(row.quantity)||0;
                    const overStock=row.availStock!==null&&qtyNum>parseFloat(row.availStock)&&qtyNum>0;
                    return (
                      <tr key={row._id} className={overStock?'dc-row-danger':''}>
                        <td className="td-sl">{idx+1}</td>
                        <td className="td-prod">
                          <ProductSearchCell products={filteredProducts} selectedId={row.productId} onSelect={pid=>onSelectProduct(row._id,pid)} disabled={!sec.supplier||sec.loading||submitted}/>
                          {row.productId&&(
                            <div className={`dc-stock-tag ${overStock?'danger':'ok'}`}>
                              {row.stockLoading?<><FiRefreshCw size={10} className="dc-spin"/> checking…</>:row.stockError?<span className="err">Stock N/A</span>:row.availStock!==null?<span>Stock: {row.availStock}</span>:null}
                            </div>
                          )}
                        </td>
                        <td className="td-desc"><input className="dc-input" value={row.description} onChange={e=>onUpdateRow(row._id,'description',e.target.value)} placeholder="description" disabled={submitted}/></td>
                        <td className="td-qty"><input type="number" className={`dc-input dc-num ${overStock?'input-danger':''}`} value={row.quantity} onChange={e=>onUpdateRow(row._id,'quantity',e.target.value)} placeholder="0" min="0" disabled={submitted}/></td>
                        <td className="td-rate"><input type="number" className="dc-input dc-num" value={row.rate} onChange={e=>onUpdateRow(row._id,'rate',e.target.value)} placeholder="0.00" disabled={submitted}/></td>
                        <td className="td-rem"><input className="dc-input" value={row.remarks} onChange={e=>onUpdateRow(row._id,'remarks',e.target.value)} placeholder="remarks" disabled={submitted}/></td>
                        <td className="td-act"><button className="dc-del" onClick={()=>onRemoveRow(row._id)} disabled={sec.rows.length===1||submitted}><FiTrash2 size={12}/></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sec.supplier&&!submitted&&(
            <div className="dc-table-footer">
              <button className="dc-add-row-btn" onClick={onAddRow}><FiPlus size={13}/> Add Row</button>
              {filledRows.length>0&&<span style={{fontSize:12,color:'#64748b'}}>{filledRows.length} item{filledRows.length>1?'s':''} ready</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PRODUCT SEARCH CELL
// ════════════════════════════════════════════════════════════════
function ProductSearchCell({ products, selectedId, onSelect, disabled }) {
  const [q,setQ]=useState(''); const [show,setShow]=useState(false); const r=useRef(null);
  const selected=products.find(p=>String(p.productId)===String(selectedId));
  useEffect(()=>{ const h=(e)=>{if(r.current&&!r.current.contains(e.target))setShow(false);}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[]);
  const filtered=useMemo(()=>{ const qu=q.toLowerCase().trim(); if(!qu) return products.slice(0,50); return products.filter(p=>p.description?.toLowerCase().includes(qu)||p.partNumber?.toLowerCase().includes(qu)||p.category?.toLowerCase().includes(qu)).slice(0,30); },[products,q]);
  const handleSelect=(prod)=>{ onSelect(prod.productId); setQ(''); setShow(false); };
  const handleClear=(e)=>{ e.stopPropagation(); onSelect(''); setQ(''); setShow(false); };
  return (
    <div className="dc-prod-search" ref={r}>
      {selected?(
        <div className="dc-prod-selected" onClick={()=>!disabled&&setShow(true)}>
          <div className="dc-prod-sel-name">{selected.partNumber&&<span className="dc-pn-badge">{selected.partNumber}</span>}<span>{selected.description}</span></div>
          {!disabled&&<button className="dc-prod-clear" onClick={handleClear}><FiX size={11}/></button>}
        </div>
      ):(
        <div className="dc-search-wrap">
          <FiSearch size={12} className="dc-search-ico"/>
          <input className="dc-input dc-input-pl dc-prod-input" value={q} onChange={e=>{setQ(e.target.value);setShow(true);}} onFocus={()=>setShow(true)} placeholder={disabled?'— select supplier first —':'Search product…'} disabled={disabled} autoComplete="off"/>
        </div>
      )}
      {show&&!disabled&&filtered.length>0&&(
        <div className="dc-prod-drop">
          {filtered.map(p=>(
            <div key={p.productId} className="dc-prod-dd-item" onMouseDown={()=>handleSelect(p)}>
              <div className="dc-prod-dd-top">{p.partNumber&&<span className="dc-pn-badge">{p.partNumber}</span>}<span className="dc-prod-dd-name">{p.description}</span></div>
              <div className="dc-prod-dd-meta">{p.category&&<span className="dc-prod-cat">{p.category}</span>}<span className="dc-prod-stock">Stock: {p.totalStock}</span>{p.unitPrice>0&&<span className="dc-prod-price">₹{fmtNum(p.unitPrice)}</span>}</div>
            </div>
          ))}
        </div>
      )}
      {show&&!disabled&&filtered.length===0&&q&&(
        <div className="dc-prod-drop"><div style={{padding:'10px 12px',color:'#94a3b8',fontSize:12}}>No products found</div></div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CHALLAN DOCUMENT
// ════════════════════════════════════════════════════════════════
function ChallanDoc({ challanNo, challanDate, toName, toAddress, tinNo, basis, rows, preview }) {
  const MIN_ROWS=preview?6:10; const printRows=[...rows];
  while(printRows.length<MIN_ROWS) printRows.push({_id:`pad-${printRows.length}`,description:'',quantity:'',rate:'',remarks:''});
  return (
    <div className={`challan-doc ${preview?'challan-preview':''}`}>
      <div className="ch-header">
        <div className="ch-logo-col"><div className="ch-brand">Thinture<sup>®</sup></div><div className="ch-tagline">Think Future</div></div>
        <div className="ch-company-col">
          <div className="ch-company-name">Thinture Technologies Pvt. Ltd.,</div>
          <div className="ch-company-addr">No. 508, 2nd Floor, 2nd Block, 8th Main, HMT Layout, Vidyaranayapura, Bangalore – 560 097</div>
          <div className="ch-company-phone">Phone: +91 80 2364 6920 / 4166 6965</div>
        </div>
      </div>
      <div className="ch-title-row"><div className="ch-title">DELIVERY CHALLAN</div><div className="ch-gstin">GSTIN: 29AADCT9485G1ZP</div></div>
      <div className="ch-meta">
        <div className="ch-to-box">
          <div className="ch-to-label">To,</div>
          <div className="ch-to-label">M/s. <strong>{toName||'\u00A0'}</strong></div>
          {toAddress&&<div className="ch-to-addr">{toAddress}</div>}
        </div>
        <div className="ch-ref-box">
          <div className="ch-ref-row"><span className="ch-ref-label">Challan No.:</span><span className="ch-ref-val ch-challan-no">{challanNo}</span></div>
          <div className="ch-ref-row" style={{marginTop:6}}><span className="ch-ref-label">Date :</span><span className="ch-ref-val">{fmtDate(challanDate)}</span></div>
        </div>
      </div>
      <div className="ch-tin-row"><span className="ch-tin-label">TIN No. / GSTIN:</span><span className="ch-tin-val">{tinNo||'\u00A0'}</span></div>
      <div className="ch-basis-row">Please receive the following goods on <strong>{basis||'returnable'}</strong> basis.</div>
      <table className="ch-table">
        <thead><tr>
          <th className="ch-th ch-th-sl">SL. No.</th>
          <th className="ch-th ch-th-desc">Description</th>
          <th className="ch-th ch-th-qty">Quantity</th>
          <th className="ch-th ch-th-rate">Rate</th>
          <th className="ch-th ch-th-rem">Remarks</th>
        </tr></thead>
        <tbody>
          {printRows.map((row,idx)=>{ const hasProd=row.description||row.productId; return (
            <tr key={row._id||idx} className="ch-tr">
              <td className="ch-td ch-td-sl">{hasProd?idx+1:''}</td>
              <td className="ch-td ch-td-desc">{row.partNumber&&<span className="ch-pn">[{row.partNumber}] </span>}{row.description||''}</td>
              <td className="ch-td ch-td-qty">{hasProd?(row.quantity||''):''}</td>
              <td className="ch-td ch-td-rate">{hasProd&&row.rate?fmtNum(row.rate):''}</td>
              <td className="ch-td ch-td-rem">{row.remarks||''}</td>
            </tr>
          );})}
        </tbody>
      </table>
      <div className="ch-footer">
        <div className="ch-footer-right">For Thinture Technologies PVT. LTD.,</div>
        <div className="ch-sig-row">
          <div className="ch-sig"><div className="ch-sig-line"/><div className="ch-sig-label">(Receiver's Signature)</div></div>
          <div className="ch-sig ch-sig-r"><div className="ch-sig-line"/><div className="ch-sig-label">Authorised Signature</div></div>
        </div>
      </div>
    </div>
  );
}