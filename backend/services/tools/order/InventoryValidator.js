// InventoryValidator.js
const Product = require("../../../models/productModel");

/**
 * Inventory validation utilities for chatbot order flow
 */
class InventoryValidator {
  /**
   * Validate cart inventory in real-time
   * @param {Array} cartItems - Array of cart items to validate
   * @returns {Object} Validation results with detailed status for each item
   */
  static async validateCartInventory(cartItems) {
    const validationResults = [];
    
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return {
        success: false,
        message: "Giỏ hàng trống hoặc không hợp lệ",
        results: [],
        hasIssues: true
      };
    }

    for (const item of cartItems) {
      try {
        const product = await Product.findById(item.product);
        
        if (!product) {
          validationResults.push({
            item: item,
            status: 'PRODUCT_NOT_FOUND',
            available: 0,
            requested: item.quantity,
            message: `Sản phẩm ${item.name} không còn tồn tại`,
            severity: 'ERROR'
          });
          continue;
        }
        
        // Check if product is active/available
        if (product.isDeleted || product.isActive === false) {
          validationResults.push({
            item: item,
            status: 'PRODUCT_UNAVAILABLE',
            available: 0,
            requested: item.quantity,
            message: `${item.name || item.product.name} hiện không có sẵn (sản phẩm đã bị tạm ngừng)`,
            severity: 'ERROR'
          });
          continue;
        }
        
        // Check stock availability
        if (product.stock < item.quantity) {
          validationResults.push({
            item: item,
            status: 'INSUFFICIENT_STOCK',
            available: product.stock,
            requested: item.quantity,
            message: `${item.name} chỉ còn ${product.stock} sản phẩm (bạn chọn ${item.quantity})`,
            severity: product.stock === 0 ? 'ERROR' : 'WARNING',
            suggestedQuantity: product.stock
          });
          continue;
        }
        
        // Check for price changes
        if (product.price !== item.price) {
          validationResults.push({
            item: item,
            status: 'PRICE_CHANGED',
            available: product.stock,
            requested: item.quantity,
            message: `Giá ${item.name} đã thay đổi từ ${item.price.toLocaleString()}đ thành ${product.price.toLocaleString()}đ`,
            severity: 'INFO',
            oldPrice: item.price,
            newPrice: product.price
          });
          continue;
        }
        
        // All checks passed
        validationResults.push({
          item: item,
          status: 'VALID',
          available: product.stock,
          requested: item.quantity,
          message: 'OK',
          severity: 'SUCCESS'
        });
        
      } catch (error) {
        console.error(`Error validating item ${item.product}:`, error);
        validationResults.push({
          item: item,
          status: 'VALIDATION_ERROR',
          available: 0,
          requested: item.quantity,
          message: `Lỗi kiểm tra sản phẩm ${item.name}`,
          severity: 'ERROR'
        });
      }
    }
    
    // Analyze results
    const hasErrors = validationResults.some(r => r.severity === 'ERROR');
    const hasWarnings = validationResults.some(r => r.severity === 'WARNING');
    const hasIssues = hasErrors || hasWarnings;
    
    return {
      success: !hasErrors,
      results: validationResults,
      hasIssues: hasIssues,
      summary: this.generateValidationSummary(validationResults)
    };
  }
  
  /**
   * Generate human-readable validation summary
   * @param {Array} validationResults 
   * @returns {Object} Summary with messages and recommendations
   */
  static generateValidationSummary(validationResults) {
    const errors = validationResults.filter(r => r.severity === 'ERROR');
    const warnings = validationResults.filter(r => r.severity === 'WARNING');
    const valid = validationResults.filter(r => r.severity === 'SUCCESS');
    const priceChanges = validationResults.filter(r => r.status === 'PRICE_CHANGED');
    
    let message = "";
    let recommendations = [];
    
    if (errors.length > 0) {
      message += `❌ **${errors.length} sản phẩm có vấn đề:**\n`;
      errors.forEach(error => {
        message += `• ${error.message}\n`;
        
        if (error.status === 'INSUFFICIENT_STOCK' && error.available > 0) {
          recommendations.push({
            type: 'ADJUST_QUANTITY',
            productId: error.item.product,
            productName: error.item.name,
            suggestedQuantity: error.available,
            currentQuantity: error.requested
          });
        } else if (error.status === 'PRODUCT_NOT_FOUND' || error.status === 'PRODUCT_UNAVAILABLE') {
          recommendations.push({
            type: 'REMOVE_PRODUCT',
            productId: error.item.product,
            productName: error.item.name
          });
        }
      });
    }
    
    if (warnings.length > 0) {
      message += `⚠️ **${warnings.length} sản phẩm cần điều chỉnh:**\n`;
      warnings.forEach(warning => {
        message += `• ${warning.message}\n`;
        
        if (warning.status === 'INSUFFICIENT_STOCK') {
          recommendations.push({
            type: 'ADJUST_QUANTITY',
            productId: warning.item.product,
            productName: warning.item.name,
            suggestedQuantity: warning.available,
            currentQuantity: warning.requested
          });
        }
      });
    }
    
    if (priceChanges.length > 0) {
      message += `💰 **${priceChanges.length} sản phẩm có thay đổi giá:**\n`;
      priceChanges.forEach(change => {
        message += `• ${change.message}\n`;
      });
    }
    
    if (valid.length > 0) {
      message += `✅ **${valid.length} sản phẩm sẵn sàng đặt hàng**\n`;
    }
    
    return {
      message: message.trim(),
      recommendations: recommendations,
      counts: {
        total: validationResults.length,
        valid: valid.length,
        errors: errors.length,
        warnings: warnings.length,
        priceChanges: priceChanges.length
      }
    };
  }
  
  /**
   * Quick check if all items are valid for ordering
   * @param {Array} cartItems 
   * @returns {Boolean} True if all items can be ordered
   */
  static async quickValidate(cartItems) {
    const validation = await this.validateCartInventory(cartItems);
    return validation.success && !validation.hasIssues;
  }
  
  /**
   * Get alternative products for out-of-stock items
   * @param {Object} item - Cart item that's out of stock
   * @returns {Array} Alternative products
   */
  static async getAlternativeProducts(item) {
    try {
      const originalProduct = await Product.findById(item.product);
      if (!originalProduct) return [];
      
      // Find similar products in same category with similar price range
      const alternatives = await Product.find({
        _id: { $ne: item.product },
        category: originalProduct.category,
        price: {
          $gte: originalProduct.price * 0.8,
          $lte: originalProduct.price * 1.2
        },
        stock: { $gt: 0 },
        isActive: true,
        isDeleted: { $ne: true }
      })
      .limit(3)
      .sort({ sold: -1 }); // Sort by popularity
      
      return alternatives.map(alt => ({
        _id: alt._id,
        name: alt.name,
        price: alt.price,
        stock: alt.stock,
        image: alt.images?.[0],
        similarity: this.calculateSimilarity(originalProduct, alt)
      }));
      
    } catch (error) {
      console.error('Error finding alternative products:', error);
      return [];
    }
  }
  
  /**
   * Calculate similarity score between two products
   * @param {Object} original 
   * @param {Object} alternative 
   * @returns {Number} Similarity score (0-1)
   */
  static calculateSimilarity(original, alternative) {
    let score = 0;
    
    // Price similarity (40% weight)
    const priceDiff = Math.abs(original.price - alternative.price) / original.price;
    score += (1 - Math.min(priceDiff, 1)) * 0.4;
    
    // Brand similarity (30% weight)
    if (original.brand === alternative.brand) {
      score += 0.3;
    }
    
    // Category similarity (20% weight) - already filtered
    score += 0.2;
    
    // Name similarity (10% weight)
    const nameWords = original.name.toLowerCase().split(' ');
    const altNameWords = alternative.name.toLowerCase().split(' ');
    const commonWords = nameWords.filter(word => 
      altNameWords.some(altWord => altWord.includes(word) || word.includes(altWord))
    );
    score += (commonWords.length / nameWords.length) * 0.1;
    
    return Math.round(score * 100) / 100;
  }
}

module.exports = InventoryValidator;
