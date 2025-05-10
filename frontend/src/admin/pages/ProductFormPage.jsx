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
    brand: '',
    category: '', // Will be category ID later
    stock: '',
    description: '',
    images: [], // Placeholder for images
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
        // Assuming getCategories returns an array of category objects like [{ _id: '1', name: 'Electronics' }, ...]
        // Adjust if the structure is different (e.g., categoriesData.categories)
        setCategories(categoriesData.categories || categoriesData || []);

        if (isEditing && productId) {
          const productDetails = await getProductById(productId);
          setProductData({
            name: productDetails.name || '',
            price: productDetails.price || '',
            brand: productDetails.brand || '',
            category: productDetails.category?._id || productDetails.category || '',
            stock: productDetails.stock || '',
            description: productDetails.description || '',
            images: productDetails.images || [],
          });
        }
        setError(null);
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to load form data';
        setError(errMsg);
        console.error("Error loading form data:", err);
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
    // For now, just store file names or create object URLs for preview
    // Actual upload logic will be more complex
    const imagePreviews = files.map(file => ({
      // For backend, you'd likely send the file itself or upload and get a URL/ID
      // For this placeholder, we'll use object URLs for preview
      // and potentially just send file names or a placeholder to productData.images
      preview: URL.createObjectURL(file),
      name: file.name, // Store name for now, actual implementation might differ
    }));

    // Append new images to existing ones if any, or replace
    // This example replaces, adjust if you want to append
    setProductData(prev => ({
      ...prev,
      // Store something that can be sent to backend, e.g., array of names or empty if files handled separately
      // For now, let's assume images field in productData will hold these preview objects for UI
      // but for submission, we might need to transform this.
      images: imagePreviews, // This is for UI preview. Submission needs adjustment.
      // If you have actual file objects to upload, store them separately or handle in handleSubmit
      _imageFiles: files, // Temporary store actual files if needed for FormData
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    // Basic validation
    if (!productData.name || !productData.price || !productData.category || !productData.brand || !productData.stock) {
        setError("Please fill in all required fields: Name, Price, Category, Brand, Stock.");
        setLoading(false);
        return;
    }

    try {
      const formData = new FormData();
      formData.append('name', productData.name);
      formData.append('price', parseFloat(productData.price));
      formData.append('brand', productData.brand);
      formData.append('category', productData.category);
      formData.append('stock', parseInt(productData.stock, 10));
      formData.append('description', productData.description);

      // Append image files if they exist (i.e., new images were selected)
      if (productData._imageFiles && productData._imageFiles.length > 0) {
        productData._imageFiles.forEach(file => {
          formData.append('images', file); // Key 'images' must match multer setup
        });
      } else if (isEditing && productData.images && productData.images.length > 0) {
        // If editing and no new files, but existing images are there,
        // we might need to send them if backend expects all images always.
        // However, typical PUT operations might only update fields sent.
        // For simplicity, if no new files, backend will keep existing images unless explicitly told to remove.
        // If your backend replaces all images on update, you'd need to send existing image data here.
        // The current backend controller logic for updateProduct handles this:
        // `images: images.length > 0 ? images : product.images`
        // So, if `req.files` is empty, it keeps `product.images`.
        // Thus, we don't need to explicitly send existing images if no new ones are uploaded.
      }


      let response;
      if (isEditing) {
        // When using FormData with PUT, some servers/libraries might have issues.
        // Axios should handle it, but ensure backend PUT route with multer also works as expected.
        response = await api.put(`/products/${productId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSuccessMessage('Product updated successfully!');
      } else {
        response = await api.post('/products', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSuccessMessage('Product created successfully!');
      }
      
      console.log('Server response:', response); // api.js interceptor already gives response.data


      // Navigate back to product list after a short delay to show success message
      setTimeout(() => {
        navigate('/admin/products');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || err.message || (isEditing ? 'Failed to update product' : 'Failed to create product'));
      console.error("Error submitting product:", err);
    } finally {
      setLoading(false);
    }
  };

  if (formLoading) {
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Loading form...</p></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        {isEditing ? 'Edit Product' : 'Add New Product'}
      </h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-xl space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
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
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
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
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input
              type="number"
              name="price"
              id="price"
              step="0.01"
              value={productData.price}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              id="category"
              value={productData.category}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            >
              <option value="">Select a Category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
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
          <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
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
                  // If img.url exists, it's from existing product data. If img.preview, it's a new file.
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Product')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
