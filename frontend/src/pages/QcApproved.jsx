import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiCheckCircle, FiSearch, FiX, FiRefreshCw, FiDownload,
  FiPackage, FiUser, FiCalendar, FiHash,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
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

const QcApproved = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PS = 15;

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
    if (!search.trim()) return inspections;
    const q = search.toLowerCase();
    return inspections.filter(i =>
      [i.batchRef, i.supplierName, i.invoiceNo, i.inspectorName, i.categoryName, i.overallRemarks]
        .filter(Boolean)
        .some(f => f.toLowerCase().includes(q))
    );
  }, [inspections, search]);

  const tp = Math.max(1, Math.ceil(filtered.length / PS));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp - 1) * PS, sp * PS);
  useEffect(() => { setPage(1); }, [search]);

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
      a.download = `QC-APPROVED-${insp.batchRef || 'ID-' + insp.id}.pdf`;
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
          placeholder="Search by batch, supplier, invoice, inspector, category..."
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
                  <th style={{ width: 40 }}>#</th>
                  <th>BATCH REF</th>
                  <th>CATEGORY</th>
                  <th>SUPPLIER</th>
                  <th>INVOICE</th>
                  <th>INSPECTOR</th>
                  <th>ITEMS</th>
                  <th>RECEIVED</th>
                  <th>ACCEPTED</th>
                  <th>INSPECTED</th>
                  <th>REMARKS</th>
                  <th style={{ width: 80 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((i, idx) => (
                  <tr key={i.id} className="qca-row">
                    <td className="qca-num">{(sp - 1) * PS + idx + 1}</td>
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
                    <td>
                      <span className="qca-count">{i.itemCount || 0}</span>
                    </td>
                    <td className="qca-qty">{(parseFloat(i.qtyReceived ?? i.totalReceived ?? 0) || 0).toFixed(0)}</td>
                    <td className="qca-qty qca-qty-accepted">{(parseFloat(i.qtyAccepted ?? i.totalAccepted ?? 0) || 0).toFixed(0)}</td>
                    <td className="qca-faded">{fmtDate(i.inspectedAt)}</td>
                    <td className="qca-faded qca-truncate" title={i.overallRemarks}>
                      {i.overallRemarks || '—'}
                    </td>
                    <td>
                      {i.pdfPath ? (
                        <button className="qca-pdf-btn" onClick={() => downloadPdf(i)} title="Download PDF">
                          <FiDownload size={13} />
                        </button>
                      ) : (
                        <span className="qca-faded" style={{ fontSize: 11 }}>No PDF</span>
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

export default QcApproved;