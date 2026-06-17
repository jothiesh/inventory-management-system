import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { supplierApi } from '../api/supplierApi';
import { rackApi } from '../api/rackApi';
import { boxApi } from '../api/boxApi';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch,
  FiBox, FiLayers, FiMapPin, FiX,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiShoppingCart, FiRotateCw, FiSave, FiAlertTriangle,
  FiInfo, FiDollarSign, FiTag, FiHash
} from 'react-icons/fi';
import './Products.css';

const PAGE_SIZE = 15;
const DRAFT_KEY = 'product-form-draft';

// ── Draft helpers ─────────────────────────────────────────────
const saveDraft = (data) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, savedAt: new Date().toISOString() })); } catch {}
};
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const EMPTY_FORM = {
  productId: null, partNumber: '', description: '',
  packageType: '', manufacturerPn: '', unitPrice: '',
  hsnCode: '', gstPercent: '',
  unitOfMeasure: 'PCS',
  minStockLevel: 10, categoryId: '', supplierId: '',
  rackId: '', boxId: '', remarks: '', isActive: true
};

const GST_OPTIONS = ['0', '5', '12', '18'];

const UNIT_OPTIONS = [
  { value: 'PCS',   label: 'Pieces', icon: '📦', short: 'pcs' },
  { value: 'METER', label: 'Meter',  icon: '📏', short: 'm'   },
  { value: 'LITER', label: 'Liter',  icon: '🧴', short: 'L'   },
  { value: 'KG',    label: 'Kg',     icon: '⚖',  short: 'kg'  },
];

const Products = () => {
  const navigate = useNavigate();

  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [racks, setRacks]           = useState([]);
  const [boxes, setBoxes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [draftFound, setDraftFound] = useState(null);
  const [draftDismissed, setDraftDismissed] = useState(false);

  const [detailProduct, setDetailProduct] = useState(null);

  const [showModalNewRack,  setShowModalNewRack]  = useState(false);
  const [showModalNewBox,   setShowModalNewBox]   = useState(false);
  const [showModalRackView, setShowModalRackView] = useState(false);
  const [modalNewRack, setModalNewRack] = useState({ rackNumber: '', rackName: '', location: '' });
  const [modalNewBox,  setModalNewBox]  = useState({ boxNumber: '', boxLabel: '' });
  const [savingRack, setSavingRack]     = useState(false);
  const [savingBox,  setSavingBox]      = useState(false);
  const [viewerRack,  setViewerRack]    = useState(null);
  const [viewerBoxes, setViewerBoxes]   = useState([]);

  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => { loadData(); checkDraft(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory]);

  useEffect(() => {
    if (!showModal) return;
    const hasData = formData.categoryId || formData.description || formData.partNumber || formData.unitPrice;
    if (hasData) saveDraft(formData);
  }, [formData, showModal]);

  const checkDraft = () => {
    const draft = loadDraft();
    if (draft && draft.data && draft.data.categoryId) {
      setDraftFound(draft);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, suppliersRes, racksRes] = await Promise.all([
        productApi.getAll(), categoryApi.getActive(),
        supplierApi.getActive(), rackApi.getActive()
      ]);
      if (productsRes.data.success)   setProducts(productsRes.data.data || []);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data || []);
      if (suppliersRes.data.success)  setSuppliers(suppliersRes.data.data || []);
      if (racksRes.data.success)      setRacks(racksRes.data.data || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (filterCategory) result = result.filter(p => p.category?.categoryId === parseInt(filterCategory));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p =>
        [p.partNumber, p.description, p.packageType, p.manufacturerPn, p.category?.categoryName]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, searchTerm, filterCategory]);

  const totalPages    = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage      = Math.min(currentPage, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const goTo          = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const pageNums = () => {
    const pages = [];
    let start = Math.max(1, safePage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const handleModalSaveRack = async (e) => {
    e.preventDefault();
    if (!modalNewRack.rackNumber || !modalNewRack.rackName) { toast.error('Fill rack number and name'); return; }
    try {
      setSavingRack(true);
      await rackApi.create(modalNewRack);
      toast.success(`Rack "${modalNewRack.rackName}" created!`);
      const res = await rackApi.getActive();
      const rackData = res.data.data || [];
      setRacks(rackData);
      const created = rackData[rackData.length - 1];
      setFormData(prev => ({ ...prev, rackId: created.rackId, boxId: '' }));
      setBoxes([]);
      setModalNewRack({ rackNumber: '', rackName: '', location: '' });
      setShowModalNewRack(false);
    } catch { toast.error('Failed to create rack'); }
    finally { setSavingRack(false); }
  };

  const handleModalSaveBox = async (e) => {
    e.preventDefault();
    if (!formData.rackId) { toast.error('Select a rack first'); return; }
    if (!modalNewBox.boxNumber || !modalNewBox.boxLabel) { toast.error('Fill box number and label'); return; }
    try {
      setSavingBox(true);
      await boxApi.create({ ...modalNewBox, rackId: formData.rackId });
      toast.success(`Box "${modalNewBox.boxLabel}" created!`);
      await loadBoxesByRack(formData.rackId);
      setModalNewBox({ boxNumber: '', boxLabel: '' });
      setShowModalNewBox(false);
    } catch { toast.error('Failed to create box'); }
    finally { setSavingBox(false); }
  };

  const loadViewerBoxes = async (rack) => {
    setViewerRack(rack);
    try {
      const res = await boxApi.getByRack(rack.rackId);
      setViewerBoxes(res.data.data || res.data || []);
    } catch { setViewerBoxes([]); }
  };

  const loadBoxesByRack = async (rackId) => {
    if (!rackId) { setBoxes([]); return; }
    try {
      const res = await boxApi.getByRack(rackId);
      if (res.data.success) setBoxes(res.data.data || []);
    } catch { setBoxes([]); }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'rackId') {
      loadBoxesByRack(value);
      setFormData(prev => ({ ...prev, boxId: '' }));
      setShowModalNewBox(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryId) { toast.error('Please select a category'); return; }
    try {
      const payload = {
        partNumber:     formData.partNumber?.trim()     || null,
        description:    formData.description?.trim()    || null,
        packageType:    formData.packageType?.trim()    || null,
        unitOfMeasure:  formData.unitOfMeasure          || 'PCS',
        manufacturerPn: formData.manufacturerPn?.trim() || null,
        unitPrice:      formData.unitPrice ? parseFloat(formData.unitPrice) : 0,
        hsnCode:        formData.hsnCode?.trim()        || null,
        gstPercent:     formData.gstPercent ? parseFloat(formData.gstPercent) : null,
        minStockLevel:  formData.minStockLevel ? parseInt(formData.minStockLevel) : 10,
        categoryId:     parseInt(formData.categoryId),
        supplierId:     formData.supplierId ? parseInt(formData.supplierId) : null,
        rackId:         formData.rackId ? parseInt(formData.rackId) : null,
        boxId:          formData.boxId  ? parseInt(formData.boxId)  : null,
        remarks:        formData.remarks?.trim() || null
      };
      if (formData.productId) {
        await productApi.update(formData.productId, payload);
        toast.success('Product updated!');
      } else {
        await productApi.create(payload);
        toast.success('Product created!');
      }
      setShowModal(false);
      clearDraft();
      setDraftFound(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (product) => {
    setFormData({
      productId:      product.productId,
      partNumber:     product.partNumber     || '',
      description:    product.description    || '',
      packageType:    product.packageType    || '',
      unitOfMeasure:  product.unitOfMeasure  || 'PCS',
      manufacturerPn: product.manufacturerPn || '',
      unitPrice:      product.unitPrice      || '',
      hsnCode:        product.hsnCode        || '',
      gstPercent:     product.gstPercent     || '',
      minStockLevel:  product.minStockLevel  || 10,
      categoryId:     product.category?.categoryId || '',
      supplierId:     product.supplier?.supplierId || '',
      rackId:         product.rack?.rackId   || '',
      boxId:          product.box?.boxId     || '',
      remarks:        product.remarks        || '',
      isActive:       product.isActive !== false
    });
    if (product.rack?.rackId) loadBoxesByRack(product.rack.rackId);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productApi.delete(id);
      toast.success('Product deleted!');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setBoxes([]);
    setShowModalNewRack(false);
    setShowModalNewBox(false);
    setShowModalRackView(false);
  };

  const handleRestoreDraft = () => {
    if (!draftFound) return;
    setFormData(draftFound.data);
    if (draftFound.data.rackId) loadBoxesByRack(draftFound.data.rackId);
    setDraftFound(null);
    setShowModal(true);
    toast.success('Draft restored!');
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftFound(null);
    setDraftDismissed(true);
    toast.info('Draft discarded');
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const unitPrice  = parseFloat(formData.unitPrice)  || 0;
  const gstPercent = parseFloat(formData.gstPercent) || 0;
  const gstAmount  = unitPrice * gstPercent / 100;
  const priceWithGst = unitPrice + gstAmount;

  const rackColors = ['#4f46e5','#059669','#ea580c','#db2777','#0284c7','#ca8a04','#7c3aed','#0d9488'];
  const getRackColor = (i) => rackColors[i % rackColors.length];

  if (loading) return <div className="loading">Loading products...</div>;

  return (
    <div className="products-page">

      {/* ── Draft Banner ── */}
      {draftFound && !draftDismissed && (
        <div className="prod-draft-banner">
          <FiRotateCw size={16}/>
          <div className="prod-draft-info">
            <span className="prod-draft-title">Unsaved product draft found</span>
            <span className="prod-draft-sub">
              {draftFound.data.description || draftFound.data.partNumber || 'No name'} · Saved {timeAgo(draftFound.savedAt)}
            </span>
          </div>
          <button className="prod-draft-restore" onClick={handleRestoreDraft}>
            <FiRotateCw size={12}/> Restore
          </button>
          <button className="prod-draft-discard" onClick={handleDiscardDraft}>
            <FiX size={12}/> Discard
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Products / Components</h1>
          <p>{filteredProducts.length} of {products.length} products</p>
        </div>
        <div className="page-header-center">
          <div className="header-search-box">
            <FiSearch size={14} className="header-search-icon" />
            <input
              type="text"
              placeholder="Search part #, description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            {searchTerm && (
              <button className="header-search-clear" onClick={() => setSearchTerm('')}>
                <FiX size={13} />
              </button>
            )}
          </div>
          <select className="header-category-filter" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
            ))}
          </select>
        </div>
        <div className="page-header-actions">
          <button className="btn-header-action btn-add-product" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Category</th>
              <th>Part #</th>
              <th>Description</th>
              <th>Package</th>
              <th style={{ width: 70, textAlign: 'center' }}>Stock In</th>
              <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.length > 0 ? pagedProducts.map((product, idx) => (
              <tr key={product.productId}>
                <td className="row-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                <td className="category-cell"><span className="cat-pill">{product.category?.categoryName || '-'}</span></td>
                <td className="part-number">{product.partNumber || '—'}</td>
                <td>{product.description || '—'}</td>
                <td>
                  <span className="badge-package">{product.packageType || '-'}</span>
                  {product.unitOfMeasure && product.unitOfMeasure !== 'PCS' && (
                    <span className="prod-unit-badge" style={{ marginLeft: 4 }}>
                      {product.unitOfMeasure === 'METER' ? '📏 m' :
                       product.unitOfMeasure === 'LITER' ? '🧴 L' :
                       product.unitOfMeasure === 'KG'    ? '⚖ kg' : product.unitOfMeasure}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-icon-stockin" title="Stock In"
                    onClick={() => navigate('/stock-in', { state: { productId: product.productId } })}>
                    <FiShoppingCart size={13}/>
                  </button>
                </td>
                <td className="actions" style={{ textAlign: 'center' }}>
                  <button className="btn-details" title="View Details" onClick={() => setDetailProduct(product)}>
                    <FiInfo size={12}/> Details
                  </button>
                  <button className="btn-icon" title="Edit" onClick={() => handleEdit(product)}><FiEdit2 size={14}/></button>
                  <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(product.productId)}><FiTrash2 size={14}/></button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-state">
                    <FiPackage size={48} />
                    <p>{searchTerm ? `No results for "${searchTerm}"` : 'No products found'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {filteredProducts.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length} products
          </div>
          <div className="pagination-controls">
            <button className="pg-btn" onClick={() => goTo(1)} disabled={safePage === 1}><FiChevronsLeft size={14} /></button>
            <button className="pg-btn" onClick={() => goTo(safePage - 1)} disabled={safePage === 1}><FiChevronLeft size={14} /></button>
            {pageNums().map(p => (
              <button key={p} className={`pg-btn pg-num ${p === safePage ? 'pg-active' : ''}`} onClick={() => goTo(p)}>{p}</button>
            ))}
            <button className="pg-btn" onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages}><FiChevronRight size={14} /></button>
            <button className="pg-btn" onClick={() => goTo(totalPages)} disabled={safePage === totalPages}><FiChevronsRight size={14} /></button>
          </div>
          <div className="pagination-jump">
            <span>Go to</span>
            <input type="number" min="1" max={totalPages}
              onKeyDown={e => { if (e.key === 'Enter') goTo(parseInt(e.target.value)); }}
              placeholder={safePage} />
            <span>of {totalPages}</span>
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>

            <div className="prod-modal-head">
              <h2>{formData.productId ? 'Edit Product' : 'Add New Product'}</h2>
              <div className="prod-modal-head-right">
                <span className="prod-draft-indicator">
                  <FiSave size={11}/> Draft auto-saving
                </span>
                <button className="prod-modal-close" onClick={handleCloseModal}><FiX size={18}/></button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">

                <div className="form-group">
                  <label>Category *</label>
                  <select name="categoryId" value={formData.categoryId} onChange={handleInputChange} required>
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Part Number</label>
                  <input type="text" name="partNumber" value={formData.partNumber} onChange={handleInputChange} placeholder="C1, R1, IC1 (optional)" />
                </div>

                <div className="form-group">
                  <label>Description / Value</label>
                  <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="10uF, 4K7, ESP32 (optional)" />
                </div>

                <div className="form-group">
                  <label>Package</label>
                  <input type="text" name="packageType" value={formData.packageType} onChange={handleInputChange} placeholder="0603, SMD, DIP-8" />
                </div>

                <div className="form-group">
                  <label>Unit of Measure *</label>
                  <div className="prod-unit-pills">
                    {UNIT_OPTIONS.map(u => (
                      <button key={u.value} type="button"
                        className={`prod-unit-pill ${formData.unitOfMeasure === u.value ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, unitOfMeasure: u.value }))}>
                        <span style={{ fontSize: 16 }}>{u.icon}</span>
                        <span>{u.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Manufacturer P/N</label>
                  <input type="text" name="manufacturerPn" value={formData.manufacturerPn} onChange={handleInputChange} placeholder="ESP32-WROOM-32" />
                </div>

                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input type="number" name="unitPrice" value={formData.unitPrice}
                    onChange={handleInputChange} placeholder="0.00" step="0.01" min="0" />
                </div>

                <div className="form-group">
                  <label>GST %</label>
                  <div className="prod-gst-wrap">
                    <div className="prod-gst-pills-row">
                      {GST_OPTIONS.map(g => (
                        <button key={g} type="button"
                          className={`prod-gst-pill ${formData.gstPercent == g ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, gstPercent: g }))}>
                          {g}%
                        </button>
                      ))}
                      <input type="number" name="gstPercent" value={formData.gstPercent}
                        onChange={handleInputChange} placeholder="%" step="0.01" min="0" max="100"
                        className="prod-gst-num" />
                    </div>
                    {unitPrice > 0 && gstPercent > 0 && (
                      <div className="prod-gst-result">
                        ₹{unitPrice.toFixed(2)} + {gstPercent}% = <strong>₹{priceWithGst.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>HSN / SAC Code</label>
                  <input type="text" name="hsnCode" value={formData.hsnCode}
                    onChange={handleInputChange} placeholder="e.g. 85312000" maxLength={20} />
                </div>

                <div className="form-group">
                  <label>Supplier</label>
                  <select name="supplierId" value={formData.supplierId} onChange={handleInputChange}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Min Stock Level</label>
                  <input type="number" name="minStockLevel" value={formData.minStockLevel} onChange={handleInputChange} min="0" />
                </div>

                {/* RACK */}
                <div className="form-group">
                  <label><FiMapPin size={12} style={{ marginRight: 4, color: '#667eea' }}/> Rack</label>
                  <div className="si-rack-row">
                    <select name="rackId" value={formData.rackId} onChange={handleInputChange} className="si-rack-select">
                      <option value="">Select Rack</option>
                      {racks.map(r => <option key={r.rackId} value={r.rackId}>{r.rackNumber} - {r.rackName}</option>)}
                    </select>
                    <button type="button" className="si-icon-btn si-icon-btn-primary"
                      onClick={() => { setShowModalNewRack(!showModalNewRack); setShowModalRackView(false); }}>
                      <FiPlus size={15} />
                    </button>
                    <button type="button" className="si-icon-btn si-icon-btn-secondary"
                      onClick={() => { setShowModalRackView(!showModalRackView); setShowModalNewRack(false); if (!showModalRackView && racks.length > 0) loadViewerBoxes(racks[0]); }}>
                      <FiLayers size={15} />
                    </button>
                  </div>

                  {showModalNewRack && (
                    <div className="inline-create-form">
                      <p className="inline-form-title"><FiLayers size={13} /> Create New Rack</p>
                      <div className="inline-form-grid">
                        <input placeholder="Rack No." value={modalNewRack.rackNumber} onChange={e => setModalNewRack(p => ({ ...p, rackNumber: e.target.value }))} />
                        <input placeholder="Rack Name" value={modalNewRack.rackName} onChange={e => setModalNewRack(p => ({ ...p, rackName: e.target.value }))} />
                        <input placeholder="Location" value={modalNewRack.location} onChange={e => setModalNewRack(p => ({ ...p, location: e.target.value }))} />
                      </div>
                      <div className="inline-form-actions">
                        <button type="button" className="btn-inline-save" onClick={handleModalSaveRack} disabled={savingRack}>{savingRack ? 'Saving...' : 'Save Rack'}</button>
                        <button type="button" className="btn-inline-cancel" onClick={() => setShowModalNewRack(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {showModalRackView && (
                    <div className="rack-viewer">
                      <div className="rack-viewer-tabs">
                        {racks.map((rack, i) => (
                          <button key={rack.rackId} type="button"
                            className={`rack-viewer-tab ${viewerRack?.rackId === rack.rackId ? 'active' : ''}`}
                            style={{ '--tab-color': getRackColor(i) }}
                            onClick={() => loadViewerBoxes(rack)}>
                            {rack.rackNumber}
                          </button>
                        ))}
                      </div>
                      {viewerRack && (
                        <div className="rack-viewer-body">
                          <div className="rack-viewer-title">
                            <FiMapPin size={12} /><strong>{viewerRack.rackName}</strong>
                            {viewerRack.location && <span className="rack-viewer-loc">{viewerRack.location}</span>}
                          </div>
                          <div className="rack-viewer-boxes">
                            {viewerBoxes.length === 0
                              ? <span className="rack-viewer-empty">No boxes</span>
                              : viewerBoxes.map(box => (
                                <div key={box.boxId}
                                  className={`rack-viewer-box ${parseInt(formData.boxId) === box.boxId ? 'selected' : ''}`}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, rackId: viewerRack.rackId, boxId: box.boxId }));
                                    loadBoxesByRack(viewerRack.rackId);
                                    toast.success(`Selected: ${viewerRack.rackName} / ${box.boxLabel}`, { autoClose: 1200 });
                                  }}>
                                  <span className="rack-viewer-box-num">{box.boxNumber}</span>
                                  <span className="rack-viewer-box-label">{box.boxLabel}</span>
                                  {parseInt(formData.boxId) === box.boxId && <span className="rack-viewer-check">✓</span>}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* BOX */}
                <div className="form-group">
                  <label><FiBox size={12} style={{ marginRight: 4, color: '#667eea' }}/> Box</label>
                  <div className="si-rack-row">
                    <select name="boxId" value={formData.boxId} onChange={handleInputChange} className="si-rack-select">
                      <option value="">Select Box</option>
                      {boxes.map(b => <option key={b.boxId} value={b.boxId}>{b.boxNumber} - {b.boxLabel}</option>)}
                    </select>
                    <button type="button" className="si-icon-btn si-icon-btn-primary"
                      disabled={!formData.rackId} onClick={() => setShowModalNewBox(!showModalNewBox)}>
                      <FiPlus size={15} />
                    </button>
                  </div>
                  {showModalNewBox && formData.rackId && (
                    <div className="inline-create-form">
                      <p className="inline-form-title"><FiBox size={13} /> New Box in {racks.find(r => r.rackId === parseInt(formData.rackId))?.rackName}</p>
                      <div className="inline-form-grid">
                        <input placeholder="Box Number" value={modalNewBox.boxNumber} onChange={e => setModalNewBox(p => ({ ...p, boxNumber: e.target.value }))} />
                        <input placeholder="Box Label"  value={modalNewBox.boxLabel}  onChange={e => setModalNewBox(p => ({ ...p, boxLabel: e.target.value }))} />
                      </div>
                      <div className="inline-form-actions">
                        <button type="button" className="btn-inline-save" onClick={handleModalSaveBox} disabled={savingBox}>{savingBox ? 'Saving...' : 'Save Box'}</button>
                        <button type="button" className="btn-inline-cancel" onClick={() => setShowModalNewBox(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>Remarks</label>
                  <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} rows="2" />
                </div>

                <div className="form-group checkbox-group">
                  <label><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} /> Active</label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-primary">{formData.productId ? 'Update' : 'Create'} Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailProduct && (
        <div className="modal-overlay" onClick={() => setDetailProduct(null)}>
          <div className="modal-content prod-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="prod-modal-head">
              <h2><FiPackage size={18} style={{ marginRight: 8, color: '#667eea' }}/>{detailProduct.description || detailProduct.partNumber || 'Product Details'}</h2>
              <button className="prod-modal-close" onClick={() => setDetailProduct(null)}><FiX size={18}/></button>
            </div>

            <div className="prod-detail-grid">
              <div className="prod-detail-section">
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Category</span>
                  <span><span className="cat-pill">{detailProduct.category?.categoryName || '—'}</span></span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Part Number</span>
                  <span className="prod-detail-mono">{detailProduct.partNumber || '—'}</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Description</span>
                  <span>{detailProduct.description || '—'}</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Package</span>
                  <span><span className="badge-package">{detailProduct.packageType || '—'}</span></span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Unit of Measure</span>
                  <span>
                    {UNIT_OPTIONS.find(u => u.value === detailProduct.unitOfMeasure)
                      ? `${UNIT_OPTIONS.find(u => u.value === detailProduct.unitOfMeasure).icon} ${UNIT_OPTIONS.find(u => u.value === detailProduct.unitOfMeasure).label}`
                      : detailProduct.unitOfMeasure || 'PCS'}
                  </span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Manufacturer P/N</span>
                  <span className="prod-detail-mono">{detailProduct.manufacturerPn || '—'}</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Supplier</span>
                  <span>{detailProduct.supplier?.supplierName || '—'}</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Rack / Box</span>
                  <span>{detailProduct.rack?.rackName || '—'} / {detailProduct.box?.boxLabel || '—'}</span>
                </div>
              </div>

              <div className="prod-detail-section">
                <div className="prod-detail-price-card">
                  <div className="prod-detail-price-row">
                    <span><FiDollarSign size={13}/> Unit Price</span>
                    <strong>₹{parseFloat(detailProduct.unitPrice || 0).toFixed(2)}</strong>
                  </div>
                  {detailProduct.gstPercent != null && (
                    <>
                      <div className="prod-detail-price-row">
                        <span><FiTag size={13}/> GST ({detailProduct.gstPercent}%)</span>
                        <span>₹{(parseFloat(detailProduct.unitPrice || 0) * parseFloat(detailProduct.gstPercent) / 100).toFixed(2)}</span>
                      </div>
                      <div className="prod-detail-price-row prod-detail-price-total">
                        <span>Price with GST</span>
                        <strong>₹{(parseFloat(detailProduct.unitPrice || 0) * (1 + parseFloat(detailProduct.gstPercent) / 100)).toFixed(2)}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="prod-detail-row" style={{ marginTop: 12 }}>
                  <span className="prod-detail-label"><FiHash size={12}/> HSN / SAC Code</span>
                  <span className="prod-detail-mono">{detailProduct.hsnCode || '—'}</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">GST %</span>
                  {detailProduct.gstPercent != null
                    ? <span className="prod-gst-badge">{detailProduct.gstPercent}%</span>
                    : <span>—</span>}
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Min Stock Level</span>
                  <span>{detailProduct.minStockLevel ?? '—'}</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Status</span>
                  <span style={{ color: detailProduct.isActive !== false ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {detailProduct.isActive !== false ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
                {detailProduct.remarks && (
                  <div className="prod-detail-row">
                    <span className="prod-detail-label">Remarks</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{detailProduct.remarks}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="prod-detail-footer">
              <button className="btn-secondary" onClick={() => setDetailProduct(null)}>Close</button>
              <button className="btn-primary" onClick={() => { handleEdit(detailProduct); setDetailProduct(null); }}>
                <FiEdit2 size={13}/> Edit Product
              </button>
              <button className="btn-icon-stockin" style={{ padding: '8px 16px' }}
                onClick={() => { navigate('/stock-in', { state: { productId: detailProduct.productId } }); setDetailProduct(null); }}>
                <FiShoppingCart size={13}/> Stock In
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;