import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const BASE_URL = API_URL.replace("/api", "");

console.log("API_URL:", API_URL);
console.log("BASE_URL:", BASE_URL);

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
        // Handle images array specifically
        if (Array.isArray(obj.images)) {
          obj.images = obj.images.map((img) => ({
            ...img,
            url:
              img.url && !img.url.startsWith("http")
                ? `${BASE_URL}${img.url}`
                : img.url,
          }));
        }
        // Handle other image fields
        Object.keys(obj).forEach((key) => {
          if (
            (key === "url" || key === "image") &&
            obj[key] &&
            typeof obj[key] === "string" &&
            !obj[key].startsWith("http")
          ) {
            obj[key] = `${BASE_URL}${obj[key]}`;
          } else if (typeof obj[key] === "object" && key !== "images") {
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
export const getProducts = (params = {}) => {
  // Transform sort parameter from { field, direction } to backend format
  if (params.sort && params.direction) {
    params.sort = `${params.direction === "desc" ? "-" : ""}${params.sort}`;
    delete params.direction;
  }

  // Remove empty string values from params
  Object.keys(params).forEach(
    (key) =>
      (params[key] === "" || params[key] === undefined) && delete params[key]
  );

  return api.get("/products", { params });
};
export const getProductById = (id) => api.get(`/products/${id}`);
export const searchProducts = (keyword, params) =>
  api.get(`/products/search?keyword=${keyword}`, { params });
export const getFeaturedProducts = () => api.get("/products/featured");
export const getSearchSuggestions = (keyword) =>
  api.get(`/products/suggestions?keyword=${keyword}`);

// Category APIs
export const getCategories = () => api.get("/categories");
export const getFeaturedCategories = () => api.get("/categories/featured");
export const getCategoryById = (id) => api.get(`/categories/${id}`); // Ensure this is here or add if missing
export const createCategory = (data) =>
  api.post("/categories", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
export const updateCategory = (id, data) =>
  api.put(`/categories/${id}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

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

// Payment APIs
export const createVNPayUrl = (orderId) =>
  api.post(`/payment/create-payment/${orderId}`);
// Ensure this function passes the complete query string correctly
export const checkVNPayPayment = (queryString) =>
  api.get(`/payment/payment-return${queryString}`);
export const queryVNPayTransaction = (orderId) =>
  api.post(`/payment/${orderId}/query`);
export const refundVNPayTransaction = (orderId, data) =>
  api.post(`/payment/${orderId}/refund`, data);

// Review APIs
export const createReview = (data) => api.post("/reviews", data);
export const getProductReviews = (productId) =>
  api.get(`/reviews/product/${productId}`);
export const getMyReviews = () => api.get("/reviews/myreviews");
export const updateReview = (reviewId, data) =>
  api.put(`/reviews/${reviewId}`, data);
export const deleteReview = (reviewId) => api.delete(`/reviews/${reviewId}`);

export default api;
