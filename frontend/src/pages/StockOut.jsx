import React, { useState, useEffect } from 'react';
import { stockApi } from '../api/stockApi';
import { productApi } from '../api/productApi';
import { toast } from 'react-toastify';
import { 
  FiTrendingDown, FiInfo, FiAlertTriangle, FiCheckCircle,
  FiPackage, FiLayers, FiClock, FiDollarSign, FiBox
} from 'react-icons/fi';
import './StockOut.css';

const StockOut = () => {
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    transactionType: 'Production',
    referenceNumber: '',
    notes: '',
  });

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentStock, setCurrentStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [insufficientStock, setInsufficientStock] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (formData.productId) {
      loadProductStock(formData.productId);
    } else {
      setCurrentStock(null);
      setSelectedProduct(null);
    }
  }, [formData.productId]);

  // Check if quantity exceeds available stock
  useEffect(() => {
    if (currentStock && formData.quantity) {
      const requested = parseFloat(formData.quantity);
      const available = parseFloat(currentStock.totalStock || 0);
      setInsufficientStock(requested > available);
    } else {
      setInsufficientStock(false);
    }
  }, [formData.quantity, currentStock]);

  const loadProducts = async () => {
    try {
      const response = await productApi.getActive();
      console.log('Products loaded:', response.data); // Debug log
      setProducts(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Load products error:', error);
      setProducts([]);
    }
  };

  const loadProductStock = async (productId) => {
    try {
      const response = await stockApi.getCurrentStock(productId);
      const stockData = response.data.data;
      
      setCurrentStock(stockData);
      
      const product = products.find(p => p.productId === parseInt(productId));
      setSelectedProduct(product);

      const totalStock = parseFloat(stockData?.totalStock || 0);
      if (!stockData || totalStock <= 0) {
        toast.warning('No stock available for this product!');
      }
    } catch (error) {
      console.error('Failed to load stock:', error);
      setCurrentStock(null);
      toast.error('Failed to load stock information');
    }
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    setFormData({
      ...formData,
      productId,
      quantity: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const totalStock = parseFloat(currentStock?.totalStock || 0);
    
    if (!currentStock || totalStock <= 0) {
      toast.error('No stock available for this product!');
      return;
    }

    if (parseFloat(formData.quantity) > totalStock) {
      toast.error(`Insufficient stock! Available: ${totalStock}`);
      return;
    }

    if (parseFloat(formData.quantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    setShowConfirmation(false);

    try {
      const payload = {
        productId: parseInt(formData.productId),
        quantity: parseFloat(formData.quantity),
        transactionType: formData.transactionType,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
      };

      await stockApi.stockOut(payload);
      
      toast.success('🎉 Stock issued successfully!', {
        position: 'top-center',
        autoClose: 3000,
      });
      
      resetForm();
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to issue stock';
      toast.error(errorMsg);
      console.error('Stock out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: '',
      transactionType: 'Production',
      referenceNumber: '',
      notes: '',
    });
    setSelectedProduct(null);
    setCurrentStock(null);
    setInsufficientStock(false);
  };

  const quickFillQuantity = (percentage) => {
    if (currentStock && currentStock.totalStock) {
      const available = parseFloat(currentStock.totalStock);
      const qty = (available * percentage / 100).toFixed(2);
      setFormData({ ...formData, quantity: qty });
    }
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'Sale': return '💰';
      case 'Production': return '🏭';
      case 'Damage': return '⚠️';
      case 'Scrap': return '🗑️';
      default: return '📦';
    }
  };

  // Safe helper functions
  const getCategoryName = (product) => {
    return product?.category?.categoryName || 'Uncategorized';
  };

  const getPackageDisplay = (product) => {
    return product?.packageType ? ` (${product.packageType})` : '';
  };

  return (
    <div className="stock-out-page">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-content">
          <div className="header-icon danger-gradient">
            <FiTrendingDown size={32} />
          </div>
          <div>
            <h1>Stock OUT</h1>
            <p>Issue inventory for sale, production, or other purposes</p>
          </div>
        </div>
        {currentStock && (
          <div className="header-stats">
            <div className="stat-card">
              <FiPackage className="stat-icon danger" />
              <div>
                <span className="stat-label">Available Stock</span>
                <span className="stat-value">{parseFloat(currentStock.totalStock || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stock-out-layout">
        {/* Main Form Section */}
        <div className="main-section">
          {/* Product Selection Card */}
          <div className="card-modern">
            <div className="card-header">
              <FiBox className="card-icon" />
              <h3>Select Product</h3>
            </div>
            
            <div className="product-selector">
              <select
                value={formData.productId}
                onChange={handleProductChange}
                className="select-modern"
              >
                <option value="">🔍 Search and select a product...</option>
                {products && products.length > 0 ? (
                  products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.partNumber || 'N/A'} - {product.description || 'No description'}
                      {getPackageDisplay(product)}
                      {' | '}
                      {getCategoryName(product)}
                    </option>
                  ))
                ) : (
                  <option disabled>No products available</option>
                )}
              </select>
            </div>

            {/* Stock Information Card */}
            {selectedProduct && currentStock && (
              <div className="stock-info-preview">
                <div className="preview-header-danger">
                  {parseFloat(currentStock.totalStock || 0) > 0 ? (
                    <>
                      <FiCheckCircle className="success-icon" />
                      <span>Stock Available</span>
                    </>
                  ) : (
                    <>
                      <FiAlertTriangle className="warning-icon" />
                      <span>Out of Stock</span>
                    </>
                  )}
                </div>

                <div className="preview-details">
                  <div className="preview-row">
                    <span className="preview-label">Part Number:</span>
                    <span className="preview-value">{selectedProduct.partNumber || 'N/A'}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Description:</span>
                    <span className="preview-value">{selectedProduct.description || 'N/A'}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Category:</span>
                    <span className="preview-value badge-category">
                      {getCategoryName(selectedProduct)}
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Available Stock:</span>
                    <span className={`preview-value stock-highlight ${parseFloat(currentStock.totalStock || 0) > 0 ? 'success' : 'danger'}`}>
                      {parseFloat(currentStock.totalStock || 0).toFixed(2)} units
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Min Stock Level:</span>
                    <span className="preview-value">
                      {selectedProduct.minStockLevel || 'Not set'}
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Active Lots:</span>
                    <span className="preview-value">{currentStock.lots?.length || 0}</span>
                  </div>
                </div>

                {/* FIFO Lots Breakdown */}
                {currentStock.lots && currentStock.lots.length > 0 && (
                  <div className="fifo-breakdown">
                    <div className="fifo-header">
                      <FiLayers className="fifo-icon" />
                      <h4>Stock Breakdown (FIFO Order)</h4>
                    </div>
                    <div className="fifo-list">
                      {currentStock.lots.map((lot, index) => (
                        <div key={lot.lotId} className="fifo-item">
                          <div className="fifo-badge">#{index + 1}</div>
                          <div className="fifo-details">
                            <div className="fifo-row">
                              <span className="fifo-label">Lot:</span>
                              <span className="fifo-value">{lot.lotNumber || 'N/A'}</span>
                            </div>
                            <div className="fifo-row">
                              <span className="fifo-label">Qty:</span>
                              <span className="fifo-value">{parseFloat(lot.remainingQuantity || 0).toFixed(2)}</span>
                            </div>
                            <div className="fifo-row">
                              <span className="fifo-label">Price:</span>
                              <span className="fifo-value price">₹{parseFloat(lot.purchasePrice || 0).toFixed(2)}</span>
                            </div>
                            <div className="fifo-row">
                              <span className="fifo-label">Date:</span>
                              <span className="fifo-value date">
                                {lot.purchaseDate ? new Date(lot.purchaseDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Issue Stock Form */}
          {selectedProduct && currentStock && parseFloat(currentStock.totalStock || 0) > 0 && (
            <form onSubmit={handleSubmit}>
              <div className="card-modern">
                <div className="card-header">
                  <FiTrendingDown className="card-icon" />
                  <h3>Issue Details</h3>
                </div>

                <div className="form-section">
                  {/* Quantity Input */}
                  <div className="input-group-modern">
                    <label>
                      <FiBox className="label-icon" />
                      Quantity to Issue *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Enter quantity"
                      className={`input-modern ${insufficientStock ? 'input-error' : ''}`}
                      required
                      max={currentStock.totalStock}
                    />
                    
                    {/* Quick Fill Buttons */}
                    <div className="quick-actions">
                      <button type="button" onClick={() => quickFillQuantity(25)} className="btn-quick">25%</button>
                      <button type="button" onClick={() => quickFillQuantity(50)} className="btn-quick">50%</button>
                      <button type="button" onClick={() => quickFillQuantity(75)} className="btn-quick">75%</button>
                      <button type="button" onClick={() => quickFillQuantity(100)} className="btn-quick">All</button>
                    </div>

                    {/* Stock Status */}
                    <div className={`stock-status ${insufficientStock ? 'error' : 'success'}`}>
                      {insufficientStock ? (
                        <>
                          <FiAlertTriangle size={14} />
                          <span>Insufficient stock! Available: {parseFloat(currentStock.totalStock || 0).toFixed(2)}</span>
                        </>
                      ) : formData.quantity ? (
                        <>
                          <FiCheckCircle size={14} />
                          <span>Available: {parseFloat(currentStock.totalStock || 0).toFixed(2)} units</span>
                        </>
                      ) : (
                        <>
                          <FiInfo size={14} />
                          <span>Max available: {parseFloat(currentStock.totalStock || 0).toFixed(2)} units</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Transaction Type */}
                  <div className="input-group-modern">
                    <label>
                      <FiLayers className="label-icon" />
                      Transaction Type *
                    </label>
                    <div className="transaction-types">
                      {['Production', 'Sale', 'Damage', 'Scrap'].map((type) => (
                        <label key={type} className={`transaction-option ${formData.transactionType === type ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="transactionType"
                            value={type}
                            checked={formData.transactionType === type}
                            onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                          />
                          <span className="option-icon">{getTransactionIcon(type)}</span>
                          <span className="option-text">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Reference Number */}
                  <div className="input-group-modern">
                    <label>
                      <FiClock className="label-icon" />
                      Work Order / Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="e.g., WO-001, SO-123"
                      className="input-modern"
                    />
                  </div>

                  {/* Notes */}
                  <div className="input-group-modern">
                    <label>
                      <FiInfo className="label-icon" />
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes (optional)"
                      className="textarea-modern"
                      rows="3"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions-modern">
                  <button type="button" onClick={resetForm} className="btn-secondary-modern">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-danger-modern" 
                    disabled={loading || insufficientStock || !formData.quantity}
                  >
                    {loading ? 'Issuing Stock...' : 'Issue Stock'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="sidebar-section">
          {/* Quick Info */}
          <div className="card-modern info-card">
            <div className="card-header">
              <FiInfo className="card-icon" />
              <h3>How It Works</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <div className="info-number danger">1</div>
                <div className="info-text">
                  <strong>Select Product</strong>
                  <span>Choose product to issue</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-number danger">2</div>
                <div className="info-text">
                  <strong>Check Stock</strong>
                  <span>View available quantity</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-number danger">3</div>
                <div className="info-text">
                  <strong>Enter Quantity</strong>
                  <span>Specify amount to issue</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-number danger">4</div>
                <div className="info-text">
                  <strong>FIFO Applied</strong>
                  <span>Oldest stock used first</span>
                </div>
              </div>
            </div>
          </div>

          {/* FIFO Info */}
          <div className="card-modern warning-card">
            <div className="card-header">
              <FiAlertTriangle className="card-icon" />
              <h3>FIFO System</h3>
            </div>
            <div className="warning-content">
              <p><strong>First In, First Out</strong></p>
              <ul>
                <li>Oldest stock issued first automatically</li>
                <li>Multiple lots used if needed</li>
                <li>Prevents stock expiry</li>
                <li>Accurate cost tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedProduct && currentStock && (
        <div className="modal-overlay-modern" onClick={() => setShowConfirmation(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-modern danger">
              <FiTrendingDown size={48} />
            </div>
            <h3>Confirm Stock Issue</h3>
            <div className="confirmation-details">
              <p><strong>Product:</strong> {selectedProduct.partNumber} - {selectedProduct.description}</p>
              <p><strong>Quantity:</strong> {formData.quantity} units</p>
              <p><strong>Transaction:</strong> {formData.transactionType}</p>
              <p><strong>Remaining Stock:</strong> {(parseFloat(currentStock.totalStock || 0) - parseFloat(formData.quantity)).toFixed(2)} units</p>
              {formData.referenceNumber && (
                <p><strong>Reference:</strong> {formData.referenceNumber}</p>
              )}
            </div>
            <div className="modal-warning">
              <FiAlertTriangle size={16} />
              <span>This action will reduce stock using FIFO method</span>
            </div>
            <div className="modal-actions-modern">
              <button onClick={() => setShowConfirmation(false)} className="btn-secondary-modern">
                Cancel
              </button>
              <button onClick={confirmSubmit} className="btn-danger-modern">
                Confirm & Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockOut;