import React, { useState, useEffect } from 'react';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { supplierApi } from '../api/supplierApi';
import { rackApi } from '../api/rackApi';
import { boxApi } from '../api/boxApi';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch } from 'react-icons/fi';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [racks, setRacks] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  const [formData, setFormData] = useState({
    productId: null,
    partNumber: '',
    description: '',
    packageType: '',
    specification: '',
    alternativeComponent: '',
    manufacturerPn: '',
    unitPrice: '',
    minStockLevel: 10,
    categoryId: '',
    supplierId: '',
    rackId: '',
    boxId: '',
    remarks: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, suppliersRes, racksRes] = await Promise.all([
        productApi.getAll(),
        categoryApi.getActive(),
        supplierApi.getActive(),
        rackApi.getActive()
      ]);

      console.log('Products Response:', productsRes.data);
      console.log('Categories Response:', categoriesRes.data);

      if (productsRes.data.success) setProducts(productsRes.data.data || []);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data || []);
      if (suppliersRes.data.success) setSuppliers(suppliersRes.data.data || []);
      if (racksRes.data.success) setRacks(racksRes.data.data || []);
      
      toast.success('Data loaded successfully!');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadBoxesByRack = async (rackId) => {
    if (!rackId) {
      setBoxes([]);
      return;
    }
    try {
      const res = await boxApi.getByRack(rackId);
      if (res.data.success) setBoxes(res.data.data || []);
    } catch (error) {
      console.error('Error loading boxes:', error);
      setBoxes([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Load boxes when rack is selected
    if (name === 'rackId') {
      loadBoxesByRack(value);
      // Reset box selection
      setFormData(prev => ({ ...prev, boxId: '' }));
    }
  };

  // Handle search with API call
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If search is empty, reload all products
      loadData();
      return;
    }

    try {
      setLoading(true);
      console.log('Searching for:', searchTerm);
      const res = await productApi.search(searchTerm);
      console.log('Search response:', res.data);
      
      if (res.data.success) {
        const foundProducts = res.data.data || [];
        setProducts(foundProducts);
        toast.success(`Found ${foundProducts.length} product(s)`);
      } else {
        toast.error(res.data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Search failed';
      toast.error(errorMsg);
      // Don't clear products on search error
    } finally {
      setLoading(false);
    }
  };

  // Clear search and reload all products
  const handleClearSearch = () => {
    setSearchTerm('');
    loadData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.partNumber.trim()) {
      toast.error('Please enter part number');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Please enter description');
      return;
    }
    
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }
    
    try {
      const payload = {
        partNumber: formData.partNumber.trim(),
        description: formData.description.trim(),
        packageType: formData.packageType?.trim() || null,
        specification: formData.specification?.trim() || null,
        alternativeComponent: formData.alternativeComponent?.trim() || null,
        manufacturerPn: formData.manufacturerPn?.trim() || null,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : 0,
        minStockLevel: formData.minStockLevel ? parseInt(formData.minStockLevel) : 10,
        categoryId: parseInt(formData.categoryId),
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
        rackId: formData.rackId ? parseInt(formData.rackId) : null,
        boxId: formData.boxId ? parseInt(formData.boxId) : null,
        remarks: formData.remarks?.trim() || null
      };

      console.log('Sending payload:', payload);

      let response;
      if (formData.productId) {
        response = await productApi.update(formData.productId, payload);
        toast.success('Product updated!');
      } else {
        response = await productApi.create(payload);
        toast.success('Product created!');
      }

      console.log('Response:', response.data);

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to save';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (product) => {
    console.log('Editing product:', product);
    
    setFormData({
      productId: product.productId,
      partNumber: product.partNumber || '',
      description: product.description || '',
      packageType: product.packageType || '',
      specification: product.specification || '',
      alternativeComponent: product.alternativeComponent || '',
      manufacturerPn: product.manufacturerPn || '',
      unitPrice: product.unitPrice || '',
      minStockLevel: product.minStockLevel || 10,
      categoryId: product.category?.categoryId || '',
      supplierId: product.supplier?.supplierId || '',
      rackId: product.rack?.rackId || '',
      boxId: product.box?.boxId || '',
      remarks: product.remarks || '',
      isActive: product.isActive !== false
    });

    if (product.rack?.rackId) {
      loadBoxesByRack(product.rack.rackId);
    }

    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await productApi.delete(id);
      toast.success('Product deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      productId: null,
      partNumber: '',
      description: '',
      packageType: '',
      specification: '',
      alternativeComponent: '',
      manufacturerPn: '',
      unitPrice: '',
      minStockLevel: 10,
      categoryId: '',
      supplierId: '',
      rackId: '',
      boxId: '',
      remarks: '',
      isActive: true
    });
    setBoxes([]);
  };

  // Client-side filtering based on category dropdown
  const filteredProducts = products.filter(product => {
    const matchesCategory = !filterCategory || product.category?.categoryId === parseInt(filterCategory);
    return matchesCategory;
  });

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="products-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Products / Components</h1>
          <p>{filteredProducts.length} total products</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by part number, description, or MPN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchTerm && (
            <button className="btn-clear" onClick={handleClearSearch} title="Clear search">
              ×
            </button>
          )}
          <button className="btn-search" onClick={handleSearch}>
            Search
          </button>
        </div>
        <select 
          className="category-filter"
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.categoryId} value={cat.categoryId}>
              {cat.categoryName}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Part #</th>
              <th>Description</th>
              <th>Package</th>
              <th>Supplier</th>
              <th>MPN</th>
              <th>Price</th>
              <th>Location</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <tr key={product.productId}>
                  <td className="category-cell">{product.category?.categoryName || '-'}</td>
                  <td className="part-number">{product.partNumber}</td>
                  <td>{product.description}</td>
                  <td><span className="badge-package">{product.packageType || '-'}</span></td>
                  <td>{product.supplier?.supplierName || '-'}</td>
                  <td className="mpn">{product.manufacturerPn || '-'}</td>
                  <td className="price">₹{product.unitPrice?.toFixed(2) || '0.00'}</td>
                  <td>
                    {product.rack?.rackName && product.box?.boxLabel ? (
                      <span className="location">
                        {product.rack.rackName} / {product.box.boxLabel}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className="badge-stock">0</span>
                  </td>
                  <td className="actions">
                    <button className="btn-icon" onClick={() => handleEdit(product)} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(product.productId)} title="Delete">
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="empty-cell">
                  <div className="empty-state">
                    <FiPackage size={48} />
                    <p>No products found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{formData.productId ? 'Edit Product' : 'Add New Product'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Category - First Field */}
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Part Number */}
                <div className="form-group">
                  <label>Part Number *</label>
                  <input
                    type="text"
                    name="partNumber"
                    value={formData.partNumber}
                    onChange={handleInputChange}
                    placeholder="C1, R1, IC1, etc."
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label>Description / Value *</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="10uF, 4K7, ESP32, etc."
                    required
                  />
                </div>

                {/* Package Type */}
                <div className="form-group">
                  <label>Package</label>
                  <input
                    type="text"
                    name="packageType"
                    value={formData.packageType}
                    onChange={handleInputChange}
                    placeholder="0603, SMD, DIP-8, SOT-23"
                  />
                </div>

                {/* Manufacturer PN */}
                <div className="form-group">
                  <label>Manufacturer P/N (MPN)</label>
                  <input
                    type="text"
                    name="manufacturerPn"
                    value={formData.manufacturerPn}
                    onChange={handleInputChange}
                    placeholder="ESP32-WROOM-32"
                  />
                </div>

                {/* Unit Price */}
                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                {/* Supplier */}
                <div className="form-group">
                  <label>Supplier</label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(sup => (
                      <option key={sup.supplierId} value={sup.supplierId}>
                        {sup.supplierName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Stock Level */}
                <div className="form-group">
                  <label>Min Stock Level</label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                {/* Rack */}
                <div className="form-group">
                  <label>Rack</label>
                  <select
                    name="rackId"
                    value={formData.rackId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Rack</option>
                    {racks.map(rack => (
                      <option key={rack.rackId} value={rack.rackId}>
                        {rack.rackName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Box */}
                <div className="form-group">
                  <label>Box</label>
                  <select
                    name="boxId"
                    value={formData.boxId}
                    onChange={handleInputChange}
                    disabled={!formData.rackId || boxes.length === 0}
                  >
                    <option value="">Select Box</option>
                    {boxes.map(box => (
                      <option key={box.boxId} value={box.boxId}>
                        {box.boxLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alternative Component */}
                <div className="form-group full-width">
                  <label>Alternative Component</label>
                  <input
                    type="text"
                    name="alternativeComponent"
                    value={formData.alternativeComponent}
                    onChange={handleInputChange}
                    placeholder="Alternative part that can be used"
                  />
                </div>

                {/* Specification */}
                <div className="form-group full-width">
                  <label>Specification</label>
                  <textarea
                    name="specification"
                    value={formData.specification}
                    onChange={handleInputChange}
                    placeholder="Full specification (Capacitor_SMD:C_0603_1608Metric)"
                    rows="2"
                  />
                </div>

                {/* Remarks */}
                <div className="form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Additional notes"
                    rows="2"
                  />
                </div>

                {/* Active Status */}
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {formData.productId ? 'Update' : 'Create'} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;