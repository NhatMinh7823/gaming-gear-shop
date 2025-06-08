// userRoutes.js
const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updatePassword,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getRecentUsers,
  generateCoupon,
  applyCoupon,
  markCouponAsUsed,
  updateAddress,
  getUserAddress,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/apply-coupon", applyCoupon);

// Protected routes (require authentication)
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/password", protect, updatePassword);
router.post("/wishlist", protect, addToWishlist);
router.delete("/wishlist/:productId", protect, removeFromWishlist);
router.get("/wishlist", protect, getWishlist);
router.post("/generate-coupon", protect, generateCoupon);
router.post("/mark-coupon-used", protect, markCouponAsUsed);
router.put("/address", protect, updateAddress);
router.get("/address", protect, getUserAddress);

// Admin routes
router.get("/", protect, authorize("admin"), getAllUsers);
router.get("/recent", protect, authorize("admin"), getRecentUsers);
router.get("/:id", protect, authorize("admin"), getUserById);
router.put("/:id", protect, authorize("admin"), updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
