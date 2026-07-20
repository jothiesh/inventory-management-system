import React, { useState } from 'react';
import { rackApi } from '../../api/rackApi';
import { boxApi } from '../../api/boxApi';
import { toast } from 'react-toastify';
import { FiX } from 'react-icons/fi';

// CHANGED:
// - Rack Number removed (backend auto-generates R1, R2, …)
// - NEW "Number of Boxes" field: creating a rack also creates that many
//   boxes automatically (B1, B2, … auto-numbered by backend).
//   Only shown in create mode, not edit mode.

const RackModal = ({ rack, onClose }) => {
  const isEdit = !!rack;
  const [form, setForm] = useState({
    rackName: rack?.rackName || '',
    location: rack?.location || '',
    capacity: rack?.capacity ?? '',
    boxCount: 4, // default boxes created with a new rack
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.rackName.trim()) {
      toast.error('Rack name is required');
      return;
    }
    const payload = {
      rackNumber: isEdit ? rack.rackNumber : null, // null → auto-generate
      rackName: form.rackName.trim(),
      location: form.location.trim() || null,
      capacity: form.capacity === '' ? null : parseInt(form.capacity, 10),
    };
    try {
      setSaving(true);
      if (isEdit) {
        await rackApi.update(rack.rackId, payload);
        toast.success('Rack updated');
      } else {
        const res = await rackApi.create(payload);
        const newRack = res.data?.data || res.data;
        const rackId = newRack?.rackId;

        // auto-create boxes for the new rack (backend numbers them B1, B2, …)
        const count = Math.max(0, parseInt(form.boxCount, 10) || 0);
        if (rackId && count > 0) {
          for (let i = 0; i < count; i++) {
            // sequential on purpose — parallel calls could race the
            // "next box number" generation and hit duplicate errors
            await boxApi.create({ rackId, boxNumber: null, boxLabel: null });
          }
          toast.success(`Rack created with ${count} box${count !== 1 ? 'es' : ''}`);
        } else {
          toast.success('Rack created');
        }
      }
      onClose(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save rack');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? `Edit Rack — ${rack.rackNumber}` : 'Add Rack'}</h2>
          <button className="modal-close" onClick={() => onClose(false)} aria-label="Close">
            <FiX />
          </button>
        </div>

        <div className="form-group">
          <label>Rack Name *</label>
          <input
            type="text"
            placeholder="e.g., Components Rack"
            value={form.rackName}
            onChange={set('rackName')}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            placeholder="e.g., Zone A"
            value={form.location}
            onChange={set('location')}
          />
        </div>

        <div className="form-group">
          <label>Capacity</label>
          <input
            type="number"
            min="0"
            placeholder="e.g., 100"
            value={form.capacity}
            onChange={set('capacity')}
          />
        </div>

        {!isEdit && (
          <div className="form-group">
            <label>Number of Boxes</label>
            <input
              type="number"
              min="0"
              max="50"
              placeholder="e.g., 4"
              value={form.boxCount}
              onChange={set('boxCount')}
            />
          </div>
        )}

        <div className="modal-actions">
          <button className="rack-btn rack-btn-ghost" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </button>
          <button className="rack-btn rack-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RackModal;