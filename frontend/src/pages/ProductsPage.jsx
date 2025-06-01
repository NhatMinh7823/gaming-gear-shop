import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { setProducts as setProductAction } from '../redux/slices/productSlice';
import { toast } from 'react-toastify';
import { getProducts, searchProducts, getCategories, getSearchSuggestions } from '../services/api';
import ProductCard from '../components/ProductCard';
import {
  FaSearch, FaFilter, FaSlidersH, FaTimes, FaSort, FaBox, FaTags,
  FaDollarSign, FaShoppingBag, FaChevronLeft, FaChevronRight, FaBoxOpen,
  FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';

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
  const [stockStatus, setStockStatus] = useState('');  // Thêm state cho tình trạng tồn kho
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
    if (params.stockStatus) setStockStatus(params.stockStatus);
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
        const stockStatusParam = params.stockStatus || stockStatus;  // Thêm tham số tình trạng tồn kho

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
            stockStatus: stockStatusParam,  // Thêm tham số tình trạng tồn kho
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
            stockStatus: stockStatusParam,  // Thêm tham số tình trạng tồn kho
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
  }, [dispatch, searchParams, currentPage, sort, category, minPrice, maxPrice, brand, stockStatus]);

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
      ...(brand && { brand }),
      ...(stockStatus && { stockStatus })  // Thêm tình trạng tồn kho vào tham số tìm kiếm
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
      ...(brand && { brand }),
      ...(stockStatus && { stockStatus })  // Thêm tình trạng tồn kho vào tham số tìm kiếm
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

  const handleStockStatusChange = (e) => {
    const stockValue = e.target.value;
    setStockStatus(stockValue);
    const params = Object.fromEntries(searchParams);
    setSearchParams({
      ...params,
      stockStatus: stockValue,
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
      ...(stockStatus && { stockStatus }),  // Thêm tình trạng tồn kho vào tham số lọc
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
    setStockStatus('');  // Thêm reset cho tình trạng tồn kho

    setSearchParams({ page: 1 });
  };

  const filterCount = [
    minPrice !== '',
    maxPrice !== '',
    brand !== '',
    category !== '',
    sort !== '' && sort !== '-createdAt',
    searchParams.has('keyword'),
    stockStatus !== ''  // Thêm tình trạng tồn kho vào đếm bộ lọc
  ].filter(Boolean).length;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="container mx-auto py-8 px-4 bg-gray-900">
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-2xl p-8 mb-8">
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
          className="w-full flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg p-4 rounded-xl border border-gray-600 hover:from-gray-700 hover:to-gray-600 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <FaFilter className={`w-5 h-5 transition-colors ${filterCount > 0 ? 'text-blue-400' : 'text-gray-400'}`} />
              {filterCount > 0 && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{filterCount}</span>
                </div>
              )}
            </div>
            <span className="font-medium">Filters & Search</span>
          </div>
          <FaSlidersH className={`w-5 h-5 transition-transform duration-200 ${expandFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Enhanced Sidebar for Filters */}
        <div className={`md:w-1/4 md:block ${expandFilters ? 'block' : 'hidden'}`}>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl shadow-xl sticky top-4 text-white border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <FaFilter className="text-blue-400 text-lg" />
                  {filterCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{filterCount}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">Filters</h3>
              </div>
              {filterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium transition-colors duration-200 bg-red-900/20 px-2 py-1 rounded-md hover:bg-red-900/30"
                >
                  <FaTimes className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Search Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FaSearch className="text-blue-400 text-sm" />
                <label className="font-medium text-gray-200 text-sm">Search</label>
              </div>
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pl-9 pr-10 
                             text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 
                             transition-all duration-200 hover:border-gray-500 text-sm"
                    ref={searchRef}
                  />
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 
                             text-white p-1.5 rounded-md transition-colors duration-200 shadow-md"
                  >
                    <FaSearch className="w-3 h-3" />
                  </button>
                </div>

                {/* Enhanced Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 bg-gray-800 w-full mt-1 border border-gray-600 rounded-lg 
                               shadow-2xl max-h-48 overflow-y-auto backdrop-blur-sm">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="p-2 hover:bg-gray-700 cursor-pointer transition-colors duration-200 
                                 border-b border-gray-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-600/20 rounded-md flex items-center justify-center">
                            <FaBox className="text-blue-400 text-xs" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm">{suggestion.name}</div>
                            <div className="text-xs text-gray-400">{suggestion.brand}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Quick Filters Grid */}
            <div className="grid grid-cols-1 gap-3 mb-4">
              {/* Category & Stock in one row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <FaTags className="text-blue-400 text-xs" />
                    <label className="font-medium text-gray-200 text-xs">Category</label>
                  </div>
                  <select
                    value={category}
                    onChange={handleCategoryChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 appearance-none cursor-pointer"
                  >
                    <option value="">All</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <FaBoxOpen className="text-blue-400 text-xs" />
                    <label className="font-medium text-gray-200 text-xs">Stock</label>
                  </div>
                  <select
                    value={stockStatus}
                    onChange={handleStockStatusChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 appearance-none cursor-pointer"
                  >
                    <option value="">All</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Price Range */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <FaDollarSign className="text-blue-400 text-xs" />
                  <label className="font-medium text-gray-200 text-xs">Price Range</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                               focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                               hover:border-gray-500 placeholder-gray-400"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                               focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                               hover:border-gray-500 placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Brand & Sort in one row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <FaShoppingBag className="text-blue-400 text-xs" />
                    <label className="font-medium text-gray-200 text-xs">Brand</label>
                  </div>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Brand"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 placeholder-gray-400"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <FaSort className="text-blue-400 text-xs" />
                    <label className="font-medium text-gray-200 text-xs">Sort</label>
                  </div>
                  <select
                    value={sort}
                    onChange={handleSortChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 appearance-none cursor-pointer"
                  >
                    <option value="-createdAt">Newest</option>
                    <option value="price">Price ↑</option>
                    <option value="-price">Price ↓</option>
                    <option value="-averageRating">Top Rated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Apply Filters Button */}
            <button
              onClick={handleFilterChange}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                       text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm
                       shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]
                       flex items-center justify-center gap-2 border border-blue-500/20 mb-3"
            >
              <FaCheckCircle className="w-3 h-3" />
              <span>Apply Filters</span>
            </button>

            {/* Active Filters Display */}
            {filterCount > 0 && (
              <div className="pt-3 border-t border-gray-700">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-medium text-gray-300">Active:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {searchParams.has('keyword') && (
                    <span className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded text-xs">
                      <FaSearch className="w-2 h-2" />
                      Search
                    </span>
                  )}
                  {category && (
                    <span className="inline-flex items-center gap-1 bg-green-600/20 text-green-300 px-1.5 py-0.5 rounded text-xs">
                      <FaTags className="w-2 h-2" />
                      Category
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span className="inline-flex items-center gap-1 bg-yellow-600/20 text-yellow-300 px-1.5 py-0.5 rounded text-xs">
                      <FaDollarSign className="w-2 h-2" />
                      Price
                    </span>
                  )}
                  {brand && (
                    <span className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded text-xs">
                      <FaShoppingBag className="w-2 h-2" />
                      Brand
                    </span>
                  )}
                  {stockStatus && (
                    <span className="inline-flex items-center gap-1 bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded text-xs">
                      <FaBoxOpen className="w-2 h-2" />
                      Stock
                    </span>
                  )}
                </div>
              </div>
            )}
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
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl shadow-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center text-white border border-gray-600">
                <div className="mb-3 sm:mb-0">
                  <p className="text-gray-300">
                    Showing <span className="font-semibold text-blue-400">{products.length}</span> results
                    {isSearching && <span> for "<span className="font-semibold text-blue-400">{searchParams.get('keyword')}</span>"</span>}
                  </p>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                  <label className="hidden sm:inline mr-2 text-gray-400">Sort:</label>
                  <select
                    value={sort}
                    onChange={handleSortChange}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 w-full sm:w-auto 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white transition-all duration-200"
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
                      className={`px-4 py-2 rounded-md ${currentPage === 1
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
                          className={`min-w-[40px] px-4 py-2 rounded-md ${currentPage === pageNum
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
                      className={`px-4 py-2 rounded-md ${currentPage === totalPages
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
            <div className="bg-gray-800 rounded-xl shadow-md p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
              <p className="text-gray-300 mb-4">
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
