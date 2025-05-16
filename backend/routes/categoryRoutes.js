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
  deleteCategories,
  getFeaturedCategories,
  getCategoryBySlug,
} = require("../controllers/categoryController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { uploadCategoryImage } = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", getCategories);
router.get("/main", getMainCategories);
router.get("/featured", getFeaturedCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);
router.get("/:id/subcategories", getSubcategories);

// Admin routes
const adminAuth = [protect, authorize("admin")];

router.post("/", adminAuth, uploadCategoryImage, createCategory);
router.put("/:id", adminAuth, uploadCategoryImage, updateCategory);
router.delete("/:id", adminAuth, deleteCategory);
router.delete("/", adminAuth, deleteCategories);

module.exports = router;
