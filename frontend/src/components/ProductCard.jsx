import { Link } from 'react-router-dom';
import { FaStar, FaRegStar, FaShoppingCart } from 'react-icons/fa';

function ProductCard({ product }) {
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
