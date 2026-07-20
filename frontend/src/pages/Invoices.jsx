import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  FiFileText, FiSearch, FiCalendar, FiUser, FiPackage,
  FiDownload, FiRefreshCw, FiExternalLink, FiHash,
  FiTruck, FiClock, FiPrinter, FiChevronLeft, FiChevronRight,
  FiCheckCircle, FiLink, FiChevronDown, FiArrowDown, FiArrowUp,
  FiInbox, FiPaperclip, FiAlertTriangle, FiShield, FiX, FiArrowLeft,
  FiEye, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';

// ── Thin axios wrapper so this file behaves like the rest of the app ──
const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});
const api = {
  get: (url, config = {}) =>
    axios.get(url, { ...config, headers: { ...authHeaders().headers, ...(config.headers || {}) } }),
};

// ── Error → human-readable message ──────────────────────────
const describeError = (e) => {
  if (e.response) {
    return `Server error ${e.response.status}: ${e.response.data?.message || e.response.statusText || 'no message'}`;
  }
  return `Network error: ${e.message} (URL: ${e.config?.baseURL || ''}${e.config?.url || ''})`;
};

// ── Helpers ──────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
};
const num = (v) => (v == null ? 0 : Number(v) || 0);
const initials = (name) => {
  if (!name) return '#';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '#';
};
const AV = ['#6366f1', '#0ea5e9', '#0d9488', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#dc2626'];
const avatarColor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % AV.length;
  return AV[h];
};
const TAG = [
  { bg: '#eef2ff', fg: '#4f46e5' }, { bg: '#ecfeff', fg: '#0891b2' },
  { bg: '#f0fdf4', fg: '#16a34a' }, { bg: '#fef9c3', fg: '#a16207' },
  { bg: '#fce7f3', fg: '#be185d' }, { bg: '#f3e8ff', fg: '#7c3aed' },
  { bg: '#fff7ed', fg: '#c2410c' }, { bg: '#e0f2fe', fg: '#0369a1' },
];
const tagColor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % TAG.length;
  return TAG[h];
};
const verifyInvoice = (inv) => {
  const hasFile = !!inv.hasFile;
  const linked = !!inv.stockInBatchId;
  if (hasFile && linked) return { level: 'verified', label: 'Verified', color: '#16a34a' };
  if (hasFile || linked) return { level: 'partial', label: 'Partial', color: '#d97706' };
  return { level: 'open', label: 'Open', color: '#94a3b8' };
};

// ════════════════════════════════════════════════════════════
//  ROOT — switches LIST ↔ DETAIL
//  ★ Passes the whole row: detail loads by id OR by invoiceNo
// ════════════════════════════════════════════════════════════
const Invoices = () => {
  const [view, setView] = useState('list');
  const [activeRef, setActiveRef] = useState(null); // { id, invoiceNo }

  const openDetail = (inv) => {
    setActiveRef({ id: inv.id ?? null, invoiceNo: inv.invoiceNo ?? null });
    setView('detail');
    window.scrollTo(0, 0);
  };
  const backToList = () => { setView('list'); window.scrollTo(0, 0); };

  const downloadFile = async (id, fileName) => {
    if (id == null) return;
    try {
      const res = await axios.get(`/api/qc/invoices/${id}/file`, {
        responseType: 'blob',
        ...authHeaders(),
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = fileName || `invoice-${id}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('Download failed', e); }
  };

  return (
    <div style={S.page}>
      {view === 'list'
        ? <ListScreen onOpen={openDetail} />
        : <DetailScreen refInfo={activeRef} onBack={backToList} onDownload={downloadFile} />}
      <style>{`
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes scrIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .inv-tr{transition:background .12s}
        .inv-tr:hover{background:#f6f8fc}
        .inv-item-row:hover{background:#fafbfc}
        @media print{
          body *{visibility:hidden}
          #inv-print,#inv-print *{visibility:visible}
          #inv-print{position:absolute;left:0;top:0;width:100%;padding:0}
        }
      `}</style>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
//  SCREEN 1 — STOCK-OVERVIEW-STYLE TABLE
// ════════════════════════════════════════════════════════════
const ListScreen = ({ onOpen }) => {
  const [rows, setRows]     = useState([]);
  const [q, setQ]           = useState('');
  const [page, setPage]     = useState(0);
  const [size, setSize]     = useState(10);
  const [totalPages, setTP] = useState(0);
  const [total, setTotal]   = useState(0);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState(null);

  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [goTo, setGoTo] = useState('');

  const load = useCallback(async (searchQ = q, pageNo = page, pageSize = size) => {
    setLoad(true); setError(null);
    try {
      const res = await api.get('/api/qc/invoices', { params: { q: searchQ, page: pageNo, size: pageSize } });
      const data = res.data;
      setRows(data.content || []);
      setTP(data.totalPages || 0);
      setTotal(data.totalElements ?? (data.content?.length || 0));
    } catch (e) {
      console.error('Failed to load invoices', e);
      setRows([]);
      setError(describeError(e));
    } finally { setLoad(false); }
  }, [q, page, size]);

  useEffect(() => { load(q, page, size); /* eslint-disable-line */ }, [page, size]);

  const onSearch = () => { setPage(0); load(q, 0, size); };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'date' || key === 'items' ? 'desc' : 'asc'); }
  };

  const sortedRows = useMemo(() => {
    const r = [...rows];
    const dir = sortDir === 'asc' ? 1 : -1;
    r.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case 'supplier': av = (a.supplierName || '').toLowerCase(); bv = (b.supplierName || '').toLowerCase(); break;
        case 'items':    av = num(a.itemCount); bv = num(b.itemCount); break;
        case 'invoice':  av = (a.invoiceNo || '').toLowerCase(); bv = (b.invoiceNo || '').toLowerCase(); break;
        default:         av = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
                         bv = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return r;
  }, [rows, sortKey, sortDir]);

  const filterActive = q.trim().length > 0;
  const from = total === 0 ? 0 : page * size + 1;
  const to = page * size + sortedRows.length;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [0];
    const out = []; const win = 1;
    const start = Math.max(0, page - win);
    const end = Math.min(totalPages - 1, page + win);
    out.push(0);
    if (start > 1) out.push('…');
    for (let p = Math.max(1, start); p <= Math.min(totalPages - 2, end); p++) out.push(p);
    if (end < totalPages - 2) out.push('…');
    if (totalPages > 1) out.push(totalPages - 1);
    return out.filter((v, i) => v !== out[i - 1]);
  }, [page, totalPages]);

  const submitGoTo = () => {
    const n = parseInt(goTo, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n - 1);
    setGoTo('');
  };

  const SortCaret = ({ k }) => sortKey !== k
    ? <FiChevronDown size={12} style={{ opacity: 0.4 }} />
    : (sortDir === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />);

  return (
    <div style={{ animation: 'scrIn .25s ease' }}>
      <div style={S.banner}>
        <div style={S.bannerSheen} />
        <div style={S.bannerInner}>
          <span style={S.bannerIcon}><FiFileText size={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={S.bannerTitle}>Purchase Invoices</h2>
            <span style={S.bannerSub}>Search · view · verify scanned invoices</span>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <div style={S.cardHeadLeft}>
            <span style={S.cubeIcon}><FiFileText size={17} /></span>
            <span style={S.cardTitle}>Invoices</span>
            <span style={S.resultCount}>{total} result{total !== 1 ? 's' : ''}</span>
          </div>
          <div style={S.cardHeadRight}>
            <div style={S.searchBox}>
              <FiSearch size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input style={S.searchInput} placeholder="Search invoice, supplier, PO…"
                value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
              {filterActive && <button style={S.clearX} onClick={() => { setQ(''); setPage(0); load('', 0, size); }}><FiX size={13} /></button>}
            </div>
            <span style={S.ctrlLabel}>SHOW</span>
            <div style={S.selWrap}>
              <select style={S.select} value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <FiChevronDown size={12} style={S.selChevron} />
            </div>
            <span style={S.ctrlLabel}>SORT</span>
            <div style={S.selWrap}>
              <select style={{ ...S.select, minWidth: 130 }} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="date">Date</option>
                <option value="invoice">Invoice No</option>
                <option value="supplier">Supplier</option>
                <option value="items">Items</option>
              </select>
              <FiChevronDown size={12} style={S.selChevron} />
            </div>
            <button style={S.dirBtn} onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
              {sortDir === 'asc' ? <FiArrowUp size={15} /> : <FiArrowDown size={15} />}
            </button>
            <button style={S.refreshBtn} onClick={() => load(q, page, size)} title="Refresh">
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 52 }} />
                <th style={S.thSort} onClick={() => toggleSort('invoice')}>
                  <span style={S.thInner}>INVOICE NO <SortCaret k="invoice" /></span>
                </th>
                <th style={S.thSort} onClick={() => toggleSort('supplier')}>
                  <span style={S.thInner}>SUPPLIER <SortCaret k="supplier" /></span>
                </th>
                <th style={S.th}><span style={S.thInner}>CATEGORY</span></th>
                <th style={S.thSort} onClick={() => toggleSort('date')}>
                  <span style={S.thInner}>DATE <SortCaret k="date" /></span>
                </th>
                <th style={{ ...S.thSort, textAlign: 'center' }} onClick={() => toggleSort('items')}>
                  <span style={{ ...S.thInner, justifyContent: 'center' }}>ITEMS <SortCaret k="items" /></span>
                </th>
                <th style={{ ...S.th, textAlign: 'center', width: 120 }}>STATUS</th>
                <th style={{ ...S.th, width: 150 }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={S.msgCell}>
                  <FiRefreshCw size={20} className="spin" style={{ marginBottom: 10 }} /><div>Loading invoices…</div>
                </td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={8} style={S.msgCell}>
                  <FiAlertTriangle size={26} style={{ color: '#f59e0b', marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, color: '#475569' }}>Couldn’t load invoices</div>
                  <div style={{ fontSize: 13, marginTop: 2, fontFamily: MONO, color: '#dc2626', wordBreak: 'break-all', maxWidth: 600, margin: '2px auto 0' }}>{error}</div>
                  <button style={S.retryBtn} onClick={() => load(q, page, size)}>Try again</button>
                </td></tr>
              )}
              {!loading && !error && sortedRows.length === 0 && (
                <tr><td colSpan={8} style={S.msgCell}>
                  <FiInbox size={30} style={{ color: '#cbd5e1', marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, color: '#475569' }}>No invoices found</div>
                  <div style={{ fontSize: 13 }}>{filterActive ? 'Try a different search term.' : 'New scanned invoices will appear here.'}</div>
                </td></tr>
              )}
              {!loading && !error && sortedRows.map((inv, ri) => {
                const ac = avatarColor(inv.supplierName || inv.invoiceNo || '');
                const v = verifyInvoice(inv);
                const cat = inv.category || inv.supplierName || '—';
                const tc = tagColor(cat);
                const rowKey = inv.id ?? inv.invoiceNo ?? ri;
                const isExp = expandedId === rowKey;
                return (
                  <React.Fragment key={rowKey}>
                    <tr className="inv-tr" style={S.tr} onClick={() => onOpen(inv)}>
                      <td style={{ ...S.td, textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); setExpandedId(isExp ? null : rowKey); }}>
                        <span style={{ ...S.expBtn, ...(isExp ? S.expBtnOn : {}) }}>
                          <FiChevronDown size={15} style={{ transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                        </span>
                      </td>
                      <td style={S.td}><span style={S.invNo}>{inv.invoiceNo}</span></td>
                      <td style={S.td}>
                        <span style={S.supplierCell}>
                          <span style={{ ...S.avatar, background: `${ac}14`, color: ac }}>{initials(inv.supplierName)}</span>
                          <span style={S.supplierName}>{inv.supplierName || '—'}</span>
                        </span>
                      </td>
                      <td style={S.td}><span style={{ ...S.catPill, background: tc.bg, color: tc.fg }}>{cat}</span></td>
                      <td style={S.td}><span style={S.dateCell}>{fmtDate(inv.invoiceDate)}</span></td>
                      <td style={{ ...S.td, textAlign: 'center' }}><span style={S.itemsBadge}>{inv.itemCount ?? 0}</span></td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <span style={{ ...S.statusPill, color: v.color, background: `${v.color}14` }}>
                          <FiCheckCircle size={12} /> {v.label}
                        </span>
                      </td>
                      <td style={S.td} onClick={(e) => e.stopPropagation()}>
                        <button style={S.detailsBtn} onClick={() => onOpen(inv)}>
                          <FiEye size={13} /> Details
                        </button>
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={S.expandRow}>
                        <td colSpan={8} style={S.expandCell}>
                          <div style={S.expandGrid}>
                            <ExpandField label="PO No" value={inv.poNo || '—'} />
                            <ExpandField label="GSTIN" value={inv.supplierGstin || '—'} mono />
                            <ExpandField label="Batch" value={inv.stockInBatchId ? `#${inv.stockInBatchId}` : 'Not linked'} mono />
                            <ExpandField label="File" value={inv.hasFile ? (inv.fileName || 'attached') : 'not attached'} />
                            <button style={S.expandOpenBtn} onClick={() => onOpen(inv)}>Open full detail <FiChevronRight size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && !error && sortedRows.length > 0 && (
          <div style={S.footer}>
            <span style={S.footerRange}>{from}–{to} of {total} invoice{total !== 1 ? 's' : ''}</span>

            <div style={S.footerPager}>
              <button style={{ ...S.pgIcon, ...(page === 0 ? S.disabled : {}) }} disabled={page === 0} onClick={() => setPage(0)} title="First"><FiChevronsLeft size={15} /></button>
              <button style={{ ...S.pgIcon, ...(page === 0 ? S.disabled : {}) }} disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} title="Prev"><FiChevronLeft size={15} /></button>
              {pageNumbers.map((p, idx) => p === '…'
                ? <span key={`g${idx}`} style={S.pgGap}>…</span>
                : <button key={p} onClick={() => setPage(p)} style={{ ...S.pgNum, ...(p === page ? S.pgNumOn : {}) }}>{p + 1}</button>
              )}
              <button style={{ ...S.pgIcon, ...(page >= totalPages - 1 ? S.disabled : {}) }} disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} title="Next"><FiChevronRight size={15} /></button>
              <button style={{ ...S.pgIcon, ...(page >= totalPages - 1 ? S.disabled : {}) }} disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} title="Last"><FiChevronsRight size={15} /></button>
            </div>

            <div style={S.footerGoto}>
              <span style={S.gotoLabel}>Go to</span>
              <input style={S.gotoInput} value={goTo} onChange={(e) => setGoTo(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submitGoTo()} placeholder={`${page + 1}`} />
              <span style={S.gotoLabel}>of {totalPages || 1}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExpandField = ({ label, value, mono }) => (
  <div style={S.expandField}>
    <div style={S.expandLabel}>{label}</div>
    <div style={{ ...S.expandValue, ...(mono ? { fontFamily: MONO } : {}) }}>{value}</div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  SCREEN 2 — FULL DETAIL PAGE
//  ★ Loads by id when present, else by invoice number (/by-no)
// ════════════════════════════════════════════════════════════
const DetailScreen = ({ refInfo, onBack, onDownload }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let res;
      if (refInfo?.id != null) {
        res = await api.get(`/api/qc/invoices/${refInfo.id}`);
      } else if (refInfo?.invoiceNo) {
        res = await api.get('/api/qc/invoices/by-no', { params: { no: refInfo.invoiceNo } });
      } else {
        setError('This invoice has no ID or invoice number to look up.');
        setLoading(false);
        return;
      }
      setDetail(res.data);
    } catch (e) {
      console.error('Failed to load detail', e);
      setError(describeError(e));
    } finally { setLoading(false); }
  }, [refInfo]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const items = detail?.items || [];
  const computed = useMemo(() => {
    const qty = items.reduce((s, it) => s + num(it.quantity), 0);
    const matched = items.filter(it => it.matchedProductId).length;
    return { qty, matched };
  }, [items]);

  const ac = avatarColor(detail?.supplierName || detail?.invoiceNo || '');
  const v = verifyInvoice(detail || {});
  const canDownload = detail?.hasFile && detail?.id != null;

  return (
    <div style={{ animation: 'scrIn .25s ease' }}>
      <div style={S.detailTopbar}>
        <button style={S.backBtn} onClick={onBack}><FiArrowLeft size={17} /> All invoices</button>
        {!loading && !error && detail && (
          <div style={S.detailTopActions}>
            {canDownload && (
              <button style={S.solidBtn} onClick={() => onDownload(detail.id, detail.fileName)}><FiDownload size={14} /> Download</button>
            )}
            <button style={S.ghostBtn} onClick={() => window.print()}><FiPrinter size={15} /> Print</button>
          </div>
        )}
      </div>

      {error ? (
        <div style={S.bigState}>
          <FiAlertTriangle size={32} style={{ color: '#f59e0b' }} />
          <div style={{ fontWeight: 700, color: '#475569', fontSize: 15 }}>Couldn’t open this invoice</div>
          <div style={{ fontSize: 13, fontFamily: MONO, color: '#dc2626', wordBreak: 'break-all', maxWidth: 600, textAlign: 'center' }}>{error}</div>
          <button style={S.retryBtn} onClick={fetchDetail}>Try again</button>
        </div>
      ) : loading ? (
        <div style={S.bigState}><FiRefreshCw size={26} className="spin" /><span style={{ color: '#94a3b8' }}>Loading invoice…</span></div>
      ) : (
        <div id="inv-print">
          <div style={S.idHeader}>
            <span style={{ ...S.idAvatar, background: `${ac}14`, color: ac }}>{initials(detail.supplierName)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.idTopline}>
                <h2 style={S.idInvNo}>{detail.invoiceNo || `Invoice #${detail.id}`}</h2>
                <span style={{ ...S.statusChip, color: v.color, background: `${v.color}14`, borderColor: `${v.color}33` }}>
                  <FiShield size={12} /> {v.label}
                </span>
              </div>
              <div style={S.idSupplier}><FiUser size={13} /> {detail.supplierName || 'Unknown supplier'}</div>
            </div>
          </div>

          <div style={S.summaryStrip}>
            <SummaryMini icon={<FiPackage size={16} />} num={items.length} label="line items" />
            <SummaryMini icon={<FiHash size={16} />} num={computed.qty} label="total qty" />
            <SummaryMini icon={<FiCheckCircle size={16} />} num={`${computed.matched}/${items.length || 0}`} label="matched" />
            <SummaryMini icon={<FiLink size={16} />} num={detail.stockInBatchId ? `#${detail.stockInBatchId}` : '—'} label="batch" />
            <SummaryMini icon={<FiCalendar size={16} />} num={fmtDate(detail.invoiceDate)} label="invoice date" wide />
          </div>

          <div style={S.ribbon}>
            <RibbonStep ok={!!detail.hasFile} icon={<FiPaperclip size={14} />}
              label="Scanned file" detailTxt={detail.hasFile ? (detail.fileName || 'attached') : 'not attached'} />
            <RibbonArrow />
            <RibbonStep ok={!!detail.stockInBatchId} icon={<FiLink size={14} />}
              label="Stock-IN batch" detailTxt={detail.stockInBatchId ? `#${detail.stockInBatchId}` : 'not linked'} />
            <RibbonArrow />
            <RibbonStep ok={items.length > 0 && computed.matched === items.length}
              warn={items.length > 0 && computed.matched > 0 && computed.matched < items.length} icon={<FiPackage size={14} />}
              label="Line matching" detailTxt={items.length ? `${computed.matched} of ${items.length} matched` : 'no items'} />
          </div>

          <div style={S.infoGrid}>
            <InfoField icon={<FiHash />} label="Invoice No" value={detail.invoiceNo} mono />
            <InfoField icon={<FiCalendar />} label="Invoice Date" value={fmtDate(detail.invoiceDate)} />
            <InfoField icon={<FiTruck />} label="PO No" value={detail.poNo || '—'} mono />
            <InfoField icon={<FiUser />} label="Supplier" value={detail.supplierName || '—'} />
            <InfoField icon={<FiHash />} label="Supplier GSTIN" value={detail.supplierGstin || '—'} mono />
            <InfoField icon={<FiLink />} label="Stock IN Batch" value={detail.stockInBatchId ? `#${detail.stockInBatchId}` : 'Not linked'} mono />
            <InfoField icon={<FiClock />} label="Uploaded" value={fmtDateTime(detail.uploadedAt)} />
          </div>

          {detail.fileName && detail.id != null && (
            <div style={S.fileBlock}>
              <div style={S.fileInfo}>
                <span style={S.fileChip}><FiFileText size={18} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={S.fileName}>{detail.fileName}</div>
                  <div style={S.fileMeta}>{detail.fileMimeType || 'file'}{detail.fileSize ? ` · ${(detail.fileSize / 1024).toFixed(0)} KB` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a href={`/api/qc/invoices/${detail.id}/file`} target="_blank" rel="noreferrer" style={S.fileLink}>
                  <FiExternalLink size={14} /> Preview
                </a>
                <button style={S.fileLinkSolid} onClick={() => onDownload(detail.id, detail.fileName)}>
                  <FiDownload size={14} /> Download
                </button>
              </div>
            </div>
          )}

          <div style={S.sectionHead}>
            <FiPackage size={15} /> Line Items <span style={S.sectionCount}>{items.length}</span>
          </div>

          {items.length === 0 ? (
            <div style={S.noItems}>No line items recorded for this invoice.</div>
          ) : (
            <div style={S.itemsTableWrap}>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.itemsTable}>
                  <thead>
                    <tr>
                      <th style={{ ...S.itemTh, width: 36 }}>#</th>
                      <th style={S.itemTh}>Part No</th>
                      <th style={S.itemTh}>Description</th>
                      <th style={S.itemTh}>HSN/SAC</th>
                      <th style={{ ...S.itemTh, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...S.itemTh, textAlign: 'center', width: 70 }}>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id ?? i} className="inv-item-row" style={S.itemRow}>
                        <td style={{ ...S.itemTd, color: '#94a3b8', fontFamily: MONO }}>{it.slNo ?? i + 1}</td>
                        <td style={{ ...S.itemTd, fontWeight: 700, color: '#0f172a', fontFamily: MONO }}>{it.partNo || '—'}</td>
                        <td style={S.itemTd}>{it.description || '—'}</td>
                        <td style={{ ...S.itemTd, fontFamily: MONO, fontSize: 12, color: '#64748b' }}>{it.hsnSac || '—'}</td>
                        <td style={{ ...S.itemTd, textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#0f172a' }}>{it.quantity ?? '—'}</td>
                        <td style={{ ...S.itemTd, textAlign: 'center' }}>
                          {it.matchedProductId
                            ? <span style={S.matched} title={`Product #${it.matchedProductId}`}><FiCheckCircle size={15} /></span>
                            : <span style={S.unmatched} title="No product match">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={S.itemsFoot}>
                <span>Total line items: <strong>{items.length}</strong></span>
                <span>Total quantity: <strong style={{ fontFamily: MONO }}>{computed.qty}</strong></span>
              </div>
            </div>
          )}
          <div style={{ height: 40 }} />
        </div>
      )}
    </div>
  );
};

const SummaryMini = ({ icon, num: n, label, wide }) => (
  <div style={{ ...S.sumMini, ...(wide ? { flex: '1.4 1 0' } : {}) }}>
    <span style={S.sumIcon}>{icon}</span>
    <div style={{ minWidth: 0 }}>
      <div style={S.sumNum}>{n}</div>
      <div style={S.sumLabel}>{label}</div>
    </div>
  </div>
);
const RibbonStep = ({ ok, warn, icon, label, detailTxt }) => {
  const color = ok ? '#16a34a' : warn ? '#d97706' : '#94a3b8';
  const bg = ok ? '#ecfdf5' : warn ? '#fffbeb' : '#f8fafc';
  return (
    <div style={S.ribbonStep}>
      <span style={{ ...S.ribbonIcon, color, background: bg, borderColor: `${color}33` }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={S.ribbonLabel}>{label}</div>
        <div style={{ ...S.ribbonDetail, color }}>{detailTxt}</div>
      </div>
    </div>
  );
};
const RibbonArrow = () => <span style={S.ribbonArrow}>›</span>;
const InfoField = ({ icon, label, value, mono }) => (
  <div style={S.infoField}>
    <div style={S.infoLabel}>{icon} {label}</div>
    <div style={{ ...S.infoValue, ...(mono ? { fontFamily: MONO, fontSize: 13.5 } : {}) }}>{value}</div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════
const FONT = "'Inter','IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const MONO = "'IBM Plex Mono','SF Mono','Roboto Mono',monospace";
const HEADER_BG = '#1e293b';

const S = {
  page: { fontFamily: FONT, color: '#0f172a' },

  banner: { position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 14, background: '#fff', border: '1px solid #e6e8ee', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' },
  bannerSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#6366f1,#0ea5e9,#10b981,#f59e0b)' },
  bannerInner: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px' },
  bannerIcon: { width: 46, height: 46, borderRadius: 13, background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(249,115,22,0.3)' },
  bannerTitle: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' },
  bannerSub: { fontSize: 13, color: '#94a3b8', fontWeight: 500 },

  card: { background: '#fff', border: '1px solid #e6e8ee', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #eef2f7', flexWrap: 'wrap' },
  cardHeadLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  cubeIcon: { width: 30, height: 30, borderRadius: 9, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 800, color: '#0f172a' },
  resultCount: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  cardHeadRight: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 7, background: '#f8fafc', border: '1px solid #e6e8ee', borderRadius: 9, padding: '6px 10px', minWidth: 200 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', fontFamily: FONT, background: 'transparent', minWidth: 0 },
  clearX: { width: 20, height: 20, borderRadius: 5, border: 'none', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  ctrlLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' },
  selWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  select: { appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', padding: '6px 24px 6px 10px', fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer', fontFamily: FONT, outline: 'none' },
  selChevron: { position: 'absolute', right: 8, color: '#94a3b8', pointerEvents: 'none' },
  dirBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  refreshBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },

  table: { width: '100%', borderCollapse: 'collapse', fontFamily: FONT, minWidth: 940 },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', background: HEADER_BG, whiteSpace: 'nowrap' },
  thSort: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em', background: HEADER_BG, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' },
  thInner: { display: 'inline-flex', alignItems: 'center', gap: 5 },

  tr: { cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 13.5, color: '#475569', verticalAlign: 'middle' },
  expBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' },
  expBtnOn: { borderColor: '#c7d2fe', background: '#eef2ff', color: '#4f46e5' },
  invNo: { fontSize: 13.5, fontWeight: 700, color: '#4f46e5', fontFamily: MONO, whiteSpace: 'nowrap' },
  supplierCell: { display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, flexShrink: 0, letterSpacing: '-0.02em' },
  supplierName: { fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 },
  catPill: { display: 'inline-block', padding: '3px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' },
  dateCell: { fontSize: 13, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' },
  itemsBadge: { display: 'inline-block', minWidth: 30, padding: '3px 10px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontSize: 12.5, fontWeight: 700, fontFamily: MONO },
  statusPill: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  detailsBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 13px', fontSize: 12.5, fontWeight: 700, color: '#475569', cursor: 'pointer' },

  expandRow: { background: '#f8fafc' },
  expandCell: { padding: '0 16px 16px 60px', borderBottom: '1px solid #f1f5f9' },
  expandGrid: { display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap', background: '#fff', border: '1px solid #eef2f7', borderRadius: 12, padding: '14px 18px' },
  expandField: { display: 'flex', flexDirection: 'column', gap: 3 },
  expandLabel: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  expandValue: { fontSize: 13.5, fontWeight: 700, color: '#1e293b' },
  expandOpenBtn: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },

  msgCell: { padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  retryBtn: { marginTop: 14, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },

  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 18px', borderTop: '1px solid #eef2f7', background: '#fafbfc', flexWrap: 'wrap' },
  footerRange: { fontSize: 13, color: '#4f46e5', fontWeight: 600 },
  footerPager: { display: 'flex', alignItems: 'center', gap: 5 },
  pgIcon: { width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  pgNum: { minWidth: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: MONO },
  pgNumOn: { background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' },
  pgGap: { minWidth: 22, textAlign: 'center', color: '#cbd5e1', fontWeight: 700, userSelect: 'none' },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
  footerGoto: { display: 'flex', alignItems: 'center', gap: 7 },
  gotoLabel: { fontSize: 12.5, color: '#64748b', fontWeight: 600 },
  gotoInput: { width: 52, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: MONO, outline: 'none' },

  detailTopbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #e6e8ee', borderRadius: 11, padding: '9px 16px 9px 12px', fontSize: 13.5, fontWeight: 700, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' },
  detailTopActions: { display: 'flex', gap: 8 },
  solidBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e6e8ee', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' },

  bigState: { display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', padding: '100px 20px', fontSize: 14 },

  idHeader: { display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid #e6e8ee', borderRadius: 16, padding: '20px 22px', marginBottom: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' },
  idAvatar: { width: 56, height: 56, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, flexShrink: 0, letterSpacing: '-0.02em' },
  idTopline: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  idInvNo: { margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', fontFamily: MONO, letterSpacing: '-0.01em' },
  idSupplier: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#64748b', fontWeight: 600, marginTop: 4 },
  statusChip: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, border: '1px solid', fontSize: 12.5, fontWeight: 700 },

  summaryStrip: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  sumMini: { flex: '1 1 0', minWidth: 130, display: 'flex', alignItems: 'center', gap: 11, background: '#fff', border: '1px solid #e6e8ee', borderRadius: 13, padding: '13px 16px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' },
  sumIcon: { width: 38, height: 38, borderRadius: 10, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sumNum: { fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sumLabel: { fontSize: 11.5, color: '#94a3b8', fontWeight: 600 },

  ribbon: { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e6e8ee', borderRadius: 14, padding: '14px 16px', marginBottom: 14, overflowX: 'auto', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' },
  ribbonStep: { display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 },
  ribbonIcon: { width: 30, height: 30, borderRadius: 9, border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ribbonLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' },
  ribbonDetail: { fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' },
  ribbonArrow: { color: '#cbd5e1', fontSize: 18, fontWeight: 700, flexShrink: 0, padding: '0 2px' },

  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 14 },
  infoField: { background: '#fff', border: '1px solid #e6e8ee', borderRadius: 12, padding: '12px 15px', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' },
  infoLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 },
  infoValue: { fontSize: 14, fontWeight: 700, color: '#1e293b', wordBreak: 'break-word' },

  fileBlock: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 14, padding: '15px 18px', marginBottom: 18 },
  fileInfo: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  fileChip: { width: 42, height: 42, borderRadius: 12, background: '#fff', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fileName: { fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fileMeta: { fontSize: 12, color: '#64748b', marginTop: 1 },
  fileLink: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #bae6fd', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#0369a1', textDecoration: 'none' },
  fileLinkSolid: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0ea5e9', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' },

  sectionHead: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 12 },
  sectionCount: { background: '#eef2ff', color: '#6366f1', borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 700 },
  noItems: { padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#fff', border: '1px dashed #e2e8f0', borderRadius: 14, fontSize: 13 },

  itemsTableWrap: { background: '#fff', border: '1px solid #e6e8ee', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' },
  itemsTable: { width: '100%', borderCollapse: 'collapse', minWidth: 560 },
  itemTh: { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#cbd5e1', background: HEADER_BG, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  itemRow: { transition: 'background .1s' },
  itemTd: { padding: '12px 14px', fontSize: 13, color: '#475569', borderTop: '1px solid #f1f5f9' },
  matched: { color: '#16a34a', display: 'inline-flex' },
  unmatched: { color: '#cbd5e1' },
  itemsFoot: { display: 'flex', gap: 24, padding: '13px 16px', borderTop: '2px solid #eef2f7', background: '#fafbfc', fontSize: 13, color: '#64748b', fontWeight: 600 },
};

export default Invoices;