import React, { useState, useEffect } from 'react';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { toast } from 'react-toastify';
import { FiUpload, FiDownload, FiFile, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import './ExcelImport.css';

const ExcelImport = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [importProgress, setImportProgress] = useState({ success: 0, failed: 0, total: 0 });
  const [importResults, setImportResults] = useState([]);
  const [autoCreateCategories, setAutoCreateCategories] = useState(true); // ✅ NEW: Auto-create toggle

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await categoryApi.getAll();
      if (res.data.success) {
        setCategories(res.data.data || []);
        console.log('✅ Categories loaded:', res.data.data.length);
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportProgress({ success: 0, failed: 0, total: 0 });
    setImportResults([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        console.log('📄 Excel loaded, rows:', jsonData.length);
        
        const parsedData = parseBOMData(jsonData);
        setPreview(parsedData);
        setImportProgress({ success: 0, failed: 0, total: parsedData.length });
        
        if (parsedData.length === 0) {
          toast.error('❌ No products found');
        } else {
          toast.success(`✅ Found ${parsedData.length} products!`);
        }
      } catch (error) {
        console.error('❌ Error:', error);
        toast.error('Failed to read file');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const parseBOMData = (rows) => {
    const products = [];
    let currentCategory = null;

    console.log('🔍 Parsing Excel...');

    // Start from row 7 (index 6) - after header
    for (let i = 6; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const col1 = row[1] ? String(row[1]).trim() : '';
      const col2 = row[2] ? String(row[2]).trim() : '';
      const col3 = row[3] ? String(row[3]).trim() : '';
      const col4 = row[4] ? String(row[4]).trim() : '';
      const col5 = row[5];
      const col6 = row[6] ? String(row[6]).trim() : '';
      const col7 = row[7] ? String(row[7]).trim() : '';

      if (!col1 && !col2) continue;

      // Detect category row
      if (col1 && !col2) {
        if (col1.toLowerCase().includes('verified') || 
            col1.toLowerCase().includes('approved') ||
            /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(col1)) {
          continue;
        }
        
        currentCategory = col1
          .replace(/\s*\d+%\s*TOLLERANCE/i, '')
          .replace(/\s*TOLLERANCE/i, '')
          .trim();
        
        console.log(`📁 Category: ${currentCategory}`);
        continue;
      }

      // Detect product row
      if (col2 && col5) {
        try {
          const quantity = parseInt(col5);
          if (isNaN(quantity) || quantity <= 0) continue;

          const catPrefix = currentCategory ? 
            currentCategory.substring(0, 3).toUpperCase().replace(/\s/g, '') : 'XXX';
          const serialNum = col1 || (products.length + 1);
          const partNumber = `${catPrefix}${serialNum}`;

          const packageType = extractPackageType(col3 || col4);

          products.push({
            partNumber: partNumber.substring(0, 100),
            description: col2.substring(0, 500),
            quantity: quantity,
            category: currentCategory,
            alternativeComponent: col6.substring(0, 200),
            specification: (col4 || col3 || '').substring(0, 1000),
            packageType: packageType,
            manufacturerPn: col7.substring(0, 100),
            unitPrice: 0,
            minStockLevel: 10
          });

          if (products.length <= 5) {
            console.log(`✅ Product ${products.length}: ${partNumber} - ${col2}`);
          }
        } catch (error) {
          console.warn(`⚠️ Row ${i + 1} skipped:`, error.message);
        }
      }
    }

    console.log(`✅ Total parsed: ${products.length} products`);
    return products;
  };

  const extractPackageType = (text) => {
    if (!text) return '';
    
    const patterns = [
      /0201/i, /0402/i, /0603/i, /0805/i, /1206/i, /1210/i,
      /SOT-?23/i, /SOT-?223/i, /SOT-?89/i,
      /DIP-?\d+/i, /SOIC-?\d+/i, /TSSOP-?\d+/i,
      /TQFP-?\d+/i, /QFN-?\d+/i, /BGA/i,
      /SMD/i, /THT/i, /TO-?220/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0].toUpperCase();
    }
    return '';
  };

  // ✅ NEW: Create category automatically
  const createCategoryIfNeeded = async (categoryName) => {
    if (!categoryName) return null;

    // Generate category code from first 3 letters
    const categoryCode = 'CAT-' + categoryName
      .substring(0, 3)
      .toUpperCase()
      .replace(/\s/g, '');

    try {
      console.log(`🔨 Creating category: ${categoryName} (${categoryCode})`);
      
      const payload = {
        categoryCode: categoryCode,
        categoryName: categoryName,
        description: `Auto-created from Excel import`
      };

      const res = await categoryApi.create(payload);
      
      if (res.data.success) {
        const newCategory = res.data.data;
        // Add to local categories list
        setCategories(prev => [...prev, newCategory]);
        console.log(`✅ Category created: ${newCategory.categoryName} (ID: ${newCategory.categoryId})`);
        return newCategory.categoryId;
      }
    } catch (error) {
      console.error(`❌ Failed to create category ${categoryName}:`, error);
      // If category code already exists, try to find it
      const existing = categories.find(c => 
        c.categoryName.toLowerCase() === categoryName.toLowerCase()
      );
      if (existing) {
        return existing.categoryId;
      }
      return null;
    }
  };

  const findCategoryId = (categoryName) => {
    if (!categoryName || categories.length === 0) return null;

    const normalized = categoryName.toLowerCase()
      .replace(/s\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Try exact match
    let category = categories.find(c => 
      c.categoryName.toLowerCase().replace(/s\s*$/i, '').trim() === normalized
    );

    // Try fuzzy match
    if (!category) {
      category = categories.find(c => {
        const catName = c.categoryName.toLowerCase();
        return catName.includes(normalized) || normalized.includes(catName.replace(/s\s*$/i, ''));
      });
    }

    // Common mappings
    if (!category) {
      const mappings = {
        'resistor': 'resistors',
        'capacitor': 'capacitors',
        'diode': 'diodes',
        'ic': 'integrated circuits',
        'transistor': 'transistors',
        'inductor': 'inductors',
        'connector': 'connectors',
        'led': 'leds',
        'crystal': 'crystals',
        'buzzer': 'buzzers',
        'thermister': 'thermistors',
        'tantalum': 'capacitors'
      };

      for (const [key, value] of Object.entries(mappings)) {
        if (normalized.includes(key)) {
          category = categories.find(c => 
            c.categoryName.toLowerCase().includes(value) ||
            c.categoryName.toLowerCase().includes(key)
          );
          if (category) break;
        }
      }
    }

    return category?.categoryId || null;
  };

  const handleImport = async () => {
    if (!file || preview.length === 0) {
      toast.error('Please select a file first');
      return;
    }

    setImporting(true);
    setImportProgress({ success: 0, failed: 0, total: preview.length });
    setImportResults([]);
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    const createdCategories = new Set();

    for (const product of preview) {
      try {
        let categoryId = findCategoryId(product.category);
        
        // ✅ If category not found and auto-create is enabled, create it
        if (!categoryId && autoCreateCategories && product.category) {
          // Check if we already created this category in this import session
          const cacheKey = product.category.toLowerCase();
          
          if (!createdCategories.has(cacheKey)) {
            categoryId = await createCategoryIfNeeded(product.category);
            if (categoryId) {
              createdCategories.add(cacheKey);
              // Small delay to let DB sync
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } else {
            // Category was just created, try to find it again
            await loadCategories();
            categoryId = findCategoryId(product.category);
          }
        }
        
        if (!categoryId) {
          results.push({
            partNumber: product.partNumber,
            status: 'failed',
            error: `Category "${product.category}" not found and could not be created`
          });
          failCount++;
          setImportProgress({ success: successCount, failed: failCount, total: preview.length });
          continue;
        }

        const payload = {
          partNumber: product.partNumber,
          description: product.description,
          packageType: product.packageType || null,
          specification: product.specification || null,
          alternativeComponent: product.alternativeComponent || null,
          manufacturerPn: product.manufacturerPn || null,
          unitPrice: 0,
          minStockLevel: 10,
          categoryId: categoryId,
          remarks: `Imported - Qty: ${product.quantity}`
        };

        await productApi.create(payload);
        
        results.push({
          partNumber: product.partNumber,
          status: 'success'
        });
        
        successCount++;
        setImportProgress({ success: successCount, failed: failCount, total: preview.length });
        
      } catch (error) {
        results.push({
          partNumber: product.partNumber,
          status: 'failed',
          error: error.response?.data?.message || error.message
        });
        failCount++;
        setImportProgress({ success: successCount, failed: failCount, total: preview.length });
      }

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setImportResults(results);
    setImporting(false);

    // Show summary
    if (createdCategories.size > 0) {
      toast.info(`📁 Created ${createdCategories.size} new categories`);
    }
    if (successCount > 0) {
      toast.success(`✅ Imported ${successCount} products!`);
    }
    if (failCount > 0) {
      toast.error(`❌ Failed: ${failCount} products`);
    }

    // Reload categories to show newly created ones
    await loadCategories();
  };

  const downloadTemplate = () => {
    const template = [
      ['', 'Thinture Technologies Pvt Ltd'],
      ['', 'Bill Of Materials'],
      ['', '', '', '', '', '', 'DOC No: TEMPLATE'],
      ['', '', '', '', '', '', 'Date: ' + new Date().toLocaleDateString()],
      ['', 'Project Name:', '', 'Sample Template'],
      ['', 'Sl No.', 'Description / Value', 'Package', 'Specification', 'Quantity', 'Alt comp', 'MPN'],
      ['', 'RESISTORS', '', '', '', '', '', ''],
      ['', '1', '10K', 'Resistor_SMD:R_0603_1608Metric', 'Resistor', '5', '', ''],
      ['', 'CAPACITORS', '', '', '', '', '', ''],
      ['', '1', '10uF', 'Capacitor_SMD:C_0603_1608Metric', 'Capacitor', '2', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOM');
    XLSX.writeFile(wb, 'BOM_Template.xlsx');
    toast.success('✅ Template downloaded!');
  };

  return (
    <div className="excel-import-page">
      <div className="page-header">
        <h1>Import BOM from Excel</h1>
        <p>Upload your Bill of Materials</p>
      </div>

      <div className="import-container">
        <div className="upload-section">
          <div className="upload-box">
            <FiFile size={48} />
            <h3>Select Excel File</h3>
            <p>Supports multiple BOM formats</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              id="file-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" className="btn-primary">
              <FiUpload /> Choose File
            </label>
            {file && (
              <div className="file-selected">
                <FiFile /> {file.name}
              </div>
            )}
          </div>

          <div className="upload-options">
            <button className="btn-secondary" onClick={downloadTemplate}>
              <FiDownload /> Download Template
            </button>
            
            {/* ✅ NEW: Auto-create categories toggle */}
            <div className="auto-create-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoCreateCategories}
                  onChange={(e) => setAutoCreateCategories(e.target.checked)}
                />
                <span>Auto-create missing categories</span>
              </label>
              <small>Categories will be created using first 3 letters as code</small>
            </div>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="preview-section">
            <div className="preview-header">
              <h3>Preview - {preview.length} Products Found</h3>
              <div className="category-stats">
                Categories loaded: {categories.length}
                {autoCreateCategories && (
                  <span className="auto-create-badge">
                    <FiCheckCircle /> Auto-create ON
                  </span>
                )}
              </div>
            </div>

            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Part #</th>
                    <th>Description</th>
                    <th>Package</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((item, index) => {
                    const categoryId = findCategoryId(item.category);
                    const category = categories.find(c => c.categoryId === categoryId);
                    const willAutoCreate = !categoryId && autoCreateCategories && item.category;
                    
                    return (
                      <tr key={index}>
                        <td className="part-number">{item.partNumber}</td>
                        <td>{item.description}</td>
                        <td><span className="badge-package">{item.packageType || '-'}</span></td>
                        <td>{category?.categoryName || item.category || '-'}</td>
                        <td className="quantity">{item.quantity}</td>
                        <td>
                          {categoryId ? (
                            <span className="status-ready"><FiCheckCircle /> Ready</span>
                          ) : willAutoCreate ? (
                            <span className="status-warning"><FiAlertCircle /> Will Create</span>
                          ) : (
                            <span className="status-error"><FiXCircle /> No Category</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {preview.length > 20 && (
                <div className="table-footer">
                  Showing first 20 of {preview.length} products
                </div>
              )}
            </div>

            {importing && (
              <div className="import-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(importProgress.success + importProgress.failed) / importProgress.total * 100}%` }}
                  />
                </div>
                <p>
                  Importing... 
                  <span className="success"> ✅ {importProgress.success}</span>
                  <span className="failed"> ❌ {importProgress.failed}</span>
                  <span className="total"> / {importProgress.total}</span>
                </p>
              </div>
            )}

            {importResults.length > 0 && (
              <div className="import-results">
                <h4>Import Results</h4>
                <div className="results-list">
                  {importResults.filter(r => r.status === 'failed').map((result, index) => (
                    <div key={index} className="result-item error">
                      <FiXCircle />
                      <span>{result.partNumber}: {result.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn-primary import-btn"
              onClick={handleImport}
              disabled={importing}
            >
              {importing 
                ? `Importing... (${importProgress.success + importProgress.failed} / ${importProgress.total})` 
                : `Import ${preview.length} Products`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImport;