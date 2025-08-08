// couponConfig.js - Centralized coupon configuration based on price segments
// This is a temporary implementation for demo purposes

/**
 * Price segments based on product analysis
 */
const PRICE_SEGMENTS = {
  LOW: { min: 0, max: 5000000, name: 'Dưới 5 triệu' },
  MID_LOW: { min: 15000000, max: 25000000, name: '15-25 triệu' },
  MID_HIGH: { min: 25000000, max: 40000000, name: '25-40 triệu' },
  HIGH: { min: 40000000, max: 60000000, name: '40-60 triệu' },
  PREMIUM: { min: 60000000, max: 90000000, name: '60-90 triệu' },
  ULTRA: { min: 90000000, max: null, name: 'Trên 90 triệu' }
};

/**
 * Coupon configurations based on price segments
 * Following the strategy: 10% for all segments, 20% only for orders > 20M VND
 */
const COUPON_CONFIGS = {
  // 10% Coupons - Available for all segments
  SAVE10LOW: {
    code: 'SAVE10LOW',
    discountPercent: 10,
    type: 'percentage',
    description: 'Giảm 10% cho đơn hàng dưới 5 triệu',
    minOrder: 1500000, // 1.5M VND
    maxDiscount: 500000, // 500K VND
    segment: 'LOW',
    strategy: 'Tăng số lượng đơn hàng phân khúc thấp'
  },
  SAVE10MID: {
    code: 'SAVE10MID',
    discountPercent: 10,
    type: 'percentage',
    description: 'Giảm 10% cho đơn hàng 15-25 triệu',
    minOrder: 10000000, // 10M VND
    maxDiscount: 2000000, // 2M VND
    segment: 'MID_LOW',
    strategy: 'Tăng số lượng đơn hàng phân khúc trung'
  },
  SAVE10HIGH: {
    code: 'SAVE10HIGH',
    discountPercent: 10,
    type: 'percentage',
    description: 'Giảm 10% cho đơn hàng 25-40 triệu',
    minOrder: 15000000, // 15M VND
    maxDiscount: 3000000, // 3M VND
    segment: 'MID_HIGH',
    strategy: 'Tăng số lượng đơn hàng phân khúc cao'
  },

  // 20% Coupons - Only for orders > 20M VND (premium strategy)
  SAVE20MID: {
    code: 'SAVE20MID',
    discountPercent: 20,
    type: 'percentage',
    description: 'Giảm 20% cho đơn hàng từ 20 triệu',
    minOrder: 20000000, // 20M VND
    maxDiscount: 4000000, // 4M VND
    segment: 'MID_LOW',
    strategy: 'Thúc đẩy bán hàng cao cấp'
  },
  SAVE20HIGH: {
    code: 'SAVE20HIGH',
    discountPercent: 20,
    type: 'percentage',
    description: 'Giảm 20% cho đơn hàng từ 30 triệu',
    minOrder: 30000000, // 30M VND
    maxDiscount: 6000000, // 6M VND
    segment: 'MID_HIGH',
    strategy: 'Thúc đẩy bán hàng cao cấp'
  },
  SAVE20PREMIUM: {
    code: 'SAVE20PREMIUM',
    discountPercent: 20,
    type: 'percentage',
    description: 'Giảm 20% cho đơn hàng từ 50 triệu',
    minOrder: 50000000, // 50M VND
    maxDiscount: 10000000, // 10M VND
    segment: 'PREMIUM',
    strategy: 'Thúc đẩy bán hàng siêu cao cấp'
  },

  // Special coupons
  FREESHIP: {
    code: 'FREESHIP',
    discountAmount: 0,
    type: 'freeship',
    description: 'Miễn phí vận chuyển',
    minOrder: 1000000, // 1M VND
    maxDiscount: null,
    segment: 'ALL',
    strategy: 'Tăng conversion rate'
  }
};

/**
 * Get coupon configuration by code
 * @param {string} code - Coupon code
 * @returns {object|null} Coupon configuration
 */
const getCouponConfig = (code) => {
  return COUPON_CONFIGS[code.toUpperCase()] || null;
};

/**
 * Get all available coupons
 * @returns {array} Array of coupon configurations
 */
const getAllCoupons = () => {
  return Object.values(COUPON_CONFIGS);
};

/**
 * Get coupons by segment
 * @param {string} segment - Price segment
 * @returns {array} Array of coupon configurations for the segment
 */
const getCouponsBySegment = (segment) => {
  return Object.values(COUPON_CONFIGS).filter(
    coupon => coupon.segment === segment || coupon.segment === 'ALL'
  );
};

/**
 * Get recommended coupons based on order total
 * @param {number} orderTotal - Total order amount
 * @returns {array} Array of applicable coupon configurations
 */
const getRecommendedCoupons = (orderTotal) => {
  return Object.values(COUPON_CONFIGS).filter(coupon => {
    // Check if order meets minimum requirement
    if (coupon.minOrder && orderTotal < coupon.minOrder) {
      return false;
    }
    
    // For 20% coupons, ensure order is above 20M VND threshold
    if (coupon.discountPercent === 20 && orderTotal < 20000000) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by discount percentage (highest first), then by minimum order (lowest first)
    if (a.discountPercent !== b.discountPercent) {
      return b.discountPercent - a.discountPercent;
    }
    return a.minOrder - b.minOrder;
  });
};

/**
 * Validate coupon against business rules
 * @param {string} code - Coupon code
 * @param {number} orderTotal - Total order amount
 * @returns {object} Validation result
 */
const validateCouponRules = (code, orderTotal) => {
  const coupon = getCouponConfig(code);
  
  if (!coupon) {
    return { isValid: false, message: 'Mã giảm giá không tồn tại' };
  }
  
  // Check minimum order
  if (coupon.minOrder && orderTotal < coupon.minOrder) {
    return { 
      isValid: false, 
      message: `Đơn hàng tối thiểu ${coupon.minOrder.toLocaleString('vi-VN')}đ để sử dụng mã này` 
    };
  }
  
  // Special rule for 20% coupons - not recommended for orders under 20M
  if (coupon.discountPercent === 20 && orderTotal < 20000000) {
    return { 
      isValid: false, 
      message: 'Mã giảm 20% chỉ áp dụng cho đơn hàng từ 20 triệu VND' 
    };
  }
  
  return { isValid: true, message: 'Mã giảm giá hợp lệ' };
};

module.exports = {
  PRICE_SEGMENTS,
  COUPON_CONFIGS,
  getCouponConfig,
  getAllCoupons,
  getCouponsBySegment,
  getRecommendedCoupons,
  validateCouponRules
};
