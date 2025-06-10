import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiShoppingBag, 
  FiMonitor, 
  FiHeadphones, 
  FiType, 
  FiHardDrive,
  FiCpu,
  FiDollarSign,
  FiSettings,
  FiWifi,
  FiVolumeX,
  FiZap,
  FiRefreshCw,
  FiEye,
  FiMove,
  FiTarget,
  FiTrendingUp,
  FiAward,
  FiFilter
} from 'react-icons/fi';
import { getCategories } from '../../services/api';
import specificationService from '../../services/specificationService';

const ProductDropdown = ({ isVisible, onMouseEnter, onMouseLeave }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dynamicCategorySpecs, setDynamicCategorySpecs] = useState({});
  const [loading, setLoading] = useState(true);
  const [specsLoading, setSpecsLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Performance Tiers
  const performanceTiers = [
    { 
      key: 'entry', 
      label: 'Cơ bản', 
      description: 'Phù hợp cho người dùng mới',
      icon: FiTarget,
      color: 'emerald'
    },
    { 
      key: 'mid', 
      label: 'Tầm trung', 
      description: 'Cân bằng hiệu suất và giá cả',
      icon: FiTrendingUp,
      color: 'blue' 
    },
    { 
      key: 'high', 
      label: 'Cao cấp', 
      description: 'Hiệu suất tối đa cho chuyên gia',
      icon: FiAward,
      color: 'purple'
    }
  ];

  // Use Cases
  const useCases = [
    {
      key: 'competitive',
      label: 'Gaming cạnh tranh',
      description: 'Esports và gaming chuyên nghiệp',
      icon: FiZap,
      color: 'red'
    },
    {
      key: 'content',
      label: 'Sáng tạo nội dung',
      description: 'Streaming, video editing',
      icon: FiCpu,
      color: 'indigo'
    },
    {
      key: 'casual',
      label: 'Gaming giải trí',
      description: 'Chơi game thường ngày',
      icon: FiShoppingBag,
      color: 'green'
    }
  ];

  // Price ranges in VND
  const priceRanges = [
    { label: 'Dưới 1 triệu', min: 0, max: 1000000, icon: FiDollarSign },
    { label: '1-2 triệu', min: 1000000, max: 2000000, icon: FiDollarSign },
    { label: '2-5 triệu', min: 2000000, max: 5000000, icon: FiDollarSign },
    { label: '5-8 triệu', min: 5000000, max: 8000000, icon: FiDollarSign },
    { label: '8-10 triệu', min: 8000000, max: 10000000, icon: FiDollarSign },
    { label: 'Trên 10 triệu', min: 10000000, max: null, icon: FiDollarSign }
  ];

  // Technical specifications by category type
  const categorySpecs = {
    'headset': [
      { label: 'Wireless/Có dây', icon: FiWifi },
      { label: 'Chống ồn', icon: FiVolumeX },
      { label: 'Âm thanh vòm', icon: FiHeadphones },
      { label: 'Microphone tháo rời', icon: FiSettings }
    ],
    'keyboard': [
      { label: 'Cơ/Màng', icon: FiType },
      { label: 'Đèn RGB', icon: FiZap },
      { label: 'Loại switch', icon: FiSettings },
      { label: 'Wireless/Có dây', icon: FiWifi }
    ],
    'mouse': [
      { label: 'DPI cao', icon: FiMove },
      { label: 'Wireless/Có dây', icon: FiWifi },
      { label: 'Số nút bấm', icon: FiSettings },
      { label: 'RGB Lighting', icon: FiZap }
    ],
    'monitor': [
      { label: 'Độ phân giải 4K', icon: FiMonitor },
      { label: 'Tần số quét cao', icon: FiRefreshCw },
      { label: 'Panel IPS/VA', icon: FiEye },
      { label: 'G-Sync/FreeSync', icon: FiSettings }
    ],
    'storage': [
      { label: 'SSD/HDD', icon: FiHardDrive },
      { label: 'Dung lượng lớn', icon: FiHardDrive },
      { label: 'Tốc độ đọc/ghi', icon: FiZap },
      { label: 'M.2 NVMe', icon: FiSettings }
    ],
    'default': [
      { label: 'Chất lượng cao', icon: FiSettings },
      { label: 'Bảo hành chính hãng', icon: FiShoppingBag },
      { label: 'Tương thích rộng', icon: FiZap },
      { label: 'Thiết kế gaming', icon: FiCpu }
    ]
  };

  // Category icons mapping
  const categoryIcons = {
    'headset': FiHeadphones,
    'keyboard': FiType,
    'mouse': FiMove,
    'monitor': FiMonitor,
    'storage': FiHardDrive,
    'default': FiShoppingBag
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data } = await getCategories();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    if (isVisible) {
      fetchCategories();
    }
  }, [isVisible]);

  // Fetch category specifications khi có selectedCategory
  useEffect(() => {
    const fetchCategorySpecs = async () => {
      if (!selectedCategory) {
        setDynamicCategorySpecs({});
        return;
      }

      try {
        setSpecsLoading(true);
        const response = await specificationService.getCategorySpecifications(selectedCategory._id);
        setDynamicCategorySpecs(response.data.specifications || {});
      } catch (error) {
        console.error('Error fetching category specs:', error);
        setDynamicCategorySpecs({});
      } finally {
        setSpecsLoading(false);
      }
    };

    fetchCategorySpecs();
  }, [selectedCategory]);

  const getCategoryType = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('headset') || name.includes('tai nghe')) return 'headset';
    if (name.includes('keyboard') || name.includes('bàn phím')) return 'keyboard';
    if (name.includes('mouse') || name.includes('chuột')) return 'mouse';
    if (name.includes('monitor') || name.includes('màn hình')) return 'monitor';
    if (name.includes('storage') || name.includes('ổ cứng') || name.includes('ssd')) return 'storage';
    return 'default';
  };

  const getCategoryIcon = (categoryName) => {
    const type = getCategoryType(categoryName);
    const IconComponent = categoryIcons[type];
    return IconComponent;
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=${categoryId}`);
  };

  const handlePriceClick = (range) => {
    const params = new URLSearchParams();
    if (range.min !== null) params.set('minPrice', range.min.toString());
    if (range.max !== null) params.set('maxPrice', range.max.toString());
    navigate(`/products?${params.toString()}`);
  };

  const handleSpecClick = (category) => {
    if (category) {
      navigate(`/products?category=${category._id}`);
    } else {
      navigate('/products');
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[900px] max-w-[95vw] 
                 bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl shadow-2xl 
                 border border-gray-700/50 backdrop-blur-sm z-50 overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }}
    >
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700/50">
              <FiShoppingBag className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Danh mục sản phẩm</h3>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-10 bg-gray-700/50 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                categories.map((category) => {
                  const IconComponent = getCategoryIcon(category.name);
                  return (
                    <button
                      key={category._id}
                      onClick={() => handleCategoryClick(category._id)}
                      onMouseEnter={() => setSelectedCategory(category)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left
                               bg-gray-800/30 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20
                               text-gray-300 hover:text-white transition-all duration-300
                               border border-transparent hover:border-blue-500/30 group"
                    >
                      <div className="p-2 rounded-lg bg-gray-700/50 group-hover:bg-blue-600/20 transition-colors duration-300">
                        <IconComponent className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{category.name}</span>
                        {category.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{category.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Price Ranges */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700/50">
              <FiDollarSign className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Khoảng giá</h3>
            </div>
            
            <div className="space-y-2">
              {priceRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handlePriceClick(range)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left
                           bg-gray-800/30 hover:bg-gradient-to-r hover:from-green-600/20 hover:to-emerald-600/20
                           text-gray-300 hover:text-white transition-all duration-300
                           border border-transparent hover:border-green-500/30 group"
                >
                  <div className="p-2 rounded-lg bg-gray-700/50 group-hover:bg-green-600/20 transition-colors duration-300">
                    <range.icon className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{range.label}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      {range.min?.toLocaleString('vi-VN')} - {range.max ? range.max.toLocaleString('vi-VN') : '∞'} VND
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: Dynamic Specifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700/50">
              <FiSettings className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Thông số kỹ thuật</h3>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {selectedCategory ? (
                <>
                  {/* Category Header */}
                  <div className="mb-3 p-3 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getCategoryIcon(selectedCategory.name);
                        return <IconComponent className="w-4 h-4 text-purple-400" />;
                      })()}
                      <span className="text-sm font-medium text-purple-300">
                        {selectedCategory.name}
                      </span>
                    </div>
                  </div>

                  {/* Loading State */}
                  {specsLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-12 bg-gray-700/50 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Dynamic Specifications */
                    Object.keys(dynamicCategorySpecs).length > 0 ? (
                      Object.entries(dynamicCategorySpecs).map(([specKey, specValues]) => (
                        <div key={specKey} className="space-y-1">
                          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2">
                            {specKey === 'type' ? 'Loại' :
                             specKey === 'switches' ? 'Switch' :
                             specKey === 'connectivity' ? 'Kết nối' :
                             specKey === 'backlight' ? 'Đèn nền' :
                             specKey === 'layout' ? 'Layout' :
                             specKey === 'sensor' ? 'Cảm biến' :
                             specKey === 'weight' ? 'Trọng lượng' :
                             specKey === 'dpi' ? 'DPI' :
                             specKey === 'battery' ? 'Pin' :
                             specKey === 'microphone' ? 'Micro' :
                             specKey === 'frequency' ? 'Tần số' :
                             specKey === 'size' ? 'Kích thước' :
                             specKey === 'resolution' ? 'Độ phân giải' :
                             specKey === 'refresh_rate' ? 'Tần số quét' :
                             specKey === 'response_time' ? 'Thời gian phản hồi' :
                             specKey === 'panel' ? 'Panel' :
                             specKey === 'processor' ? 'CPU' :
                             specKey === 'graphics' ? 'GPU' :
                             specKey === 'memory' ? 'RAM' :
                             specKey === 'storage' ? 'Lưu trữ' :
                             specKey === 'display' ? 'Màn hình' :
                             specKey === 'motherboard' ? 'Mainboard' :
                             specKey}
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {specValues.slice(0, 5).map((value, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  const params = new URLSearchParams();
                                  params.set('category', selectedCategory._id);
                                  params.set(`spec_${specKey}`, value);
                                  navigate(`/products?${params.toString()}`);
                                }}
                                className="w-full flex items-center gap-2 p-2 rounded-md text-left
                                         bg-gray-800/30 hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-indigo-600/20
                                         text-gray-300 hover:text-white transition-all duration-200
                                         border border-transparent hover:border-purple-500/30 text-xs"
                              >
                                <div className="w-2 h-2 rounded-full bg-purple-500/50"></div>
                                <span className="flex-1 truncate">{value}</span>
                                {specValues.length > 5 && index === 4 && (
                                  <span className="text-xs text-gray-500">+{specValues.length - 5}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <FiSettings className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-xs">
                          Không có thông số kỹ thuật
                        </p>
                      </div>
                    )
                  )}

                  {/* View All Button */}
                  <div className="mt-4 pt-3 border-t border-gray-700/30">
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        params.set('category', selectedCategory._id);
                        params.set('advanced', 'true');
                        navigate(`/products?${params.toString()}`);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-lg
                               bg-gradient-to-r from-purple-600/20 to-indigo-600/20
                               border border-purple-500/30 text-purple-300 hover:text-white
                               transition-all duration-300 hover:from-purple-600/30 hover:to-indigo-600/30"
                    >
                      <FiFilter className="w-4 h-4" />
                      <span className="text-xs font-medium">Xem tất cả thông số</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Default State */
                <>
                  <div className="text-center py-6">
                    <FiSettings className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm mb-2">
                      Hover vào danh mục để xem thông số kỹ thuật
                    </p>
                    <p className="text-gray-500 text-xs">
                      Chọn danh mục để lọc theo specifications cụ thể
                    </p>
                  </div>
                  
                  {/* Quick Filter Options */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2">
                      Lọc nhanh
                    </h4>
                    {performanceTiers.slice(0, 3).map((tier) => (
                      <button
                        key={tier.key}
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('performanceTier', tier.key);
                          navigate(`/products?${params.toString()}`);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-md text-left
                                 bg-gray-800/30 hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-indigo-600/20
                                 text-gray-300 hover:text-white transition-all duration-200
                                 border border-transparent hover:border-purple-500/30 text-xs"
                      >
                        <tier.icon className="w-3 h-3 text-purple-400" />
                        <span className="flex-1">{tier.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <Link
            to="/products"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                     text-white font-medium py-3 px-6 rounded-xl transition-all duration-300
                     flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <FiShoppingBag className="w-5 h-5" />
            <span>Xem tất cả sản phẩm</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(96, 165, 250, 0.5);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(96, 165, 250, 0.8);
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ProductDropdown;
