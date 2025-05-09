import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';

function ProductsPage() {
  const dispatch = useDispatch();
  const { products, totalPages, currentPage } = useSelector((state) => state.product);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = Object.fromEntries(searchParams);
        const { data } = await getProducts({ page: currentPage, limit: 10, ...params });
        dispatch({ type: 'product/setProducts', payload: data });
      } catch (error) {
        toast.error('Error fetching products');
      }
    };
    fetchProducts();
  }, [dispatch, currentPage, searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ keyword: search });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <form onSubmit={handleSearch} className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="border p-2 rounded w-full md:w-1/3"
        />
        <button type="submit" className="ml-2 bg-blue-600 text-white px-4 py-2 rounded">
          Search
        </button>
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => dispatch({ type: 'product/setProducts', payload: { ...products, currentPage: i + 1 } })}
            className={`mx-1 px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ProductsPage;