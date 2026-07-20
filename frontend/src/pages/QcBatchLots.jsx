import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FiRefreshCw, FiPackage, FiMapPin, FiHash, FiAlertTriangle,
} from 'react-icons/fi';
import './QcBatchLots.css';

// ══════════════════════════════════════════════════════════════
// QcBatchLots
//
// The full Stock IN data for one batch — everything AddStockPage
// captured and QC was never shown: lot number, rack/box location,
// HSN, rate, GST, line totals, purchase date, status.
//
// No new backend needed. StockController already exposes it:
//
//     GET /api/stock/batches/{batchId}/lots  ->  List<LotDetailResponse>
//
// which carries lotId, lotNumber, productId, partNumber, description,
// categoryName, purchaseQuantity, remainingQuantity, purchasePrice,
// totalValue, purchaseDate, hsnCode, gstPercent, gstAmount, rackName,
// boxLabel, status. QC simply never asked for it.
//
// Layout mirrors InvoiceBill in StockIn.jsx on purpose — the same batch
// should look the same whether you open it from Stock IN or from QC.
//
// NOTE ON SCOPE: this endpoint returns ALL lots in the batch, including
// ones QC has already decided. That is deliberate here — this panel is a
// record of what arrived, not a work queue. QcInspectionService.getBatchDetail
// still filters to undecided lots for the actual inspection form.
//
// Props:
//   batchId  — required
//   colSpan  — when rendered inside a <tr>, how many columns to span
//   compact  — drop the money columns (rate / GST / amount)
// ══════════════════════════════════════════════════════════════

const fmtCurrency = (n) => {
  const num = parseFloat(n || 0);
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
};

const LOT_STATUS = {
  Active:    { label: 'Active',    bg: '#d1fae5', color: '#065f46' },
  Depleted:  { label: 'Depleted',  bg: '#f1f5f9', color: '#64748b' },
  Cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b' },
};

// Cache per batch — expanding the same row twice must not refetch.
// Module-level so it survives collapse/expand and page-to-page navigation.
const lotCache = new Map();

export const clearLotCache = (batchId) => {
  if (batchId == null) lotCache.clear();
  else lotCache.delete(String(batchId));
};

const QcBatchLots = ({ batchId, compact = false }) => {
  const [lots,    setLots]    = useState(() => lotCache.get(String(batchId)) || null);
  const [loading, setLoading] = useState(!lotCache.has(String(batchId)));
  const [error,   setError]   = useState(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const key = String(batchId);

    if (!batchId) { setLoading(false); setError('No batch linked to this row'); return; }
    if (lotCache.has(key)) { setLots(lotCache.get(key)); setLoading(false); return; }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/api/stock/batches/${batchId}/lots`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = res.data?.data || [];
        lotCache.set(key, data);
        if (alive.current) setLots(data);
      } catch (e) {
        if (alive.current) {
          setError(e?.response?.data?.message || e?.message || 'Failed to load batch items');
        }
      } finally {
        if (alive.current) setLoading(false);
      }
    })();

    return () => { alive.current = false; };
  }, [batchId]);

  if (loading) {
    return (
      <div className="qbl-state">
        <FiRefreshCw size={18} className="qbl-spin" />
        <span>Loading batch items…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qbl-state qbl-state-err">
        <FiAlertTriangle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  if (!lots || lots.length === 0) {
    return (
      <div className="qbl-state">
        <FiPackage size={18} />
        <span>No line items recorded for this batch</span>
      </div>
    );
  }

  const totalQty  = lots.reduce((s, l) => s + parseFloat(l.purchaseQuantity || 0), 0);
  const subtotal  = lots.reduce((s, l) =>
    s + (parseFloat(l.purchaseQuantity || 0) * parseFloat(l.purchasePrice || 0)), 0);
  const totalGst  = lots.reduce((s, l) => s + parseFloat(l.gstAmount || 0), 0);
  const grand     = subtotal + totalGst;

  return (
    <div className="qbl-wrap">
      <div className="qbl-head">
        <FiPackage size={13} />
        <span className="qbl-head-title">Stock IN details</span>
        <span className="qbl-head-meta">{lots.length} line item{lots.length > 1 ? 's' : ''}</span>
      </div>

      <div className="qbl-table-wrap">
        <table className="qbl-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>PART NO.</th>
              <th>DESCRIPTION</th>
              <th>CATEGORY</th>
              <th>LOT NUMBER</th>
              <th>LOCATION</th>
              <th>HSN</th>
              <th className="qbl-r">QTY</th>
              <th className="qbl-r">REMAINING</th>
              {!compact && <th className="qbl-r">RATE (₹)</th>}
              {!compact && <th className="qbl-r">GST</th>}
              {!compact && <th className="qbl-r">AMOUNT (₹)</th>}
              <th>RECEIVED</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l, i) => {
              const qty   = parseFloat(l.purchaseQuantity || 0);
              const rate  = parseFloat(l.purchasePrice || 0);
              const gstA  = parseFloat(l.gstAmount || 0);
              const total = qty * rate + gstA;
              const loc   = l.rackName
                ? `${l.rackName}${l.boxLabel ? ' / ' + l.boxLabel : ''}`
                : null;
              const st = LOT_STATUS[l.status] || { label: l.status || '—', bg: '#f1f5f9', color: '#64748b' };

              return (
                <tr key={l.lotId || i} className="qbl-row">
                  <td className="qbl-num">{i + 1}</td>
                  <td>
                    <span className="qbl-mono" title={l.partNumber}>{l.partNumber || '—'}</span>
                  </td>
                  <td>
                    <div className="qbl-clip" title={l.description}>{l.description || '—'}</div>
                  </td>
                  <td>
                    {l.categoryName
                      ? <span className="qbl-chip">{l.categoryName}</span>
                      : <span className="qbl-faded">—</span>}
                  </td>
                  <td>
                    <span className="qbl-lotno" title={l.lotNumber}>
                      <FiHash size={8} />{l.lotNumber || '—'}
                    </span>
                  </td>
                  <td>
                    {loc
                      ? <span className="qbl-loc" title={loc}><FiMapPin size={9} />{loc}</span>
                      : <span className="qbl-faded">—</span>}
                  </td>
                  <td className="qbl-faded">{l.hsnCode || '—'}</td>
                  <td className="qbl-r qbl-qty">{qty}</td>
                  <td className="qbl-r qbl-faded">
                    {l.remainingQuantity != null ? parseFloat(l.remainingQuantity) : '—'}
                  </td>
                  {!compact && <td className="qbl-r qbl-mono-num">{fmtCurrency(rate)}</td>}
                  {!compact && (
                    <td className="qbl-r">
                      {l.gstPercent
                        ? <span className="qbl-gst">
                            <span className="qbl-gst-pct">{l.gstPercent}%</span>
                            <span className="qbl-gst-amt">₹{fmtCurrency(gstA)}</span>
                          </span>
                        : <span className="qbl-faded">—</span>}
                    </td>
                  )}
                  {!compact && <td className="qbl-r qbl-total">₹{fmtCurrency(total)}</td>}
                  <td className="qbl-faded">{fmtDate(l.purchaseDate)}</td>
                  <td>
                    <span className="qbl-status" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="qbl-totals">
        <div className="qbl-totals-card">
          <div className="qbl-total-row">
            <span>Total Quantity</span><strong>{totalQty}</strong>
          </div>
          {!compact && (
            <>
              <div className="qbl-total-row">
                <span>Subtotal (Base)</span><strong>₹{fmtCurrency(subtotal)}</strong>
              </div>
              <div className="qbl-total-row">
                <span>Total GST</span><strong>₹{fmtCurrency(totalGst)}</strong>
              </div>
              <div className="qbl-total-row qbl-grand">
                <span>Grand Total</span><strong>₹{fmtCurrency(grand)}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QcBatchLots;
