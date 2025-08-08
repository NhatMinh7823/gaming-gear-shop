// couponMiddleware.js
const User = require("../models/userModel");
const {
  getCouponConfig,
  validateCouponRules,
} = require("../utils/couponConfig");

/**
 * Middleware kiểm tra tính hợp lệ của coupon
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 */
exports.validateCoupon = async (req, res, next) => {
  try {
    const { couponCode } = req.body;

    // Nếu không có mã coupon, bỏ qua việc kiểm tra
    if (!couponCode) {
      return next();
    }

    const upperCode = couponCode.toUpperCase();

    // Kiểm tra mã cố định trước - Using centralized config
    const coupon = getCouponConfig(upperCode);

    // Nếu là mã cố định, xử lý ngay
    if (coupon) {
      const { totalPrice = 0 } = req.body;

      // Validate coupon rules using centralized logic
      const validation = validateCouponRules(upperCode, totalPrice);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      let discountAmount;
      if (coupon.type === "percentage") {
        discountAmount = (totalPrice * coupon.discountPercent) / 100;
        // Áp dụng maxDiscount nếu có
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else if (coupon.type === "fixed") {
        discountAmount = coupon.discountAmount;
      } else if (coupon.type === "freeship") {
        discountAmount = 0; // No subtotal discount for freeship
      }

      // Thêm thông tin coupon vào request
      req.couponData = {
        code: coupon.code,
        discountPercent: coupon.discountPercent || 0,
        discountAmount: discountAmount || 0,
        type: coupon.type,
        isFixed: true,
        shippingDiscount: coupon.type === "freeship",
        minOrder: coupon.minOrder,
        maxDiscount: coupon.maxDiscount,
      };

      return next();
    }

    // Nếu không phải mã cố định, tìm trong database
    const user = await User.findOne({ "coupon.code": upperCode });

    // Không tìm thấy coupon
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Mã giảm giá không hợp lệ",
      });
    }

    // Kiểm tra trạng thái của coupon
    // Coupon đã được sử dụng
    if (user.coupon.used || user.coupon.status === "used") {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá đã được sử dụng",
      });
    }

    // Coupon đang được sử dụng trong một đơn hàng khác
    if (user.coupon.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá đang được sử dụng trong đơn hàng khác",
      });
    }

    // Tính toán giá trị giảm giá
    const discountPercent = user.coupon.discountPercent || 0;
    const { totalPrice = 0 } = req.body;
    const discountAmount = (totalPrice * discountPercent) / 100;

    // Thêm thông tin coupon vào request để sử dụng ở controller
    req.couponData = {
      code: user.coupon.code,
      discountPercent,
      discountAmount,
      userId: user._id,
      isFixed: false,
    };

    next();
  } catch (error) {
    console.error("Error validating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xử lý mã giảm giá",
      error: error.message,
    });
  }
};
