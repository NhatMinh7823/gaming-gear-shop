import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { setProducts as setProductAction } from '../redux/slices/productSlice'; // Renamed to avoid conflict
import { toast } from 'react-toastify';
import { getProducts, searchProducts, getCategories, getSearchSuggestions } from '../services/api';
import ProductCard from '../components/ProductCard';

function ProductsPage() {
  const dispatch = useDispatch();
  const { products, totalPages, currentPage } = useSelector((state) => state.product);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await getCategories();
        setCategories(data.categories);
      } catch (error) {
        toast.error('Error fetching categories');
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = Object.fromEntries(searchParams);
        const page = params.page || currentPage;
        const limit = 10;
        const sortParam = params.sort || sort || '-createdAt';
        const categoryParam = params.category || category;
        const minPriceParam = params.minPrice || minPrice;
        const maxPriceParam = params.maxPrice || maxPrice;
        const brandParam = params.brand || brand;

        let data;
        if (params.keyword) {
          setIsSearching(true);
          const response = await searchProducts(params.keyword, {
            page,
            limit,
            sort: sortParam,
            category: categoryParam,
            minPrice: minPriceParam,
            maxPrice: maxPriceParam,
            brand: brandParam,
          });
          data = response.data;
        } else {
          setIsSearching(false);
          const response = await getProducts({
            page,
            limit,
            sort: sortParam,
            category: categoryParam,
            minPrice: minPriceParam,
            maxPrice: maxPriceParam,
            brand: brandParam,
          });
          data = response.data;
        }

        console.log('Fetched Products:', data); // Log để debug
        dispatch(setProductAction(data));
      } catch (error) {
        console.error('Error fetching products:', error); // Log lỗi
        toast.error('Error fetching products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [dispatch, searchParams, currentPage, sort, category, minPrice, maxPrice, brand]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (search.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      try {
        const { data } = await getSearchSuggestions(search);
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    setSearchParams({ keyword: search, page: 1, sort, category, minPrice, maxPrice, brand });
  };

  const handleSuggestionClick = (suggestion) => {
    setSearch(suggestion.name);
    setShowSuggestions(false);
    setSearchParams({ keyword: suggestion.name, page: 1, sort, category, minPrice, maxPrice, brand });
  };

  const handlePageChange = (page) => {
    const params = Object.fromEntries(searchParams);
    setSearchParams({ ...params, page });
  };

  const handleSortChange = (e) => {
    const sortValue = e.target.value;
    setSort(sortValue);
    const params = Object.fromEntries(searchParams);
    setSearchParams({ ...params, sort: sortValue, page: 1, category, minPrice, maxPrice, brand });
  };

  const handleCategoryChange = (e) => {
    const categoryValue = e.target.value;
    setCategory(categoryValue);
    const params = Object.fromEntries(searchParams);
    setSearchParams({ ...params, category: categoryValue, page: 1, sort, minPrice, maxPrice, brand });
  };

  const handleFilterChange = () => {
    const params = Object.fromEntries(searchParams);
    setSearchParams({ ...params, minPrice, maxPrice, brand, page: 1, sort, category });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar for Filters */}
        <div className="md:w-1/4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <div className="mb-4">
              <label className="block mb-2">Price Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min Price"
                  className="border p-2 rounded w-full"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max Price"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block mb-2">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Enter brand"
                className="border p-2 rounded w-full"
              />
            </div>
            <button
              onClick={handleFilterChange}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Apply Filters
            </button>
          </div>
        </div>
        {/* Main Content */}
        <div className="md:w-3/4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <form onSubmit={handleSearch} className="flex-1 md:mr-4 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="border p-2 rounded w-full md:w-1/3"
                ref={searchRef}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 bg-white border rounded w-full md:w-1/3 mt-1 max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="p-2 hover:bg-gray-200 cursor-pointer"
                    >
                      {suggestion.name} ({suggestion.brand})
                    </li>
                  ))}
                </ul>
              )}
              <button type="submit" className="ml-2 bg-blue-600 text-white px-4 py-2 rounded">
                Search
              </button>
            </form>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <div>
                <label className="mr-2">Category:</label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="border p-2 rounded"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mr-2">Sort by:</label>
                <select
                  value={sort}
                  onChange={handleSortChange}
                  className="border p-2 rounded"
                >
                  <option value="-createdAt">Newest</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                  <option value="-averageRating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center">Loading...</div>
          ) : products && products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`mx-1 px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center">No products found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
