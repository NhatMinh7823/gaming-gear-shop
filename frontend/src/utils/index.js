// index.js - Central export for all utilities

// Re-export all formatters
export * from './formatters';
export { default as formatters } from './formatters';

// Re-export all constants
export * from './constants';

// Re-export coupon helpers
export * from './couponHelpers';
export { default as couponHelpers } from './couponHelpers';

// Re-export text formatter (existing)
export * from './textFormatter';
export { default as textFormatter } from './textFormatter';

// Re-export other existing utilities
export * from './chatbotStateManager';

// Convenience exports for most commonly used functions
export { formatPrice } from './formatters';
export { formatCouponDisplay, copyCouponToClipboard } from './couponHelpers';
export { formatMessageText } from './textFormatter';
