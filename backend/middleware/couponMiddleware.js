// couponMiddleware.js
const User = require("../models/userModel");

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

    // Tìm người dùng có mã coupon
    const user = await User.findOne({ "coupon.code": couponCode });

    // Không tìm thấy coupon
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Mã giảm giá không hợp lệ",
      });
    }

    // Coupon đã được sử dụng
    if (user.coupon.used) {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá đã được sử dụng",
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
