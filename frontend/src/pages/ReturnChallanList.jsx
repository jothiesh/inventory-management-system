import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiSend, FiSearch, FiX, FiRefreshCw, FiPackage,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiHash, FiEye, FiClock, FiCheckCircle, FiAlertTriangle
} from 'react-icons/fi';
import './ReturnChallan.css';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
};

const DC_STATUS_STYLE = {
  DRAFT:                { label:'Draft',               bg:'#fef3c7', color:'#92400e', icon:'📋' },
  SENT:                 { label:'Sent to Supplier',    bg:'#dbeafe', color:'#1e40af', icon:'📤' },
  REPLACEMENT_RECEIVED: { label:'Replacement Arrived', bg:'#d1fae5', color:'#065f46', icon:'📦' },
  CLOSED:               { label:'Closed',              bg:'#f1f5f9', color:'#475569', icon:'✅' },
};

const StatusBadge = ({ status }) => {
  const s = DC_STATUS_STYLE[status] || { label:status, bg:'#f1f5f9', color:'#64748b', icon:'•' };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'4px 10px', borderRadius:6,
      background:s.bg, color:s.color, fontSize:11, fontWeight:700
    }}>
      {s.icon} {s.label}
    </span>
  );
};

const ReturnChallanList = () => {
  const navigate = useNavigate();

  const [challans,     setChallans]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page,         setPage]         = useState(1);
  const PS = 15;

  const load = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await axios.get('/api/qc/return-challans',
        { headers: { Authorization: `Bearer ${t}` } });
      setChallans(r.data.data || []);
    } catch { toast.error('Failed to load return challans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { ALL:challans.length, DRAFT:0, SENT:0, REPLACEMENT_RECEIVED:0, CLOSED:0 };
    challans.forEach(dc => { if(c[dc.status]!==undefined) c[dc.status]++; });
    return c;
  }, [challans]);

  const filtered = useMemo(() => {
    let list = challans;
    if (filterStatus !== 'ALL') list = list.filter(dc => dc.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(dc =>
        [dc.dcNumber, dc.supplierName, dc.originalBatchRef]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [challans, search, filterStatus]);

  const tp = Math.max(1, Math.ceil(filtered.length/PS));
  const sp = Math.min(page, tp);
  const paged = filtered.slice((sp-1)*PS, sp*PS);
  useEffect(() => { setPage(1); }, [search, filterStatus]);
  const goTo = (p) => setPage(Math.max(1, Math.min(p, tp)));

  const TABS = [
    { v:'ALL',                 label:'All',        c:'#4f46e5', n:counts.ALL },
    { v:'DRAFT',               label:'📋 Draft',   c:'#f59e0b', n:counts.DRAFT },
    { v:'SENT',                label:'📤 Sent',    c:'#3b82f6', n:counts.SENT },
    { v:'REPLACEMENT_RECEIVED',label:'📦 Arrived', c:'#10b981', n:counts.REPLACEMENT_RECEIVED },
    { v:'CLOSED',              label:'✅ Closed',  c:'#6b7280', n:counts.CLOSED },
  ];

  return (
    <div className="rc-page">

      {/* HEADER */}
      <div className="rc-header">
        <div className="rc-header-left">
          <div className="rc-header-icon"><FiSend size={20}/></div>
          <div>
            <h1 className="rc-title">Return Challans</h1>
            <p className="rc-subtitle">
              {loading ? 'Loading...' : `${filtered.length} of ${challans.length} challans`}
              <span className="qcl-role-badge manager" style={{marginLeft:8}}>Manager Only</span>
            </p>
          </div>
        </div>
        <div className="rc-header-right">
          <div className="rc-stats-strip">
            {counts.DRAFT > 0 && <span className="rc-stat" style={{color:'#f59e0b'}}><FiClock size={11}/> {counts.DRAFT} Draft</span>}
            {counts.SENT > 0 && <span className="rc-stat" style={{color:'#3b82f6'}}><FiSend size={11}/> {counts.SENT} Sent</span>}
            {counts.REPLACEMENT_RECEIVED > 0 && <span className="rc-stat" style={{color:'#10b981'}}><FiPackage size={11}/> {counts.REPLACEMENT_RECEIVED} Arrived</span>}
          </div>
          <button className="rc-btn-refresh" onClick={load} disabled={loading}>
            <FiRefreshCw size={13} className={loading?'rc-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="rc-filter-tabs">
        {TABS.map(t => (
          <button key={t.v}
            className={`rc-tab ${filterStatus===t.v?'active':''}`}
            style={filterStatus===t.v ? {borderColor:t.c,color:t.c,background:`${t.c}14`} : {}}
            onClick={()=>setFilterStatus(t.v)}>
            {t.label}
            <span className="rc-tab-count">{t.n}</span>
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="rc-card">
        <div className="rc-search-bar">
          <FiSearch size={14} className="rc-search-icon"/>
          <input className="rc-search-input" value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search DC number, supplier, batch ref…"/>
          {search && <button className="rc-search-clear" onClick={()=>setSearch('')}><FiX size={12}/></button>}
        </div>

        <div className="rc-table-wrap">
          {loading ? (
            <div className="rc-empty"><div className="rc-spinner"/><p>Loading…</p></div>
          ) : paged.length===0 ? (
            <div className="rc-empty">
              <FiSend size={36} style={{color:'#94a3b8'}}/>
              <p>{search ? `No results for "${search}"` : 'No return challans yet'}</p>
              <p style={{fontSize:12,color:'#94a3b8'}}>Return DCs are created from the QC Rejected page</p>
            </div>
          ) : (
            <table className="rc-table">
              <thead><tr>
                <th>#</th>
                <th>DC NUMBER</th>
                <th>ORIGINAL BATCH</th>
                <th>SUPPLIER</th>
                <th>DATE</th>
                <th className="num">ITEMS</th>
                <th className="num">QTY RETURNED</th>
                <th>STATUS</th>
                <th>REPLACEMENT BATCH</th>
                <th style={{width:80,textAlign:'center'}}>VIEW</th>
              </tr></thead>
              <tbody>
                {paged.map((dc,idx)=>(
                  <tr key={dc.id} className="rc-row" style={{cursor:'pointer'}}
                    onClick={()=>navigate(`/qc/return-challans/${dc.id}`)}>
                    <td className="rc-num">{(sp-1)*PS+idx+1}</td>
                    <td><span className="rc-dc-number"><FiHash size={9}/>{dc.dcNumber}</span></td>
                    <td><span style={{fontFamily:'monospace',color:'#dc2626',fontWeight:700,fontSize:12}}>
                      {dc.originalBatchRef||`#${dc.originalBatchId}`}
                    </span></td>
                    <td><strong>{dc.supplierName||'—'}</strong></td>
                    <td className="rc-date">{fmtDate(dc.dcDate)}</td>
                    <td className="num"><span className="rc-chip">{dc.itemCount||0}</span></td>
                    <td className="num rc-qty">{parseFloat(dc.totalQty||0).toFixed(0)}</td>
                    <td><StatusBadge status={dc.status}/></td>
                    <td>
                      {dc.replacementBatchRef
                        ? <span style={{fontFamily:'monospace',fontSize:12,color:'#10b981',fontWeight:700}}>{dc.replacementBatchRef}</span>
                        : <span style={{color:'#cbd5e1',fontSize:12}}>—</span>}
                    </td>
                    <td style={{textAlign:'center'}} onClick={e=>e.stopPropagation()}>
                      <button className="rc-view-btn"
                        onClick={()=>navigate(`/qc/return-challans/${dc.id}`)}>
                        <FiEye size={12}/> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="rc-pagination">
            <span className="rc-pg-info">{(sp-1)*PS+1}–{Math.min(sp*PS,filtered.length)} of {filtered.length}</span>
            <div className="rc-pg-controls">
              <button onClick={()=>goTo(1)} disabled={sp===1}><FiChevronsLeft size={13}/></button>
              <button onClick={()=>goTo(sp-1)} disabled={sp===1}><FiChevronLeft size={13}/></button>
              {Array.from({length:Math.min(5,tp)},(_, k)=>Math.max(1,Math.min(sp-2,tp-4))+k).map(p=>(
                <button key={p} className={p===sp?'rc-pg-active':''} onClick={()=>goTo(p)}>{p}</button>
              ))}
              <button onClick={()=>goTo(sp+1)} disabled={sp===tp}><FiChevronRight size={13}/></button>
              <button onClick={()=>goTo(tp)} disabled={sp===tp}><FiChevronsRight size={13}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnChallanList;
