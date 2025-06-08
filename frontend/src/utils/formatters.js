// formatters.js - Centralized formatting utilities

import { LOCALE, FORMAT_OPTIONS, DATE_FORMAT_OPTIONS } from './constants';

/**
 * Format price with Vietnamese currency (VND)
 * @param {number} price - The price to format
 * @returns {string} Formatted price string
 */
export const formatPrice = (price) => {
  if (typeof price !== 'number' || isNaN(price)) {
    return '0 ₫';
  }
  
  return new Intl.NumberFormat(LOCALE.VI_VN, FORMAT_OPTIONS.CURRENCY_VND).format(price);
};

/**
 * Format currency with custom options
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (VND, USD, etc.)
 * @param {string} locale - Locale string (vi-VN, en-US, etc.)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'VND', locale = LOCALE.VI_VN) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }

  const options = currency === 'VND' ? FORMAT_OPTIONS.CURRENCY_VND : FORMAT_OPTIONS.CURRENCY_USD;
  
  return new Intl.NumberFormat(locale, {
    ...options,
    currency
  }).format(amount);
};

/**
 * Format number with locale-specific formatting
 * @param {number} number - The number to format
 * @param {object} options - Custom formatting options
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, options = {}) => {
  if (typeof number !== 'number' || isNaN(number)) {
    return '0';
  }

  return new Intl.NumberFormat(LOCALE.VI_VN, {
    ...FORMAT_OPTIONS.NUMBER,
    ...options
  }).format(number);
};

/**
 * Format percentage
 * @param {number} value - The decimal value to format as percentage (0.1 = 10%)
 * @param {object} options - Custom formatting options
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, options = {}) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }

  return new Intl.NumberFormat(LOCALE.VI_VN, {
    ...FORMAT_OPTIONS.PERCENT,
    ...options
  }).format(value);
};

/**
 * Format discount percentage for display
 * @param {number} originalPrice - Original price
 * @param {number} discountPrice - Discounted price
 * @returns {string} Formatted discount percentage (e.g., "-15%")
 */
export const formatDiscountPercentage = (originalPrice, discountPrice) => {
  if (!originalPrice || !discountPrice || originalPrice <= discountPrice) {
    return '';
  }

  const discountPercent = ((originalPrice - discountPrice) / originalPrice) * 100;
  return `-${Math.round(discountPercent)}%`;
};

/**
 * Format date with Vietnamese locale
 * @param {Date|string} date - Date to format
 * @param {string} formatType - Type of format (SHORT_DATE, LONG_DATE, DATE_TIME)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatType = 'SHORT_DATE') => {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const options = DATE_FORMAT_OPTIONS[formatType] || DATE_FORMAT_OPTIONS.SHORT_DATE;
  
  return new Intl.DateTimeFormat(LOCALE.VI_VN, options).format(dateObj);
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);

  const intervals = [
    { label: 'năm', seconds: 31536000 },
    { label: 'tháng', seconds: 2592000 },
    { label: 'tuần', seconds: 604800 },
    { label: 'ngày', seconds: 86400 },
    { label: 'giờ', seconds: 3600 },
    { label: 'phút', seconds: 60 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return `${count} ${interval.label} trước`;
    }
  }

  return 'Vừa xong';
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format phone number with Vietnamese format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Vietnamese phone number format: (+84) xxx xxx xxx
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `(+84) ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  if (cleaned.length === 9) {
    return `(+84) ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  return phoneNumber; // Return original if can't format
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Format coupon code for display (uppercase with spacing)
 * @param {string} code - Coupon code
 * @returns {string} Formatted coupon code
 */
export const formatCouponCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  
  return code.toUpperCase().replace(/(.{4})/g, '$1 ').trim();
};

/**
 * Format stock status
 * @param {number} stock - Stock quantity
 * @returns {object} Object with status and message
 */
export const formatStockStatus = (stock) => {
  if (typeof stock !== 'number') {
    return { status: 'unknown', message: 'Không xác định', color: 'gray' };
  }

  if (stock === 0) {
    return { status: 'out-of-stock', message: 'Hết hàng', color: 'red' };
  }
  
  if (stock <= 5) {
    return { status: 'low-stock', message: `Chỉ còn ${stock} sản phẩm`, color: 'orange' };
  }
  
  if (stock <= 20) {
    return { status: 'limited', message: `Còn ${stock} sản phẩm`, color: 'yellow' };
  }
  
  return { status: 'in-stock', message: 'Còn hàng', color: 'green' };
};

// Default export with all formatters
export default {
  formatPrice,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDiscountPercentage,
  formatDate,
  formatRelativeTime,
  formatFileSize,
  formatPhoneNumber,
  truncateText,
  formatCouponCode,
  formatStockStatus
};
