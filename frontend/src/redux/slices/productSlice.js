import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  products: [],
  totalPages: 0,
  currentPage: 1,
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    setProducts: (state, action) => {
      state.products = action.payload.products;
      state.totalPages = action.payload.totalPages;
      state.currentPage = action.payload.currentPage;
    },
  },
});

export const { setProducts } = productSlice.actions;
export default productSlice.reducer;
