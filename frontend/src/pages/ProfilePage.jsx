// ProfilePage.jsx - Main profile page using component-based architecture
import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfile, getMyReviews, getWishlist, removeFromWishlist } from '../services/api';
import { updateWishlist, setCredentials } from '../redux/slices/userSlice';
import { setWishlist } from '../redux/slices/wishlistSlice';
import useWishlist from '../hooks/useWishlist';
import { ProfileForm, WishlistSection, CouponSection, ReviewsSection } from '../components/Profile';
import AddressManagement from '../components/Profile/AddressManagement';

function ProfilePage() {
  const { userInfo } = useSelector((state) => state.user);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  const [myReviews, setMyReviews] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { refreshWishlist } = useWishlist();
  
  // Ref to track data loading to prevent duplicate API calls
  const dataLoadedRef = useRef({
    profile: false,
    reviews: false,
    wishlist: false
  });

  // Load all necessary data on component mount
  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    const fetchProfileData = async () => {
      if (dataLoadedRef.current.profile) return;

      try {
        const { data } = await getProfile();
        setProfileData({
          name: data.user.name,
          email: data.user.email
        });
        dataLoadedRef.current.profile = true;
      } catch (error) {
        toast.error('Lỗi khi lấy thông tin hồ sơ');
        console.error('Profile fetch error:', error);
      }
    };

    const fetchReviewsData = async () => {
      if (dataLoadedRef.current.reviews) return;

      try {
        const { data } = await getMyReviews();
        setMyReviews(data.reviews);
        dataLoadedRef.current.reviews = true;
      } catch (error) {
        toast.error('Lỗi khi lấy đánh giá');
        console.error('Reviews fetch error:', error);
      }
    };

    const fetchWishlistData = async () => {
      if (dataLoadedRef.current.wishlist || !userInfo.token) return;

      try {
        setLoadingWishlist(true);

        // Check if wishlist data is already in Redux store
        if (wishlistItems.length > 0) {
          // If we have wishlist IDs in Redux, fetch product details
          const { data } = await getWishlist();
          if (data.success && data.wishlist) {
            setWishlistProducts(data.wishlist);
          }
        } else {
          // If we don't have anything in Redux, do a full fetch
          const { data } = await getWishlist();
          if (data.success && data.wishlist) {
            setWishlistProducts(data.wishlist);

            // Update Redux state
            const wishlistIds = data.wishlist.map(item => item._id);
            dispatch(updateWishlist(wishlistIds));
            dispatch(setWishlist(wishlistIds));
          }
        }

        dataLoadedRef.current.wishlist = true;
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        toast.error('Lỗi khi tải danh sách yêu thích');
      } finally {
        setLoadingWishlist(false);
      }
    };

    // Load all data
    fetchProfileData();
    fetchReviewsData();
    fetchWishlistData();
  }, [userInfo, dispatch, navigate, wishlistItems]);

  // Handle wishlist removal
  const handleRemoveFromWishlist = async (productId) => {
    try {
      await removeFromWishlist(productId);
      toast.success('Đã xóa khỏi danh sách yêu thích');

      // Remove product from local state immediately for UI responsiveness
      setWishlistProducts(prev => prev.filter(item => item._id !== productId));

      // Update Redux state directly
      const updatedWishlistIds = wishlistItems.filter(id => id !== productId);
      dispatch(updateWishlist(updatedWishlistIds));
      dispatch(setWishlist(updatedWishlistIds));
    } catch (error) {
      toast.error('Lỗi khi xóa khỏi danh sách yêu thích');
      console.error('Wishlist removal error:', error);
    }
  };

  // Handle review updates (either update or delete)
  const handleReviewsUpdate = (updatedReview, deletedReviewId) => {
    if (deletedReviewId) {
      // Handle deletion
      setMyReviews(prev => prev.filter(review => review._id !== deletedReviewId));
    } else if (updatedReview) {
      // Handle update
      setMyReviews(prev => 
        prev.map(review => 
          review._id === updatedReview._id ? updatedReview : review
        )
      );
    }
  };

  // Show loading or redirect if no user
  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4 md:px-0">
      <div className="container mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-100 mb-2">
            Chào mừng bạn trở lại, {profileData.name || userInfo.name || 'User'}!
          </h1>
          <p className="text-gray-400 text-lg">
            Quản lý hồ sơ, địa chỉ và sở thích của bạn
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 rounded-lg p-1 backdrop-blur-sm border border-gray-700">
            <div className="flex space-x-1">
              <button className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/20 rounded-md cursor-default">
                Thông tin hồ sơ
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <ProfileForm 
            userInfo={userInfo}
            initialName={profileData.name}
            initialEmail={profileData.email}
          />

          <AddressManagement userInfo={userInfo} />

          <WishlistSection
            wishlistProducts={wishlistProducts}
            loading={loadingWishlist}
            onRemoveFromWishlist={handleRemoveFromWishlist}
          />

          <CouponSection userInfo={userInfo} />

          <ReviewsSection
            reviews={myReviews}
            onReviewsUpdate={handleReviewsUpdate}
          />
        </div>

        {/* Footer Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-blue-400">{wishlistProducts.length}</div>
            <div className="text-gray-400 text-sm">Sản phẩm trong danh sách yêu thích</div>
          </div>
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-green-400">{myReviews.length}</div>
            <div className="text-gray-400 text-sm">Đánh giá đã viết</div>
          </div>
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {profileData.name && profileData.email ? '100%' : '50%'}
            </div>
            <div className="text-gray-400 text-sm">Hoàn thành hồ sơ</div>
          </div>
        </div>
      </div>
    </div>
  );

}

export default ProfilePage;
