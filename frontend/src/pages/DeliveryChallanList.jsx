import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiSearch, FiX, FiRefreshCw, FiTruck, FiPlus, FiEye, FiPackage, FiHash
} from 'react-icons/fi';
import './ReturnChallan.css';
import './DeliveryChallanFlow.css';

/* ════════════════════════════════════════════════════════════════
   DELIVERY CHALLAN — LIST
   Route: <Route path="/delivery-challans" element={<DeliveryChallanList/>}/>
   ════════════════════════════════════════════════════════════════ */

const authHdr = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
};
const PAGE_SIZE = 10;

const STATUS_META = {
  DRAFT:             { label:'Draft',             color:'#f59e0b', bg:'#fef3c7', icon:'📋' },
  SENT:              { label:'Sent',              color:'#3b82f6', bg:'#dbeafe', icon:'📤' },
  ASSEMBLY_RECEIVED: { label:'Assembly Received', color:'#10b981', bg:'#d1fae5', icon:'📦' },
  CLOSED:            { label:'Closed',            color:'#6b7280', bg:'#f3f4f6', icon:'✅' },
};
const TABS = ['All', 'DRAFT', 'SENT', 'ASSEMBLY_RECEIVED', 'CLOSED'];

const DeliveryChallanList = () => {
  const navigate = useNavigate();
  const [dcs,     setDcs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('All');
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const r = await axios.get('/api/delivery-challans', authHdr());
      setDcs(r.data.data || []);
      if (silent) toast.success('Refreshed', { autoClose: 800 });
    } catch { toast.error('Failed to load delivery challans'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { All: dcs.length };
    TABS.slice(1).forEach(s => { c[s] = dcs.filter(d => d.status === s).length; });
    return c;
  }, [dcs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dcs.filter(d => {
      if (tab !== 'All' && d.status !== tab) return false;
      if (!q) return true;
      return (d.dcNumber||'').toLowerCase().includes(q)
          || (d.supplierName||'').toLowerCase().includes(q)
          || (d.assemblyBatchRef||'').toLowerCase().includes(q);
    });
  }, [dcs, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE);
  useEffect(() => { setPage(1); }, [tab, search]);

  if (loading) return (
    <div className="rc-page">
      <div className="rc-loading"><div className="rc-spinner dcx-spinner"/><p>Loading challans…</p></div>
    </div>
  );

  return (
    <div className="rc-page">

      {/* HEADER */}
      <div className="rc-header rcd-fade">
        <div className="rc-header-left">
          <div className="rc-header-icon dcx-icon"><FiTruck size={20}/></div>
          <div>
            <h1 className="rc-title">Delivery Challans</h1>
            <p className="rc-subtitle">Job work — components out, assembly back in via QC</p>
          </div>
        </div>
        <div className="rc-header-right">
          <button className="rc-btn-refresh" onClick={() => load(true)}>
            <FiRefreshCw size={14}/> Refresh
          </button>
          <button className="dcx-btn-primary" style={{ padding:'9px 16px' }}
            onClick={() => navigate('/delivery-challan')}>
            <FiPlus size={14}/> New Challan
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="rc-filter-tabs rcd-fade" style={{ animationDelay:'60ms' }}>
        {TABS.map(t => {
          const m = STATUS_META[t];
          const active = tab === t;
          return (
            <button key={t}
              className={`rc-tab ${active ? 'active' : ''}`}
              style={active ? { borderColor: m ? m.color : '#3b82f6', color: m ? m.color : '#1d4ed8' } : {}}
              onClick={() => setTab(t)}>
              {m ? `${m.icon} ${m.label}` : 'All'}
              <span className="rc-tab-count">{counts[t] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* TABLE */}
      <div className="rc-card rcd-fade rcd-card-hover" style={{ animationDelay:'120ms' }}>
        <div className="rc-search-bar">
          <FiSearch size={15} className="rc-search-icon"/>
          <input className="rc-search-input" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search DC no. / supplier / batch…"/>
          {search && (
            <button className="rc-search-clear" onClick={() => setSearch('')}><FiX size={13}/></button>
          )}
        </div>

        {paged.length === 0 ? (
          <div className="rc-empty"><FiPackage size={28}/><p>No delivery challans found</p></div>
        ) : (
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead><tr>
                <th>#</th><th>DC No.</th><th>Date</th><th>Deliver To</th>
                <th className="num">Items</th><th className="num">Qty</th>
                <th>Assembly Batch</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {paged.map((d, idx) => {
                  const m = STATUS_META[d.status] || STATUS_META.DRAFT;
                  return (
                    <tr key={d.id} className="rc-row rcd-row-anim" style={{ animationDelay:`${idx*30}ms` }}>
                      <td className="rc-num">{(safePage-1)*PAGE_SIZE + idx + 1}</td>
                      <td><span className="rc-dc-number"><FiHash size={11}/>{d.dcNumber}</span></td>
                      <td className="rc-date">{fmtDate(d.dcDate)}</td>
                      <td style={{ fontSize:12, fontWeight:600 }}>{d.supplierName || '—'}</td>
                      <td className="num">{d.itemCount ?? 0}</td>
                      <td className="num rc-qty" style={{ color:'#1d4ed8' }}>
                        {parseFloat(d.totalQty||0).toFixed(0)}
                      </td>
                      <td>{d.assemblyBatchRef
                        ? <span style={{ fontFamily:'monospace', fontWeight:800, color:'#10b981', fontSize:12 }}>
                            {d.assemblyBatchRef}
                          </span>
                        : <span style={{ color:'#cbd5e1' }}>—</span>}
                      </td>
                      <td>
                        <span className="dcx-pill" style={{ background:m.bg, color:m.color }}>
                          {m.icon} {m.label}
                        </span>
                      </td>
                      <td>
                        <button className="rc-view-btn" onClick={() => navigate(`/delivery-challans/${d.id}`)}>
                          <FiEye size={12}/> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="rc-pagination">
          <span className="rc-pg-info">
            {filtered.length === 0 ? '0' :
              `${(safePage-1)*PAGE_SIZE + 1}–${Math.min(safePage*PAGE_SIZE, filtered.length)}`} of {filtered.length}
          </span>
          <div className="rc-pg-controls">
            <button disabled={safePage === 1} onClick={() => setPage(p => p-1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
              const n = start + i;
              if (n > totalPages) return null;
              return (
                <button key={n} className={n === safePage ? 'rc-pg-active' : ''}
                  onClick={() => setPage(n)}>{n}</button>
              );
            })}
            <button disabled={safePage === totalPages} onClick={() => setPage(p => p+1)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallanList;
