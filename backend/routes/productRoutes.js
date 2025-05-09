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
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getProducts);
router.get("/top", getTopProducts);
router.get("/new", getNewArrivals);
router.get("/featured", getFeaturedProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/search", searchProducts);
router.get("/:id", getProductById);

// Admin routes
router.post("/", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
