import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfile, updateProfile, addToWishlist, removeFromWishlist, getMyReviews, updateReview, deleteReview } from '../services/api';
import { setCredentials } from '../redux/slices/userSlice';
import { FaStar, FaRegStar, FaEdit, FaTrash, FaHeart } from 'react-icons/fa';

function ProfilePage() {
  const { userInfo } = useSelector((state) => state.user);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [myReviews, setMyReviews] = useState([]);
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
    const fetchProfile = async () => {
      try {
        const { data } = await getProfile();
        setName(data.user.name);
        setEmail(data.user.email);
      } catch (error) {
        toast.error('Error fetching profile');
      }
    };
    const fetchMyReviews = async () => {
      try {
        const { data } = await getMyReviews();
        setMyReviews(data.reviews);
      } catch (error) {
        toast.error('Error fetching reviews');
      }
    };
    fetchProfile();
    fetchMyReviews();
  }, [userInfo, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await updateProfile({ name, email });
      dispatch(setCredentials({ ...data.user, token: userInfo.token }));
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Error updating profile');
    }
  };

  const handleWishlistAction = async (productId, action) => {
    try {
      if (action === 'add') {
        await addToWishlist(productId);
        toast.success('Added to wishlist');
      } else {
        await removeFromWishlist(productId);
        toast.success('Removed from wishlist');
      }
      const { data } = await getProfile();
      dispatch(setCredentials({ ...data.user, token: userInfo.token }));
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

  if (!userInfo) return null;

  return (
    <div className="container mx-auto py-12 px-4 md:px-0 max-w-4xl">
      <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">My Profile</h1>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 transition-colors"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 transition-colors"
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
      <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4 flex items-center">
          <FaHeart className="text-red-500 mr-2" /> My Wishlist
        </h2>
        {(!userInfo.wishlist || userInfo.wishlist.length === 0) ? (
          <div className="text-center py-8 text-gray-600">
            <p className="mb-4">Your wishlist is empty.</p>
            <Link to="/products" className="text-blue-600 hover:text-blue-800 underline">
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4">
            {userInfo.wishlist.map((productId) => (
              <li key={productId} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                <Link to={`/product/${productId}`} className="text-gray-700 hover:text-blue-600">
                  {productId}
                </Link>
                <button
                  onClick={() => handleWishlistAction(productId, 'remove')}
                  className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                >
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">My Reviews</h2>
        {myReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="mb-4">You haven't written any reviews yet.</p>
            <Link to="/products" className="text-blue-600 hover:text-blue-800 underline">
              Browse products to review
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6">
            {myReviews.map((review) => (
              <li key={review._id} className="border p-6 rounded-lg hover:shadow-lg transition-shadow bg-gray-50">
                {editingReview === review._id ? (
                  <form onSubmit={(e) => handleUpdateReview(e, review._id)} className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Rating</label>
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
                      <label className="block text-gray-700 text-sm font-bold mb-2">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="Review title"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Comment</label>
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        rows="4"
                        placeholder="Write your review here"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditingReview(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
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
                        <Link to={`/product/${review.product._id}`} className="font-semibold text-lg text-blue-600 hover:text-blue-800">
                          {review.product.name}
                        </Link>
                        <div className="flex items-center space-x-1 my-2">
                          {[...Array(5)].map((_, index) => (
                            <FaStar
                              key={index}
                              className={index < review.rating ? 'text-yellow-400' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-medium text-lg my-2">{review.title}</h3>
                    <p className="text-gray-600 mt-2">{review.comment}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
