import React, { useState, useEffect, useMemo, Fragment } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiActivity, FiSearch, FiX, FiRefreshCw, FiDownload,
  FiPackage, FiUser, FiCalendar, FiHash, FiFilter,
  FiArrowUp, FiArrowDown, FiEye, FiFileText, FiGrid,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiCheckCircle, FiAlertTriangle, FiPause
} from 'react-icons/fi';
import QcBatchLots from './QcBatchLots';
import './QcBatchLots.css';
import './QcApproved.css';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return '—'; }
};

const DECISION_STYLE = {
  ACCEPTED: { label: 'Accepted', bg: '#d1fae5', color: '#065f46', icon: '✅' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  HOLD:     { label: 'Hold',     bg: '#f3e8ff', color: '#6b21a8', icon: '⏸' },
  PARTIAL:  { label: 'Partial',  bg: '#ffedd5', color: '#9a3412', icon: '⚠' },
};

const DecisionBadge = ({ decision }) => {
  const s = DECISION_STYLE[decision?.toUpperCase()] ||
    { label: decision || '—', bg: '#f1f5f9', color: '#64748b', icon: '•' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 5,
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap'
    }}>
      <span>{s.icon}</span> {s.label}
    </span>
  );
};

const SORT_OPTIONS = [
  { key: 'invoiceNo',    label: 'Invoice No' },
  { key: 'supplierName', label: 'Supplier'   },
  { key: 'inspectedAt',  label: 'Date'       },
  { key: 'categoryName', label: 'Category'   },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const QcInspectionHistory = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterDecision, setFilterDecision] = useState('ALL');
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(20);
  const [sortBy, setSortBy]       = useState('inspectedAt');
  const [sortDir, setSortDir]     = useState('desc');
  const [expandedId, setExpandedId] = useState(null);   // ★ click a row -> full Stock IN data
  const [downloadingId, setDownloadingId] = useState(null); // 'pdf-<id>' | 'excel-<id>'

  const load = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await axios.get('/api/qc/inspections/history', {
        headers: { Authorization: `Bearer ${t}` }
      });
      setInspections(r.data.data || []);
    } catch (e) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { ALL: inspections.length, ACCEPTED: 0, REJECTED: 0, HOLD: 0, PARTIAL: 0 };
    inspections.forEach(i => {
      const d = (i.overallDecision || '').toUpperCase();
      if (c[d] !== undefined) c[d]++;
    });
    return c;
  }, [inspections]);

  const filtered = useMemo(() => {
    let list = inspections;
    if (filterDecision !== 'ALL') {
      list = list.filter(i => (i.overallDecision || '').toUpperCase() === filterDecision);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        [i.invoiceNo, i.supplierName, i.inspectorName, i.categoryName]
          .filter(Boolean)
          .some(f => f.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'invoiceNo':    va = a.invoiceNo || '';    vb = b.invoiceNo || '';    break;
        case 'supplierName': va = a.supplierName || ''; vb = b.supplierName || ''; break;
        case 'categoryName': va = a.categoryName || ''; vb = b.categoryName || ''; break;
        case 'inspectedAt':
          va = a.inspectedAt ? new Date(a.inspectedAt).getTime() : 0;
          vb = b.inspectedAt ? new Date(b.inspectedAt).getTime() : 0; break;
        default: return 0;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [inspections, search, filterDecision, sortBy, sortDir]);

  const tp = Math.max(1, Math.ceil(filtered.length / pageSize));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp - 1) * pageSize, sp * pageSize);
  useEffect(() => { setPage(1); }, [search, filterDecision, sortBy, sortDir, pageSize]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, tp)));
  const pageNums = () => {
    const a = []; let s = Math.max(1, sp - 2), e = Math.min(tp, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) a.push(i);
    return a;
  };

  const downloadPdf = async (insp) => {
    if (!insp.pdfPath) { toast.info('No PDF available'); return; }
    try {
      setDownloadingId(`pdf-${insp.id}`);
      const t = localStorage.getItem('token');
      const r = await axios.get(`/api/qc/inspections/${insp.id}/pdf`, {
        headers: { Authorization: `Bearer ${t}` },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QC-${insp.invoiceNo || insp.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadExcel = async (insp) => {
    try {
      setDownloadingId(`excel-${insp.id}`);
      const t = localStorage.getItem('token');
      const r = await axios.get(`/api/qc/inspections/${insp.id}/excel`, {
        headers: { Authorization: `Bearer ${t}` },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QC-${insp.invoiceNo || insp.id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Excel download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const FILTER_TABS = [
    { v: 'ALL',      label: 'All',      n: counts.ALL,      c: '#6366f1' },
    { v: 'ACCEPTED', label: 'Accepted', n: counts.ACCEPTED, c: '#10b981' },
    { v: 'REJECTED', label: 'Rejected', n: counts.REJECTED, c: '#ef4444' },
    { v: 'HOLD',     label: 'Hold',     n: counts.HOLD,     c: '#a855f7' },
    { v: 'PARTIAL',  label: 'Partial',  n: counts.PARTIAL,  c: '#f97316' },
  ];

  return (
    <div className="qca-page">
      <div className="qca-hero">
        <div className="qca-hero-content">
          <div className="qca-hero-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            <FiActivity size={20} />
          </div>
          <div>
            <h1 className="qca-hero-title">Inspection History</h1>
            <p className="qca-hero-sub">
              {loading ? 'Loading...' : `${filtered.length} of ${inspections.length} total inspections`}
            </p>
          </div>
        </div>
        <button className="qca-refresh" onClick={load} disabled={loading}>
          <FiRefreshCw size={14} className={loading ? 'qca-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Decision filter tabs */}
      <div className="qca-stats">
        {FILTER_TABS.map(t => (
          <button key={t.v}
            onClick={() => setFilterDecision(t.v)}
            className="qca-stat"
            style={{
              '--c': t.c, cursor: 'pointer',
              border: filterDecision === t.v ? `2px solid ${t.c}` : '1px solid #e2e8f0',
              background: filterDecision === t.v ? `${t.c}15` : '#fff',
              fontFamily: 'inherit', textAlign: 'left'
            }}>
            <FiFilter size={18} />
            <div>
              <div className="qca-stat-num">{t.n}</div>
              <div className="qca-stat-label">{t.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="qca-search-bar">
        <FiSearch size={15} className="qca-search-icon" />
        <input
          className="qca-search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by invoice, supplier, inspector..."
        />
        {search && (
          <button className="qca-search-clear" onClick={() => setSearch('')}>
            <FiX size={13} />
          </button>
        )}
      </div>

      {/* ── Sort + Show toolbar ── */}
      <div className="qca-toolbar">
        <div className="qca-toolbar-group">
          <span className="qca-toolbar-label">Show</span>
          <select className="qca-toolbar-select" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="qca-toolbar-group">
          <span className="qca-toolbar-label">Sort</span>
          <select className="qca-toolbar-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <button className="qca-sort-dir" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} title="Toggle direction">
            {sortDir === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
          </button>
        </div>
      </div>

      <div className="qca-card">
        <div className="qca-table-wrap">
          {loading ? (
            <div className="qca-empty">
              <FiRefreshCw size={32} className="qca-spin" />
              <span>Loading...</span>
            </div>
          ) : paged.length === 0 ? (
            <div className="qca-empty">
              <FiPackage size={36} />
              <span>{search ? `No results for "${search}"` : 'No inspections yet'}</span>
            </div>
          ) : (
            <table className="qca-table">
              <thead>
                <tr>
                  <th style={{ width: 26 }}></th>
                  <th style={{ width: 40 }}>#</th>
                  <th>INVOICE</th>
                  <th>DATE</th>
                  <th>CATEGORY</th>
                  <th>SUPPLIER</th>
                  <th>INSPECTOR</th>
                  <th>DECISION</th>
                  <th>RECEIVED</th>
                  <th>ACCEPTED</th>
                  <th>REJECTED</th>
                  <th style={{ width: 90 }}>DETAILS</th>
                  <th className="qch-th-actions">DOWNLOAD</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((i, idx) => (
                  <Fragment key={i.id}>
                  <tr
                    className={`qca-row qbl-clickable ${expandedId === i.id ? 'qbl-open' : ''}`}
                    onClick={() => setExpandedId(prev => prev === i.id ? null : i.id)}
                  >
                    <td className="qbl-expand-cell">
                      <FiChevronRight size={13}
                        className={`qbl-chev ${expandedId === i.id ? 'qbl-chev-open' : ''}`} />
                    </td>
                    <td className="qca-num">{(sp - 1) * pageSize + idx + 1}</td>
                    <td>
                      <span className="qca-batch-ref">
                        <FiHash size={9} />
                        {i.invoiceNo || '—'}
                      </span>
                    </td>
                    <td className="qca-faded">{fmtDate(i.inspectedAt)}</td>
                    <td>
                      {i.categoryName
                        ? <span className="qca-chip">{i.categoryName}</span>
                        : <span className="qca-faded">—</span>}
                    </td>
                    <td className="qca-strong">{i.supplierName || '—'}</td>
                    <td>
                      {i.inspectorName ? (
                        <span className="qca-inspector">
                          <FiUser size={10} /> {i.inspectorName}
                        </span>
                      ) : <span className="qca-faded">—</span>}
                    </td>
                    <td><DecisionBadge decision={i.overallDecision} /></td>
                    <td className="qca-qty">{(parseFloat(i.qtyReceived ?? i.totalReceived ?? 0) || 0).toFixed(0)}</td>
                    <td className="qca-qty qca-qty-accepted">{(parseFloat(i.qtyAccepted ?? i.totalAccepted ?? 0) || 0).toFixed(0)}</td>
                    <td className="qca-qty" style={{ color: '#dc2626' }}>{(parseFloat(i.qtyRejected ?? i.totalRejected ?? 0) || 0).toFixed(0)}</td>

                    {/* ★ Details button — same toggle as row click */}
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="qch-details-btn"
                        onClick={() => setExpandedId(prev => prev === i.id ? null : i.id)}
                        title={expandedId === i.id ? 'Hide details' : 'View details'}>
                        <FiEye size={12} /> {expandedId === i.id ? 'Hide' : 'Details'}
                      </button>
                    </td>

                    {/* ★ Download group — PDF + Excel */}
                    <td className="qch-td-actions" onClick={e => e.stopPropagation()}>
                      <div className="qch-dl-group">
                        <button
                          className={`qch-dl-btn pdf ${!i.pdfPath ? 'disabled' : ''}`}
                          disabled={!i.pdfPath || downloadingId === `pdf-${i.id}`}
                          onClick={() => downloadPdf(i)}
                          title={i.pdfPath ? 'Download PDF' : 'No PDF available'}>
                          {downloadingId === `pdf-${i.id}`
                            ? <FiRefreshCw size={11} className="qch-spin" />
                            : <FiFileText size={11} />} PDF
                        </button>
                        <button
                          className={`qch-dl-btn excel ${downloadingId === `excel-${i.id}` ? 'disabled' : ''}`}
                          disabled={downloadingId === `excel-${i.id}`}
                          onClick={() => downloadExcel(i)}
                          title="Download Excel">
                          {downloadingId === `excel-${i.id}`
                            ? <FiRefreshCw size={11} className="qch-spin" />
                            : <FiGrid size={11} />} XLS
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* ★ full Stock IN data — lot no, rack/box, HSN, rate, GST */}
                  {expandedId === i.id && (
                    <tr className="qbl-detail-row">
                      <td colSpan={13}>
                        <QcBatchLots batchId={i.batchId} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="qca-pagination">
            <span className="qca-pg-info">
              {(sp - 1) * pageSize + 1}–{Math.min(sp * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="qca-pg-controls">
              <button className="qca-pg-btn" onClick={() => goTo(1)} disabled={sp === 1}>
                <FiChevronsLeft size={13} />
              </button>
              <button className="qca-pg-btn" onClick={() => goTo(sp - 1)} disabled={sp === 1}>
                <FiChevronLeft size={13} />
              </button>
              {pageNums().map(p => (
                <button key={p}
                  className={`qca-pg-btn ${p === sp ? 'qca-pg-active' : ''}`}
                  onClick={() => goTo(p)}>
                  {p}
                </button>
              ))}
              <button className="qca-pg-btn" onClick={() => goTo(sp + 1)} disabled={sp === tp}>
                <FiChevronRight size={13} />
              </button>
              <button className="qca-pg-btn" onClick={() => goTo(tp)} disabled={sp === tp}>
                <FiChevronsRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QcInspectionHistory;