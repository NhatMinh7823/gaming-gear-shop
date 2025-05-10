import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfile, updateProfile, addToWishlist, removeFromWishlist, getMyReviews, updateReview, deleteReview } from '../services/api';
import { setCredentials } from '../redux/slices/userSlice';

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
    <div className="container mx-auto py-8 max-w-lg">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Update Profile
        </button>
      </form>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Wishlist</h2>
        {(!userInfo.wishlist || userInfo.wishlist.length === 0) ? (
          <p>No items in wishlist.</p>
        ) : (
          <ul className="space-y-2">
            {userInfo.wishlist.map((productId) => (
              <li key={productId} className="flex justify-between">
                <span>Product ID: {productId}</span>
                <button
                  onClick={() => handleWishlistAction(productId, 'remove')}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">My Reviews</h2>
        {myReviews.length === 0 ? (
          <p>You have not reviewed any products yet.</p>
        ) : (
          <ul className="space-y-4">
            {myReviews.map((review) => (
              <li key={review._id} className="border p-4 rounded">
                {editingReview === review._id ? (
                  <form onSubmit={(e) => handleUpdateReview(e, review._id)} className="space-y-2">
                    <div>
                      <label>Rating:</label>
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                        className="border p-2 ml-2"
                      >
                        <option value="0">Select...</option>
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Title:</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="border p-2 w-full"
                        placeholder="Review title"
                      />
                    </div>
                    <div>
                      <label>Comment:</label>
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="border p-2 w-full"
                        rows="4"
                        placeholder="Write your review here"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingReview(null)}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <p className="font-semibold">{review.product.name}</p>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-yellow-500">Rating: {review.rating}</p>
                    <p className="font-medium">{review.title}</p>
                    <p>{review.comment}</p>
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