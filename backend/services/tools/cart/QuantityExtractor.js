/**
 * QuantityExtractor - Utility class for extracting product quantities from natural language queries
 * Supports both Vietnamese and English with various quantity expressions
 */
class QuantityExtractor {
  
  /**
   * Extract quantity from user query
   * @param {string} query - User query containing quantity information
   * @returns {Object} Extraction result with quantity and confidence
   */
  static extractQuantity(query) {
    if (!query || typeof query !== 'string') {
      return {
        quantity: 1,
        confidence: 'low',
        reason: 'no_query',
        extractedText: null
      };
    }

    const lowerQuery = query.toLowerCase().trim();
    
    // Try different extraction methods in order of confidence
    const methods = [
      this.extractExplicitNumbers,
      this.extractVietnameseQuantifiers,
      this.extractDescriptiveQuantities,
      this.extractContextualQuantities
    ];

    for (const method of methods) {
      const result = method.call(this, lowerQuery);
      if (result.confidence !== 'none') {
        return result;
      }
    }

    // Default fallback
    return {
      quantity: 1,
      confidence: 'default',
      reason: 'fallback',
      extractedText: null
    };
  }

  /**
   * Extract explicit numbers from query
   * @param {string} query - Lowercase query
   * @returns {Object} Extraction result
   */
  static extractExplicitNumbers(query) {
    // Pattern for explicit numbers with Vietnamese and English contexts
    const patterns = [
      // Vietnamese patterns
      /(?:mua|thêm|cần|lấy|đặt|order)\s+(\d+)\s*(?:cái|chiếc|sản phẩm|sp|món|thứ|cục)/i,
      /(\d+)\s*(?:cái|chiếc|sản phẩm|sp|món|thứ|cục)/i,
      /số lượng\s*(?:là|:)?\s*(\d+)/i,
      /quantity\s*(?:is|:)?\s*(\d+)/i,
      
      // English patterns
      /(?:buy|add|get|order|purchase)\s+(\d+)\s*(?:pieces?|items?|units?|pcs?)/i,
      /(\d+)\s*(?:pieces?|items?|units?|pcs?)/i,
      
      // General numeric patterns
      /\b(\d+)\s*(?:cái|chiếc|pieces?|items?)\b/i,
      /\b(\d+)\s+(?:của|of)\b/i,
      
      // Range patterns - take the lower number for safety
      /(\d+)\s*(?:-|đến|to)\s*\d+/i
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        const quantity = parseInt(match[1]);
        if (quantity > 0 && quantity <= 1000) { // Reasonable limits
          return {
            quantity: quantity,
            confidence: 'high',
            reason: 'explicit_number',
            extractedText: match[0]
          };
        }
      }
    }

    return { confidence: 'none' };
  }

  /**
   * Extract Vietnamese-specific quantity expressions
   * @param {string} query - Lowercase query
   * @returns {Object} Extraction result
   */
  static extractVietnameseQuantifiers(query) {
    const quantifiers = {
      // Specific quantities
      'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5,
      'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10,
      'mười một': 11, 'mười hai': 12, 'hai mươi': 20,
      
      // Pair/double expressions
      'đôi': 2, 'cặp': 2, 'đối': 2,
      
      // Small quantities
      'vài': 3, 'một vài': 3, 'ít': 2, 'chút': 1,
      
      // Medium quantities  
      'nhiều': 5, 'khá nhiều': 7, 'tương đối nhiều': 6,
      
      // Large quantities
      'rất nhiều': 10, 'cả đống': 15, 'hàng loạt': 20,
      'bán buôn': 50, 'sỉ': 30, 'lẻ': 1,
      
      // Team/group contexts
      'cho team': 6, 'cho nhóm': 5, 'cho công ty': 20,
      'cho gia đình': 4, 'cho bạn bè': 8,
      
      // Purpose-based
      'dự phòng': 2, 'backup': 2, 'thử': 1, 'test': 1,
      'demo': 1, 'mẫu': 1, 'sample': 1
    };

    // Try to find quantity expressions
    for (const [expression, quantity] of Object.entries(quantifiers)) {
      if (query.includes(expression)) {
        const confidence = this.getVietnameseConfidence(expression);
        return {
          quantity: quantity,
          confidence: confidence,
          reason: 'vietnamese_quantifier',
          extractedText: expression
        };
      }
    }

    return { confidence: 'none' };
  }

  /**
   * Extract descriptive quantities in English
   * @param {string} query - Lowercase query
   * @returns {Object} Extraction result
   */
  static extractDescriptiveQuantities(query) {
    const descriptiveQuantities = {
      // Small quantities
      'a few': 3, 'few': 3, 'couple': 2, 'some': 3,
      'a little': 1, 'little': 1, 'single': 1, 'one': 1,
      
      // Medium quantities
      'several': 5, 'many': 7, 'multiple': 4,
      'quite a few': 6, 'bunch': 8,
      
      // Large quantities
      'lots': 10, 'lots of': 10, 'many': 8, 'plenty': 12,
      'bulk': 20, 'wholesale': 50, 'retail': 1,
      
      // Specific contexts
      'for team': 6, 'for group': 5, 'for company': 15,
      'for family': 4, 'for friends': 6,
      
      // Purpose-based
      'backup': 2, 'spare': 2, 'trial': 1, 'sample': 1,
      'demo': 1, 'test': 1
    };

    for (const [expression, quantity] of Object.entries(descriptiveQuantities)) {
      if (query.includes(expression)) {
        return {
          quantity: quantity,
          confidence: 'medium',
          reason: 'descriptive_quantity',
          extractedText: expression
        };
      }
    }

    return { confidence: 'none' };
  }

  /**
   * Extract quantities based on context clues
   * @param {string} query - Lowercase query
   * @returns {Object} Extraction result
   */
  static extractContextualQuantities(query) {
    const contextPatterns = [
      // Business contexts
      { pattern: /(?:cho|for)\s+(?:văn phòng|office)/i, quantity: 10, reason: 'office_context' },
      { pattern: /(?:cho|for)\s+(?:công ty|company)/i, quantity: 15, reason: 'company_context' },
      { pattern: /(?:setup|thiết lập)\s+(?:gaming|game)/i, quantity: 1, reason: 'gaming_setup' },
      
      // Personal contexts
      { pattern: /(?:cho|for)\s+(?:tôi|mình|em|anh|chị)/i, quantity: 1, reason: 'personal_use' },
      { pattern: /(?:thay thế|replace|thế|đổi)/i, quantity: 1, reason: 'replacement' },
      
      // Quantity indicators
      { pattern: /(?:tất cả|all|toàn bộ)/i, quantity: 5, reason: 'comprehensive' },
      { pattern: /(?:mỗi|each|từng)/i, quantity: 1, reason: 'individual' },
      
      // Shopping patterns
      { pattern: /(?:shopping|mua sắm|order|đặt hàng)/i, quantity: 2, reason: 'shopping_intent' },
      { pattern: /(?:khuyến mãi|sale|promotion|giảm giá)/i, quantity: 3, reason: 'promotion_buying' }
    ];

    for (const { pattern, quantity, reason } of contextPatterns) {
      if (pattern.test(query)) {
        return {
          quantity: quantity,
          confidence: 'low',
          reason: reason,
          extractedText: query.match(pattern)?.[0] || null
        };
      }
    }

    return { confidence: 'none' };
  }

  /**
   * Determine confidence level for Vietnamese quantifiers
   * @param {string} expression - The extracted expression
   * @returns {string} Confidence level
   */
  static getVietnameseConfidence(expression) {
    const highConfidence = ['đôi', 'cặp', 'một', 'hai', 'ba', 'bốn', 'năm'];
    const mediumConfidence = ['vài', 'ít', 'nhiều', 'cho team', 'dự phòng'];
    
    if (highConfidence.includes(expression)) return 'high';
    if (mediumConfidence.includes(expression)) return 'medium';
    return 'low';
  }

  /**
   * Validate extracted quantity against business rules
   * @param {number} quantity - Extracted quantity
   * @param {Object} context - Additional context for validation
   * @returns {Object} Validation result
   */
  static validateQuantity(quantity, context = {}) {
    const { maxStock = 1000, productType = 'general' } = context;
    
    // Basic range validation
    if (quantity < 1) {
      return {
        isValid: false,
        adjustedQuantity: 1,
        reason: 'minimum_quantity'
      };
    }

    if (quantity > maxStock) {
      return {
        isValid: false,
        adjustedQuantity: Math.min(maxStock, 10), // Cap at 10 or maxStock
        reason: 'exceeds_stock'
      };
    }

    // Business logic validation
    if (quantity > 100) {
      return {
        isValid: false,
        adjustedQuantity: 10,
        reason: 'unreasonably_high',
        suggestion: 'Bạn có chắc muốn mua số lượng lớn như vậy không?'
      };
    }

    return {
      isValid: true,
      adjustedQuantity: quantity,
      reason: 'valid'
    };
  }

  /**
   * Generate user-friendly explanation of quantity extraction
   * @param {Object} result - Extraction result
   * @returns {string} User-friendly explanation
   */
  static explainExtraction(result) {
    const { quantity, confidence, reason, extractedText } = result;
    
    const explanations = {
      'explicit_number': `Đã nhận diện số lượng ${quantity} từ "${extractedText}"`,
      'vietnamese_quantifier': `Hiểu "${extractedText}" là ${quantity} sản phẩm`,
      'descriptive_quantity': `Diễn giải "${extractedText}" thành ${quantity} sản phẩm`,
      'office_context': `Đề xuất ${quantity} sản phẩm cho văn phòng`,
      'personal_use': `Mặc định ${quantity} sản phẩm cho sử dụng cá nhân`,
      'fallback': `Sử dụng số lượng mặc định ${quantity}`,
      'default': `Số lượng mặc định ${quantity}`
    };

    return explanations[reason] || `Số lượng: ${quantity}`;
  }

  /**
   * Test the quantity extraction with sample queries
   * @returns {Array} Test results
   */
  static runTests() {
    const testCases = [
      'Mua 3 chuột gaming',
      'Thêm 5 sản phẩm vào giỏ',
      'Mua đôi tai nghe',
      'Tôi cần vài cái',
      'Order nhiều laptop',
      'Buy 2 pieces',
      'Mua cho team',
      'Thêm dự phòng',
      'Get some items',
      'Mua hàng loạt'
    ];

    return testCases.map(query => {
      const result = this.extractQuantity(query);
      return {
        query,
        result,
        explanation: this.explainExtraction(result)
      };
    });
  }
}

module.exports = QuantityExtractor;
