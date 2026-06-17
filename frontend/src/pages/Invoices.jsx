import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiFileText, FiSearch, FiCalendar, FiUser, FiPackage,
  FiDownload, FiRefreshCw, FiX, FiExternalLink, FiHash,
  FiTruck, FiDollarSign, FiClock, FiFilter, FiEye, FiPrinter,
  FiCheckCircle, FiLink, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import api from '../api/axios'; // ⚠️ adjust to your axios instance path
// Common patterns — use whichever your project actually has:
import api from '../api/axiosConfig';
import api from '../services/api';
import axios from '../api/axiosInstance';
// ── Helpers ──────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
};

const fmtMoney = (v, code = 'INR') => {
  if (v == null) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: code || 'INR', maximumFractionDigits: 2,
    }).format(v);
  } catch { return `${code} ${v}`; }
};

const num = (v) => (v == null ? 0 : Number(v) || 0);

// ════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════
const Invoices = () => {
  const [rows, setRows]      = useState([]);   // InvoiceSummaryDto[]
  const [q, setQ]           = useState('');
  const [page, setPage]     = useState(0);
  const [size]              = useState(10);
  const [totalPages, setTP] = useState(0);
  const [total, setTotal]   = useState(0);
  const [loading, setLoad]  = useState(false);

  // client-side date filter
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');

  // detail modal
  const [detail, setDetail]            = useState(null); // InvoiceDetailDto
  const [detailLoading, setDetailLoad] = useState(false);

  // ── Fetch page ───────────────────────────────────────────
  const load = useCallback(async (searchQ = q, pageNo = page) => {
    setLoad(true);
    try {
      const res = await api.get('/api/qc/invoices', {
        params: { q: searchQ, page: pageNo, size },
      });
      const data = res.data;
      setRows(data.content || []);
      setTP(data.totalPages || 0);
      setTotal(data.totalElements ?? (data.content?.length || 0));
    } catch (e) {
      console.error('Failed to load invoices', e);
      setRows([]);
    } finally {
      setLoad(false);
    }
  }, [q, page, size]);

  useEffect(() => { load(q, page); }, [page]); // eslint-disable-line

  const onSearch = () => { setPage(0); load(q, 0); };

  // ── Client-side date filtering on current page ───────────
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (!r.invoiceDate) return true;
      const d = new Date(r.invoiceDate);
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate && d > new Date(toDate + 'T23:59:59')) return false;
      return true;
    });
  }, [rows, fromDate, toDate]);

  // ── Stats on current view ────────────────────────────────
  const stats = useMemo(() => {
    const valueSum = filteredRows.reduce((s, r) => s + num(r.invoiceTotal), 0);
    const itemSum  = filteredRows.reduce((s, r) => s + num(r.itemCount), 0);
    const withFile = filteredRows.filter(r => r.hasFile).length;
    const linked   = filteredRows.filter(r => r.stockInBatchId).length;
    return { count: filteredRows.length, valueSum, itemSum, withFile, linked };
  }, [filteredRows]);

  // ── Open detail modal ────────────────────────────────────
  const openDetail = async (id) => {
    setDetailLoad(true);
    setDetail({ id, __loading: true });
    try {
      const res = await api.get(`/api/qc/invoices/${id}`);
      setDetail(res.data);
    } catch (e) {
      console.error('Failed to load detail', e);
      setDetail(null);
    } finally {
      setDetailLoad(false);
    }
  };

  const downloadFile = async (id, fileName) => {
    try {
      const res = await api.get(`/api/qc/invoices/${id}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `invoice-${id}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('Download failed', e); }
  };

  // ── CSV export of current view ───────────────────────────
  const exportCsv = () => {
    const header = ['Invoice No', 'Date', 'Supplier', 'GSTIN', 'PO No', 'Items', 'Total', 'Currency', 'Batch'];
    const lines = filteredRows.map(r => [
      r.invoiceNo, fmtDate(r.invoiceDate), r.supplierName || '',
      r.supplierGstin || '', r.poNo || '', r.itemCount ?? 0,
      num(r.invoiceTotal), r.currencyCode || 'INR', r.stockInBatchId || '',
    ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `invoices-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={S.wrap}>
      {/* ── Header ── */}
      <div style={S.head}>
        <div style={S.titleBox}>
          <span style={S.titleIcon}><FiFileText size={20} /></span>
          <div>
            <h2 style={S.title}>Purchase Invoices</h2>
            <span style={S.sub}>{total} invoice{total !== 1 ? 's' : ''} in system</span>
          </div>
        </div>
        <div style={S.headActions}>
          <button style={S.ghostBtn} onClick={exportCsv} title="Export current view to CSV">
            <FiDownload size={15} /> Export CSV
          </button>
          <button style={S.iconBtn} onClick={() => load(q, page)} title="Refresh">
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={S.statRow}>
        <StatCard icon={<FiFileText />} label="Invoices (view)" value={stats.count} color="#06b6d4" />
        <StatCard icon={<FiDollarSign />} label="Total value" value={fmtMoney(stats.valueSum)} color="#10b981" />
        <StatCard icon={<FiPackage />} label="Line items" value={stats.itemSum} color="#6366f1" />
        <StatCard icon={<FiCheckCircle />} label="With file" value={`${stats.withFile}/${stats.count}`} color="#f59e0b" />
        <StatCard icon={<FiLink />} label="Linked to batch" value={`${stats.linked}/${stats.count}`} color="#8b5cf6" />
      </div>

      {/* ── Filter bar ── */}
      <div style={S.filterBar}>
        <div style={S.searchBox}>
          <FiSearch size={16} style={{ color: '#94a3b8' }} />
          <input
            style={S.searchInput}
            placeholder="Search invoice no, supplier, PO…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <button style={S.searchBtn} onClick={onSearch}>Search</button>
        </div>
        <div style={S.dateFilter}>
          <FiFilter size={14} style={{ color: '#64748b' }} />
          <label style={S.dateLabel}>From</label>
          <input type="date" style={S.dateInput} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <label style={S.dateLabel}>To</label>
          <input type="date" style={S.dateInput} value={toDate} onChange={e => setToDate(e.target.value)} />
          {(fromDate || toDate) && (
            <button style={S.clearBtn} onClick={() => { setFromDate(''); setToDate(''); }}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Invoice No</th>
              <th style={S.th}>Date</th>
              <th style={S.th}>Supplier</th>
              <th style={S.th}>GSTIN</th>
              <th style={S.th}>PO No</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Items</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Total</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Batch</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={S.empty}>Loading…</td></tr>}
            {!loading && filteredRows.length === 0 && (
              <tr><td colSpan={9} style={S.empty}>No invoices match your filters</td></tr>
            )}
            {!loading && filteredRows.map((inv) => (
              <tr key={inv.id} style={S.tr} onClick={() => openDetail(inv.id)}>
                <td style={{ ...S.td, fontWeight: 600, color: '#1e3a8a' }}>{inv.invoiceNo}</td>
                <td style={S.td}>
                  <span style={S.cellMuted}><FiCalendar size={13} /> {fmtDate(inv.invoiceDate)}</span>
                </td>
                <td style={S.td}>
                  <span style={S.cellMuted}><FiUser size={13} /> {inv.supplierName || '—'}</span>
                </td>
                <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{inv.supplierGstin || '—'}</td>
                <td style={S.td}>{inv.poNo || '—'}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>
                  <span style={S.badge}>{inv.itemCount ?? 0}</span>
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>
                  {fmtMoney(inv.invoiceTotal, inv.currencyCode)}
                </td>
                <td style={{ ...S.td, textAlign: 'center' }}>
                  {inv.stockInBatchId
                    ? <span style={S.linkBadge}>#{inv.stockInBatchId}</span>
                    : <span style={S.unlinked}>—</span>}
                </td>
                <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <button style={S.actBtn} onClick={() => openDetail(inv.id)} title="View details">
                    <FiEye size={14} />
                  </button>
                  {inv.hasFile && (
                    <button style={{ ...S.actBtn, color: '#059669', background: '#ecfdf5' }}
                      onClick={() => downloadFile(inv.id, inv.fileName)} title={inv.fileName}>
                      <FiDownload size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={S.pager}>
          <button style={{ ...S.pageBtn, ...(page === 0 ? S.disabled : {}) }}
            disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
            <FiChevronLeft size={15} /> Prev
          </button>
          <span style={S.pageInfo}>Page {page + 1} of {totalPages}</span>
          <button style={{ ...S.pageBtn, ...(page >= totalPages - 1 ? S.disabled : {}) }}
            disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
            Next <FiChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── Detail modal ── */}
      {detail && (
        <InvoiceDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          onDownload={downloadFile}
        />
      )}

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        @media print{body *{visibility:hidden}#inv-print,#inv-print *{visibility:visible}#inv-print{position:absolute;left:0;top:0;width:100%}}`}</style>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
//  STAT CARD
// ════════════════════════════════════════════════════════════
const StatCard = ({ icon, label, value, color }) => (
  <div style={S.statCard}>
    <span style={{ ...S.statIcon, background: `${color}1a`, color }}>{icon}</span>
    <div>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  DETAIL MODAL
// ════════════════════════════════════════════════════════════
const InvoiceDetailModal = ({ detail, loading, onClose, onDownload }) => {
  const items = detail?.items || [];
  const isLoading = loading || detail?.__loading;

  const computed = useMemo(() => {
    const sum = items.reduce((s, it) => s + num(it.lineTotal), 0);
    const qty = items.reduce((s, it) => s + num(it.quantity), 0);
    return { sum, qty };
  }, [items]);

  const total = num(detail?.invoiceTotal) || computed.sum;
  const cur = detail?.currencyCode || 'INR';

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={S.modalHead}>
          <div style={S.modalTitleBox}>
            <span style={S.titleIcon}><FiFileText size={18} /></span>
            <div>
              <h3 style={S.modalTitle}>
                {isLoading ? 'Loading…' : (detail.invoiceNo || `Invoice #${detail.id}`)}
              </h3>
              <span style={S.sub}>Purchase Invoice Detail</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.iconBtn} onClick={() => window.print()} title="Print"><FiPrinter size={16} /></button>
            <button style={S.iconBtn} onClick={onClose} title="Close"><FiX size={18} /></button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading invoice…</div>
        ) : (
          <div style={S.modalBody} id="inv-print">
            {/* ── Info grid ── */}
            <div style={S.infoGrid}>
              <InfoField icon={<FiHash />} label="Invoice No" value={detail.invoiceNo} />
              <InfoField icon={<FiCalendar />} label="Invoice Date" value={fmtDate(detail.invoiceDate)} />
              <InfoField icon={<FiTruck />} label="PO No" value={detail.poNo || '—'} />
              <InfoField icon={<FiUser />} label="Supplier" value={detail.supplierName || '—'} />
              <InfoField icon={<FiHash />} label="Supplier GSTIN" value={detail.supplierGstin || '—'} mono />
              <InfoField icon={<FiLink />} label="Stock IN Batch"
                value={detail.stockInBatchId ? `#${detail.stockInBatchId}` : 'Not linked'} />
              <InfoField icon={<FiClock />} label="Uploaded" value={fmtDateTime(detail.uploadedAt)} />
              <InfoField icon={<FiDollarSign />} label="Currency" value={cur} />
            </div>

            {/* ── File block ── */}
            {detail.fileName && (
              <div style={S.fileBlock}>
                <div style={S.fileInfo}>
                  <FiFileText size={18} style={{ color: '#06b6d4' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{detail.fileName}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {detail.fileMimeType || 'file'}
                      {detail.fileSize ? ` · ${(detail.fileSize / 1024).toFixed(0)} KB` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`/api/qc/invoices/${detail.id}/file`} target="_blank" rel="noreferrer" style={S.fileLink}>
                    <FiExternalLink size={14} /> Preview
                  </a>
                  <button style={S.fileLinkSolid} onClick={() => onDownload(detail.id, detail.fileName)}>
                    <FiDownload size={14} /> Download
                  </button>
                </div>
              </div>
            )}

            {/* ── Line items ── */}
            <div style={S.itemsHead}>
              <FiPackage size={15} /> Line Items
              <span style={S.itemsCount}>{items.length}</span>
            </div>

            {items.length === 0 ? (
              <div style={S.noItems}>No line items recorded for this invoice.</div>
            ) : (
              <div style={S.itemsTableWrap}>
                <table style={S.itemsTable}>
                  <thead>
                    <tr>
                      <th style={S.itemTh}>#</th>
                      <th style={S.itemTh}>Part No</th>
                      <th style={S.itemTh}>Description</th>
                      <th style={S.itemTh}>HSN/SAC</th>
                      <th style={{ ...S.itemTh, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...S.itemTh, textAlign: 'right' }}>Unit Price</th>
                      <th style={{ ...S.itemTh, textAlign: 'right' }}>Line Total</th>
                      <th style={{ ...S.itemTh, textAlign: 'center' }}>Matched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id ?? i}>
                        <td style={S.itemTd}>{it.slNo ?? i + 1}</td>
                        <td style={{ ...S.itemTd, fontWeight: 600 }}>{it.partNo || '—'}</td>
                        <td style={S.itemTd}>{it.description || '—'}</td>
                        <td style={{ ...S.itemTd, fontFamily: 'monospace', fontSize: 12 }}>{it.hsnSac || '—'}</td>
                        <td style={{ ...S.itemTd, textAlign: 'right' }}>{it.quantity ?? '—'}</td>
                        <td style={{ ...S.itemTd, textAlign: 'right' }}>{fmtMoney(it.unitPrice, cur)}</td>
                        <td style={{ ...S.itemTd, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(it.lineTotal, cur)}</td>
                        <td style={{ ...S.itemTd, textAlign: 'center' }}>
                          {it.matchedProductId
                            ? <span style={S.matched} title={`Product #${it.matchedProductId}`}><FiCheckCircle size={14} /></span>
                            : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={S.footLabel}>Totals</td>
                      <td style={{ ...S.footCell, textAlign: 'right' }}>{computed.qty}</td>
                      <td style={S.footCell}></td>
                      <td style={{ ...S.footCell, textAlign: 'right' }}>{fmtMoney(computed.sum, cur)}</td>
                      <td style={S.footCell}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ── Grand total ── */}
            <div style={S.totalBlock}>
              {Math.abs(computed.sum - num(detail.invoiceTotal)) > 0.01 && num(detail.invoiceTotal) > 0 && (
                <div style={S.mismatch}>
                  ⚠ Line items sum ({fmtMoney(computed.sum, cur)}) differs from invoice total
                </div>
              )}
              <div style={S.grandTotal}>
                <span>Invoice Total</span>
                <strong>{fmtMoney(total, cur)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoField = ({ icon, label, value, mono }) => (
  <div style={S.infoField}>
    <div style={S.infoLabel}>{icon} {label}</div>
    <div style={{ ...S.infoValue, ...(mono ? { fontFamily: 'monospace', fontSize: 13 } : {}) }}>{value}</div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════
const S = {
  wrap: { padding: '4px 2px' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 18 },
  titleBox: { display: 'flex', alignItems: 'center', gap: 12 },
  titleIcon: { width: 40, height: 40, borderRadius: 10, background: 'rgba(6,182,212,0.12)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b' },
  headActions: { display: 'flex', gap: 8, alignItems: 'center' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 9, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' },
  iconBtn: { background: '#f1f5f9', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' },

  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 },
  statCard: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' },
  statIcon: { width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statValue: { fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 },
  statLabel: { fontSize: 12, color: '#64748b' },

  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 10px' },
  searchInput: { border: 'none', outline: 'none', fontSize: 14, width: 240, color: '#0f172a' },
  searchBtn: { background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  dateFilter: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 12px' },
  dateLabel: { fontSize: 12, color: '#64748b', fontWeight: 600 },
  dateInput: { border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#334155' },
  clearBtn: { background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr: { cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 14px', color: '#1e293b' },
  cellMuted: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569' },
  badge: { display: 'inline-block', minWidth: 24, padding: '2px 8px', borderRadius: 12, background: '#e0f2fe', color: '#0369a1', fontSize: 12, fontWeight: 600 },
  linkBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: '#f3e8ff', color: '#7c3aed', fontSize: 12, fontWeight: 600 },
  unlinked: { color: '#cbd5e1' },
  actBtn: { background: '#eff6ff', color: '#1e3a8a', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 2px' },
  empty: { padding: '40px', textAlign: 'center', color: '#94a3b8' },

  pager: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 },
  pageBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#1e3a8a', cursor: 'pointer' },
  disabled: { opacity: 0.45, cursor: 'not-allowed' },
  pageInfo: { fontSize: 13, color: '#64748b' },

  // modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', zIndex: 1000, overflowY: 'auto' },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 900, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  modalTitleBox: { display: 'flex', alignItems: 'center', gap: 12 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  modalBody: { padding: 22, maxHeight: '70vh', overflowY: 'auto' },

  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 },
  infoField: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' },
  infoLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' },

  fileBlock: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px', marginBottom: 20 },
  fileInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  fileLink: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, color: '#0369a1', textDecoration: 'none' },
  fileLinkSolid: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#06b6d4', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' },

  itemsHead: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10 },
  itemsCount: { background: '#e0f2fe', color: '#0369a1', borderRadius: 12, padding: '1px 9px', fontSize: 12 },
  noItems: { padding: '24px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, fontSize: 13 },
  itemsTableWrap: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' },
  itemsTable: { width: '100%', borderCollapse: 'collapse' },
  itemTh: { textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', textTransform: 'uppercase' },
  itemTd: { padding: '9px 12px', fontSize: 13, color: '#334155', borderTop: '1px solid #f1f5f9' },
  matched: { color: '#10b981', display: 'inline-flex' },
  footLabel: { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#475569', background: '#f8fafc', textAlign: 'right', textTransform: 'uppercase' },
  footCell: { padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#1e293b', background: '#f8fafc', borderTop: '2px solid #e2e8f0' },

  totalBlock: { marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  mismatch: { fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px' },
  grandTotal: { display: 'flex', alignItems: 'center', gap: 16, background: '#1e3a8a', color: '#fff', borderRadius: 10, padding: '12px 22px', fontSize: 16 },
};

export default Invoices;
