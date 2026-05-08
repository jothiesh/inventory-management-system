import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';
import { FiPlus, FiDownload, FiEye, FiFileText, FiSearch } from 'react-icons/fi';
import './PurchaseOrders.css';

const PurchaseOrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await purchaseOrderApi.getAll();
      setOrders(res.data.data || []);
    } catch (e) {
      setError('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, poCode) => {
    try {
      setDownloadingId(id);
      await purchaseOrderApi.downloadPdf(id, poCode);
    } catch (e) {
      alert('Failed to download PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = orders.filter(o =>
    o.poCode?.toLowerCase().includes(search.toLowerCase()) ||
    o.createdBy?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="po-page">

      {/* ── Header ── */}
      <div className="po-header">
        <div className="po-header-left">
          <FiFileText size={22} className="po-header-icon" />
          <div>
            <h2 className="po-title">Purchase Orders</h2>
            <p className="po-subtitle">{orders.length} orders total</p>
          </div>
        </div>
        <button className="po-btn-create" onClick={() => navigate('/purchase-orders/new')}>
          <FiPlus size={16} />
          New Purchase Order
        </button>
      </div>

      {/* ── Search ── */}
      <div className="po-search-bar">
        <FiSearch size={16} className="po-search-icon" />
        <input
          type="text"
          placeholder="Search by PO code or created by..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="po-search-input"
        />
      </div>

      {/* ── Error ── */}
      {error && <div className="po-error">{error}</div>}

      {/* ── Table ── */}
      {loading ? (
        <div className="po-loading">
          <div className="po-spinner" />
          <span>Loading purchase orders...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="po-empty">
          <FiFileText size={48} />
          <p>No purchase orders found</p>
          <button className="po-btn-create" onClick={() => navigate('/purchase-orders/new')}>
            Create your first PO
          </button>
        </div>
      ) : (
        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>PO Code</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className="po-table-row">
                  <td>
                    <span className="po-code-badge">{order.poCode}</span>
                  </td>
                  <td className="po-date">
                    {order.poDate ? new Date(order.poDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <span className="po-item-count">{order.items?.length || 0} items</span>
                  </td>
                  <td className="po-amount">
                    ₹ {Number(order.totalAmount || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2
                    })}
                  </td>
                  <td>{order.createdBy || '—'}</td>
                  <td>
                    <div className="po-actions">
                      <button
                        className="po-btn-view"
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                        title="View Details"
                      >
                        <FiEye size={15} />
                      </button>
                      <button
                        className="po-btn-download"
                        onClick={() => handleDownload(order.id, order.poCode)}
                        disabled={downloadingId === order.id}
                        title="Download PDF"
                      >
                        {downloadingId === order.id
                          ? <span className="po-spin-sm" />
                          : <FiDownload size={15} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderList;