import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const BASE_URL = process.env.REACT_APP_API_URL
  ? API_URL.replace("/api", "")
  : "http://localhost:3000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  if (userInfo && userInfo.token) {
    config.headers.Authorization = `Bearer ${userInfo.token}`;
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (response.data) {
    const transformImages = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(transformImages);
      } else if (obj && typeof obj === "object") {
        Object.keys(obj).forEach((key) => {
          if (
            key === "url" &&
            obj[key] &&
            typeof obj[key] === "string" &&
            !obj[key].startsWith("http")
          ) {
            obj[key] = `${BASE_URL}${obj[key]}`;
          } else if (typeof obj[key] === "object") {
            transformImages(obj[key]);
          }
        });
      }
      return obj;
    };
    response.data = transformImages(response.data);
  }
  return response;
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
export const searchProducts = (keyword, params) =>
  api.get(`/products/search?keyword=${keyword}`, { params });
export const getFeaturedProducts = () => api.get("/products/featured");
export const getSearchSuggestions = (keyword) =>
  api.get(`/products/suggestions?keyword=${keyword}`);

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
export const getMyReviews = () => api.get("/reviews/myreviews");
export const updateReview = (reviewId, data) =>
  api.put(`/reviews/${reviewId}`, data);
export const deleteReview = (reviewId) => api.delete(`/reviews/${reviewId}`);

export default api;
