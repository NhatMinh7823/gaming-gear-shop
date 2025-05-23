import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Import the configured axios instance
import { getProductById, getCategories } from '../../services/api'; // Import getCategories

const ProductFormPage = () => {
  const { id: productId } = useParams(); // Get product ID from URL for editing
  const navigate = useNavigate();
  const isEditing = Boolean(productId);

  const [productData, setProductData] = useState({
    name: '',
    price: '',
    discountPrice: '',
    brand: '',
    category: '', // Will be category ID later
    stock: '',
    description: '',
    images: [], // Placeholder for images
    isFeatured: false,
    // Add other fields as needed based on productModel.js
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [formLoading, setFormLoading] = useState(true); // For loading categories and product data

  useEffect(() => {
    const loadFormData = async () => {
      setFormLoading(true);
      try {
        const categoriesData = await getCategories();
        const categoryList = Array.isArray(categoriesData.data.categories)
          ? categoriesData.data.categories
          : categoriesData.data.categories || [];
        setCategories(categoryList);

        if (isEditing && productId) {
          const { data: { product } } = await getProductById(productId);
          setProductData({
            name: product.name || '',
            price: product.price || '',
            discountPrice: product.discountPrice || '',
            brand: product.brand || '',
            category: product.category?._id || product.category || '',
            stock: product.stock || '',
            description: product.description || '',
            images: product.images || [],
            isFeatured: product.isFeatured || false,
          });
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Không thể tải danh mục');
      } finally {
        setFormLoading(false);
      }
    };

    loadFormData();
  }, [productId, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImagePreviews = files.map(file => ({
      preview: URL.createObjectURL(file),
      name: file.name,
      isNew: true,
      file: file,
    }));

    setProductData(prev => ({
      ...prev,
      images: [...(prev.images.filter(img => !img.isNew) || []), ...newImagePreviews],
      _imageFiles: files,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    if (!productData.name || !productData.price || !productData.category || !productData.brand || !productData.stock) {
      setError("Vui lòng điền đầy đủ các trường: Tên, Giá, Danh mục, Thương hiệu, Số lượng.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', productData.name);
      formData.append('price', parseFloat(productData.price));
      formData.append('discountPrice', productData.discountPrice ? parseFloat(productData.discountPrice) : '');
      formData.append('brand', productData.brand);
      formData.append('category', productData.category);
      formData.append('stock', parseInt(productData.stock, 10));
      formData.append('description', productData.description);
      formData.append('isFeatured', productData.isFeatured);

      // Filter out new image files to get existing images to keep
      const existingImagesToKeep = productData.images.filter(img => !img.isNew);

      // Append existing images data to FormData
      formData.append('existingImages', JSON.stringify(existingImagesToKeep));

      if (productData._imageFiles && productData._imageFiles.length > 0) {
        productData._imageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      let response;
      if (isEditing) {
        response = await api.put(`/products/${productId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSuccessMessage('Cập nhật sản phẩm thành công!');
      } else {
        response = await api.post('/products', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSuccessMessage('Tạo sản phẩm thành công!');
      }

      setTimeout(() => {
        navigate('/admin/products');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || (isEditing ? 'Cập nhật sản phẩm thất bại' : 'Tạo sản phẩm thất bại'));
      console.error("Error submitting product:", err);
    } finally {
      setLoading(false);
    }
  };

  if (formLoading) {
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Đang tải biểu mẫu...</p></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        {isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
      </h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-xl space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
          <input
            type="text"
            name="name"
            id="name"
            value={productData.name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea
            name="description"
            id="description"
            rows="4"
            value={productData.description}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Giá gốc (VNĐ)</label>
            <input
              type="number"
              name="price"
              id="price"
              step="1"
              value={productData.price}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="discountPrice" className="block text-sm font-medium text-gray-700 mb-1">Giá khuyến mãi (VNĐ)</label>
            <input
              type="number"
              name="discountPrice"
              id="discountPrice"
              step="1"
              value={productData.discountPrice}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">Số lượng tồn kho</label>
            <input
              type="number"
              name="stock"
              id="stock"
              value={productData.stock}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm nổi bật</label>
            <div className="mt-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={productData.isFeatured}
                  onChange={(e) => setProductData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                  className="form-checkbox h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-700">Đánh dấu là sản phẩm nổi bật</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
            <select
              name="category"
              id="category"
              value={productData.category}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            >
              <option value="">Chọn danh mục</option>              {categories.length === 0 ? (
                <option value="" disabled>Không có danh mục</option>
              ) : (
                categories.map(cat => (
                  <option key={cat._id || cat.id} value={cat._id || cat.id}>
                    {cat.name || 'Tên không xác định'}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
            <input
              type="text"
              name="brand"
              id="brand"
              value={productData.brand}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh sản phẩm</label>
          <input
            type="file"
            name="images"
            id="images"
            multiple
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {productData.images && productData.images.map((img, index) => (
              <div key={index} className="relative">
                <img
                  src={img.url || img.preview}
                  alt={`preview ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-md shadow"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (isEditing ? 'Đang cập nhật...' : 'Đang tạo...') : (isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
