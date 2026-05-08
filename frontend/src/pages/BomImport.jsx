import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  FiUpload, FiFileText, FiX, FiCheck, FiAlertTriangle,
  FiChevronRight, FiArrowLeft,
  FiZap, FiCheckCircle,
  FiRefreshCw, FiEye, FiSliders, FiInfo,
  FiAlertCircle, FiSkipForward, FiSearch
} from 'react-icons/fi';
import './BomImport.css';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = [
  'capacitor', 'resistor', 'inductor', 'diode', 'transistor', 'ic', 'crystal',
  'connector', 'fuse', 'misc', 'led', 'module', 'buzzer', 'relay', 'switch',
  'tantalum', 'electrolytic', 'thermister', 'thermistor', 'battery', 'motor',
  'sensor', 'display', 'transformer', 'ferrite', 'varistor', 'oscillator',
  'assembly', 'hardware', 'packing', 'accessory', 'coating', 'potting',
  'unit assembling', 'h/w kit', 'conformal',
];

const BOM_FORMATS = {
  FORMAT_A: {
    name: 'Format A (G4M style)',
    description: 'SL No. | Reference | Value | Footprint | Qty | Part No.',
    headerRow: 0,
    columns: { slno: 0, reference: 1, description: 2, package: 3, qty: 4, partNumber: 5, altPart: 6 },
  },
  FORMAT_B: {
    name: 'Format B (Logger/Valve style)',
    description: 'Sl No. | Description/Value | Package | Specification | Quantity | Alt comp | MPN',
    headerRow: 5,
    columns: { slno: 1, description: 2, package: 3, specification: 4, qty: 5, altPart: 6, partNumber: 7 },
  },
  FORMAT_C: {
    name: 'Format C (M-BOM style)',
    description: 'Location | Qty | Item | Alt.comp | Description',
    headerRow: 4,
    columns: { reference: 1, qty: 2, description: 3, altPart: 4, package: 5 },
  },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const isCategoryRow = (rowValues) => {
  const nonEmpty = rowValues.filter(
    v => v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'NaN'
  );
  if (nonEmpty.length !== 1) return false;
  const raw = String(nonEmpty[0]);
  const val = raw.toLowerCase().trim();
  return (
    CATEGORY_KEYWORDS.some(k => val.includes(k)) ||
    /^[A-Z\s&'/,()]+$/.test(raw)
  );
};

const cleanStr = (v) => {
  if (v === null || v === undefined) return '';
  return String(v).trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
};

const cleanPackage = (pkg) => {
  if (!pkg) return '';
  return pkg
    .replace('Capacitor_SMD:', '').replace('Capacitor_THT:', '')
    .replace('Resistor_SMD:', '').replace('Resistor_THT:', '')
    .replace('Package_TO_SOT_SMD:', '').replace('Package_TO_SOT_THT:', '')
    .replace('Package_DIP:', '').replace('Package_SO:', '')
    .replace('Inductor_SMD:', '').replace('LED_SMD:', '').replace('LED_THT:', '')
    .trim();
};

const detectFormat = (rows) => {
  const firstRow = (rows[0] || []).map(v => String(v || '').toLowerCase());
  if (
    firstRow.some(v => v.includes('sl no') || v.includes('reference')) &&
    firstRow.some(v => v.includes('footprint') || v.includes('value'))
  ) return 'FORMAT_A';

  const row5 = (rows[5] || []).map(v => String(v || '').toLowerCase());
  if (
    row5.some(v => v.includes('sl no')) &&
    row5.some(v => v.includes('description')) &&
    row5.some(v => v.includes('mpn') || v.includes('quantity'))
  ) return 'FORMAT_B';

  const row4 = (rows[4] || []).map(v => String(v || '').toLowerCase());
  if (
    row4.some(v => v.includes('location')) &&
    row4.some(v => v.includes('qty'))
  ) return 'FORMAT_C';

  return null;
};

const parseRows = (allRows, formatKey) => {
  const fmt      = BOM_FORMATS[formatKey];
  const cols     = fmt.columns;
  const dataRows = allRows.slice(fmt.headerRow + 1);

  let currentCategory = 'GENERAL';
  const items = [];
  let globalIdx = 0;

  for (const row of dataRows) {
    const rowVals = row.map(v =>
      (v === undefined || v === null || String(v) === 'NaN') ? null : v
    );

    // Skip fully empty rows
    if (rowVals.every(v => v === null || String(v).trim() === '')) continue;

    // Detect category header rows
    if (isCategoryRow(rowVals)) {
      const catVal = rowVals.find(v => v !== null && String(v).trim() !== '');
      currentCategory = String(catVal).trim().toUpperCase();
      continue;
    }

    const qty          = parseFloat(rowVals[cols.qty]) || 0;
    const description  = cleanStr(rowVals[cols.description]);
    const partNumber   = cleanStr(rowVals[cols.partNumber]);
    const reference    = cleanStr(rowVals[cols.reference]);
    const pkg          = cleanPackage(cleanStr(rowVals[cols.package]));
    const altPart      = cleanStr(rowVals[cols.altPart]);
    const specification = cleanStr(rowVals[cols.specification]);

    // Skip NP / DNP rows
    const descLower = description.toLowerCase();
    if (['np', 'n/a', 'dnp', 'do not place'].includes(descLower)) continue;
    if (['np', 'n/a'].includes(partNumber.toLowerCase())) continue;

    // Skip rows with no meaningful data
    if (!description && !partNumber && !reference && qty === 0) continue;

    globalIdx++;
    items.push({
      id:            `bom-${Date.now()}-${globalIdx}`,
      category:      currentCategory,
      slno:          cleanStr(rowVals[cols.slno]) || String(globalIdx),
      reference,
      description,
      partNumber,
      altPart,
      package:       pkg,
      specification,
      qty:           qty || 1,
      selected:      true,
    });
  }

  return items;
};

// ─────────────────────────────────────────────────────────────
// STEP BAR
// ─────────────────────────────────────────────────────────────
const StepBar = ({ step }) => {
  const steps = ['Upload', 'Detect', 'Preview', 'Import'];
  return (
    <div className="bom-stepbar">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`bom-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <div className="bom-step-circle">
              {i < step ? <FiCheck size={13} /> : <span>{i + 1}</span>}
            </div>
            <span className="bom-step-label">{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`bom-step-line ${i < step ? 'done' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// UPLOAD ZONE
// ─────────────────────────────────────────────────────────────
const UploadZone = ({ onFile }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      className={`bom-dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])}
      />
      <div className="bom-dropzone-icon"><FiUpload size={32} /></div>
      <div className="bom-dropzone-title">Drop your BOM Excel file here</div>
      <div className="bom-dropzone-sub">Supports all 3 Thinture BOM formats · .xlsx / .xls only</div>
      <div className="bom-dropzone-formats">
        <span>Format A · G4M style</span>
        <span>Format B · Logger/Valve</span>
        <span>Format C · M-BOM style</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PREVIEW TABLE
// ─────────────────────────────────────────────────────────────
const PreviewTable = ({ items, onToggle, onToggleAll }) => {
  const [search, setCatFilter]  = useState('');
  const [catFilter, setCategory] = useState('ALL');

  const selected   = items.filter(i => i.selected).length;
  const categories = ['ALL', ...new Set(items.map(i => i.category))];

  const visibleItems = items.filter(item => {
    const matchCat = catFilter === 'ALL' || item.category === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      item.description.toLowerCase().includes(q) ||
      item.partNumber.toLowerCase().includes(q) ||
      item.reference.toLowerCase().includes(q) ||
      item.package.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const grouped = visibleItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="bom-preview-wrap">
      {/* Toolbar */}
      <div className="bom-preview-toolbar">
        <label className="bom-check-all">
          <input
            type="checkbox"
            checked={items.length > 0 && selected === items.length}
            onChange={e => onToggleAll(e.target.checked)}
          />
          <span>Select all ({selected}/{items.length})</span>
        </label>

        {/* Inline search */}
        <div className="bom-preview-search">
          <FiSearch size={12} />
          <input
            placeholder="Search description, part#..."
            value={search}
            onChange={e => setCatFilter(e.target.value)}
          />
          {search && <button onClick={() => setCatFilter('')}><FiX size={11} /></button>}
        </div>

        <div className="bom-preview-stats">
          <span className="bom-stat bom-stat--green">
            <FiCheck size={11} /> {selected} selected
          </span>
          <span className="bom-stat bom-stat--gray">
            <FiSkipForward size={11} /> {items.length - selected} skipped
          </span>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="bom-preview-cat-bar">
        {categories.map(cat => (
          <button
            key={cat}
            className={`bom-cat-filter-pill ${catFilter === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat === 'ALL' ? 'All Categories' : cat}
            <span className="bom-cat-filter-count">
              {cat === 'ALL'
                ? items.length
                : items.filter(i => i.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bom-table-scroll">
        {visibleItems.length === 0 ? (
          <div className="bom-empty-search">
            <FiSearch size={28} />
            <p>No items match your search</p>
          </div>
        ) : (
          <table className="bom-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>#</th>
                <th>Category</th>
                <th>Description / Value</th>
                <th>Package</th>
                <th>Part Number</th>
                <th>Alt Part / MPN</th>
                <th>Reference</th>
                <th style={{ width: 60 }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([cat, catItems]) => (
                <React.Fragment key={cat}>
                  <tr className="bom-cat-row">
                    <td colSpan={9}>
                      <span className="bom-cat-label">{cat}</span>
                      <span className="bom-cat-count">
                        {catItems.filter(i => i.selected).length}/{catItems.length} selected
                      </span>
                    </td>
                  </tr>
                  {catItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`bom-item-row ${!item.selected ? 'deselected' : ''}`}
                      onClick={() => onToggle(item.id)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => onToggle(item.id)}
                        />
                      </td>
                      <td className="bom-td-num">{item.slno || idx + 1}</td>
                      <td>
                        <span className="bom-cat-badge">
                          {item.category.length > 14
                            ? item.category.slice(0, 14) + '…'
                            : item.category}
                        </span>
                      </td>
                      <td className="bom-td-desc" title={item.description}>
                        {item.description || '—'}
                      </td>
                      <td className="bom-td-pkg" title={item.package}>
                        {item.package || '—'}
                      </td>
                      <td className="bom-td-pn">{item.partNumber || '—'}</td>
                      <td className="bom-td-alt">{item.altPart || '—'}</td>
                      <td className="bom-td-ref" title={item.reference}>
                        {item.reference || '—'}
                      </td>
                      <td className="bom-td-qty"><strong>{item.qty}</strong></td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// RESULT ROW
// ─────────────────────────────────────────────────────────────
const ResultRow = ({ item }) => (
  <div className={`bom-result-row ${item.status}`}>
    <div className={`bom-result-icon bom-result-icon--${item.status}`}>
      {item.status === 'success' ? <FiCheckCircle size={14} /> :
       item.status === 'skipped' ? <FiSkipForward  size={14} /> :
       <FiAlertCircle size={14} />}
    </div>
    <div className="bom-result-info">
      <div className="bom-result-desc">{item.description || item.partNumber || '—'}</div>
      <div className="bom-result-meta">
        {item.partNumber && <span>PN: {item.partNumber}</span>}
        {item.category   && <span>{item.category}</span>}
        <span>Qty: {item.qty}</span>
        {item.package    && <span>{item.package}</span>}
      </div>
    </div>
    <div className="bom-result-msg">{item.message}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const BomImport = ({ onBack, onItemsReady }) => {
  const [step, setStep]                     = useState(0);
  const [file, setFile]                     = useState(null);
  const [rawRows, setRawRows]               = useState([]);
  const [detectedFormat, setDetectedFormat] = useState(null);
  const [formatOverride, setFormatOverride] = useState(null);
  const [items, setItems]                   = useState([]);
  const [importing, setImporting]           = useState(false);
  const [results, setResults]               = useState([]);
  const [error, setError]                   = useState(null);

  const activeFormat = formatOverride || detectedFormat;

  // ── Reset ──────────────────────────────────────────────────
  const doReset = () => {
    setFile(null); setRawRows([]); setDetectedFormat(null);
    setFormatOverride(null); setItems([]); setResults([]);
    setStep(0); setError(null); setImporting(false);
  };

  // ── Read file → parse ──────────────────────────────────────
  const handleFile = useCallback((f) => {
    setError(null);
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        setRawRows(rows);
        const fmt  = detectFormat(rows);
        setDetectedFormat(fmt);
        setFormatOverride(null);
        if (fmt) {
          const parsed = parseRows(rows, fmt);
          if (parsed.length === 0) {
            setError('No valid components found. Try selecting the format manually.');
            setStep(1);
          } else {
            setItems(parsed);
            setStep(2);
          }
        } else {
          setStep(1);
        }
      } catch {
        setError('Failed to read Excel file. Make sure it is a valid .xlsx / .xls file.');
        setStep(0);
      }
    };
    reader.onerror = () => setError('Could not read file.');
    reader.readAsArrayBuffer(f);
  }, []);

  // ── Manual format pick ─────────────────────────────────────
  const handleFormatSelect = (fmtKey) => {
    const parsed = parseRows(rawRows, fmtKey);
    setFormatOverride(fmtKey);
    setItems(parsed);
    if (parsed.length === 0) {
      setError('No valid components found with this format. Try another.');
    } else {
      setError(null);
      setStep(2);
    }
  };

  // ── Toggle selection ───────────────────────────────────────
  const toggleItem = (id)  => setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const toggleAll  = (val) => setItems(prev => prev.map(i => ({ ...i, selected: val })));

  // ── Import → pass to parent ────────────────────────────────
  const handleImport = async () => {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) return;

    setImporting(true);
    setStep(3);
    setResults([]);

    const resultList = [];
    for (const item of selected) {
      await new Promise(r => setTimeout(r, 40));
      const hasPN = item.partNumber && item.partNumber !== '—';
      resultList.push({
        ...item,
        status:  hasPN ? 'success' : 'skipped',
        message: hasPN
          ? `Ready · PN: ${item.partNumber}`
          : 'No part number — review in Stock IN',
      });
      setResults([...resultList]);
    }

    setImporting(false);

    // Build stock items compatible with StockIn's bulkItems structure
    const stockItems = selected.map(item => ({
      // Display fields shown in the review table
      categoryDisplay:    item.category    || '—',
      partNumberDisplay:  item.partNumber  || item.reference || '—',
      descriptionDisplay: item.description || '—',
      packageType:        item.package     || '',
      manufacturerPn:     item.partNumber  || '',

      // Quantities — price/rack/box filled in review step
      quantity:           item.qty         || 0,
      purchasePrice:      0,
      totalValue:         0,

      // Location placeholders — user sets in review → edit
      rackDisplay:        '—',
      boxDisplay:         '—',
      supplierDisplay:    '—',
      rackId:             0,
      boxId:              0,
      productId:          0,
      supplierId:         null,

      // Meta
      invoiceNumber:      '',
      purchaseDate:       new Date().toISOString().split('T')[0],
      remarks: [
        item.reference     ? `Ref: ${item.reference}`         : '',
        item.altPart       ? `Alt: ${item.altPart}`           : '',
        item.specification ? `Spec: ${item.specification}`    : '',
      ].filter(Boolean).join(' | ') || 'BOM import',
    }));

    if (onItemsReady) onItemsReady(stockItems);
  };

  const selectedCount = items.filter(i => i.selected).length;
  const successCount  = results.filter(r => r.status === 'success').length;
  const skippedCount  = results.filter(r => r.status === 'skipped').length;

  // ──────────────────────────────────────────────────────────
  return (
    <div className="bom-page">

      {/* HEADER */}
      <div className="bom-header">
        <div className="bom-header-left">
          <button className="bom-back-btn" onClick={onBack}>
            <FiArrowLeft size={15} /> Back
          </button>
          <div className="bom-header-icon"><FiFileText size={20} /></div>
          <div>
            <div className="bom-header-title">BOM Bulk Import</div>
            <div className="bom-header-sub">
              {file ? file.name : 'Upload your Excel BOM file to import components'}
            </div>
          </div>
        </div>
        {file && step < 3 && (
          <button className="bom-reset-btn" onClick={doReset}>
            <FiRefreshCw size={13} /> Reset
          </button>
        )}
      </div>

      {/* STEP BAR */}
      <StepBar step={step} />

      {/* ERROR */}
      {error && (
        <div className="bom-error-banner">
          <FiAlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ════════════════════════════════
          STEP 0 — UPLOAD
      ════════════════════════════════ */}
      {step === 0 && (
        <div className="bom-card">
          <UploadZone onFile={handleFile} />
          <div className="bom-format-info">
            <div className="bom-format-info-title">
              <FiInfo size={13} /> Supported BOM Formats
            </div>
            <div className="bom-format-grid">
              {Object.entries(BOM_FORMATS).map(([key, fmt]) => (
                <div key={key} className="bom-format-card">
                  <div className="bom-format-name">{fmt.name}</div>
                  <div className="bom-format-desc">{fmt.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          STEP 1 — MANUAL FORMAT SELECT
      ════════════════════════════════ */}
      {step === 1 && (
        <div className="bom-card">
          <div className="bom-section-title">
            <FiSliders size={15} />
            Could not auto-detect format — please select manually
          </div>
          <div className="bom-format-select-grid">
            {Object.entries(BOM_FORMATS).map(([key, fmt]) => (
              <button key={key} className="bom-format-select-btn" onClick={() => handleFormatSelect(key)}>
                <div className="bom-format-select-name">{fmt.name}</div>
                <div className="bom-format-select-desc">{fmt.description}</div>
                <div className="bom-format-select-arrow"><FiChevronRight size={16} /></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          STEP 2 — PREVIEW & SELECT
      ════════════════════════════════ */}
      {step === 2 && (
        <>
          {/* Detection status bar */}
          <div className="bom-card bom-card--detect">
            <div className="bom-detect-row">
              <div className="bom-detect-badge">
                <FiZap size={12} />
                {formatOverride
                  ? `Manual: ${BOM_FORMATS[activeFormat]?.name}`
                  : `Auto-detected: ${BOM_FORMATS[activeFormat]?.name}`}
              </div>
              <div className="bom-detect-stats">
                <span><strong>{items.length}</strong> components</span>
                <span><strong>{[...new Set(items.map(i => i.category))].length}</strong> categories</span>
                <span><strong>{items.filter(i => i.partNumber).length}</strong> with part numbers</span>
              </div>
              <div className="bom-detect-formats">
                {Object.entries(BOM_FORMATS).map(([key, fmt]) => (
                  <button
                    key={key}
                    className={`bom-fmt-pill ${activeFormat === key ? 'active' : ''}`}
                    onClick={() => {
                      setFormatOverride(key);
                      setItems(parseRows(rawRows, key));
                    }}
                  >
                    {fmt.name.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview table */}
          <div className="bom-card">
            <div className="bom-section-title">
              <FiEye size={15} /> Preview — review and deselect items you don't want
            </div>
            <PreviewTable items={items} onToggle={toggleItem} onToggleAll={toggleAll} />
          </div>

          {/* Import footer */}
          <div className="bom-import-footer">
            <div className="bom-import-summary">
              <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''} selected
              {selectedCount > 0 && (
                <span className="bom-import-summary-note">
                  &nbsp;· Set Price, Rack &amp; Box in the Review step
                </span>
              )}
            </div>
            <button
              className="bom-import-btn"
              disabled={selectedCount === 0}
              onClick={handleImport}
            >
              <FiZap size={15} />
              Import {selectedCount} Items to Stock IN
              <FiChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          STEP 3 — RESULTS
      ════════════════════════════════ */}
      {step === 3 && (
        <div className="bom-card">
          <div className="bom-result-header">
            {importing ? (
              <div className="bom-result-loading">
                <div className="bom-spinner" />
                <span>Processing {results.length} / {selectedCount} items…</span>
              </div>
            ) : (
              <div className="bom-result-done">
                <div className="bom-result-done-icon"><FiCheckCircle size={32} /></div>
                <div className="bom-result-done-text">
                  <div className="bom-result-done-title">Import Complete!</div>
                  <div className="bom-result-done-sub">
                    {successCount} items added to Stock IN cart
                    {skippedCount > 0 && ` · ${skippedCount} without part number`}
                  </div>
                  <div className="bom-result-done-hint">
                    ⚠ You are now in the <strong>Review</strong> step —
                    set Price, Rack &amp; Box for each item before submitting.
                  </div>
                </div>
              </div>
            )}
          </div>

          {!importing && (
            <div className="bom-result-actions">
              <button className="bom-result-back-btn" onClick={onBack}>
                <FiArrowLeft size={13} /> Go to Review &amp; Submit
              </button>
              <button className="bom-result-again-btn" onClick={doReset}>
                <FiRefreshCw size={13} /> Import Another BOM
              </button>
            </div>
          )}

          <div className="bom-result-list">
            {results.map(r => <ResultRow key={r.id} item={r} />)}
            {importing && results.length < selectedCount && (
              <div className="bom-result-pending">
                {selectedCount - results.length} items remaining…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BomImport;