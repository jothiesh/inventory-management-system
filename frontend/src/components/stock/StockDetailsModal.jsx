import React, { useState, useEffect } from 'react';
import { stockApi } from '../../api/stockApi';
import { format } from 'date-fns';
import './StockDetailsModal.css';

const StockDetailsModal = ({ productStock, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    try {
      const response = await stockApi.getMovementsByProduct(productStock.product.productId);
      setMovements(response.data.data);
    } catch (error) {
      console.error('Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  const getTotalValue = () => {
    return productStock.lots.reduce((sum, lot) => {
      return sum + (parseFloat(lot.remainingQuantity) * parseFloat(lot.purchasePrice));
    }, 0);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Stock Details - {productStock.product.productName}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Product Info */}
          <div className="product-info-section">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Category:</span>
                <span className="info-value">{productStock.product.category.categoryName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Type:</span>
                <span className="info-value">{productStock.product.productType}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Stock:</span>
                <span className="info-value">
                  {productStock.totalStock.toFixed(2)} {productStock.product.unit}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Lots:</span>
                <span className="info-value">{productStock.lots.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Value:</span>
                <span className="info-value">₹{getTotalValue().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Lots Breakdown */}
          <div className="section">
            <h3>Stock Lots (FIFO Order)</h3>
            {productStock.lots.length === 0 ? (
              <p className="empty-message">No active lots</p>
            ) : (
              <table className="lots-table">
                <thead>
                  <tr>
                    <th>Lot Number</th>
                    <th>Quantity</th>
                    <th>Purchase Price</th>
                    <th>Purchase Date</th>
                    <th>Rack</th>
                    <th>Box</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {productStock.lots.map((lot) => (
                    <tr key={lot.lotId}>
                      <td><strong>{lot.lotNumber}</strong></td>
                      <td>{parseFloat(lot.remainingQuantity).toFixed(2)}</td>
                      <td>₹{parseFloat(lot.purchasePrice).toFixed(2)}</td>
                      <td>{format(new Date(lot.purchaseDate), 'dd MMM yyyy')}</td>
                      <td>{lot.rack?.rackNumber || '-'}</td>
                      <td>{lot.box?.boxNumber || '-'}</td>
                      <td>
                        ₹{(parseFloat(lot.remainingQuantity) * parseFloat(lot.purchasePrice)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Movements */}
          <div className="section">
            <h3>Recent Movements (Last 10)</h3>
            {loading ? (
              <p>Loading movements...</p>
            ) : movements.length === 0 ? (
              <p className="empty-message">No movements yet</p>
            ) : (
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
                  {movements.slice(0, 10).map((movement) => (
                    <tr key={movement.movementId}>
                      <td>{format(new Date(movement.createdAt), 'dd MMM yyyy HH:mm')}</td>
                      <td>
                        <span className={`badge badge-${movement.movementType === 'IN' ? 'success' : 'danger'}`}>
                          {movement.movementType}
                        </span>
                      </td>
                      <td>{movement.transactionType}</td>
                      <td>{parseFloat(movement.quantity).toFixed(2)}</td>
                      <td>{movement.lot.lotNumber}</td>
                      <td>{movement.referenceNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailsModal;