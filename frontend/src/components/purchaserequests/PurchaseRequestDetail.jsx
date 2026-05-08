import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseRequestApi } from '../../api/purchaseRequestApi';
import { useAuth } from '../../context/AuthContext';
import {
  FiDownload, FiArrowLeft, FiCalendar, FiUser,
  FiFileText, FiCheck, FiX, FiClock
} from 'react-icons/fi';
import './PurchaseRequests.css';
const statusConfig = {
  PENDING:  { label: 'Pending',  color: '#f59e0b', bg: '#fef3c7', icon: <FiClock size={14}/> },
  APPROVED: { label: 'Approved', color: '#10b981', bg: '#d1fae5', icon: <FiCheck size={14}/> },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: <FiX size={14}/> },
};

const PurchaseRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchPr(); }, [id]);

  const fetchPr = async () => {
    try {
      setLoading(true);
      const res = await purchaseRequestApi.getById(id);
      setPr(res.data.data);
    } catch (e) {
      setError('Purchase Request not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await purchaseRequestApi.downloadPdf(pr.id, pr.prCode);
    } catch (e) {
      alert('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this Purchase Request?')) return;
    try {
      setActionLoading('approve');
      const res = await purchaseRequestApi.approve(pr.id);
      setPr(res.data.data);
    } catch (e) {
      alert('Failed to approve.');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this Purchase Request?')) return;
    try {
      setActionLoading('reject');
      const res = await purchaseRequestApi.reject(pr.id);
      setPr(res.data.data);
    } catch (e) {
      alert('Failed to reject.');
    } finally {
      setActionLoading('');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN') : '—';

  if (loading) return (
    <div className="po-page">
      <div className="po-loading"><div className="po-spinner" /><span>Loading...</span></div>
    </div>
  );

  if (error || !pr) return (
    <div className="po-page"><div className="po-error">{error || 'Not found'}</div></div>
  );

  const totalQty = (pr.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
  const st = statusConfig[pr.status] || statusConfig.PENDING;
  const isOwner = user?.role === 'OWNER';
  const isPending = pr.status === 'PENDING';

  return (
    <div className="po-page pr-detail-animate">

      {/* ── Header ── */}
      <div className="po-header">
        <div className="po-header-left">
          <button className="po-btn-back" onClick={() => navigate('/purchase-requests')}>
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h2 className="po-title">{pr.prCode}</h2>
            <p className="po-subtitle">Purchase Request Details</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Status badge */}
          <span className="pr-status-badge pr-status-lg" style={{
            background: st.bg, color: st.color
          }}>
            {st.icon} {st.label}
          </span>

          {/* Approve / Reject — OWNER only, only when PENDING */}
          {isOwner && isPending && (
            <>
              <button
                className="pr-btn-approve"
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
              >
                {actionLoading === 'approve'
                  ? <span className="po-spin-sm" />
                  : <FiCheck size={15} />}
                Approve
              </button>
              <button
                className="pr-btn-reject"
                onClick={handleReject}
                disabled={actionLoading === 'reject'}
              >
                {actionLoading === 'reject'
                  ? <span className="po-spin-sm" />
                  : <FiX size={15} />}
                Reject
              </button>
            </>
          )}

          <button
            className="po-btn-download-lg"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <span className="po-spin-sm" /> : <FiDownload size={16} />}
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Meta Cards ── */}
      <div className="po-detail-meta">
        <div className="po-meta-card pr-card-animate" style={{ animationDelay: '0.05s' }}>
          <FiFileText size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">PR Code</span>
            <span className="po-meta-value" style={{ fontSize: '0.78rem' }}>{pr.prCode}</span>
          </div>
        </div>
        <div className="po-meta-card pr-card-animate" style={{ animationDelay: '0.1s' }}>
          <FiCalendar size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">Date</span>
            <span className="po-meta-value">{fmtDate(pr.prDate)}</span>
          </div>
        </div>
        <div className="po-meta-card pr-card-animate" style={{ animationDelay: '0.15s' }}>
          <FiUser size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">Created By</span>
            <span className="po-meta-value">{pr.createdByName || '—'}</span>
          </div>
        </div>
        <div className="po-meta-card pr-card-animate" style={{ animationDelay: '0.2s' }}>
          <FiFileText size={18} className="po-meta-icon" />
          <div>
            <span className="po-meta-label">Total Qty</span>
            <span className="po-meta-value">{totalQty.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ── Approved/Rejected info ── */}
      {pr.status !== 'PENDING' && pr.approvedByName && (
        <div className="po-card pr-status-info" style={{
          borderLeft: `4px solid ${st.color}`,
          background: st.bg,
        }}>
          <span style={{ color: st.color, fontWeight: 600, fontSize: '0.88rem' }}>
            {st.icon} {pr.status === 'APPROVED' ? 'Approved' : 'Rejected'} by{' '}
            <strong>{pr.approvedByName}</strong>
            {pr.approvedAt && ` on ${fmtDateTime(pr.approvedAt)}`}
          </span>
        </div>
      )}

      {/* ── Items Table ── */}
      <div className="po-card pr-card-animate" style={{ animationDelay: '0.25s' }}>
        <h3 className="po-card-title">Items</h3>
        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>Part No</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {(pr.items || []).map((item, i) => (
                <tr key={item.id || i} className="po-table-row pr-fade-in"
                  style={{ animationDelay: `${0.3 + i * 0.04}s` }}>
                  <td>{item.slNo || i + 1}</td>
                  <td>{item.partNo || '—'}</td>
                  <td>{item.description}</td>
                  <td><strong>{item.quantity?.toLocaleString('en-IN')}</strong></td>
                  <td>{item.remark || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="po-total-row">
                <td colSpan={3} className="po-total-label">TOTAL</td>
                <td className="po-total-amount">{totalQty.toLocaleString('en-IN')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Notes ── */}
      {pr.notes && (
        <div className="po-card pr-card-animate" style={{ animationDelay: '0.35s' }}>
          <h3 className="po-card-title">Notes</h3>
          <p className="po-terms-line">{pr.notes}</p>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequestDetail;