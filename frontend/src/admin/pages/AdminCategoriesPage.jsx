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
  const [deleting, setDeleting] = useState(null); // Track which category is being deleted
  const [bulkDeleting, setBulkDeleting] = useState(false); // Track bulk delete operation

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
    // Only add delay for search debouncing, not for initial load
    if (searchTerm) {
      const delayDebounceFn = setTimeout(() => {
        fetchCategories(1);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      // Immediate load for initial load and non-search operations
      fetchCategories(1);
    }
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
        setBulkDeleting(true);
        await Promise.all(selectedCategories.map(id => api.delete(`/categories/${id}`)));
        toast.success('Categories deleted successfully');
        setSelectedCategories([]);
        fetchCategories();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete categories');
      } finally {
        setBulkDeleting(false);
      }
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setDeleting(categoryId);
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
      setDeleting(null);
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
        <h1 className="text-3xl font-semibold text-gray-800">Quản lý danh mục</h1>
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <Link
            to="/admin/categories/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
          >
            + Thêm danh mục mới
          </Link>
          {selectedCategories.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center"
            >
              {bulkDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang xóa...
                </>
              ) : (
                `Xóa đã chọn (${selectedCategories.length})`
              )}
            </button>
          )}
        </div>
        <div className="w-full md:w-64">
          <input
            type="search"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error ? (
        <div className="text-red-500 p-4 bg-red-100 rounded-md mb-4">Lỗi: {error}</div>
      ) : categories.length === 0 ? (
        <div className="text-center text-gray-500 py-8">Không tìm thấy danh mục nào.</div>
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
                    Hình ảnh {getSortIcon('image')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button
                    onClick={() => handleSort('name')}
                    className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tên {getSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button
                    onClick={() => handleSort('description')}
                    className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Mô tả {getSortIcon('description')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button
                    onClick={() => handleSort('featured')}
                    className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nổi bật {getSortIcon('featured')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr
                  key={category._id}
                  className={`hover:bg-gray-50 transition-colors ${selectedCategories.includes(category._id) ? 'bg-blue-50' : ''
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
                      <span className="text-gray-500">Không có hình ảnh</span>
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
                    <span className={`px-2 py-1 rounded-full text-xs ${category.featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {category.featured ? 'Nổi bật' : 'Tiêu chuẩn'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/categories/edit/${category._id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      Chỉnh sửa
                    </Link>
                    <button
                      onClick={() => {
                        setCategoryToDelete(category);
                        setShowDeleteModal(true);
                      }}
                      disabled={deleting === category._id}
                      className="text-red-600 hover:text-red-900 ml-3 disabled:text-red-400 disabled:cursor-not-allowed inline-flex items-center"
                    >
                      {deleting === category._id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-1"></div>
                          Đang xóa...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                          Xóa
                        </>
                      )}
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
          onClick={() => {
            setPage(p => Math.max(1, p - 1));
            fetchCategories(Math.max(1, page - 1));
          }}
          disabled={page === 1 || loading}
          className={`px-4 py-2 rounded-lg ${page === 1 || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          Trước
        </button>
        <span className="px-4 py-2 text-gray-700">
          Trang {page} của {totalPages}
        </span>
        <button
          onClick={() => {
            setPage(p => Math.min(totalPages, p + 1));
            fetchCategories(Math.min(totalPages, page + 1));
          }}
          disabled={page === totalPages || loading}
          className={`px-4 py-2 rounded-lg ${page === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          Tiếp theo
        </button>
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
