// couponUtils.js
/**
 * Hàm tạo mã coupon ngẫu nhiên
 * @param {number} length Chiều dài của mã coupon
 * @returns {string} Mã coupon
 */
const generateCouponCode = (length = 5) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

module.exports = {
  generateCouponCode,
};
