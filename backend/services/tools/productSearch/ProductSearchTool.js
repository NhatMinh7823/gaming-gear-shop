const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const VectorStoreManager = require("../../chatbot/VectorStoreManager");
const { formatProductFromMetadata } = require("../../config/utils");

// Import refactored modules
const PriceAnalyzer = require("./PriceAnalyzer");
const CategoryDetector = require("./CategoryDetector");
const BrandExtractor = require("./BrandExtractor");
const SpecificationScorer = require("./SpecificationScorer");
const FeatureScorer = require("./FeatureScorer");
const TechnicalAnalyzer = require("./TechnicalAnalyzer");
const ScoreAnalyzer = require("./ScoreAnalyzer");
const SearchStrategies = require("./SearchStrategies");
const PriceQueryAnalyzer = require("./PriceQueryAnalyzer");
const PriceSortingStrategy = require("./PriceSortingStrategy");

class ProductSearchTool extends StructuredTool {
  schema = z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().default(10).describe("Số lượng kết quả tối đa"),
  });

  name = "product_search";
  description =
    "Tìm kiếm sản phẩm theo tên, mô tả, thương hiệu, thông số kỹ thuật (specifications), tính năng (features), đánh giá, hoặc từ khóa liên quan. Hỗ trợ tìm kiếm thông minh với nhiều chiến lược khác nhau và phát hiện khoảng giá tự động.";

  async _call(input) {
    try {
      const query = input.query || "";
      const limit = input.limit || 10;
      
      console.log(`🔍 ProductSearchTool called with query: "${query}", limit: ${limit}`);
      
      // Analyze query using refactored modules
      const detectedCategory = CategoryDetector.detectCategory(query);
      const extractedBrand = BrandExtractor.extractBrand(query);
      const priceRange = PriceAnalyzer.extractPriceRange(query);
      
      // NEW: Analyze price-based query intents
      const queryAnalysis = PriceQueryAnalyzer.analyzeQuery(query);
      
      console.log(`📊 Query analysis - Category: ${detectedCategory}, Brand: ${extractedBrand}, Price Range: ${priceRange ? `${priceRange.min}-${priceRange.max} VND` : 'None'}`);
      console.log(`💰 Price Intent Analysis:`, queryAnalysis);
      
      let results = [];
      let searchStrategy = "general";
      
      // NEW: Strategy 0: Price-based search if price intent is detected
      if (queryAnalysis.priceIntent) {
        const requestedQuantity = queryAnalysis.quantityIntent || limit;
        console.log(`💰 Using price-based search for intent: "${queryAnalysis.priceIntent}", quantity: ${requestedQuantity}`);
        
        results = await PriceSortingStrategy.priceBasedSearch(
          query,
          queryAnalysis.priceIntent,
          requestedQuantity,
          detectedCategory
        );
        
        searchStrategy = `price-${queryAnalysis.priceIntent}`;
        
        // Return formatted price-based results immediately
        if (results.length > 0) {
          const priceBasedMessage = PriceSortingStrategy.formatPriceBasedResults(
            results,
            queryAnalysis.priceIntent,
            query,
            detectedCategory
          );
          return priceBasedMessage;
        }
      }
      
      // Strategy 1: Category-first search if category is detected and no price results
      if (results.length === 0 && detectedCategory) {
        console.log(`🎯 Using category-first search for "${detectedCategory}"`);
        results = await SearchStrategies.categoryFirstSearch(query, detectedCategory, limit);
        searchStrategy = `category-first-${detectedCategory}`;
      }
      
      // Strategy 2: Fallback to general search if other strategies fail
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
      
      // Intelligent score gap analysis to identify top-tier products
      const topTierAnalysis = ScoreAnalyzer.analyzeScoreGaps(results);
      console.log(`🎯 Score gap analysis: ${topTierAnalysis.summary}`);
      
      // Filter to focus on top-tier products only
      const focusedResults = topTierAnalysis.topTierProducts;
      const focusedProductList = focusedResults
        .map((result) => formatProductFromMetadata(result.metadata))
        .join("\n\n");
      
      // Check if we have products in the price range
      const productsInRange = priceRange ? focusedResults.filter(result => {
        const effectivePrice = result.metadata.discountPrice || result.metadata.price;
        return effectivePrice >= priceRange.min && effectivePrice <= priceRange.max;
      }) : focusedResults;
      
      // Analyze technical specifications found
      const techAnalysis = TechnicalAnalyzer.analyzeTechnicalRequirements(query, focusedResults);

      const resultMessage = `🔍 **Phân tích từ ${results.length} sản phẩm cho "${query}":**
${detectedCategory ? `\n🎯 **Danh mục:** ${detectedCategory}` : ""}
${extractedBrand ? `\n🏷️ **Thương hiệu:** ${extractedBrand.toUpperCase()}` : ""}
${priceRange ? `\n💰 **Khoảng giá:** ${new Intl.NumberFormat("vi-VN").format(priceRange.min)} - ${priceRange.max === Infinity ? '∞' : new Intl.NumberFormat("vi-VN").format(priceRange.max)} VND` : ""}
${productsInRange.length > 0 && priceRange ? `\n✅ **Có ${productsInRange.length} sản phẩm trong tầm giá yêu cầu**` : ""}
\n📊 **Phân tích điểm số:** ${topTierAnalysis.summary}
${techAnalysis ? `\n🔧 **Đặc điểm kỹ thuật:** ${techAnalysis}` : ""}
${searchStrategy.includes('category-first') ? `\n✨ **Tìm kiếm trong danh mục cụ thể**` : ""}

## 🏆 **Top ${topTierAnalysis.focusedCount} Sản Phẩm Được Đề Xuất:**

${focusedProductList}

💡 **Lời khuyên:**
- ${topTierAnalysis.focusedCount} sản phẩm trên có độ phù hợp cao nhất với yêu cầu
- Các sản phẩm khác có điểm số thấp hơn đáng kể (${results.length - topTierAnalysis.focusedCount} sản phẩm còn lại)
- Hỏi chi tiết để so sánh giữa ${topTierAnalysis.focusedCount} lựa chọn hàng đầu này`;

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