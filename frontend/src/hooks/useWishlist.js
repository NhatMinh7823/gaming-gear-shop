import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateWishlist } from "../redux/slices/userSlice";
import { setWishlist } from "../redux/slices/wishlistSlice";
import { getWishlist } from "../services/api";

// Keep a shared variable outside the hook to track wishlist loading across all components
let isWishlistLoading = false;
let lastGlobalFetchTime = 0;

// Function to clear the wishlist cache - can be called from outside the hook
export const clearWishlistCache = () => {
  console.log("🧹 Clearing wishlist cache - next fetch will be fresh");
  lastGlobalFetchTime = 0;
};

export const useWishlist = () => {
  const { userInfo } = useSelector((state) => state.user);
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const dispatch = useDispatch(); // Use refs to track if the wishlist has already been loaded and last fetch time
  const wishlistLoadedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  // Function to manually refresh wishlist data with debouncing/caching
  const refreshWishlist = async (forceRefresh = false) => {
    if (!userInfo || !userInfo.token) return false;

    // Implement a simple cache system - don't fetch more often than once per minute
    // unless forceRefresh is true
    const now = Date.now();
    if (
      !forceRefresh &&
      lastGlobalFetchTime > 0 &&
      now - lastGlobalFetchTime < 60000
    ) {
      console.log("Skipping wishlist refresh - data was fetched recently");
      return true; // Return success but don't actually fetch
    }

    // Prevent multiple simultaneous calls
    if (isWishlistLoading) {
      console.log("Wishlist is already being fetched by another component");
      return true; // Another component is handling this
    }

    try {
      isWishlistLoading = true;
      lastFetchTimeRef.current = now; // Update local ref
      lastGlobalFetchTime = now; // Update global variable

      const { data } = await getWishlist();
      if (data.success && data.wishlist) {
        // Extract product IDs from wishlist data
        const wishlistIds = data.wishlist.map((item) => item._id || item);

        // Update both Redux states for consistency
        dispatch(updateWishlist(wishlistIds));
        dispatch(setWishlist(wishlistIds));
        wishlistLoadedRef.current = true; // Mark as loaded
        return true;
      }
    } catch (error) {
      console.error("Failed to refresh wishlist:", error);
      return false;
    } finally {
      isWishlistLoading = false;
    }
  };

  // Reset wishlist tracking when user logs out
  useEffect(() => {
    if (!userInfo) {
      wishlistLoadedRef.current = false;
      // Clear wishlist items in global state when user logs out
      if (wishlistItems.length > 0) {
        dispatch(setWishlist([]));
      }
    }
  }, [userInfo, dispatch, wishlistItems.length]); // Load wishlist when user logs in - only once
  useEffect(() => {
    // Only proceed if we have a user and haven't loaded the wishlist yet
    const loadWishlist = async () => {
      // Check if we have a user with a valid token
      if (userInfo && userInfo.token) {
        // Check if we've loaded the wishlist recently
        const now = Date.now();
        if (lastGlobalFetchTime > 0 && now - lastGlobalFetchTime < 60000) {
          console.log("Initial load skipped - wishlist was fetched recently");
          return;
        }

        // Prevent multiple simultaneous calls
        if (isWishlistLoading) {
          console.log("Wishlist is already being fetched by another component");
          return; // Another component is handling this
        }

        // Only fetch if we haven't loaded the wishlist yet
        if (!wishlistLoadedRef.current) {
          try {
            isWishlistLoading = true;
            lastFetchTimeRef.current = now; // Update fetch timestamp
            lastGlobalFetchTime = now; // Update global variable
            wishlistLoadedRef.current = true; // Mark as loaded before API call

            const { data } = await getWishlist();
            if (data.success && data.wishlist) {
              // Extract product IDs from wishlist data
              const wishlistIds = data.wishlist.map((item) => item._id || item);

              // Update both Redux states for consistency
              dispatch(updateWishlist(wishlistIds));
              dispatch(setWishlist(wishlistIds));
              console.log(
                "Wishlist loaded successfully:",
                wishlistIds.length,
                "items"
              );
            } else {
              // Handle empty or invalid response
              console.warn("Received invalid wishlist data from API:", data);
              dispatch(updateWishlist([]));
              dispatch(setWishlist([]));
            }
          } catch (error) {
            wishlistLoadedRef.current = false; // Reset on error to allow retry
            console.error(
              "Failed to load wishlist:",
              error.response?.data?.message || error.message
            );
            // Don't clear wishlist on error - might be a temporary network issue
          } finally {
            isWishlistLoading = false;
          }
        }
      }
    };

    loadWishlist();
    // Only depend on userInfo.token, not the entire userInfo object
    // This prevents unnecessary re-renders
  }, [userInfo?.token, dispatch]);
  // Ensure wishlist state consistency between userInfo.wishlist and wishlistItems
  useEffect(() => {
    // Skip this sync if we're still loading the wishlist
    if (!wishlistLoadedRef.current) return;

    if (userInfo && userInfo.wishlist && wishlistItems.length === 0) {
      // If userInfo has wishlist but wishlistItems is empty, sync them
      dispatch(setWishlist(userInfo.wishlist));
    } else if (
      userInfo &&
      (!userInfo.wishlist || userInfo.wishlist.length === 0) &&
      wishlistItems.length > 0
    ) {
      // If wishlistItems has items but userInfo.wishlist is empty, sync them
      dispatch(updateWishlist(wishlistItems));
    }
  }, [
    userInfo?.wishlist?.length,
    wishlistItems.length,
    userInfo,
    wishlistItems,
    dispatch,
  ]);
  // Return the refreshWishlist function so components can trigger manual refresh
  return { refreshWishlist, clearCache: clearWishlistCache };
};

export default useWishlist;
