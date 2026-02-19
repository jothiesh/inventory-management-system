import React, { useState, useEffect } from 'react';
import { productApi } from '../../api/productApi';
import { rackApi } from '../../api/rackApi';
import { boxApi } from '../../api/boxApi';
import { toast } from 'react-toastify';

const ProductModal = ({ product, categories, onClose }) => {
  const [formData, setFormData] = useState({
    categoryId: '',
    productName: '',
    modelNumber: '',
    partNumber: '',
    description: '',
    productType: 'Component',
    unit: 'pcs',
    defaultRackId: '',
    defaultBoxId: '',
    reorderLevel: '',
    maxStockLevel: '',
  });
  const [racks, setRacks] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [specifications, setSpecifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRacks();
    if (product) {
      setFormData({
        categoryId: product.category.categoryId,
        productName: product.productName,
        modelNumber: product.modelNumber || '',
        partNumber: product.partNumber || '',
        description: product.description || '',
        productType: product.productType,
        unit: product.unit,
        defaultRackId: product.defaultRack?.rackId || '',
        defaultBoxId: product.defaultBox?.boxId || '',
        reorderLevel: product.reorderLevel || '',
        maxStockLevel: product.maxStockLevel || '',
      });
      if (product.specifications) {
        setSpecifications(
          product.specifications.map(s => ({ key: s.specKey, value: s.specValue }))
        );
      }
    }
  }, [product]);

  useEffect(() => {
    if (formData.defaultRackId) {
      loadBoxes(formData.defaultRackId);
    }
  }, [formData.defaultRackId]);

  const loadRacks = async () => {
    try {
      const response = await rackApi.getActive();
      setRacks(response.data.data);
    } catch (error) {
      console.error('Failed to load racks');
    }
  };

  const loadBoxes = async (rackId) => {
    try {
      const response = await boxApi.getByRack(rackId);
      setBoxes(response.data.data);
    } catch (error) {
      console.error('Failed to load boxes');
    }
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { key: '', value: '' }]);
  };

  const removeSpecification = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const updateSpecification = (index, field, value) => {
    const updated = [...specifications];
    updated[index][field] = value;
    setSpecifications(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        specifications: specifications.filter(s => s.key && s.value),
      };

      if (product) {
        await productApi.update(product.productId, payload);
        toast.success('Product updated successfully');
      } else {
        await productApi.create(payload);
        toast.success('Product created successfully');
      }
      onClose(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label>Model Number</label>
              <input
                type="text"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                placeholder="Enter model number"
              />
            </div>

            <div className="form-group">
              <label>Part Number</label>
              <input
                type="text"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                placeholder="Enter part number"
              />
            </div>

            <div className="form-group">
              <label>Product Type *</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                required
              >
                <option value="PCBA">PCBA</option>
                <option value="Component">Component</option>
                <option value="Module">Module</option>
                <option value="Finished">Finished Product</option>
              </select>
            </div>

            <div className="form-group">
              <label>Unit *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="set">Set</option>
                <option value="box">Box</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="meter">Meter</option>
              </select>
            </div>

            <div className="form-group">
              <label>Default Rack</label>
              <select
                value={formData.defaultRackId}
                onChange={(e) => setFormData({ ...formData, defaultRackId: e.target.value, defaultBoxId: '' })}
              >
                <option value="">Select Rack</option>
                {racks.map((rack) => (
                  <option key={rack.rackId} value={rack.rackId}>
                    {rack.rackNumber} - {rack.rackName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Default Box</label>
              <select
                value={formData.defaultBoxId}
                onChange={(e) => setFormData({ ...formData, defaultBoxId: e.target.value })}
                disabled={!formData.defaultRackId}
              >
                <option value="">Select Box</option>
                {boxes.map((box) => (
                  <option key={box.boxId} value={box.boxId}>
                    {box.boxNumber} - {box.boxLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Reorder Level</label>
              <input
                type="number"
                step="0.01"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                placeholder="Minimum stock level"
              />
            </div>

            <div className="form-group">
              <label>Max Stock Level</label>
              <input
                type="number"
                step="0.01"
                value={formData.maxStockLevel}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: e.target.value })}
                placeholder="Maximum stock level"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              placeholder="Enter description"
            />
          </div>

          {/* Specifications */}
          <div className="specifications-section">
            <div className="section-header">
              <label>Specifications (Optional)</label>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addSpecification}>
                + Add Spec
              </button>
            </div>
            {specifications.map((spec, index) => (
              <div key={index} className="spec-row">
                <input
                  type="text"
                  placeholder="Key (e.g., MCU)"
                  value={spec.key}
                  onChange={(e) => updateSpecification(index, 'key', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Value (e.g., STM32)"
                  value={spec.value}
                  onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn btn-sm btn-danger" 
                  onClick={() => removeSpecification(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => onClose(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;