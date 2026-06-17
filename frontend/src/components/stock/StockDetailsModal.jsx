import React, { useState, useEffect } from 'react';
import { stockApi } from '../../api/stockApi';
import './StockDetailsModal.css';

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return '—'; }
};

const fmtDt = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
};

const StockDetailsModal = ({ productStock, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { loadMovements(); }, []);

  const loadMovements = async () => {
    try {
      const response = await stockApi.getMovementsByProduct(productStock.product.productId);
      const data = response.data?.data || response.data || [];
      // Filter out any undefined/null entries
      setMovements(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch {
      console.error('Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  // Safe lots — filter out any null/undefined entries
  const lots = (productStock.lots || []).filter(Boolean);

  const getTotalValue = () =>
    lots.reduce((sum, lot) =>
      sum + (parseFloat(lot.remainingQuantity || 0) * parseFloat(lot.purchasePrice || 0)), 0);

  const product  = productStock.product || {};
  const category = product.category || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-header">
          <h2 className="modal-title">
            Stock Details — {product.partNumber || product.productName || '—'}
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">

          {/* ── Product Info ── */}
          <div className="product-info-section">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Part Number</span>
                <span className="info-value">{product.partNumber || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Description</span>
                <span className="info-value">{product.description || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Category</span>
                <span className="info-value">{category.categoryName || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Package</span>
                <span className="info-value">{product.packageType || product.productType || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Stock</span>
                <span className="info-value">
                  {parseFloat(productStock.totalStock || 0).toFixed(2)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Active Lots</span>
                <span className="info-value">{lots.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Value</span>
                <span className="info-value">₹{getTotalValue().toFixed(2)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Supplier</span>
                <span className="info-value">{product.supplier?.supplierName || '—'}</span>
              </div>
            </div>
          </div>

          {/* ── Lots Breakdown ── */}
          <div className="section">
            <h3>Stock Lots (FIFO Order)</h3>
            {lots.length === 0 ? (
              <p className="empty-message">No active lots</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="lots-table">
                  <thead>
                    <tr>
                      <th>Lot Number</th>
                      <th>Qty</th>
                      <th>Purchase Price</th>
                      <th>Purchase Date</th>
                      <th>Rack</th>
                      <th>Box</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot, idx) => (
                      <tr key={lot.lotId || idx}>
                        <td><strong>{lot.lotNumber || '—'}</strong></td>
                        <td>{parseFloat(lot.remainingQuantity || lot.quantity || 0).toFixed(2)}</td>
                        <td>₹{parseFloat(lot.purchasePrice || 0).toFixed(2)}</td>
                        <td>{fmt(lot.purchaseDate || lot.createdAt)}</td>
                        <td>{lot.rack?.rackName || lot.rack?.rackNumber || lot.rackName || '—'}</td>
                        <td>{lot.box?.boxLabel || lot.box?.boxNumber || lot.boxLabel || '—'}</td>
                        <td>
                          ₹{(parseFloat(lot.remainingQuantity || lot.quantity || 0) *
                             parseFloat(lot.purchasePrice || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Recent Movements ── */}
          <div className="section">
            <h3>Recent Movements (Last 10)</h3>
            {loading ? (
              <p>Loading movements…</p>
            ) : movements.length === 0 ? (
              <p className="empty-message">No movements yet</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="movements-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Transaction</th>
                      <th>Quantity</th>
                      <th>Lot</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.slice(0, 10).map((movement, idx) => (
                      <tr key={movement.movementId || idx}>
                        <td>{fmtDt(movement.createdAt)}</td>
                        <td>
                          <span className={`badge badge-${movement.movementType === 'IN' ? 'success' : 'danger'}`}>
                            {movement.movementType || '—'}
                          </span>
                        </td>
                        <td>{movement.transactionType || '—'}</td>
                        <td>{parseFloat(movement.quantity || 0).toFixed(2)}</td>
                        {/* ✅ FIX: null guard on movement.lot */}
                        <td>{movement.lot?.lotNumber || movement.lotNumber || '—'}</td>
                        <td>{movement.referenceNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailsModal;