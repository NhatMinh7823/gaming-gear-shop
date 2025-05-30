import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfile, updateProfile, addToWishlist, removeFromWishlist, getMyReviews, updateReview, deleteReview, getWishlist, generateCoupon } from '../services/api';
import { setCredentials, updateWishlist } from '../redux/slices/userSlice';
import { setWishlist } from '../redux/slices/wishlistSlice';
import useWishlist from '../hooks/useWishlist';
import { FaStar, FaRegStar, FaEdit, FaTrash, FaHeart, FaShoppingCart, FaTicketAlt } from 'react-icons/fa';

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
  // Coupon Section Component
  const CouponSection = () => {
    const [generating, setGenerating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleGenerateCoupon = async () => {
      if (generating) return;

      setGenerating(true);
      try {
        const { data } = await generateCoupon();
        if (data.success) {
          // Cập nhật user info với coupon mới
          dispatch(setCredentials({
            ...userInfo,
            coupon: data.coupon
          }));
          toast.success('Đã tạo mã giảm giá 30% thành công!');
        }
      } catch (error) {
        toast.error('Không thể tạo mã giảm giá. Vui lòng thử lại sau!');
      } finally {
        setGenerating(false);
      }
    };
    // Refresh coupon status from server to show current usage state
    // This is helpful when users have applied the coupon in another tab or session
    const refreshCouponStatus = async () => {
      if (refreshing) return;

      setRefreshing(true);
      try {
        const { data } = await getProfile();
        if (data.user.coupon) {
          // Update coupon status in Redux
          dispatch(setCredentials({
            ...userInfo,
            coupon: data.user.coupon
          }));

          if (data.user.coupon.used) {
            toast.info('Mã giảm giá của bạn đã được sử dụng.');
          } else {
            toast.success('Mã giảm giá của bạn vẫn có thể sử dụng!');
          }
        }
      } catch (error) {
        toast.error('Không thể cập nhật trạng thái mã giảm giá.');
      } finally {
        setRefreshing(false);
      }
    };

    return (
      <div className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-4 flex items-center">
          <FaTicketAlt className="text-purple-500 mr-2" /> Mã giảm giá của tôi
        </h2>

        {userInfo?.coupon?.code ? (
          <div className="bg-gray-700 rounded-lg p-6 mb-4 border border-purple-500 relative">
            {/* Refresh button */}
            <button
              onClick={refreshCouponStatus}
              disabled={refreshing}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-600 transition-colors text-sm"
              title="Làm mới trạng thái"
            >
              {refreshing ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 pt-2">
              <div>
                <h3 className="text-xl font-bold text-gray-100">Giảm {userInfo.coupon.discountPercent}% cho đơn hàng đầu tiên</h3>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${userInfo.coupon.used
                      ? 'bg-red-900 text-red-300'
                      : 'bg-green-900 text-green-300'
                    }`}>
                    <span className={`w-2 h-2 rounded-full mr-1 ${userInfo.coupon.used ? 'bg-red-400' : 'bg-green-400'
                      }`}></span>
                    {userInfo.coupon.used ? 'Đã sử dụng' : 'Có thể sử dụng'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end mt-2 md:mt-0">
                <div className="text-3xl font-bold text-purple-400">{userInfo.coupon.code}</div>
                {!userInfo.coupon.used && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userInfo.coupon.code);
                      toast.success('Mã giảm giá đã được sao chép!');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 mt-1 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Nhấn để sao chép
                  </button>
                )}
              </div>
            </div>
            <div className="border-t border-gray-600 pt-4 mt-2">
              {userInfo.coupon.used ? (
                <div className="text-gray-300 text-sm">
                  <p>Mã giảm giá này đã được sử dụng và không thể dùng lại.</p>
                  <p className="mt-1 text-gray-400">Mã giảm giá chỉ có thể sử dụng một lần cho đơn hàng đầu tiên.</p>
                </div>
              ) : (
                <div className="text-gray-300 text-sm">
                  <p>Sao chép mã này và nhập vào ô mã giảm giá khi thanh toán để được giảm <span className="font-semibold text-purple-400">{userInfo.coupon.discountPercent}%</span> tổng giá trị đơn hàng.</p>
                  <p className="mt-1 text-gray-400">Mã giảm giá này chỉ có thể sử dụng một lần cho đơn hàng đầu tiên của bạn.</p>
                </div>
              )}
              {userInfo.coupon.createdAt && (
                <p className="text-gray-400 text-xs mt-2">
                  Ngày tạo: {new Date(userInfo.coupon.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-700 rounded-lg">
            <svg className="mx-auto h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-200 mb-2">Bạn chưa có mã giảm giá</h3>
            <p className="text-gray-400 mb-6 px-6">Tạo mã giảm giá 30% cho đơn hàng đầu tiên của bạn</p>
            <button
              onClick={handleGenerateCoupon}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition duration-300 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo...
                </>
              ) : (
                <>
                  <FaTicketAlt className="mr-2" /> Tạo mã giảm giá
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
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
                  className="flex flex-col bg-gray-700 border border-gray-600 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  <div className="relative h-40 overflow-hidden">
                    <Link to={`/product/${product._id}`}>                      <img
                      src={product.images[0]?.url || 'https://via.placeholder.com/150'}
                      alt={product.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                    />
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
        </div>        {/* Mã giảm giá section */}
        <CouponSection />

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
          )}        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
