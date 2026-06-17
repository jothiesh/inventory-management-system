import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiActivity, FiSearch, FiX, FiRefreshCw, FiDownload,
  FiPackage, FiUser, FiCalendar, FiHash, FiFilter,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiCheckCircle, FiAlertTriangle, FiPause
} from 'react-icons/fi';
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

const QcInspectionHistory = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDecision, setFilterDecision] = useState('ALL');
  const [page, setPage] = useState(1);
  const PS = 20;

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
        [i.batchRef, i.supplierName, i.invoiceNo, i.inspectorName, i.categoryName]
          .filter(Boolean)
          .some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [inspections, search, filterDecision]);

  const tp = Math.max(1, Math.ceil(filtered.length / PS));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp - 1) * PS, sp * PS);
  useEffect(() => { setPage(1); }, [search, filterDecision]);

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
      a.download = `QC-${insp.batchRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
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
          placeholder="Search by batch, supplier, invoice, inspector..."
        />
        {search && (
          <button className="qca-search-clear" onClick={() => setSearch('')}>
            <FiX size={13} />
          </button>
        )}
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
                  <th style={{ width: 40 }}>#</th>
                  <th>DATE</th>
                  <th>BATCH REF</th>
                  <th>CATEGORY</th>
                  <th>SUPPLIER</th>
                  <th>INVOICE</th>
                  <th>INSPECTOR</th>
                  <th>DECISION</th>
                  <th>RECEIVED</th>
                  <th>ACCEPTED</th>
                  <th>REJECTED</th>
                  <th style={{ width: 80 }}>PDF</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((i, idx) => (
                  <tr key={i.id} className="qca-row">
                    <td className="qca-num">{(sp - 1) * PS + idx + 1}</td>
                    <td className="qca-faded">{fmtDate(i.inspectedAt)}</td>
                    <td>
                      <span className="qca-batch-ref">
                        <FiHash size={9} />
                        {i.batchRef || `SIB-${String(i.id).padStart(5, '0')}`}
                      </span>
                    </td>
                    <td>
                      {i.categoryName
                        ? <span className="qca-chip">{i.categoryName}</span>
                        : <span className="qca-faded">—</span>}
                    </td>
                    <td className="qca-strong">{i.supplierName || '—'}</td>
                    <td className="qca-faded">{i.invoiceNo || '—'}</td>
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
                    <td>
                      {i.pdfPath ? (
                        <button className="qca-pdf-btn" onClick={() => downloadPdf(i)} title="Download PDF">
                          <FiDownload size={13} />
                        </button>
                      ) : (
                        <span className="qca-faded" style={{ fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="qca-pagination">
            <span className="qca-pg-info">
              {(sp - 1) * PS + 1}–{Math.min(sp * PS, filtered.length)} of {filtered.length}
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