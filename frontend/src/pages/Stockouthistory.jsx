import React, { useState, useEffect } from 'react';
import { reportApi } from '../api/reportApi';
import { toast } from 'react-toastify';
import { FiTrendingDown, FiCalendar, FiPackage, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';
import './StockOutHistory.css';

const StockOutHistory = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await reportApi.getStockOutHistory(
        dateRange.startDate,
        dateRange.endDate
      );
      
      if (response.data.success) {
        setHistory(response.data.data);
      }
      
      // Load summary
      const summaryRes = await reportApi.getStockOutSummary(
        dateRange.startDate,
        dateRange.endDate
      );
      
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to load stock out history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const applyFilter = () => {
    loadHistory();
  };

  const clearFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    setTimeout(() => loadHistory(), 100);
  };

  return (
    <div className="stock-out-history-page">
      <div className="page-header">
        <h1>Stock Out History</h1>
        <p>Complete transaction history of stock out operations</p>
      </div>

      {/* Date Range Filter */}
      <div className="card filter-section">
        <div className="filter-inputs">
          <div className="input-group">
            <label>Start Date</label>
            <input
              type="datetime-local"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="input-group">
            <label>End Date</label>
            <input
              type="datetime-local"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-buttons">
            <button className="btn btn-primary" onClick={applyFilter}>
              <FiCalendar /> Apply Filter
            </button>
            <button className="btn btn-secondary" onClick={clearFilter}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon transactions">
              <FiTrendingDown />
            </div>
            <div className="card-content">
              <h3>{summary.totalTransactions}</h3>
              <p>Total Transactions</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon products">
              <FiPackage />
            </div>
            <div className="card-content">
              <h3>{summary.uniqueProductsAffected}</h3>
              <p>Products Affected</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon quantity">
              <FiPackage />
            </div>
            <div className="card-content">
              <h3>{parseFloat(summary.totalQuantityOut).toFixed(2)}</h3>
              <p>Total Quantity Out</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon value">
              <FiDollarSign />
            </div>
            <div className="card-content">
              <h3>₹{parseFloat(summary.totalValueOut).toFixed(2)}</h3>
              <p>Total Value Out</p>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="card">
        {loading ? (
          <div className="loading">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <FiTrendingDown size={64} />
            <h3>No Stock Out Records</h3>
            <p>No stock out transactions found for the selected period</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Product</th>
                  <th>Lot Number</th>
                  <th>Quantity</th>
                  <th>Purchase Price</th>
                  <th>Stock Out Value</th>
                  <th>Reason</th>
                  <th>Reference</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => (
                  <tr key={index}>
                    <td className="date-cell">
                      {format(new Date(record.movementDate), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="product-cell">
                      <strong>{record.product.partNumber}</strong>
                      <br />
                      <small>{record.product.description}</small>
                      <br />
                      <span className="category-badge">
                        {record.product.categoryName}
                      </span>
                    </td>
                    <td>
                      <span className="lot-badge">{record.lot?.lotNumber || 'N/A'}</span>
                      <br />
                      {record.lot?.supplierName && (
                        <small className="supplier-name">{record.lot.supplierName}</small>
                      )}
                    </td>
                    <td className="quantity-cell">
                      {parseFloat(record.quantity).toFixed(2)}
                    </td>
                    <td className="price-cell">
                      ₹{parseFloat(record.lot?.purchasePrice || 0).toFixed(2)}
                    </td>
                    <td className="value-cell">
                      <strong>₹{parseFloat(record.stockOutValue || 0).toFixed(2)}</strong>
                    </td>
                    <td>{record.reason || '-'}</td>
                    <td>{record.reference || '-'}</td>
                    <td>{record.performedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockOutHistory;