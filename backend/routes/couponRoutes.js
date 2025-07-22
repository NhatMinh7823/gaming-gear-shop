const express = require('express');
const router = express.Router();
const { validateCoupon } = require('../middleware/couponMiddleware');
const { protect } = require('../middleware/authMiddleware');

// Controller xử lý sau khi middleware validate
const applyCouponController = (req, res) => {
  try {
    // Middleware đã validate và thêm couponData vào req
    const couponData = req.couponData;
    
    res.json({
      success: true,
      couponData,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error applying coupon',
      error: error.message
    });
  }
};

// Controller để lấy danh sách coupon có sẵn
const getAvailableCouponsController = (req, res) => {
  try {
    const availableCoupons = [
      {
        code: 'WELCOME10',
        discountPercent: 10,
        type: 'percentage',
        description: 'Giảm 10% cho đơn hàng',
        minOrder: 200000,
        maxDiscount: 100000
      },
      {
        code: 'SAVE20',
        discountPercent: 20,
        type: 'percentage',
        description: 'Giảm 20% cho đơn hàng',
        minOrder: 500000,
        maxDiscount: 200000
      },
      {
        code: 'FREESHIP',
        discountAmount: 0,
        type: 'freeship',
        description: 'Miễn phí vận chuyển',
        minOrder: 100000,
        maxDiscount: null
      }
    ];

    res.json({
      success: true,
      coupons: availableCoupons,
      message: 'Available coupons retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving available coupons',
      error: error.message
    });
  }
};

// Route để lấy danh sách coupon có sẵn
router.get('/available', getAvailableCouponsController);

// Route áp dụng coupon với middleware validation
router.post('/apply', protect, validateCoupon, applyCouponController);

module.exports = router;
