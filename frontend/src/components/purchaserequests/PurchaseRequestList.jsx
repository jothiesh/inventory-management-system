import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseRequestApi } from '../../api/purchaseRequestApi';
import {
  FiPlus, FiDownload, FiEye, FiFileText, FiSearch, FiX,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import './PurchaseRequests.css';

const PAGE_SIZE = 15;

const statusConfig = {
  PENDING:  { label: 'Pending',  color: '#f59e0b', bg: '#fef3c7' },
  APPROVED: { label: 'Approved', color: '#10b981', bg: '#d1fae5' },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
};

const PurchaseRequestList = () => {
  const navigate = useNavigate();
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [error, setError]               = useState('');

  useEffect(() => { fetchRequests(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await purchaseRequestApi.getAll();
      setRequests(res.data.data || []);
    } catch { setError('Failed to load purchase requests.'); }
    finally { setLoading(false); }
  };

  const handleDownload = async (id, prCode) => {
    try {
      setDownloadingId(id);
      await purchaseRequestApi.downloadPdf(id, prCode);
    } catch { alert('Failed to download PDF.'); }
    finally { setDownloadingId(null); }
  };

  const filtered = useMemo(() => requests.filter(r =>
    r.prCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.createdByName?.toLowerCase().includes(search.toLowerCase())
  ), [requests, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const goTo       = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const pageNums   = () => {
    const pages = []; let s = Math.max(1, safePage - 2), e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) pages.push(i); return pages;
  };

  return (
    <div className="po-page">

      {/* ── Header ── */}
      <div className="po-header">
        <div className="po-header-left">
          <FiFileText size={22} className="po-header-icon" />
          <div>
            <h2 className="po-title">Purchase Requests</h2>
            <p className="po-subtitle">{filtered.length} of {requests.length} requests</p>
          </div>
        </div>
        <button className="po-btn-create" onClick={() => navigate('/purchase-requests/new')}>
          <FiPlus size={16} /> New Purchase Request
        </button>
      </div>

      {/* ── Search ── */}
      <div className="po-search-bar">
        <FiSearch size={16} className="po-search-icon" />
        <input type="text" placeholder="Search by PR code or created by..."
          value={search} onChange={e => setSearch(e.target.value)} className="po-search-input" />
        {search && <button className="po-search-clear" onClick={() => setSearch('')}><FiX size={13}/></button>}
      </div>

      {error && <div className="po-error">{error}</div>}

      {loading ? (
        <div className="po-loading"><div className="po-spinner" /><span>Loading...</span></div>
      ) : filtered.length === 0 ? (
        <div className="po-empty">
          <FiFileText size={48} />
          <p>No purchase requests found</p>
          <button className="po-btn-create" onClick={() => navigate('/purchase-requests/new')}>
            Create your first PR
          </button>
        </div>
      ) : (
        <>
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th style={{width:40}}>#</th>
                  <th>PR Code</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th style={{width:100}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((req, idx) => {
                  const st = statusConfig[req.status] || statusConfig.PENDING;
                  return (
                    <tr key={req.id} className="po-table-row pr-fade-in"
                      style={{ animationDelay: `${idx * 0.04}s` }}>
                      <td className="po-row-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td><span className="po-code-badge">{req.prCode}</span></td>
                      <td className="po-date">{req.prDate ? new Date(req.prDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td><span className="po-item-count">{req.items?.length || 0} item{req.items?.length !== 1 ? 's' : ''}</span></td>
                      <td>
                        <span className="pr-status-badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td>{req.createdByName || '—'}</td>
                      <td>
                        <div className="po-actions">
                          <button className="po-btn-view" title="View"
                            onClick={() => navigate(`/purchase-requests/${req.id}`)}>
                            <FiEye size={15}/>
                          </button>
                          <button className="po-btn-download" title="Download PDF"
                            onClick={() => handleDownload(req.id, req.prCode)}
                            disabled={downloadingId === req.id}>
                            {downloadingId === req.id ? <span className="po-spin-sm"/> : <FiDownload size={15}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="po-pagination">
            <div className="po-pg-info">
              Showing {(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="po-pg-controls">
              <button className="po-pg-btn" onClick={() => goTo(1)} disabled={safePage===1}><FiChevronsLeft size={13}/></button>
              <button className="po-pg-btn" onClick={() => goTo(safePage-1)} disabled={safePage===1}><FiChevronLeft size={13}/></button>
              {pageNums().map(p => (
                <button key={p} className={`po-pg-btn po-pg-num ${p===safePage?'po-pg-active':''}`} onClick={() => goTo(p)}>{p}</button>
              ))}
              <button className="po-pg-btn" onClick={() => goTo(safePage+1)} disabled={safePage===totalPages}><FiChevronRight size={13}/></button>
              <button className="po-pg-btn" onClick={() => goTo(totalPages)} disabled={safePage===totalPages}><FiChevronsRight size={13}/></button>
            </div>
            <div className="po-pg-jump">
              <span>Go to</span>
              <input type="number" min="1" max={totalPages} placeholder={safePage}
                onKeyDown={e => { if (e.key==='Enter') goTo(parseInt(e.target.value)); }}/>
              <span>of {totalPages}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseRequestList;