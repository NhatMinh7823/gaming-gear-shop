// couponHelpers.js - Utilities for coupon operations

import { COUPON_TYPES, COUPON_STATUS } from './constants';
import { formatPrice, formatPercentage } from './formatters';

/**
 * Calculate discount amount from coupon
 * @param {object} coupon - Coupon object
 * @param {number} totalPrice - Total price before discount
 * @returns {number} Discount amount
 */
export const calculateDiscountAmount = (coupon, totalPrice) => {
  if (!coupon || !totalPrice || totalPrice <= 0) {
    return 0;
  }

  switch (coupon.type) {
    case COUPON_TYPES.PERCENTAGE:
      return Math.round((totalPrice * (coupon.discountPercent || 0)) / 100);
    
    case COUPON_TYPES.FIXED:
      return Math.min(coupon.discountAmount || 0, totalPrice);
    
    case COUPON_TYPES.FREE_SHIPPING:
      return coupon.discountAmount || 0;
    
    default:
      return 0;
  }
};

/**
 * Calculate final price after applying coupon
 * @param {number} totalPrice - Original total price
 * @param {object} coupon - Coupon object
 * @returns {object} Object with originalPrice, discountAmount, finalPrice
 */
export const calculateFinalPrice = (totalPrice, coupon) => {
  const discountAmount = calculateDiscountAmount(coupon, totalPrice);
  const finalPrice = Math.max(0, totalPrice - discountAmount);

  return {
    originalPrice: totalPrice,
    discountAmount,
    finalPrice,
    savings: discountAmount
  };
};

/**
 * Validate coupon status and usage
 * @param {object} coupon - Coupon object
 * @returns {object} Validation result with isValid and message
 */
export const validateCouponStatus = (coupon) => {
  if (!coupon) {
    return { isValid: false, message: 'Mã giảm giá không tồn tại' };
  }

  if (coupon.used || coupon.status === COUPON_STATUS.USED) {
    return { isValid: false, message: 'Mã giảm giá đã được sử dụng' };
  }

  if (coupon.status === COUPON_STATUS.PENDING) {
    return { isValid: false, message: 'Mã giảm giá đang được sử dụng trong đơn hàng khác' };
  }

  if (coupon.status === COUPON_STATUS.EXPIRED) {
    return { isValid: false, message: 'Mã giảm giá đã hết hạn' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { isValid: false, message: 'Mã giảm giá đã hết hạn' };
  }

  if (coupon.minOrderAmount && coupon.minOrderAmount > 0) {
    return { 
      isValid: false, 
      message: `Đơn hàng tối thiểu ${formatPrice(coupon.minOrderAmount)} để sử dụng mã này` 
    };
  }

  return { isValid: true, message: 'Mã giảm giá hợp lệ' };
};

/**
 * Format coupon display information
 * @param {object} coupon - Coupon object
 * @returns {object} Formatted coupon info for display
 */
export const formatCouponDisplay = (coupon) => {
  if (!coupon) return null;

  const baseInfo = {
    code: coupon.code?.toUpperCase() || '',
    status: coupon.status || COUPON_STATUS.ACTIVE,
    isUsed: coupon.used || coupon.status === COUPON_STATUS.USED
  };

  switch (coupon.type) {
    case COUPON_TYPES.PERCENTAGE:
      return {
        ...baseInfo,
        title: `Giảm ${coupon.discountPercent}%`,
        description: `Giảm ${coupon.discountPercent}% cho đơn hàng`,
        displayValue: `${coupon.discountPercent}%`,
        type: COUPON_TYPES.PERCENTAGE
      };
    
    case COUPON_TYPES.FIXED:
      return {
        ...baseInfo,
        title: `Giảm ${formatPrice(coupon.discountAmount)}`,
        description: `Giảm ${formatPrice(coupon.discountAmount)} cho đơn hàng`,
        displayValue: formatPrice(coupon.discountAmount),
        type: COUPON_TYPES.FIXED
      };
    
    case COUPON_TYPES.FREE_SHIPPING:
      return {
        ...baseInfo,
        title: 'Miễn phí vận chuyển',
        description: 'Miễn phí vận chuyển cho đơn hàng',
        displayValue: 'Miễn phí',
        type: COUPON_TYPES.FREE_SHIPPING
      };
    
    default:
      return {
        ...baseInfo,
        title: 'Mã giảm giá',
        description: 'Mã giảm giá đặc biệt',
        displayValue: coupon.code,
        type: 'unknown'
      };
  }
};

/**
 * Get coupon status color and icon
 * @param {object} coupon - Coupon object
 * @returns {object} Object with color and icon info
 */
export const getCouponStatusStyle = (coupon) => {
  if (!coupon) {
    return { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
  }

  if (coupon.used || coupon.status === COUPON_STATUS.USED) {
    return { 
      color: 'red', 
      bgColor: 'bg-red-100', 
      textColor: 'text-red-600',
      statusText: 'Đã sử dụng'
    };
  }

  if (coupon.status === COUPON_STATUS.PENDING) {
    return { 
      color: 'yellow', 
      bgColor: 'bg-yellow-100', 
      textColor: 'text-yellow-600',
      statusText: 'Đang sử dụng'
    };
  }

  if (coupon.status === COUPON_STATUS.EXPIRED) {
    return { 
      color: 'gray', 
      bgColor: 'bg-gray-100', 
      textColor: 'text-gray-600',
      statusText: 'Đã hết hạn'
    };
  }

  return { 
    color: 'green', 
    bgColor: 'bg-green-100', 
    textColor: 'text-green-600',
    statusText: 'Có thể sử dụng'
  };
};

/**
 * Check if coupon can be applied to order
 * @param {object} coupon - Coupon object
 * @param {number} orderTotal - Order total amount
 * @param {object} user - User object (for user-specific coupons)
 * @returns {object} Check result with canApply and reason
 */
export const canApplyCoupon = (coupon, orderTotal, user = null) => {
  // Basic validation
  const statusCheck = validateCouponStatus(coupon);
  if (!statusCheck.isValid) {
    return { canApply: false, reason: statusCheck.message };
  }

  // Check minimum order amount
  if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
    return { 
      canApply: false, 
      reason: `Đơn hàng tối thiểu ${formatPrice(coupon.minOrderAmount)} để sử dụng mã này` 
    };
  }

  // Check maximum discount (for percentage coupons)
  if (coupon.type === COUPON_TYPES.PERCENTAGE && coupon.maxDiscountAmount) {
    const discountAmount = calculateDiscountAmount(coupon, orderTotal);
    if (discountAmount > coupon.maxDiscountAmount) {
      return { 
        canApply: true, 
        reason: `Giảm tối đa ${formatPrice(coupon.maxDiscountAmount)}` 
      };
    }
  }

  // Check user eligibility (for user-specific coupons)
  if (coupon.userId && user && coupon.userId !== user._id) {
    return { canApply: false, reason: 'Mã giảm giá này không dành cho bạn' };
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { canApply: false, reason: 'Mã giảm giá đã đạt giới hạn sử dụng' };
  }

  return { canApply: true, reason: 'Mã giảm giá có thể áp dụng' };
};

/**
 * Generate coupon usage summary
 * @param {object} coupon - Coupon object
 * @param {number} orderTotal - Order total
 * @returns {object} Usage summary
 */
export const generateCouponSummary = (coupon, orderTotal) => {
  if (!coupon) return null;

  const calculation = calculateFinalPrice(orderTotal, coupon);
  const display = formatCouponDisplay(coupon);
  const style = getCouponStatusStyle(coupon);

  return {
    ...calculation,
    ...display,
    ...style,
    formattedOriginalPrice: formatPrice(calculation.originalPrice),
    formattedDiscountAmount: formatPrice(calculation.discountAmount),
    formattedFinalPrice: formatPrice(calculation.finalPrice),
    formattedSavings: formatPrice(calculation.savings)
  };
};

/**
 * Copy coupon code to clipboard (browser utility)
 * @param {string} code - Coupon code
 * @returns {Promise<boolean>} Success status
 */
export const copyCouponToClipboard = async (code) => {
  if (!code) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy coupon code:', error);
    return false;
  }
};

// Default export with all utilities
export default {
  calculateDiscountAmount,
  calculateFinalPrice,
  validateCouponStatus,
  formatCouponDisplay,
  getCouponStatusStyle,
  canApplyCoupon,
  generateCouponSummary,
  copyCouponToClipboard
};
