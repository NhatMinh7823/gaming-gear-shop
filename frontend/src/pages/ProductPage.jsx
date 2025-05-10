import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { getProductById, createReview, addCartItem } from '../services/api';
import { setCart } from '../redux/slices/cartSlice';

function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  if (loading) return <div className="container mx-auto py-8 text-center">Loading...</div>;
  if (error) return <div className="container mx-auto py-8 text-center text-red-500">Error: {error}</div>;
  if (!product) return <div className="container mx-auto py-8 text-center">Product not found.</div>;

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <img
          src={product.images[0]?.url || 'https://via.placeholder.com/300'}
          alt={product.name}
          className="w-full h-96 object-cover rounded"
        />
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-gray-600 mt-2">${product.discountPrice || product.price}</p>
          <p className="text-yellow-500">Rating: {product.averageRating} ({product.numReviews} reviews)</p>
          <p className="mt-4">{product.description}</p>
          <div className="mt-4">
            <label className="mr-2">Quantity:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="border p-2 w-16"
            />
          </div>
          <button
            onClick={handleAddToCart}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Add to Cart
          </button>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Reviews</h2>
        {product.reviews && product.reviews.length > 0 ? (
          product.reviews.map((review) => (
            <div key={review._id} className="border-t py-4">
              <div className="flex justify-between">
                <p className="font-semibold">{review.user?.name}</p>
                {review.isVerifiedPurchase && (
                  <span className="text-green-600 text-sm">Verified Purchase</span>
                )}
              </div>
              <p className="text-yellow-500">Rating: {review.rating}</p>
              <p className="font-medium">{review.title}</p>
              <p>{review.comment}</p>
            </div>
          ))
        ) : (
          <p>No reviews yet.</p>
        )}
        {userInfo && (
          <form onSubmit={handleReviewSubmit} className="mt-4">
            <h3 className="text-lg font-semibold">Write a Review</h3>
            <div className="mt-2">
              <label>Rating:</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="border p-2 ml-2"
              >
                <option value="0">Select...</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="mt-2">
              <label>Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border p-2 w-full"
                placeholder="Review title"
              />
            </div>
            <div className="mt-2">
              <label>Comment:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border p-2 w-full"
                rows="4"
                placeholder="Write your review here"
              />
            </div>
            <button
              type="submit"
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Submit Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProductPage;
