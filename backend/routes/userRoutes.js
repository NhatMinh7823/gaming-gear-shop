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
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (require authentication)
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/password", protect, updatePassword);
router.post("/wishlist", protect, addToWishlist);
router.delete("/wishlist/:productId", protect, removeFromWishlist);
router.get("/wishlist", protect, getWishlist);

// Admin routes
router.get("/", protect, authorize("admin"), getAllUsers);
router.get("/recent", protect, authorize("admin"), getRecentUsers);
router.get("/:id", protect, authorize("admin"), getUserById);
router.put("/:id", protect, authorize("admin"), updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
