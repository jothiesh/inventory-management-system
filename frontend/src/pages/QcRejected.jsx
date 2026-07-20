import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiAlertTriangle, FiSearch, FiX, FiRefreshCw, FiDownload,
  FiPackage, FiUser, FiCalendar, FiHash, FiSend, FiEye,
  FiArrowUp, FiArrowDown,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { returnChallanApi } from '../api/returnChallanApi';
import './QcApproved.css';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
};

const SORT_OPTIONS = [
  { key: 'invoiceNo',    label: 'Invoice No' },
  { key: 'supplierName', label: 'Supplier'   },
  { key: 'inspectedAt',  label: 'Date'       },
  { key: 'categoryName', label: 'Category'   },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// DC status badge
const DcBadge = ({ status, onClick }) => {
  if (!status) return <span style={{fontSize:11,color:'#f59e0b',fontWeight:700}}>⚠ No DC yet</span>;
  const map = {
    DC_RAISED:            { bg:'#fef3c7', color:'#92400e', label:'📋 Draft' },
    DRAFT:                { bg:'#fef3c7', color:'#92400e', label:'📋 Draft' },
    SENT:                 { bg:'#dbeafe', color:'#1e40af', label:'📤 Sent' },
    REPLACEMENT_RECEIVED: { bg:'#d1fae5', color:'#065f46', label:'📦 Arrived' },
    CLOSED:               { bg:'#f1f5f9', color:'#475569', label:'✅ Closed' },
  };
  const s = map[status] || { bg:'#f1f5f9', color:'#64748b', label: status };
  return (
    <span onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 9px', borderRadius:5, fontSize:10, fontWeight:700,
      background:s.bg, color:s.color,
      cursor: onClick ? 'pointer' : 'default',
    }}>{s.label}</span>
  );
};

const QcRejected = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [inspections, setInspections] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(15);
  const [sortBy,      setSortBy]      = useState('inspectedAt');
  const [sortDir,     setSortDir]     = useState('desc');
  const [creating,    setCreating]    = useState(null);
  const [dcMap,       setDcMap]       = useState({}); // batchId → { dcId, status }

  // ★ OWNER + STORE_MANAGER + QC can all create DC. The backend controller
  //   already allows QC (hasAnyAuthority('OWNER','STORE_MANAGER','QC')); this
  //   was the only gate hiding the button from the QC role.
  const canCreateDc = ['OWNER', 'STORE_MANAGER', 'QC'].includes(user?.role);

  // ── Load rejected inspections ─────────────────────────────────
  const load = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await axios.get('/api/qc/inspections/rejected', {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = r.data.data || [];
      setInspections(data);
      loadDcStatuses(data);
    } catch { toast.error('Failed to load rejected inspections'); }
    finally  { setLoading(false); }
  };

  // ── Load DC status per batch ──────────────────────────────────
  const loadDcStatuses = async (list) => {
    const t   = localStorage.getItem('token');
    const map = {};
    await Promise.allSettled(
      list.map(async (insp) => {
        if (!insp.batchId) return;
        try {
          const r = await axios.get(`/api/qc/return-challans/batch/${insp.batchId}`,
            { headers: { Authorization: `Bearer ${t}` } });
          const dcs = r.data.data || [];
          if (dcs.length > 0)
            map[insp.batchId] = { dcId: dcs[0].id, status: dcs[0].status };
        } catch {}
      })
    );
    setDcMap(prev => ({ ...prev, ...map }));
  };

  useEffect(() => { load(); }, []);

  // ── Create DC (OWNER only) ────────────────────────────────────
  const handleCreateDc = async (insp) => {
    setCreating(insp.batchId);
    try {
      const r  = await returnChallanApi.create(insp.batchId, null);
      const dc = r.data.data;
      toast.success(`✅ DC ${dc.dcNumber} created!`);
      setDcMap(prev => ({ ...prev, [insp.batchId]: { dcId: dc.id, status: 'DRAFT' } }));
      navigate(`/qc/return-challans/${dc.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create DC');
    } finally { setCreating(null); }
  };

  // ── PDF download ──────────────────────────────────────────────
  const downloadPdf = async (insp) => {
    if (!insp.pdfPath) { toast.info('No PDF available'); return; }
    try {
      const t = localStorage.getItem('token');
      const r = await axios.get(`/api/qc/inspections/${insp.id}/pdf`,
        { headers: { Authorization: `Bearer ${t}` }, responseType:'blob' });
      const url = URL.createObjectURL(r.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `QC-REJECTED-${insp.invoiceNo || insp.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('PDF download failed'); }
  };

  // ── Excel download ────────────────────────────────────────────
  const downloadExcel = async (insp) => {
    try {
      const t = localStorage.getItem('token');
      const r = await axios.get(`/api/qc/inspections/${insp.id}/excel`,
        { headers: { Authorization: `Bearer ${t}` }, responseType:'blob' });
      const url = URL.createObjectURL(r.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `QC-REJECTED-${insp.invoiceNo || insp.id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Excel download failed'); }
  };

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    inspections.length,
    units:    inspections.reduce((s,i) => s + (parseFloat(i.qtyRejected ?? i.totalRejected) || 0), 0),
    needsDc:  inspections.filter(i => !dcMap[i.batchId]).length,
    dcRaised: Object.keys(dcMap).length,
  }), [inspections, dcMap]);

  // ── Filter + sort + paginate ──────────────────────────────────
  const filtered = useMemo(() => {
    let list = inspections;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        [i.supplierName, i.invoiceNo, i.inspectorName, i.categoryName, i.overallRemarks]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
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

  const tp    = Math.max(1, Math.ceil(filtered.length / pageSize));
  const sp    = Math.min(page, tp);
  const paged = filtered.slice((sp-1)*pageSize, sp*pageSize);
  useEffect(() => { setPage(1); }, [search, sortBy, sortDir, pageSize]);
  const goTo = (p) => setPage(Math.max(1, Math.min(p, tp)));

  return (
    <div className="qca-page">

      {/* HERO */}
      <div className="qca-hero">
        <div className="qca-hero-content">
          <div className="qca-hero-icon" style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}>
            <FiAlertTriangle size={20}/>
          </div>
          <div>
            <h1 className="qca-hero-title">Rejected Inspections</h1>
            <p className="qca-hero-sub">
              {loading ? 'Loading...' : `${filtered.length} of ${inspections.length} rejected batches`}
            </p>
          </div>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {canCreateDc && (
            <button onClick={() => navigate('/qc/return-challans')} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', background:'#dc2626', color:'#fff',
              border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer'
            }}>
              <FiSend size={13}/> Return Challans
            </button>
          )}
          <button className="qca-refresh" onClick={load} disabled={loading}>
            <FiRefreshCw size={14} className={loading?'qca-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="qca-stats">
        <div className="qca-stat" style={{'--c':'#ef4444'}}>
          <FiAlertTriangle size={18}/>
          <div><div className="qca-stat-num">{stats.total}</div><div className="qca-stat-label">Batches Rejected</div></div>
        </div>
        <div className="qca-stat" style={{'--c':'#f97316'}}>
          <FiPackage size={18}/>
          <div><div className="qca-stat-num">{stats.units.toFixed(0)}</div><div className="qca-stat-label">Units Rejected</div></div>
        </div>
        <div className="qca-stat" style={{'--c':'#f59e0b'}}>
          <FiSend size={18}/>
          <div><div className="qca-stat-num" style={{color:'#f59e0b'}}>{stats.needsDc}</div><div className="qca-stat-label">Needs DC</div></div>
        </div>
        <div className="qca-stat" style={{'--c':'#10b981'}}>
          <FiCalendar size={18}/>
          <div><div className="qca-stat-num" style={{color:'#10b981'}}>{stats.dcRaised}</div><div className="qca-stat-label">DC Raised</div></div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="qca-search-bar">
        <FiSearch size={15} className="qca-search-icon"/>
        <input className="qca-search-input" value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Search invoice, supplier, inspector..."/>
        {search && <button className="qca-search-clear" onClick={()=>setSearch('')}><FiX size={13}/></button>}
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

      {/* TABLE */}
      <div className="qca-card">
        <div className="qca-table-wrap">
          {loading ? (
            <div className="qca-empty"><FiRefreshCw size={32} className="qca-spin"/><span>Loading...</span></div>
          ) : paged.length === 0 ? (
            <div className="qca-empty">
              <FiPackage size={36} style={{color:'#ef4444'}}/>
              <span style={{color:'#991b1b',fontWeight:600}}>
                {search ? `No results for "${search}"` : 'No rejected batches.'}
              </span>
            </div>
          ) : (
            <table className="qca-table">
              <thead><tr>
                <th>#</th>
                <th>INVOICE</th>
                <th>CATEGORY</th>
                <th>SUPPLIER</th>
                <th>INSPECTOR</th>
                <th className="num">RECEIVED</th>
                <th className="num" style={{color:'#DCDBD5'}}>REJECTED</th>
                <th>DATE</th>
                <th>DC STATUS</th>
                <th>ACTIONS</th>
              </tr></thead>
              <tbody>
                {paged.map((insp, idx) => {
                  const dcInfo = dcMap[insp.batchId];
                  const hasDc  = !!dcInfo;
                  return (
                    <tr key={insp.id} className="qca-row">
                      <td className="qca-num">{(sp-1)*pageSize+idx+1}</td>
                      <td>
                        <span className="qca-batch-ref" style={{color:'#dc2626'}}>
                          <FiHash size={9}/>
                          {insp.invoiceNo || '—'}
                        </span>
                      </td>
                      <td>
                        {insp.categoryName
                          ? <span className="qca-chip">{insp.categoryName}</span>
                          : <span className="qca-faded">—</span>}
                      </td>
                      <td className="qca-strong">{insp.supplierName||'—'}</td>
                      <td>
                        {insp.inspectorName
                          ? <span className="qca-inspector"><FiUser size={10}/> {insp.inspectorName}</span>
                          : <span className="qca-faded">—</span>}
                      </td>
                      <td className="num qca-qty">
                        {(parseFloat(insp.qtyReceived ?? insp.totalReceived) || 0).toFixed(0)}
                      </td>
                      <td className="num qca-qty" style={{color:'#dc2626',fontWeight:800}}>
                        {(parseFloat(insp.qtyRejected ?? insp.totalRejected) || 0).toFixed(0)}
                      </td>
                      <td className="qca-faded">{fmtDate(insp.inspectedAt)}</td>

                      <td>
                        <DcBadge
                          status={dcInfo?.status || null}
                          onClick={dcInfo?.dcId ? () => navigate(`/qc/return-challans/${dcInfo.dcId}`) : undefined}
                        />
                      </td>

                      <td>
                        <div style={{display:'flex', gap:5, alignItems:'center', flexWrap:'wrap'}}>
                          {insp.pdfPath && (
                            <button className="qca-pdf-btn"
                              style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}
                              onClick={()=>downloadPdf(insp)} title="Download PDF">
                              <FiDownload size={12}/> PDF
                            </button>
                          )}
                          <button className="qca-pdf-btn"
                            style={{background:'linear-gradient(135deg,#16a34a,#15803d)',fontSize:10}}
                            onClick={()=>downloadExcel(insp)} title="Download Excel">
                            <FiDownload size={12}/> Excel
                          </button>

                          {hasDc && (
                            <button onClick={()=>navigate(`/qc/return-challans/${dcInfo.dcId}`)}
                              style={{display:'inline-flex',alignItems:'center',gap:4,
                                padding:'4px 10px',background:'#ede9fe',color:'#5b21b6',
                                border:'1px solid #c4b5fd',borderRadius:5,fontSize:10,
                                fontWeight:700,cursor:'pointer'}}>
                              <FiEye size={10}/> View DC
                            </button>
                          )}

                          {canCreateDc && !hasDc && (
                            <button onClick={()=>handleCreateDc(insp)}
                              disabled={creating===insp.batchId}
                              style={{display:'inline-flex',alignItems:'center',gap:4,
                                padding:'4px 10px',
                                background: creating===insp.batchId ? '#fca5a5' : '#dc2626',
                                color:'#fff',border:'none',borderRadius:5,
                                fontSize:10,fontWeight:700,cursor:'pointer'}}>
                              {creating===insp.batchId
                                ? <><FiRefreshCw size={10} className="qca-spin"/> Creating…</>
                                : <><FiSend size={10}/> Create DC</>}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {filtered.length > 0 && (
          <div className="qca-pagination">
            <span className="qca-pg-info">{(sp-1)*pageSize+1}–{Math.min(sp*pageSize, filtered.length)} of {filtered.length}</span>
            <div className="qca-pg-controls">
              <button className="qca-pg-btn" onClick={()=>goTo(1)} disabled={sp===1}><FiChevronsLeft size={13}/></button>
              <button className="qca-pg-btn" onClick={()=>goTo(sp-1)} disabled={sp===1}><FiChevronLeft size={13}/></button>
              {Array.from({length:Math.min(5,tp)},(_,k)=>Math.max(1,Math.min(sp-2,tp-4))+k).map(p=>(
                <button key={p} className={`qca-pg-btn ${p===sp?'qca-pg-active':''}`} onClick={()=>goTo(p)}>{p}</button>
              ))}
              <button className="qca-pg-btn" onClick={()=>goTo(sp+1)} disabled={sp===tp}><FiChevronRight size={13}/></button>
              <button className="qca-pg-btn" onClick={()=>goTo(tp)} disabled={sp===tp}><FiChevronsRight size={13}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QcRejected;