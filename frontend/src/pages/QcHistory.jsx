import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiActivity, FiSearch, FiX, FiDownload, FiRefreshCw,
  FiCalendar, FiFilter, FiCheckCircle, FiXCircle,
  FiPauseCircle
} from 'react-icons/fi';
import './QcLists.css';

const PAGE_SIZE = 20;

const QcHistory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterDecision, setFilterDecision] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filterDecision]);

  const load = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const token = localStorage.getItem('token');
      
      // Using the correct backend API endpoint path
      const res = await axios.get('/api/qc/inspections/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setItems(res.data.data || []);
      if (silent) toast.success('History refreshed', { autoClose: 1200 });
    } catch {
      toast.error('Failed to load history');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyDateFilter = () => { load(); setPage(1); };
  
  const clearDateFilter = () => {
    setFromDate(''); 
    setToDate('');
    setTimeout(() => load(), 0);
  };

  // Advanced clientside filtering for high responsiveness
  const filtered = useMemo(() => {
    let list = items;

    if (filterDecision !== 'ALL') {
      list = list.filter(i => (i.overallDecision || '').toUpperCase() === filterDecision);
    }

    if (fromDate) {
      list = list.filter(i => new Date(i.inspectedAt || i.inspectionDate) >= new Date(fromDate));
    }
    if (toDate) {
      list = list.filter(i => new Date(i.inspectedAt || i.inspectionDate) <= new Date(toDate + 'T23:59:59'));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        [i.batchRef, i.supplierName, i.invoiceNo, i.invoiceNumber, i.inspectorName, i.categoryName, i.categoryCode]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, search, filterDecision, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleDownload = async (item) => {
    if (!item.pdfPath && !item.hasPdf) { 
      toast.info('No PDF available'); 
      return; 
    }
    try {
      const id = item.id || item.inspectionId;
      setDownloadingId(id);
      const token = localStorage.getItem('token');
      
      const r = await axios.get(`/api/qc/inspections/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QC-${item.batchRef || 'Report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const decisionStyle = (decision) => {
    switch (decision?.toUpperCase()) {
      case 'ACCEPTED': return { bg: '#d1fae5', fg: '#065f46', icon: FiCheckCircle };
      case 'REJECTED': return { bg: '#fee2e2', fg: '#991b1b', icon: FiXCircle };
      case 'PARTIAL':  return { bg: '#ffedd5', fg: '#9a3412', icon: FiActivity };
      case 'HOLD':     return { bg: '#ede9fe', fg: '#5b21b6', icon: FiPauseCircle };
      default:         return { bg: '#f1f5f9', fg: '#475569', icon: FiActivity };
    }
  };

  if (loading) return (
    <div className="qcl-loading">
      <div className="qcl-spinner" />
      <span>Loading history…</span>
    </div>
  );

  // Compute live card counts based on actual items
  const decisionCounts = items.reduce((acc, i) => {
    const d = (i.overallDecision || '').toUpperCase();
    if (d) acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="qcl-page qcl-page-history">

      {/* ─── HEADER ─── */}
      <div className="qcl-header">
        <div className="qcl-header-left">
          <div className="qcl-header-icon qcl-icon-history">
            <FiActivity size={20} />
          </div>
          <div>
            <h1 className="qcl-title">Inspection History</h1>
            <p className="qcl-subtitle">
              {filtered.length} of {items.length} total inspections
            </p>
          </div>
        </div>
        <button
          className="qcl-btn-refresh"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <FiRefreshCw size={13} className={refreshing ? 'qcl-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ─── COMPACT DATE-RANGE FILTER CARD ─── */}
      <div className="qcl-card qcl-date-filter-card">
        <div className="qcl-date-filter-row">
          <FiCalendar size={15} className="qcl-date-icon" />
          <span className="qcl-date-label">Date Range:</span>
          <input
            type="date"
            className="qcl-date-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate || undefined}
          />
          <span style={{ color: '#94a3b8' }}>→</span>
          <input
            type="date"
            className="qcl-date-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate || undefined}
          />

          <span className="qcl-date-label" style={{ marginLeft: 8 }}>Decision:</span>
          <select
            className="qcl-decision-select"
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
          >
            <option value="ALL">All Decisions</option>
            <option value="ACCEPTED">Approved Only</option>
            <option value="REJECTED">Rejected Only</option>
            <option value="PARTIAL">Partial Only</option>
            <option value="HOLD">On Hold</option>
          </select>

          <button className="qcl-btn-apply" onClick={applyDateFilter}>
            <FiFilter size={12} /> Apply
          </button>
          {(fromDate || toDate || filterDecision !== 'ALL') && (
            <button className="qcl-btn-clear" onClick={() => {
              setFilterDecision('ALL');
              clearDateFilter();
            }}>
              <FiX size={12} /> Clear
            </button>
          )}
        </div>

        {/* Quick presets row */}
        <div className="qcl-date-presets">
          <button onClick={() => {
            const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 7);
            setFromDate(f.toISOString().slice(0, 10)); setToDate(t.toISOString().slice(0, 10));
          }}>Last 7 days</button>
          <button onClick={() => {
            const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 30);
            setFromDate(f.toISOString().slice(0, 10)); setToDate(t.toISOString().slice(0, 10));
          }}>Last 30 days</button>
          <button onClick={() => {
            const t = new Date(); const f = new Date(t.getFullYear(), t.getMonth(), 1);
            setFromDate(f.toISOString().slice(0, 10)); setToDate(t.toISOString().slice(0, 10));
          }}>This month</button>
          <button onClick={() => {
            const t = new Date(); const f = new Date(t.getFullYear(), t.getMonth() - 1, 1);
            const lf = new Date(t.getFullYear(), t.getMonth(), 0);
            setFromDate(f.toISOString().slice(0, 10)); setToDate(lf.toISOString().slice(0, 10));
          }}>Last month</button>
        </div>
      </div>

      {/* ─── SUMMARY GRID ─── */}
      <div className="qcl-summary">
        <div className="qcl-summary-stat">
          <FiActivity size={16} />
          <div>
            <strong>{items.length}</strong>
            <span>Total</span>
          </div>
        </div>
        <div className="qcl-summary-stat qcl-stat-approved">
          <FiCheckCircle size={16} />
          <div>
            <strong>{decisionCounts.ACCEPTED || 0}</strong>
            <span>Approved</span>
          </div>
        </div>
        <div className="qcl-summary-stat qcl-stat-rejected">
          <FiXCircle size={16} />
          <div>
            <strong>{decisionCounts.REJECTED || 0}</strong>
            <span>Rejected</span>
          </div>
        </div>
        <div className="qcl-summary-stat" style={{ '--c': '#f97316' }}>
          <FiActivity size={16} style={{ color: '#f97316' }} />
          <div>
            <strong style={{ color: '#f97316' }}>{decisionCounts.PARTIAL || 0}</strong>
            <span>Partial</span>
          </div>
        </div>
        <div className="qcl-summary-stat" style={{ '--c': '#a855f7' }}>
          <FiPauseCircle size={16} style={{ color: '#a855f7' }} />
          <div>
            <strong style={{ color: '#a855f7' }}>{decisionCounts.HOLD || 0}</strong>
            <span>On Hold</span>
          </div>
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="qcl-card">
        <div className="qcl-search-bar">
          <FiSearch size={14} className="qcl-search-icon" />
          <input
            type="text"
            placeholder="Search by batch, supplier, invoice, inspector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="qcl-search-input"
          />
          {search && (
            <button className="qcl-search-clear" onClick={() => setSearch('')}>
              <FiX size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ─── COMPACT DATA TABLE ─── */}
      <div className="qcl-card qcl-card-table">
        {filtered.length === 0 ? (
          <div className="qcl-empty">
            <FiActivity size={32} />
            <p>No inspections found matching filters</p>
          </div>
        ) : (
          <>
            <div className="qcl-table-wrap">
              <table className="qcl-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Date</th>
                    <th>Batch Ref</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Invoice</th>
                    <th>Inspector</th>
                    <th>Decision</th>
                    <th className="num">Received</th>
                    <th className="num">Accepted</th>
                    <th className="num">Rejected</th>
                    <th style={{ width: 50 }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item, idx) => {
                    const ds = decisionStyle(item.overallDecision);
                    const Icon = ds.icon;
                    const id = item.id || item.inspectionId;
                    
                    return (
                      <tr key={id} className="qcl-row">
                        <td className="qcl-row-num">
                          {(safePage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        {/* Fixed property fallback check to solve the dash timeline issue */}
                        <td className="qcl-date">{fmtDate(item.inspectedAt || item.inspectionDate)}</td>
                        <td>
                          <span className="qcl-batch-ref">
                            {item.batchRef || `SIB-${String(id).padStart(5, '0')}`}
                          </span>
                        </td>
                        <td>
                          <span className="qcl-cat-badge">
                            {item.categoryName || item.categoryCode || '—'}
                          </span>
                        </td>
                        <td>{item.supplierName || '—'}</td>
                        <td className="qcl-dim">{item.invoiceNo || item.invoiceNumber || '—'}</td>
                        <td>{item.inspectorName || '—'}</td>
                        <td>
                          <span
                            className="qcl-decision-pill"
                            style={{ background: ds.bg, color: ds.fg }}
                          >
                            <Icon size={11} />
                            {item.overallDecision}
                          </span>
                        </td>
                        <td className="num">{parseFloat(item.qtyReceived || item.totalReceived || 0).toFixed(0)}</td>
                        <td className="num qcl-num-approved">
                          {parseFloat(item.qtyAccepted || item.totalAccepted || 0).toFixed(0)}
                        </td>
                        <td className="num qcl-num-rejected">
                          {parseFloat(item.qtyRejected || item.totalRejected || 0).toFixed(0)}
                        </td>
                        <td>
                          {(item.pdfPath || item.hasPdf) ? (
                            <button
                              className="qcl-btn-pdf"
                              onClick={() => handleDownload(item)}
                              disabled={downloadingId === id}
                              title="Download Report PDF"
                            >
                              {downloadingId === id
                                ? <span className="qcl-spin-sm" />
                                : <FiDownload size={13} />}
                            </button>
                          ) : (
                            <span className="qcl-dim">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="qcl-pagination">
              <span className="qcl-pg-info">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="qcl-pg-controls">
                <button onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1}>‹</button>
                <span className="qcl-pg-current">{safePage} / {totalPages}</span>
                <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}>›</button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QcHistory;