import React, { useState, useEffect } from 'react';
import { stockApi } from '../api/stockApi';
import { productApi } from '../api/productApi';
import { supplierApi } from '../api/supplierApi';
import { rackApi } from '../api/rackApi';
import { boxApi } from '../api/boxApi';
import { toast } from 'react-toastify';
import { 
  FiPackage, FiInfo, FiDollarSign, FiMapPin, 
  FiCalendar, FiFileText, FiCheckCircle, FiAlertCircle,
  FiTrendingUp, FiBox, FiShoppingCart
} from 'react-icons/fi';
import './StockIn.css';

const StockIn = () => {
  const [formData, setFormData] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    rackId: '',
    boxId: '',
    referenceNumber: '',
    notes: '',
  });

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [racks, setRacks] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [recentStockIns, setRecentStockIns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    loadData();
    loadRecentStockIns();
  }, []);

  useEffect(() => {
    if (formData.rackId) {
      loadBoxes(formData.rackId);
    }
  }, [formData.rackId]);

  // Calculate total value when quantity or price changes
  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.purchasePrice) || 0;
    setTotalValue(qty * price);
  }, [formData.quantity, formData.purchasePrice]);

  const loadData = async () => {
    try {
      const [productsRes, suppliersRes, racksRes] = await Promise.all([
        productApi.getActive(),
        supplierApi.getActive(),
        rackApi.getActive(),
      ]);
      setProducts(productsRes.data.data || []);
      setSuppliers(suppliersRes.data.data || []);
      setRacks(racksRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    }
  };

  const loadBoxes = async (rackId) => {
    try {
      const response = await boxApi.getByRack(rackId);
      setBoxes(response.data.data || []);
    } catch (error) {
      console.error('Failed to load boxes');
      setBoxes([]);
    }
  };

  const loadRecentStockIns = () => {
    // Mock data - Replace with actual API call
    const mockRecent = [
      { id: 1, product: 'C1 - 10uF', qty: 100, date: '2026-01-30', value: 250 },
      { id: 2, product: 'R1 - 10K', qty: 200, date: '2026-01-29', value: 20 },
      { id: 3, product: 'IC1 - ESP32', qty: 10, date: '2026-01-28', value: 1500 },
    ];
    setRecentStockIns(mockRecent);
  };

  const handleProductChange = async (e) => {
    const productId = e.target.value;
    
    if (!productId) {
      resetProductSelection();
      return;
    }

    const product = products.find(p => p.productId === parseInt(productId));
    
    if (product) {
      setSelectedProduct(product);

      // Auto-fill form
      const updatedFormData = {
        ...formData,
        productId: productId,
        supplierId: product.supplier?.supplierId || '',
        purchasePrice: product.unitPrice || '',
        rackId: product.rack?.rackId || '',
        boxId: product.box?.boxId || '',
      };

      setFormData(updatedFormData);

      // Load boxes if rack exists
      if (product.rack?.rackId) {
        await loadBoxes(product.rack.rackId);
      }

      toast.success(`✨ Auto-filled details for ${product.partNumber}`, {
        position: 'top-right',
        autoClose: 2000,
      });
    }
  };

  const resetProductSelection = () => {
    setFormData({
      ...formData,
      productId: '',
      supplierId: '',
      purchasePrice: '',
      rackId: '',
      boxId: '',
    });
    setSelectedProduct(null);
    setBoxes([]);
    setTotalValue(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.productId) {
      toast.error('Please select a product');
      return;
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      toast.error('Please enter a valid purchase price');
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
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
        quantity: parseFloat(formData.quantity),
        purchasePrice: parseFloat(formData.purchasePrice),
        purchaseDate: formData.purchaseDate,
        rackId: parseInt(formData.rackId),
        boxId: parseInt(formData.boxId),
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
      };

      await stockApi.stockIn(payload);
      
      toast.success('🎉 Stock added successfully!', {
        position: 'top-center',
        autoClose: 3000,
      });
      
      // Reset form
      resetForm();
      loadRecentStockIns();
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add stock');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      supplierId: '',
      quantity: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      rackId: '',
      boxId: '',
      referenceNumber: '',
      notes: '',
    });
    setSelectedProduct(null);
    setBoxes([]);
    setTotalValue(0);
  };

  const quickFillQuantity = (qty) => {
    setFormData({ ...formData, quantity: qty });
  };

  return (
    <div className="stock-in-page">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-content">
          <div className="header-icon">
            <FiShoppingCart size={32} />
          </div>
          <div>
            <h1>Stock IN</h1>
            <p>Add inventory through purchase or receiving</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <FiTrendingUp className="stat-icon" />
            <div>
              <span className="stat-label">Recent Additions</span>
              <span className="stat-value">{recentStockIns.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stock-in-layout">
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
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.partNumber} - {product.description} 
                    {product.packageType && ` (${product.packageType})`}
                    {product.category?.categoryName && ` | ${product.category.categoryName}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Product Preview */}
            {selectedProduct && (
              <div className="product-preview">
                <div className="preview-header">
                  <FiCheckCircle className="success-icon" />
                  <span>Product Selected</span>
                </div>
                <div className="preview-details">
                  <div className="preview-row">
                    <span className="preview-label">Part Number:</span>
                    <span className="preview-value">{selectedProduct.partNumber}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Description:</span>
                    <span className="preview-value">{selectedProduct.description}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Category:</span>
                    <span className="preview-value badge-category">
                      {selectedProduct.category?.categoryName || 'N/A'}
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Current Price:</span>
                    <span className="preview-value price-highlight">
                      ₹{selectedProduct.unitPrice?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Min Stock Level:</span>
                    <span className="preview-value">{selectedProduct.minStockLevel || 'Not set'}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Location:</span>
                    <span className="preview-value">
                      {selectedProduct.rack?.rackName || 'N/A'} / {selectedProduct.box?.boxLabel || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock Details Form */}
          {selectedProduct && (
            <form onSubmit={handleSubmit}>
              <div className="card-modern">
                <div className="card-header">
                  <FiPackage className="card-icon" />
                  <h3>Stock Details</h3>
                </div>

                <div className="form-section">
                  {/* Quantity Input */}
                  <div className="input-group-modern">
                    <label>
                      <FiBox className="label-icon" />
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Enter quantity"
                      className="input-modern"
                      required
                    />
                    <div className="quick-actions">
                      <button type="button" onClick={() => quickFillQuantity('10')} className="btn-quick">10</button>
                      <button type="button" onClick={() => quickFillQuantity('50')} className="btn-quick">50</button>
                      <button type="button" onClick={() => quickFillQuantity('100')} className="btn-quick">100</button>
                      <button type="button" onClick={() => quickFillQuantity('500')} className="btn-quick">500</button>
                    </div>
                  </div>

                  {/* Price Input */}
                  <div className="input-group-modern">
                    <label>
                      <FiDollarSign className="label-icon" />
                      Purchase Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      placeholder="Enter purchase price"
                      className="input-modern"
                      required
                    />
                    {selectedProduct.unitPrice && formData.purchasePrice && 
                     parseFloat(formData.purchasePrice) !== parseFloat(selectedProduct.unitPrice) && (
                      <div className="price-alert">
                        <FiAlertCircle size={14} />
                        <span>
                          Price differs from product price (₹{selectedProduct.unitPrice?.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total Value Display */}
                  {formData.quantity && formData.purchasePrice && (
                    <div className="total-value-display">
                      <span className="total-label">Total Value:</span>
                      <span className="total-amount">₹{totalValue.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Date Input */}
                  <div className="input-group-modern">
                    <label>
                      <FiCalendar className="label-icon" />
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="input-modern"
                      required
                    />
                  </div>

                  {/* Supplier */}
                  <div className="input-group-modern">
                    <label>
                      <FiShoppingCart className="label-icon" />
                      Supplier
                    </label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      className="select-modern"
                    >
                      <option value="">Select Supplier (Optional)</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.supplierId} value={supplier.supplierId}>
                          {supplier.supplierName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div className="location-grid">
                    <div className="input-group-modern">
                      <label>
                        <FiMapPin className="label-icon" />
                        Rack *
                      </label>
                      <select
                        value={formData.rackId}
                        onChange={(e) => setFormData({ ...formData, rackId: e.target.value, boxId: '' })}
                        className="select-modern"
                        required
                      >
                        <option value="">Select Rack</option>
                        {racks.map((rack) => (
                          <option key={rack.rackId} value={rack.rackId}>
                            {rack.rackNumber} - {rack.rackName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group-modern">
                      <label>
                        <FiBox className="label-icon" />
                        Box *
                      </label>
                      <select
                        value={formData.boxId}
                        onChange={(e) => setFormData({ ...formData, boxId: e.target.value })}
                        className="select-modern"
                        required
                        disabled={!formData.rackId}
                      >
                        <option value="">Select Box</option>
                        {boxes.map((box) => (
                          <option key={box.boxId} value={box.boxId}>
                            {box.boxNumber} - {box.boxLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reference Number */}
                  <div className="input-group-modern">
                    <label>
                      <FiFileText className="label-icon" />
                      Invoice/Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="e.g., INV-001, PO-123"
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
                  <button type="submit" className="btn-primary-modern" disabled={loading}>
                    {loading ? 'Adding Stock...' : 'Add Stock'}
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
              <h3>Quick Guide</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <div className="info-number">1</div>
                <div className="info-text">
                  <strong>Select Product</strong>
                  <span>Choose from existing products</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-number">2</div>
                <div className="info-text">
                  <strong>Auto-Fill</strong>
                  <span>Details filled automatically</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-number">3</div>
                <div className="info-text">
                  <strong>Enter Quantity</strong>
                  <span>Specify units received</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-number">4</div>
                <div className="info-text">
                  <strong>Submit</strong>
                  <span>Stock added instantly</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card-modern">
            <div className="card-header">
              <FiTrendingUp className="card-icon" />
              <h3>Recent Stock IN</h3>
            </div>
            <div className="recent-list">
              {recentStockIns.map((item) => (
                <div key={item.id} className="recent-item">
                  <div className="recent-icon">
                    <FiPackage size={16} />
                  </div>
                  <div className="recent-details">
                    <span className="recent-product">{item.product}</span>
                    <span className="recent-meta">
                      {item.qty} units • ₹{item.value}
                    </span>
                    <span className="recent-date">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="modal-overlay-modern" onClick={() => setShowConfirmation(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-modern">
              <FiCheckCircle size={48} />
            </div>
            <h3>Confirm Stock Addition</h3>
            <div className="confirmation-details">
              <p><strong>Product:</strong> {selectedProduct?.partNumber} - {selectedProduct?.description}</p>
              <p><strong>Quantity:</strong> {formData.quantity} units</p>
              <p><strong>Price:</strong> ₹{formData.purchasePrice} per unit</p>
              <p><strong>Total Value:</strong> ₹{totalValue.toFixed(2)}</p>
              <p><strong>Location:</strong> {racks.find(r => r.rackId === parseInt(formData.rackId))?.rackName} / {boxes.find(b => b.boxId === parseInt(formData.boxId))?.boxLabel}</p>
            </div>
            <div className="modal-actions-modern">
              <button onClick={() => setShowConfirmation(false)} className="btn-secondary-modern">
                Cancel
              </button>
              <button onClick={confirmSubmit} className="btn-primary-modern">
                Confirm & Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockIn;