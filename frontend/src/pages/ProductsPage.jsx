import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { setProducts as setProductAction } from '../redux/slices/productSlice';
import { toast } from 'react-toastify';
import { getProducts, searchProducts, getCategories, getSearchSuggestions } from '../services/api';
import ProductCard from '../components/ProductCard';
import { FaSearch, FaFilter, FaSlidersH, FaTimes, FaSort, FaBox, FaTags, 
         FaDollarSign, FaShoppingBag, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

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
  const [expandFilters, setExpandFilters] = useState(false);
  const searchRef = useRef(null);

  // Initialize state from URL parameters on component mount
  useEffect(() => {
    const params = Object.fromEntries(searchParams);
    if (params.keyword) setSearch(params.keyword);
    if (params.sort) setSort(params.sort);
    if (params.category) setCategory(params.category);
    if (params.minPrice) setMinPrice(params.minPrice);
    if (params.maxPrice) setMaxPrice(params.maxPrice);
    if (params.brand) setBrand(params.brand);
  }, [searchParams]);

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
        const limit = 12; // Increased from 10 to 12 for better grid layout
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

        dispatch(setProductAction(data));
      } catch (error) {
        console.error('Error fetching products:', error);
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
    
    const debounceTimer = setTimeout(() => {
      if (search.length >= 2) {
        fetchSuggestions();
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    setSearchParams({ 
      ...(search && { keyword: search }), 
      page: 1,
      ...(sort && { sort }),
      ...(category && { category }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
      ...(brand && { brand })
    });
  };

  const handleSuggestionClick = (suggestion) => {
    setSearch(suggestion.name);
    setShowSuggestions(false);
    setSearchParams({ 
      keyword: suggestion.name, 
      page: 1,
      ...(sort && { sort }),
      ...(category && { category }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
      ...(brand && { brand })
    });
  };

  const handlePageChange = (page) => {
    const params = Object.fromEntries(searchParams);
    setSearchParams({ ...params, page });
    // Scroll to top of product section
    window.scrollTo({ top: document.getElementById('products-section').offsetTop - 100, behavior: 'smooth' });
  };

  const handleSortChange = (e) => {
    const sortValue = e.target.value;
    setSort(sortValue);
    const params = Object.fromEntries(searchParams);
    setSearchParams({ 
      ...params, 
      sort: sortValue, 
      page: 1 
    });
  };

  const handleCategoryChange = (e) => {
    const categoryValue = e.target.value;
    setCategory(categoryValue);
    const params = Object.fromEntries(searchParams);
    setSearchParams({ 
      ...params, 
      category: categoryValue, 
      page: 1 
    });
  };

  const handleFilterChange = () => {
    const params = Object.fromEntries(searchParams);
    setSearchParams({ 
      ...params, 
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
      ...(brand && { brand }),
      page: 1 
    });
    
    // Only close filters on mobile after applying
    if (window.innerWidth < 768) {
      setExpandFilters(false);
    }
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setBrand('');
    setCategory('');
    setSort('-createdAt');
    setSearch('');
    
    setSearchParams({ page: 1 });
  };

  const filterCount = [
    minPrice !== '',
    maxPrice !== '',
    brand !== '',
    category !== '',
    sort !== '' && sort !== '-createdAt',
    searchParams.has('keyword')
  ].filter(Boolean).length;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Gaming Products</h1>
        <p className="text-blue-100 text-lg">
          {isSearching 
            ? `Showing search results for "${searchParams.get('keyword')}"`
            : 'Browse our collection of high-quality gaming gear'}
        </p>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="md:hidden mb-6">
        <button
          onClick={() => setExpandFilters(!expandFilters)}
          className="w-full flex items-center justify-between bg-white shadow-lg p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <FaFilter className={`w-5 h-5 transition-colors ${filterCount > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
            <span className="font-medium">Filters & Search</span>
            {filterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                {filterCount}
              </span>
            )}
          </div>
          <FaSlidersH className={`w-5 h-5 transition-transform ${expandFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar for Filters - Hidden on mobile unless expanded */}
        <div className={`md:w-1/4 md:block ${expandFilters ? 'block' : 'hidden'}`}>
          <div className="bg-white p-6 rounded-2xl shadow-lg sticky top-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FaFilter className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                {filterCount > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {filterCount}
                  </span>
                )}
              </div>
              {filterCount > 0 && (
                <button 
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <FaTimes className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            
            {/* Search Box */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-800 mb-3">
                <FaSearch className="text-blue-600" />
                <label className="font-medium">Search Products</label>
              </div>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, brand..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-11 focus:ring-2 
                           focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  ref={searchRef}
                />
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white 
                           p-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaSearch className="w-4 h-4" />
                </button>
                
                {/* Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-20 bg-white w-full mt-2 border border-gray-200 rounded-xl 
                               shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FaBox className="text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-800">{suggestion.name}</div>
                            <div className="text-sm text-gray-500">{suggestion.brand}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </form>
            </div>
            
            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-800 mb-3">
                <FaTags className="text-blue-600" />
                <label className="font-medium">Category</label>
              </div>
              <div className="bg-gray-50 rounded-xl p-2">
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="w-full bg-transparent border-2 border-gray-200 rounded-lg px-3 py-2.5 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Price Range */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-800 mb-3">
                <FaDollarSign className="text-blue-600" />
                <label className="font-medium">Price Range</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 
                             focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">từ</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 
                             focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">đến</span>
                </div>
              </div>
            </div>
            
            {/* Brand Filter */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-800 mb-3">
                <FaShoppingBag className="text-blue-600" />
                <label className="font-medium">Brand</label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Enter brand name"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 
                           focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Sort Order */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-800 mb-3">
                <FaSort className="text-blue-600" />
                <label className="font-medium">Sort By</label>
              </div>
              <div className="bg-gray-50 rounded-xl p-2">
                <select
                  value={sort}
                  onChange={handleSortChange}
                  className="w-full bg-transparent border-2 border-gray-200 rounded-lg px-3 py-2.5
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="-createdAt">Newest First</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                  <option value="-averageRating">Highest Rated</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleFilterChange}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 
                       rounded-xl hover:from-blue-700 hover:to-blue-800 transition duration-300 
                       font-medium shadow-blue-200 shadow-lg hover:shadow-xl
                       flex items-center justify-center gap-2"
            >
              <FaFilter />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="md:w-3/4" id="products-section">
          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-56 bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <>
              <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="mb-3 sm:mb-0">
                  <p className="text-gray-600">
                    Showing <span className="font-semibold">{products.length}</span> results
                    {isSearching && <span> for "<span className="font-semibold">{searchParams.get('keyword')}</span>"</span>}
                  </p>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                  <label className="hidden sm:inline mr-2 text-gray-600">Sort:</label>
                  <select
                    value={sort}
                    onChange={handleSortChange}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-auto focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="-createdAt">Newest First</option>
                    <option value="price">Price: Low to High</option>
                    <option value="-price">Price: High to Low</option>
                    <option value="-averageRating">Highest Rated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product._id} className="transform transition duration-300 hover:scale-[1.02]">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <div className="flex space-x-1 rounded-lg bg-white shadow-md p-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-md ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page Numbers */}
                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                      // Calculate page numbers to show (current page centered when possible)
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = index + 1;
                      } else {
                        // Center current page when possible
                        const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                        pageNum = startPage + index;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`min-w-[40px] px-4 py-2 rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-md ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">
                {isSearching 
                  ? `We couldn't find any products matching "${searchParams.get('keyword')}"`
                  : "There are no products matching your selected filters."}
              </p>
              <button 
                onClick={clearFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
