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
        toast.error('Error fetching profile');
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
        toast.error('Error fetching reviews');
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
        toast.error('Error loading wishlist');
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
      toast.success('Removed from wishlist');

      // Remove product from local state immediately for UI responsiveness
      setWishlistProducts(prev => prev.filter(item => item._id !== productId));

      // Update Redux state directly
      const updatedWishlistIds = wishlistItems.filter(id => id !== productId);
      dispatch(updateWishlist(updatedWishlistIds));
      dispatch(setWishlist(updatedWishlistIds));
    } catch (error) {
      toast.error('Error removing from wishlist');
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
    <div className="min-h-screen bg-gray-900 py-12 px-4 md:px-0">
      <div className="container mx-auto max-w-4xl">
        <ProfileForm 
          userInfo={userInfo}
          initialName={profileData.name}
          initialEmail={profileData.email}
        />

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
    </div>
  );
}

export default ProfilePage;
