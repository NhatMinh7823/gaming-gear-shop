// reviewRoutes.js
const express = require("express");
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getMyReviews,
  getAllReviews,
} = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.get("/product/:productId", getProductReviews);
router.get("/myreviews", protect, getMyReviews);
router.get("/:id", getReviewById);

// User routes
router.post("/", protect, createReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

// Admin routes
router.get("/", protect, authorize("admin"), getAllReviews);

module.exports = router;
