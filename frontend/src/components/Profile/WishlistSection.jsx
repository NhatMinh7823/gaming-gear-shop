// WishlistSection.jsx - User wishlist management component
import { Link } from 'react-router-dom';
import { FaHeart, FaStar, FaRegStar, FaTrash, FaShoppingCart } from 'react-icons/fa';
import { formatPrice, formatDiscountPercentage } from '../../utils';

function WishlistSection({ 
  wishlistProducts, 
  loading, 
  onRemoveFromWishlist 
}) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-xl p-8 mb-8 border border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
            <FaHeart className="text-white text-xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-100">My Wishlist</h2>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-xl p-8 mb-8 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
            <FaHeart className="text-white text-xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-100">My Wishlist</h2>
        </div>
        {wishlistProducts && wishlistProducts.length > 0 && (
          <div className="bg-gray-700/50 px-3 py-1 rounded-full text-sm text-gray-300">
            {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>
      
      {(!wishlistProducts || wishlistProducts.length === 0) ? (
        <EmptyWishlist />
      ) : (
        <WishlistGrid 
          products={wishlistProducts} 
          onRemoveFromWishlist={onRemoveFromWishlist}
        />
      )}
    </div>
  );
}

function EmptyWishlist() {
  return (
    <div className="text-center py-12">
      <div className="mb-6">
        <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaHeart className="h-10 w-10 text-gray-500" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-gray-200 mb-2">Your wishlist is empty</h3>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">
        Discover amazing products and add them to your wishlist to keep track of your favorites
      </p>
      <Link 
        to="/products" 
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        <FaShoppingCart className="mr-2" />
        Browse Products
      </Link>
    </div>
  );
}

function WishlistGrid({ products, onRemoveFromWishlist }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {products.map((product) => (
        <WishlistItem
          key={product._id}
          product={product}
          onRemoveFromWishlist={onRemoveFromWishlist}
        />
      ))}
    </div>
  );
}

function WishlistItem({ product, onRemoveFromWishlist }) {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  return (
    <div className="flex flex-col bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 rounded-xl overflow-hidden hover:shadow-2xl hover:border-gray-500 transition-all duration-300 group transform hover:scale-[1.02]">
      <ProductImage product={product} hasDiscount={hasDiscount} />
      <ProductDetails product={product} onRemoveFromWishlist={onRemoveFromWishlist} />
    </div>
  );
}

function ProductImage({ product, hasDiscount }) {
  return (
    <div className="relative h-48 overflow-hidden">
      <Link to={`/product/${product._id}`}>
        <img
          src={product.images[0]?.url || 'https://via.placeholder.com/150'}
          alt={product.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            -{formatDiscountPercentage(product.price, product.discountPrice)}
          </div>
        )}
      </Link>
    </div>
  );
}

function ProductDetails({ product, onRemoveFromWishlist }) {
  return (
    <div className="p-4 flex-1 flex flex-col">
      <Link 
        to={`/product/${product._id}`} 
        className="text-lg font-semibold text-gray-100 hover:text-blue-400 mb-1 line-clamp-2"
      >
        {product.name}
      </Link>

      <ProductRating 
        rating={product.averageRating} 
        numReviews={product.numReviews} 
      />

      <div className="flex items-center justify-between mt-auto">
        <ProductPrice product={product} />
        <ProductActions 
          productId={product._id} 
          onRemoveFromWishlist={onRemoveFromWishlist}
        />
      </div>
    </div>
  );
}

function ProductRating({ rating = 0, numReviews = 0 }) {
  return (
    <div className="flex items-center mb-2">
      <div className="flex text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <span key={i}>
            {i < rating ? <FaStar /> : <FaRegStar />}
          </span>
        ))}
      </div>
      <span className="text-sm text-gray-400 ml-2">
        ({numReviews} reviews)
      </span>
    </div>
  );
}

function ProductPrice({ product }) {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  if (hasDiscount) {
    return (
      <div className="flex flex-col">
        <span className="text-lg font-bold text-blue-400">
          {formatPrice(product.discountPrice)}
        </span>
        <span className="text-sm text-gray-400 line-through">
          {formatPrice(product.price)}
        </span>
      </div>
    );
  }

  return (
    <span className="text-lg font-bold text-blue-400">
      {formatPrice(product.price)}
    </span>
  );
}

function ProductActions({ productId, onRemoveFromWishlist }) {
  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove this item from your wishlist?')) {
      onRemoveFromWishlist(productId);
    }
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleRemove}
        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-all duration-200 transform hover:scale-110"
        title="Remove from wishlist"
      >
        <FaTrash className="text-sm" />
      </button>

      <Link
        to={`/product/${productId}`}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-2 rounded-lg transition-all duration-200 flex items-center justify-center transform hover:scale-110"
        title="View product"
      >
        <FaShoppingCart className="text-sm" />
      </Link>
    </div>
  );
}

export default WishlistSection;
