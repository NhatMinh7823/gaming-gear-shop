// constants.js - Shared constants for the application

export const CURRENCY = {
  VND: 'VND',
  USD: 'USD'
};

export const LOCALE = {
  VI_VN: 'vi-VN',
  EN_US: 'en-US'
};

export const FORMAT_OPTIONS = {
  CURRENCY_VND: {
    style: 'currency',
    currency: CURRENCY.VND,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  },
  CURRENCY_USD: {
    style: 'currency',
    currency: CURRENCY.USD,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  },
  NUMBER: {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  },
  PERCENT: {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }
};

export const DATE_FORMAT_OPTIONS = {
  SHORT_DATE: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  },
  LONG_DATE: {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  },
  DATE_TIME: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }
};

export const COUPON_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  FREE_SHIPPING: 'free_shipping'
};

export const COUPON_STATUS = {
  ACTIVE: 'active',
  USED: 'used',
  PENDING: 'pending',
  EXPIRED: 'expired'
};
