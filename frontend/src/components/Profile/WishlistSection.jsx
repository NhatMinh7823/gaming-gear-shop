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
      <div className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4 flex items-center">
          <FaHeart className="text-red-500 mr-2" /> My Wishlist
        </h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4 flex items-center">
        <FaHeart className="text-red-500 mr-2" /> My Wishlist
      </h2>
      
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
    <div className="text-center py-8 text-gray-400">
      <div className="mb-4">
        <FaHeart className="mx-auto h-16 w-16 text-gray-600 mb-4" />
      </div>
      <p className="mb-4 text-lg">Your wishlist is empty.</p>
      <p className="text-sm text-gray-500 mb-4">
        Add products you love to keep track of them
      </p>
      <Link 
        to="/products" 
        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Browse products
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
    <div className="flex flex-col bg-gray-700 border border-gray-600 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group">
      <ProductImage product={product} hasDiscount={hasDiscount} />
      <ProductDetails product={product} onRemoveFromWishlist={onRemoveFromWishlist} />
    </div>
  );
}

function ProductImage({ product, hasDiscount }) {
  return (
    <div className="relative h-40 overflow-hidden">
      <Link to={`/product/${product._id}`}>
        <img
          src={product.images[0]?.url || 'https://via.placeholder.com/150'}
          alt={product.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
        />
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {formatDiscountPercentage(product.price, product.discountPrice)}
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
        className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-600 transition-colors"
        title="Remove from wishlist"
      >
        <FaTrash />
      </button>

      <Link
        to={`/product/${productId}`}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors flex items-center justify-center"
        title="View product"
      >
        <FaShoppingCart />
      </Link>
    </div>
  );
}

export default WishlistSection;
