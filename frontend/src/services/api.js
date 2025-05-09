
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  if (userInfo && userInfo.token) {
    config.headers.Authorization = `Bearer ${userInfo.token}`;
  }
  return config;
});

// User APIs
export const register = (data) => api.post("/users/register", data);
export const login = (data) => api.post("/users/login", data);
export const getProfile = () => api.get("/users/profile");
export const updateProfile = (data) => api.put("/users/profile", data);
export const addToWishlist = (productId) =>
  api.post("/users/wishlist", { productId });
export const removeFromWishlist = (productId) =>
  api.delete(`/users/wishlist/${productId}`);

// Product APIs
export const getProducts = (params) => api.get("/products", { params });
export const getProductById = (id) => api.get(`/products/${id}`);
export const searchProducts = (keyword) =>
  api.get(`/products/search?keyword=${keyword}`);
export const getFeaturedProducts = () => api.get("/products/featured");

// Category APIs
export const getCategories = () => api.get("/categories");
export const getFeaturedCategories = () => api.get("/categories/featured");

// Cart APIs
export const getCart = () => api.get("/cart");
export const addCartItem = (data) => api.post("/cart", data);
export const updateCartItem = (itemId, data) =>
  api.put(`/cart/${itemId}`, data);
export const removeCartItem = (itemId) => api.delete(`/cart/${itemId}`);
export const clearCart = () => api.delete("/cart");

// Order APIs
export const createOrder = (data) => api.post("/orders", data);
export const getMyOrders = () => api.get("/orders/myorders");
export const getOrderById = (id) => api.get(`/orders/${id}`);

// Review APIs
export const createReview = (data) => api.post("/reviews", data);
export const getProductReviews = (productId) =>
  api.get(`/reviews/product/${productId}`);

export default api;