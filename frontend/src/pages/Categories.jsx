import React, { useState, useEffect } from 'react';
import { categoryApi } from '../api/categoryApi';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import CategoryModal from '../components/categories/CategoryModal';
import './Categories.css';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryApi.getAll();
      setCategories(response.data.data);
    } catch (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoryApi.delete(id);
        toast.success('Category deleted successfully');
        loadCategories();
      } catch (error) {
        toast.error('Failed to delete category');
        console.error(error);
      }
    }
  };

  const handleModalClose = (refresh) => {
    setShowModal(false);
    setSelectedCategory(null);
    if (refresh) {
      loadCategories();
    }
  };

  const handleInitDefaults = async () => {
    if (window.confirm('Initialize default categories? This will create standard categories.')) {
      try {
        await categoryApi.initDefaults();
        toast.success('Default categories initialized');
        loadCategories();
      } catch (error) {
        toast.error('Failed to initialize categories');
        console.error(error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading categories...</div>;
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleInitDefaults}>
            Init Defaults
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <FiPlus /> Add Category
          </button>
        </div>
      </div>

      <div className="card">
        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No Categories Found</h3>
            <p>Start by adding your first category or initialize defaults</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.categoryId}>
                    <td><strong>{category.categoryCode}</strong></td>
                    <td>{category.categoryName}</td>
                    <td>{category.description || '-'}</td>
                    <td>
                      <span className={`badge ${category.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => handleEdit(category)}
                        >
                          <FiEdit2 />
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleDelete(category.categoryId)}
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
        <CategoryModal
          category={selectedCategory}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Categories;