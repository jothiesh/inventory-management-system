import React, { useState, useEffect, useMemo } from 'react';
import { categoryApi } from '../api/categoryApi';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUpload,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import CategoryUploadModal from './CategoryUploadModal';
import './Categories.css';

const PAGE_SIZE = 15;

// ── Edit / Add Modal ──────────────────────────────────────────
const CategoryModal = ({ category, existingNames, existingCodes, onClose }) => {
  const [form, setForm] = useState({
    categoryCode: category?.categoryCode || '',
    categoryName: category?.categoryName || '',
    description:  category?.description  || '',
    isActive:     category?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.categoryName.trim();
    const code = form.categoryCode.trim();
    if (!name) { toast.error('Category name is required'); return; }
    if (!code) { toast.error('Category code is required'); return; }
    const dupName = existingNames.find(n => n.toLowerCase() === name.toLowerCase() && n !== category?.categoryName);
    const dupCode = existingCodes.find(c => c.toLowerCase() === code.toLowerCase() && c !== category?.categoryCode);
    if (dupName) { toast.error(`Category name "${name}" already exists!`); return; }
    if (dupCode) { toast.error(`Category code "${code}" already exists!`); return; }
    try {
      setSaving(true);
      if (category) {
        await categoryApi.update(category.categoryId, form);
        toast.success('Category updated!');
      } else {
        await categoryApi.create(form);
        toast.success('Category created!');
      }
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="cat-modal-overlay" onClick={() => onClose(false)}>
      <div className="cat-modal" onClick={e => e.stopPropagation()}>
        <div className="cat-modal-header">
          <h3>{category ? 'Edit Category' : 'Add New Category'}</h3>
          <button className="cat-modal-close" onClick={() => onClose(false)}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="cat-form-grid">
            <div className="cat-field">
              <label>Category Code *</label>
              <input value={form.categoryCode}
                onChange={e => setForm(p => ({ ...p, categoryCode: e.target.value }))}
                placeholder="e.g. TT-TH-RES" required />
            </div>
            <div className="cat-field">
              <label>Category Name *</label>
              <input value={form.categoryName}
                onChange={e => setForm(p => ({ ...p, categoryName: e.target.value }))}
                placeholder="e.g. Resistors" required />
            </div>
            <div className="cat-field cat-field-full">
              <label>Description</label>
              <textarea value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2} placeholder="Optional description" />
            </div>
            <div className="cat-field">
              <label>
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                {' '}Active
              </label>
            </div>
          </div>
          <div className="cat-modal-footer">
            <button type="button" className="cat-btn cat-btn-secondary" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="cat-btn cat-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await categoryApi.getAll();
      const data = res.data?.data || res.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  const handleBulkSave = async (rows) => {
    await Promise.all(
      rows.map(row =>
        categoryApi.create({
          categoryCode: row.code,
          categoryName: row.name,
          description:  row.description || '',
          isActive:     row.isActive,
        })
      )
    );
    toast.success(`✅ ${rows.length} categor${rows.length > 1 ? 'ies' : 'y'} created!`);
    await load();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(c =>
      [c.categoryCode, c.categoryName, c.description]
        .filter(Boolean).some(f => f.toLowerCase().includes(q))
    );
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const goTo       = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const pageNums   = () => {
    const pages = [];
    let s = Math.max(1, safePage - 2), e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) pages.push(i);
    return pages;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try { await categoryApi.delete(id); toast.success('Category deleted!'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const existingNames = categories.map(c => c.categoryName);
  const existingCodes = categories.map(c => c.categoryCode);

  if (loading) return <div className="cat-loading">Loading categories...</div>;

  return (
    <div className="categories-page">

      {/* ── Header ── */}
      <div className="cat-header">
        <div className="cat-header-left">
          <h1>Categories</h1>
          <p>{filtered.length} of {categories.length} categories</p>
        </div>

        <div className="cat-search-box">
          <FiSearch size={14} className="cat-search-icon" />
          <input
            placeholder="Search code, name, description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search && <button className="cat-search-clear" onClick={() => setSearch('')}><FiX size={13} /></button>}
        </div>

        <div className="cat-header-actions">
          <button className="cat-btn cat-btn-outline" onClick={() => setShowUpload(true)}>
            <FiUpload size={14} /> Upload Excel
          </button>
          <button className="cat-btn cat-btn-primary" onClick={() => { setSelected(null); setShowModal(true); }}>
            <FiPlus size={14} /> Add Category
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="cat-table-wrap">
        <table className="cat-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Code</th>
              <th>Category Name</th>
              <th>Description</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan="6" className="cat-empty">
                  {search ? `No results for "${search}"` : 'No categories found'}
                </td>
              </tr>
            ) : paged.map((cat, idx) => (
              <tr key={cat.categoryId}>
                <td className="cat-row-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                <td><span className="cat-code">{cat.categoryCode}</span></td>
                <td className="cat-name-td"><span className="cat-name-cell">{cat.categoryName}</span></td>
                <td className="cat-desc">{cat.description || '—'}</td>
                <td>
                  <span className={`cat-status ${cat.isActive ? 'active' : 'inactive'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="cat-actions">
                    <button className="cat-icon-btn" title="Edit"
                      onClick={() => { setSelected(cat); setShowModal(true); }}>
                      <FiEdit2 size={14} />
                    </button>
                    <button className="cat-icon-btn cat-icon-danger" title="Delete"
                      onClick={() => handleDelete(cat.categoryId)}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {filtered.length > PAGE_SIZE && (
        <div className="cat-pagination">
          <div className="cat-pg-info">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </div>
          <div className="cat-pg-controls">
            <button className="cat-pg-btn" onClick={() => goTo(1)} disabled={safePage === 1}><FiChevronsLeft size={13} /></button>
            <button className="cat-pg-btn" onClick={() => goTo(safePage - 1)} disabled={safePage === 1}><FiChevronLeft size={13} /></button>
            {pageNums().map(p => (
              <button key={p} className={`cat-pg-btn cat-pg-num ${p === safePage ? 'active' : ''}`} onClick={() => goTo(p)}>{p}</button>
            ))}
            <button className="cat-pg-btn" onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages}><FiChevronRight size={13} /></button>
            <button className="cat-pg-btn" onClick={() => goTo(totalPages)} disabled={safePage === totalPages}><FiChevronsRight size={13} /></button>
          </div>
          <div className="cat-pg-jump">
            <span>Go to</span>
            <input type="number" min="1" max={totalPages} placeholder={safePage}
              onKeyDown={e => { if (e.key === 'Enter') goTo(parseInt(e.target.value)); }} />
            <span>of {totalPages}</span>
          </div>
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={selected}
          existingNames={existingNames}
          existingCodes={existingCodes}
          onClose={(r) => { setShowModal(false); setSelected(null); if (r) load(); }}
        />
      )}

      {showUpload && (
        <CategoryUploadModal
          existingNames={existingNames}
          existingCodes={existingCodes}
          onClose={(r) => { setShowUpload(false); if (r) load(); }}
          onSave={handleBulkSave}
        />
      )}
    </div>
  );
};

export default Categories;