import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft } from 'react-icons/fi';
import './PurchaseOrders.css';

const emptyItem = () => ({
  hsnCode: '',
  description: '',
  quantity: '',
  uom: 'Nos',
  rate: '',
});

const PurchaseOrderCreate = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    deliveryFrom: '',
    deliveryTo: '',
    paymentTerms: 'As per agreement between the parties.',
    notes: '',
  });

  const [items, setItems] = useState([emptyItem()]);

  // ── Form field change ──
  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Item row change ──
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ── Add / Remove rows ──
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Calculate line total ──
  const lineTotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return qty * rate;
  };

  const grandTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    for (const item of items) {
      if (!item.description || !item.quantity || !item.rate) {
        setError('All item rows must have Description, Quantity and Rate.');
        return;
      }
    }

    const payload = {
      ...form,
      deliveryFrom: form.deliveryFrom || null,
      deliveryTo: form.deliveryTo || null,
      items: items.map(item => ({
        hsnCode: item.hsnCode,
        description: item.description,
        quantity: parseInt(item.quantity),
        uom: item.uom,
        rate: parseFloat(item.rate),
      })),
    };

    try {
      setSaving(true);
      const res = await purchaseOrderApi.create(payload);
      const created = res.data.data;
      navigate(`/purchase-orders/${created.id}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create Purchase Order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="po-page">

      {/* ── Header ── */}
      <div className="po-header">
        <div className="po-header-left">
          <button className="po-btn-back" onClick={() => navigate('/purchase-orders')}>
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h2 className="po-title">New Purchase Order</h2>
            <p className="po-subtitle">Fill details and add items below</p>
          </div>
        </div>
      </div>

      {error && <div className="po-error">{error}</div>}

      <form className="po-form" onSubmit={handleSubmit}>

        {/* ── Terms Section ── */}
        <div className="po-card">
          <h3 className="po-card-title">Order Details</h3>
          <div className="po-form-grid">
            <div className="po-field">
              <label>Delivery From</label>
              <input
                type="date"
                name="deliveryFrom"
                value={form.deliveryFrom}
                onChange={handleFormChange}
              />
            </div>
            <div className="po-field">
              <label>Delivery To</label>
              <input
                type="date"
                name="deliveryTo"
                value={form.deliveryTo}
                onChange={handleFormChange}
              />
            </div>
            <div className="po-field po-field-full">
              <label>Payment Terms</label>
              <input
                type="text"
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={handleFormChange}
                placeholder="e.g. As per agreement"
              />
            </div>
            <div className="po-field po-field-full">
              <label>Notes (optional)</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleFormChange}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* ── Items Section ── */}
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
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '110px' }}>HSN/SAC</th>
                  <th>Description *</th>
                  <th style={{ width: '80px' }}>Qty *</th>
                  <th style={{ width: '80px' }}>UOM</th>
                  <th style={{ width: '110px' }}>Rate *</th>
                  <th style={{ width: '120px' }}>Total</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="po-sl">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={e => handleItemChange(index, 'hsnCode', e.target.value)}
                        placeholder="85423100"
                        className="po-input"
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
                        required
                      />
                    </td>
                    <td>
                      <select
                        value={item.uom}
                        onChange={e => handleItemChange(index, 'uom', e.target.value)}
                        className="po-input"
                      >
                        <option>Nos</option>
                        <option>Pcs</option>
                        <option>Kgs</option>
                        <option>Mtr</option>
                        <option>Ltr</option>
                        <option>Set</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={e => handleItemChange(index, 'rate', e.target.value)}
                        placeholder="0.00"
                        className="po-input po-input-num"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="po-line-total">
                      ₹ {lineTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

          {/* Grand Total */}
          <div className="po-grand-total">
            <span className="po-grand-label">Grand Total</span>
            <span className="po-grand-amount">
              ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="po-form-actions">
          <button type="button" className="po-btn-cancel" onClick={() => navigate('/purchase-orders')}>
            Cancel
          </button>
          <button type="submit" className="po-btn-save" disabled={saving}>
            {saving ? <span className="po-spin-sm" /> : <FiSave size={15} />}
            {saving ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default PurchaseOrderCreate;