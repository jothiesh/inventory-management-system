import React, { useState, useEffect } from 'react';
import { reportApi } from '../api/reportApi';
import { toast } from 'react-toastify';
import {
  FiBarChart2, FiDownload, FiTrendingDown,
  FiDollarSign, FiGrid, FiBox, FiAlertTriangle,
  FiPackage, FiCheckCircle, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import './Reports.css';

const Reports = () => {
  const [activeReport, setActiveReport] = useState('stock-summary');
  const [reportData, setReportData]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    setExpandedRows({});
    loadReport(activeReport);
  }, [activeReport]);

  const loadReport = async (reportType) => {
    setLoading(true);
    setReportData(null);
    try {
      let response;
      switch (reportType) {
        case 'stock-summary':    response = await reportApi.getStockSummary();    break;
        case 'category-wise':   response = await reportApi.getCategoryWise();    break;
        case 'rack-wise':       response = await reportApi.getRackWise();        break;
        case 'dead-stock':      response = await reportApi.getDeadStock();       break;
        case 'slow-moving':     response = await reportApi.getSlowMoving();      break;
        case 'price-difference':response = await reportApi.getPriceDifference(); break;
        case 'stock-value':     response = await reportApi.getStockValue();      break;
        default:                response = await reportApi.getStockSummary();
      }
      const data = response?.data?.data ?? response?.data ?? null;
      setReportData(data);
    } catch (error) {
      const msg = error?.response?.status === 403
        ? 'Access denied. Owner role required for this report.'
        : 'Failed to load report. Please try again.';
      toast.error(msg);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (index) =>
    setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));

  const reportTabs = [
    { id: 'stock-summary',    label: 'Stock Summary',    icon: <FiBarChart2 /> },
    { id: 'category-wise',   label: 'Category Wise',    icon: <FiGrid /> },
    { id: 'rack-wise',       label: 'Rack Wise',        icon: <FiBox /> },
    { id: 'dead-stock',      label: 'Dead Stock',       icon: <FiTrendingDown /> },
    { id: 'slow-moving',     label: 'Slow Moving',      icon: <FiAlertTriangle /> },
    { id: 'price-difference',label: 'Price Difference', icon: <FiDollarSign /> },
    { id: 'stock-value',     label: 'Stock Value',      icon: <FiDollarSign /> },
  ];

  // ============================================================
  // STOCK SUMMARY
  // Backend: totalProducts, inStock, lowStock, outOfStock, products[]
  // ============================================================
  const renderStockSummary = () => {
    const data = reportData;
    if (!data) return <div className="empty-report"><h3>No data available</h3></div>;
    return (
      <div className="report-section">
        <h3>Stock Summary</h3>
        <div className="summary-grid">
          <div className="summary-card blue"><FiPackage size={24} /><h4>{data.totalProducts ?? 0}</h4><p>Total Products</p></div>
          <div className="summary-card green"><FiCheckCircle size={24} /><h4>{data.inStock ?? 0}</h4><p>In Stock</p></div>
          <div className="summary-card yellow"><FiAlertTriangle size={24} /><h4>{data.lowStock ?? 0}</h4><p>Low Stock</p></div>
          <div className="summary-card red"><FiTrendingDown size={24} /><h4>{data.outOfStock ?? 0}</h4><p>Out of Stock</p></div>
        </div>
        {Array.isArray(data.products) && data.products.length > 0 && (
          <div className="table-container">
            <table className="report-table">
              <thead><tr><th>Part Number</th><th>Description</th><th>Category</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {data.products.map((item, i) => (
                  <tr key={i}>
                    <td><strong>{item.partNumber ?? 'N/A'}</strong></td>
                    <td>{item.description ?? ''}</td>
                    <td>{item.categoryName ?? 'Uncategorized'}</td>
                    <td>{parseFloat(item.totalStock ?? 0).toFixed(2)}</td>
                    <td><span className={`status-badge ${(item.status ?? '').toLowerCase().replace(/\s+/g, '-')}`}>{item.status ?? 'Unknown'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // CATEGORY WISE
  // Backend: categoryName, totalProducts, totalStock, totalValue
  // ============================================================
  const renderCategoryWise = () => {
    const data = Array.isArray(reportData) ? reportData : [];
    if (data.length === 0) return <div className="empty-report"><h3>No category data available</h3></div>;
    const totals = data.reduce((acc, item) => ({
      products: acc.products + parseInt(item.totalProducts ?? 0),
      stock:    acc.stock    + parseFloat(item.totalStock ?? 0),
      value:    acc.value    + parseFloat(item.totalValue ?? 0),
    }), { products: 0, stock: 0, value: 0 });
    return (
      <div className="report-section">
        <h3>Category-wise Stock Report</h3>
        <div className="table-container">
          <table className="report-table">
            <thead><tr><th>Category</th><th>Products</th><th>Total Stock</th><th>Total Value</th></tr></thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i}>
                  <td><strong>{item.categoryName ?? 'Unknown'}</strong></td>
                  <td>{item.totalProducts ?? 0}</td>
                  <td>{parseFloat(item.totalStock ?? 0).toFixed(2)}</td>
                  <td className="price">₹{parseFloat(item.totalValue ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{totals.products}</strong></td>
                <td><strong>{totals.stock.toFixed(2)}</strong></td>
                <td className="price"><strong>₹{totals.value.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // RACK WISE
  // Backend: rackNumber, rackName, totalItems, totalStock, totalValue
  // ============================================================
  const renderRackWise = () => {
    const data = Array.isArray(reportData) ? reportData : [];
    if (data.length === 0) return <div className="empty-report"><h3>No rack data available</h3></div>;
    return (
      <div className="report-section">
        <h3>Rack-wise Stock Report</h3>
        <div className="table-container">
          <table className="report-table">
            <thead><tr><th>Rack No.</th><th>Rack Name</th><th>Total Items</th><th>Total Stock</th><th>Total Value</th></tr></thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i}>
                  <td><strong>{item.rackNumber ?? 'N/A'}</strong></td>
                  <td>{item.rackName ?? ''}</td>
                  <td>{item.totalItems ?? 0}</td>
                  <td>{parseFloat(item.totalStock ?? 0).toFixed(2)}</td>
                  <td className="price">₹{parseFloat(item.totalValue ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // DEAD STOCK  (threshold: 3 months current | 6 months future)
  // Backend flat keys: partNumber, description, lotNumber,
  //   remainingQuantity, purchasePrice, blockedValue,
  //   monthsNoMovement, supplierName, rackNumber, boxNumber
  // ============================================================
  const renderLotStockTable = (data, variant) => {
    const totalBlockedValue = data.reduce((sum, item) => sum + parseFloat(item.blockedValue ?? 0), 0);
    const isDanger = variant === 'danger';

    return (
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Description</th>
              <th>Category</th>
              <th>Lot No.</th>
              <th>Rack / Box</th>
              <th>Remaining Qty</th>
              <th>Purchase Price</th>
              <th>Blocked Value</th>
              <th>Months Inactive</th>
              <th>Supplier</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i}>
                <td><strong>{item.partNumber ?? 'N/A'}</strong></td>
                <td><small>{item.description ?? ''}</small></td>
                <td>{item.categoryName ?? '—'}</td>
                <td><span className="lot-badge">{item.lotNumber ?? 'N/A'}</span></td>
                <td>{item.rackNumber ?? '—'} / {item.boxNumber ?? '—'}</td>
                <td>{parseFloat(item.remainingQuantity ?? 0).toFixed(2)}</td>
                <td className="price">₹{parseFloat(item.purchasePrice ?? 0).toFixed(2)}</td>
                <td className={`price ${variant}`}>₹{parseFloat(item.blockedValue ?? 0).toFixed(2)}</td>
                <td><span className={`months-badge ${variant}`}>{item.monthsNoMovement ?? 0} mo</span></td>
                <td>{item.supplierName ?? 'Unknown'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}><strong>Total Blocked Value</strong></td>
              <td className={`price ${variant}`}><strong>₹{totalBlockedValue.toFixed(2)}</strong></td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderDeadStock = () => {
    const data = Array.isArray(reportData) ? reportData : [];
    if (data.length === 0)
      return (
        <div className="empty-report success">
          <FiCheckCircle size={64} />
          <h3>No Dead Stock Found</h3>
          <p>All stock has had recent movement. Great inventory management!</p>
        </div>
      );
    const totalBlocked = data.reduce((s, i) => s + parseFloat(i.blockedValue ?? 0), 0);
    return (
      <div className="report-section">
        <h3>Dead Stock Report <span className="report-subtitle">(No movement for 3+ months)</span></h3>
        <div className="report-alert danger">
          <FiAlertTriangle />
          <span>{data.length} lot{data.length !== 1 ? 's' : ''} inactive 3+ months — Total blocked: <strong>₹{totalBlocked.toFixed(2)}</strong></span>
        </div>
        {renderLotStockTable(data, 'danger')}
      </div>
    );
  };

  const renderSlowMoving = () => {
    const data = Array.isArray(reportData) ? reportData : [];
    if (data.length === 0)
      return (
        <div className="empty-report success">
          <FiCheckCircle size={64} />
          <h3>No Slow Moving Stock</h3>
          <p>All stock is actively moving. Well done!</p>
        </div>
      );
    const totalBlocked = data.reduce((s, i) => s + parseFloat(i.blockedValue ?? 0), 0);
    return (
      <div className="report-section">
        <h3>Slow Moving Stock <span className="report-subtitle">(No movement for 1–3 months)</span></h3>
        <div className="report-alert warning">
          <FiAlertTriangle />
          <span>{data.length} lot{data.length !== 1 ? 's' : ''} inactive 1–3 months — Value at risk: <strong>₹{totalBlocked.toFixed(2)}</strong></span>
        </div>
        {renderLotStockTable(data, 'warning')}
      </div>
    );
  };

  // ============================================================
  // PRICE DIFFERENCE
  // Backend keys: partNumber, description, categoryName,
  //   overallMinPrice, overallMaxPrice, overallDifference,
  //   overallDifferencePercent, varianceType, supplierCount,
  //   totalLots, sameSupplierVariations[], lotDetails[]
  //
  // varianceType: "Cross-Supplier" | "Same-Supplier Price Change" | "Both"
  // ============================================================
  const renderPriceDifference = () => {
    const data = Array.isArray(reportData) ? reportData : [];
    if (data.length === 0)
      return (
        <div className="empty-report success">
          <FiCheckCircle size={64} />
          <h3>No Price Differences Found</h3>
          <p>All products purchased at consistent prices.</p>
        </div>
      );

    return (
      <div className="report-section">
        <h3>Price Difference Report</h3>
        <p className="report-desc">
          Flags two cases: <strong>Cross-Supplier</strong> (same part, different vendors at different cost) and
          <strong> Same-Supplier Price Change</strong> (same vendor charged differently over time).
        </p>

        <div className="table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th></th>
                <th>Part Number</th>
                <th>Description</th>
                <th>Category</th>
                <th>Variance Type</th>
                <th>Suppliers</th>
                <th>Min Price</th>
                <th>Max Price</th>
                <th>Difference</th>
                <th>Diff %</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const diffPct   = parseFloat(item.overallDifferencePercent ?? 0);
                const isHigh    = diffPct > 10;
                const isExpanded = expandedRows[index];

                return (
                  <React.Fragment key={index}>
                    {/* Main row */}
                    <tr
                      className="expandable-row"
                      onClick={() => toggleRow(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                      </td>
                      <td><strong>{item.partNumber ?? 'N/A'}</strong></td>
                      <td><small>{item.description ?? ''}</small></td>
                      <td>{item.categoryName ?? '—'}</td>
                      <td>
                        <span className={`variance-badge ${
                          item.varianceType === 'Both' ? 'danger'
                          : item.varianceType === 'Cross-Supplier' ? 'warning'
                          : 'info'
                        }`}>
                          {item.varianceType ?? '—'}
                        </span>
                      </td>
                      <td>{item.supplierCount ?? 1}</td>
                      <td className="price">₹{parseFloat(item.overallMinPrice ?? 0).toFixed(2)}</td>
                      <td className="price">₹{parseFloat(item.overallMaxPrice ?? 0).toFixed(2)}</td>
                      <td className="price danger">₹{parseFloat(item.overallDifference ?? 0).toFixed(2)}</td>
                      <td>
                        <span className={`pct-badge ${isHigh ? 'danger' : 'warning'}`}>
                          {diffPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>

                    {/* Expanded: same-supplier variations + all lot details */}
                    {isExpanded && (
                      <tr className="expanded-detail-row">
                        <td colSpan={10}>
                          <div className="expanded-content">

                            {/* CASE B: Same-supplier variations */}
                            {Array.isArray(item.sameSupplierVariations) &&
                              item.sameSupplierVariations.length > 0 && (
                              <div className="sub-section">
                                <h5>⚠ Same-Supplier Price Changes</h5>
                                <table className="report-table sub-table">
                                  <thead>
                                    <tr>
                                      <th>Supplier</th>
                                      <th>Lots</th>
                                      <th>Min Price</th>
                                      <th>Max Price</th>
                                      <th>Difference</th>
                                      <th>Diff %</th>
                                      <th>First Purchase</th>
                                      <th>Last Purchase</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.sameSupplierVariations.map((sv, si) => (
                                      <tr key={si}>
                                        <td><strong>{sv.supplierName}</strong></td>
                                        <td>{sv.lotCount}</td>
                                        <td className="price">₹{parseFloat(sv.minPrice ?? 0).toFixed(2)}</td>
                                        <td className="price">₹{parseFloat(sv.maxPrice ?? 0).toFixed(2)}</td>
                                        <td className="price danger">₹{parseFloat(sv.difference ?? 0).toFixed(2)}</td>
                                        <td>
                                          <span className={`pct-badge ${parseFloat(sv.differencePercent ?? 0) > 10 ? 'danger' : 'warning'}`}>
                                            {parseFloat(sv.differencePercent ?? 0).toFixed(1)}%
                                          </span>
                                        </td>
                                        <td>{sv.oldestDate ?? '—'}</td>
                                        <td>{sv.newestDate ?? '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* All lot details */}
                            {Array.isArray(item.lotDetails) && item.lotDetails.length > 0 && (
                              <div className="sub-section">
                                <h5>All Lots for this Product</h5>
                                <table className="report-table sub-table">
                                  <thead>
                                    <tr>
                                      <th>Lot No.</th>
                                      <th>Supplier</th>
                                      <th>Purchase Date</th>
                                      <th>Purchase Price</th>
                                      <th>Remaining Qty</th>
                                      <th>Rack</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.lotDetails.map((lot, li) => (
                                      <tr key={li}>
                                        <td><span className="lot-badge">{lot.lotNumber}</span></td>
                                        <td>{lot.supplierName}</td>
                                        <td>{lot.purchaseDate ?? '—'}</td>
                                        <td className="price">₹{parseFloat(lot.purchasePrice ?? 0).toFixed(2)}</td>
                                        <td>{parseFloat(lot.remainingQty ?? 0).toFixed(2)}</td>
                                        <td>{lot.rackNumber ?? '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // STOCK VALUE
  // Backend: totalProducts, totalStockValue, totalQuantity,
  //          averagePrice, categoryBreakdown[]
  // ============================================================
  const renderStockValue = () => {
    const data = reportData;
    if (!data) return <div className="empty-report"><h3>No stock value data</h3></div>;
    return (
      <div className="report-section">
        <h3>Stock Value Report</h3>
        <div className="summary-grid">
          <div className="summary-card blue"><FiPackage size={24} /><h4>{data.totalProducts ?? 0}</h4><p>Total Products</p></div>
          <div className="summary-card green"><FiDollarSign size={24} /><h4>₹{parseFloat(data.totalStockValue ?? 0).toFixed(2)}</h4><p>Total Stock Value</p></div>
          <div className="summary-card yellow"><FiBox size={24} /><h4>{parseFloat(data.totalQuantity ?? 0).toFixed(2)}</h4><p>Total Quantity</p></div>
          <div className="summary-card purple"><FiBarChart2 size={24} /><h4>₹{parseFloat(data.averagePrice ?? 0).toFixed(2)}</h4><p>Average Price</p></div>
        </div>
        {Array.isArray(data.categoryBreakdown) && data.categoryBreakdown.length > 0 && (
          <div className="table-container" style={{ marginTop: 20 }}>
            <h4>Category-wise Value Breakdown</h4>
            <table className="report-table">
              <thead><tr><th>Category</th><th>Products</th><th>Total Quantity</th><th>Total Value</th><th>% of Total</th></tr></thead>
              <tbody>
                {data.categoryBreakdown.map((item, i) => (
                  <tr key={i}>
                    <td><strong>{item.categoryName ?? 'Unknown'}</strong></td>
                    <td>{item.productCount ?? 0}</td>
                    <td>{parseFloat(item.totalQuantity ?? 0).toFixed(2)}</td>
                    <td className="price">₹{parseFloat(item.totalValue ?? 0).toFixed(2)}</td>
                    <td>{item.percentage ?? '0'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderReport = () => {
    if (loading) return <div className="loading-state">Loading report...</div>;
    if (!reportData) return (
      <div className="empty-report">
        <FiBarChart2 size={64} />
        <h3>No Data Available</h3>
        <p>Select a report type to view data</p>
      </div>
    );
    switch (activeReport) {
      case 'stock-summary':    return renderStockSummary();
      case 'category-wise':   return renderCategoryWise();
      case 'rack-wise':       return renderRackWise();
      case 'dead-stock':      return renderDeadStock();
      case 'slow-moving':     return renderSlowMoving();
      case 'price-difference':return renderPriceDifference();
      case 'stock-value':     return renderStockValue();
      default:                return renderStockSummary();
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <button className="btn btn-primary" onClick={() => toast.info('Export functionality coming soon')}>
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
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card report-content">{renderReport()}</div>
    </div>
  );
};

export default Reports;