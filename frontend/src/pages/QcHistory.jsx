import React, { useState, useEffect, useMemo, Fragment } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiActivity, FiSearch, FiX, FiDownload, FiRefreshCw,
  FiCalendar, FiFilter, FiCheckCircle, FiXCircle,
  FiPauseCircle, FiEye, FiPackage, FiUser, FiHash, FiFileText,
  FiChevronRight,
} from 'react-icons/fi';
import QcBatchLots from './QcBatchLots';
import './QcBatchLots.css';
import './QcLists.css';

const PAGE_SIZE = 20;

// ── Full details modal ───────────────────────────────────────
const DetailsModal = ({ item, onClose, onDownload, downloading }) => {
  if (!item) return null;
  const id = item.id || item.inspectionId;

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const fmtDateTime = (d) => d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const received = parseFloat(item.qtyReceived || item.totalReceived || 0).toFixed(0);
  const accepted = parseFloat(item.qtyAccepted || item.totalAccepted || 0).toFixed(0);
  const rejected = parseFloat(item.qtyRejected || item.totalRejected || 0).toFixed(0);
  const held     = parseFloat(item.qtyHeld || item.totalHeld || 0).toFixed(0);

  const rows = [
    { icon: FiHash,     label: 'Batch Ref',   value: item.batchRef || `SIB-${String(id).padStart(5, '0')}` },
    { icon: FiFileText, label: 'Invoice No',  value: item.invoiceNo || item.invoiceNumber || '—' },
    { icon: FiPackage,  label: 'Category',    value: item.categoryName || item.categoryCode || '—' },
    { icon: FiUser,     label: 'Supplier',    value: item.supplierName || '—' },
    { icon: FiUser,     label: 'Inspector',   value: item.inspectorName || '—' },
    { icon: FiActivity, label: 'Decision',    value: item.overallDecision || '—' },
    { icon: FiCalendar, label: 'Inspected At', value: fmtDateTime(item.inspectedAt || item.inspectionDate) },
    { icon: FiCalendar, label: 'Received Date', value: fmtDate(item.receivedDate) },
  ];

  return (
    <div className="qcl-modal-overlay" onClick={onClose}>
      <div className="qcl-modal" onClick={e => e.stopPropagation()}>
        <div className="qcl-modal-head">
          <div className="qcl-modal-head-left">
            <span className="qcl-modal-title">{item.invoiceNo || item.invoiceNumber || item.batchRef || `Inspection #${id}`}</span>
            <span className="qcl-modal-sub">{item.supplierName || '—'} · {item.categoryName || item.categoryCode || '—'}</span>
          </div>
          <button className="qcl-modal-close" onClick={onClose}><FiX size={16} /></button>
        </div>

        <div className="qcl-modal-body">
          {/* Quantity strip */}
          <div className="qcl-modal-qty-strip">
            <div className="qcl-modal-qty"><strong>{received}</strong><span>Received</span></div>
            <div className="qcl-modal-qty qcl-mq-acc"><strong>{accepted}</strong><span>Accepted</span></div>
            <div className="qcl-modal-qty qcl-mq-rej"><strong>{rejected}</strong><span>Rejected</span></div>
            <div className="qcl-modal-qty qcl-mq-held"><strong>{held}</strong><span>Held</span></div>
          </div>

          {/* Detail rows */}
          <div className="qcl-modal-grid">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="qcl-modal-field">
                <span className="qcl-modal-field-label"><Icon size={12} /> {label}</span>
                <span className="qcl-modal-field-value">{value}</span>
              </div>
            ))}
          </div>

          {item.remarks && (
            <div className="qcl-modal-remarks">
              <span className="qcl-modal-field-label">Remarks</span>
              <p>{item.remarks}</p>
            </div>
          )}
        </div>

        <div className="qcl-modal-foot">
          <button className="qcl-btn-clear" onClick={onClose}>Close</button>
          {(item.pdfPath || item.hasPdf) && (
            <button className="qcl-btn-apply" onClick={() => onDownload(item)} disabled={downloading === id}>
              {downloading === id ? <span className="qcl-spin-sm" /> : <FiDownload size={12} />} Download PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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

  // Details modal
  const [detailItem, setDetailItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);   // ★ click a row -> full Stock IN data

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filterDecision]);

  const load = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const token = localStorage.getItem('token');
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
      a.download = `QC-${item.invoiceNo || item.batchRef || 'Report'}.pdf`;
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
        <button className="qcl-btn-refresh" onClick={() => load(true)} disabled={refreshing}>
          <FiRefreshCw size={13} className={refreshing ? 'qcl-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ─── DATE-RANGE FILTER CARD ─── */}
      <div className="qcl-card qcl-date-filter-card">
        <div className="qcl-date-filter-row">
          <FiCalendar size={15} className="qcl-date-icon" />
          <span className="qcl-date-label">Date Range:</span>
          <input type="date" className="qcl-date-input" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)} max={toDate || undefined}/>
          <span style={{ color: '#94a3b8' }}>→</span>
          <input type="date" className="qcl-date-input" value={toDate}
            onChange={(e) => setToDate(e.target.value)} min={fromDate || undefined}/>

          <span className="qcl-date-label" style={{ marginLeft: 8 }}>Decision:</span>
          <select className="qcl-decision-select" value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}>
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
          <div><strong>{items.length}</strong><span>Total</span></div>
        </div>
        <div className="qcl-summary-stat qcl-stat-approved">
          <FiCheckCircle size={16} />
          <div><strong>{decisionCounts.ACCEPTED || 0}</strong><span>Approved</span></div>
        </div>
        <div className="qcl-summary-stat qcl-stat-rejected">
          <FiXCircle size={16} />
          <div><strong>{decisionCounts.REJECTED || 0}</strong><span>Rejected</span></div>
        </div>
        <div className="qcl-summary-stat" style={{ '--c': '#f97316' }}>
          <FiActivity size={16} style={{ color: '#f97316' }} />
          <div><strong style={{ color: '#f97316' }}>{decisionCounts.PARTIAL || 0}</strong><span>Partial</span></div>
        </div>
        <div className="qcl-summary-stat" style={{ '--c': '#a855f7' }}>
          <FiPauseCircle size={16} style={{ color: '#a855f7' }} />
          <div><strong style={{ color: '#a855f7' }}>{decisionCounts.HOLD || 0}</strong><span>On Hold</span></div>
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="qcl-card">
        <div className="qcl-search-bar">
          <FiSearch size={14} className="qcl-search-icon" />
          <input type="text" placeholder="Search by batch, supplier, invoice, inspector..."
            value={search} onChange={(e) => setSearch(e.target.value)} className="qcl-search-input"/>
          {search && (
            <button className="qcl-search-clear" onClick={() => setSearch('')}><FiX size={12} /></button>
          )}
        </div>
      </div>

      {/* ─── DATA TABLE ─── */}
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
                    <th style={{ width: 26 }}></th>
                    <th style={{ width: 40 }}>#</th>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Inspector</th>
                    <th>Decision</th>
                    <th className="num">Received</th>
                    <th className="num">Accepted</th>
                    <th className="num">Rejected</th>
                    <th style={{ width: 90 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item, idx) => {
                    const ds = decisionStyle(item.overallDecision);
                    const Icon = ds.icon;
                    const id = item.id || item.inspectionId;

                    const isOpen = expandedId === id;
                    return (
                      <Fragment key={id}>
                      <tr
                        className={`qcl-row qbl-clickable ${isOpen ? 'qbl-open' : ''}`}
                        onClick={() => setExpandedId(prev => prev === id ? null : id)}
                      >
                        <td className="qbl-expand-cell">
                          <FiChevronRight size={13}
                            className={`qbl-chev ${isOpen ? 'qbl-chev-open' : ''}`} />
                        </td>
                        <td className="qcl-row-num">
                          {(safePage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td>
                          <span className="qcl-batch-ref">
                            {item.invoiceNo || item.invoiceNumber || '—'}
                          </span>
                        </td>
                        <td className="qcl-date">{fmtDate(item.inspectedAt || item.inspectionDate)}</td>
                        <td>
                          <span className="qcl-cat-badge">
                            {item.categoryName || item.categoryCode || '—'}
                          </span>
                        </td>
                        <td>{item.supplierName || '—'}</td>
                        <td>{item.inspectorName || '—'}</td>
                        <td>
                          <span className="qcl-decision-pill" style={{ background: ds.bg, color: ds.fg }}>
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
                        <td onClick={e => e.stopPropagation()}>
                          <button className="qcl-btn-details" onClick={() => setDetailItem(item)} title="View full details">
                            <FiEye size={13} /> Details
                          </button>
                        </td>
                      </tr>

                      {/* ★ full Stock IN data — lot no, rack/box, HSN, rate, GST */}
                      {isOpen && (
                        <tr className="qbl-detail-row">
                          <td colSpan={12}>
                            <QcBatchLots batchId={item.batchId} />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

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

      {/* ─── DETAILS MODAL ─── */}
      {detailItem && (
        <DetailsModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onDownload={handleDownload}
          downloading={downloadingId}
        />
      )}
    </div>
  );
};

export default QcHistory;