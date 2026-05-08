import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';
import { FiDownload, FiArrowLeft, FiCalendar, FiUser, FiFileText } from 'react-icons/fi';
import './PurchaseOrders.css';

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPo();
  }, [id]);

  const fetchPo = async () => {
    try {
      setLoading(true);
      const res = await purchaseOrderApi.getById(id);
      setPo(res.data.data);
    } catch (e) {
      setError('Purchase Order not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await purchaseOrderApi.downloadPdf(po.id, po.poCode);
    } catch (e) {
      alert('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="po-page">
      <div className="po-loading"><div className="po-spinner" /><span>Loading...</span></div>
    </div>
  );

  if (error || !po) return (
    <div className="po-page">
      <div className="po-error">{error || 'Not found'}</div>
    </div>
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
  const fmtAmt  = (a) => Number(a || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="po-page">

      {/* ── Header ── */}
      <div className="po-header">
        <div className="po-header-left">
          <button className="po-btn-back" onClick={() => navigate('/purchase-orders')}>
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h2 className="po-title">{po.poCode}</h2>
            <p className="po-subtitle">Purchase Order Details</p>
          </div>
        </div>
        <button
          className="po-btn-download-lg"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? <span className="po-spin-sm" /> : <FiDownload size={16} />}
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      {/* ── Info Cards ── */}
      <div className="po-detail-meta">
        <div className="po-meta-card">
          <FiFileText size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">PO Code</span>
            <span className="po-meta-value">{po.poCode}</span>
          </div>
        </div>
        <div className="po-meta-card">
          <FiCalendar size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">PO Date</span>
            <span className="po-meta-value">{fmtDate(po.poDate)}</span>
          </div>
        </div>
        <div className="po-meta-card">
          <FiCalendar size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">Delivery</span>
            <span className="po-meta-value">
              {po.deliveryFrom && po.deliveryTo
                ? `${fmtDate(po.deliveryFrom)} → ${fmtDate(po.deliveryTo)}`
                : '—'}
            </span>
          </div>
        </div>
        <div className="po-meta-card">
          <FiUser size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">Created By</span>
            <span className="po-meta-value">{po.createdBy || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="po-card">
        <h3 className="po-card-title">Items</h3>
        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>HSN/SAC</th>
                <th>Description</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Rate</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((item, i) => (
                <tr key={item.id || i} className="po-table-row">
                  <td>{item.slNo || i + 1}</td>
                  <td>{item.hsnCode || '—'}</td>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{item.uom || '—'}</td>
                  <td>₹ {fmtAmt(item.rate)}</td>
                  <td className="po-amount">₹ {fmtAmt(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="po-total-row">
                <td colSpan={6} className="po-total-label">TOTAL</td>
                <td className="po-amount po-total-amount">₹ {fmtAmt(po.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Total in Words */}
        <div className="po-words-row">
          <span className="po-words-label">Total in Words: </span>
          <span className="po-words-value">{po.totalInWords}</span>
        </div>
      </div>

      {/* ── Terms ── */}
      {(po.paymentTerms || po.notes) && (
        <div className="po-card">
          <h3 className="po-card-title">Terms & Conditions</h3>
          {po.paymentTerms && (
            <p className="po-terms-line"><strong>Payment:</strong> {po.paymentTerms}</p>
          )}
          {po.deliveryFrom && po.deliveryTo && (
            <p className="po-terms-line">
              <strong>Delivery Date:</strong> Between {fmtDate(po.deliveryFrom)} and {fmtDate(po.deliveryTo)}
            </p>
          )}
          {po.notes && (
            <p className="po-terms-line"><strong>Notes:</strong> {po.notes}</p>
          )}
        </div>
      )}

    </div>
  );
};

export default PurchaseOrderDetail;