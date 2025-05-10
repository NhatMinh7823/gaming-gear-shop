import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getProducts } from '../../services/api'; // Import api instance for delete

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Assuming getProducts from api.js returns { data: { products: [] } } or similar
        // Adjust based on the actual structure of the response from your getProducts function
        const response = await getProducts(); // Or api.get('/products');
        // The response from api.js is already response.data due to interceptor
        // And it seems product list is directly in response (e.g. response.products or just response if it's an array)
        // Let's assume the API returns an object like { products: [], page, pages }
        // Or if getProducts directly returns the array:
        setProducts(response.products || response); // Adjust based on actual API response structure
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch products');
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setLoading(true); // Optional: show loading state during delete
        await api.delete(`/products/${productId}`);
        setProducts(prevProducts => prevProducts.filter(p => p._id !== productId));
        setError(null); // Clear any previous errors
        // Optionally, show a success message e.g. using react-toastify
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to delete product');
        console.error("Error deleting product:", err);
      } finally {
        setLoading(false); // Clear loading state
      }
    }
  };

  if (loading && products.length === 0) { // Show initial loading only if no products yet
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Loading products...</p></div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-100 rounded-md">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Manage Products</h1>
        <Link
          to="/admin/products/new" // Assuming a route for creating new product
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
        >
          + Add New Product
        </Link>
      </div>

      {products && products.length === 0 && !loading && (
        <p className="text-center text-gray-500">No products found.</p>
      )}

      {products && products.length > 0 && (
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <img
                      src={product.images && product.images[0] ? product.images[0].url : 'https://via.placeholder.com/50'}
                      alt={product.name}
                      className="h-12 w-12 object-cover rounded-md"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">${product.price?.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Assuming category is populated and has a name, or just show ID */}
                    <div className="text-sm text-gray-700">{product.category?.name || product.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{product.brand}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/products/edit/${product._id}`} // Assuming route for editing
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="text-red-600 hover:text-red-900"
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
      {/* TODO: Add Pagination if product list is long */}
    </div>
  );
};

export default AdminProductsPage;
