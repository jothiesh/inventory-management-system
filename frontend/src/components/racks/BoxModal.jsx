import React, { useState, useEffect } from 'react';
import { boxApi } from '../../api/boxApi';
import { toast } from 'react-toastify';

const BoxModal = ({ box, rackId, onClose }) => {
  const [formData, setFormData] = useState({
    rackId: rackId || '',
    boxNumber: '',
    boxLabel: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (box) {
      setFormData({
        rackId: box.rack.rackId,
        boxNumber: box.boxNumber,
        boxLabel: box.boxLabel || '',
      });
    }
  }, [box]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (box) {
        await boxApi.update(box.boxId, {
          boxNumber: formData.boxNumber,
          boxLabel: formData.boxLabel,
        });
        toast.success('Box updated successfully');
      } else {
        await boxApi.create(formData);
        toast.success('Box created successfully');
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
          <h2 className="modal-title">{box ? 'Edit Box' : 'Add Box'}</h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Box Number *</label>
            <input
              type="text"
              value={formData.boxNumber}
              onChange={(e) => setFormData({ ...formData, boxNumber: e.target.value })}
              required
              placeholder="e.g., B1"
            />
          </div>

          <div className="form-group">
            <label>Box Label</label>
            <input
              type="text"
              value={formData.boxLabel}
              onChange={(e) => setFormData({ ...formData, boxLabel: e.target.value })}
              placeholder="e.g., Small Components"
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

export default BoxModal;