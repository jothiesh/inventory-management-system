import React, { useState, useEffect, useMemo, Fragment } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiCheckCircle, FiSearch, FiX, FiRefreshCw, FiDownload,
  FiPackage, FiUser, FiCalendar, FiHash, FiArrowUp, FiArrowDown,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiFileText
} from 'react-icons/fi';
import QcChecklistModal from './QcChecklistModal';
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

const SORT_OPTIONS = [
  { key: 'invoiceNo',    label: 'Invoice No' },
  { key: 'supplierName', label: 'Supplier'   },
  { key: 'inspectedAt',  label: 'Date'       },
  { key: 'categoryName', label: 'Category'   },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const QcApproved = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy]     = useState('inspectedAt');
  const [sortDir, setSortDir]   = useState('desc');
  const [checklistFor, setChecklistFor] = useState(null);   // ★ template-select + download
  const [expandedId,   setExpandedId]   = useState(null);   // ★ click a row -> full Stock IN data

  const load = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await axios.get('/api/qc/inspections/approved', {
        headers: { Authorization: `Bearer ${t}` }
      });
      setInspections(r.data.data || []);
    } catch (e) {
      toast.error('Failed to load approved inspections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const totalReceived = inspections.reduce((s, i) => s + (parseFloat(i.qtyReceived ?? i.totalReceived ?? 0) || 0), 0);
    const totalAccepted = inspections.reduce((s, i) => s + (parseFloat(i.qtyAccepted ?? i.totalAccepted ?? 0) || 0), 0);
    const latest = inspections[0]?.inspectedAt;
    return {
      total: inspections.length,
      received: totalReceived,
      accepted: totalAccepted,
      latest: latest ? fmtDate(latest) : '—'
    };
  }, [inspections]);

  const filtered = useMemo(() => {
    let list = inspections;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        [i.invoiceNo, i.supplierName, i.inspectorName, i.categoryName, i.overallRemarks]
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
  }, [inspections, search, sortBy, sortDir]);

  const tp = Math.max(1, Math.ceil(filtered.length / pageSize));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp - 1) * pageSize, sp * pageSize);
  useEffect(() => { setPage(1); }, [search, sortBy, sortDir, pageSize]);

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
      const t = localStorage.getItem('token');
      const r = await axios.get(`/api/qc/inspections/${insp.id}/pdf`, {
        headers: { Authorization: `Bearer ${t}` },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QC-APPROVED-${insp.invoiceNo || 'ID-' + insp.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="qca-page">
      <div className="qca-hero">
        <div className="qca-hero-content">
          <div className="qca-hero-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <FiCheckCircle size={20} />
          </div>
          <div>
            <h1 className="qca-hero-title">Approved Inspections</h1>
            <p className="qca-hero-sub">
              {loading ? 'Loading...' : `${filtered.length} of ${inspections.length} approved batches`}
            </p>
          </div>
        </div>
        <button className="qca-refresh" onClick={load} disabled={loading}>
          <FiRefreshCw size={14} className={loading ? 'qca-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="qca-stats">
        <div className="qca-stat" style={{ '--c': '#10b981' }}>
          <FiCheckCircle size={18} />
          <div>
            <div className="qca-stat-num">{stats.total}</div>
            <div className="qca-stat-label">Total Approved</div>
          </div>
        </div>
        <div className="qca-stat" style={{ '--c': '#3b82f6' }}>
          <FiPackage size={18} />
          <div>
            <div className="qca-stat-num">{stats.received.toFixed(0)}</div>
            <div className="qca-stat-label">Units Received</div>
          </div>
        </div>
        <div className="qca-stat" style={{ '--c': '#22c55e' }}>
          <FiPackage size={18} />
          <div>
            <div className="qca-stat-num">{stats.accepted.toFixed(0)}</div>
            <div className="qca-stat-label">Units Accepted</div>
          </div>
        </div>
        <div className="qca-stat" style={{ '--c': '#a855f7' }}>
          <FiCalendar size={18} />
          <div>
            <div className="qca-stat-num">{stats.latest}</div>
            <div className="qca-stat-label">Latest Pass</div>
          </div>
        </div>
      </div>

      <div className="qca-search-bar">
        <FiSearch size={15} className="qca-search-icon" />
        <input
          className="qca-search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by invoice, supplier, inspector, category..."
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
              <span>Loading data...</span>
            </div>
          ) : paged.length === 0 ? (
            <div className="qca-empty">
              <FiPackage size={36} style={{ color: '#10b981' }} />
              <span style={{ color: '#065f46', fontWeight: 600 }}>
                {search ? `No results for "${search}"` : 'No approved inspections yet.'}
              </span>
            </div>
          ) : (
            <table className="qca-table">
              <thead>
                <tr>
                  <th style={{ width: 26 }}></th>
                  <th style={{ width: 40 }}>#</th>
                  <th>INVOICE</th>
                  <th>CATEGORY</th>
                  <th>SUPPLIER</th>
                  <th>INSPECTOR</th>
                  <th>ITEMS</th>
                  <th>RECEIVED</th>
                  <th>ACCEPTED</th>
                  <th>INSPECTED</th>
                  <th>REMARKS</th>
                  <th style={{ width: 150 }}>ACTION</th>
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
                    <td>
                      <span className="qca-count">{i.itemCount || 0}</span>
                    </td>
                    <td className="qca-qty">{(parseFloat(i.qtyReceived ?? i.totalReceived ?? 0) || 0).toFixed(0)}</td>
                    <td className="qca-qty qca-qty-accepted">{(parseFloat(i.qtyAccepted ?? i.totalAccepted ?? 0) || 0).toFixed(0)}</td>
                    <td className="qca-faded">{fmtDate(i.inspectedAt)}</td>
                    <td className="qca-faded qca-truncate" title={i.overallRemarks}>
                      {i.overallRemarks || '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* ★ select template → live checklist → download */}
                        <button className="qcm-open-btn"
                          onClick={() => setChecklistFor(i)}
                          title="Select template and download checklist">
                          <FiFileText size={11} /> Checklist
                        </button>
                        {i.pdfPath && (
                          <button className="qca-pdf-btn" onClick={() => downloadPdf(i)} title="Download stored PDF">
                            <FiDownload size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* ★ full Stock IN data — lot no, rack/box, HSN, rate, GST */}
                  {expandedId === i.id && (
                    <tr className="qbl-detail-row">
                      <td colSpan={12}>
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

      {/* ★ same flow as the QC Inspection screen — pick template, fill, download */}
      {checklistFor && (
        <QcChecklistModal
          inspection={checklistFor}
          onClose={() => setChecklistFor(null)}
        />
      )}
    </div>
  );
};

export default QcApproved;