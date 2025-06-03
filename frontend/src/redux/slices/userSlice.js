import { createSlice } from "@reduxjs/toolkit";
import { clearPersistedChatbotState } from "../middleware/persistenceMiddleware";

const initialState = {
  userInfo: localStorage.getItem("userInfo")
    ? JSON.parse(localStorage.getItem("userInfo"))
    : null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem("userInfo");
      // Clear chatbot state when user logs out
      clearPersistedChatbotState();
    },
    updateWishlist: (state, action) => {
      if (state.userInfo) {
        state.userInfo = {
          ...state.userInfo,
          wishlist: action.payload,
        };
        localStorage.setItem("userInfo", JSON.stringify(state.userInfo));
      }
    },
  },
});

export const { setCredentials, logout, updateWishlist } = userSlice.actions;
export default userSlice.reducer;
