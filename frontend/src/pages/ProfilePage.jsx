import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfile, updateProfile, addToWishlist, removeFromWishlist, getMyReviews, updateReview, deleteReview, getWishlist } from '../services/api';
import { setCredentials, updateWishlist } from '../redux/slices/userSlice';
import { setWishlist } from '../redux/slices/wishlistSlice';
import useWishlist from '../hooks/useWishlist';
import { FaStar, FaRegStar, FaEdit, FaTrash, FaHeart, FaShoppingCart } from 'react-icons/fa';

function ProfilePage() {
  const { userInfo } = useSelector((state) => state.user);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [myReviews, setMyReviews] = useState([]);
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Ref to track data loading
  const dataLoadedRef = useRef({
    profile: false,
    reviews: false,
    wishlist: false
  });

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    // Load profile data only if not loaded already
    const fetchProfile = async () => {
      if (dataLoadedRef.current.profile) return;

      try {
        const { data } = await getProfile();
        setName(data.user.name);
        setEmail(data.user.email);
        dataLoadedRef.current.profile = true;
      } catch (error) {
        toast.error('Error fetching profile');
      }
    };

    // Load reviews only if not loaded already
    const fetchMyReviews = async () => {
      if (dataLoadedRef.current.reviews) return;

      try {
        const { data } = await getMyReviews();
        setMyReviews(data.reviews);
        dataLoadedRef.current.reviews = true;
      } catch (error) {
        toast.error('Error fetching reviews');
      }
    };
    // Use wishlist data from Redux store instead of making a separate API call
    const fetchWishlistData = async () => {
      if (dataLoadedRef.current.wishlist || !userInfo.token) return;

      try {
        setLoadingWishlist(true);

        // Check if wishlist data is already in Redux store
        if (wishlistItems.length > 0) {
          // If we have wishlist IDs in Redux, only fetch product details if needed
          const { data } = await getWishlist();
          if (data.success && data.wishlist) {
            setWishlistProducts(data.wishlist);
          }
        } else {
          // If we don't have anything in Redux, do a full fetch but only once
          const { data } = await getWishlist();
          if (data.success && data.wishlist) {
            setWishlistProducts(data.wishlist);

            // Update Redux state only if needed
            const wishlistIds = data.wishlist.map(item => item._id);
            dispatch(updateWishlist(wishlistIds));
            dispatch(setWishlist(wishlistIds));
          }
        }

        // Mark as loaded to prevent future API calls
        dataLoadedRef.current.wishlist = true;
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        toast.error('Error loading wishlist');
      } finally {
        setLoadingWishlist(false);
      }
    };

    fetchProfile();
    fetchMyReviews();
    fetchWishlistData();
  }, [userInfo]); // Remove dispatch from dependencies

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await updateProfile({ name, email });
      dispatch(setCredentials({ ...data.user, token: userInfo.token }));
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Error updating profile');
    }
  };  // Import the useWishlist hook outside, with the other hooks
  const { refreshWishlist } = useWishlist();

  const handleWishlistAction = async (productId, action) => {
    try {
      if (action === 'add') {
        await addToWishlist(productId);
        toast.success('Added to wishlist');
        // Refresh wishlist data to get latest changes but use forceRefresh=false
        // to honor the caching mechanism
        refreshWishlist(false);
      } else {
        await removeFromWishlist(productId);
        toast.success('Removed from wishlist');

        // Remove product from local state immediately for UI responsiveness
        setWishlistProducts(prev => prev.filter(item => item._id !== productId));

        // Update Redux state directly without an additional API call
        const updatedWishlistIds = wishlistItems.filter(id => id !== productId);
        dispatch(updateWishlist(updatedWishlistIds));
        dispatch(setWishlist(updatedWishlistIds));
      }
    } catch (error) {
      toast.error(`Error ${action === 'add' ? 'adding to' : 'removing from'} wishlist`);
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review._id);
    setEditRating(review.rating);
    setEditTitle(review.title);
    setEditComment(review.comment);
  };

  const handleUpdateReview = async (e, reviewId) => {
    e.preventDefault();
    if (editRating < 1 || editRating > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }
    if (!editTitle.trim()) {
      toast.error('Please provide a review title');
      return;
    }
    if (!editComment.trim()) {
      toast.error('Please provide a review comment');
      return;
    }
    try {
      const { data } = await updateReview(reviewId, { rating: editRating, title: editTitle, comment: editComment });
      setMyReviews(myReviews.map((review) => (review._id === reviewId ? data.review : review)));
      setEditingReview(null);
      toast.success('Review updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteReview(reviewId);
      setMyReviews(myReviews.filter((review) => review._id !== reviewId));
      toast.success('Review deleted');
    } catch (error) {
      toast.error('Error deleting review');
    }
  };

  // Format price with VND currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (!userInfo) return null;

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 md:px-0">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-100 border-b border-gray-700 pb-4">My Profile</h1>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="shadow appearance-none border border-gray-700 rounded w-full py-3 px-4 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="shadow appearance-none border border-gray-700 rounded w-full py-3 px-4 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                Update Profile
              </button>
            </div>
          </form>
        </div>

        <div className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4 flex items-center">
            <FaHeart className="text-red-500 mr-2" /> My Wishlist
          </h2>
          {loadingWishlist ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (!wishlistProducts || wishlistProducts.length === 0) ? (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-4">Your wishlist is empty.</p>
              <Link to="/products" className="text-blue-400 hover:text-blue-300 underline">
                Browse products
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {wishlistProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex flex-col bg-gray-700 border border-gray-600 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-40 overflow-hidden">
                    <Link to={`/product/${product._id}`}>
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-600 text-gray-400">
                          No image
                        </div>
                      )}
                      {product.discountPrice && product.discountPrice < product.price && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                        </div>
                      )}
                    </Link>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <Link to={`/product/${product._id}`} className="text-lg font-semibold text-gray-100 hover:text-blue-400 mb-1">
                      {product.name}
                    </Link>

                    <div className="flex items-center mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>
                            {i < (product.averageRating || 0) ? <FaStar /> : <FaRegStar />}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-400 ml-2">
                        ({product.numReviews || 0} reviews)
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        {product.discountPrice ? (
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-blue-400">
                              {formatPrice(product.discountPrice)}
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-blue-400">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleWishlistAction(product._id, 'remove')}
                          className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-600 transition-colors"
                        >
                          <FaTrash />
                        </button>

                        <Link
                          to={`/product/${product._id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                        >
                          <FaShoppingCart />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 shadow-lg rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4">My Reviews</h2>
          {myReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-4">You haven't written any reviews yet.</p>
              <Link to="/products" className="text-blue-400 hover:text-blue-300 underline">
                Browse products to review
              </Link>
            </div>
          ) : (
            <ul className="grid gap-6">
              {myReviews.map((review) => (
                <li key={review._id} className="border border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow bg-gray-700">
                  {editingReview === review._id ? (
                    <form onSubmit={(e) => handleUpdateReview(e, review._id)} className="space-y-4">
                      <div>
                        <label className="block text-gray-200 text-sm font-bold mb-2">Rating</label>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setEditRating(r)}
                              className="text-xl focus:outline-none"
                            >
                              {r <= editRating ? (
                                <FaStar className="text-yellow-400" />
                              ) : (
                                <FaRegStar className="text-gray-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-200 text-sm font-bold mb-2">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                          placeholder="Review title"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-200 text-sm font-bold mb-2">Comment</label>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                          rows="4"
                          placeholder="Write your review here"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setEditingReview(null)}
                          className="bg-gray-600 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={`/product/${review.product._id}`} className="font-semibold text-lg text-blue-400 hover:text-blue-300">
                            {review.product.name}
                          </Link>
                          <div className="flex items-center space-x-1 my-2">
                            {[...Array(5)].map((_, index) => (
                              <FaStar
                                key={index}
                                className={index < review.rating ? 'text-yellow-400' : 'text-gray-500'}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditReview(review)}
                            className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-600 transition-colors"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review._id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-600 transition-colors"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-medium text-lg my-2 text-gray-200">{review.title}</h3>
                      <p className="text-gray-400 mt-2">{review.comment}</p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
