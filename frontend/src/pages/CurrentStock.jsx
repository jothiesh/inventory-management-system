import React, { useState, useEffect } from 'react';
import { productApi } from '../api/productApi';
import { stockApi } from '../api/stockApi';
import { toast } from 'react-toastify';
import { 
  FiLayers, FiSearch, FiEye, FiPackage, FiAlertTriangle, 
  FiCheckCircle, FiXCircle, FiTrendingUp, FiBox, FiBarChart2
} from 'react-icons/fi';
import StockDetailsModal from '../components/stock/StockDetailsModal';
import './CurrentStock.css';

const CurrentStock = () => {
  const [products, setProducts] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadCurrentStock();
  }, []);

  const loadCurrentStock = async () => {
    try {
      setLoading(true);
      const response = await productApi.getActive();
      const productsData = response.data.data || [];
      setProducts(productsData);

      // Load stock for each product
      const stockPromises = productsData.map(async (product) => {
        try {
          const stockRes = await stockApi.getCurrentStock(product.productId);
          return {
            product,
            totalStock: parseFloat(stockRes.data.data?.totalStock || 0),
            lots: stockRes.data.data?.lots || [],
          };
        } catch (error) {
          console.error(`Failed to load stock for product ${product.productId}:`, error);
          return {
            product,
            totalStock: 0,
            lots: [],
          };
        }
      });

      const stockResults = await Promise.all(stockPromises);
      setStockData(stockResults);
      toast.success('Stock data loaded successfully!');
    } catch (error) {
      toast.error('Failed to load stock data');
      console.error('Load stock error:', error);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item) => {
    setSelectedProduct(item);
    setShowModal(true);
  };

  const getStockStatus = (stock, product) => {
    if (stock === 0) {
      return { label: 'Out of Stock', class: 'danger', icon: FiXCircle };
    }
    if (product.minStockLevel && stock <= parseFloat(product.minStockLevel)) {
      return { label: 'Low Stock', class: 'warning', icon: FiAlertTriangle };
    }
    return { label: 'In Stock', class: 'success', icon: FiCheckCircle };
  };

  // Safe helper to get category name
  const getCategoryName = (product) => {
    return product?.category?.categoryName || 'Uncategorized';
  };

  // Filter stock data
  const getFilteredStock = () => {
    let filtered = stockData;

    // Apply search filter
    if (searchKeyword) {
      filtered = filtered.filter(item => {
        const product = item.product;
        const searchLower = searchKeyword.toLowerCase();
        return (
          product.partNumber?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          getCategoryName(product).toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        const status = getStockStatus(item.totalStock, item.product);
        switch(filterStatus) {
          case 'in-stock':
            return status.class === 'success';
          case 'low-stock':
            return status.class === 'warning';
          case 'out-of-stock':
            return status.class === 'danger';
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const filteredStock = getFilteredStock();

  // Calculate statistics
  const stats = {
    total: stockData.length,
    inStock: stockData.filter(item => item.totalStock > 0).length,
    outOfStock: stockData.filter(item => item.totalStock === 0).length,
    lowStock: stockData.filter(item => {
      const product = item.product;
      return product.minStockLevel && 
             item.totalStock > 0 && 
             item.totalStock <= parseFloat(product.minStockLevel);
    }).length,
    totalValue: stockData.reduce((sum, item) => {
      const avgPrice = item.lots.length > 0 
        ? item.lots.reduce((s, lot) => s + parseFloat(lot.purchasePrice || 0), 0) / item.lots.length
        : 0;
      return sum + (item.totalStock * avgPrice);
    }, 0)
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="current-stock-page">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-content">
          <div className="header-icon info-gradient">
            <FiPackage size={32} />
          </div>
          <div>
            <h1>Current Stock</h1>
            <p>Real-time inventory levels across all products</p>
          </div>
        </div>
        <button className="btn-refresh" onClick={loadCurrentStock}>
          <FiTrendingUp /> Refresh Stock
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card-modern primary">
          <div className="stat-icon-wrapper">
            <FiLayers size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Products</span>
          </div>
        </div>

        <div className="stat-card-modern success">
          <div className="stat-icon-wrapper">
            <FiCheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.inStock}</span>
            <span className="stat-label">In Stock</span>
          </div>
        </div>

        <div className="stat-card-modern warning">
          <div className="stat-icon-wrapper">
            <FiAlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.lowStock}</span>
            <span className="stat-label">Low Stock</span>
          </div>
        </div>

        <div className="stat-card-modern danger">
          <div className="stat-icon-wrapper">
            <FiXCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.outOfStock}</span>
            <span className="stat-label">Out of Stock</span>
          </div>
        </div>

        <div className="stat-card-modern info">
          <div className="stat-icon-wrapper">
            <FiBarChart2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">₹{stats.totalValue.toFixed(0)}</span>
            <span className="stat-label">Total Value</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-modern">
        <div className="filters-section">
          {/* Search */}
          <div className="search-box-modern">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by part number, description, or category..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="search-input-modern"
            />
          </div>

          {/* Status Filter */}
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({stockData.length})
            </button>
            <button 
              className={`filter-btn success ${filterStatus === 'in-stock' ? 'active' : ''}`}
              onClick={() => setFilterStatus('in-stock')}
            >
              <FiCheckCircle size={16} /> In Stock ({stats.inStock})
            </button>
            <button 
              className={`filter-btn warning ${filterStatus === 'low-stock' ? 'active' : ''}`}
              onClick={() => setFilterStatus('low-stock')}
            >
              <FiAlertTriangle size={16} /> Low Stock ({stats.lowStock})
            </button>
            <button 
              className={`filter-btn danger ${filterStatus === 'out-of-stock' ? 'active' : ''}`}
              onClick={() => setFilterStatus('out-of-stock')}
            >
              <FiXCircle size={16} /> Out of Stock ({stats.outOfStock})
            </button>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="card-modern">
        <div className="table-header">
          <h3>
            <FiBox className="section-icon" />
            Stock Overview
          </h3>
          <span className="result-count">
            {filteredStock.length} {filteredStock.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        <div className="table-container-modern">
          {filteredStock.length === 0 ? (
            <div className="empty-state-modern">
              <FiPackage size={48} />
              <h3>No Products Found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Package</th>
                  <th className="text-right">Current Stock</th>
                  <th className="text-center">Lots</th>
                  <th className="text-right">Min Level</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => {
                  const status = getStockStatus(item.totalStock, item.product);
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={item.product.productId} className="table-row-hover">
                      <td>
                        <span className="part-number-cell">
                          {item.product.partNumber || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="description-cell">
                          {item.product.description || 'No description'}
                        </span>
                      </td>
                      <td>
                        <span className="badge-category-small">
                          {getCategoryName(item.product)}  {/* ✅ SAFE */}
                        </span>
                      </td>
                      <td>
                        <span className="package-cell">
                          {item.product.packageType || '-'}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={`stock-quantity-badge ${status.class}`}>
                          {item.totalStock.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="lots-badge">
                          {item.lots.length}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="min-level-cell">
                          {item.product.minStockLevel || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${status.class}`}>
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn-action"
                          onClick={() => handleViewDetails(item)}
                          title="View Details"
                        >
                          <FiEye size={16} />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedProduct && (
        <StockDetailsModal
          productStock={selectedProduct}
          onClose={() => {
            setShowModal(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default CurrentStock;