import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  wishlistItems: [],
  loading: false,
  error: null,
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    setWishlist: (state, action) => {
      state.wishlistItems = action.payload;
      state.loading = false;
      state.error = null;
    },
    addWishlistItem: (state, action) => {
      state.wishlistItems.push(action.payload);
    },
    removeWishlistItem: (state, action) => {
      state.wishlistItems = state.wishlistItems.filter(
        (item) => item !== action.payload
      );
    },
    setWishlistLoading: (state, action) => {
      state.loading = action.payload;
    },
    setWishlistError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setWishlist,
  addWishlistItem,
  removeWishlistItem,
  setWishlistLoading,
  setWishlistError,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
