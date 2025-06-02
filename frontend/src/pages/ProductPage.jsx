import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { getProductById, createReview, addCartItem, addToWishlist, removeFromWishlist } from '../services/api';
import { setCart } from '../redux/slices/cartSlice';
import {
  FaStar, FaRegStar, FaShoppingCart, FaMinus, FaPlus, FaCheck,
  FaArrowLeft, FaSpinner, FaExclamationCircle, FaBoxOpen, FaHeart, FaRegHeart,
  FaList, FaClipboardList
} from 'react-icons/fa';
import useWishlist from '../hooks/useWishlist';

function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const { userInfo } = useSelector((state) => state.user);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const { refreshWishlist, clearCache } = useWishlist();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Cuộn trang lên đầu khi component được mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await getProductById(id);
        setProduct(data.product);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Error fetching product details.';
        toast.error(errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await addCartItem({ productId: id, quantity });
      dispatch(setCart(data.cart));
      toast.success('Added to cart');
    } catch (error) {
      toast.error('Error adding to cart');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!userInfo) {
      navigate('/login');
      return;
    }
    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }
    if (!title.trim()) {
      toast.error('Please provide a review title');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please provide a review comment');
      return;
    }
    try {
      await createReview({ productId: id, rating, title, comment });
      toast.success('Review submitted');
      setRating(0);
      setTitle('');
      setComment('');
      const { data } = await getProductById(id);
      setProduct(data.product);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting review');
    }
  };

  const handleWishlistClick = async () => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    try {
      setLoadingWishlist(true);
      if (wishlistItems.includes(id)) {
        await removeFromWishlist(id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(id);
        toast.success('Added to wishlist');
      }
      // Clear wishlist cache to ensure chatbot gets fresh data
      clearCache();
      // Refresh wishlist to update the UI
      await refreshWishlist(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating wishlist');
    } finally {
      setLoadingWishlist(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <span key={index} className="text-xl">
        {index < Math.floor(rating) ? (
          <FaStar className="text-yellow-400" />
        ) : (
          <FaRegStar className="text-yellow-400" />
        )}
      </span>
    ));
  };

  const calculateDiscount = (original, discounted) => {
    if (!discounted) return null;
    const percentage = ((original - discounted) / original) * 100;
    return Math.round(percentage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <FaSpinner className="animate-spin text-blue-400 text-3xl" />
          <span className="text-gray-300 text-lg">Loading product details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationCircle className="text-red-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">Error Loading Product</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Link to="/products" className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2">
            <FaArrowLeft /> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationCircle className="text-gray-400 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">Product Not Found</h2>
          <p className="text-gray-300 mb-4">This product may have been removed or is no longer available.</p>
          <Link to="/products" className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2">
            <FaArrowLeft /> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const discount = calculateDiscount(product.price, product.discountPrice);

  // Hàm xác định trạng thái tồn kho và màu sắc tương ứng
  const getStockStatus = () => {
    if (product.stock <= 0) return { text: 'Hết hàng', color: 'text-red-500 bg-red-900/30' };
    if (product.stock <= 5) return { text: `Còn ${product.stock} sản phẩm`, color: 'text-yellow-500 bg-yellow-900/30' };
    return { text: 'Còn hàng', color: 'text-green-500 bg-green-900/30' };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="container mx-auto">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-gray-300 hover:text-gray-100 mb-6 transition-colors"
        >
          <FaArrowLeft />
          <span>Back to Products</span>
        </Link>

        <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            {/* Image Section */}
            <div className="relative">
              <div className="aspect-w-1 aspect-h-1 rounded-xl overflow-hidden bg-gray-700">
                <img
                  src={product.images[0]?.url || 'https://via.placeholder.com/300'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {discount && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col">
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-3xl font-bold text-gray-100">{product.name}</h1>
                  <button
                    onClick={handleWishlistClick}
                    disabled={loadingWishlist}
                    className={`p-3 rounded-full ${wishlistItems.includes(id)
                      ? 'bg-red-500/10 hover:bg-red-500/20'
                      : 'bg-gray-700 hover:bg-gray-600'
                      } transition-colors duration-300`}
                    aria-label={wishlistItems.includes(id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    {loadingWishlist ? (
                      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : wishlistItems.includes(id) ? (
                      <FaHeart className="w-6 h-6 text-red-500" />
                    ) : (
                      <FaRegHeart className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1">
                    {renderStars(product.averageRating || 0)}
                  </div>
                  <span className="text-gray-400">
                    ({product.numReviews} reviews)
                  </span>
                </div>

                {/* Hiển thị trạng thái tồn kho */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${stockStatus.color}`}>
                    <FaBoxOpen />
                    <span className="font-medium">{stockStatus.text}</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold text-blue-400">
                    {formatPrice(product.discountPrice || product.price)}
                  </span>
                  {product.discountPrice && (
                    <span className="text-xl text-gray-500 line-through">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>

                <div className="prose max-w-none text-gray-300 mb-6">
                  {product.description}
                </div>
              </div>

              <div className="space-y-6 mt-auto">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-300">Quantity:</span>
                  <div className="flex items-center border-2 border-gray-600 rounded-lg bg-gray-700">
                    <button
                      onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                      className="px-3 py-2 text-gray-300 hover:text-blue-400 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <FaMinus className={quantity <= 1 ? 'text-gray-500' : ''} />
                    </button>                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
                      className="w-16 text-center border-x-2 border-gray-600 py-2 focus:outline-none bg-gray-700 text-gray-200"
                      style={{
                        MozAppearance: 'textfield',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                      onWheel={(e) => e.target.blur()}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(quantity + 1, product.stock))}
                      className="px-3 py-2 text-gray-300 hover:text-blue-400 transition-colors"
                      disabled={quantity >= product.stock}
                    >
                      <FaPlus className={quantity >= product.stock ? 'text-gray-500' : ''} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  className={`w-full bg-gradient-to-r ${product.stock <= 0 ? 'from-gray-600 to-gray-700 cursor-not-allowed' : 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'} text-white px-8 py-3 
                           rounded-xl transition duration-300 
                           flex items-center justify-center gap-2 font-medium shadow-md`}
                  disabled={product.stock <= 0}
                >
                  <FaShoppingCart />
                  <span>{product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Specifications & Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Specifications Section */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaClipboardList className="text-blue-400 text-xl" />
                <h2 className="text-2xl font-bold text-gray-100">Thông số kỹ thuật</h2>
              </div>
              <div className="space-y-3">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-gray-700">
                    <div className="text-gray-400 font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                    <div className="text-gray-100 col-span-2">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features Section */}
          {product.features && product.features.length > 0 && (
            <div className="bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaList className="text-blue-400 text-xl" />
                <h2 className="text-2xl font-bold text-gray-100">Tính năng nổi bật</h2>
              </div>
              <ul className="list-disc list-inside space-y-2 text-gray-100">
                {product.features.map((feature, index) => (
                  <li key={index} className="py-1.5 flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">Customer Reviews</h2>

          {userInfo && (
            <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Write a Review</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRating(r)}
                        className="text-2xl focus:outline-none transition-colors"
                      >
                        {r <= rating ? (
                          <FaStar className="text-yellow-400" />
                        ) : (
                          <FaRegStar className="text-yellow-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-600 rounded-lg px-4 py-2 bg-gray-700 text-gray-200
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Summary of your experience"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Review</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full border border-gray-600 rounded-lg px-4 py-2 bg-gray-700 text-gray-200
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                    placeholder="Share your experience with this product"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg 
                           hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Submit Review
                </button>
              </form>
            </div>
          )}

          <div className="space-y-6">
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map((review) => (
                <div key={review._id} className="bg-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-semibold text-gray-200">{review.user?.name}</p>
                      <div className="flex gap-1 mt-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    {review.isVerifiedPurchase && (
                      <div className="flex items-center gap-1 text-green-400 bg-green-900 px-3 py-1 rounded-full">
                        <FaCheck className="text-sm" />
                        <span className="text-sm font-medium">Verified Purchase</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-200 mb-2">{review.title}</h4>
                  <p className="text-gray-400">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center bg-gray-800 rounded-xl shadow-sm p-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-400 text-lg">No reviews yet. Be the first to review this product!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
