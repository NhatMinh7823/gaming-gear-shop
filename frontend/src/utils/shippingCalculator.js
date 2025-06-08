// Utility functions for shipping calculations

/**
 * Calculate total shipping dimensions and weight from cart items
 * @param {Array} cartItems - Array of cart items
 * @returns {Object} Shipping dimensions and weight
 */
export const calculateCartShipping = (cartItems) => {
  let totalWeight = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;

  cartItems.forEach(item => {
    // Use product shipping info if available, otherwise use defaults
    const itemWeight = item.shippingInfo?.weight || 200; // Default 200g
    const itemLength = item.shippingInfo?.dimensions?.length || 20; // Default 20cm
    const itemWidth = item.shippingInfo?.dimensions?.width || 20; // Default 20cm
    const itemHeight = item.shippingInfo?.dimensions?.height || 5; // Default 5cm

    // Calculate totals
    totalWeight += itemWeight * item.quantity;
    maxLength = Math.max(maxLength, itemLength);
    maxWidth = Math.max(maxWidth, itemWidth);
    totalHeight += itemHeight * item.quantity;
  });

  return {
    weight: Math.max(totalWeight, 200), // Minimum 200g
    length: Math.max(maxLength, 20),    // Minimum 20cm
    width: Math.max(maxWidth, 20),      // Minimum 20cm
    height: Math.max(totalHeight, 5)    // Minimum 5cm
  };
};

/**
 * Format shipping dimensions for display
 * @param {Object} dimensions - Shipping dimensions object
 * @returns {String} Formatted dimensions string
 */
export const formatDimensions = (dimensions) => {
  const { weight, length, width, height } = dimensions;
  return `${length}x${width}x${height}cm, ${weight}g`;
};

/**
 * Estimate shipping cost based on distance and weight (fallback calculation)
 * @param {Number} weight - Total weight in grams
 * @param {String} destinationProvince - Destination province name
 * @returns {Number} Estimated shipping cost in VND
 */
export const estimateShippingCost = (weight, destinationProvince) => {
  const basePrice = 15000; // Base shipping price
  const weightMultiplier = Math.ceil(weight / 500); // Additional cost per 500g
  
  // Distance multiplier based on province (simplified)
  let distanceMultiplier = 1;
  
  if (destinationProvince) {
    const province = destinationProvince.toLowerCase();
    if (province.includes('hồ chí minh') || province.includes('tp.hcm')) {
      distanceMultiplier = 1.2;
    } else if (province.includes('hà nội')) {
      distanceMultiplier = 1.5;
    } else if (province.includes('đà nẵng')) {
      distanceMultiplier = 1.1;
    }
  }
  
  return Math.round(basePrice * distanceMultiplier * weightMultiplier);
};

/**
 * Validate address completeness for shipping calculation
 * @param {Object} address - Address object
 * @returns {Boolean} Whether address is complete enough for shipping calculation
 */
export const isAddressComplete = (address) => {
  return !!(
    address &&
    address.province?.id &&
    address.district?.id &&
    address.ward?.code
  );
};

/**
 * Format address for display
 * @param {Object} address - Address object
 * @returns {String} Formatted address string
 */
export const formatAddress = (address) => {
  if (!address) return '';
  
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.ward?.name) parts.push(address.ward.name);
  if (address.district?.name) parts.push(address.district.name);
  if (address.province?.name) parts.push(address.province.name);
  
  return parts.join(', ');
};

/**
 * Default shipping configuration
 */
export const SHIPPING_CONFIG = {
  DEFAULT_WEIGHT: 200, // grams
  DEFAULT_DIMENSIONS: {
    length: 20, // cm
    width: 20,  // cm
    height: 5   // cm
  },
  FALLBACK_FEE: 15000, // VND
  MIN_WEIGHT: 200,     // grams
  MIN_DIMENSIONS: {
    length: 20, // cm
    width: 20,  // cm
    height: 5   // cm
  }
};
