import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiFileText, FiDownload, FiRefreshCw, FiCheckCircle,
  FiAlertCircle, FiList, FiLayers, FiEye, FiEdit2,
  FiSave, FiX, FiPlus, FiTrash2, FiGrid
} from 'react-icons/fi';
import QcTemplatePreview from './QcTemplatePreview';
import './QcTemplates.css';

// ── 6 correct categories from Excel ──────────────────────────
const CATEGORY_STYLES = {
  IC:         { bg: '#dbeafe', fg: '#1e40af', gradient: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', label: "IC's Inspection" },
  MECHANICAL: { bg: '#fef3c7', fg: '#92400e', gradient: 'linear-gradient(135deg,#fef3c7,#fde68a)', label: 'Mechanical Items' },
  KITTING:    { bg: '#dcfce7', fg: '#166534', gradient: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', label: 'Kitting Components' },
  PCB:        { bg: '#ede9fe', fg: '#5b21b6', gradient: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', label: 'PCB Inspection' },
  ELECTRONIC: { bg: '#ffedd5', fg: '#9a3412', gradient: 'linear-gradient(135deg,#ffedd5,#fed7aa)', label: 'Electronic Items' },
  LABEL:      { bg: '#fce7f3', fg: '#9d174d', gradient: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', label: 'Label / Sticker' },
};

const FALLBACK_TEMPLATES = [
  { categoryCode: 'IC',         categoryName: "IC's Inspection",      formNo: 'TTPL/QC/F/1C  Rev:2  dated 10/07/24', stages: [
    { id:1, slNo:1, stageOperation:'Visual Inspection', checkPoint:'VI for Packing quality',               aqlLabel:'As per AQL' },
    { id:2, slNo:2, stageOperation:'Visual Inspection', checkPoint:'VI for any damage/lead breaks /Rust',  aqlLabel:'As per AQL' },
    { id:3, slNo:3, stageOperation:'Visual Inspection', checkPoint:'Top Marking as per datasheet',         aqlLabel:'As per AQL' },
    { id:4, slNo:4, stageOperation:'Visual Inspection', checkPoint:'IC Part Verification as per BOM',      aqlLabel:'As per AQL' },
    { id:5, slNo:5, stageOperation:'Test method',       checkPoint:'Solderability Test',                   aqlLabel:'As per AQL' },
  ]},
  { categoryCode: 'MECHANICAL',  categoryName: 'Mechanical Items',     formNo: 'TTPL/QC/F/1D  Rev:2  dated 10/07/24', stages: [
    { id:6,  slNo:1, stageOperation:'Visual Inspection', checkPoint:'VI for Packing quality',                         aqlLabel:'As per AQL' },
    { id:7,  slNo:2, stageOperation:'Visual Inspection', checkPoint:'VI for any damage/ breaks/scratche marks /Rust', aqlLabel:'As per AQL' },
    { id:8,  slNo:3, stageOperation:'Visual Inspection', checkPoint:'VI for Powder Coating Finish',                   aqlLabel:'As per AQL' },
    { id:9,  slNo:4, stageOperation:'Visual Inspection', checkPoint:'Fitment Check',                                  aqlLabel:'As per AQL' },
  ]},
  { categoryCode: 'KITTING',     categoryName: 'Kitting Components',   formNo: 'TTPL/QC/F/1E  Rev:2  dated 10/07/24', stages: [
    { id:10, slNo:1, stageOperation:'Visual Inspection', checkPoint:'VI for Packing quality',              aqlLabel:'As per AQL' },
    { id:11, slNo:2, stageOperation:'Visual Inspection', checkPoint:'VI for any damage/lead breaks /Rust', aqlLabel:'As per AQL' },
    { id:12, slNo:3, stageOperation:'Visual Inspection', checkPoint:'Top Marking as per datasheet',        aqlLabel:'As per AQL' },
    { id:13, slNo:4, stageOperation:'Visual Inspection', checkPoint:'Part Verification as per BOM',        aqlLabel:'As per AQL' },
  ]},
  { categoryCode: 'PCB',         categoryName: 'PCB Inspection',       formNo: 'TTPL/QC/F/1F  Rev:2  dated 10/07/24', stages: [
    { id:14, slNo:1, stageOperation:'Visual Inspection', checkPoint:'VI for Packing quality & damage',                    aqlLabel:'As per AQL' },
    { id:15, slNo:2, stageOperation:'Visual Inspection', checkPoint:'Check Supplier FPT Report',                          aqlLabel:'As per AQL' },
    { id:16, slNo:3, stageOperation:'Visual Inspection', checkPoint:'Conductor(all tracks) covered with solder resist',   aqlLabel:'As per AQL' },
    { id:17, slNo:4, stageOperation:'Visual Inspection', checkPoint:'Spacing b/w conductors (No track short allowed)',    aqlLabel:'As per AQL' },
    { id:18, slNo:5, stageOperation:'Visual Inspection', checkPoint:'Legend print should be readable',                    aqlLabel:'As per AQL' },
    { id:19, slNo:6, stageOperation:'Visual Inspection', checkPoint:'Lamination/Adhesive Test -Solder mask not peel off', aqlLabel:'As per AQL' },
    { id:20, slNo:7, stageOperation:'Test method',       checkPoint:'Solderability Test',                                 aqlLabel:'As per AQL' },
  ]},
  { categoryCode: 'ELECTRONIC',  categoryName: 'Electronic Items',     formNo: 'TTPL/QC/F/1G  Rev:2  dated 10/07/24', stages: [
    { id:21, slNo:1, stageOperation:'Visual Inspection', checkPoint:'VI for Packing quality',              aqlLabel:'As per AQL' },
    { id:22, slNo:2, stageOperation:'Visual Inspection', checkPoint:'VI for any damage/lead breaks /Rust', aqlLabel:'As per AQL' },
    { id:23, slNo:3, stageOperation:'Visual Inspection', checkPoint:'Top Marking as per datasheet',        aqlLabel:'As per AQL' },
    { id:24, slNo:4, stageOperation:'Visual Inspection', checkPoint:'Part Verification as per BOM',        aqlLabel:'As per AQL' },
    { id:25, slNo:5, stageOperation:'Test method',       checkPoint:'Solderability Test',                  aqlLabel:'As per AQL' },
  ]},
  { categoryCode: 'LABEL',       categoryName: 'Label / Sticker',      formNo: 'TTPL/QC/F/1H  Rev:2  dated 10/07/24', stages: [
    { id:26, slNo:1, stageOperation:'Visual Inspection', checkPoint:'VI for Contents Printed as per Product Std',       aqlLabel:'As per AQL' },
    { id:27, slNo:2, stageOperation:'Visual Inspection', checkPoint:'VI for any damage/Scratches',                      aqlLabel:'As per AQL' },
    { id:28, slNo:3, stageOperation:'Visual Inspection', checkPoint:'Adhesive/Gumming Quality',                         aqlLabel:'As per AQL' },
    { id:29, slNo:4, stageOperation:'Test method',       checkPoint:'Fix the label to Enclosure and check after 2days', aqlLabel:'As per AQL' },
  ]},
];

// PreviewModal is now handled by QcTemplatePreview component

// ── Edit Modal ────────────────────────────────────────────────
const EditModal = ({ template, onClose, onSave }) => {
  const [stages, setStages] = useState(
    (template?.stages || []).map(s => ({ ...s }))
  );
  const [saving, setSaving] = useState(false);

  const updateStage = (idx, field, value) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addStage = () => {
    const maxSlNo = stages.length > 0 ? Math.max(...stages.map(s => s.slNo || 0)) : 0;
    setStages(prev => [...prev, {
      slNo: maxSlNo + 1,
      stageOperation: 'Visual Inspection',
      checkPoint: '',
      aqlLabel: 'As per AQL'
    }]);
  };

  const removeStage = (idx) => {
    setStages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/qc/templates/${template.categoryCode}/stages`,
        { stages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Template updated!');
      onSave({ ...template, stages });
      onClose();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qct-modal-overlay" onClick={onClose}>
      <div className="qct-modal qct-modal-edit" onClick={e => e.stopPropagation()}>
        <div className="qct-modal-header" style={{ background: '#1e293b' }}>
          <div>
            <div className="qct-modal-company" style={{ color: '#fff' }}>
              Edit: {template?.categoryName}
            </div>
            <div className="qct-modal-formno" style={{ color: '#94a3b8' }}>
              {template?.formNo}
            </div>
          </div>
          <button className="qct-modal-close" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="qct-modal-body">
          <div className="qct-edit-stages">
            {stages.map((s, idx) => (
              <div key={idx} className="qct-edit-stage-row">
                <span className="qct-edit-sl">{idx + 1}</span>
                <input
                  className="qct-edit-input qct-edit-op"
                  value={s.stageOperation || ''}
                  onChange={e => updateStage(idx, 'stageOperation', e.target.value)}
                  placeholder="Stage/Operation"
                />
                <input
                  className="qct-edit-input qct-edit-cp"
                  value={s.checkPoint || ''}
                  onChange={e => updateStage(idx, 'checkPoint', e.target.value)}
                  placeholder="Check Point"
                />
                <input
                  className="qct-edit-input qct-edit-aql"
                  value={s.aqlLabel || ''}
                  onChange={e => updateStage(idx, 'aqlLabel', e.target.value)}
                  placeholder="AQL"
                />
                <button className="qct-edit-remove" onClick={() => removeStage(idx)}>
                  <FiTrash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <button className="qct-edit-add-btn" onClick={addStage}>
            <FiPlus size={13} /> Add Stage
          </button>

          <div className="qct-edit-actions">
            <button className="qct-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="qct-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? <><FiRefreshCw size={13} className="qct-spin" /> Saving…</> : <><FiSave size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const QcTemplates = () => {
  const [templates, setTemplates]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [previewTpl, setPreviewTpl]     = useState(null);
  const [editTpl, setEditTpl]           = useState(null);
  const [downloading, setDownloading]   = useState({});

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/qc/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data.data || res.data || [];
      setTemplates(Array.isArray(data) && data.length > 0 ? data : FALLBACK_TEMPLATES);
    } catch {
      setTemplates(FALLBACK_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (code, type) => {
    const key = `${code}_${type}`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      const token = localStorage.getItem('token');
      const ext   = type === 'excel' ? 'xlsx' : 'docx';
      const mime  = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const res = await axios.get(`/api/qc/templates/blank/${code}/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `QC_Checklist_${code}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${code} checklist downloaded as .${ext}`);
    } catch {
      toast.error(`Failed to download ${code} template`);
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveEdit = (updated) => {
    setTemplates(prev => prev.map(t =>
      t.categoryCode === updated.categoryCode ? updated : t
    ));
  };

  const getStyle = (code) =>
    CATEGORY_STYLES[code] || { bg: '#f1f5f9', fg: '#475569', gradient: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', label: code };

  if (loading) return (
    <div className="qct-loading">
      <div className="qct-spinner" />
      <span>Loading templates…</span>
    </div>
  );

  return (
    <div className="qct-page">

      {/* HEADER */}
      <div className="qct-header">
        <div className="qct-header-left">
          <div className="qct-header-icon"><FiFileText size={20} /></div>
          <div>
            <h1 className="qct-title">QC Checklist Templates</h1>
            <p className="qct-subtitle">
              {templates.length} templates · Form Rev:2 dated 10/07/24
            </p>
          </div>
        </div>
        <button className="qct-btn-refresh" onClick={loadTemplates}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* INFO BANNER */}
      <div className="qct-info-banner">
        <FiAlertCircle size={16} />
        <div>
          <strong>About these templates</strong>
          <p>
            Preview, edit, or download blank checklists as Excel (.xlsx) or Word (.docx).
            For digital inspection use the QC Queue. For offline use, download and print.
          </p>
        </div>
      </div>

      {/* TEMPLATE GRID */}
      <div className="qct-grid">
        {templates.map((tpl, idx) => {
          const code  = tpl.categoryCode;
          const style = getStyle(code);
          const stages = tpl.stages || [];

          return (
            <div key={code} className="qct-card" style={{ animationDelay: `${idx * 0.06}s` }}>

              {/* Card Banner */}
              <div className="qct-card-banner" style={{ background: style.gradient }}>
                <FiFileText size={32} style={{ color: style.fg }} />
                <span className="qct-card-cat-badge" style={{ background: style.fg, color: '#fff' }}>
                  {code}
                </span>
              </div>

              {/* Card Body */}
              <div className="qct-card-body">
                <h3 className="qct-card-title">{tpl.categoryName}</h3>
                <p className="qct-card-desc">{tpl.formNo}</p>

                {/* Stats */}
                <div className="qct-card-stats">
                  <div className="qct-card-stat">
                    <FiList size={12} />
                    <span><strong>{stages.filter(s => s.checkPoint).length}</strong> stages</span>
                  </div>
                  <div className="qct-card-stat">
                    <FiLayers size={12} />
                    <span><strong>Rev:2</strong></span>
                  </div>
                </div>

                {/* Stage preview */}
                {stages.length > 0 && (
                  <div className="qct-stages-preview">
                    <div className="qct-stages-label">Check points:</div>
                    <ol>
                      {stages.filter(s => s.checkPoint).slice(0, 3).map((s, i) => (
                        <li key={i}>{s.checkPoint}</li>
                      ))}
                      {stages.filter(s => s.checkPoint).length > 3 && (
                        <li style={{ color: '#94a3b8' }}>
                          +{stages.filter(s => s.checkPoint).length - 3} more…
                        </li>
                      )}
                    </ol>
                  </div>
                )}

                {/* Action buttons */}
                <div className="qct-card-actions">
                  {/* Preview */}
                  <button
                    className="qct-action-btn qct-btn-preview"
                    onClick={() => setPreviewTpl(tpl)}
                    title="Live Preview"
                  >
                    <FiEye size={13} /> Preview
                  </button>

                  {/* Edit */}
                  <button
                    className="qct-action-btn qct-btn-edit"
                    onClick={() => setEditTpl(tpl)}
                    title="Edit template"
                  >
                    <FiEdit2 size={13} /> Edit
                  </button>
                </div>

                {/* Download buttons */}
                <div className="qct-download-row">
                  <button
                    className="qct-download-btn qct-dl-excel"
                    onClick={() => handleDownload(code, 'excel')}
                    disabled={downloading[`${code}_excel`]}
                    title="Download as Excel"
                  >
                    {downloading[`${code}_excel`]
                      ? <><FiRefreshCw size={13} className="qct-spin" /> Downloading…</>
                      : <><FiGrid size={13} /> Excel</>}
                  </button>
                  <button
                    className="qct-download-btn qct-dl-docx"
                    onClick={() => handleDownload(code, 'docx')}
                    disabled={downloading[`${code}_docx`]}
                    title="Download as Word"
                    style={{ background: style.fg }}
                  >
                    {downloading[`${code}_docx`]
                      ? <><FiRefreshCw size={13} className="qct-spin" /> Downloading…</>
                      : <><FiDownload size={13} /> Word</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* INSTRUCTIONS */}
      <div className="qct-instructions">
        <div className="qct-instructions-head">
          <FiCheckCircle size={16} /> How to use
        </div>
        <ol className="qct-instructions-list">
          <li><strong>Preview</strong> the checklist before downloading</li>
          <li><strong>Edit</strong> stages if checkpoints need updating</li>
          <li><strong>Download Excel</strong> for digital filling or printing</li>
          <li><strong>Download Word</strong> for offline inspection records</li>
          <li><strong>Sign</strong> and file the completed checklist</li>
          <li><strong>Update</strong> the digital QC Queue after inspection</li>
        </ol>
      </div>

      {/* MODALS */}
      {previewTpl && (
        <QcTemplatePreview
          template={previewTpl}
          onClose={() => setPreviewTpl(null)}
        />
      )}
      {editTpl && (
        <EditModal
          template={editTpl}
          onClose={() => setEditTpl(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default QcTemplates;