import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supplierApi } from '../api/supplierApi';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiPackage, FiCalendar, FiDollarSign,
  FiMapPin, FiHash, FiTrendingUp, FiLoader, FiSearch, FiX
} from 'react-icons/fi';
import './SupplierDetail.css';

const SupplierDetail = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [supplier, setSupplier]   = useState(null);
  const [details,  setDetails]    = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [supRes, detRes] = await Promise.all([
        supplierApi.getById(id),
        supplierApi.getPurchaseDetails(id),
      ]);
      setSupplier(supRes.data.data);
      setDetails(detRes.data.data || []);
    } catch { toast.error('Failed to load supplier details'); }
    finally { setLoading(false); }
  };

  const filtered = details.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [d.partNumber, d.description, d.categoryName, d.lotNumber, d.referenceNumber]
      .filter(Boolean).some(f => f.toLowerCase().includes(q));
  });

  // Stats
  const totalSpent  = details.reduce((s, d) => s + Number(d.totalValue || 0), 0);
  const totalQty    = details.reduce((s, d) => s + Number(d.quantity   || 0), 0);
  const uniqueProds = new Set(details.map(d => d.productId)).size;

  if (loading) return (
    <div className="sd-loading"><FiLoader className="sd-spinner" size={28}/> Loading...</div>
  );

  if (!supplier) return (
    <div className="sd-loading">Supplier not found.</div>
  );

  return (
    <div className="sd-page">

      {/* Back + Title */}
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
            </div>
          </div>
        </div>

        {/* Stats row */}
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
              <span className="sd-stat-val">{details.length}</span>
              <span className="sd-stat-lbl">Purchases</span>
            </div>
          </div>
          <div className="sd-stat">
            <FiHash size={18} className="sd-stat-icon" />
            <div>
              <span className="sd-stat-val">{totalQty.toLocaleString()}</span>
              <span className="sd-stat-lbl">Total Units</span>
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

      {/* Search */}
      <div className="sd-search-bar">
        <FiSearch size={14} className="sd-search-icon" />
        <input type="text" placeholder="Search by part #, description, lot number..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="sd-search-clear" onClick={() => setSearch('')}><FiX size={13}/></button>}
        <span className="sd-search-count">{filtered.length} entries</span>
      </div>

      {/* Purchase History Table - latest first */}
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
    </div>
  );
};

export default SupplierDetail;
