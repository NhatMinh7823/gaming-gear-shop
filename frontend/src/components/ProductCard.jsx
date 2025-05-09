import { Link } from 'react-router-dom';

function ProductCard({ product }) {
  return (
    <div className="border rounded-lg p-4 shadow-md hover:shadow-lg transition">
      <img
        src={product.images[0]?.url || 'https://via.placeholder.com/150'}
        alt={product.name}
        className="w-full h-48 object-cover rounded"
      />
      <h2 className="text-lg font-semibold mt-2">{product.name}</h2>
      <p className="text-gray-600">${product.discountPrice || product.price}</p>
      <p className="text-yellow-500">Rating: {product.averageRating} ({product.numReviews} reviews)</p>
      <Link
        to={`/product/${product._id}`}
        className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        View Details
      </Link>
    </div>
  );
}

export default ProductCard;