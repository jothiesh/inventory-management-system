import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseRequestApi } from '../../api/purchaseRequestApi';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft, FiFileText } from 'react-icons/fi';
import './PurchaseRequests.css';
const emptyItem = () => ({
  partNo: '',
  description: '',
  quantity: '',
  remark: '',
});

const PurchaseRequestCreate = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    for (const item of items) {
      if (!item.description) {
        setError('Description is required for all rows.');
        return;
      }
      if (!item.quantity || item.quantity < 1) {
        setError('Quantity must be at least 1.');
        return;
      }
      if (parseInt(item.quantity) > 999999) {
        setError('Quantity cannot exceed 999999 (6 digits).');
        return;
      }
    }

    const payload = {
      notes,
      items: items.map(item => ({
        partNo:      item.partNo,
        description: item.description,
        quantity:    parseInt(item.quantity),
        remark:      item.remark,
        rate:        null, // not used in PR
      })),
    };

    try {
      setSaving(true);
      const res = await purchaseRequestApi.create(payload);
      const created = res.data.data;
      navigate(`/purchase-requests/${created.id}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create Purchase Request.');
    } finally {
      setSaving(false);
    }
  };

  // Live PR code preview
  const prCodePreview = 'TT.PR-' + new Date().toISOString()
    .replace(/[-T:.Z]/g, '').slice(0, 14);

  return (
    <div className="po-page">

      {/* ── Header ── */}
      <div className="po-header">
        <div className="po-header-left">
          <button className="po-btn-back" onClick={() => navigate('/purchase-requests')}>
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h2 className="po-title">New Purchase Request</h2>
            <p className="po-subtitle">Fill items and submit</p>
          </div>
        </div>
      </div>

      {error && <div className="po-error">{error}</div>}

      <form className="po-form" onSubmit={handleSubmit}>

        {/* ── Items Table ── */}
        <div className="po-card">
          <div className="po-card-header">
            <h3 className="po-card-title">Items</h3>
            <button type="button" className="po-btn-add-row" onClick={addItem}>
              <FiPlus size={14} /> Add Row
            </button>
          </div>

          <div className="po-items-table-wrap">
            <table className="po-items-table">
              <thead>
                <tr>
                  <th style={{ width: '45px'  }}>#</th>
                  <th style={{ width: '130px' }}>Part No</th>
                  <th>Description *</th>
                  <th style={{ width: '100px' }}>Qty * (max 6)</th>
                  <th style={{ width: '200px' }}>Remark</th>
                  <th style={{ width: '40px'  }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="po-sl">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={item.partNo}
                        onChange={e => handleItemChange(index, 'partNo', e.target.value)}
                        placeholder="Part number"
                        className="po-input"
                        maxLength={100}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                        className="po-input"
                        required
                        maxLength={500}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        className="po-input po-input-num"
                        min="1"
                        max="999999"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.remark}
                        onChange={e => handleItemChange(index, 'remark', e.target.value)}
                        placeholder="Remark (optional)"
                        className="po-input"
                        maxLength={500}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="po-btn-remove"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        title="Remove row"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total qty summary */}
          <div className="po-grand-total">
            <span className="po-grand-label">Total Items</span>
            <span className="po-grand-amount" style={{ fontSize: '1rem' }}>
              {items.length} row{items.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="po-card">
          <h3 className="po-card-title">Notes (optional)</h3>
          <div className="po-field">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        {/* ── PR Code Preview ── */}
        <div className="po-card">
          <div className="pr-code-preview">
            <FiFileText size={16} />
            <span>Request code will be generated as:</span>
            <strong>{prCodePreview}</strong>
            <span className="pr-code-note">(timestamp at time of submission)</span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="po-form-actions">
          <button
            type="button"
            className="po-btn-cancel"
            onClick={() => navigate('/purchase-requests')}
          >
            Cancel
          </button>
          <button type="submit" className="po-btn-save" disabled={saving}>
            {saving ? <span className="po-spin-sm" /> : <FiSave size={15} />}
            {saving ? 'Submitting...' : 'Submit Purchase Request'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default PurchaseRequestCreate;
