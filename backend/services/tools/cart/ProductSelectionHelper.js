/**
 * ProductSelectionHelper - Helper class for intelligent product selection
 * from search results when adding products to cart through chatbot
 */
class ProductSelectionHelper {
  
  /**
   * Analyze user intent and select the most appropriate product from search results
   * @param {string} query - Original user query
   * @param {Array} searchResults - Array of product search results with metadata
   * @param {Object} options - Selection options
   * @returns {Object} Selection result with product and confidence
   */
  static selectBestProduct(query, searchResults, options = {}) {
    if (!searchResults || searchResults.length === 0) {
      return {
        success: false,
        reason: "no_results",
        message: "Không có sản phẩm nào để chọn."
      };
    }

    if (searchResults.length === 1) {
      return {
        success: true,
        product: searchResults[0].metadata,
        confidence: "high",
        reason: "single_result",
        message: `Đã chọn sản phẩm duy nhất: ${searchResults[0].metadata.name}`
      };
    }

    // Analyze query intent
    const intent = this.analyzeSelectionIntent(query);
    
    // Apply selection strategy based on intent
    let selectedProduct = null;
    let confidence = "medium";
    let reason = "default";

    switch (intent.type) {
      case "price_based":
        const priceSelection = this.selectByPrice(searchResults, intent.pricePreference);
        selectedProduct = priceSelection.product;
        confidence = priceSelection.confidence;
        reason = `price_${intent.pricePreference}`;
        break;

      case "quality_based":
        const qualitySelection = this.selectByQuality(searchResults);
        selectedProduct = qualitySelection.product;
        confidence = qualitySelection.confidence;
        reason = "quality_focused";
        break;

      case "brand_specific":
        const brandSelection = this.selectByBrand(searchResults, intent.brand);
        selectedProduct = brandSelection.product;
        confidence = brandSelection.confidence;
        reason = `brand_${intent.brand}`;
        break;

      case "feature_specific":
        const featureSelection = this.selectByFeatures(searchResults, intent.features);
        selectedProduct = featureSelection.product;
        confidence = featureSelection.confidence;
        reason = "feature_match";
        break;

      default:
        // Default: select top-rated or first result
        const defaultSelection = this.selectDefault(searchResults);
        selectedProduct = defaultSelection.product;
        confidence = defaultSelection.confidence;
        reason = "top_result";
        break;
    }

    if (!selectedProduct) {
      return {
        success: false,
        reason: "selection_failed",
        message: "Không thể tự động chọn sản phẩm. Vui lòng chỉ định cụ thể sản phẩm nào."
      };
    }

    return {
      success: true,
      product: selectedProduct,
      confidence,
      reason,
      message: `Đã chọn: ${selectedProduct.name} (${reason.replace('_', ' ')})`
    };
  }

  /**
   * Analyze user query to understand selection intent
   * @param {string} query - User query
   * @returns {Object} Intent analysis result
   */
  static analyzeSelectionIntent(query) {
    const lowerQuery = query.toLowerCase();

    // Price-based intent
    const priceKeywords = {
      cheapest: ['rẻ nhất', 'giá rẻ', 'giá thấp', 'tiết kiệm', 'cheapest', 'lowest price'],
      expensive: ['đắt nhất', 'cao cấp', 'premium', 'high-end', 'expensive', 'highest price'],
      best_value: ['tốt nhất', 'đáng mua nhất', 'best', 'worth', 'value']
    };

    for (const [preference, keywords] of Object.entries(priceKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return {
          type: "price_based",
          pricePreference: preference
        };
      }
    }

    // Quality-based intent
    const qualityKeywords = ['chất lượng cao', 'tốt nhất', 'đánh giá cao', 'top rated', 'best quality'];
    if (qualityKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        type: "quality_based"
      };
    }

    // Brand-specific intent
    const brandPatterns = [
      /\b(logitech|razer|corsair|steelseries|asus|msi|hp|dell|lenovo|acer|apple|samsung)\b/i
    ];
    
    for (const pattern of brandPatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        return {
          type: "brand_specific",
          brand: match[1].toLowerCase()
        };
      }
    }

    // Feature-specific intent
    const featureKeywords = ['rgb', 'wireless', 'không dây', 'mechanical', 'cơ', 'gaming', 'office'];
    const foundFeatures = featureKeywords.filter(feature => lowerQuery.includes(feature));
    
    if (foundFeatures.length > 0) {
      return {
        type: "feature_specific",
        features: foundFeatures
      };
    }

    return {
      type: "default"
    };
  }

  /**
   * Select product based on price preference
   * @param {Array} results - Search results
   * @param {string} preference - Price preference (cheapest, expensive, best_value)
   * @returns {Object} Selection result
   */
  static selectByPrice(results, preference) {
    const productsWithPrice = results.map(result => ({
      ...result,
      effectivePrice: result.metadata.discountPrice || result.metadata.price
    }));

    let selectedProduct = null;
    let confidence = "high";

    switch (preference) {
      case "cheapest":
        selectedProduct = productsWithPrice.sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
        break;
        
      case "expensive":
        selectedProduct = productsWithPrice.sort((a, b) => b.effectivePrice - a.effectivePrice)[0];
        break;
        
      case "best_value":
        // Select based on price-to-rating ratio
        const withRating = productsWithPrice.filter(p => p.metadata.averageRating > 0);
        if (withRating.length > 0) {
          selectedProduct = withRating.sort((a, b) => {
            const aValue = a.metadata.averageRating / (a.effectivePrice / 1000000); // Normalize price
            const bValue = b.metadata.averageRating / (b.effectivePrice / 1000000);
            return bValue - aValue;
          })[0];
        } else {
          selectedProduct = productsWithPrice[0]; // Fallback to first
          confidence = "medium";
        }
        break;
    }

    return {
      product: selectedProduct?.metadata || null,
      confidence
    };
  }

  /**
   * Select product based on quality metrics
   * @param {Array} results - Search results
   * @returns {Object} Selection result
   */
  static selectByQuality(results) {
    // Sort by rating, then by number of reviews
    const sortedByQuality = results.sort((a, b) => {
      const aRating = a.metadata.averageRating || 0;
      const bRating = b.metadata.averageRating || 0;
      
      if (aRating !== bRating) {
        return bRating - aRating;
      }
      
      const aReviews = a.metadata.numReviews || 0;
      const bReviews = b.metadata.numReviews || 0;
      return bReviews - aReviews;
    });

    return {
      product: sortedByQuality[0]?.metadata || null,
      confidence: "high"
    };
  }

  /**
   * Select product based on brand preference
   * @param {Array} results - Search results
   * @param {string} brand - Preferred brand
   * @returns {Object} Selection result
   */
  static selectByBrand(results, brand) {
    const brandProducts = results.filter(result => 
      result.metadata.brand?.toLowerCase().includes(brand.toLowerCase())
    );

    if (brandProducts.length > 0) {
      // Among brand products, select the highest rated
      const bestBrandProduct = this.selectByQuality(brandProducts);
      return {
        product: bestBrandProduct.product,
        confidence: "high"
      };
    }

    // Fallback to general selection
    return {
      product: results[0]?.metadata || null,
      confidence: "low"
    };
  }

  /**
   * Select product based on specific features
   * @param {Array} results - Search results
   * @param {Array} features - Desired features
   * @returns {Object} Selection result
   */
  static selectByFeatures(results, features) {
    const scoredProducts = results.map(result => {
      let score = 0;
      const productText = (result.metadata.features?.join(' ') + ' ' + result.metadata.description).toLowerCase();
      
      features.forEach(feature => {
        if (productText.includes(feature.toLowerCase())) {
          score += 1;
        }
      });

      return {
        ...result,
        featureScore: score
      };
    });

    // Sort by feature score, then by rating
    const sortedByFeatures = scoredProducts.sort((a, b) => {
      if (a.featureScore !== b.featureScore) {
        return b.featureScore - a.featureScore;
      }
      return (b.metadata.averageRating || 0) - (a.metadata.averageRating || 0);
    });

    const topProduct = sortedByFeatures[0];
    const confidence = topProduct.featureScore > 0 ? "high" : "medium";

    return {
      product: topProduct?.metadata || null,
      confidence
    };
  }

  /**
   * Default selection strategy
   * @param {Array} results - Search results
   * @returns {Object} Selection result
   */
  static selectDefault(results) {
    // Select first product (assuming search results are already ranked)
    return {
      product: results[0]?.metadata || null,
      confidence: "medium"
    };
  }

  /**
   * Generate clarification message when automatic selection is not confident
   * @param {Array} results - Search results
   * @param {number} topCount - Number of top products to show
   * @returns {string} Clarification message
   */
  static generateClarificationMessage(results, topCount = 3) {
    const topProducts = results.slice(0, topCount);
    
    const productList = topProducts.map((result, index) => {
      const product = result.metadata;
      const price = product.discountPrice || product.price;
      return `${index + 1}. **${product.name}** - ${product.brand}
   💰 Giá: ${price.toLocaleString('vi-VN')}đ
   ⭐ Đánh giá: ${product.averageRating || 'N/A'}/5 (${product.numReviews || 0} đánh giá)`;
    }).join('\n\n');

    return `🤔 Tôi tìm thấy ${results.length} sản phẩm phù hợp. Bạn muốn chọn sản phẩm nào?

${productList}

💡 Bạn có thể nói "chọn số 1", "thêm sản phẩm thứ 2", hoặc chỉ định tên cụ thể.`;
  }
}

module.exports = ProductSelectionHelper;
