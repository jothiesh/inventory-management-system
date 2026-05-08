import React, { useState, useEffect, useMemo } from 'react';
import { stockApi } from '../api/stockApi';
import { toast } from 'react-toastify';
import {
  FiTrendingDown, FiInfo, FiAlertTriangle, FiCheckCircle,
  FiLayers, FiDollarSign, FiBox,
  FiSearch, FiX, FiGrid, FiList, FiCheck, FiCpu, FiMapPin,
  FiBarChart2, FiZap, FiArrowRight, FiShield, FiRefreshCw,
  FiTag, FiHash, FiFilter, FiActivity, FiAlignLeft
} from 'react-icons/fi';
import './StockOut.css';

const StockOut = () => {
  const [formData, setFormData] = useState({
    productId: '', quantity: '', transactionType: 'Production',
    referenceNumber: '', notes: '',
  });
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentStock, setCurrentStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [insufficientStock, setInsufficientStock] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeCategory, setActiveCategory] = useState('all');
  const [step, setStep] = useState(1);

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (formData.productId) loadProductStock(formData.productId);
    else { setCurrentStock(null); setSelectedProduct(null); }
  }, [formData.productId]);

  useEffect(() => {
    if (currentStock && formData.quantity)
      setInsufficientStock(parseFloat(formData.quantity) > parseFloat(currentStock.totalStock || 0));
    else setInsufficientStock(false);
  }, [formData.quantity, currentStock]);

  const categories = useMemo(() => {
    const s = new Set();
    // ✅ use categoryName directly from StockedProductResponse
    products.forEach(p => { if (p.categoryName) s.add(p.categoryName); });
    return ['all', ...Array.from(s)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let f = products;
    // ✅ filter using flat fields from StockedProductResponse
    if (activeCategory !== 'all') f = f.filter(p => p.categoryName === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(p => [p.partNumber, p.description, p.packageType,
        p.categoryName, p.supplierName, p.rackName, p.boxLabel]
        .filter(Boolean).some(v => v.toLowerCase().includes(q)));
    }
    return f;
  }, [products, searchQuery, activeCategory]);

  // ✅ Load only stocked products (stock > 0) using getStockedProducts
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await stockApi.getStockedProducts();
      setProducts(res.data.data || []);
    } catch { toast.error('Failed to load products'); setProducts([]); }
    finally { setLoadingProducts(false); }
  };

  const loadProductStock = async (productId) => {
    try {
      const res = await stockApi.getCurrentStock(productId);
      const sd = res.data.data;
      setCurrentStock(sd);
      setSelectedProduct(products.find(p => p.productId === parseInt(productId)));
      if (!sd || parseFloat(sd?.totalStock || 0) <= 0) toast.warning('No stock available!');
    } catch { setCurrentStock(null); toast.error('Failed to load stock'); }
  };

  const handleProductSelect = (product) => {
    if (selectedProduct?.productId === product.productId) { resetProductSelection(); return; }
    setFormData({ ...formData, productId: product.productId, quantity: '' });
    setStep(2);
  };

  const resetProductSelection = () => {
    setFormData({ ...formData, productId: '', quantity: '' });
    setSelectedProduct(null); setCurrentStock(null); setInsufficientStock(false); setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = parseFloat(currentStock?.totalStock || 0);
    if (!currentStock || total <= 0) { toast.error('No stock available!'); return; }
    if (parseFloat(formData.quantity) > total) { toast.error(`Insufficient! Available: ${total}`); return; }
    if (parseFloat(formData.quantity) <= 0) { toast.error('Quantity must be > 0'); return; }
    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    setLoading(true); setShowConfirmation(false);
    try {
      await stockApi.stockOut({
        productId: parseInt(formData.productId), quantity: parseFloat(formData.quantity),
        transactionType: formData.transactionType, referenceNumber: formData.referenceNumber, notes: formData.notes,
      });
      toast.success('Stock issued successfully!', { position: 'top-center', autoClose: 3000 });
      resetForm();
      loadProducts(); // ✅ refresh list after stock out
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to issue stock'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ productId: '', quantity: '', transactionType: 'Production', referenceNumber: '', notes: '' });
    setSelectedProduct(null); setCurrentStock(null); setInsufficientStock(false);
    setSearchQuery(''); setActiveCategory('all'); setStep(1);
  };

  const quickFill = (pct) => {
    if (currentStock?.totalStock)
      setFormData({ ...formData, quantity: (parseFloat(currentStock.totalStock) * pct / 100).toFixed(2) });
  };

  const getTxCfg = (type) => ({
    Production: { icon: '🏭', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
    Sale:       { icon: '💰', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    Damage:     { icon: '⚠️', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    Scrap:      { icon: '🗑️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  }[type] || { icon: '📦', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' });

  const hl = (text, q) => {
    if (!q.trim() || !text) return text;
    const rx = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(rx).map((p, i) => rx.test(p) ? <mark key={i} className="hl">{p}</mark> : p);
  };

  const stockPct = currentStock && formData.quantity
    ? Math.min(100, (parseFloat(formData.quantity) / parseFloat(currentStock.totalStock || 1)) * 100) : 0;
  const remaining = currentStock && formData.quantity
    ? Math.max(0, parseFloat(currentStock.totalStock || 0) - parseFloat(formData.quantity || 0)) : null;

  return (
    <div className="so">

      {/* HEADER */}
      <header className="so-hdr">
        <div className="so-hdr-l">
          <div className="so-hdr-ico"><FiTrendingDown /></div>
          <div>
            <h1 className="so-h1">Stock <span>OUT</span></h1>
            <p className="so-sub">Issue inventory · FIFO auto-applied</p>
          </div>
        </div>
        <div className="so-hdr-r">
          {currentStock && (
            <div className="so-avail-pill">
              <FiBarChart2 />
              <div>
                <small>Available</small>
                <strong>{parseFloat(currentStock.totalStock || 0).toFixed(2)}</strong>
              </div>
            </div>
          )}
          <button className="so-icon-btn" onClick={loadProducts}><FiRefreshCw /></button>
        </div>
      </header>

      {/* STEPPER */}
      <div className="so-stepper">
        {[['Select Product',1],['Issue Details',2],['Confirm',3]].map(([lbl,n]) => (
          <React.Fragment key={n}>
            <div className={`so-step ${step>=n?'active':''} ${step>n?'done':''}`}>
              <div className="so-step-dot">{step>n?<FiCheck size={12}/>:n}</div>
              <span>{lbl}</span>
            </div>
            {n<3 && <div className={`so-step-line ${step>n?'done':''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* MAIN */}
      <div className="so-body">

        {/* LEFT */}
        <section className="so-card-box">
          <div className="so-box-hd">
            <div className="so-box-title"><FiBox />{selectedProduct?'Selected Product':'Choose a Product'}</div>
            {selectedProduct && <button className="so-chg-btn" onClick={resetProductSelection}><FiX size={13}/>Change</button>}
          </div>

          {!selectedProduct ? (
            <div className="so-search-zone">
              <div className="so-search-row">
                <div className="so-search-wrap">
                  <FiSearch className="so-s-ico" />
                  <input className="so-s-inp" type="text" value={searchQuery}
                    onChange={e=>setSearchQuery(e.target.value)}
                    placeholder="Search part number, description, category…" autoFocus />
                  {searchQuery && <button className="so-s-clr" onClick={()=>setSearchQuery('')}><FiX/></button>}
                </div>
                <div className="so-vmode">
                  <button className={`so-vm-btn ${viewMode==='grid'?'on':''}`} onClick={()=>setViewMode('grid')}><FiGrid/></button>
                  <button className={`so-vm-btn ${viewMode==='list'?'on':''}`} onClick={()=>setViewMode('list')}><FiList/></button>
                </div>
              </div>

              <div className="so-chips">
                {categories.map(c=>(
                  <button key={c} className={`so-chip ${activeCategory===c?'on':''}`} onClick={()=>setActiveCategory(c)}>
                    {c==='all'?'All Products':c}
                    {/* ✅ count using categoryName */}
                    {c!=='all'&&<span>{products.filter(p=>p.categoryName===c).length}</span>}
                  </button>
                ))}
              </div>

              <div className="so-count">
                <FiFilter size={12}/><b>{filteredProducts.length}</b> product{filteredProducts.length!==1?'s':''}
                {searchQuery&&<span>for "<b>{searchQuery}</b>"</span>}
              </div>

              {loadingProducts ? (
                <div className={`so-pg ${viewMode==='list'?'lv':''}`}>
                  {[1,2,3,4,5,6].map(i=><div key={i} className="so-skel"/>)}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className={`so-pg ${viewMode==='list'?'lv':''}`}>
                  {filteredProducts.map(p=>(
                    <div key={p.productId} className="so-pc" onClick={()=>handleProductSelect(p)}>
                      <div className="so-pc-top">
                        <div className="so-pc-pn"><FiCpu className="so-cpu-ico"/>{hl(p.partNumber,searchQuery)}</div>
                        {/* ✅ use categoryName directly */}
                        {p.categoryName&&<span className="so-pc-cat-badge">{hl(p.categoryName,searchQuery)}</span>}
                      </div>
                      <p className="so-pc-desc">{hl(p.description,searchQuery)}</p>
                      <div className="so-pc-tags">
                        {p.packageType&&<span className="so-ptag"><FiLayers size={10}/>{hl(p.packageType,searchQuery)}</span>}
                        {p.unitPrice!=null&&<span className="so-ptag price"><FiDollarSign size={10}/>₹{p.unitPrice.toFixed(2)}</span>}
                      </div>
                      {/* ✅ use rackName/boxLabel directly */}
                      <div className="so-pc-loc"><FiMapPin size={11}/>{p.rackName||'—'} / {p.boxLabel||'—'}</div>
                      {/* ✅ show current stock qty on card */}
                      <div className="so-pc-stock">
                        <FiBarChart2 size={11}/>
                        <span className={p.stockStatus==='LOW_STOCK'?'low':'ok'}>
                          {p.totalStock} units {p.stockStatus==='LOW_STOCK'&&<span className="low-badge">Low</span>}
                        </span>
                      </div>
                      <span className="so-pc-arr"><FiArrowRight/></span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="so-empty">
                  <div className="so-empty-ico"><FiSearch/></div>
                  <h4>No stocked products found</h4>
                  <p>{searchQuery ? 'Try different keywords' : 'No products with stock available'}</p>
                  {searchQuery&&<button className="so-empty-btn" onClick={()=>{setSearchQuery('');setActiveCategory('all');}}>Clear Filters</button>}
                </div>
              )}
            </div>
          ) : (
            <div className="so-prod-detail">
              <div className={`so-status-bar ${parseFloat(currentStock?.totalStock||0)>0?'ok':'bad'}`}>
                {parseFloat(currentStock?.totalStock||0)>0
                  ?<><FiCheckCircle/><span>Stock Available</span></>
                  :<><FiAlertTriangle/><span>Out of Stock</span></>
                }
                <span className="so-qty-badge">{parseFloat(currentStock?.totalStock||0).toFixed(2)} units</span>
              </div>

              <div className="so-dg">
                <div className="so-di"><span className="so-dk"><FiHash size={11}/> Part No.</span><span className="so-dv mono">{selectedProduct.partNumber}</span></div>
                {/* ✅ use categoryName directly */}
                <div className="so-di"><span className="so-dk"><FiTag size={11}/> Category</span><span className="so-dv"><span className="cat-badge">{selectedProduct.categoryName||'—'}</span></span></div>
                <div className="so-di full"><span className="so-dk"><FiAlignLeft size={11}/> Description</span><span className="so-dv">{selectedProduct.description}</span></div>
                <div className="so-di"><span className="so-dk"><FiBarChart2 size={11}/> Stock</span><span className={`so-dv big ${parseFloat(currentStock?.totalStock||0)>0?'green':'red'}`}>{parseFloat(currentStock?.totalStock||0).toFixed(2)}</span></div>
                <div className="so-di"><span className="so-dk"><FiShield size={11}/> Min Level</span><span className="so-dv">{selectedProduct.minStockLevel||'Not set'}</span></div>
                <div className="so-di"><span className="so-dk"><FiLayers size={11}/> Lots</span><span className="so-dv">{currentStock?.lots?.length||0}</span></div>
                {/* ✅ use rackName/boxLabel directly */}
                <div className="so-di full"><span className="so-dk"><FiMapPin size={11}/> Location</span><span className="so-dv">{selectedProduct.rackName||'—'} / {selectedProduct.boxLabel||'—'}</span></div>
              </div>

              {currentStock?.lots?.length>0&&(
                <div className="so-lots-box">
                  <div className="so-lots-hd">
                    <FiLayers className="lots-ico"/><span>FIFO Lot Breakdown</span>
                    <span className="lots-badge">{currentStock.lots.length} lots</span>
                  </div>
                  <div className="so-lots-list">
                    {currentStock.lots.map((lot,idx)=>(
                      <div key={lot.lotId} className="so-lot">
                        <div className="so-lot-n">#{idx+1}</div>
                        <div className="so-lot-info">
                          <div className="so-lot-row"><span className="lk">Lot</span><span className="lv mono">{lot.lotNumber||'N/A'}</span></div>
                          <div className="so-lot-row"><span className="lk">Qty</span><span className="lv bold">{parseFloat(lot.remainingQuantity||0).toFixed(2)}</span></div>
                          <div className="so-lot-row"><span className="lk">Price</span><span className="lv green">₹{parseFloat(lot.purchasePrice||0).toFixed(2)}</span></div>
                          <div className="so-lot-row"><span className="lk">Date</span><span className="lv muted">{lot.purchaseDate?new Date(lot.purchaseDate).toLocaleDateString():'N/A'}</span></div>
                        </div>
                        <div className="so-lot-bar"><div className="so-lot-bar-fill" style={{width:`${Math.min(100,(parseFloat(lot.remainingQuantity||0)/parseFloat(currentStock.totalStock||1))*100)}%`}}/></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT */}
        <div className="so-right">
          {selectedProduct&&currentStock&&parseFloat(currentStock.totalStock||0)>0&&(
            <section className="so-card-box">
              <div className="so-box-hd">
                <div className="so-box-title"><FiZap className="red-ico"/>Issue Details</div>
              </div>
              <form onSubmit={handleSubmit} className="so-form">

                <div className="so-field">
                  <label className="so-lbl"><FiBox className="lico"/>Quantity to Issue<span className="req">*</span></label>
                  <input type="number" step="0.01" value={formData.quantity}
                    onChange={e=>setFormData({...formData,quantity:e.target.value})}
                    placeholder="0.00" className={`so-inp big ${insufficientStock?'err':''}`}
                    required max={currentStock.totalStock}/>
                  <div className="so-qbtns">
                    {[25,50,75,100].map(p=>(
                      <button key={p} type="button" className="so-qbtn" onClick={()=>quickFill(p)}>
                        {p===100?'All':`${p}%`}
                      </button>
                    ))}
                  </div>
                  {formData.quantity&&(
                    <div className="so-meter">
                      <div className="so-mbar"><div className={`so-mfill ${insufficientStock?'err':''}`} style={{width:`${Math.min(100,stockPct)}%`}}/></div>
                      <div className="so-mlbls">
                        <span className={insufficientStock?'red':'green'}>
                          {insufficientStock?`⚠ Exceeds available (${parseFloat(currentStock.totalStock).toFixed(2)})`:`✓ ${stockPct.toFixed(1)}% of stock`}
                        </span>
                        {remaining!==null&&!insufficientStock&&<span className="muted">Remaining: {remaining.toFixed(2)}</span>}
                      </div>
                    </div>
                  )}
                  {!formData.quantity&&<p className="so-hint"><FiInfo size={12}/>Max: {parseFloat(currentStock.totalStock).toFixed(2)} units</p>}
                </div>

                <div className="so-field">
                  <label className="so-lbl"><FiActivity className="lico"/>Transaction Type<span className="req">*</span></label>
                  <div className="so-tx-grid">
                    {['Production','Sale','Damage','Scrap'].map(type=>{
                      const cfg=getTxCfg(type); const on=formData.transactionType===type;
                      return(
                        <label key={type} className={`so-tx-card ${on?'on':''}`}
                          style={on?{background:cfg.bg,borderColor:cfg.border}:{}}>
                          <input type="radio" name="transactionType" value={type}
                            checked={on} onChange={e=>setFormData({...formData,transactionType:e.target.value})}/>
                          <span className="tx-ico">{cfg.icon}</span>
                          <span className="tx-lbl" style={on?{color:cfg.color}:{}}>{type}</span>
                          {on&&<span className="tx-chk" style={{background:cfg.color}}><FiCheck size={9}/></span>}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="so-field">
                  <label className="so-lbl"><FiHash className="lico"/>Work Order / Reference<span className="opt">optional</span></label>
                  <input type="text" value={formData.referenceNumber}
                    onChange={e=>setFormData({...formData,referenceNumber:e.target.value})}
                    placeholder="e.g. WO-001, SO-123" className="so-inp"/>
                </div>

                <div className="so-field">
                  <label className="so-lbl"><FiAlignLeft className="lico"/>Notes<span className="opt">optional</span></label>
                  <textarea value={formData.notes}
                    onChange={e=>setFormData({...formData,notes:e.target.value})}
                    placeholder="Additional context…" className="so-textarea" rows={3}/>
                </div>

                <div className="so-form-btns">
                  <button type="button" className="so-ghost-btn" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="so-issue-btn" disabled={loading||insufficientStock||!formData.quantity}>
                    {loading?<><FiRefreshCw className="spin"/>Processing…</>:<><FiTrendingDown/>Issue Stock</>}
                  </button>
                </div>
              </form>
            </section>
          )}

          <div className="so-sidebar">
            <div className="so-card-box">
              <div className="so-box-hd"><div className="so-box-title"><FiInfo/>How It Works</div></div>
              <ol className="so-how-list">
                {[['Search','Find stocked products only'],['Check Stock','View qty & lots'],['Enter Qty','Amount to issue'],['FIFO Applied','Oldest stock first']].map(([t,d],i)=>(
                  <li key={i}><div className="how-n">{i+1}</div><div><b>{t}</b><span>{d}</span></div></li>
                ))}
              </ol>
            </div>

            <div className="so-card-box">
              <div className="so-box-hd purple-hd"><div className="so-box-title"><FiLayers/>FIFO System</div></div>
              <ul className="so-fifo-list">
                {['Oldest stock issued first','Spans multiple lots','Prevents stock expiry','Accurate cost tracking'].map(t=>(
                  <li key={t}><FiZap size={12}/>{t}</li>
                ))}
              </ul>
            </div>

            {currentStock&&selectedProduct&&(
              <div className="so-card-box">
                <div className="so-box-hd green-hd"><div className="so-box-title"><FiBarChart2/>Stock Overview</div></div>
                <div className="so-ov-body">
                  {[
                    ['Total Stock',parseFloat(currentStock.totalStock||0).toFixed(2),'green'],
                    ['Active Lots',currentStock.lots?.length||0,''],
                    ['Min Level',selectedProduct.minStockLevel||'—',''],
                    ...(formData.quantity&&!insufficientStock?[['After Issue',remaining?.toFixed(2),'orange']]:[] ),
                  ].map(([k,v,cls])=>(
                    <div key={k} className="so-ov-row">
                      <span>{k}</span><span className={`ov-val ${cls}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showConfirmation&&selectedProduct&&currentStock&&(
        <div className="so-overlay" onClick={()=>setShowConfirmation(false)}>
          <div className="so-modal" onClick={e=>e.stopPropagation()}>
            <div className="so-modal-ico"><FiTrendingDown/></div>
            <h3>Confirm Stock Issue</h3>
            <p className="so-modal-sub">Please review before confirming</p>
            <div className="so-modal-tbl">
              {[
                ['Product',`${selectedProduct.partNumber||'—'} — ${selectedProduct.description||'—'}`],
                ['Quantity',`${formData.quantity} units`],
                ['Transaction',formData.transactionType],
                ['After Issue',`${(parseFloat(currentStock.totalStock||0)-parseFloat(formData.quantity)).toFixed(2)} units`],
                ...(formData.referenceNumber?[['Reference',formData.referenceNumber]]:[]),
              ].map(([k,v])=>(
                <div key={k} className="so-m-row"><span>{k}</span><span>{v}</span></div>
              ))}
            </div>
            <div className="so-m-warn"><FiAlertTriangle/>Stock deducted via FIFO</div>
            <div className="so-m-actions">
              <button className="so-ghost-btn" onClick={()=>setShowConfirmation(false)}>Cancel</button>
              <button className="so-issue-btn" onClick={confirmSubmit}><FiCheck/>Confirm & Issue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockOut;