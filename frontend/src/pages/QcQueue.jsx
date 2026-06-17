import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { qcApi } from '../api/qcApi';
import { toast } from 'react-toastify';
import {
  FiClipboard, FiSearch, FiX, FiRefreshCw, FiClock,
  FiPackage, FiFileText, FiTag, FiChevronRight,
  FiCheckCircle, FiChevronsLeft, FiChevronsRight, FiChevronLeft,
  FiXCircle, FiPauseCircle, FiDownload, FiGrid, FiChevronDown
} from 'react-icons/fi';
import './QcQueue.css';

const PAGE_SIZE = 15;

// ── Template codes that auto-match ───────────────────────────
const TEMPLATE_CODES = ['IC', 'MECHANICAL', 'KITTING', 'PCB', 'ELECTRONIC', 'LABEL'];

const tryAutoMatch = (code, name) => {
  for (const c of [code, name]) {
    const u = (c || '').toUpperCase().trim();
    if (TEMPLATE_CODES.includes(u)) return u;
  }
  return null;
};

// ── Dynamic color palette ────────────────────────────────────
const hashStr = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const PALETTE = [
  { bg: '#fef3c7', fg: '#92400e', dot: '#f59e0b' },
  { bg: '#dbeafe', fg: '#1e40af', dot: '#3b82f6' },
  { bg: '#dcfce7', fg: '#166534', dot: '#22c55e' },
  { bg: '#ede9fe', fg: '#5b21b6', dot: '#8b5cf6' },
  { bg: '#cffafe', fg: '#155e75', dot: '#06b6d4' },
  { bg: '#fce7f3', fg: '#9d174d', dot: '#ec4899' },
  { bg: '#ffedd5', fg: '#9a3412', dot: '#f97316' },
  { bg: '#f0fdf4', fg: '#14532d', dot: '#16a34a' },
];
const catColor = (code) => PALETTE[hashStr(code || 'GENERAL') % PALETTE.length];
const catLabel = (b)    => b.categoryName || b.categoryCode || 'GEN';
const catCode  = (b)    => b.categoryCode || 'GENERAL';

// ── Quick decision modal ─────────────────────────────────────
const QuickDecisionModal = ({ batch, templates, onClose, onDone }) => {
  const [decision,      setDecision]      = useState('');
  const [remarks,       setRemarks]       = useState('');
  const [selectedCode,  setSelectedCode]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  // auto-match on open
  useEffect(() => {
    const matched = tryAutoMatch(batch.categoryCode, batch.categoryName);
    if (matched) setSelectedCode(matched);
  }, [batch]);

  const handleSubmit = async (pdf = false) => {
    if (!decision) { toast.error('Select Accept / Reject / Hold'); return; }
    try {
      setSubmitting(true);
      await qcApi.bulkDecision({
        batchId:        batch.batchId,
        decision:       decision,
        overallRemarks: remarks || null,
        checklists:     [],
      }, pdf);
      toast.success(`Batch ${batch.batchRef} — ${decision}`);
      onDone(batch.batchId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (type) => {
    const code = selectedCode;
    if (!code) { toast.warning('Select a template first to download'); return; }
    try {
      const token = localStorage.getItem('token');
      const ext   = type === 'excel' ? 'xlsx' : 'docx';
      const mime  = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const res = await axios.get(`/api/qc/templates/blank/${code}/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `QC_Checklist_${code}_${batch.batchRef}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${code} checklist (.${ext})`);
    } catch {
      toast.error('Download failed');
    }
  };

  const DECISIONS = [
    { key: 'ACCEPTED', label: 'Accept',  icon: FiCheckCircle, color: '#10b981', bg: '#d1fae5', border: '#6ee7b7' },
    { key: 'REJECTED', label: 'Reject',  icon: FiXCircle,     color: '#ef4444', bg: '#fee2e2', border: '#fca5a5' },
    { key: 'HOLD',     label: 'Hold',    icon: FiPauseCircle, color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
  ];

  const matched = tryAutoMatch(batch.categoryCode, batch.categoryName);

  return (
    <div className="qcq-modal-overlay" onClick={onClose}>
      <div className="qcq-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="qcq-modal-head">
          <div className="qcq-modal-head-left">
            <span className="qcq-modal-ref">{batch.batchRef}</span>
            <span className="qcq-modal-meta">
              {batch.categoryName || batch.categoryCode} · {batch.supplierName || '—'}
            </span>
          </div>
          <button className="qcq-modal-close" onClick={onClose}><FiX size={16} /></button>
        </div>

        <div className="qcq-modal-body">

          {/* ── Template selector ── */}
          <div className="qcq-modal-section">
            <div className="qcq-modal-section-label">
              <FiGrid size={13} /> Checklist Template
              {matched && (
                <span className="qcq-modal-auto-badge">✓ Auto: {matched}</span>
              )}
            </div>

            {!matched && (
              <div className="qcq-modal-no-match">
                <FiTag size={12} />
                <span>
                  <strong>"{batch.categoryName || batch.categoryCode}"</strong> — select checklist:
                </span>
              </div>
            )}

            <div className="qcq-modal-tpl-row">
              <div className="qcq-modal-tpl-wrap">
                <select
                  className="qcq-modal-tpl-select"
                  value={selectedCode}
                  onChange={e => setSelectedCode(e.target.value)}
                >
                  <option value="">— Select checklist —</option>
                  {templates.map(t => (
                    <option key={t.categoryCode} value={t.categoryCode}>
                      {t.categoryName || t.categoryCode} ({t.categoryCode})
                    </option>
                  ))}
                </select>
                <FiChevronDown size={12} className="qcq-modal-tpl-icon" />
              </div>

              {/* Download buttons */}
              <button
                className="qcq-modal-dl-btn excel"
                onClick={() => handleDownload('excel')}
                disabled={!selectedCode}
                title="Download Excel checklist"
              >
                <FiDownload size={12} /> Excel
              </button>
              <button
                className="qcq-modal-dl-btn word"
                onClick={() => handleDownload('docx')}
                disabled={!selectedCode}
                title="Download Word checklist"
              >
                <FiDownload size={12} /> Word
              </button>
            </div>
          </div>

          {/* ── Decision buttons ── */}
          <div className="qcq-modal-section">
            <div className="qcq-modal-section-label">
              <FiCheckCircle size={13} /> Quick Decision
            </div>
            <div className="qcq-modal-decisions">
              {DECISIONS.map(d => {
                const Icon   = d.icon;
                const active = decision === d.key;
                return (
                  <button
                    key={d.key}
                    className={`qcq-modal-decision-btn ${active ? 'active' : ''}`}
                    onClick={() => setDecision(d.key)}
                    style={active
                      ? { background: d.bg, borderColor: d.color, color: d.color }
                      : { borderColor: d.border, color: d.color }}
                  >
                    <Icon size={20} />
                    <span>{d.label}</span>
                    {active && <span className="qcq-modal-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Remarks ── */}
          <div className="qcq-modal-section">
            <textarea
              className="qcq-modal-remarks"
              placeholder="Remarks (optional)…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
            />
          </div>

          {/* ── Submit buttons ── */}
          <div className="qcq-modal-footer">
            <button className="qcq-modal-cancel" onClick={onClose}>Cancel</button>
            <button
              className="qcq-modal-submit"
              onClick={() => handleSubmit(false)}
              disabled={submitting || !decision}
            >
              {submitting ? 'Submitting…' : 'Submit Only'}
            </button>
            <button
              className="qcq-modal-submit pdf"
              onClick={() => handleSubmit(true)}
              disabled={submitting || !decision}
            >
              {submitting ? 'Submitting…' : 'Submit & PDF'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
const QcQueue = () => {
  const navigate = useNavigate();

  const [batches,        setBatches]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [search,         setSearch]         = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page,           setPage]           = useState(1);
  const [templates,      setTemplates]      = useState([]);

  // Quick decision modal state
  const [modalBatch,     setModalBatch]     = useState(null);

  useEffect(() => { loadQueue(); loadTemplates(); }, []);
  useEffect(() => { setPage(1); }, [search, filterCategory]);

  const loadQueue = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const res = await qcApi.getQueue();
      setBatches(res.data.data || res.data || []);
      if (silent) toast.success('Queue refreshed', { autoClose: 1200 });
    } catch {
      toast.error('Failed to load QC queue');
      setBatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res  = await qcApi.getTemplates();
      const data = res.data.data || res.data || [];
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates(TEMPLATE_CODES.map(c => ({ categoryCode: c, categoryName: c })));
    }
  };

  // Remove batch from queue after decision
  const handleDecisionDone = (batchId) => {
    setBatches(prev => prev.filter(b => b.batchId !== batchId));
    setModalBatch(null);
  };

  // ── Filter/pagination ────────────────────────────────
  const categories = useMemo(() => {
    const map = new Map();
    batches.forEach(b => {
      const code  = catCode(b);
      const label = catLabel(b);
      if (!map.has(code)) map.set(code, label);
    });
    return [{ code: 'all', label: 'All' },
      ...Array.from(map.entries()).map(([code, label]) => ({ code, label }))];
  }, [batches]);

  const filtered = useMemo(() => {
    let list = batches;
    if (filterCategory !== 'all') list = list.filter(b => catCode(b) === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        [b.batchRef, b.supplierName, b.createdByName, b.invoiceNo, b.categoryName, b.categoryCode]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [batches, search, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageNums = () => {
    let s = Math.max(1, safePage - 2);
    let e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    const n = [];
    for (let i = s; i <= e; i++) n.push(i);
    return n;
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',
    { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const fmtTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return (
    <div className="qcq-loading"><div className="qcq-spinner" /><span>Loading QC queue…</span></div>
  );

  return (
    <div className="qcq-page">

      {/* ─── HEADER ─── */}
      <div className="qcq-header">
        <div className="qcq-header-left">
          <div className="qcq-header-icon">
            <FiClipboard size={18} />
            {batches.length > 0 && <span className="qcq-header-badge">{batches.length}</span>}
          </div>
          <div>
            <h1 className="qcq-title">QC Inspection Queue</h1>
            <p className="qcq-subtitle">
              {batches.length === 0
                ? 'No batches pending inspection'
                : `${filtered.length} of ${batches.length} batch${batches.length !== 1 ? 'es' : ''} awaiting inspection`}
            </p>
          </div>
        </div>
        <div className="qcq-header-right">
          <div className="qcq-inline-stats">
            <div className="qcq-inline-stat qcq-is-warning">
              <FiClock size={12} /><span><strong>{batches.length}</strong> Pending</span>
            </div>
            <div className="qcq-inline-stat qcq-is-info">
              <FiPackage size={12} />
              <span><strong>{batches.reduce((s, b) => s + (b.itemCount || 0), 0)}</strong> Items</span>
            </div>
            <div className="qcq-inline-stat qcq-is-purple">
              <FiTag size={12} /><span><strong>{categories.length - 1}</strong> Categories</span>
            </div>
          </div>
          <button className="qcq-btn-refresh" onClick={() => loadQueue(true)} disabled={refreshing}>
            <FiRefreshCw size={13} className={refreshing ? 'qcq-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─── FILTER BAR ─── */}
      <div className="qcq-filter-bar">
        <div className="qcq-search-wrap">
          <FiSearch size={14} className="qcq-search-icon" />
          <input
            type="text"
            placeholder="Search batch ref, supplier, invoice, category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="qcq-search-input"
          />
          {search && (
            <button className="qcq-search-clear" onClick={() => setSearch('')}>
              <FiX size={12} />
            </button>
          )}
        </div>
        {categories.length > 1 && (
          <div className="qcq-pills">
            {categories.map(({ code, label }) => {
              const count  = code === 'all' ? batches.length : batches.filter(b => catCode(b) === code).length;
              const active = filterCategory === code;
              const c      = code === 'all' ? null : catColor(code);
              return (
                <button key={code}
                  className={`qcq-pill ${active ? 'qcq-pill-active' : ''}`}
                  onClick={() => setFilterCategory(code)}
                  style={c && active ? { background: c.fg, borderColor: c.fg, color: '#fff' } : {}}>
                  {label}<span className="qcq-pill-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── TABLE ─── */}
      {filtered.length === 0 ? (
        <div className="qcq-empty">
          <div className="qcq-empty-icon"><FiCheckCircle size={36} /></div>
          <h3>{batches.length === 0 ? 'Nothing to inspect!' : 'No matches'}</h3>
          <p>{batches.length === 0 ? 'All batches have been inspected.' : 'Try adjusting filters.'}</p>
          {(search || filterCategory !== 'all') && (
            <button className="qcq-btn-secondary"
              onClick={() => { setSearch(''); setFilterCategory('all'); }}>
              <FiX size={12} /> Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="qcq-table-card">
          <div className="qcq-table-wrap">
            <table className="qcq-table">
              <thead>
                <tr>
                  <th className="qcq-th-num">#</th>
                  <th className="qcq-th-ref">Batch Ref</th>
                  <th className="qcq-th-cat">Category</th>
                  <th className="qcq-th-tpl">Template</th>
                  <th className="qcq-th-sup">Supplier</th>
                  <th className="qcq-th-date">Date</th>
                  <th className="qcq-th-items">Items</th>
                  <th className="qcq-th-time">Added</th>
                  <th className="qcq-th-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((batch, idx) => {
                  const code    = catCode(batch);
                  const label   = catLabel(batch);
                  const c       = catColor(code);
                  const matched = tryAutoMatch(batch.categoryCode, batch.categoryName);

                  return (
                    <tr key={batch.batchId} className="qcq-tr"
                      style={{ '--row-dot': c.dot }}>

                      <td className="qcq-td-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>

                      {/* Batch ref */}
                      <td className="qcq-td-ref"
                        onClick={() => navigate(`/qc/batches/${batch.batchId}`)}
                        style={{ cursor: 'pointer' }}>
                        <FiFileText size={12} className="qcq-ref-icon" />
                        {batch.batchRef || `#${batch.batchId}`}
                      </td>

                      {/* Category badge */}
                      <td>
                        <span className="qcq-cat-badge" style={{ background: c.bg, color: c.fg }}>
                          {label}
                        </span>
                      </td>

                      {/* ★ Template badge — NEW ★ */}
                      <td>
                        {matched ? (
                          <span className="qcq-tpl-badge matched" title={`Auto-matched to ${matched}`}>
                            ✓ {matched}
                          </span>
                        ) : (
                          <span className="qcq-tpl-badge unmatched" title="No auto-match — select in modal">
                            Select
                          </span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="qcq-td-supplier">
                        <span className="qcq-supplier-name">
                          {batch.supplierName || <span className="qcq-dim">—</span>}
                        </span>
                        {batch.invoiceNo && <span className="qcq-invoice-num">{batch.invoiceNo}</span>}
                      </td>

                      <td className="qcq-td-date">{fmtDate(batch.receivedDate || batch.createdAt)}</td>

                      <td className="qcq-td-items">
                        <span className="qcq-items-badge">{batch.itemCount || 0}</span>
                      </td>

                      <td className="qcq-td-time">
                        <FiClock size={11} />{fmtTime(batch.createdAt)}
                      </td>

                      {/* ★ Actions — NEW ★ */}
                      <td className="qcq-td-action" onClick={e => e.stopPropagation()}>
                        <div className="qcq-action-group">

                          {/* Quick Accept/Reject/Hold buttons */}
                          <button
                            className="qcq-quick-btn accept"
                            title="Quick Accept"
                            onClick={() => setModalBatch({ ...batch, _preset: 'ACCEPTED' })}
                          >
                            <FiCheckCircle size={13} />
                          </button>
                          <button
                            className="qcq-quick-btn reject"
                            title="Quick Reject"
                            onClick={() => setModalBatch({ ...batch, _preset: 'REJECTED' })}
                          >
                            <FiXCircle size={13} />
                          </button>
                          <button
                            className="qcq-quick-btn hold"
                            title="Quick Hold"
                            onClick={() => setModalBatch({ ...batch, _preset: 'HOLD' })}
                          >
                            <FiPauseCircle size={13} />
                          </button>

                          {/* Full inspect button */}
                          <button
                            className="qcq-inspect-btn"
                            onClick={() => navigate(`/qc/batches/${batch.batchId}`)}
                          >
                            Inspect <FiChevronRight size={13} />
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
          <div className="qcq-pagination">
            <span className="qcq-pg-info">
              {`${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} batches`}
            </span>
            <div className="qcq-pg-controls">
              <button className="qcq-pg-btn" onClick={() => setPage(1)} disabled={safePage === 1}>
                <FiChevronsLeft size={13} />
              </button>
              <button className="qcq-pg-btn" onClick={() => setPage(safePage - 1)} disabled={safePage === 1}>
                <FiChevronLeft size={13} />
              </button>
              {pageNums().map(p => (
                <button key={p}
                  className={`qcq-pg-btn qcq-pg-num ${p === safePage ? 'qcq-pg-active' : ''}`}
                  onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="qcq-pg-btn" onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}>
                <FiChevronRight size={13} />
              </button>
              <button className="qcq-pg-btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>
                <FiChevronsRight size={13} />
              </button>
            </div>
            <div className="qcq-pg-jump">
              <span>Go to</span>
              <input type="number" min="1" max={totalPages} placeholder={String(safePage)}
                onKeyDown={e => {
                  if (e.key === 'Enter')
                    setPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)));
                }} />
              <span>of {totalPages}</span>
            </div>
          </div>
        </div>
      )}

      {/* ★ QUICK DECISION MODAL ★ */}
      {modalBatch && (
        <QuickDecisionModal
          batch={modalBatch}
          templates={templates}
          onClose={() => setModalBatch(null)}
          onDone={handleDecisionDone}
        />
      )}

    </div>
  );
};

export default QcQueue;