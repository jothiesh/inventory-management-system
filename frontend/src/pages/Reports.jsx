import React, { useState, useEffect } from 'react';
import { reportApi } from '../api/reportApi';
import { toast } from 'react-toastify';
import { 
  FiBarChart2, FiDownload, FiTrendingDown, 
  FiDollarSign, FiGrid, FiBox 
} from 'react-icons/fi';
import { format } from 'date-fns';
import './Reports.css';

const Reports = () => {
  const [activeReport, setActiveReport] = useState('stock-summary');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const loadReport = async (reportType) => {
    setLoading(true);
    try {
      let response;
      
      switch (reportType) {
        case 'stock-summary':
          response = await reportApi.getStockSummary();
          break;
        case 'category-wise':
          response = await reportApi.getCategoryWise();
          break;
        case 'rack-wise':
          response = await reportApi.getRackWise();
          break;
        case 'dead-stock':
          response = await reportApi.getDeadStock();
          break;
        case 'slow-moving':
          response = await reportApi.getSlowMoving();
          break;
        case 'price-difference':
          response = await reportApi.getPriceDifference();
          break;
        case 'stock-value':
          response = await reportApi.getStockValue();
          break;
        default:
          response = await reportApi.getStockSummary();
      }
      
      const data = response?.data?.data ?? null;
      console.log(`${reportType} response:`, data);
      setReportData(data);
      
    } catch (error) {
      toast.error('Failed to load report');
      console.error('Report error:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    toast.info('Export functionality will be implemented');
  };

  const reportTabs = [
    { id: 'stock-summary', label: 'Stock Summary', icon: <FiBarChart2 /> },
    { id: 'category-wise', label: 'Category-wise', icon: <FiGrid /> },
    { id: 'rack-wise', label: 'Rack-wise', icon: <FiBox /> },
    { id: 'dead-stock', label: 'Dead Stock', icon: <FiTrendingDown /> },
    { id: 'slow-moving', label: 'Slow Moving', icon: <FiTrendingDown /> },
    { id: 'price-difference', label: 'Price Difference', icon: <FiDollarSign /> },
    { id: 'stock-value', label: 'Stock Value', icon: <FiDollarSign /> },
  ];

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <button className="btn btn-primary" onClick={exportReport}>
          <FiDownload /> Export Report
        </button>
      </div>

      <div className="card">
        <div className="report-tabs">
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              className={`report-tab ${activeReport === tab.id ? 'active' : ''}`}
              onClick={() => setActiveReport(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card report-content">
        {loading ? (
          <div className="loading">Loading report...</div>
        ) : (
          <>
            {activeReport === 'stock-summary' && <StockSummaryReport data={reportData} />}
            {activeReport === 'category-wise' && <CategoryWiseReport data={reportData} />}
            {activeReport === 'rack-wise' && <RackWiseReport data={reportData} />}
            {activeReport === 'dead-stock' && <DeadStockReport data={reportData} />}
            {activeReport === 'slow-moving' && <SlowMovingReport data={reportData} />}
            {activeReport === 'price-difference' && <PriceDifferenceReport data={reportData} />}
            {activeReport === 'stock-value' && <StockValueReport data={reportData} />}
          </>
        )}
      </div>
    </div>
  );
};

const StockSummaryReport = ({ data }) => {
  if (!data) return <div className="empty-report"><h3>No Data Available</h3></div>;
  return (
    <div className="report-section">
      <h3>Stock Summary Overview</h3>
      <div className="summary-grid">
        <div className="summary-stat">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{data.totalProducts || 0}</div>
        </div>
        <div className="summary-stat">
          <div className="stat-label">Products In Stock</div>
          <div className="stat-value success">{data.productsInStock || 0}</div>
        </div>
        <div className="summary-stat">
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value danger">{data.productsOutOfStock || 0}</div>
        </div>
        <div className="summary-stat">
          <div className="stat-label">Low Stock Alert</div>
          <div className="stat-value warning">{data.lowStockProducts || 0}</div>
        </div>
      </div>
    </div>
  );
};

const CategoryWiseReport = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="empty-report"><h3>No Categories Found</h3><p>Add products and categories to see this report</p></div>;
  }
  return (
    <div className="report-section">
      <h3>Category-wise Stock Report</h3>
      <table className="report-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Total Products</th>
            <th>Total Stock</th>
            <th>Total Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><strong>{item.category?.categoryName || 'Unknown'}</strong></td>
              <td>{item.totalProducts || 0}</td>
              <td>{parseFloat(item.totalStock || 0).toFixed(2)}</td>
              <td className="price">₹{parseFloat(item.totalValue || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>{data.reduce((sum, item) => sum + (item.totalProducts || 0), 0)}</strong></td>
            <td><strong>{data.reduce((sum, item) => sum + parseFloat(item.totalStock || 0), 0).toFixed(2)}</strong></td>
            <td className="price"><strong>₹{data.reduce((sum, item) => sum + parseFloat(item.totalValue || 0), 0).toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const RackWiseReport = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="empty-report"><h3>No Racks Found</h3><p>Add racks and stock to see this report</p></div>;
  }
  return (
    <div className="report-section">
      <h3>Rack-wise Stock Report</h3>
      <table className="report-table">
        <thead>
          <tr>
            <th>Rack</th>
            <th>Location</th>
            <th>Total Items</th>
            <th>Total Stock</th>
            <th>Total Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><strong>{item.rack?.rackNumber || 'Unknown'}</strong></td>
              <td>{item.rack?.rackName || '-'}</td>
              <td>{item.totalItems || 0}</td>
              <td>{parseFloat(item.totalStock || 0).toFixed(2)}</td>
              <td className="price">₹{parseFloat(item.totalValue || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DeadStockReport = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="empty-report"><h3>No Dead Stock Found</h3><p>Great! No products with 12+ months of no movement</p></div>;
  }
  return (
    <div className="report-section">
      <h3>Dead Stock Report (12+ Months)</h3>
      <div className="alert alert-danger"><strong>⚠️ {data.length} products</strong> inactive for 12+ months</div>
      <table className="report-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Last Movement</th>
            <th>Months</th>
            <th>Value Blocked</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="dead-stock-row">
              <td><strong>{item.product?.partNumber || 'Unknown'}</strong></td>
              <td>{item.product?.category?.categoryName || '-'}</td>
              <td>{parseFloat(item.currentStock || item.remainingQuantity || 0).toFixed(2)}</td>
              <td>{item.lastMovementDate ? format(new Date(item.lastMovementDate), 'dd MMM yyyy') : '-'}</td>
              <td><span className="badge badge-danger">{item.monthsNoMovement || 0} months</span></td>
              <td className="price danger">₹{parseFloat(item.blockedValue || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SlowMovingReport = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="empty-report"><h3>No Slow Moving Stock</h3><p>All products are moving well!</p></div>;
  }
  return (
    <div className="report-section">
      <h3>Slow Moving Stock Report (6+ Months)</h3>
      <div className="alert alert-warning"><strong>⚠️ {data.length} products</strong> not moved in 6+ months</div>
      <table className="report-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Last Movement</th>
            <th>Months</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td><strong>{item.product?.partNumber || 'Unknown'}</strong><br/>{item.product?.description || '-'}</td>
              <td>{item.product?.category?.categoryName || '-'}</td>
              <td>{parseFloat(item.currentStock || item.remainingQuantity || 0).toFixed(2)}</td>
              <td>{item.lastMovementDate ? format(new Date(item.lastMovementDate), 'dd MMM yyyy') : '-'}</td>
              <td><span className="badge badge-warning">{item.monthsNoMovement || 0} months</span></td>
              <td>{item.noMovementHistory ? <span className="badge badge-danger">Never Moved</span> : <span className="badge badge-warning">Slow Moving</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PriceDifferenceReport = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="empty-report"><h3>No Price Differences</h3><p>All products have consistent pricing</p></div>;
  }
  return (
    <div className="report-section">
      <h3>Price Difference Report</h3>
      <div className="alert alert-info"><strong>ℹ️ {data.length} products</strong> have multiple prices</div>
      {data.map((item, index) => (
        <div key={index} className="price-diff-section">
          <div className="product-header">
            <h4>{item.product?.partNumber || 'Unknown'}</h4>
            <span className="badge badge-info">{item.priceCount || 0} prices</span>
          </div>
          <div className="price-badges">
            {(item.differentPrices || []).map((price, idx) => (
              <span key={idx} className="price-badge">₹{parseFloat(price).toFixed(2)}</span>
            ))}
          </div>
          <table className="lots-breakdown-table">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Date</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {(item.lots || []).map((lot, lotIdx) => (
                <tr key={lotIdx}>
                  <td>{lot.lotNumber || '-'}</td>
                  <td>{parseFloat(lot.remainingQuantity || 0).toFixed(2)}</td>
                  <td className="price">₹{parseFloat(lot.purchasePrice || 0).toFixed(2)}</td>
                  <td>{lot.purchaseDate ? format(new Date(lot.purchaseDate), 'dd MMM yyyy') : '-'}</td>
                  <td className="price">₹{(parseFloat(lot.remainingQuantity || 0) * parseFloat(lot.purchasePrice || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

const StockValueReport = ({ data }) => {
  if (!data) return <div className="empty-report"><h3>No Data Available</h3></div>;
  return (
    <div className="report-section">
      <h3>Stock Value Report</h3>
      <div className="value-summary">
        <div className="value-card">
          <div className="value-icon"><FiDollarSign size={32} /></div>
          <div className="value-info">
            <div className="value-label">Total Stock Value</div>
            <div className="value-amount">₹{parseFloat(data.totalStockValue || 0).toFixed(2)}</div>
          </div>
        </div>
        <div className="value-card">
          <div className="value-icon"><FiBox size={32} /></div>
          <div className="value-info">
            <div className="value-label">Total Active Lots</div>
            <div className="value-amount">{data.totalActiveLots || 0}</div>
          </div>
        </div>
      </div>
      <div className="value-info-box">
        <h4>Value Calculation</h4>
        <p>Total stock value = Σ (Lot Quantity × Purchase Price)</p>
        <p className="formula"><strong>Formula:</strong> Σ (Lot Quantity × Purchase Price)</p>
      </div>
    </div>
  );
};

export default Reports;