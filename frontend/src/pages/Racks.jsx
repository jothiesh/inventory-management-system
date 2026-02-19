import React, { useState, useEffect } from 'react';
import { rackApi } from '../api/rackApi';
import { boxApi } from '../api/boxApi';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiBox } from 'react-icons/fi';
import RackModal from '../components/racks/RackModal';
import BoxModal from '../components/racks/BoxModal';
import './Racks.css';

const Racks = () => {
  const [racks, setRacks] = useState([]);
  const [selectedRack, setSelectedRack] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRackModal, setShowRackModal] = useState(false);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [editingBox, setEditingBox] = useState(null);

  useEffect(() => {
    loadRacks();
  }, []);

  const loadRacks = async () => {
    try {
      setLoading(true);
      const response = await rackApi.getAll();
      setRacks(response.data.data);
      if (response.data.data.length > 0 && !selectedRack) {
        handleRackSelect(response.data.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load racks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRackSelect = async (rack) => {
    setSelectedRack(rack);
    try {
      const response = await boxApi.getByRack(rack.rackId);
      setBoxes(response.data.data);
    } catch (error) {
      toast.error('Failed to load boxes');
      console.error(error);
    }
  };

  const handleCreateRack = () => {
    setEditingRack(null);
    setShowRackModal(true);
  };

  const handleEditRack = (rack) => {
    setEditingRack(rack);
    setShowRackModal(true);
  };

  const handleDeleteRack = async (id) => {
    if (window.confirm('Are you sure you want to delete this rack?')) {
      try {
        await rackApi.delete(id);
        toast.success('Rack deleted successfully');
        loadRacks();
      } catch (error) {
        toast.error('Failed to delete rack');
        console.error(error);
      }
    }
  };

  const handleCreateBox = () => {
    if (!selectedRack) {
      toast.error('Please select a rack first');
      return;
    }
    setEditingBox(null);
    setShowBoxModal(true);
  };

  const handleEditBox = (box) => {
    setEditingBox(box);
    setShowBoxModal(true);
  };

  const handleDeleteBox = async (id) => {
    if (window.confirm('Are you sure you want to delete this box?')) {
      try {
        await boxApi.delete(id);
        toast.success('Box deleted successfully');
        handleRackSelect(selectedRack);
      } catch (error) {
        toast.error('Failed to delete box');
        console.error(error);
      }
    }
  };

  const handleRackModalClose = (refresh) => {
    setShowRackModal(false);
    setEditingRack(null);
    if (refresh) {
      loadRacks();
    }
  };

  const handleBoxModalClose = (refresh) => {
    setShowBoxModal(false);
    setEditingBox(null);
    if (refresh && selectedRack) {
      handleRackSelect(selectedRack);
    }
  };

  const handleInitDefaults = async () => {
    if (window.confirm('Initialize default racks and boxes?')) {
      try {
        await rackApi.initDefaults();
        await boxApi.initDefaults();
        toast.success('Default racks and boxes initialized');
        loadRacks();
      } catch (error) {
        toast.error('Failed to initialize defaults');
        console.error(error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading racks...</div>;
  }

  return (
    <div className="racks-page">
      <div className="page-header">
        <h1 className="page-title">Racks & Boxes</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleInitDefaults}>
            Init Defaults
          </button>
          <button className="btn btn-primary" onClick={handleCreateRack}>
            <FiPlus /> Add Rack
          </button>
        </div>
      </div>

      <div className="racks-layout">
        {/* Racks List */}
        <div className="racks-section card">
          <div className="section-header">
            <h3>Racks ({racks.length})</h3>
          </div>

          {racks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗄️</div>
              <h3>No Racks Found</h3>
              <p>Start by adding your first rack</p>
            </div>
          ) : (
            <div className="racks-list">
              {racks.map((rack) => (
                <div
                  key={rack.rackId}
                  className={`rack-item ${selectedRack?.rackId === rack.rackId ? 'active' : ''}`}
                  onClick={() => handleRackSelect(rack)}
                >
                  <div className="rack-info">
                    <h4>{rack.rackNumber}</h4>
                    <p>{rack.rackName}</p>
                    <span className="rack-location">{rack.location}</span>
                  </div>
                  <div className="rack-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRack(rack);
                      }}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRack(rack.rackId);
                      }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Boxes Grid */}
        <div className="boxes-section card">
          <div className="section-header">
            <h3>
              {selectedRack ? `Boxes in ${selectedRack.rackNumber}` : 'Select a Rack'}
            </h3>
            {selectedRack && (
              <button className="btn btn-primary" onClick={handleCreateBox}>
                <FiPlus /> Add Box
              </button>
            )}
          </div>

          {!selectedRack ? (
            <div className="empty-state">
              <div className="empty-state-icon">👈</div>
              <h3>Select a Rack</h3>
              <p>Choose a rack from the left to view its boxes</p>
            </div>
          ) : boxes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>No Boxes Found</h3>
              <p>Add boxes to this rack</p>
            </div>
          ) : (
            <div className="boxes-grid">
              {boxes.map((box) => (
                <div key={box.boxId} className="box-card">
                  <div className="box-icon">
                    <FiBox />
                  </div>
                  <h4>{box.boxNumber}</h4>
                  <p>{box.boxLabel}</p>
                  <div className="box-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEditBox(box)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteBox(box.boxId)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRackModal && (
        <RackModal rack={editingRack} onClose={handleRackModalClose} />
      )}

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