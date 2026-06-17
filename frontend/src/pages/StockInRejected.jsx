import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiAlertTriangle, FiDownload, FiSearch, FiX,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiFileText, FiCalendar, FiUser, FiPackage, FiHash
} from 'react-icons/fi';
import axios from 'axios';
import './StockIn.css';

const StockInRejected = () => {
  const navigate = useNavigate();
  const [batches, setBatches]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => { loadBatches(); }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/stock/batches/rejected', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rejected batches');
    } finally {
      setLoading(false);
    }
  };

  // Filter
  const filtered = batches.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [b.batchRef, b.invoiceNo, b.supplierName, b.notes]
      .filter(Boolean).some(f => f.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const goTo       = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day:'2-digit', month:'short', year:'numeric'
    });
  };

  return (
    <div className="si-page">
      {/* Header */}
      <div className="si-header">
        <div className="si-header-left">
          <button className="si-back-btn" onClick={() => navigate('/stock-in')}>
            <FiArrowLeft size={16}/> Back to Stock IN
          </button>
          <div className="si-header-icon" style={{background:'#dc2626'}}>
            <FiAlertTriangle size={20}/>
          </div>
          <div>
            <p className="si-title">Rejected Stock IN Batches</p>
            <p className="si-subtitle">
              {filtered.length} of {batches.length} rejected batches
            </p>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="si-review-error-banner">
        <FiAlertTriangle size={16}/>
        <div>
          <strong>These batches were rejected by QC.</strong>
          <span> Items in these batches are NOT in Current Stock. Click any row to see rejection details.</span>
        </div>
      </div>

      {/* Card */}
      <div className="si-card">
        <div className="si-card-head">
          <FiAlertTriangle className="si-card-icon" size={15} style={{color:'#dc2626'}}/>
          Rejected Batch List
          <span className="si-card-count">{filtered.length} batches</span>
        </div>

        {/* Search */}
        <div className="si-search-bar">
          <FiSearch className="si-search-icon" size={15}/>
          <input className="si-search-input" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search batch ref, invoice, supplier..."/>
          {search && (
            <button className="si-search-clear" onClick={() => setSearch('')}>
              <FiX size={14}/>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="si-product-table-wrap">
          {loading ? (
            <div className="si-empty"><span>Loading rejected batches...</span></div>
          ) : paged.length === 0 ? (
            <div className="si-empty">
              <FiAlertTriangle size={32} style={{color:'#10b981'}}/>
              <span>{search ? `No results for "${search}"` : '✅ No rejected batches — quality is perfect!'}</span>
            </div>
          ) : (
            <table className="si-product-table">
              <thead>
                <tr>
                  <th style={{width:40}}>#</th>
                  <th>Batch Ref</th>
                  <th>Invoice No.</th>
                  <th>Supplier</th>
                  <th>Received</th>
                  <th>Items</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Rejected On</th>
                  <th style={{width:120}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((b, idx) => (
                  <tr key={b.id} className="si-product-row">
                    <td className="si-row-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <span className="si-part-num" style={{color:'#dc2626'}}>
                        <FiHash size={10}/> {b.batchRef || '—'}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'#64748b'}}>{b.invoiceNo || '—'}</td>
                    <td>
                      <span style={{fontSize:13,fontWeight:600}}>
                        <FiUser size={11} style={{marginRight:4,color:'#94a3b8'}}/>
                        {b.supplierName || '—'}
                      </span>
                    </td>
                    <td style={{fontSize:12}}>
                      <FiCalendar size={10} style={{marginRight:3,color:'#94a3b8'}}/>
                      {fmtDate(b.receivedDate)}
                    </td>
                    <td>
                      <span className="si-cat-badge" style={{background:'#fef3c7',color:'#92400e'}}>
                        <FiPackage size={10}/> {b.itemCount || 0}
                      </span>
                    </td>
                    <td style={{fontWeight:700,color:'#dc2626'}}>
                      {b.totalQty?.toFixed ? b.totalQty.toFixed(2) : (b.totalQty || 0)}
                    </td>
                    <td>
                      <span style={{
                        display:'inline-block',
                        padding:'3px 9px',
                        background:'#fef2f2',
                        color:'#991b1b',
                        border:'1px solid #fecaca',
                        borderRadius:5,
                        fontSize:11,
                        fontWeight:700
                      }}>
                        ❌ REJECTED
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'#64748b'}}>{fmtDate(b.qcCompletedAt)}</td>
                    <td>
                      <button className="si-details-btn"
                        onClick={() => navigate(`/qc/inspection?batchId=${b.id}`)}>
                        <FiFileText size={11}/> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="si-pagination">
            <span className="si-pg-info">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="si-pg-controls">
              <button className="si-pg-btn" onClick={() => goTo(1)} disabled={safePage === 1}>
                <FiChevronsLeft size={13}/>
              </button>
              <button className="si-pg-btn" onClick={() => goTo(safePage - 1)} disabled={safePage === 1}>
                <FiChevronLeft size={13}/>
              </button>
              <span className="si-pg-btn si-pg-active">{safePage}</span>
              <button className="si-pg-btn" onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages}>
                <FiChevronRight size={13}/>
              </button>
              <button className="si-pg-btn" onClick={() => goTo(totalPages)} disabled={safePage === totalPages}>
                <FiChevronsRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockInRejected;
