import React, { useState, useEffect } from 'react';
import { categoryApi } from '../../api/categoryApi';
import { toast } from 'react-toastify';

const CategoryModal = ({ category, onClose }) => {
  const [formData, setFormData] = useState({
    categoryName: '',
    categoryCode: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        categoryName: category.categoryName,
        categoryCode: category.categoryCode,
        description: category.description || '',
      });
    }
  }, [category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (category) {
        await categoryApi.update(category.categoryId, formData);
        toast.success('Category updated successfully');
      } else {
        await categoryApi.create(formData);
        toast.success('Category created successfully');
      }
      onClose(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category Name *</label>
            <input
              type="text"
              value={formData.categoryName}
              onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
              required
              placeholder="e.g., PCBA"
            />
          </div>

          <div className="form-group">
            <label>Category Code *</label>
            <input
              type="text"
              value={formData.categoryCode}
              onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
              required
              placeholder="e.g., CAT-PCBA"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              placeholder="Enter description"
            />
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => onClose(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;