import React, { useState, useEffect, useMemo } from 'react';
import { supplierApi } from '../api/supplierApi';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX,
  FiChevronDown, FiChevronRight, FiChevronLeft,
  FiChevronsLeft, FiChevronsRight, FiPackage,
  FiExternalLink, FiArrowLeft, FiCalendar,
  FiShoppingCart, FiList
} from 'react-icons/fi';
import './Suppliers.css';

const PAGE_SIZE = 15;

const SupplierModal = ({ supplier, onClose }) => {
  const [form, setForm] = useState({
    supplierName:  supplier?.supplierName  || '',
    supplierCode:  supplier?.supplierCode  || '',
    contactPerson: supplier?.contactPerson || '',
    phone:         supplier?.phone         || '',
    email:         supplier?.email         || '',
    address:       supplier?.address       || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierName.trim()) { toast.error('Supplier name required'); return; }
    try {
      setSaving(true);
      if (supplier) {
        await supplierApi.update(supplier.supplierId, form);
        toast.success('Supplier updated!');
      } else {
        await supplierApi.create(form);
        toast.success('Supplier created!');
      }
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="sup-modal-overlay" onClick={() => onClose(false)}>
      <div className="sup-modal" onClick={e => e.stopPropagation()}>
        <div className="sup-modal-header">
          <h3>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
          <button className="sup-modal-close" onClick={() => onClose(false)}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sup-form-grid">
            <div className="sup-field">
              <label>Supplier Name *</label>
              <input value={form.supplierName} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} placeholder="e.g. Mathaji Electronics" required />
            </div>
            <div className="sup-field">
              <label>Supplier Code</label>
              <input value={form.supplierCode} onChange={e => setForm(p => ({ ...p, supplierCode: e.target.value }))} placeholder="e.g. SUP-001" />
            </div>
            <div className="sup-field">
              <label>Contact Person</label>
              <input value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} placeholder="Name" />
            </div>
            <div className="sup-field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div className="sup-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="supplier@email.com" />
            </div>
            <div className="sup-field sup-field-full">
              <label>Address</label>
              <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2} placeholder="Full address" />
            </div>
          </div>
          <div className="sup-modal-footer">
            <button type="button" className="sup-btn sup-btn-secondary" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="sup-btn sup-btn-primary" disabled={saving}>{saving ? 'Saving...' : supplier ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupplierDetail = ({ supplier, onBack }) => {
  const [history, setHistory]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('history');
  const [search, setSearch]     = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hRes, sRes] = await Promise.all([
        supplierApi.getHistory(supplier.supplierId),
        supplierApi.getProducts(supplier.supplierId),
      ]);
      setHistory(hRes.data.data || []);
      setSummary(sRes.data.data || {});
    } catch { toast.error('Failed to load supplier details'); }
    finally { setLoading(false); }
  };

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(h =>
      [h.partNumber, h.description, h.categoryName, h.lotNumber]
        .filter(Boolean).some(f => f.toLowerCase().includes(q))
    );
  }, [history, search]);

  const filteredProducts = useMemo(() => {
    if (!summary?.products) return [];
    if (!search.trim()) return summary.products;
    const q = search.toLowerCase();
    return summary.products.filter(p =>
      [p.partNumber, p.description, p.categoryName]
        .filter(Boolean).some(f => f.toLowerCase().includes(q))
    );
  }, [summary, search]);

  const fmt    = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtNum = (n) => n != null ? parseFloat(n).toLocaleString('en-IN') : '0';

  if (loading) return <div className="sup-loading">Loading...</div>;

  return (
    <div className="sup-detail-page">
      <div className="sup-detail-header">
        <button className="sup-back-btn" onClick={onBack}><FiArrowLeft size={16}/> Back to Suppliers</button>
        <div className="sup-detail-title">
          <h1>{supplier.supplierName}</h1>
          <span className="sup-code-badge">{supplier.supplierCode || 'No Code'}</span>
        </div>
        <div className="sup-detail-meta">
          {supplier.contactPerson && <span>👤 {supplier.contactPerson}</span>}
          {supplier.phone         && <span>📞 {supplier.phone}</span>}
          {supplier.email         && <span>✉️ {supplier.email}</span>}
        </div>
      </div>

      <div className="sup-summary-cards">
        <div className="sup-sum-card">
          <FiPackage size={22} style={{color:'#667eea'}}/>
          <div><span className="sup-sum-label">Total Products</span><span className="sup-sum-value">{summary?.totalProducts || 0}</span></div>
        </div>
        <div className="sup-sum-card">
          <FiShoppingCart size={22} style={{color:'#10b981'}}/>
          <div><span className="sup-sum-label">Total Purchases</span><span className="sup-sum-value">{summary?.totalLots || 0}</span></div>
        </div>
        <div className="sup-sum-card">
          <FiCalendar size={22} style={{color:'#f59e0b'}}/>
          <div><span className="sup-sum-label">Last Purchase</span><span className="sup-sum-value" style={{fontSize:'0.88rem'}}>{history.length > 0 ? fmt(history[0].purchaseDate) : '—'}</span></div>
        </div>
      </div>

      <div className="sup-tabs">
        <button className={`sup-tab ${tab==='history'?'active':''}`} onClick={() => setTab('history')}><FiList size={13}/> Purchase History</button>
        <button className={`sup-tab ${tab==='products'?'active':''}`} onClick={() => setTab('products')}><FiPackage size={13}/> Products Summary</button>
        <div className="sup-detail-search">
          <FiSearch size={13}/>
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <button onClick={() => setSearch('')}><FiX size={12}/></button>}
        </div>
      </div>

      {tab === 'history' && (
        <div className="sup-table-wrap">
          <table className="sup-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Lot No.</th><th>Category</th>
                <th>Part #</th><th>Description</th>
                <th className="num-col">Qty</th>
                <th className="num-col">Price/Unit</th>
                <th className="num-col">Total Value</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0
                ? <tr><td colSpan="10" className="sup-empty">No purchase history</td></tr>
                : filteredHistory.map((h, i) => (
                  <tr key={h.lotId}>
                    <td className="sup-row-num">{i+1}</td>
                    <td className="sup-date">{fmt(h.purchaseDate)}</td>
                    <td><span className="sup-lot-badge">{h.lotNumber}</span></td>
                    <td><span className="sup-cat-badge">{h.categoryName}</span></td>
                    <td className="sup-pn">{h.partNumber}</td>
                    <td>{h.description}</td>
                    <td className="num-col" style={{fontWeight:700}}>{fmtNum(h.quantity)}</td>
                    <td className="num-col">₹{fmtNum(h.purchasePrice)}</td>
                    <td className="num-col" style={{fontWeight:700,color:'#10b981'}}>₹{fmtNum(h.totalValue)}</td>
                    <td style={{fontSize:'11px',color:'#94a3b8'}}>{h.rackName?`${h.rackName}/${h.boxLabel||''}` : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'products' && (
        <div className="sup-table-wrap">
          <table className="sup-table">
            <thead>
              <tr>
                <th>#</th><th>Category</th><th>Part #</th><th>Description</th>
                <th className="num-col">Total Qty</th>
                <th className="num-col">Total Value</th>
                <th className="num-col">Purchases</th>
                <th>Last Purchase</th>
                <th className="num-col">Last Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0
                ? <tr><td colSpan="9" className="sup-empty">No products found</td></tr>
                : filteredProducts.map((p, i) => (
                  <tr key={p.productId}>
                    <td className="sup-row-num">{i+1}</td>
                    <td><span className="sup-cat-badge">{p.categoryName}</span></td>
                    <td className="sup-pn">{p.partNumber}</td>
                    <td>{p.description}</td>
                    <td className="num-col" style={{fontWeight:700}}>{fmtNum(p.totalQtyBought)}</td>
                    <td className="num-col" style={{fontWeight:700,color:'#10b981'}}>₹{fmtNum(p.totalValue)}</td>
                    <td className="num-col"><span className="sup-count-badge">{p.purchaseCount}x</span></td>
                    <td className="sup-date">{fmt(p.lastPurchaseDate)}</td>
                    <td className="num-col">₹{fmtNum(p.lastPurchasePrice)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Suppliers = () => {
  const [suppliers, setSuppliers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [expanded, setExpanded]     = useState({});
  const [expandData, setExpandData] = useState({});
  const [expandLoading, setExpandLoading] = useState({});
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const load = async () => {
    try { setLoading(true); const r = await supplierApi.getAll(); setSuppliers(r.data.data || []); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      [s.supplierName, s.supplierCode, s.contactPerson, s.phone, s.email]
        .filter(Boolean).some(f => f.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE);
  const goTo       = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const pageNums   = () => {
    const pages=[]; let s=Math.max(1,safePage-2),e=Math.min(totalPages,s+4);
    if(e-s<4) s=Math.max(1,e-4); for(let i=s;i<=e;i++) pages.push(i); return pages;
  };

  const toggleExpand = async (id) => {
    const next = !expanded[id];
    setExpanded(p => ({ ...p, [id]: next }));
    if (next && !expandData[id]) {
      setExpandLoading(p => ({ ...p, [id]: true }));
      try { const r = await supplierApi.getProducts(id); setExpandData(p => ({ ...p, [id]: r.data.data })); }
      catch { toast.error('Failed to load products'); }
      finally { setExpandLoading(p => ({ ...p, [id]: false })); }
    }
  };

  const fmt    = (d) => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—';
  const fmtNum = (n) => n != null ? parseFloat(n).toLocaleString('en-IN') : '0';

  if (detail) return <SupplierDetail supplier={detail} onBack={() => setDetail(null)} />;
  if (loading) return <div className="sup-loading">Loading suppliers...</div>;

  return (
    <div className="suppliers-page">
      <div className="sup-header">
        <div><h1>Suppliers</h1><p>{filtered.length} of {suppliers.length} suppliers</p></div>
        <button className="sup-btn sup-btn-primary" onClick={() => { setSelected(null); setShowModal(true); }}>
          <FiPlus size={14}/> Add Supplier
        </button>
      </div>

      <div className="sup-search-bar">
        <FiSearch size={14} className="sup-search-icon"/>
        <input placeholder="Search by name, code, contact, phone..." value={search} onChange={e => setSearch(e.target.value)}/>
        {search && <button className="sup-search-clear" onClick={() => setSearch('')}><FiX size={13}/></button>}
      </div>

      <div className="sup-table-wrap">
        <table className="sup-table">
          <thead>
            <tr>
              <th style={{width:40}}>#</th>
              <th>Code</th>
              <th>Supplier Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Status</th>
              <th style={{width:180}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan="7" className="sup-empty"><FiPackage size={36}/><br/>No suppliers found</td></tr>
            ) : paged.map((s, idx) => (
              <React.Fragment key={s.supplierId}>
                <tr className="sup-main-row">
                  <td className="sup-row-num">{(safePage-1)*PAGE_SIZE+idx+1}</td>
                  <td><span className="sup-code-badge">{s.supplierCode || '—'}</span></td>
                  <td><strong>{s.supplierName}</strong></td>
                  <td>{s.contactPerson || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td><span className={`sup-status ${s.isActive?'active':'inactive'}`}>{s.isActive?'Active':'Inactive'}</span></td>
                  <td>
                    <div className="sup-actions">
                      <button className={`sup-expand-btn ${expanded[s.supplierId]?'open':''}`}
                        onClick={() => toggleExpand(s.supplierId)} title="View products">
                        {expanded[s.supplierId] ? <FiChevronDown size={13}/> : <FiChevronRight size={13}/>}
                        Products
                      </button>
                      <button className="sup-icon-btn sup-icon-detail" title="Full details" onClick={() => setDetail(s)}><FiExternalLink size={13}/></button>
                      <button className="sup-icon-btn" title="Edit" onClick={() => { setSelected(s); setShowModal(true); }}><FiEdit2 size={13}/></button>
                      <button className="sup-icon-btn sup-icon-danger" title="Delete"
                        onClick={async () => {
                          if (!window.confirm('Delete supplier?')) return;
                          try { await supplierApi.delete(s.supplierId); toast.success('Deleted'); load(); }
                          catch { toast.error('Failed to delete'); }
                        }}><FiTrash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
                {expanded[s.supplierId] && (
                  <tr className="sup-expand-row">
                    <td colSpan="7">
                      {expandLoading[s.supplierId] ? (
                        <div className="sup-expand-loading">Loading products...</div>
                      ) : !expandData[s.supplierId]?.products?.length ? (
                        <div className="sup-expand-empty">No products purchased from this supplier yet.</div>
                      ) : (
                        <div className="sup-product-tree">
                          <div className="sup-tree-header">
                            <span>📦 {expandData[s.supplierId].totalProducts} products · {expandData[s.supplierId].totalLots} purchases total</span>
                            <button className="sup-view-all-btn" onClick={() => setDetail(s)}><FiExternalLink size={12}/> View Full History</button>
                          </div>
                          <div className="sup-tree-grid">
                            {expandData[s.supplierId].products.map(p => (
                              <div key={p.productId} className="sup-tree-card">
                                <div className="sup-tree-card-top">
                                  <span className="sup-cat-badge">{p.categoryName}</span>
                                  <span className="sup-count-badge">{p.purchaseCount}x</span>
                                </div>
                                <div className="sup-tree-pn">{p.partNumber}</div>
                                <div className="sup-tree-desc">{p.description}</div>
                                <div className="sup-tree-stats">
                                  <span>Total: <strong>{fmtNum(p.totalQtyBought)} pcs</strong></span>
                                  <span style={{color:'#10b981'}}>₹{fmtNum(p.totalValue)}</span>
                                </div>
                                <div className="sup-tree-date">Last: {fmt(p.lastPurchaseDate)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="sup-pagination">
          <div className="sup-pg-info">Showing {(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filtered.length)} of {filtered.length}</div>
          <div className="sup-pg-controls">
            <button className="sup-pg-btn" onClick={()=>goTo(1)} disabled={safePage===1}><FiChevronsLeft size={13}/></button>
            <button className="sup-pg-btn" onClick={()=>goTo(safePage-1)} disabled={safePage===1}><FiChevronLeft size={13}/></button>
            {pageNums().map(p=><button key={p} className={`sup-pg-btn sup-pg-num ${p===safePage?'active':''}`} onClick={()=>goTo(p)}>{p}</button>)}
            <button className="sup-pg-btn" onClick={()=>goTo(safePage+1)} disabled={safePage===totalPages}><FiChevronRight size={13}/></button>
            <button className="sup-pg-btn" onClick={()=>goTo(totalPages)} disabled={safePage===totalPages}><FiChevronsRight size={13}/></button>
          </div>
          <div className="sup-pg-jump">
            <span>Go to</span>
            <input type="number" min="1" max={totalPages} placeholder={safePage}
              onKeyDown={e=>{if(e.key==='Enter') goTo(parseInt(e.target.value));}}/>
            <span>of {totalPages}</span>
          </div>
        </div>
      )}

      {showModal && <SupplierModal supplier={selected} onClose={(r)=>{ setShowModal(false); setSelected(null); if(r) load(); }}/>}
    </div>
  );
};

export default Suppliers;