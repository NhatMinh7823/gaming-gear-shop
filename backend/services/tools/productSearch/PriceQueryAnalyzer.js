class PriceQueryAnalyzer {
  /**
   * Detect price-based query intent (highest, lowest, cheapest, etc.)
   */
  static detectPriceIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    // Price sorting intentions
    const priceIntents = {
      highest: [
        'giá cao nhất', 'đắt nhất', 'cao nhất', 'mắc nhất', 'price highest', 'most expensive',
        'giá cao', 'đắt', 'mắc', 'cao cấp', 'premium', 'high-end', 'luxury'
      ],
      lowest: [
        'giá rẻ nhất', 'rẻ nhất', 'thấp nhất', 'giá thấp nhất', 'price lowest', 'cheapest',
        'giá rẻ', 'rẻ', 'thấp', 'budget', 'affordable', 'entry-level', 'giá tốt'
      ],
      ascending: [
        'từ rẻ đến đắt', 'từ thấp đến cao', 'tăng dần', 'low to high', 'ascending price'
      ],
      descending: [
        'từ đắt đến rẻ', 'từ cao đến thấp', 'giảm dần', 'high to low', 'descending price'
      ]
    };
    
    for (const [intent, keywords] of Object.entries(priceIntents)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        console.log(`💰 Price intent detected: ${intent} for query "${query}"`);
        return intent;
      }
    }
    
    return null;
  }
  
  /**
   * Detect quantity-based queries (top 5, first 10, etc.)
   */
  static detectQuantityIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    // Quantity patterns
    const quantityPatterns = [
      /top\s*(\d+)/g,           // "top 5"
      /(\d+)\s*sản phẩm/g,      // "5 sản phẩm"
      /(\d+)\s*cái/g,           // "5 cái"
      /(\d+)\s*chiếc/g,         // "5 chiếc"
      /đầu\s*(\d+)/g,           // "đầu 5"
      /first\s*(\d+)/g,         // "first 5"
      /limit\s*(\d+)/g,         // "limit 5"
    ];
    
    for (const pattern of quantityPatterns) {
      const matches = [...lowerQuery.matchAll(pattern)];
      if (matches.length > 0) {
        const quantity = parseInt(matches[0][1]);
        console.log(`🔢 Quantity intent detected: ${quantity} for query "${query}"`);
        return quantity;
      }
    }
    
    return null;
  }
  
  /**
   * Detect comparison queries
   */
  static detectComparisonIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    const comparisonKeywords = [
      'so sánh', 'compare', 'khác nhau', 'difference', 'vs', 'versus',
      'nào tốt hơn', 'which is better', 'recommend', 'gợi ý', 'tư vấn'
    ];
    
    const hasComparison = comparisonKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (hasComparison) {
      console.log(`⚖️ Comparison intent detected for query "${query}"`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Detect budget-related queries
   */
  static detectBudgetIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    const budgetKeywords = [
      'trong tầm', 'budget', 'tiết kiệm', 'save money', 'affordable',
      'không quá', 'dưới', 'under', 'below', 'max', 'tối đa'
    ];
    
    const hasBudget = budgetKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (hasBudget) {
      console.log(`💸 Budget intent detected for query "${query}"`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Comprehensive query analysis
   */
  static analyzeQuery(query) {
    return {
      priceIntent: this.detectPriceIntent(query),
      quantityIntent: this.detectQuantityIntent(query),
      comparisonIntent: this.detectComparisonIntent(query),
      budgetIntent: this.detectBudgetIntent(query),
      originalQuery: query
    };
  }
}

module.exports = PriceQueryAnalyzer;