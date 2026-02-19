import React, { useState, useEffect } from 'react';
import { rackApi } from '../../api/rackApi';
import { toast } from 'react-toastify';

const RackModal = ({ rack, onClose }) => {
  const [formData, setFormData] = useState({
    rackNumber: '',
    rackName: '',
    location: '',
    capacity: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rack) {
      setFormData({
        rackNumber: rack.rackNumber,
        rackName: rack.rackName,
        location: rack.location || '',
        capacity: rack.capacity || '',
      });
    }
  }, [rack]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (rack) {
        await rackApi.update(rack.rackId, formData);
        toast.success('Rack updated successfully');
      } else {
        await rackApi.create(formData);
        toast.success('Rack created successfully');
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
          <h2 className="modal-title">{rack ? 'Edit Rack' : 'Add Rack'}</h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Rack Number *</label>
            <input
              type="text"
              value={formData.rackNumber}
              onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
              required
              placeholder="e.g., R1"
            />
          </div>

          <div className="form-group">
            <label>Rack Name *</label>
            <input
              type="text"
              value={formData.rackName}
              onChange={(e) => setFormData({ ...formData, rackName: e.target.value })}
              required
              placeholder="e.g., Components Rack"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Zone A"
            />
          </div>

          <div className="form-group">
            <label>Capacity</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="e.g., 100"
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

export default RackModal;