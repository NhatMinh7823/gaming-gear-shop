// userRoutes.js
const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
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
  // Admin address management
  getUserAddressesByAdmin,
  updateAddressByAdmin,
  deleteAddressByAdmin,
  // User reviews
  getReviewsByUser,
  // Admin user creation
  createUserByAdmin,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);
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
router.post("/admin/create", protect, authorize("admin"), createUserByAdmin);
router.get("/:id", protect, authorize("admin"), getUserById);
router.put("/:id", protect, authorize("admin"), updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

// Admin - User specific data management
router.get("/:userId/reviews", protect, authorize("admin"), getReviewsByUser);
router.get(
  "/:userId/addresses",
  protect,
  authorize("admin"),
  getUserAddressesByAdmin
);
router.put(
  "/:userId/addresses/:addressId",
  protect,
  authorize("admin"),
  updateAddressByAdmin
);
router.delete(
  "/:userId/addresses/:addressId",
  protect,
  authorize("admin"),
  deleteAddressByAdmin
);

module.exports = router;
