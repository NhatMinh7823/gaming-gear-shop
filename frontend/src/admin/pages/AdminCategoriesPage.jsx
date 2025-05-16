import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  const itemsPerPage = 10;

  const fetchCategories = async (pageNum = page) => {
    try {
      setLoading(true);
      const response = await api.get('/categories', {
        params: {
          page: pageNum,
          limit: itemsPerPage,
          search: searchTerm,
          sortField,
          sortOrder
        }
      });
      setCategories(response.data.categories || []);
      setTotalPages(Math.ceil(response.data.total / itemsPerPage));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch categories');
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCategories(1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCategories(categories.map(c => c._id));
    } else {
      setSelectedCategories([]);
    }
  };

  const handleSelect = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCategories.length} categories?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedCategories.map(id => api.delete(`/categories/${id}`)));
        toast.success('Categories deleted successfully');
        setSelectedCategories([]);
        fetchCategories();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete categories');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setLoading(true);
      await api.delete(`/categories/${categoryId}`);
      toast.success('Category deleted successfully');
      setCategories(prevCategories => prevCategories.filter(c => c._id !== categoryId));
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete category');
      console.error("Error deleting category:", err);
      toast.error(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const DeleteConfirmationModal = ({ show, onClose, onConfirm, categoryName }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Delete Category</h3>
          <p className="mb-6">Are you sure you want to delete "{categoryName}"? This action cannot be undone.</p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCategoryToDelete(null);
        }}
        onConfirm={() => handleDeleteCategory(categoryToDelete?._id)}
        categoryName={categoryToDelete?.name}
      />
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <h1 className="text-3xl font-semibold text-gray-800">Manage Categories</h1>
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <Link
            to="/admin/categories/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
          >
            + Add New Category
          </Link>
          {selectedCategories.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
            >
              Delete Selected ({selectedCategories.length})
            </button>
          )}
        </div>
        <div className="w-full md:w-64">
          <input
            type="search"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error ? (
        <div className="text-red-500 p-4 bg-red-100 rounded-md mb-4">Error: {error}</div>
      ) : categories.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No categories found.</div>
      ) : (
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCategories.length === categories.length}
                    onChange={handleSelectAll}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                </th>
                <th className="px-6 py-3">
                  <button
                    onClick={() => handleSort('image')}
                    className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Image {getSortIcon('image')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button
                    onClick={() => handleSort('name')}
                    className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name {getSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button
                    onClick={() => handleSort('description')}
                    className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description {getSortIcon('description')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button
                    onClick={() => handleSort('featured')}
                    className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Featured {getSortIcon('featured')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr
                  key={category._id}
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedCategories.includes(category._id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category._id)}
                      onChange={() => handleSelect(category._id)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {category.image && category.image.url ? (
                      <img src={category.image.url} alt={category.name} className="h-10 w-10 object-cover rounded-full" />
                    ) : (
                      <span className="text-gray-500">No Image</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {category.description.length > 100
                        ? `${category.description.substring(0, 100)}...`
                        : category.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      category.featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.featured ? 'Featured' : 'Standard'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/categories/edit/${category._id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        setCategoryToDelete(category);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900 ml-3"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination */}
      <div className="mt-6 flex justify-center space-x-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className={`px-4 py-2 rounded-lg ${
            page === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Previous
        </button>
        <span className="px-4 py-2 text-gray-700">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className={`px-4 py-2 rounded-lg ${
            page === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
