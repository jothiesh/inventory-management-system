import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiX, FiPrinter, FiEdit2, FiRotateCcw, FiInfo } from 'react-icons/fi';
import './DeliveryChallan.css'; // keep this file next to DeliveryChallan.css (or adjust path)

/* ════════════════════════════════════════════════════════════════
   DeliveryChallanPrintModal — same "Edit Fields" system as the
   Return Challan. Click Edit Fields → every red-dashed field
   (company block, title, GSTIN, To/M/s., address, TIN, date,
   basis line, ALL 10 item rows incl. blank ones, footer, both
   signature labels) becomes typable. Print / Save PDF strips all
   edit affordances so the paper is clean.

   USAGE:
     {showPrint && (
       <DeliveryChallanPrintModal
         dc={{
           dcNumber : 'DC-20260718-013',
           dcDate   : '2026-07-18',        // ISO — or pass dcDateText directly
           toName   : form.companyName,    // "To, M/s."
           toAddress: form.address,
           tinGstin : form.gstin,          // recipient TIN/GSTIN row
           items    : [{ partNumber, description, quantity, rate, remarks }],
         }}
         onClose={() => setShowPrint(false)}
       />
     )}
   ════════════════════════════════════════════════════════════════ */

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
};
const fmtNum = (n) => parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });

const hasContent = (r) =>
  !r._pad && [r.partNumber, r.description, r.quantity, r.rate, r.remarks]
    .some(v => v != null && String(v).trim() !== '');

/* ── inline-editable text node (identical to ReturnChallanDetail) ── */
const Editable = ({ value, onChange, editable, className = '', style = {}, tag = 'span', placeholder = '' }) => {
  const Tag = tag;
  const ref = useRef(null);

  const handleBlur = () => {
    if (!editable) return;
    const text = ref.current?.innerText ?? '';
    if (text !== value) onChange(text);
  };

  if (!editable) {
    return <Tag className={className} style={style}>{value || placeholder}</Tag>;
  }
  return (
    <Tag
      ref={ref}
      className={`rdc-editable ${className}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={handleBlur}
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
};

/* ════════════════════════════════════════════════════════════════
   THE PRINTABLE DOCUMENT — reuses your existing ch-* classes
   ════════════════════════════════════════════════════════════════ */
export const DeliveryChallanDoc = ({ dc, preview = false, editable = false, doc, setDoc, items, setItems }) => {
  if (!dc) return null;
  const MIN_ROWS = preview ? 6 : 10;
  const printRows = [...items];
  while (printRows.length < MIN_ROWS) {
    printRows.push({ _pad: true, id: `pad-${printRows.length}` });
  }

  const setField = (k) => (v) => setDoc(prev => ({ ...prev, [k]: v }));
  const setItemField = (idx, k) => (v) => setItems(prev => {
    const next = [...prev];
    next[idx] = { ...next[idx], [k]: (k === 'quantity' || k === 'rate') ? v.replace(/[^\d.]/g, '') : v };
    return next;
  });

  return (
    <div className={`challan-doc ${preview ? 'challan-preview' : ''} ${editable ? 'rdc-doc-editable' : ''}`}>
      {/* HEADER */}
      <div className="ch-header">
        <div className="ch-logo-col">
          <div className="ch-brand">Thinture<sup>®</sup></div>
          <div className="ch-tagline">Think Future</div>
        </div>
        <div className="ch-company-col">
          <Editable tag="div" className="ch-company-name" editable={editable}
            value={doc.companyName} onChange={setField('companyName')}/>
          <Editable tag="div" className="ch-company-addr" editable={editable}
            value={doc.companyAddr} onChange={setField('companyAddr')}/>
          <Editable tag="div" className="ch-company-phone" editable={editable}
            value={doc.companyPhone} onChange={setField('companyPhone')}/>
        </div>
      </div>

      {/* TITLE ROW */}
      <div className="ch-title-row">
        <Editable tag="div" className="ch-title" editable={editable}
          value={doc.title} onChange={setField('title')}/>
        <div className="ch-gstin">
          GSTIN: <Editable editable={editable} value={doc.gstin} onChange={setField('gstin')}/>
        </div>
      </div>

      {/* META — To box + Challan No / Date box */}
      <div className="ch-meta">
        <div className="ch-to-box">
          <div className="ch-to-label">To,</div>
          <div className="ch-to-label">
            M/s. <Editable editable={editable} style={{ fontWeight: 700 }}
              value={doc.toName} onChange={setField('toName')} placeholder="[company / person]"/>
          </div>
          <Editable tag="div" className="ch-to-label" style={{ marginTop: 4 }} editable={editable}
            value={doc.toAddress} onChange={setField('toAddress')} placeholder="[address]"/>
        </div>
        <div className="ch-ref-box">
          <div className="ch-ref-row">
            <span className="ch-ref-label">Challan No.:</span>
            <span className="ch-ref-val ch-challan-no">{dc.dcNumber}</span>
          </div>
          <div className="ch-ref-row" style={{ marginTop: 6 }}>
            <span className="ch-ref-label">Date :</span>
            <Editable editable={editable} className="ch-ref-val"
              value={doc.dcDateText} onChange={setField('dcDateText')}/>
          </div>
        </div>
      </div>

      {/* TIN / GSTIN ROW */}
      <div style={{ padding: preview ? '3px 7px' : '6px 11px', borderTop: '1px solid #000',
        fontWeight: 700, fontSize: preview ? 7 : 12 }}>
        TIN No. / GSTIN:{' '}
        <Editable editable={editable} style={{ fontWeight: 600 }}
          value={doc.tinGstin} onChange={setField('tinGstin')} placeholder=""/>
      </div>

      {/* BASIS ROW — bold "returnable" preserved when not editing */}
      <div className="ch-basis-row">
        {editable ? (
          <Editable editable value={doc.basisLine} onChange={setField('basisLine')}/>
        ) : (
          <span>
            {String(doc.basisLine || '').split(/(returnable)/i).map((p, i) =>
              /^returnable$/i.test(p)
                ? <strong key={i}>{p}</strong>
                : <React.Fragment key={i}>{p}</React.Fragment>)}
          </span>
        )}
      </div>

      {/* ITEMS TABLE — every row typable in edit mode, blank ones too */}
      <table className="ch-table">
        <thead>
          <tr>
            <th className="ch-th ch-th-sl">SL. No.</th>
            <th className="ch-th ch-th-desc">Description</th>
            <th className="ch-th ch-th-qty">Quantity</th>
            <th className="ch-th ch-th-rate">Rate</th>
            <th className="ch-th ch-th-rem">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {printRows.map((row, idx) => {
            if (row._pad) {
              return (
                <tr key={row.id} className="ch-tr">
                  <td className="ch-td ch-td-sl">&nbsp;</td>
                  <td className="ch-td ch-td-desc">&nbsp;</td>
                  <td className="ch-td ch-td-qty">&nbsp;</td>
                  <td className="ch-td ch-td-rate">&nbsp;</td>
                  <td className="ch-td ch-td-rem">&nbsp;</td>
                </tr>
              );
            }
            return (
              <tr key={row.id || idx} className="ch-tr">
                {/* SL fills itself only when the row has content */}
                <td className="ch-td ch-td-sl">{hasContent(row) ? idx + 1 : '\u00A0'}</td>
                <td className="ch-td ch-td-desc">
                  {editable ? (
                    <>
                      <Editable editable className="ch-pn" style={{ display: 'inline' }}
                        value={row.partNumber || ''} onChange={setItemField(idx, 'partNumber')} placeholder="[part]"/>
                      {' '}
                      <Editable editable style={{ display: 'inline' }}
                        value={row.description || ''} onChange={setItemField(idx, 'description')} placeholder="description"/>
                    </>
                  ) : (
                    <>
                      {row.partNumber ? <span className="ch-pn">[{row.partNumber}] </span> : null}
                      {row.description || '\u00A0'}
                    </>
                  )}
                </td>
                <td className="ch-td ch-td-qty">
                  <Editable editable={editable}
                    value={row.quantity != null && row.quantity !== '' ? String(row.quantity) : ''}
                    onChange={setItemField(idx, 'quantity')}/>
                </td>
                <td className="ch-td ch-td-rate">
                  {editable ? (
                    <Editable editable style={{ display: 'inline' }}
                      value={row.rate != null && row.rate !== '' ? String(row.rate) : ''}
                      onChange={setItemField(idx, 'rate')}/>
                  ) : (
                    row.rate ? `₹${fmtNum(row.rate)}` : '\u00A0'
                  )}
                </td>
                <td className="ch-td ch-td-rem">
                  <Editable editable={editable} value={row.remarks || ''}
                    onChange={setItemField(idx, 'remarks')}/>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* FOOTER */}
      <div className="ch-footer">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: preview ? 4 : 8 }}>
          <Editable tag="div" className="ch-footer-right" editable={editable}
            value={doc.footerRight} onChange={setField('footerRight')}/>
        </div>
        <div className="ch-sig-row">
          <div className="ch-sig">
            <div className="ch-sig-line"/>
            <Editable tag="div" className="ch-sig-label" editable={editable}
              value={doc.sigLeft} onChange={setField('sigLeft')}/>
          </div>
          <div className="ch-sig ch-sig-r">
            <div className="ch-sig-line"/>
            <Editable tag="div" className="ch-sig-label" editable={editable}
              value={doc.sigRight} onChange={setField('sigRight')}/>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   PRINT MODAL — hosts doc + item state, Edit toggle, Reset, Print
   ════════════════════════════════════════════════════════════════ */
const DeliveryChallanPrintModal = ({ dc, onClose }) => {
  const [editable, setEditable] = useState(false);

  const seedDoc = () => ({
    companyName:  'Thinture Technologies Pvt. Ltd.,',
    companyAddr:  'No. 508, 2nd Floor, 2nd Block, 8th Main, HMT Layout, Vidyaranayapura, Bangalore – 560 097',
    companyPhone: 'Phone: +91 80 2364 6920 / 4166 6965',
    title:        'DELIVERY CHALLAN',
    gstin:        '29AADCT9485G1ZP',
    toName:       dc.toName || dc.companyName || dc.supplierName || '',
    toAddress:    dc.toAddress || dc.address || '',
    tinGstin:     dc.tinGstin || dc.gstin || '',
    dcDateText:   dc.dcDateText || fmtDate(dc.dcDate),
    basisLine:    'Please receive the following goods on returnable basis.',
    footerRight:  'For Thinture Technologies PVT. LTD.,',
    sigLeft:      "(Receiver's Signature)",
    sigRight:     'Authorised Signature',
  });

  /* seed to 10 real (typable) rows — blank rows can be filled by hand */
  const seedItems = () => {
    const base = (dc.items || []).map((i, n) => ({
      id:          i.id ?? `it-${n}`,
      partNumber:  i.partNumber ?? '',
      description: i.description ?? '',
      quantity:    i.quantity ?? i.qty ?? '',
      rate:        i.rate ?? i.unitPrice ?? '',
      remarks:     i.remarks ?? '',
    }));
    while (base.length < 10) {
      base.push({ id: `blank-${base.length}`, partNumber:'', description:'', quantity:'', rate:'', remarks:'' });
    }
    return base;
  };

  const [doc, setDoc]     = useState(seedDoc);
  const [items, setItems] = useState(seedItems);

  const resetAll = () => { setDoc(seedDoc()); setItems(seedItems()); toast.info('Reset to original'); };
  const handlePrint = () => window.print();

  /* Esc closes */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* scope the print-isolation CSS to only while this modal is open */
  useEffect(() => {
    document.body.classList.add('dcp-print-mode');
    return () => document.body.classList.remove('dcp-print-mode');
  }, []);

  return (
    <div className="dc-modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dc-modal" style={{ maxWidth: 820 }}>
        <div className="dc-modal-head">
          <span>Delivery Challan — {dc.dcNumber}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className={`dc-btn ${editable ? 'dc-btn-editing' : 'dc-btn-ghost'}`}
              onClick={() => setEditable(e => !e)}
              title="Click any field in the challan to edit it">
              <FiEdit2 size={13}/> {editable ? 'Editing… (click Done)' : 'Edit Fields'}
            </button>
            {editable && (
              <button className="dc-btn dc-btn-ghost" onClick={resetAll} title="Reset all fields">
                <FiRotateCcw size={13}/> Reset
              </button>
            )}
            <button className="dc-btn dc-btn-primary" onClick={handlePrint}>
              <FiPrinter size={13}/> Print / Save PDF
            </button>
            <button className="dc-modal-close" onClick={onClose} title="Close (Esc)"><FiX size={16}/></button>
          </div>
        </div>
        {editable && (
          <div className="rdc-edit-hint">
            <FiInfo size={12}/> Click any red-dashed field to type — blank rows too. Changes apply to the printed copy only.
          </div>
        )}
        <div className="dc-modal-body" id="dcp-print-area">
          <DeliveryChallanDoc dc={dc} editable={editable}
            doc={doc} setDoc={setDoc} items={items} setItems={setItems}/>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallanPrintModal;
