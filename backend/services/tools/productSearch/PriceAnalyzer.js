class PriceAnalyzer {
  /**
   * Extract price range from query
   */
  static extractPriceRange(query) {
    const lowerQuery = query.toLowerCase().replace(/[.,]/g, '');
    
    // Pattern matches for different price formats
    const pricePatterns = [
      // Vietnamese text format
      /(\d+)-(\d+)\s*triệu/g,           // "7-8 triệu"
      /(\d+)\s*đến\s*(\d+)\s*triệu/g,  // "7 đến 8 triệu"
      /tầm\s*(\d+)-(\d+)\s*triệu/g,    // "tầm 7-8 triệu"
      /khoảng\s*(\d+)-(\d+)\s*triệu/g, // "khoảng 7-8 triệu"
      /từ\s*(\d+)\s*đến\s*(\d+)\s*triệu/g, // "từ 7 đến 8 triệu"
      /dưới\s*(\d+)\s*triệu/g,         // "dưới 8 triệu"
      /trên\s*(\d+)\s*triệu/g,         // "trên 5 triệu"
      /tầm\s*(\d+)\s*triệu/g,          // "tầm 7 triệu"
      
      // Numeric format (what the tool actually receives)
      /(\d{7,})-(\d{6,})\s*VND/gi,     // "7000000-800000 VND"
      /(\d{7,})-(\d{7,})\s*VND/gi,     // "7000000-8000000 VND"
      /(\d{6,})\s*VND/gi,              // "7500000 VND"
      /(\d{7,})-(\d{6,})/g,            // "7000000-800000" (without VND)
      /(\d{7,})-(\d{7,})/g,            // "7000000-8000000" (without VND)
    ];
    
    for (const pattern of pricePatterns) {
      const matches = [...lowerQuery.matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[0];
        console.log(`💰 Price pattern matched: ${pattern.source} -> ${match[0]}`);
        
        // Handle Vietnamese text patterns
        if (pattern.source.includes('triệu')) {
          if (pattern.source.includes('dưới')) {
            return { min: 0, max: parseInt(match[1]) * 1000000 };
          } else if (pattern.source.includes('trên')) {
            return { min: parseInt(match[1]) * 1000000, max: Infinity };
          } else if (match[2]) {
            const result = {
              min: parseInt(match[1]) * 1000000,
              max: parseInt(match[2]) * 1000000
            };
            console.log(`💰 Extracted price range: ${result.min} - ${result.max} VND`);
            return result;
          } else {
            // Single price with some tolerance
            const price = parseInt(match[1]) * 1000000;
            const result = { min: price * 0.8, max: price * 1.2 };
            console.log(`💰 Extracted price range: ${result.min} - ${result.max} VND`);
            return result;
          }
        }
        
        // Handle numeric patterns
        else {
          if (match[2]) {
            // Range format like "7000000-800000"
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            
            // Handle cases where second number might be shortened (800000 = 8000000)
            const adjustedMax = max < 1000000 ? max * 10 : max;
            
            const result = { min: Math.min(min, adjustedMax), max: Math.max(min, adjustedMax) };
            console.log(`💰 Extracted price range: ${result.min} - ${result.max} VND`);
            return result;
          } else {
            // Single price like "7500000 VND"
            const price = parseInt(match[1]);
            const result = { min: price * 0.9, max: price * 1.1 };
            console.log(`💰 Extracted price range: ${result.min} - ${result.max} VND`);
            return result;
          }
        }
      }
    }
    
    console.log(`💰 No price range detected in query: "${query}"`);
    return null;
  }
}

module.exports = PriceAnalyzer;