// Utility functions for product formatting and data processing

/**
 * Format price to Vietnamese format
 * @param {number} price - Price in VND
 * @returns {string} Formatted price string
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN").format(price);
};

/**
 * Format product metadata for display
 * @param {Object} metadata - Product metadata
 * @returns {string} Formatted product string
 */
const formatProductFromMetadata = (metadata) => {
  const effectivePrice = metadata.discountPrice || metadata.price;
  const effectivePriceFormatted = formatPrice(effectivePrice);
  const originalPriceFormatted = formatPrice(metadata.price);

  return `🎮 **${metadata.name}**
   💰 Giá: ${effectivePriceFormatted} VND${
    metadata.discountPrice
      ? ` ⚡ GIẢM TỪ ${originalPriceFormatted} VND - TIẾT KIỆM ${formatPrice(metadata.price - metadata.discountPrice)} VND`
      : ""
  }
   📁 Danh mục: ${metadata.category}
   🏷️ Thương hiệu: ${metadata.brand}
   📦 Tình trạng: ${metadata.inStock ? "✅ Còn hàng" : "❌ Hết hàng"}
   🌟 Đánh giá: ${metadata.averageRating}/5 (${metadata.numReviews} lượt)
   ⚙️ Thông số: ${Object.entries(metadata.specifications)
     .map(([k, v]) => `${k}: ${v}`)
     .join(", ")}
   ✨ Tính năng: ${metadata.features.join(", ")}`;
};

/**
 * Format product from database object
 * @param {Object} product - Product from database
 * @returns {string} Formatted product string
 */
const formatProductFromDB = (product) => {
  const effectivePrice = product.discountPrice || product.price;
  const effectivePriceFormatted = formatPrice(effectivePrice);
  const originalPriceFormatted = formatPrice(product.price);

  return `🎮 **${product.name}**
   💰 Giá: ${effectivePriceFormatted} VND${
    product.discountPrice
      ? ` ⚡ GIẢM TỪ ${originalPriceFormatted} VND - TIẾT KIỆM ${formatPrice(product.price - product.discountPrice)} VND`
      : ""
  }
   📁 Danh mục: ${product.category?.name || "N/A"}
   🏷️ Thương hiệu: ${product.brand || "N/A"}
   📦 Tình trạng: ${product.stock > 0 ? "✅ Còn hàng" : "❌ Hết hàng"}
   🌟 Đánh giá: ${product.averageRating}/5 (${product.numReviews} lượt)
   ⚙️ Thông số: ${Object.entries(product.specifications || {})
     .map(([k, v]) => `${k}: ${v}`)
     .join(", ")}
   ✨ Tính năng: ${product.features?.join(", ") || "N/A"}`;
};

/**
 * Get sort options for MongoDB query
 * @param {string} sortBy - Sort criteria
 * @returns {Object} MongoDB sort object
 */
const getSortOptions = (sortBy) => {
  switch (sortBy) {
    case "price_asc":
      return { price: 1 };
    case "price_desc":
      return { price: -1 };
    case "name_asc":
      return { name: 1 };
    case "name_desc":
      return { name: -1 };
    case "rating_desc":
      return { averageRating: -1 };
    default:
      return { createdAt: -1 };
  }
};

/**
 * Build filter summary for display
 * @param {Object} input - Filter input parameters
 * @returns {string} Filter summary string
 */
const buildFilterSummary = (input) => {
  const filters = [];
  if (input.category) filters.push(`Danh mục: ${input.category}`);
  if (input.minPrice || input.maxPrice) {
    const priceRange = `${
      input.minPrice ? formatPrice(input.minPrice) : "0"
    } - ${input.maxPrice ? formatPrice(input.maxPrice) : "∞"} VND`;
    filters.push(`Giá: ${priceRange}`);
  }
  if (input.brand) filters.push(`Thương hiệu: ${input.brand}`);
  if (input.inStockOnly) filters.push(`Chỉ còn hàng`);
  if (input.specifications) {
    filters.push(
      `Thông số: ${Object.entries(input.specifications)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}`
    );
  }
  if (input.sortBy) {
    const sortLabels = {
      price_asc: "Giá tăng dần",
      price_desc: "Giá giảm dần",
      name_asc: "Tên A-Z",
      name_desc: "Tên Z-A",
      rating_desc: "Đánh giá cao nhất",
    };
    filters.push(`Sắp xếp: ${sortLabels[input.sortBy]}`);
  }
  return filters.length > 0 ? ` (${filters.join(", ")})` : "";
};

module.exports = {
  formatPrice,
  formatProductFromMetadata,
  formatProductFromDB,
  getSortOptions,
  buildFilterSummary,
};
