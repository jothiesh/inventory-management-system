import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { stockApi } from '../api/stockApi';
import { toast } from 'react-toastify';
import {
  FiSearch, FiEye, FiPackage, FiAlertTriangle, FiCheckCircle, FiXCircle,
  FiBox, FiBarChart2, FiRefreshCw, FiX, FiChevronDown, FiChevronUp,
  FiArrowUp, FiArrowDown, FiMinus, FiGrid, FiList, FiChevronLeft,
  FiChevronRight, FiDownload, FiPrinter, FiTrendingDown, FiClock,
  FiMapPin, FiHash, FiDollarSign, FiLayers
} from 'react-icons/fi';
import StockDetailsModal from '../components/stock/StockDetailsModal';
import './CurrentStock.css';

// ─── constants ──────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'partNumber', label: 'Part Number' },
  { key: 'totalStock', label: 'Stock Qty' },
  { key: 'status',     label: 'Status' },
  { key: 'category',   label: 'Category' },
  { key: 'value',      label: 'Value' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Pleasant pastel palette for category badges (auto-assigned by string hash)
const CATEGORY_COLORS = [
  { bg: '#dbeafe', fg: '#1e40af' },
  { bg: '#fce7f3', fg: '#9f1239' },
  { bg: '#dcfce7', fg: '#166534' },
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#ede9fe', fg: '#5b21b6' },
  { bg: '#cffafe', fg: '#155e75' },
  { bg: '#ffe4e6', fg: '#9f1239' },
  { bg: '#f0fdfa', fg: '#0f766e' },
];

const hashString = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getCategoryColor = (name) =>
  CATEGORY_COLORS[hashString(name) % CATEGORY_COLORS.length];

// ─── helpers ────────────────────────────────────────────────

const getStockStatus = (stock, product) => {
  if (stock === 0)
    return { label: 'Out of Stock', key: 'danger',  icon: FiXCircle,       order: 0 };
  if (product.minStockLevel && stock <= parseFloat(product.minStockLevel))
    return { label: 'Low Stock',    key: 'warning', icon: FiAlertTriangle, order: 1 };
  return   { label: 'In Stock',     key: 'success', icon: FiCheckCircle,   order: 2 };
};

const getCategoryName = (product) => product?.category?.categoryName || 'Uncategorized';

const getLotAvgPrice = (lots) =>
  lots.length > 0
    ? lots.reduce((s, l) => s + parseFloat(l.purchasePrice || 0), 0) / lots.length
    : 0;

const formatINR = (n) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
};

const exportToCsv = (rows) => {
  const headers = ['Part Number', 'Description', 'Category', 'Package', 'Stock Qty',
                   'Lots', 'Min Level', 'Value', 'Status'];
  const escapeCsv = (val) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(item => {
      const status = getStockStatus(item.totalStock, item.product);
      return [
        item.product.partNumber || '',
        item.product.description || '',
        getCategoryName(item.product),
        item.product.packageType || '',
        item.totalStock,
        item.lots.length,
        item.product.minStockLevel || '',
        item.value.toFixed(2),
        status.label,
      ].map(escapeCsv).join(',');
    })
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `current-stock-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── sub-components ─────────────────────────────────────────

const LoadingState = () => (
  <div className="cs-loading">
    <div className="cs-loading-grid">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="cs-loading-card" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
    <p>Loading stock data…</p>
  </div>
);

const StatCard = ({ icon: Icon, value, label, variant, onClick, active }) => (
  <button
    className={`cs-stat cs-stat-${variant} ${active ? 'cs-stat-active' : ''}`}
    onClick={onClick}
    type="button"
  >
    <div className="cs-stat-icon"><Icon size={18} /></div>
    <div className="cs-stat-body">
      <span className="cs-stat-val">{value}</span>
      <span className="cs-stat-lbl">{label}</span>
    </div>
    <div className="cs-stat-glow" />
  </button>
);

const StatusBadge = ({ status }) => {
  const Icon = status.icon;
  return (
    <span className={`cs-status-badge cs-status-${status.key}`}>
      <Icon size={11} /> {status.label}
    </span>
  );
};

const CategoryBadge = ({ name }) => {
  const c = getCategoryColor(name);
  return (
    <span className="cs-cat-badge" style={{ background: c.bg, color: c.fg }}>
      {name}
    </span>
  );
};

const StockProgressBar = ({ qty, minLevel, statusKey }) => {
  if (!minLevel) return null;
  const min = parseFloat(minLevel);
  const pct = Math.min(100, (qty / Math.max(min, 1)) * 100);
  return (
    <div className="cs-mini-progress">
      <div className={`cs-mini-progress-fill cs-progress-${statusKey}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const ExpandedRow = ({ item, onViewDetails }) => {
  const product = item.product;
  const status = getStockStatus(item.totalStock, product);
  const min = product.minStockLevel ? parseFloat(product.minStockLevel) : null;
  const pct = min ? Math.min(100, Math.round((item.totalStock / Math.max(min, 1)) * 100)) : null;

  return (
    <tr className="cs-expanded-row">
      <td colSpan={11}>
        <div className="cs-expanded-content">
          <div className="cs-expanded-grid">
            <div className="cs-info-block">
              <div className="cs-info-block-title"><FiHash size={12} /> Part Info</div>
              <div className="cs-info-row"><span>Manufacturer PN</span><strong>{product.manufacturerPn || '—'}</strong></div>
              <div className="cs-info-row"><span>Description</span><strong>{product.description || '—'}</strong></div>
              <div className="cs-info-row"><span>Package</span><strong>{product.packageType || '—'}</strong></div>
            </div>

            <div className="cs-info-block">
              <div className="cs-info-block-title"><FiMapPin size={12} /> Location</div>
              <div className="cs-info-row"><span>Rack</span><strong>{product.rack?.rackName || '—'}</strong></div>
              <div className="cs-info-row"><span>Box</span><strong>{product.box?.boxLabel || '—'}</strong></div>
              <div className="cs-info-row"><span>Supplier</span><strong>{product.supplier?.supplierName || '—'}</strong></div>
            </div>

            <div className="cs-info-block">
              <div className="cs-info-block-title"><FiBarChart2 size={12} /> Stock Health</div>
              {pct !== null ? (
                <>
                  <div className="cs-health-meter">
                    <div className="cs-health-meter-track">
                      <div className={`cs-health-meter-fill cs-progress-${status.key}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="cs-health-meter-pct">{pct}%</span>
                  </div>
                  <div className="cs-info-row"><span>Min Level</span><strong>{min}</strong></div>
                  <div className="cs-info-row"><span>Current</span><strong>{item.totalStock.toFixed(2)}</strong></div>
                </>
              ) : (
                <p className="cs-info-muted">No min level set</p>
              )}
            </div>

            <div className="cs-info-block cs-info-block-accent">
              <div className="cs-info-block-title"><FiDollarSign size={12} /> Value</div>
              <div className="cs-value-display">{item.value > 0 ? `₹${item.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</div>
              <div className="cs-info-row"><span>Lots</span><strong>{item.lots.length}</strong></div>
              <button className="cs-btn-details cs-btn-details-full" onClick={() => onViewDetails(item)}>
                <FiEye size={13} /> Full Details
              </button>
            </div>
          </div>

          {item.lots.length > 0 && (
            <div className="cs-lots-strip">
              <div className="cs-lots-strip-title"><FiClock size={12} /> Recent Lots</div>
              <div className="cs-lots-strip-items">
                {item.lots.slice(0, 5).map((lot, i) => (
                  <div key={i} className="cs-lot-chip" style={{ animationDelay: `${i * 0.05}s` }}>
                    <span className="cs-lot-chip-qty">{parseFloat(lot.quantity || 0).toFixed(0)}</span>
                    <span className="cs-lot-chip-price">₹{parseFloat(lot.purchasePrice || 0).toFixed(2)}</span>
                    {lot.purchaseDate && (
                      <span className="cs-lot-chip-date">{lot.purchaseDate.split('T')[0]}</span>
                    )}
                  </div>
                ))}
                {item.lots.length > 5 && (
                  <div className="cs-lot-chip cs-lot-chip-more">+{item.lots.length - 5}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

const StockCard = ({ item, isExpanded, onToggle, onViewDetails, animDelay }) => {
  const status = getStockStatus(item.totalStock, item.product);
  const StatusIcon = status.icon;
  return (
    <div
      className={`cs-stock-card cs-stock-card-${status.key} ${isExpanded ? 'cs-stock-card-expanded' : ''}`}
      onClick={onToggle}
      style={{ animationDelay: `${animDelay}s` }}
    >
      <div className="cs-sc-strip" />
      <div className="cs-sc-top">
        <span className="cs-part-num">{item.product.partNumber || '—'}</span>
        <span className={`cs-status-badge cs-status-${status.key}`}>
          <StatusIcon size={11} /> {status.label}
        </span>
      </div>
      <p className="cs-sc-desc">{item.product.description || '—'}</p>
      <div className="cs-sc-row">
        <CategoryBadge name={getCategoryName(item.product)} />
        {item.product.packageType && <span className="cs-pkg">{item.product.packageType}</span>}
      </div>
      <div className="cs-sc-stats">
        <div className="cs-sc-stat">
          <span className="cs-sc-stat-lbl">Qty</span>
          <span className={`cs-qty-badge cs-qty-${status.key}`}>{item.totalStock.toFixed(2)}</span>
        </div>
        <div className="cs-sc-stat">
          <span className="cs-sc-stat-lbl">Lots</span>
          <span className="cs-lots-badge">{item.lots.length}</span>
        </div>
        <div className="cs-sc-stat">
          <span className="cs-sc-stat-lbl">Value</span>
          <span className="cs-value-cell">{item.value > 0 ? formatINR(item.value) : '—'}</span>
        </div>
      </div>
      {item.product.minStockLevel && (
        <StockProgressBar qty={item.totalStock} minLevel={item.product.minStockLevel} statusKey={status.key} />
      )}
      <button
        className="cs-btn-details cs-btn-details-card"
        onClick={(e) => { e.stopPropagation(); onViewDetails(item); }}
      >
        <FiEye size={12} /> Details
      </button>
    </div>
  );
};

// ─── main component ─────────────────────────────────────────

const CurrentStock = () => {
  const [stockData,       setStockData]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [searchKeyword,   setSearchKeyword]   = useState('');
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [activeCategory,  setActiveCategory]  = useState('all');
  const [sortBy,          setSortBy]          = useState('partNumber');
  const [sortDir,         setSortDir]         = useState('asc');
  const [showModal,       setShowModal]       = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [expandedId,      setExpandedId]      = useState(null);
  const [viewMode,        setViewMode]        = useState('table');
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize,        setPageSize]        = useState(10);
  const [jumpValue,       setJumpValue]       = useState('');

  // ─── data loading ───────────────────────────────────────

  const loadCurrentStock = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);

      const response = await stockApi.getStockedProducts();
      const stockedProducts = response.data?.data || [];

      const stockPromises = stockedProducts.map(async (sp) => {
        try {
          const stockRes = await stockApi.getCurrentStock(sp.productId);
          const lots = stockRes.data?.data?.lots || [];
          const totalStock = parseFloat(sp.totalStock || 0);
          const avgPrice = getLotAvgPrice(lots);
          return {
            product: {
              productId:      sp.productId,
              partNumber:     sp.partNumber,
              description:    sp.description,
              packageType:    sp.packageType,
              manufacturerPn: sp.manufacturerPn,
              unitPrice:      sp.unitPrice,
              minStockLevel:  null,
              category:  sp.categoryName ? { categoryName: sp.categoryName, categoryId: sp.categoryId } : null,
              supplier:  sp.supplierName ? { supplierName: sp.supplierName } : null,
              rack:      sp.rackName     ? { rackName: sp.rackName }         : null,
              box:       sp.boxLabel     ? { boxLabel: sp.boxLabel }          : null,
            },
            totalStock,
            lots,
            value: totalStock * avgPrice,
          };
        } catch {
          return {
            product: {
              productId:   sp.productId,
              partNumber:  sp.partNumber,
              description: sp.description,
              category:    sp.categoryName ? { categoryName: sp.categoryName } : null,
            },
            totalStock: parseFloat(sp.totalStock || 0),
            lots: [],
            value: 0,
          };
        }
      });

      const results = await Promise.all(stockPromises);
      setStockData(results);
      if (silent) toast.success('Stock refreshed', { autoClose: 1500 });
    } catch {
      toast.error('Failed to load stock data');
      setStockData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCurrentStock(); }, [loadCurrentStock]);
  useEffect(() => { setCurrentPage(1); setExpandedId(null); }, [searchKeyword, filterStatus, activeCategory, sortBy, sortDir, pageSize]);

  // ─── derived data ───────────────────────────────────────

  const stats = useMemo(() => ({
    total:      stockData.length,
    inStock:    stockData.filter(i => i.totalStock > 0 && !(i.product.minStockLevel && i.totalStock <= parseFloat(i.product.minStockLevel))).length,
    lowStock:   stockData.filter(i => i.product.minStockLevel && i.totalStock > 0 && i.totalStock <= parseFloat(i.product.minStockLevel)).length,
    outOfStock: stockData.filter(i => i.totalStock === 0).length,
    totalValue: stockData.reduce((s, i) => s + i.value, 0),
  }), [stockData]);

  const categories = useMemo(() => {
    const cats = new Set(stockData.map(i => getCategoryName(i.product)));
    return ['all', ...Array.from(cats)];
  }, [stockData]);

  const filteredStock = useMemo(() => {
    let list = stockData;
    if (activeCategory !== 'all')
      list = list.filter(i => getCategoryName(i.product) === activeCategory);
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      list = list.filter(i =>
        [i.product.partNumber, i.product.description, getCategoryName(i.product), i.product.packageType]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== 'all')
      list = list.filter(i => getStockStatus(i.totalStock, i.product).key === filterStatus);

    return [...list].sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'partNumber': va = a.product.partNumber || ''; vb = b.product.partNumber || ''; break;
        case 'totalStock': va = a.totalStock; vb = b.totalStock; break;
        case 'status':     va = getStockStatus(a.totalStock, a.product).order; vb = getStockStatus(b.totalStock, b.product).order; break;
        case 'category':   va = getCategoryName(a.product); vb = getCategoryName(b.product); break;
        case 'value':      va = a.value; vb = b.value; break;
        default: return 0;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [stockData, searchKeyword, filterStatus, activeCategory, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredStock.length / pageSize));
  const pagedStock = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStock.slice(start, start + pageSize);
  }, [filteredStock, currentPage, pageSize]);

  const startItem = filteredStock.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem   = Math.min(currentPage * pageSize, filteredStock.length);

  const pageButtons = useMemo(() => {
    const delta = 2;
    const left  = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);
    const range = [1];
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    if (totalPages > 1) range.push(totalPages);
    return range;
  }, [currentPage, totalPages]);

  // ─── handlers ───────────────────────────────────────────

  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const handleJump = (e) => {
    if (e.key === 'Enter') {
      const p = parseInt(jumpValue, 10);
      if (!isNaN(p)) goToPage(p);
      setJumpValue('');
    }
  };

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  const handleViewDetails = (item) => {
    setSelectedProduct(item);
    setShowModal(true);
  };

  const handleRowToggle = (id) => setExpandedId(prev => prev === id ? null : id);

  const handleClearAll = () => {
    setSearchKeyword('');
    setFilterStatus('all');
    setActiveCategory('all');
  };

  const handleExport = () => {
    if (filteredStock.length === 0) {
      toast.warn('Nothing to export');
      return;
    }
    exportToCsv(filteredStock);
    toast.success(`Exported ${filteredStock.length} products`);
  };

  const handlePrint = () => window.print();

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <FiMinus size={10} className="cs-sort-icon-idle" />;
    return sortDir === 'asc'
      ? <FiArrowUp size={11} className="cs-sort-icon-active" />
      : <FiArrowDown size={11} className="cs-sort-icon-active" />;
  };

  if (loading) return <LoadingState />;

  const hasFilters = searchKeyword || filterStatus !== 'all' || activeCategory !== 'all';

  return (
    <div className="cs-page">
      {/* ── HEADER ── */}
      <div className="cs-header">
        <div className="cs-header-left">
          <div className="cs-header-icon">
            <FiPackage size={20} />
            <div className="cs-header-icon-pulse" />
          </div>
          <div>
            <h1 className="cs-title">Current Stock</h1>
            <p className="cs-subtitle">Live inventory · {stats.total} stocked products</p>
          </div>
        </div>
        <div className="cs-header-actions">
          <button className="cs-btn-icon" onClick={handleExport} title="Export CSV">
            <FiDownload size={14} />
            <span>Export</span>
          </button>
          <button className="cs-btn-icon" onClick={handlePrint} title="Print">
            <FiPrinter size={14} />
            <span>Print</span>
          </button>
          <button
            className="cs-btn-refresh"
            onClick={() => loadCurrentStock(true)}
            disabled={refreshing}
          >
            <FiRefreshCw size={14} className={refreshing ? 'cs-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="cs-stats-row">
        <StatCard
          icon={FiLayers} value={stats.total} label="Total Products"
          variant="primary" active={filterStatus === 'all'}
          onClick={() => setFilterStatus('all')}
        />
        <StatCard
          icon={FiCheckCircle} value={stats.inStock} label="In Stock"
          variant="success" active={filterStatus === 'success'}
          onClick={() => setFilterStatus('success')}
        />
        <StatCard
          icon={FiAlertTriangle} value={stats.lowStock} label="Low Stock"
          variant="warning" active={filterStatus === 'warning'}
          onClick={() => setFilterStatus('warning')}
        />
        <StatCard
          icon={FiXCircle} value={stats.outOfStock} label="Out of Stock"
          variant="danger" active={filterStatus === 'danger'}
          onClick={() => setFilterStatus('danger')}
        />
        <StatCard
          icon={FiBarChart2} value={formatINR(stats.totalValue)} label="Total Value"
          variant="info"
        />
      </div>

      {/* ── HEALTH BAR ── */}
      {stats.total > 0 && (
        <div className="cs-health-strip">
          <div className="cs-health-strip-bar">
            <div className="cs-health-strip-seg cs-health-success" style={{ width: `${(stats.inStock / stats.total) * 100}%` }} />
            <div className="cs-health-strip-seg cs-health-warning" style={{ width: `${(stats.lowStock / stats.total) * 100}%` }} />
            <div className="cs-health-strip-seg cs-health-danger"  style={{ width: `${(stats.outOfStock / stats.total) * 100}%` }} />
          </div>
          <div className="cs-health-strip-legend">
            <span><i className="cs-legend-dot success" /> {Math.round((stats.inStock / stats.total) * 100)}% Healthy</span>
            <span><i className="cs-legend-dot warning" /> {Math.round((stats.lowStock / stats.total) * 100)}% Low</span>
            <span><i className="cs-legend-dot danger"  /> {Math.round((stats.outOfStock / stats.total) * 100)}% Out</span>
          </div>
        </div>
      )}

      {/* ── FILTER CARD ── */}
      <div className="cs-card">
        <div className="cs-search-bar">
          <FiSearch size={15} className="cs-search-icon" />
          <input
            type="text" value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search by part number, description, category…"
            className="cs-search-input"
          />
          {searchKeyword && (
            <button className="cs-search-clear" onClick={() => setSearchKeyword('')}>
              <FiX size={13} />
            </button>
          )}
        </div>

        <div className="cs-cat-pills">
          {categories.map((cat, idx) => {
            const c = cat === 'all' ? null : getCategoryColor(cat);
            const active = activeCategory === cat;
            const count = cat === 'all' ? stockData.length : stockData.filter(i => getCategoryName(i.product) === cat).length;
            return (
              <button
                key={cat}
                className={`cs-pill ${active ? 'cs-pill-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={c && active ? { background: c.fg, borderColor: c.fg } : c ? { color: c.fg } : {}}
                ref={(el) => { if (el) el.style.animationDelay = `${idx * 0.03}s`; }}
              >
                {cat === 'all' ? 'All Categories' : cat}
                <span className="cs-pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        {hasFilters && (
          <div className="cs-active-filters">
            <span className="cs-active-filters-label">Active filters:</span>
            {searchKeyword && (
              <span className="cs-filter-tag">
                Search: "{searchKeyword}"
                <button onClick={() => setSearchKeyword('')}><FiX size={10} /></button>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="cs-filter-tag">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('all')}><FiX size={10} /></button>
              </span>
            )}
            {activeCategory !== 'all' && (
              <span className="cs-filter-tag">
                Category: {activeCategory}
                <button onClick={() => setActiveCategory('all')}><FiX size={10} /></button>
              </span>
            )}
            <button className="cs-btn-clear-all" onClick={handleClearAll}>
              <FiX size={12} /> Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── DATA CARD ── */}
      <div className="cs-card">
        <div className="cs-data-toolbar">
          <div className="cs-toolbar-left">
            <FiBox size={15} className="cs-card-icon" />
            <span className="cs-toolbar-title">Stock Overview</span>
            <span className="cs-result-count">{filteredStock.length} result{filteredStock.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="cs-toolbar-right">
            <div className="cs-page-size-group">
              <span className="cs-sort-label">Show</span>
              <select className="cs-sort-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="cs-sort-group">
              <span className="cs-sort-label">Sort</span>
              <select className="cs-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <button className="cs-sort-dir-btn" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                {sortDir === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
              </button>
            </div>
            <div className="cs-view-toggle">
              <button
                className={`cs-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')} title="Table"
              ><FiList size={14} /></button>
              <button
                className={`cs-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')} title="Cards"
              ><FiGrid size={14} /></button>
            </div>
          </div>
        </div>

        {filteredStock.length === 0 ? (
          <div className="cs-empty">
            <div className="cs-empty-icon"><FiPackage size={32} /></div>
            <p>No products found</p>
            <span>{hasFilters ? 'Try adjusting your filters' : 'Add stock to see products here'}</span>
            {hasFilters && (
              <button className="cs-btn-clear-all" onClick={handleClearAll}>
                <FiX size={12} /> Clear filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th className="cs-th-expand"></th>
                  {[
                    { key: 'partNumber', label: 'Part Number' },
                    { key: null,         label: 'Description' },
                    { key: 'category',   label: 'Category' },
                    { key: null,         label: 'Package' },
                    { key: 'totalStock', label: 'Stock' },
                    { key: null,         label: 'Health' },
                    { key: null,         label: 'Lots' },
                    { key: 'value',      label: 'Value' },
                    { key: 'status',     label: 'Status' },
                    { key: null,         label: '' },
                  ].map((col, i) => (
                    <th
                      key={i}
                      className={col.key ? 'cs-th-sortable' : ''}
                      onClick={() => col.key && handleSort(col.key)}
                    >
                      <span>{col.label}</span>
                      {col.key && <SortIcon col={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedStock.map((item, idx) => {
                  const status = getStockStatus(item.totalStock, item.product);
                  const isExpanded = expandedId === item.product.productId;
                  return (
                    <React.Fragment key={item.product.productId}>
                      <tr
                        className={`cs-row ${isExpanded ? 'cs-row-expanded' : ''}`}
                        onClick={() => handleRowToggle(item.product.productId)}
                        style={{ animationDelay: `${idx * 0.02}s` }}
                      >
                        <td className="cs-td-expand">
                          <button className="cs-expand-btn" aria-label="Expand row">
                            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                          </button>
                        </td>
                        <td><span className="cs-part-num">{item.product.partNumber || '—'}</span></td>
                        <td><span className="cs-desc">{item.product.description || '—'}</span></td>
                        <td><CategoryBadge name={getCategoryName(item.product)} /></td>
                        <td><span className="cs-pkg">{item.product.packageType || '—'}</span></td>
                        <td className="cs-td-right">
                          <span className={`cs-qty-badge cs-qty-${status.key}`}>
                            {item.totalStock.toFixed(2)}
                          </span>
                        </td>
                        <td className="cs-td-health">
                          <StockProgressBar
                            qty={item.totalStock}
                            minLevel={item.product.minStockLevel}
                            statusKey={status.key}
                          />
                        </td>
                        <td className="cs-td-center">
                          <span className="cs-lots-badge">{item.lots.length}</span>
                        </td>
                        <td className="cs-td-right">
                          <span className="cs-value-cell">
                            {item.value > 0 ? formatINR(item.value) : '—'}
                          </span>
                        </td>
                        <td><StatusBadge status={status} /></td>
                        <td className="cs-td-center">
                          <button
                            className="cs-btn-details"
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(item); }}
                          >
                            <FiEye size={13} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedRow item={item} onViewDetails={handleViewDetails} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cs-card-grid">
            {pagedStock.map((item, idx) => (
              <StockCard
                key={item.product.productId}
                item={item}
                isExpanded={expandedId === item.product.productId}
                onToggle={() => handleRowToggle(item.product.productId)}
                onViewDetails={handleViewDetails}
                animDelay={idx * 0.04}
              />
            ))}
          </div>
        )}

        {filteredStock.length > 0 && (
          <div className="cs-pagination-bar">
            <span className="cs-pagination-info">
              Showing <strong>{startItem}–{endItem}</strong> of <strong>{filteredStock.length}</strong>
              {hasFilters ? ' (filtered)' : ''}
            </span>
            <div className="cs-pagination-controls">
              <button className="cs-pg-btn" onClick={() => goToPage(1)} disabled={currentPage === 1} title="First">«</button>
              <button className="cs-pg-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                <FiChevronLeft size={13} />
              </button>
              {pageButtons.map((p, i) =>
                p === '...'
                  ? <span key={`el-${i}`} className="cs-pg-ellipsis">…</span>
                  : <button
                      key={p}
                      className={`cs-pg-btn cs-pg-num ${currentPage === p ? 'cs-pg-active' : ''}`}
                      onClick={() => goToPage(p)}
                    >{p}</button>
              )}
              <button className="cs-pg-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                <FiChevronRight size={13} />
              </button>
              <button className="cs-pg-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} title="Last">»</button>
            </div>
            <div className="cs-pagination-jump">
              Go to
              <input
                type="number" min={1} max={totalPages} value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)} onKeyDown={handleJump}
                placeholder="—"
              />
              of {totalPages}
            </div>
          </div>
        )}
      </div>

      {showModal && selectedProduct && (
        <StockDetailsModal
          productStock={selectedProduct}
          onClose={() => { setShowModal(false); setSelectedProduct(null); }}
        />
      )}
    </div>
  );
};

export default CurrentStock;