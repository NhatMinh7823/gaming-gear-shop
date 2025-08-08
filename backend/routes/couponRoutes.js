const express = require("express");
const router = express.Router();
const { validateCoupon } = require("../middleware/couponMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { getAllCoupons } = require("../utils/couponConfig");

// Controller xử lý sau khi middleware validate
const applyCouponController = (req, res) => {
  try {
    // Middleware đã validate và thêm couponData vào req
    const couponData = req.couponData;

    res.json({
      success: true,
      couponData,
      message: "Coupon applied successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error applying coupon",
      error: error.message,
    });
  }
};

// Controller để lấy danh sách coupon có sẵn
const getAvailableCouponsController = (req, res) => {
  try {
    // Get coupons from centralized config
    const availableCoupons = getAllCoupons();

    res.json({
      success: true,
      coupons: availableCoupons,
      message: "Available coupons retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving available coupons",
      error: error.message,
    });
  }
};

// Route để lấy danh sách coupon có sẵn
router.get("/available", getAvailableCouponsController);

// Route áp dụng coupon với middleware validation
router.post("/apply", protect, validateCoupon, applyCouponController);

module.exports = router;
