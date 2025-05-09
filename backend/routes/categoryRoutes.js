// categoryRoutes.js
const express = require("express");
const router = express.Router();
const {
  getCategories,
  getMainCategories,
  getCategoryById,
  getSubcategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getFeaturedCategories,
  getCategoryBySlug,
} = require("../controllers/categoryController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getCategories);
router.get("/main", getMainCategories);
router.get("/featured", getFeaturedCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);
router.get("/:id/subcategories", getSubcategories);

// Admin routes
router.post("/", protect, authorize("admin"), createCategory);
router.put("/:id", protect, authorize("admin"), updateCategory);
router.delete("/:id", protect, authorize("admin"), deleteCategory);

module.exports = router;
