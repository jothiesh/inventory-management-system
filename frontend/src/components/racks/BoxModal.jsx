import React, { useState } from 'react';
import { boxApi } from '../../api/boxApi';
import { toast } from 'react-toastify';
import { FiX } from 'react-icons/fi';

// CHANGED: Box Number input removed — backend auto-generates B1, B2, … per rack.
// Only Box Label is entered (optional, but at least something is nice to have).

const BoxModal = ({ box, rackId, onClose }) => {
  const isEdit = !!box;
  const [boxLabel, setBoxLabel] = useState(box?.boxLabel || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const payload = {
      rackId: isEdit ? (box.rackId ?? rackId) : rackId,
      boxNumber: isEdit ? box.boxNumber : null, // null → auto-generate
      boxLabel: boxLabel.trim() || null,
    };
    try {
      setSaving(true);
      if (isEdit) {
        await boxApi.update(box.boxId, payload);
        toast.success('Box updated');
      } else {
        await boxApi.create(payload);
        toast.success('Box created');
      }
      onClose(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save box');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? `Edit Box — ${box.boxNumber}` : 'Add Box'}</h2>
          <button className="modal-close" onClick={() => onClose(false)} aria-label="Close">
            <FiX />
          </button>
        </div>

        <div className="form-group">
          <label>Box Label</label>
          <input
            type="text"
            placeholder="e.g., Small Components"
            value={boxLabel}
            onChange={(e) => setBoxLabel(e.target.value)}
            autoFocus
          />
        </div>

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

export default BoxModal;