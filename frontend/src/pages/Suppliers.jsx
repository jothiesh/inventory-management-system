import React, { useState, useEffect } from 'react';
import { supplierApi } from '../api/supplierApi';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import SupplierModal from '../components/suppliers/SupplierModal';
import './Suppliers.css';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierApi.getAll();
      setSuppliers(response.data.data);
    } catch (error) {
      toast.error('Failed to load suppliers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setShowModal(true);
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await supplierApi.delete(id);
        toast.success('Supplier deleted successfully');
        loadSuppliers();
      } catch (error) {
        toast.error('Failed to delete supplier');
        console.error(error);
      }
    }
  };

  const handleModalClose = (refresh) => {
    setShowModal(false);
    setSelectedSupplier(null);
    if (refresh) {
      loadSuppliers();
    }
  };

  if (loading) {
    return <div className="loading">Loading suppliers...</div>;
  }

  return (
    <div className="suppliers-page">
      <div className="page-header">
        <h1 className="page-title">Suppliers</h1>
        <button className="btn btn-primary" onClick={handleCreate}>
          <FiPlus /> Add Supplier
        </button>
      </div>

      <div className="card">
        {suppliers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No Suppliers Found</h3>
            <p>Start by adding your first supplier</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Supplier Code</th>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.supplierId}>
                    <td><strong>{supplier.supplierCode || '-'}</strong></td>
                    <td>{supplier.supplierName}</td>
                    <td>{supplier.contactPerson || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td>{supplier.email || '-'}</td>
                    <td>
                      <span className={`badge ${supplier.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(supplier)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(supplier.supplierId)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <SupplierModal supplier={selectedSupplier} onClose={handleModalClose} />
      )}
    </div>
  );
};

export default Suppliers;