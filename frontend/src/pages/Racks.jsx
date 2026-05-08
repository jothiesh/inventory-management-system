import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { rackApi } from '../api/rackApi';
import { boxApi } from '../api/boxApi';
import { toast } from 'react-toastify';
import {
  FiPlus, FiEdit2, FiTrash2, FiBox, FiGrid, FiMap,
  FiLayers, FiSearch, FiChevronRight, FiX, FiPackage,
  FiUser, FiClock, FiHash, FiDollarSign, FiTrendingDown,
  FiTrendingUp, FiInfo, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { format } from 'date-fns';
import RackModal from '../components/racks/RackModal';
import BoxModal from '../components/racks/BoxModal';
import './Racks.css';

// ─── constants ──────────────────────────────────────────────
const RACK_COLORS = [
  { bg: '#eef2ff', border: '#818cf8', accent: '#4f46e5' },
  { bg: '#ecfdf5', border: '#6ee7b7', accent: '#059669' },
  { bg: '#fff7ed', border: '#fdba74', accent: '#ea580c' },
  { bg: '#fdf2f8', border: '#f9a8d4', accent: '#db2777' },
  { bg: '#f0f9ff', border: '#7dd3fc', accent: '#0284c7' },
  { bg: '#fefce8', border: '#fde047', accent: '#ca8a04' },
  { bg: '#faf5ff', border: '#c4b5fd', accent: '#7c3aed' },
  { bg: '#f0fdfa', border: '#5eead4', accent: '#0d9488' },
];

const BOXES_PER_SHELF = 4;
const getRackColor = (i) => RACK_COLORS[(i >= 0 ? i : 0) % RACK_COLORS.length];
const fmtDate = (d) => { if (!d) return '—'; try { return format(new Date(d), 'dd MMM yyyy HH:mm'); } catch { return d; } };
const fmtDateShort = (d) => { if (!d) return '—'; try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; } };

// ─── sub-components (kept inside same file for drop-in use) ─

const LoadingState = () => (
  <div className="racks-loading">
    <div className="loading-shelf">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="loading-shelf-row">
          {[...Array(4)].map((_, j) => (
            <div
              key={j}
              className="loading-box-placeholder"
              style={{ animationDelay: `${(i * 4 + j) * 0.1}s` }}
            />
          ))}
        </div>
      ))}
    </div>
    <p>Loading warehouse…</p>
  </div>
);

const TopBar = ({ rackCount, boxCount, onCreateRack }) => (
  <div className="racks-topbar">
    <div className="topbar-left">
      <div className="topbar-icon"><FiLayers /></div>
      <div>
        <h1>Warehouse Layout</h1>
        <p className="topbar-subtitle">
          {rackCount} rack{rackCount !== 1 ? 's' : ''} · {boxCount} box{boxCount !== 1 ? 'es' : ''} in view
        </p>
      </div>
    </div>
    <div className="topbar-actions">
      <button className="rack-btn rack-btn-primary" onClick={onCreateRack}>
        <FiPlus /> New Rack
      </button>
    </div>
  </div>
);

const RackNavigator = ({ racks, selected, search, onSearch, onSelect, onEdit, onDelete, onCreate }) => (
  <aside className="rack-navigator">
    <div className="nav-search-wrap">
      <FiSearch className="nav-search-icon" />
      <input
        type="text"
        placeholder="Find rack…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="nav-search-input"
      />
    </div>
    <div className="nav-rack-list">
      {racks.length === 0 ? (
        <div className="nav-empty">
          <span>🗄️</span>
          <p>No racks found</p>
          <button className="rack-btn rack-btn-primary rack-btn-sm" onClick={onCreate}>
            <FiPlus /> Add Rack
          </button>
        </div>
      ) : (
        racks.map((rack, idx) => {
          const c = getRackColor(idx);
          const isActive = selected?.rackId === rack.rackId;
          return (
            <div
              key={rack.rackId}
              className={`nav-rack-card ${isActive ? 'nav-rack-active' : ''}`}
              onClick={() => onSelect(rack)}
              style={{
                '--rack-bg': isActive ? c.bg : 'transparent',
                '--rack-accent': c.accent,
                '--rack-border': c.border,
                animationDelay: `${idx * 0.05}s`,
              }}
            >
              <div className="nav-rack-indicator" style={{ background: c.accent }} />
              <div className="nav-rack-info">
                <span className="nav-rack-number">{rack.rackNumber}</span>
                <span className="nav-rack-name">{rack.rackName || 'Unnamed'}</span>
                {rack.location && (
                  <span className="nav-rack-location">
                    <FiMap size={10} /> {rack.location}
                  </span>
                )}
              </div>
              <div className="nav-rack-actions">
                <button
                  className="nav-action-btn"
                  onClick={(e) => { e.stopPropagation(); onEdit(rack); }}
                  aria-label="Edit rack"
                >
                  <FiEdit2 size={13} />
                </button>
                <button
                  className="nav-action-btn nav-action-danger"
                  onClick={(e) => { e.stopPropagation(); onDelete(rack.rackId); }}
                  aria-label="Delete rack"
                >
                  <FiTrash2 size={13} />
                </button>
              </div>
              <FiChevronRight className="nav-rack-chevron" />
            </div>
          );
        })
      )}
    </div>
  </aside>
);

const EmptyRackState = () => (
  <div className="content-empty-state">
    <div className="empty-warehouse-icon">
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
        <rect x="10" y="30" width="100" height="65" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="20" y="10" width="80" height="25" rx="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="25" y="42" width="28" height="20" rx="2" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
        <rect x="60" y="42" width="28" height="20" rx="2" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />
        <rect x="25" y="70" width="28" height="20" rx="2" fill="#fef3c7" stroke="#fde68a" strokeWidth="1.5" />
        <rect x="60" y="70" width="28" height="20" rx="2" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1.5" />
      </svg>
    </div>
    <h2>Select a Rack</h2>
    <p>Choose a rack from the navigator to view and manage its boxes</p>
  </div>
);

const ShelfBox = ({ box, isSelected, delay, onClick, onEdit, onDelete }) => (
  <div
    className={`shelf-box ${isSelected ? 'shelf-box-selected' : ''}`}
    style={{ animationDelay: `${delay}s` }}
    onClick={onClick}
  >
    <div className="shelf-box-inner">
      <div className="shelf-box-face front">
        <span className="shelf-box-number">{box.boxNumber}</span>
        <span className="shelf-box-label">{box.boxLabel || '—'}</span>
      </div>
      <div className="shelf-box-actions">
        <button onClick={(e) => { e.stopPropagation(); onEdit(box); }} aria-label="Edit box">
          <FiEdit2 size={12} />
        </button>
        <button
          className="danger"
          onClick={(e) => { e.stopPropagation(); onDelete(box.boxId); }}
          aria-label="Delete box"
        >
          <FiTrash2 size={12} />
        </button>
      </div>
    </div>
  </div>
);

const ShelfView = ({ boxes, selectedBox, onBoxClick, onEditBox, onDeleteBox, onCreateBox }) => {
  const shelfCount = Math.ceil(boxes.length / BOXES_PER_SHELF);
  return (
    <div className="shelf-container">
      <div className="shelf-frame">
        {Array.from({ length: shelfCount }).map((_, ri) => {
          const rowBoxes = boxes.slice(ri * BOXES_PER_SHELF, (ri + 1) * BOXES_PER_SHELF);
          const emptySlots = BOXES_PER_SHELF - rowBoxes.length;
          return (
            <div key={ri} className="shelf-row" style={{ animationDelay: `${ri * 0.12}s` }}>
              <div className="shelf-row-label">Shelf {ri + 1}</div>
              <div className="shelf-row-boxes">
                {rowBoxes.map((box, bi) => (
                  <ShelfBox
                    key={box.boxId}
                    box={box}
                    isSelected={selectedBox?.boxId === box.boxId}
                    delay={(ri * BOXES_PER_SHELF + bi) * 0.06}
                    onClick={() => onBoxClick(box)}
                    onEdit={onEditBox}
                    onDelete={onDeleteBox}
                  />
                ))}
                {emptySlots > 0 &&
                  [...Array(emptySlots)].map((_, i) => (
                    <div
                      key={`e-${i}`}
                      className="shelf-box shelf-box-empty"
                      onClick={onCreateBox}
                    >
                      <FiPlus size={18} />
                    </div>
                  ))}
              </div>
              <div className="shelf-plank" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GridView = ({ boxes, selectedBox, rackNumber, onBoxClick, onEditBox, onDeleteBox, onCreateBox }) => (
  <div className="box-grid-v2">
    {boxes.map((box, idx) => (
      <div
        key={box.boxId}
        className={`grid-box-card ${selectedBox?.boxId === box.boxId ? 'grid-box-selected' : ''}`}
        style={{ animationDelay: `${idx * 0.04}s` }}
        onClick={() => onBoxClick(box)}
      >
        <div className="grid-box-top">
          <div className="grid-box-icon-wrap"><FiBox size={22} /></div>
          <div className="grid-box-menu">
            <button onClick={(e) => { e.stopPropagation(); onEditBox(box); }} aria-label="Edit box">
              <FiEdit2 size={13} />
            </button>
            <button
              className="danger"
              onClick={(e) => { e.stopPropagation(); onDeleteBox(box.boxId); }}
              aria-label="Delete box"
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        </div>
        <h4 className="grid-box-number">{box.boxNumber}</h4>
        <p className="grid-box-label">{box.boxLabel || 'No label'}</p>
        <div className="grid-box-rack-tag">{rackNumber}</div>
      </div>
    ))}
    <div className="grid-box-card grid-box-add" onClick={onCreateBox}>
      <FiPlus size={28} />
      <span>Add Box</span>
    </div>
  </div>
);

const ProductCard = ({ item, isExpanded, onToggle }) => {
  const product = item.product || item;
  const lot = item.lot || null;
  const qty = parseFloat(item.availableQuantity || item.quantity || item.remainingQuantity || 0);
  const price = parseFloat(lot?.purchasePrice || item.purchasePrice || 0);
  const handler = item.lastHandledBy || item.createdBy || item.performedBy;
  const handlerName = typeof handler === 'object'
    ? (handler?.fullName || handler?.username || '—')
    : handler;

  const stockStatus =
    qty <= 0 ? { cls: 'out', label: 'Out of Stock' } :
    product.minStockLevel && qty <= product.minStockLevel ? { cls: 'low', label: 'Low Stock' } :
    { cls: 'ok', label: 'In Stock' };

  return (
    <div className={`drawer-product-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="product-card-header" onClick={onToggle}>
        <div className="product-card-left">
          <span className="product-pn">{product.partNumber || item.partNumber || 'N/A'}</span>
          <span className="product-desc">{product.description || item.description || ''}</span>
        </div>
        <div className="product-card-right">
          <span className="product-qty">{qty.toFixed(0)}<small> qty</small></span>
          {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </div>
      </div>
      {isExpanded && (
        <div className="product-card-details">
          <DetailRow icon={<FiGrid size={12} />} label="Category">
            {product.category?.categoryName || item.categoryName || 'Uncategorized'}
          </DetailRow>
          {(lot?.lotNumber || item.lotNumber) && (
            <DetailRow icon={<FiHash size={12} />} label="Lot" valueClass="lot-tag">
              {lot?.lotNumber || item.lotNumber}
            </DetailRow>
          )}
          {price > 0 && (
            <>
              <DetailRow icon={<FiDollarSign size={12} />} label="Price" valueClass="price">
                ₹{price.toFixed(2)}
              </DetailRow>
              <DetailRow icon={<FiTrendingUp size={12} />} label="Value" valueClass="price">
                ₹{(qty * price).toFixed(2)}
              </DetailRow>
            </>
          )}
          {(lot?.supplier?.supplierName || item.supplierName || lot?.supplierName) && (
            <DetailRow icon={<FiUser size={12} />} label="Supplier">
              {lot?.supplier?.supplierName || item.supplierName || lot?.supplierName}
            </DetailRow>
          )}
          {(lot?.purchaseDate || item.purchaseDate) && (
            <DetailRow icon={<FiClock size={12} />} label="Purchased">
              {fmtDateShort(lot?.purchaseDate || item.purchaseDate)}
            </DetailRow>
          )}
          {(item.lastStockInDate || item.createdAt || lot?.createdAt) && (
            <DetailRow icon={<FiTrendingUp size={12} />} label="Last In">
              {fmtDate(item.lastStockInDate || item.createdAt || lot?.createdAt)}
            </DetailRow>
          )}
          {(item.lastStockOutDate || item.lastMovementDate) && (
            <DetailRow icon={<FiTrendingDown size={12} />} label="Last Out">
              {fmtDate(item.lastStockOutDate || item.lastMovementDate)}
            </DetailRow>
          )}
          {handlerName && (
            <DetailRow icon={<FiUser size={12} />} label="Handled By" valueClass="user-tag">
              {handlerName}
            </DetailRow>
          )}
          {product.minStockLevel && (
            <DetailRow icon={<FiInfo size={12} />} label="Min Level">
              {product.minStockLevel}
            </DetailRow>
          )}
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className={`detail-value status-tag ${stockStatus.cls}`}>{stockStatus.label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon, label, valueClass = '', children }) => (
  <div className="detail-row">
    <span className="detail-label">{icon} {label}</span>
    <span className={`detail-value ${valueClass}`}>{children}</span>
  </div>
);

const BoxDetailDrawer = ({ box, rack, products, loading, expandedIdx, onExpand, onClose }) => (
  <aside className="box-detail-drawer">
    <div className="drawer-header">
      <div className="drawer-header-info">
        <div className="drawer-box-badge"><FiBox size={16} /></div>
        <div>
          <h3>{box.boxNumber}</h3>
          <span className="drawer-subtitle">{box.boxLabel || 'No label'}</span>
        </div>
      </div>
      <button className="drawer-close" onClick={onClose} aria-label="Close drawer">
        <FiX size={18} />
      </button>
    </div>

    <div className="drawer-info-bar">
      <div className="drawer-info-item">
        <FiLayers size={13} /><span>Rack: <strong>{rack?.rackNumber}</strong></span>
      </div>
      <div className="drawer-info-item">
        <FiMap size={13} /><span>Location: <strong>{rack?.location || '—'}</strong></span>
      </div>
      <div className="drawer-info-item">
        <FiPackage size={13} /><span>Items: <strong>{products.length}</strong></span>
      </div>
    </div>

    <div className="drawer-section-title">
      <FiPackage size={14} /><span>Products in this Box</span>
    </div>

    <div className="drawer-products">
      {loading ? (
        <div className="drawer-loading">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="drawer-skeleton" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="drawer-empty">
          <FiInfo size={32} />
          <p>No products stored in this box yet</p>
          <span>Stock items into this location via Stock In</span>
        </div>
      ) : (
        products.map((item, idx) => (
          <ProductCard
            key={idx}
            item={item}
            isExpanded={expandedIdx === idx}
            onToggle={() => onExpand(expandedIdx === idx ? null : idx)}
          />
        ))
      )}
    </div>

    <div className="drawer-section-title">
      <FiLayers size={14} /><span>Rack Details</span>
    </div>
    <div className="drawer-rack-details">
      <div className="rack-detail-row"><span>Rack Number</span><strong>{rack?.rackNumber || '—'}</strong></div>
      <div className="rack-detail-row"><span>Rack Name</span><strong>{rack?.rackName || '—'}</strong></div>
      <div className="rack-detail-row"><span>Location</span><strong>{rack?.location || '—'}</strong></div>
      <div className="rack-detail-row">
        <span>Status</span>
        <strong className="rack-status-active">
          {rack?.isActive !== false ? 'Active' : 'Inactive'}
        </strong>
      </div>
      {rack?.createdAt && (
        <div className="rack-detail-row"><span>Created</span><strong>{fmtDateShort(rack.createdAt)}</strong></div>
      )}
    </div>
  </aside>
);

// ─── main component ────────────────────────────────────────

const Racks = () => {
  const [racks, setRacks] = useState([]);
  const [selectedRack, setSelectedRack] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showRackModal, setShowRackModal] = useState(false);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [editingBox, setEditingBox] = useState(null);

  const [viewMode, setViewMode] = useState('shelf');
  const [searchQuery, setSearchQuery] = useState('');
  const [rackSearch, setRackSearch] = useState('');

  const [selectedBox, setSelectedBox] = useState(null);
  const [boxProducts, setBoxProducts] = useState([]);
  const [boxLoading, setBoxLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);

  // ─── data loading ───────────────────────────────────────

  const loadRacks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await rackApi.getAll();
      const rackData = response.data?.data || response.data || [];
      setRacks(rackData);
      if (rackData.length > 0 && !selectedRack) {
        await handleRackSelect(rackData[0]);
      }
    } catch {
      toast.error('Failed to load racks');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadRacks(); }, [loadRacks]);

  const handleRackSelect = async (rack) => {
    setSelectedRack(rack);
    setSelectedBox(null);
    setSearchQuery('');
    try {
      const response = await boxApi.getByRack(rack.rackId);
      setBoxes(response.data?.data || response.data || []);
    } catch {
      toast.error('Failed to load boxes');
    }
  };

  const handleBoxClick = async (box) => {
    if (selectedBox?.boxId === box.boxId) {
      setSelectedBox(null);
      return;
    }
    setSelectedBox(box);
    setBoxLoading(true);
    setBoxProducts([]);
    setExpandedProduct(null);

    try {
      const fetcher = boxApi.getProducts || boxApi.getStock;
      if (!fetcher) {
        setBoxProducts([]);
        return;
      }
      const res = await fetcher(box.boxId);
      const products = res?.data?.data || res?.data || [];
      setBoxProducts(Array.isArray(products) ? products : []);
    } catch {
      setBoxProducts([]);
    } finally {
      setBoxLoading(false);
    }
  };

  // ─── rack handlers ──────────────────────────────────────

  const handleCreateRack = () => { setEditingRack(null); setShowRackModal(true); };
  const handleEditRack = (rack) => { setEditingRack(rack); setShowRackModal(true); };
  const handleDeleteRack = async (id) => {
    if (!window.confirm('Delete this rack and all its boxes?')) return;
    try {
      await rackApi.delete(id);
      toast.success('Rack deleted');
      if (selectedRack?.rackId === id) {
        setSelectedRack(null);
        setSelectedBox(null);
      }
      loadRacks();
    } catch {
      toast.error('Failed to delete rack');
    }
  };
  const handleRackModalClose = (refresh) => {
    setShowRackModal(false);
    setEditingRack(null);
    if (refresh) loadRacks();
  };

  // ─── box handlers ───────────────────────────────────────

  const handleCreateBox = () => {
    if (!selectedRack) { toast.error('Select a rack first'); return; }
    setEditingBox(null);
    setShowBoxModal(true);
  };
  const handleEditBox = (box) => { setEditingBox(box); setShowBoxModal(true); };
  const handleDeleteBox = async (id) => {
    if (!window.confirm('Delete this box?')) return;
    try {
      await boxApi.delete(id);
      toast.success('Box deleted');
      setSelectedBox(null);
      handleRackSelect(selectedRack);
    } catch {
      toast.error('Failed to delete box');
    }
  };
  const handleBoxModalClose = (refresh) => {
    setShowBoxModal(false);
    setEditingBox(null);
    if (refresh && selectedRack) handleRackSelect(selectedRack);
  };

  // ─── derived state ──────────────────────────────────────

  const filteredRacks = useMemo(() => {
    if (!rackSearch) return racks;
    const q = rackSearch.toLowerCase();
    return racks.filter(r =>
      (r.rackNumber || '').toLowerCase().includes(q) ||
      (r.rackName || '').toLowerCase().includes(q) ||
      (r.location || '').toLowerCase().includes(q)
    );
  }, [racks, rackSearch]);

  const filteredBoxes = useMemo(() => {
    if (!searchQuery) return boxes;
    const q = searchQuery.toLowerCase();
    return boxes.filter(b =>
      (b.boxNumber || '').toLowerCase().includes(q) ||
      (b.boxLabel || '').toLowerCase().includes(q)
    );
  }, [boxes, searchQuery]);

  const currentColor = useMemo(() => {
    const idx = filteredRacks.indexOf(selectedRack);
    return getRackColor(idx >= 0 ? idx : 0);
  }, [filteredRacks, selectedRack]);

  // ─── render ─────────────────────────────────────────────

  if (loading) return <LoadingState />;

  return (
    <div className="racks-page-v2">
      <TopBar
        rackCount={racks.length}
        boxCount={boxes.length}
        onCreateRack={handleCreateRack}
      />

      <div className={`racks-main-layout ${selectedBox ? 'drawer-open' : ''}`}>
        <RackNavigator
          racks={filteredRacks}
          selected={selectedRack}
          search={rackSearch}
          onSearch={setRackSearch}
          onSelect={handleRackSelect}
          onEdit={handleEditRack}
          onDelete={handleDeleteRack}
          onCreate={handleCreateRack}
        />

        <main className="rack-content-area">
          {!selectedRack ? (
            <EmptyRackState />
          ) : (
            <>
              <div className="rack-content-header">
                <div className="rack-header-left">
                  <div className="rack-header-badge" style={{ background: currentColor.accent }}>
                    {selectedRack.rackNumber}
                  </div>
                  <div>
                    <h2>{selectedRack.rackName || selectedRack.rackNumber}</h2>
                    <div className="rack-header-meta">
                      {selectedRack.location && (
                        <span><FiMap size={12} /> {selectedRack.location}</span>
                      )}
                      <span>
                        <FiBox size={12} /> {filteredBoxes.length} box{filteredBoxes.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rack-header-right">
                  <div className="box-search-wrap">
                    <FiSearch size={14} />
                    <input
                      type="text"
                      placeholder="Search boxes…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="view-toggle">
                    <button
                      className={`toggle-btn ${viewMode === 'shelf' ? 'active' : ''}`}
                      onClick={() => setViewMode('shelf')}
                      aria-label="Shelf view"
                    >
                      <FiLayers size={16} />
                    </button>
                    <button
                      className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                    >
                      <FiGrid size={16} />
                    </button>
                  </div>
                  <button className="rack-btn rack-btn-primary rack-btn-sm" onClick={handleCreateBox}>
                    <FiPlus /> Add Box
                  </button>
                </div>
              </div>

              {filteredBoxes.length === 0 ? (
                <div className="content-empty-state small">
                  <span className="empty-box-icon">📦</span>
                  <h3>No Boxes Yet</h3>
                  <p>This rack is empty. Add boxes to organize your inventory.</p>
                  <button className="rack-btn rack-btn-primary" onClick={handleCreateBox}>
                    <FiPlus /> Add First Box
                  </button>
                </div>
              ) : viewMode === 'shelf' ? (
                <ShelfView
                  boxes={filteredBoxes}
                  selectedBox={selectedBox}
                  onBoxClick={handleBoxClick}
                  onEditBox={handleEditBox}
                  onDeleteBox={handleDeleteBox}
                  onCreateBox={handleCreateBox}
                />
              ) : (
                <GridView
                  boxes={filteredBoxes}
                  selectedBox={selectedBox}
                  rackNumber={selectedRack.rackNumber}
                  onBoxClick={handleBoxClick}
                  onEditBox={handleEditBox}
                  onDeleteBox={handleDeleteBox}
                  onCreateBox={handleCreateBox}
                />
              )}
            </>
          )}
        </main>

        {selectedBox && (
          <BoxDetailDrawer
            box={selectedBox}
            rack={selectedRack}
            products={boxProducts}
            loading={boxLoading}
            expandedIdx={expandedProduct}
            onExpand={setExpandedProduct}
            onClose={() => setSelectedBox(null)}
          />
        )}
      </div>

      {showRackModal && <RackModal rack={editingRack} onClose={handleRackModalClose} />}
      {showBoxModal && (
        <BoxModal
          box={editingBox}
          rackId={selectedRack?.rackId}
          onClose={handleBoxModalClose}
        />
      )}
    </div>
  );
};

export default Racks;