import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Import the configured axios instance
import { getProductById, getCategories } from '../../services/api'; // Import getCategories
import { FaPlus, FaTrash, FaArrowUp, FaArrowDown, FaGripVertical } from 'react-icons/fa';

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
    specifications: [], // Array of {key, value} pairs for specifications
    features: [] // Array of strings for features
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

          // Convert specifications Map to array of {key, value} pairs
          let specificationsArray = [];
          if (product.specifications) {
            specificationsArray = Object.entries(product.specifications).map(([key, value]) => ({
              key,
              value: String(value) // Ensure value is always a string for form inputs
            }));
          }

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
            specifications: specificationsArray,
            features: product.features || []
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

  // Dọn dẹp URL.createObjectURL khi component bị hủy
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      productData.images.forEach(img => {
        if (img.isNew && img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [productData.images]);

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

    setProductData(prev => {
      // Lấy danh sách các file ảnh đã tải lên trước đó
      const existingNewImages = prev.images.filter(img => img.isNew) || [];
      const existingFiles = prev._imageFiles || [];

      // Tạo danh sách ảnh mới bao gồm ảnh cũ và ảnh mới
      const updatedImages = [
        ...(prev.images.filter(img => !img.isNew) || []),
        ...existingNewImages,
        ...newImagePreviews
      ];

      // Tạo danh sách file mới bao gồm file cũ và file mới
      const updatedFiles = [...existingFiles, ...files];

      return {
        ...prev,
        images: updatedImages,
        _imageFiles: updatedFiles,
      };
    });
  };

  // Function to move image to a different position
  const moveImage = (dragIndex, hoverIndex) => {
    setProductData(prev => {
      const updatedImages = [...prev.images];
      // Remove the dragged item
      const draggedItem = updatedImages[dragIndex];
      // Remove the item from its original position
      updatedImages.splice(dragIndex, 1);
      // Insert it at the new position
      updatedImages.splice(hoverIndex, 0, draggedItem);
      return { ...prev, images: updatedImages };
    });
  };

  // Remove an image at a given index
  const removeImage = (index) => {
    setProductData(prev => {
      const updatedImages = [...prev.images];
      // If image is new (not yet uploaded to server), revoke object URL to prevent memory leaks
      if (updatedImages[index].isNew && updatedImages[index].preview) {
        URL.revokeObjectURL(updatedImages[index].preview);
      }
      // Remove the image
      updatedImages.splice(index, 1);
      return { ...prev, images: updatedImages };
    });
  };

  // Handle changes to specification key-value pairs
  const handleSpecificationChange = (index, field, value) => {
    const updatedSpecs = [...productData.specifications];
    updatedSpecs[index] = { ...updatedSpecs[index], [field]: value };
    setProductData(prev => ({ ...prev, specifications: updatedSpecs }));
  };

  // Add a new empty specification
  const addSpecification = () => {
    setProductData(prev => ({
      ...prev,
      specifications: [...prev.specifications, { key: '', value: '' }]
    }));
  };

  // Remove a specification at given index
  const removeSpecification = (index) => {
    const updatedSpecs = [...productData.specifications];
    updatedSpecs.splice(index, 1);
    setProductData(prev => ({ ...prev, specifications: updatedSpecs }));
  };

  // Handle changes to features array
  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...productData.features];
    updatedFeatures[index] = value;
    setProductData(prev => ({ ...prev, features: updatedFeatures }));
  };

  // Add a new empty feature
  const addFeature = () => {
    setProductData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  // Remove a feature at given index
  const removeFeature = (index) => {
    const updatedFeatures = [...productData.features];
    updatedFeatures.splice(index, 1);
    setProductData(prev => ({ ...prev, features: updatedFeatures }));
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

      // Convert specifications array to object and append as JSON
      const specificationsObject = {};
      productData.specifications.forEach(spec => {
        if (spec.key.trim() && spec.value.trim()) { // Only include non-empty specs
          specificationsObject[spec.key.trim()] = spec.value.trim();
        }
      });
      formData.append('specifications', JSON.stringify(specificationsObject));

      // Append features as JSON array
      const validFeatures = productData.features.filter(feature => feature.trim() !== '');
      formData.append('features', JSON.stringify(validFeatures));      // Filter existing images to keep, preserving their order
      const existingImagesToKeep = productData.images
        .filter(img => !img.isNew)
        .map((img, index) => ({
          ...img,
          displayOrder: index // Add position index to preserve the order
        }));

      // Append existing images data to FormData with order preserved
      formData.append('existingImages', JSON.stringify(existingImagesToKeep));      // Handle new images, append them in their current order
      const newImages = productData.images.filter(img => img.isNew);
      if (newImages.length > 0) {
        // Tạo một mảng ghi lại thứ tự của các file mới để backend có thể xử lý đúng thứ tự
        const newImagesOrder = newImages.map((img, idx) => ({
          name: img.name,
          order: existingImagesToKeep.length + idx // Thứ tự bắt đầu sau các ảnh đã tồn tại
        }));
        formData.append('newImagesOrder', JSON.stringify(newImagesOrder));

        // Append từng file ảnh mới
        newImages.forEach(img => {
          if (img.file) {
            formData.append('images', img.file);
          }
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
        </div>        <div>
          <div className="flex justify-between items-center">
            <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh sản phẩm</label>
            {productData.images.length > 0 && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                Tổng cộng: {productData.images.length} ảnh
              </div>
            )}
          </div>
          <input
            type="file"
            name="images"
            id="images"
            multiple
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
          /><div className="mt-2">
            <p className="text-sm text-gray-500">Kéo để sắp xếp lại thứ tự hoặc sử dụng nút mũi tên. Hình đầu tiên sẽ là ảnh chính.</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {productData.images && productData.images.map((img, index) => (
                <div
                  key={index}
                  className={`relative group border rounded-md p-1 transition-all ${index === 0 ? 'ring-2 ring-yellow-400' : ''}`}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', index);
                    e.currentTarget.classList.add('opacity-50', 'bg-blue-50');
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove('opacity-50', 'bg-blue-50');
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-2', 'border-blue-500');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-2', 'border-blue-500');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-2', 'border-blue-500');
                    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (dragIndex !== index) {
                      moveImage(dragIndex, index);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <FaGripVertical className="text-gray-400 mr-1" title="Kéo để di chuyển" />
                      {index === 0 && (
                        <span className="bg-yellow-500 text-xs text-white px-1 py-0.5 rounded">
                          Ảnh chính
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => index > 0 && moveImage(index, index - 1)}
                        disabled={index === 0}
                        className={`text-blue-600 p-1 rounded hover:bg-blue-100 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="Di chuyển lên"
                      >
                        <FaArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => index < productData.images.length - 1 && moveImage(index, index + 1)}
                        disabled={index === productData.images.length - 1}
                        className={`text-blue-600 p-1 rounded hover:bg-blue-100 ${index === productData.images.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="Di chuyển xuống"
                      >
                        <FaArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="text-red-600 p-1 rounded hover:bg-red-100"
                        title="Xóa ảnh"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <img
                      src={img.url || img.preview}
                      alt={`preview ${index + 1}`}
                      className="h-32 w-full object-cover rounded-md shadow cursor-move"
                    />
                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-tl">
                      {index + 1}/{productData.images.length}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Thông số kỹ thuật</h2>
            <button
              type="button"
              onClick={addSpecification}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Thêm thông số
            </button>
          </div>

          {productData.specifications.length === 0 && (
            <p className="text-gray-500 text-sm italic">Chưa có thông số kỹ thuật nào.</p>
          )}

          {productData.specifications.map((spec, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg shadow-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên thông số</label>
                <input
                  type="text"
                  value={spec.key}
                  onChange={(e) => handleSpecificationChange(index, 'key', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Nhập tên thông số"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị</label>
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Nhập giá trị thông số"
                  required
                />
              </div>
              <div className="flex items-center justify-end space-x-2 col-span-full">
                <button
                  type="button"
                  onClick={() => removeSpecification(index)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FaTrash className="w-4 h-4 mr-2" />
                  Xóa thông số
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Tính năng nổi bật</h2>
            <button
              type="button"
              onClick={addFeature}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Thêm tính năng
            </button>
          </div>

          {productData.features.length === 0 && (
            <p className="text-gray-500 text-sm italic">Chưa có tính năng nổi bật nào.</p>
          )}

          {productData.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg shadow-sm">
              <input
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(index, e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Nhập tính năng nổi bật"
                required
              />
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FaTrash className="w-4 h-4 mr-2" />
                Xóa tính năng
              </button>
            </div>
          ))}
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
