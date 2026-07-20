import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supplierApi } from '../api/supplierApi';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiPackage, FiCalendar, FiDollarSign,
  FiMapPin, FiHash, FiTrendingUp, FiTrendingDown, FiLoader, FiSearch, FiX,
  FiActivity, FiShoppingBag,
} from 'react-icons/fi';
import './SupplierDetail.css';

const SupplierDetail = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [supplier,  setSupplier]  = useState(null);
  const [details,   setDetails]   = useState([]);   // purchases (Stock IN lots)
  const [movements, setMovements] = useState([]);   // ★ all IN/OUT movements
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [tab,       setTab]       = useState('purchases'); // 'purchases' | 'movements'

  useEffect(() => { loadAll(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async () => {
    try {
      setLoading(true);
      const [supRes, detRes, movRes] = await Promise.all([
        supplierApi.getById(id),
        supplierApi.getPurchaseDetails(id),
        supplierApi.getMovements(id),
      ]);
      setSupplier(supRes.data.data);
      setDetails(detRes.data.data || []);
      setMovements(movRes.data.data || []);
    } catch { toast.error('Failed to load supplier details'); }
    finally { setLoading(false); }
  };

  // ── Purchases tab filter ──
  const filtered = details.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [d.partNumber, d.description, d.categoryName, d.lotNumber, d.referenceNumber]
      .filter(Boolean).some(f => f.toLowerCase().includes(q));
  });

  // ── Movements tab filter ──
  const filteredMovements = movements.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [m.partNumber, m.description, m.categoryName, m.lotNumber, m.referenceNumber, m.transactionType, m.movementType]
      .filter(Boolean).some(f => f.toLowerCase().includes(q));
  });

  // ── Stats ──
  const totalSpent  = details.reduce((s, d) => s + Number(d.totalValue || 0), 0);
  const totalQty    = details.reduce((s, d) => s + Number(d.quantity   || 0), 0);
  const uniqueProds = new Set(details.map(d => d.productId)).size;
  const outUnits    = movements
    .filter(m => m.movementType === 'OUT' && !m.reversed)
    .reduce((s, m) => s + Number(m.quantity || 0), 0);

  const fmtDateTime = (iso) => {
    if (!iso) return '—';
    const dt = new Date(iso);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className="sd-loading"><FiLoader className="sd-spinner" size={28}/> Loading...</div>
  );

  if (!supplier) return (
    <div className="sd-loading">Supplier not found.</div>
  );

  return (
    <div className="sd-page">

      {/* Back */}
      <div className="sd-topbar">
        <button className="sd-back-btn" onClick={() => navigate('/suppliers')}>
          <FiArrowLeft size={16} /> Back to Suppliers
        </button>
      </div>

      {/* Supplier Info Card */}
      <div className="sd-info-card">
        <div className="sd-info-main">
          <div className="sd-info-avatar">{supplier.supplierName?.[0]?.toUpperCase()}</div>
          <div>
            <h1 className="sd-info-name">{supplier.supplierName}</h1>
            <div className="sd-info-meta">
              {supplier.supplierCode && <span className="sd-info-code">{supplier.supplierCode}</span>}
              {supplier.contactPerson && <span>👤 {supplier.contactPerson}</span>}
              {supplier.phone && <span>📞 {supplier.phone}</span>}
              {supplier.email && <span>✉️ {supplier.email}</span>}
              {supplier.gstnNumber && (
                <span className="sd-info-gstn">🏢 GSTN: <strong>{supplier.gstnNumber}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="sd-stats">
          <div className="sd-stat">
            <FiPackage size={18} className="sd-stat-icon" />
            <div>
              <span className="sd-stat-val">{uniqueProds}</span>
              <span className="sd-stat-lbl">Products</span>
            </div>
          </div>
          <div className="sd-stat">
            <FiTrendingUp size={18} className="sd-stat-icon" />
            <div>
              <span className="sd-stat-val">{totalQty.toLocaleString()}</span>
              <span className="sd-stat-lbl">Units IN</span>
            </div>
          </div>
          <div className="sd-stat">
            <FiTrendingDown size={18} className="sd-stat-icon red" />
            <div>
              <span className="sd-stat-val red">{outUnits.toLocaleString()}</span>
              <span className="sd-stat-lbl">Units OUT</span>
            </div>
          </div>
          <div className="sd-stat">
            <FiDollarSign size={18} className="sd-stat-icon green" />
            <div>
              <span className="sd-stat-val green">₹{totalSpent.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
              <span className="sd-stat-lbl">Total Spent</span>
            </div>
          </div>
        </div>
      </div>

      {/* ★ Tabs */}
      <div className="sd-tabs">
        <button className={`sd-tab ${tab === 'purchases' ? 'active' : ''}`}
          onClick={() => setTab('purchases')}>
          <FiShoppingBag size={13} /> Purchases (Stock IN)
          <span className="sd-tab-count">{details.length}</span>
        </button>
        <button className={`sd-tab ${tab === 'movements' ? 'active' : ''}`}
          onClick={() => setTab('movements')}>
          <FiActivity size={13} /> Stock IN / OUT Movements
          <span className="sd-tab-count">{movements.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className="sd-search-bar">
        <FiSearch size={14} className="sd-search-icon" />
        <input type="text"
          placeholder={tab === 'purchases'
            ? 'Search by part #, description, lot number...'
            : 'Search by part #, lot, type (IN/OUT/Assembly/Sale)...'}
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="sd-search-clear" onClick={() => setSearch('')}><FiX size={13}/></button>}
        <span className="sd-search-count">
          {tab === 'purchases' ? filtered.length : filteredMovements.length} entries
        </span>
      </div>

      {/* ── TAB 1: Purchase History (Stock IN lots) ── */}
      {tab === 'purchases' && (
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Part #</th>
                <th>Description</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Price/Unit</th>
                <th>Total Value</th>
                <th>Location</th>
                <th>Ref #</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="10" className="sd-empty">
                  <FiPackage size={36} />
                  <p>{search ? `No results for "${search}"` : 'No purchase history yet'}</p>
                </td></tr>
              ) : filtered.map((d, idx) => (
                <tr key={d.lotId} className="sd-table-row" style={{animationDelay:`${idx*0.02}s`}}>
                  <td className="sd-num">{idx + 1}</td>
                  <td className="sd-date">
                    <FiCalendar size={11} style={{marginRight:4,color:'#94a3b8'}}/>
                    {d.purchaseDate}
                  </td>
                  <td className="sd-part">{d.partNumber}</td>
                  <td className="sd-desc">{d.description}</td>
                  <td><span className="sd-cat-badge">{d.categoryName}</span></td>
                  <td className="sd-qty">{Number(d.quantity).toLocaleString()}</td>
                  <td className="sd-price">₹{Number(d.purchasePrice).toFixed(2)}</td>
                  <td className="sd-total">₹{Number(d.totalValue).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="sd-loc">
                    {d.rackName ? (
                      <span><FiMapPin size={11} style={{marginRight:3}}/>{d.rackName}{d.boxLabel ? ` / ${d.boxLabel}` : ''}</span>
                    ) : '-'}
                  </td>
                  <td className="sd-ref">{d.referenceNumber || '-'}</td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="sd-total-row">
                  <td colSpan="5" className="sd-total-label">Total</td>
                  <td className="sd-qty">{filtered.reduce((s,d) => s + Number(d.quantity),0).toLocaleString()}</td>
                  <td>-</td>
                  <td className="sd-total">₹{filtered.reduce((s,d) => s + Number(d.totalValue),0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── TAB 2: Stock IN / OUT Movements ── */}
      {tab === 'movements' && (
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date & Time</th>
                <th>IN/OUT</th>
                <th>Type</th>
                <th>Part #</th>
                <th>Description</th>
                <th>Lot #</th>
                <th>Qty</th>
                <th>Est. Value</th>
                <th>Ref #</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr><td colSpan="11" className="sd-empty">
                  <FiActivity size={36} />
                  <p>{search ? `No results for "${search}"` : 'No stock movements yet'}</p>
                </td></tr>
              ) : filteredMovements.map((m, idx) => {
                const isOut = m.movementType === 'OUT';
                const value = Number(m.quantity || 0) * Number(m.purchasePrice || 0);
                return (
                  <tr key={m.movementId} className={`sd-table-row ${m.reversed ? 'sd-row-reversed' : ''}`}
                    style={{animationDelay:`${idx*0.02}s`}}>
                    <td className="sd-num">{idx + 1}</td>
                    <td className="sd-date">
                      <FiCalendar size={11} style={{marginRight:4,color:'#94a3b8'}}/>
                      {fmtDateTime(m.createdAt)}
                    </td>
                    <td>
                      <span className={`sd-mv-badge ${isOut ? 'out' : 'in'}`}>
                        {isOut ? <FiTrendingDown size={10}/> : <FiTrendingUp size={10}/>}
                        {m.movementType}
                      </span>
                    </td>
                    <td><span className="sd-cat-badge">{m.transactionType === 'Semi_Finish' ? 'Semi-Finish' : m.transactionType}</span></td>
                    <td className="sd-part">{m.partNumber}</td>
                    <td className="sd-desc">{m.description}</td>
                    <td className="sd-ref">{m.lotNumber || '-'}</td>
                    <td className={`sd-qty ${isOut ? 'out' : ''}`}>
                      {isOut ? '−' : '+'}{Number(m.quantity).toLocaleString()}
                    </td>
                    <td className="sd-total">₹{value.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td className="sd-ref">{m.referenceNumber || '-'}</td>
                    <td className="sd-ref">
                      {m.createdByName || '-'}
                      {m.reversed && <span className="sd-reversed-tag">Reversed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredMovements.length > 0 && (
              <tfoot>
                <tr className="sd-total-row">
                  <td colSpan="7" className="sd-total-label">Net (IN − OUT, excl. reversed)</td>
                  <td className="sd-qty">
                    {filteredMovements
                      .filter(m => !m.reversed && m.transactionType !== 'Reversal')
                      .reduce((s,m) => s + (m.movementType === 'OUT' ? -1 : 1) * Number(m.quantity || 0), 0)
                      .toLocaleString()}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};

export default SupplierDetail;