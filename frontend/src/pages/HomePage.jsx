import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getFeaturedProducts, getFeaturedCategories } from '../services/api';
import ProductCard from '../components/ProductCard';

function HomePage() {
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.product);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getFeaturedProducts();
        dispatch({ type: 'product/setProducts', payload: { products: data.products, totalPages: 1, currentPage: 1 } });
        const catRes = await getFeaturedCategories();
      } catch (error) {
        toast.error('Error fetching featured products');
      }
    };
    fetchData();
  }, [dispatch]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Featured Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default HomePage;