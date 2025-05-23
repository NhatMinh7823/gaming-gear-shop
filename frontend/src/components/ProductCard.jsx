import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaStar, FaRegStar, FaShoppingCart, FaBoxOpen, FaHeart, FaRegHeart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { addToWishlist, removeFromWishlist } from '../services/api';
import useWishlist from '../hooks/useWishlist';
import { useState } from 'react';

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const { refreshWishlist } = useWishlist();
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  const handleWishlistClick = async (e) => {
    e.preventDefault(); // Prevent navigating to product detail
    e.stopPropagation();

    if (!userInfo) {
      navigate('/login');
      return;
    }

    try {
      setLoadingWishlist(true);
      if (wishlistItems.includes(product._id)) {
        await removeFromWishlist(product._id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product._id);
        toast.success('Added to wishlist');
      }
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
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group border border-gray-700">
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
        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          disabled={loadingWishlist}
          className="absolute top-2 left-2 p-2 rounded-full bg-white/90 hover:bg-white transition-colors duration-300"
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
        </div>

        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-baseline gap-2">
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

          <Link
            to={`/product/${product._id}`}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg 
                     hover:bg-blue-700 transition-colors group-hover:shadow-md"
          >
            <FaShoppingCart className="text-sm" />
            <span>View</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
