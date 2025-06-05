const Product = require("../../../models/productModel");
const CategoryDetector = require("./CategoryDetector");
const BrandExtractor = require("./BrandExtractor");
const { formatProductFromMetadata } = require("../../config/utils");

class PriceSortingStrategy {
  /**
   * Search products with price-based sorting
   */
  static async priceBasedSearch(query, priceIntent, quantity = 5, detectedCategory = null) {
    try {
      console.log(`💰 Price-based search: ${priceIntent}, quantity: ${quantity}, category: ${detectedCategory}`);
      
      // Build query conditions
      let queryConditions = {};
      
      // Add category filter if detected
      if (detectedCategory) {
        const categoryIds = await CategoryDetector.getCategoryIds(detectedCategory);
        if (categoryIds.length > 0) {
          queryConditions.category = { $in: categoryIds };
        }
      }
      
      // Add brand filter if detected
      const extractedBrand = BrandExtractor.extractBrand(query);
      if (extractedBrand) {
        queryConditions.brand = new RegExp(extractedBrand, 'i');
      }
      
      // Add text search if there are other keywords
      const searchKeywords = this.extractSearchKeywords(query);
      if (searchKeywords.length > 0) {
        queryConditions.$or = [
          { name: { $regex: searchKeywords.join('|'), $options: 'i' } },
          { description: { $regex: searchKeywords.join('|'), $options: 'i' } }
        ];
      }
      
      // Determine sort order based on price intent
      let sortOrder = {};
      switch (priceIntent) {
        case 'highest':
          sortOrder = { price: -1, averageRating: -1 }; // Highest price first, then rating
          break;
        case 'lowest':
          sortOrder = { price: 1, averageRating: -1 }; // Lowest price first, then rating
          break;
        case 'descending':
          sortOrder = { price: -1, averageRating: -1 };
          break;
        case 'ascending':
          sortOrder = { price: 1, averageRating: -1 };
          break;
        default:
          sortOrder = { averageRating: -1, price: 1 }; // Default: best rating first
      }
      
      console.log(`🔍 Query conditions:`, queryConditions);
      console.log(`📊 Sort order:`, sortOrder);
      
      // Execute database query
      const products = await Product.find(queryConditions)
        .populate("category", "name")
        .sort(sortOrder)
        .limit(quantity * 2) // Get more to have fallbacks
        .lean(); // For better performance
      
      console.log(`📦 Found ${products.length} products`);
      
      if (products.length === 0) {
        return [];
      }
      
      // Convert to standard format and add price-based scoring
      const results = products.slice(0, quantity).map((product, index) => {
        let score = 100 - index; // Position-based score
        
        // Add quality bonuses
        if (product.averageRating >= 4.5) score += 20;
        if (product.isFeatured) score += 15;
        if (product.stock > 0) score += 10;
        if (product.sold > 50) score += 10;
        
        // Add discount bonus for lowest price searches
        if (priceIntent === 'lowest' && product.discountPrice) {
          const discountPercent = ((product.price - product.discountPrice) / product.price) * 100;
          score += Math.min(discountPercent, 30); // Up to 30 bonus points for discount
        }
        
        return {
          metadata: {
            id: product._id.toString(),
            name: product.name,
            price: product.price,
            discountPrice: product.discountPrice || null,
            category: product.category?.name || "N/A",
            brand: product.brand || "N/A",
            inStock: product.stock > 0,
            specifications: product.specifications || {},
            features: product.features || [],
            averageRating: product.averageRating || 0,
            numReviews: product.numReviews || 0,
            isFeatured: product.isFeatured || false,
            isNewArrival: product.isNewArrival || false,
            imageUrl: product.images?.[0]?.url || "",
          },
          score,
          priceRank: index + 1
        };
      });
      
      console.log(`✅ Price-based search returned ${results.length} results:`);
      results.forEach((result, index) => {
        const effectivePrice = result.metadata.discountPrice || result.metadata.price;
        console.log(`  ${index + 1}. ${result.metadata.name} - ${effectivePrice.toLocaleString('vi-VN')}đ (Score: ${result.score})`);
      });
      
      return results;
      
    } catch (error) {
      console.error("❌ Error in price-based search:", error);
      return [];
    }
  }
  
  /**
   * Extract search keywords excluding price-related terms
   */
  static extractSearchKeywords(query) {
    const lowerQuery = query.toLowerCase();
    
    // Remove price-related terms
    const priceTermsToRemove = [
      'giá cao nhất', 'đắt nhất', 'cao nhất', 'mắc nhất',
      'giá rẻ nhất', 'rẻ nhất', 'thấp nhất', 'giá thấp nhất',
      'từ rẻ đến đắt', 'từ thấp đến cao', 'từ đắt đến rẻ', 'từ cao đến thấp',
      'giá cao', 'đắt', 'mắc', 'giá rẻ', 'rẻ', 'thấp',
      'top', 'đầu', 'first', 'limit', 'sản phẩm', 'cái', 'chiếc',
      'price', 'highest', 'lowest', 'cheapest', 'expensive'
    ];
    
    let cleanedQuery = lowerQuery;
    priceTermsToRemove.forEach(term => {
      cleanedQuery = cleanedQuery.replace(new RegExp(term, 'g'), '');
    });
    
    // Remove numbers and common words
    cleanedQuery = cleanedQuery.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
    
    // Split into keywords and filter out short ones
    const keywords = cleanedQuery.split(' ')
      .filter(word => word.length > 2)
      .filter(word => !['và', 'cho', 'của', 'với', 'the', 'and', 'for', 'of', 'with'].includes(word));
    
    return keywords;
  }
  
  /**
   * Generate price-focused result message
   */
  static formatPriceBasedResults(results, priceIntent, query, detectedCategory) {
    if (results.length === 0) {
      return `❌ Không tìm thấy sản phẩm phù hợp với yêu cầu "${query}".`;
    }
    
    const prices = results.map(r => r.metadata.discountPrice || r.metadata.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    let intentDescription = '';
    switch (priceIntent) {
      case 'highest':
        intentDescription = '💎 **SẢN PHẨM GIÁ CAO NHẤT**';
        break;
      case 'lowest':
        intentDescription = '💰 **SẢN PHẨM GIÁ RẺ NHẤT**';
        break;
      case 'ascending':
        intentDescription = '📈 **SẮP XẾP GIÁ TĂNG DẦN**';
        break;
      case 'descending':
        intentDescription = '📉 **SẮP XẾP GIÁ GIẢM DẦN**';
        break;
      default:
        intentDescription = '🎯 **TÌM KIẾM THEO GIÁ**';
    }
    
    const productList = results
      .map((result, index) => {
        const effectivePrice = result.metadata.discountPrice || result.metadata.price;
        const rank = `#${index + 1}`;
        const priceTag = result.metadata.discountPrice 
          ? `💸 ${result.metadata.discountPrice.toLocaleString('vi-VN')}đ ~~${result.metadata.price.toLocaleString('vi-VN')}đ~~`
          : `💰 ${result.metadata.price.toLocaleString('vi-VN')}đ`;
        
        return `${rank} **${result.metadata.name}**
🏷️ ${result.metadata.brand} | ${result.metadata.category}
${priceTag}
⭐ ${result.metadata.averageRating}/5 (${result.metadata.numReviews} đánh giá)
${result.metadata.inStock ? '✅ Còn hàng' : '❌ Hết hàng'}`;
      })
      .join('\n\n');
    
    return `${intentDescription}
${detectedCategory ? `🎯 **Danh mục:** ${detectedCategory}` : ''}

📊 **Thống kê giá:**
• Rẻ nhất: ${minPrice.toLocaleString('vi-VN')}đ
• Đắt nhất: ${maxPrice.toLocaleString('vi-VN')}đ  
• Trung bình: ${avgPrice.toLocaleString('vi-VN')}đ

## 🏆 **${results.length} Sản Phẩm Được Sắp Xếp:**

${productList}

💡 **Gợi ý:** Các sản phẩm đã được sắp xếp theo ${priceIntent === 'highest' ? 'giá cao nhất' : priceIntent === 'lowest' ? 'giá rẻ nhất' : 'tiêu chí giá'} phù hợp với yêu cầu của bạn.`;
  }
}

module.exports = PriceSortingStrategy;