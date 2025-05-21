import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setProducts } from "../redux/slices/productSlice";
import api from "../services/api";
import { FaStar, FaRegStar, FaShoppingCart, FaHeart, FaEye, FaRegHeart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { setCart } from '../redux/slices/cartSlice';


const HomePage = () => {
  const navigate = useNavigate();
  const featuredCategoriesRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errorCategories, setErrorCategories] = useState(null);
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.product);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [banners, setBanners] = useState([]);
  const [loadingProductIds, setLoadingProductIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadingCategories(true);
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          api.get("/products/featured"),
          api.get("/categories/featured"),
        ]);

        dispatch(
          setProducts({
            products: productsResponse.data.products,
            totalPages: 1,
            currentPage: 1,
          })
        );
        setCategories(categoriesResponse.data.categories);

        // Lấy danh sách thương hiệu
        const allProductsResponse = await api.get("/products", { params: { limit: 100 } });
        const uniqueBrands = [
          ...new Set(allProductsResponse.data.products.map((p) => p.brand)),
        ].slice(0, 6);
        setBrands(uniqueBrands);

        // Lấy đánh giá từ các sản phẩm nổi bật
        const reviewPromises = productsResponse.data.products
          .slice(0, 3)
          .map((product) => api.get(`/reviews/product/${product._id}`));
        const reviewResponses = await Promise.all(reviewPromises);
        const topReviews = reviewResponses
          .flatMap((res) => res.data.reviews)
          .filter((review) => review.rating >= 4)
          .slice(0, 3);
        setReviews(topReviews);
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorCategories(error.message || "Failed to fetch categories");
      } finally {
        setIsLoading(false);
        setLoadingCategories(false);
      }
    };

    fetchData();
  }, [dispatch]);

  useEffect(() => {

    const bannerImages = [
      "banner_6.png",
      "banner_7.png",
      "banner_8.png",
      "banner_9.png",
    ];
    setBanners(bannerImages);
  }, []);

  // Set up rotation interval
  useEffect(() => {
    if (banners.length <= 1) return;

    const rotationInterval = setInterval(() => {
      setCurrentBannerIndex(prevIndex =>
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      );
    }, 2000);

    return () => clearInterval(rotationInterval);
  }, [banners.length]);

  const ProductSkeleton = () => (
    <div className="bg-gray-700 rounded-lg shadow-md overflow-hidden transition-transform duration-300 animate-pulse">
      <div className="h-64 bg-gray-600"></div>
      <div className="p-4">
        <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-600 rounded w-1/2 mb-4"></div>
        <div className="h-6 bg-gray-600 rounded w-1/4"></div>
      </div>
    </div>
  );

  const CategorySkeleton = () => (
    <div className="relative overflow-hidden rounded-lg shadow-md h-40 animate-pulse">
      <div className="h-full w-full bg-gray-600"></div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-800 to-transparent">
        <div className="h-4 bg-gray-500 rounded w-1/2"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative h-[500px] overflow-hidden mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-transparent z-10"></div>

        {/* Banner Images */}
        <div className="absolute inset-0 w-full h-full">
          {banners.map((banner, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentBannerIndex
                ? "opacity-100 translate-x-0"
                : index < currentBannerIndex
                  ? "opacity-0 -translate-x-full"
                  : "opacity-0 translate-x-full"
                }`}
            >
              <img
                src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/images/banners/${banner}`}
                alt={`Banner sản phẩm công nghệ ${index + 1}`}
                className="w-full h-full object-cover object-top"
              />
            </div>
          ))}
        </div>

        {/* Indicators */}
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBannerIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${index === currentBannerIndex
                ? "bg-white w-6"
                : "bg-white/50 hover:bg-white/80"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Hero content */}
        <div className="container mx-auto px-4 h-full flex items-center relative z-20">
          <div className="max-w-xl text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Công Nghệ Hiện Đại Cho Cuộc Sống Thông Minh
            </h1>
            <p className="text-lg mb-8">
              Khám phá bộ sưu tập sản phẩm công nghệ cao cấp mới nhất với thiết
              kế tinh tế và tính năng vượt trội.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/products')}
                className="bg-white text-indigo-900 px-6 py-3 rounded-button font-medium hover:bg-opacity-90 transition-all duration-300 cursor-pointer whitespace-nowrap"
              >
                Mua Ngay
              </button>
              <button
                onClick={() => featuredCategoriesRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-white text-white px-6 py-3 rounded-button font-medium hover:bg-white hover:bg-opacity-10 transition-all duration-300 cursor-pointer whitespace-nowrap"
              >
                Tìm Hiểu Thêm
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Featured Categories */}
      <div ref={featuredCategoriesRef} className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-100">Danh Mục Nổi Bật</h2>
        </div>
        {loadingCategories ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, index) => (
              <CategorySkeleton key={index} />
            ))}
          </div>
        ) : errorCategories ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            <div className="flex items-center mb-2">
              <i className="fas fa-exclamation-circle mr-2"></i>
              <h3 className="font-medium">Lỗi tải danh mục</h3>
            </div>
            <p className="text-sm">{errorCategories}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <div
                key={category._id}
                onClick={() => navigate(`/products?category=${category._id}`)}
                className="relative overflow-hidden rounded-lg shadow-md group cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-indigo-900/20 z-10 opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>
                <img
                  src={category.image?.url
                    ? (category.image.url.startsWith('http')
                      ? category.image.url
                      : `${process.env.REACT_APP_API_URL}${category.image.url}`)
                    : `${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/default-category.jpg`
                  }
                  alt={category.name}
                  className="w-full h-40 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <h3 className="text-white font-medium">{category.name}</h3>
                  {category.productCount && (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-indigo-200">{category.productCount} sản phẩm</span>
                    </div>
                  )}
                </div>
                <div className="absolute top-0 right-0 m-2 z-20">
                  <div className="bg-indigo-500/80 text-white text-xs px-2 py-1 rounded-full opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    Xem ngay
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Featured Products */}
      <div className="bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-100">
              Sản Phẩm Nổi Bật
            </h2>
            <button
              onClick={() => navigate('/products')}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center cursor-pointer whitespace-nowrap"
            >
              Xem tất cả
              <i className="fas fa-arrow-right ml-2 text-sm"></i>
            </button>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="bg-gray-700 rounded-lg shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div
                    className="relative h-64 overflow-hidden"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    <img
                      src={product.images?.[0]?.url
                        ? (product.images[0].url.startsWith('http')
                          ? product.images[0].url
                          : `${process.env.REACT_APP_API_URL}${product.images[0].url}`)
                        : `${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/default-product.jpg`
                      }
                      alt={product.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.discountPrice && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                      </div>
                    )}
                    {product.countInStock <= 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">Hết hàng</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Wishlist logic - you can implement a proper service call here
                          toast.info(`Added ${product.name} to wishlist`);
                        }}
                        className="bg-white text-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 hover:text-red-500 transition-colors duration-300"
                        aria-label="Add to wishlist"
                      >
                        <FaRegHeart size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/product/${product._id}`);
                        }}
                        className="bg-white text-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 hover:text-blue-500 transition-colors duration-300"
                        aria-label="Quick view"
                      >
                        <FaEye size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-1">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>
                            {i < Math.round(product.averageRating || 0) ? (
                              <FaStar className="text-yellow-400" />
                            ) : (
                              <FaRegStar className="text-gray-300" />
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-500 text-sm ml-2">
                        ({product.numReviews || 0})
                      </span>
                    </div>
                    <h3
                      className="font-medium text-gray-100 mb-2 line-clamp-2 hover:text-indigo-300 transition-colors"
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        {product.discountPrice ? (
                          <div className="flex items-center">
                            <span className="text-lg font-bold text-indigo-400">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND'
                              }).format(product.discountPrice)}
                            </span>
                            <span className="text-sm text-gray-500 line-through ml-2">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND'
                              }).format(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-indigo-400">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(product.price)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault(); // Thêm dòng này
                          if (product.countInStock > 0) {
                            try {
                              setLoadingProductIds(prev => [...prev, product._id]);
                              const { data } = await api.post('/cart/items', {
                                productId: product._id,
                                quantity: 1
                              });

                              dispatch(setCart(data.cart));
                              toast.success('Đã thêm sản phẩm vào giỏ hàng');
                            } catch (error) {
                              toast.error('Không thể thêm vào giỏ hàng');
                            } finally {
                              setLoadingProductIds(prev => prev.filter(id => id !== product._id));
                            }
                          }
                        }}
                        disabled={product.countInStock <= 0 || loadingProductIds.includes(product._id)}
                        className={`p-3 rounded-full ${product.countInStock > 0
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-gray-500 text-gray-300 cursor-not-allowed"
                          } transition-colors duration-300 relative z-20`}
                        aria-label="Add to cart"
                      >
                        {loadingProductIds.includes(product._id) ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <FaShoppingCart size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Special Offer Banner */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <span className="text-indigo-100 text-sm font-medium mb-2">
                ƯU ĐÃI ĐẶC BIỆT
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Giảm Đến 30% Cho Đơn Hàng Đầu Tiên
              </h2>
              <p className="text-indigo-100 mb-8">
                Đăng ký nhận thông báo để không bỏ lỡ những ưu đãi đặc biệt và
                sản phẩm mới nhất từ chúng tôi.
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <input
                  type="email"
                  placeholder="Email của bạn"
                  className="px-4 py-3 rounded-button border-none focus:ring-2 focus:ring-indigo-300 focus:outline-none text-sm"
                />
                <button className="bg-white text-indigo-600 px-6 py-3 rounded-button font-medium hover:bg-indigo-50 transition-colors duration-300 cursor-pointer whitespace-nowrap">
                  Đăng Ký Ngay
                </button>
              </div>
            </div>
            <div className="w-full md:w-1/2 relative">
              <img
                src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/images/banners/special-offer.jpg`}
                alt="Ưu đãi đặc biệt"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Testimonials */}
      <div className="bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-100 mb-4">
              Khách Hàng Nói Gì Về Chúng Tôi
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Những đánh giá chân thực từ khách hàng đã trải nghiệm sản phẩm và
              dịch vụ của chúng tôi.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-gray-700 p-6 rounded-lg shadow-md"
                >
                  <div className="flex text-yellow-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <i
                        key={i}
                        className={`fas fa-star ${i < review.rating ? "text-yellow-400" : "text-gray-300"}`}
                      ></i>
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6">{review.comment}</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center mr-4">
                      <span className="text-indigo-300 font-bold">
                        {review.user.name
                          ? review.user.name.charAt(0).toUpperCase()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">
                        {review.user.name || "Khách hàng"}
                      </h4>
                      <p className="text-gray-500 text-sm">Khách hàng</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center text-gray-500">
                Chưa có đánh giá nào.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Brands */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-100 mb-4">
            Thương Hiệu Đối Tác
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Chúng tôi hợp tác với những thương hiệu hàng đầu để mang đến sản
            phẩm chất lượng cao nhất.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8">
          {brands.map((brand, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all duration-300"
            >
              <div className="text-center">
                <p className="text-2xl text-gray-300 font-medium">{brand}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
