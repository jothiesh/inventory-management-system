import React, { useState, useEffect } from 'react';
import { supplierApi } from '../../api/supplierApi';
import { toast } from 'react-toastify';

const SupplierModal = ({ supplier, onClose }) => {
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplierName: supplier.supplierName,
        supplierCode: supplier.supplierCode || '',
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
      });
    }
  }, [supplier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (supplier) {
        await supplierApi.update(supplier.supplierId, formData);
        toast.success('Supplier updated successfully');
      } else {
        await supplierApi.create(formData);
        toast.success('Supplier created successfully');
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {supplier ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Supplier Name *</label>
            <input
              type="text"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              required
              placeholder="Enter supplier name"
            />
          </div>

          <div className="form-group">
            <label>Supplier Code</label>
            <input
              type="text"
              value={formData.supplierCode}
              onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
              placeholder="e.g., SUP-001"
            />
          </div>

          <div className="form-group">
            <label>Contact Person</label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="Enter contact person name"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows="3"
              placeholder="Enter address"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;