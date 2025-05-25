// productRoutes.js
const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getTopProducts,
  getNewArrivals,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
  getSearchSuggestions,
  getChatbotProductData,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { uploadProductImages } = require("../middleware/uploadMiddleware"); // Import upload middleware

// Public routes
router.get("/", getProducts);
router.get("/top", getTopProducts);
router.get("/new", getNewArrivals);
router.get("/featured", getFeaturedProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/search", searchProducts);
router.get("/suggestions", getSearchSuggestions);
router.get("/chatbot-data", getChatbotProductData);
router.get("/:id", getProductById);

// Admin routes
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadProductImages,
  createProduct
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadProductImages,
  updateProduct
);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
