import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  FiUpload, FiX, FiCheck, FiAlertTriangle,
  FiRefreshCw, FiChevronRight, FiSave, FiTrash2, FiInfo,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const DRAFT_KEY = 'cat_upload_draft_v2';

// ─── Code generator ───────────────────────────────────────────
const generateCode = (categoryName, existingCodes) => {
  const name  = categoryName.trim().toUpperCase();
  const words = name.split(/\s+/).filter(Boolean);
  const candidates = [];

  if (words.includes('SMD')) {
    const rest = words.filter(w => w !== 'SMD').map(w => w[0]).join('');
    candidates.push(`TT-SMD-${rest}`);
  }
  if (words.some(w => ['THROUGH','TH'].includes(w))) {
    const rest = words.filter(w => !['THROUGH','HOLE','TH'].includes(w)).map(w => w[0]).join('');
    candidates.push(`TT-TH-${rest}`);
  }
  const initials = words.map(w => w[0]).join('');
  for (let len = initials.length; len >= 1; len--)
    candidates.push(`TT-${initials.slice(0, len)}`);

  const existing = new Set((existingCodes || []).map(c => c.toUpperCase()));
  for (const c of candidates)
    if (!existing.has(c.toUpperCase())) return c;

  let i = 2;
  const base = `TT-${initials[0]}`;
  while (existing.has(`${base}-${i}`.toUpperCase())) i++;
  return `${base}-${i}`;
};

const toTitle = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// ─── Parse Excel / CSV ────────────────────────────────────────
const parseExcel = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheetName =
          wb.SheetNames.find(n => /ebom/i.test(n)) ||
          wb.SheetNames.find(n => /bom/i.test(n))  ||
          wb.SheetNames[0];
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });

        const categories = [];
        let currentCat   = null;
        const seenCats   = new Set();

        raw.forEach(row => {
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const col3 = String(row[3] ?? '').trim();  // package
          const col4 = String(row[4] ?? '').trim();  // specification
          const col5 = String(row[5] ?? '').trim();  // qty

          const isCatRow =
            col0 === '' &&
            col1 !== '' &&
            /^[A-Z][A-Z\s'\/]+$/.test(col1) &&
            col1.length > 2 &&
            !/^(SL NO|DOC|DATE|REV|PCB|BATCH|PROJECT|QUANTITY|FOR )/i.test(col1);

          const isItemRow = /^\d+$/.test(col0) && col1 !== '';

          if (isCatRow) {
            const catName = toTitle(col1);
            const key = catName.toUpperCase();
            if (!seenCats.has(key)) {
              seenCats.add(key);
              currentCat = { name: catName, items: [] };
              categories.push(currentCat);
            } else {
              currentCat = categories.find(c => c.name.toUpperCase() === key);
            }
          } else if (isItemRow && currentCat) {
            const parts = [col1, col3, col4].filter(v => v && v !== '0' && v !== 'NaN');
            const qtyPart = col5 && col5 !== '0' ? `Qty:${col5}` : '';
            const label = [...parts, qtyPart].filter(Boolean).join(' · ');
            if (label) currentCat.items.push(label);
          }
        });

        resolve(categories);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

// ─── Steps ────────────────────────────────────────────────────
const STEPS = [
  { key: 'upload',   label: 'Upload'        },
  { key: 'review',   label: 'Review & Edit' },
  { key: 'describe', label: 'Descriptions'  },
  { key: 'confirm',  label: 'Confirm'       },
];

// ─── Main Modal ───────────────────────────────────────────────
const CategoryUploadModal = ({ existingNames, existingCodes, onClose, onSave }) => {
  const [step,       setStep]       = useState('upload');
  const [parsing,    setParsing]    = useState(false);
  const [parseError, setParseError] = useState('');
  const [rows,       setRows]       = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const [expanded,   setExpanded]   = useState({});
  const fileRef = useRef();

  // restore draft
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d?.rows?.length) { setRows(d.rows); setStep(d.step || 'review'); }
    } catch {}
  }, []);

  const saveDraft = useCallback((r, s) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ rows: r, step: s })); } catch {}
  }, []);
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  const processFile = async f => {
    setParsing(true); setParseError('');
    try {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!['xlsx','xls','csv'].includes(ext)) {
        setParseError('Only .xlsx / .xls / .csv supported.'); return;
      }
      const cats = await parseExcel(f);
      if (!cats.length) {
        setParseError('No category headers found. Ensure your BOM has ALL-CAPS section names like RESISTORS, CAPACITORS.');
        return;
      }
      const usedCodes = [...existingCodes];
      const built = cats.map((cat, i) => {
        const isDup = existingNames.some(n => n.toLowerCase() === cat.name.toLowerCase());
        const code  = generateCode(cat.name, usedCodes);
        usedCodes.push(code);
        const autoDesc = cat.items.slice(0, 5).join('; ');
        return { id: i, name: cat.name, code, description: autoDesc,
                 isActive: true, status: isDup ? 'duplicate' : 'new', items: cat.items };
      });
      setRows(built); saveDraft(built, 'review'); setStep('review');
    } catch (err) {
      setParseError('Parse failed: ' + (err.message || 'Unknown error'));
    } finally { setParsing(false); }
  };

  const handleDrop = e => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const updateRow = (id, field, value) =>
    setRows(prev => {
      const next = prev.map(r => r.id === id ? { ...r, [field]: value } : r);
      saveDraft(next, step); return next;
    });

  const removeRow = id =>
    setRows(prev => { const next = prev.filter(r => r.id !== id); saveDraft(next, step); return next; });

  const regenCode = id => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const others = [...existingCodes, ...rows.filter(r => r.id !== id).map(r => r.code)];
    updateRow(id, 'code', generateCode(row.name, others));
  };

  const newRows  = rows.filter(r => r.status !== 'duplicate');
  const dupRows  = rows.filter(r => r.status === 'duplicate');
  const stepIdx  = STEPS.findIndex(s => s.key === step);

  const canNext = () =>
    step === 'upload' ? rows.length > 0 :
    step === 'review' ? newRows.length > 0 : true;

  const goNext = () => { const n = STEPS[stepIdx+1]?.key; if(n){ setStep(n); saveDraft(rows,n); } };
  const goPrev = () => { const p = STEPS[stepIdx-1]?.key; if(p){ setStep(p); saveDraft(rows,p); } };

  const handleSubmit = async () => {
    setSaving(true);
    try { await onSave(newRows); clearDraft(); onClose(true); }
    catch(err) { alert('Save failed: '+(err.message||'Unknown')); }
    finally { setSaving(false); }
  };

  // ── Step renders ──────────────────────────────────────────
  const renderUpload = () => (
    <div>
      {rows.length > 0 && (
        <div className="cup-draft-banner">
          <FiSave size={13}/>
          <span>Draft — <strong>{rows.length} categories</strong></span>
          <button className="cup-db cup-db-pri" onClick={() => setStep('review')}>Resume</button>
          <button className="cup-db cup-db-dan" onClick={() => { clearDraft(); setRows([]); }}>Discard</button>
        </div>
      )}
      <div
        className={`cup-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden
          onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
        {parsing
          ? <><div className="cup-spinner"/><p className="cup-drop-sub">Scanning file…</p></>
          : <>
              <div className="cup-drop-icon"><FiUpload size={28}/></div>
              <p className="cup-drop-title">Drop BOM Excel / CSV here</p>
              <p className="cup-drop-sub">or click to browse · .xlsx .xls .csv</p>
              <div className="cup-drop-hint"><FiInfo size={11}/>Auto-detects ALL-CAPS category headers + item rows</div>
            </>
        }
      </div>
      {parseError && <div className="cup-error"><FiAlertTriangle size={13}/>{parseError}</div>}
      <div className="cup-format-note">
        <strong>How it works:</strong> Reads your BOM, finds section headers like <code>RESISTORS</code> / <code>TANTALUM CAPACITORS</code>,
        collects items (value · package · spec · qty) under each, generates a unique <code>TT-</code> code,
        and pre-fills the description from that item list.
      </div>
    </div>
  );

  const renderReview = () => (
    <div>
      <div className="cup-bar">
        <span className="cup-badge new">{newRows.length} New</span>
        {dupRows.length > 0 && <span className="cup-badge dup">{dupRows.length} Already exist (skipped)</span>}
        <span className="cup-bar-hint">▼ preview items · edit name/code inline</span>
      </div>
      <div className="cup-scroll">
        <table className="cup-tbl">
          <thead><tr>
            <th style={{width:28}}>#</th>
            <th>Category Name</th>
            <th>TT- Code</th>
            <th style={{width:68}}>Status</th>
            <th style={{width:52}}></th>
          </tr></thead>
          <tbody>
            {rows.map((row, idx) => (
              <React.Fragment key={row.id}>
                <tr className={row.status === 'duplicate' ? 'cup-dup-row' : ''}>
                  <td className="cup-num">{idx+1}</td>
                  <td>
                    <input className="cup-inp" value={row.name}
                      disabled={row.status === 'duplicate'}
                      onChange={e => updateRow(row.id,'name',e.target.value)}/>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:3,alignItems:'center'}}>
                      <input className="cup-inp cup-mono" value={row.code}
                        disabled={row.status === 'duplicate'}
                        onChange={e => updateRow(row.id,'code',e.target.value)}/>
                      {row.status !== 'duplicate' &&
                        <button className="cup-ibtn" title="Regenerate" onClick={() => regenCode(row.id)}>
                          <FiRefreshCw size={10}/>
                        </button>}
                    </div>
                  </td>
                  <td>
                    <span className={`cup-badge ${row.status === 'duplicate' ? 'dup' : 'new'}`} style={{fontSize:10}}>
                      {row.status === 'duplicate' ? 'Exists' : 'New'}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:3,alignItems:'center'}}>
                      {row.items?.length > 0 &&
                        <button className="cup-ibtn" title="Show items" onClick={() => setExpanded(p => ({...p,[row.id]:!p[row.id]}))}>
                          {expanded[row.id] ? <FiChevronUp size={10}/> : <FiChevronDown size={10}/>}
                        </button>}
                      {row.status !== 'duplicate' &&
                        <button className="cup-ibtn danger" title="Remove" onClick={() => removeRow(row.id)}>
                          <FiTrash2 size={10}/>
                        </button>}
                    </div>
                  </td>
                </tr>
                {expanded[row.id] && row.items?.length > 0 && (
                  <tr>
                    <td colSpan={5} style={{padding:'4px 12px 10px 36px',background:'#f8fafc'}}>
                      <div className="cup-items">
                        {row.items.map((item,i) => <span key={i} className="cup-chip">{item}</span>)}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDescribe = () => (
    <div>
      <p className="cup-desc-hint">Descriptions were auto-filled from your BOM items. Edit freely.</p>
      <div className="cup-desc-list">
        {newRows.map((row, idx) => (
          <div key={row.id} className="cup-desc-card">
            <div className="cup-desc-top">
              <span className="cup-desc-num">{idx+1}</span>
              <span className="cup-desc-name">{row.name}</span>
              <span className="cup-code-tag">{row.code}</span>
              {row.items?.length > 0 &&
                <span className="cup-item-cnt">{row.items.length} items</span>}
            </div>
            <textarea className="cup-ta" rows={2}
              placeholder="Description (auto-filled from items)"
              value={row.description}
              onChange={e => updateRow(row.id,'description',e.target.value)}/>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfirm = () => (
    <div>
      <div className="cup-confirm-banner">
        <FiCheck size={15}/> Ready to create <strong>{newRows.length} categories</strong>
      </div>
      <div className="cup-scroll">
        <table className="cup-tbl">
          <thead><tr>
            <th style={{width:28}}>#</th><th>Code</th><th>Category Name</th><th>Description</th>
          </tr></thead>
          <tbody>
            {newRows.map((row,idx) => (
              <tr key={row.id}>
                <td className="cup-num">{idx+1}</td>
                <td><span className="cup-code-tag">{row.code}</span></td>
                <td style={{fontWeight:600,color:'#1e293b'}}>{row.name}</td>
                <td style={{color:'#64748b',fontSize:11,maxWidth:200}}>{row.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dupRows.length > 0 &&
        <p className="cup-skip-note">
          <FiInfo size={11}/> Skipping {dupRows.length} existing: {dupRows.map(d=>d.name).join(', ')}
        </p>}
    </div>
  );

  return (
    <div className="cup-overlay" onClick={() => onClose(false)}>
      <div className="cup-modal" onClick={e => e.stopPropagation()}>

        <div className="cup-mheader">
          <div>
            <h3 className="cup-mtitle">Upload Categories via Excel</h3>
            <p className="cup-msub">Auto-detects categories · generates TT- codes · items become descriptions</p>
          </div>
          <button className="cup-close" onClick={() => onClose(false)}><FiX size={16}/></button>
        </div>

        <div className="cup-stepper">
          {STEPS.map((s,i) => (
            <React.Fragment key={s.key}>
              <div className={`cup-step ${i<stepIdx?'done':i===stepIdx?'active':''}`}>
                <div className="cup-dot">{i<stepIdx?<FiCheck size={10}/>:i+1}</div>
                <span className="cup-slbl">{s.label}</span>
              </div>
              {i<STEPS.length-1 && <div className={`cup-line ${i<stepIdx?'done':''}`}/>}
            </React.Fragment>
          ))}
        </div>

        <div className="cup-body">
          {step==='upload'   && renderUpload()}
          {step==='review'   && renderReview()}
          {step==='describe' && renderDescribe()}
          {step==='confirm'  && renderConfirm()}
        </div>

        <div className="cup-mfooter">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {step !== 'upload' &&
              <button className="cup-btn ghost" onClick={goPrev}>← Back</button>}
            {rows.length > 0 && step !== 'upload' &&
              <span style={{fontSize:11,color:'#94a3b8',display:'flex',alignItems:'center',gap:4}}>
                <FiSave size={10}/> Draft saved
              </span>}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="cup-btn secondary" onClick={() => onClose(false)}>Cancel</button>
            {step !== 'confirm'
              ? <button className="cup-btn primary" disabled={!canNext()} onClick={goNext}>
                  Next <FiChevronRight size={12}/>
                </button>
              : <button className="cup-btn primary" disabled={saving||!newRows.length} onClick={handleSubmit}>
                  {saving ? 'Creating…' : `Create ${newRows.length} Categories`}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryUploadModal;
