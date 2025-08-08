import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaStar, FaRegStar, FaShoppingCart, FaBoxOpen, FaHeart, FaRegHeart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { WISHLIST, CART } from '../utils/toastMessages';
import { addToWishlist, removeFromWishlist, addCartItem } from '../services/api';
import { setCart } from '../redux/slices/cartSlice';
import useWishlist from '../hooks/useWishlist';
import { useState } from 'react';

function ProductCard({ product }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const { refreshWishlist, clearCache } = useWishlist();
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);
  const handleWishlistClick = async (e) => {
    e.preventDefault(); // Prevent navigating to product detail
    e.stopPropagation();

    if (!userInfo) {
      navigate('/login');
      return;
    } try {
      setLoadingWishlist(true);
      if (wishlistItems.includes(product._id)) {
        await removeFromWishlist(product._id);
        toast.success(WISHLIST.REMOVED_SUCCESS);
      } else {
        await addToWishlist(product._id);
        toast.success(WISHLIST.ADDED_SUCCESS);
      }
      // Clear cache to ensure fresh data for chatbot
      clearCache();
      // Refresh wishlist to update the UI
      await refreshWishlist(true);
    } catch (error) {
      toast.error(error.response?.data?.message || WISHLIST.UPDATE_ERROR);
    } finally {
      setLoadingWishlist(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo) {
      navigate('/login');
      return;
    }

    if (product.stock <= 0) {
      toast.error(CART.OUT_OF_STOCK);
      return;
    }

    try {
      setLoadingCart(true);
      const { data } = await addCartItem({ productId: product._id, quantity: 1 });
      dispatch(setCart(data.cart));
      toast.success(CART.ADDED_SUCCESS);
    } catch (error) {
      toast.error(error.response?.data?.message || CART.ADDED_ERROR);
    } finally {
      setLoadingCart(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${product._id}`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <span key={index}>
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

  const discount = calculateDiscount(product.price, product.discountPrice);

  const getStockStatusClass = (stock) => {
    if (stock <= 0) return 'text-red-500';
    if (stock <= 5) return 'text-yellow-500';
    return 'text-green-500';
  };
  return (
    <div
      onClick={handleCardClick}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group border border-gray-700 cursor-pointer"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.images[0]?.url || 'https://via.placeholder.com/150'}
          alt={product.name}
          className="w-full h-56 object-cover transform group-hover:scale-110 transition-transform duration-300"
        />
        {discount && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-medium">
            -{discount}%
          </div>
        )}
        {/* Action Buttons */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {/* Wishlist Button */}
          <button
            onClick={handleWishlistClick}
            disabled={loadingWishlist}
            className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors duration-300"
            aria-label={wishlistItems.includes(product._id) ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {loadingWishlist ? (
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
            ) : wishlistItems.includes(product._id) ? (
              <FaHeart className="w-4 h-4 text-red-500" />
            ) : (
              <FaRegHeart className="w-4 h-4 text-gray-800" />
            )}
          </button>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={loadingCart || product.stock <= 0}
            className={`p-2 rounded-full transition-colors duration-300 ${product.stock <= 0
              ? 'bg-gray-400/90 cursor-not-allowed'
              : 'bg-blue-600/90 hover:bg-blue-600'
              }`}
            aria-label="Add to cart"
          >
            {loadingCart ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FaShoppingCart className={`w-4 h-4 ${product.stock <= 0 ? 'text-gray-600' : 'text-white'}`} />
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-white line-clamp-2 min-h-[56px] mb-1">
            {product.name}
          </h2>
          <div className="flex items-center gap-1 mb-2">
            {renderStars(product.averageRating || 0)}
            <span className="text-sm text-gray-400 ml-1">
              ({product.numReviews || 0})
            </span>
          </div>

          <div className="flex items-center gap-1 mb-2">
            <FaBoxOpen className={getStockStatusClass(product.stock)} />
            <span className={`text-sm ${getStockStatusClass(product.stock)}`}>
              {product.stock <= 0
                ? 'Hết hàng'
                : product.stock <= 5
                  ? `Còn ${product.stock} sản phẩm`
                  : 'Còn hàng'}
            </span>
          </div>
        </div>        <div className="flex justify-between items-end">
          <div className="flex-1">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-blue-500">
                {formatPrice(product.discountPrice || product.price)}
              </span>
              {product.discountPrice && (
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
