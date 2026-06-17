import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from '../api/supplierApi';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX,
  FiLoader, FiChevronRight
} from 'react-icons/fi';
import './Suppliers.css';

const EMPTY_FORM = {
  supplierName: '',
  supplierCode: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstnNumber: '',
};

const Suppliers = () => {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await supplierApi.getAll();
      setSuppliers(res.data.data || []);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setForm({
      supplierName:  s.supplierName  || '',
      supplierCode:  s.supplierCode  || '',
      contactPerson: s.contactPerson || '',
      phone:         s.phone         || '',
      email:         s.email         || '',
      address:       s.address       || '',
      gstnNumber:    s.gstnNumber    || '',
    });
    setEditMode(true);
    setEditId(s.supplierId);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setEditMode(false);
    setEditId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'gstnNumber' ? value.toUpperCase() : value }));
  };

  const handleSubmit = async () => {
    if (!form.supplierName.trim()) { toast.warn('Supplier Name is required'); return; }
    
    // Sanitize optional fields to clear blank strings to standard null elements
    const payload = {
      ...form,
      supplierName: form.supplierName.trim(),
      supplierCode: form.supplierCode.trim() === '' ? null : form.supplierCode.trim(),
      contactPerson: form.contactPerson.trim() === '' ? null : form.contactPerson.trim(),
      phone: form.phone.trim() === '' ? null : form.phone.trim(),
      email: form.email.trim() === '' ? null : form.email.trim(),
      address: form.address.trim() === '' ? null : form.address.trim(),
      gstnNumber: form.gstnNumber.trim() === '' ? null : form.gstnNumber.trim()
    };

    try {
      setSaving(true);
      if (editMode) {
        await supplierApi.update(editId, payload);
        toast.success('Supplier updated successfully');
      } else {
        await supplierApi.create(payload);
        toast.success('Supplier created successfully');
      }
      closeModal();
      loadSuppliers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this supplier?')) return;
    try {
      setDeleting(id);
      await supplierApi.delete(id);
      toast.success('Supplier deactivated');
      loadSuppliers();
    } catch {
      toast.error('Failed to delete supplier');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = suppliers.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [s.supplierName, s.supplierCode, s.contactPerson, s.phone, s.email, s.gstnNumber]
      .filter(Boolean).some(f => f.toLowerCase().includes(q));
  });

  return (
    <div className="sp-page">
      {/* Header */}
      <div className="sp-header">
        <div>
          <h1 className="sp-title">Suppliers</h1>
          <p className="sp-subtitle">{suppliers.filter(s => s.isActive).length} of {suppliers.length} suppliers</p>
        </div>
        <button className="sp-add-btn" onClick={openCreate}>
          <FiPlus size={16} /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="sp-search-wrap">
        <div className="sp-search-bar">
          <FiSearch size={14} className="sp-search-icon" />
          <input
            type="text"
            placeholder="Search by name, code, contact, phone, GSTN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="sp-search-clear" onClick={() => setSearch('')}>
              <FiX size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="sp-loading"><FiLoader className="sp-spinner" size={26} /> Loading...</div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th style={{width:40}}>#</th>
                <th style={{width:120}}>Code</th>
                <th>Supplier Name</th>
                <th style={{width:160}}>GSTN</th>
                <th style={{width:140}}>Contact</th>
                <th style={{width:140}}>Phone</th>
                <th style={{width:90}}>Status</th>
                <th style={{width:190}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="sp-empty">
                    {search ? `No results for "${search}"` : 'No suppliers found'}
                  </td>
                </tr>
              ) : filtered.map((s, idx) => (
                <tr key={s.supplierId}>
                  <td className="sp-num">{idx + 1}</td>
                  <td>
                    {s.supplierCode
                      ? <span className="sp-code-badge">{s.supplierCode}</span>
                      : <span className="sp-na">—</span>}
                  </td>
                  <td className="sp-name-td">
                    <span className="sp-name-cell">{s.supplierName}</span>
                  </td>
                  <td>
                    {s.gstnNumber
                      ? <span className="sp-gstn-badge">{s.gstnNumber}</span>
                      : <span className="sp-na">—</span>}
                  </td>
                  <td className="sp-contact">{s.contactPerson || <span className="sp-na">—</span>}</td>
                  <td className="sp-phone">{s.phone || <span className="sp-na">—</span>}</td>
                  <td>
                    <span className={`sp-status ${s.isActive ? 'active' : 'inactive'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="sp-actions">
                    <button className="sp-action-btn view" onClick={() => navigate(`/suppliers/${s.supplierId}`)}>
                      <FiChevronRight size={13}/> Products
                    </button>
                    <button className="sp-action-btn edit" onClick={() => openEdit(s)}>
                      <FiEdit2 size={13}/>
                    </button>
                    <button
                      className="sp-action-btn delete"
                      onClick={() => handleDelete(s.supplierId)}
                      disabled={deleting === s.supplierId}
                    >
                      {deleting === s.supplierId
                        ? <FiLoader size={13} className="sp-spinner"/>
                        : <FiTrash2 size={13}/>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="sp-modal-overlay" onClick={closeModal}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>

            <div className="sp-modal-header">
              <h2>{editMode ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button className="sp-modal-close" onClick={closeModal}><FiX size={18}/></button>
            </div>

            <div className="sp-modal-body">
              <div className="sp-form-row">
                <div className="sp-form-group">
                  <label>Supplier Name <span className="sp-req">*</span></label>
                  <input type="text" name="supplierName" placeholder="e.g. Mathaji Electronics"
                    value={form.supplierName} onChange={handleChange} />
                </div>
                <div className="sp-form-group">
                  <label>Supplier Code</label>
                  <input type="text" name="supplierCode" placeholder="e.g. SUP-001"
                    value={form.supplierCode} onChange={handleChange} />
                </div>
              </div>

              <div className="sp-form-row">
                <div className="sp-form-group">
                  <label>Contact Person</label>
                  <input type="text" name="contactPerson" placeholder="Name"
                    value={form.contactPerson} onChange={handleChange} />
                </div>
                <div className="sp-form-group">
                  <label>Phone</label>
                  <input type="text" name="phone" placeholder="+91 98765 43210"
                    value={form.phone} onChange={handleChange} />
                </div>
              </div>

              <div className="sp-form-row">
                <div className="sp-form-group">
                  <label>Email</label>
                  <input type="email" name="email" placeholder="supplier@email.com"
                    value={form.email} onChange={handleChange} />
                </div>
                <div className="sp-form-group">
                  <label>GSTN Number</label>
                  <input type="text" name="gstnNumber" placeholder="e.g. 29ABCDE1234F1Z5"
                    maxLength={15} value={form.gstnNumber} onChange={handleChange} />
                  <span className="sp-hint">15-character GST Identification Number</span>
                </div>
              </div>

              <div className="sp-form-group sp-full">
                <label>Address</label>
                <textarea name="address" placeholder="Full address" rows={3}
                  value={form.address} onChange={handleChange} />
              </div>
            </div>

            <div className="sp-modal-footer">
              <button className="sp-btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="sp-btn-save" onClick={handleSubmit} disabled={saving}>
                {saving ? <><FiLoader className="sp-spinner" size={14}/> Saving...</> : (editMode ? 'Update' : 'Create')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;