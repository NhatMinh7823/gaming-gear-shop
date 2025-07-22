import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { setProducts as setProductAction } from '../redux/slices/productSlice';
import { toast } from 'react-toastify';
import { getProducts, searchProducts, getCategories, getSearchSuggestions } from '../services/api';
import specificationService from '../services/specificationService';
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
  const [minPriceUnit, setMinPriceUnit] = useState('trieu');
  const [maxPriceUnit, setMaxPriceUnit] = useState('trieu');

  // Helper: convert number + unit to VND
  const priceToVND = (value, unit) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    if (unit === 'trieu') return num * 1_000_000;
    if (unit === 'chuc_trieu') return num * 10_000_000;
    return num;
  };

  // Helper: convert VND to {value, unit}
  // Always keep current unit if possible, only convert value
  const vndToPriceUnit = (vnd, currentUnit = 'trieu') => {
    if (!vnd) return { value: '', unit: currentUnit };
    const num = parseInt(vnd, 10);
    if (currentUnit === 'chuc_trieu') {
      return { value: num / 10_000_000, unit: 'chuc_trieu' };
    }
    // default to 'trieu'
    return { value: num / 1_000_000, unit: 'trieu' };
  };
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
    if (params.minPrice) {
      const { value } = vndToPriceUnit(params.minPrice, minPriceUnit);
      setMinPrice(value);
      // giữ nguyên minPriceUnit
    }
    if (params.maxPrice) {
      const { value } = vndToPriceUnit(params.maxPrice, maxPriceUnit);
      setMaxPrice(value);
      // giữ nguyên maxPriceUnit
    }
    if (params.brand) setBrand(params.brand);
    if (params.stockStatus) setStockStatus(params.stockStatus);
  }, [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await getCategories();
        setCategories(data.categories);
      } catch (error) {
        toast.error('Lỗi khi lấy danh mục');
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
        const limit = 12;
        
        // Check if we have specification-related parameters
        const hasSpecificationParams = Object.keys(params).some(key => 
          key.startsWith('spec_') || key === 'performanceTier' || key === 'useCase' || key === 'advanced'
        );

        let data;
        
        if (hasSpecificationParams) {
          // Use specification filtering API
          setIsSearching(false);
          
          // Build specifications object from spec_ parameters
          const specifications = {};
          Object.entries(params).forEach(([key, value]) => {
            if (key.startsWith('spec_')) {
              const specKey = key.replace('spec_', '');
              specifications[specKey] = value;
            }
          });

          // Build price range object
          const priceRange = {};
          if (params.minPrice) priceRange.min = parseInt(params.minPrice);
          if (params.maxPrice) priceRange.max = parseInt(params.maxPrice);

          const filterParams = {
            category: params.category || category,
            performanceTier: params.performanceTier,
            useCase: params.useCase,
            specifications,
            priceRange: Object.keys(priceRange).length > 0 ? priceRange : undefined,
            sortBy: params.sort || sort || 'name',
            sortOrder: (params.sort || sort)?.startsWith('-') ? 'desc' : 'asc',
            page: parseInt(page),
            limit
          };

          // Clean up sortBy to remove '-' prefix
          if (filterParams.sortBy.startsWith('-')) {
            filterParams.sortBy = filterParams.sortBy.substring(1);
          }

          const response = await specificationService.filterBySpecifications(filterParams);
          data = {
            products: response.data.products,
            totalPages: response.data.totalPages,
            currentPage: response.data.currentPage,
            totalProducts: response.data.totalProducts
          };
          
        } else if (params.keyword) {
          // Use search API
          setIsSearching(true);
          const response = await searchProducts(params.keyword, {
            page,
            limit,
            sort: params.sort || sort || '-createdAt',
            category: params.category || category,
            minPrice: params.minPrice || minPrice,
            maxPrice: params.maxPrice || maxPrice,
            brand: params.brand || brand,
            stockStatus: params.stockStatus || stockStatus,
          });
          data = response.data;
          
        } else {
          // Use regular products API
          setIsSearching(false);
          const response = await getProducts({
            page,
            limit,
            sort: params.sort || sort || '-createdAt',
            category: params.category || category,
            minPrice: params.minPrice || minPrice,
            maxPrice: params.maxPrice || maxPrice,
            brand: params.brand || brand,
            stockStatus: params.stockStatus || stockStatus,
          });
          data = response.data;
        }

        dispatch(setProductAction(data));
      } catch (error) {
        toast.error('Lỗi khi lấy sản phẩm');
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
    const minPriceVND = minPrice ? priceToVND(minPrice, minPriceUnit) : '';
    const maxPriceVND = maxPrice ? priceToVND(maxPrice, maxPriceUnit) : '';
    setSearchParams({
      ...(search && { keyword: search }),
      page: 1,
      ...(sort && { sort }),
      ...(category && { category }),
      ...(minPriceVND && { minPrice: minPriceVND }),
      ...(maxPriceVND && { maxPrice: maxPriceVND }),
      ...(brand && { brand }),
      ...(stockStatus && { stockStatus })
    });
  };

  const handleSuggestionClick = (suggestion) => {
    setSearch(suggestion.name);
    setShowSuggestions(false);
    const minPriceVND = minPrice ? priceToVND(minPrice, minPriceUnit) : '';
    const maxPriceVND = maxPrice ? priceToVND(maxPrice, maxPriceUnit) : '';
    setSearchParams({
      keyword: suggestion.name,
      page: 1,
      ...(sort && { sort }),
      ...(category && { category }),
      ...(minPriceVND && { minPrice: minPriceVND }),
      ...(maxPriceVND && { maxPrice: maxPriceVND }),
      ...(brand && { brand }),
      ...(stockStatus && { stockStatus })
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

  // Auto-update filters when any filter field changes (except search)
  useEffect(() => {
    // Avoid infinite loop: only update if not from searchParams change
    const params = Object.fromEntries(searchParams);
    const minPriceVND = minPrice ? priceToVND(minPrice, minPriceUnit) : '';
    const maxPriceVND = maxPrice ? priceToVND(maxPrice, maxPriceUnit) : '';
    setSearchParams({
      ...(params.keyword && { keyword: params.keyword }),
      page: 1,
      ...(sort && { sort }),
      ...(category && { category }),
      ...(minPriceVND && { minPrice: minPriceVND }),
      ...(maxPriceVND && { maxPrice: maxPriceVND }),
      ...(brand && { brand }),
      ...(stockStatus && { stockStatus })
    });
    // eslint-disable-next-line
  }, [minPrice, minPriceUnit, maxPrice, maxPriceUnit, brand, stockStatus, category, sort]);

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

  // Đếm specification filters
  const specificationFilters = Object.keys(Object.fromEntries(searchParams)).filter(key => 
    key.startsWith('spec_') || key === 'performanceTier' || key === 'useCase'
  );

  const filterCount = [
    minPrice !== '',
    maxPrice !== '',
    brand !== '',
    category !== '',
    sort !== '' && sort !== '-createdAt',
    searchParams.has('keyword'),
    stockStatus !== '',
    ...specificationFilters.map(() => true) // Đếm mỗi specification filter
  ].filter(Boolean).length;

  // const formatPrice = (price) => {
  //   return new Intl.NumberFormat('vi-VN', {
  //     style: 'currency',
  //     currency: 'VND'
  //   }).format(price);
  // };

  return (
    <div className="container mx-auto py-8 px-4 bg-gray-900">
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-2xl p-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Sản phẩm Gaming</h1>
        <p className="text-blue-100 text-lg">
          {isSearching
            ? `Hiển thị kết quả tìm kiếm cho "${searchParams.get('keyword')}"`
            : 'Khám phá bộ sưu tập thiết bị chơi game chất lượng cao của chúng tôi'}
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
            <span className="font-medium">Bộ lọc & Tìm kiếm</span>
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
                <h3 className="text-lg font-bold text-white">Bộ lọc</h3>
              </div>
              {filterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium transition-colors duration-200 bg-red-900/20 px-2 py-1 rounded-md hover:bg-red-900/30"
                >
                  <FaTimes className="w-3 h-3" />
                  <span>Xóa</span>
                </button>
              )}
            </div>

            {/* Search Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FaSearch className="text-blue-400 text-sm" />
                <label className="font-medium text-gray-200 text-sm">Tìm kiếm</label>
              </div>
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm sản phẩm..."
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
                        <label className="font-medium text-gray-200 text-xs">Danh mục</label>
                        </div>
                        <select
                        value={category}
                        onChange={handleCategoryChange}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 appearance-none cursor-pointer"
                        >
                        <option value="">Tất cả</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 mb-1">
                        <FaBoxOpen className="text-blue-400 text-xs" />
                        <label className="font-medium text-gray-200 text-xs">Kho hàng</label>
                        </div>
                        <select
                        value={stockStatus}
                        onChange={handleStockStatusChange}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 appearance-none cursor-pointer"
                        >
                        <option value="">Tất cả</option>
                        <option value="in_stock">Còn hàng</option>
                        <option value="low_stock">Sắp hết hàng</option>
                        <option value="out_of_stock">Hết hàng</option>
                        </select>
                      </div>
                      </div>

                      {/* Price Range with unit dropdown */}
                      <div>
                      <div className="flex items-center gap-1 mb-2">
                        <FaDollarSign className="text-blue-400 text-xs" />
                        <label className="font-medium text-gray-200 text-xs">Khoảng giá</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Min Price */}
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            placeholder="Tối thiểu"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                                 hover:border-gray-500 placeholder-gray-400 pr-14"
                          />
                          <select
                            value={minPriceUnit}
                            onChange={(e) => setMinPriceUnit(e.target.value)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-300 focus:outline-none"
                            style={{ width: '60px' }}
                          >
                            <option value="trieu">triệu</option>
                            <option value="chuc_trieu">chục triệu</option>
                          </select>
                        </div>
                        {/* Max Price */}
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            placeholder="Tối đa"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                                 hover:border-gray-500 placeholder-gray-400 pr-14"
                          />
                          <select
                            value={maxPriceUnit}
                            onChange={(e) => setMaxPriceUnit(e.target.value)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-300 focus:outline-none"
                            style={{ width: '60px' }}
                          >
                            <option value="trieu">triệu</option>
                            <option value="chuc_trieu">chục triệu</option>
                          </select>
                        </div>
                      </div>
                      </div>

                      {/* Brand & Sort in one row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <FaShoppingBag className="text-blue-400 text-xs" />
                    <label className="font-medium text-gray-200 text-xs">Thương hiệu</label>
                  </div>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Thương hiệu"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 placeholder-gray-400"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <FaSort className="text-blue-400 text-xs" />
                    <label className="font-medium text-gray-200 text-xs">Sắp xếp</label>
                  </div>
                  <select
                    value={sort}
                    onChange={handleSortChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-xs
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                             hover:border-gray-500 appearance-none cursor-pointer"
                  >
                    <option value="-createdAt">Mới nhất</option>
                    <option value="discountPrice">Giá tăng dần</option>
                    <option value="-discountPrice">Giá giảm dần</option>
                    <option value="-averageRating">Đánh giá cao</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Apply Filters Button */}
            

            {/* Active Filters Display */}
            {filterCount > 0 && (
              <div className="pt-3 border-t border-gray-700">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-medium text-gray-300">Đang áp dụng:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {searchParams.has('keyword') && (
                    <span className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded text-xs">
                      <FaSearch className="w-2 h-2" />
                      Tìm kiếm
                    </span>
                  )}
                  {category && (
                    <span className="inline-flex items-center gap-1 bg-green-600/20 text-green-300 px-1.5 py-0.5 rounded text-xs">
                      <FaTags className="w-2 h-2" />
                      Danh mục
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span className="inline-flex items-center gap-1 bg-yellow-600/20 text-yellow-300 px-1.5 py-0.5 rounded text-xs">
                      <FaDollarSign className="w-2 h-2" />
                      Giá
                    </span>
                  )}
                  {brand && (
                    <span className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded text-xs">
                      <FaShoppingBag className="w-2 h-2" />
                      Thương hiệu
                    </span>
                  )}
                  {stockStatus && (
                    <span className="inline-flex items-center gap-1 bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded text-xs">
                      <FaBoxOpen className="w-2 h-2" />
                      Kho hàng
                    </span>
                  )}
                  {searchParams.get('performanceTier') && (
                    <span className="inline-flex items-center gap-1 bg-indigo-600/20 text-indigo-300 px-1.5 py-0.5 rounded text-xs">
                      <FaCheckCircle className="w-2 h-2" />
                      {searchParams.get('performanceTier')}
                    </span>
                  )}
                  {searchParams.get('useCase') && (
                    <span className="inline-flex items-center gap-1 bg-pink-600/20 text-pink-300 px-1.5 py-0.5 rounded text-xs">
                      <FaCheckCircle className="w-2 h-2" />
                      {searchParams.get('useCase')}
                    </span>
                  )}
                  {specificationFilters.filter(key => key.startsWith('spec_')).map(key => (
                    <span key={key} className="inline-flex items-center gap-1 bg-violet-600/20 text-violet-300 px-1.5 py-0.5 rounded text-xs">
                      <FaCheckCircle className="w-2 h-2" />
                      {key.replace('spec_', '')}: {searchParams.get(key)}
                    </span>
                  ))}
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
                    Hiển thị <span className="font-semibold text-blue-400">{products.length}</span> kết quả
                    {isSearching && <span> cho "<span className="font-semibold text-blue-400">{searchParams.get('keyword')}</span>"</span>}
                  </p>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                  <label className="hidden sm:inline mr-2 text-gray-400">Sắp xếp:</label>
                  <select
                    value={sort}
                    onChange={handleSortChange}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 w-full sm:w-auto 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white transition-all duration-200"
                  >
                    <option value="-createdAt">Mới nhất</option>
                    <option value="discountPrice">Giá tăng dần</option>
                    <option value="-discountPrice">Giá giảm dần</option>
                    <option value="-averageRating">Đánh giá cao</option>
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
              <h3 className="text-lg font-semibold text-white mb-2">Không tìm thấy sản phẩm</h3>
              <p className="text-gray-300 mb-4">
                {isSearching
                  ? `Không tìm thấy sản phẩm nào phù hợp với "${searchParams.get('keyword')}"`
                  : "Không có sản phẩm nào phù hợp với bộ lọc bạn đã chọn."}
              </p>
              <button
                onClick={clearFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
