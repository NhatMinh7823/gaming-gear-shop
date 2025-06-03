const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const VectorStoreManager = require("../chatbot/VectorStoreManager");
const { formatProductFromMetadata } = require("../config/utils");
const Product = require("../../models/productModel");

class ProductSearchTool extends StructuredTool {
  schema = z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().default(5).describe("Số lượng kết quả tối đa"),
  });

  name = "product_search";
  description =
    "Tìm kiếm sản phẩm theo tên, mô tả, thương hiệu, thông số, tính năng, hoặc từ khóa liên quan. Hỗ trợ tìm kiếm thông minh với nhiều chiến lược khác nhau.";

  /**
   * Analyze query to detect intended category
   */
  detectCategory(query) {
    const lowerQuery = query.toLowerCase();
    
    // Category mapping with more comprehensive keywords
    const categoryMap = {
      "Mice": ["chuột", "mouse", "chuột gaming", "gaming mouse", "chuot"],
      "Keyboards": ["bàn phím", "keyboard", "bàn phím cơ", "mechanical keyboard", "bàn phím gaming", "ban phim"],
      "Monitors": ["màn hình", "monitor", "màn hình gaming", "gaming monitor", "display", "man hinh"],
      "Headsets": ["tai nghe", "headset", "tai nghe gaming", "gaming headset"],
      "Gaming Laptops": ["laptop", "laptop gaming", "gaming laptop", "máy tính xách tay"],
      "Gaming PCs": ["máy tính", "pc", "case", "vỏ máy tính", "gaming pc", "may tinh"]
    };
    
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return category;
      }
    }
    
    return null;
  }

  /**
   * Category-first search: Search within specific category using direct database filtering
   */
  async categoryFirstSearch(query, detectedCategory, limit) {
    try {
      console.log(`🎯 Category-first search for "${query}" in category "${detectedCategory}"`);
      
      // Get all products from the detected category
      const categoryProducts = await Product.find()
        .populate("category", "name")
        .where("category")
        .in(await this.getCategoryIds(detectedCategory));
      
      console.log(`📦 Found ${categoryProducts.length} products in category "${detectedCategory}"`);
      
      if (categoryProducts.length === 0) {
        return [];
      }
      
      // Simple text-based scoring for category products
      const lowerQuery = query.toLowerCase();
      const scoredProducts = categoryProducts.map(product => {
        let score = 0;
        
        // Name match (highest priority)
        if (product.name.toLowerCase().includes(lowerQuery)) {
          score += 100;
        }
        
        // Brand match
        const extractedBrand = this.extractBrand(query);
        if (extractedBrand && product.brand?.toLowerCase().includes(extractedBrand)) {
          score += 50;
        }
        
        // Description match
        if (product.description?.toLowerCase().includes(lowerQuery)) {
          score += 30;
        }
        
        // Features match
        if (product.features?.some(f => f.toLowerCase().includes(lowerQuery))) {
          score += 20;
        }
        
        // Gaming bonus
        if (lowerQuery.includes('gaming') && product.name.toLowerCase().includes('gaming')) {
          score += 25;
        }
        
        // Category-specific bonuses
        if (detectedCategory === "Mice") {
          if (lowerQuery.includes('mouse') || lowerQuery.includes('chuột')) {
            score += 30;
          }
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
          score
        };
      });
      
      // Sort by score and return top results (remove duplicates by ID)
      const uniqueProducts = scoredProducts.reduce((acc, current) => {
        const existing = acc.find(item => item.metadata.id === current.metadata.id);
        if (!existing || current.score > existing.score) {
          return [...acc.filter(item => item.metadata.id !== current.metadata.id), current];
        }
        return acc;
      }, []);
      
      const results = uniqueProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      console.log(`✅ Category-first search returned ${results.length} unique results:`);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.metadata.name} (${result.metadata.brand}) - Score: ${result.score}`);
      });
      
      return results;
      
    } catch (error) {
      console.error("❌ Error in category-first search:", error);
      return [];
    }
  }

  /**
   * Get category IDs by name
   */
  async getCategoryIds(categoryName) {
    const Category = require("../../models/categoryModel");
    const categories = await Category.find({ 
      name: new RegExp(categoryName, 'i') 
    });
    return categories.map(cat => cat._id);
  }

  /**
   * Extract brand name from query
   */
  extractBrand(query) {
    const lowerQuery = query.toLowerCase();
    const brands = ['asus', 'msi', 'acer', 'lg', 'samsung', 'dell', 'hp', 'razer', 'logitech', 'corsair', 'steelseries', 'benq', 'nzxt'];
    
    for (const brand of brands) {
      if (lowerQuery.includes(brand)) {
        return brand;
      }
    }
    
    return null;
  }

  async _call(input) {
    try {
      const query = input.query || "";
      const limit = input.limit || 5;
      
      console.log(`🔍 ProductSearchTool called with query: "${query}", limit: ${limit}`);
      
      // Analyze query
      const detectedCategory = this.detectCategory(query);
      const extractedBrand = this.extractBrand(query);
      
      console.log(`📊 Query analysis - Category: ${detectedCategory}, Brand: ${extractedBrand}`);
      
      let results = [];
      let searchStrategy = "general";
      
      // Strategy 1: Category-first search if category is detected
      if (detectedCategory) {
        console.log(`🎯 Using category-first search for "${detectedCategory}"`);
        results = await this.categoryFirstSearch(query, detectedCategory, limit);
        searchStrategy = `category-first-${detectedCategory}`;
      }
      
      // Strategy 2: Fallback to general search if category search fails
      if (results.length === 0) {
        console.log(`🔄 Falling back to general vector search...`);
        const vectorStoreManager = VectorStoreManager.getInstance();
        const vectorResults = await vectorStoreManager.similaritySearch(query, limit);
        
        // Convert vector results to our format
        results = vectorResults.map(result => ({
          metadata: result.metadata,
          score: 0 // Vector search doesn't provide scores
        }));
        
        searchStrategy = "general-fallback";
      }
      
      // Handle no results
      if (results.length === 0) {
        console.log(`❌ No results found for "${query}"`);
        
        return `❌ Không tìm thấy sản phẩm phù hợp với "${query}".

💡 **Gợi ý tìm kiếm:**
${detectedCategory ? `- Danh mục được phát hiện: "${detectedCategory}"` : ""}
${extractedBrand ? `- Thương hiệu được phát hiện: "${extractedBrand.toUpperCase()}"` : ""}
- Kiểm tra chính tả từ khóa
- Sử dụng từ khóa đơn giản hơn
- Tìm theo danh mục: "chuột gaming", "bàn phím cơ", "màn hình gaming"`;
      }
      
      // Format and return results
      const productList = results
        .map((result) => formatProductFromMetadata(result.metadata))
        .join("\n\n");
      
      console.log(`✅ Returning ${results.length} results (strategy: ${searchStrategy})`);
      
      const resultMessage = `🔍 **Tìm thấy ${results.length} sản phẩm phù hợp cho "${query}":**
${detectedCategory ? `\n🎯 **Danh mục:** ${detectedCategory}` : ""}
${extractedBrand ? `\n🏷️ **Thương hiệu:** ${extractedBrand.toUpperCase()}` : ""}
${searchStrategy.includes('category-first') ? `\n✨ **Tìm kiếm trong danh mục cụ thể**` : ""}

${productList}

💡 **Cần thêm thông tin?**
- Hỏi chi tiết về sản phẩm cụ thể
- So sánh giữa các sản phẩm  
- Tư vấn lựa chọn phù hợp
- Xem thông số kỹ thuật chi tiết`;

      return resultMessage;
    } catch (error) {
      console.error("❌ Error in ProductSearchTool:", error);
      return `❌ Lỗi khi tìm kiếm sản phẩm: ${error.message}

💡 **Vui lòng thử:**
- Kiểm tra kết nối internet
- Thử lại với từ khóa khác
- Liên hệ hỗ trợ kỹ thuật nếu lỗi tiếp tục`;
    }
  }
}

module.exports = ProductSearchTool;
