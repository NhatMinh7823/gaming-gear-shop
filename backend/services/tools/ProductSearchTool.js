const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const VectorStoreManager = require("../chatbot/VectorStoreManager");
const { formatProductFromMetadata } = require("../config/utils");

class ProductSearchTool extends StructuredTool {
  schema = z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().default(5).describe("Số lượng kết quả tối đa"),
  });

  name = "product_search";
  description =
    "Tìm kiếm sản phẩm theo tên, mô tả, thương hiệu, thông số, tính năng, hoặc từ khóa liên quan. Hỗ trợ tìm kiếm thông minh với nhiều chiến lược khác nhau.";

  async _call(input) {
    try {
      const vectorStoreManager = VectorStoreManager.getInstance();
      const query = input.query || "";
      const limit = input.limit || 5;
      
      console.log(`🔍 ProductSearchTool called with query: "${query}", limit: ${limit}`);
      
      // First attempt: Direct similarity search
      let results = await vectorStoreManager.similaritySearch(query, limit);
      let searchStrategy = "direct";
      
      // If no results and query contains brand names, try alternative searches
      if (results.length === 0) {
        console.log(`🔄 No results for "${query}", trying alternative searches...`);
        
        const lowerQuery = query.toLowerCase();
        let alternativeQueries = [];
        
        // BenQ specific searches
        if (lowerQuery.includes('benq')) {
          alternativeQueries = [
            'BenQ',
            'BENQ', 
            'benq',
            'thương hiệu BenQ',
            'màn hình BenQ',
            'monitor BenQ',
            'BenQ monitor',
            'BenQ Mobiuz',
            'Mobiuz',
            'EX3210U',
            'BenQ EX3210U'
          ];
          searchStrategy = "benq-alternative";
        }
        // Generic brand searches
        else if (lowerQuery.includes('màn hình') || lowerQuery.includes('monitor')) {
          alternativeQueries = [
            'monitor',
            'màn hình',
            'gaming monitor',
            'màn hình gaming', 
            'display',
            'screen'
          ];
          searchStrategy = "monitor-alternative";
        }
        // Other brand specific searches
        else {
          // Extract potential brand names
          const potentialBrands = ['asus', 'msi', 'acer', 'lg', 'samsung', 'dell', 'hp', 'razer', 'logitech', 'corsair'];
          const foundBrand = potentialBrands.find(brand => lowerQuery.includes(brand));
          
          if (foundBrand) {
            alternativeQueries = [
              foundBrand,
              foundBrand.toUpperCase(),
              `thương hiệu ${foundBrand}`,
              `brand ${foundBrand}`,
              `sản phẩm ${foundBrand}`
            ];
            searchStrategy = `${foundBrand}-alternative`;
          }
        }
        
        // Try alternative queries
        for (const altQuery of alternativeQueries) {
          console.log(`🔄 Trying alternative query: "${altQuery}"`);
          results = await vectorStoreManager.similaritySearch(altQuery, limit);
          if (results.length > 0) {
            console.log(`✅ Found ${results.length} results with alternative query: "${altQuery}"`);
            searchStrategy += `-success-${altQuery}`;
            break;
          }
        }
      }
      
      // If still no results, try broader category searches
      if (results.length === 0) {
        console.log(`🔄 Still no results, trying broader category searches...`);
        const broadQueries = [
          'gaming',
          'monitor',
          'màn hình',
          'keyboard',
          'bàn phím',
          'mouse',
          'chuột',
          'headset',
          'tai nghe',
          'laptop'
        ];
        
        for (const broadQuery of broadQueries) {
          console.log(`🔄 Trying broad query: "${broadQuery}"`);
          results = await vectorStoreManager.similaritySearch(broadQuery, limit * 2);
          if (results.length > 0) {
            console.log(`✅ Found ${results.length} results with broad query: "${broadQuery}"`);
            searchStrategy = `broad-${broadQuery}`;
            break;
          }
        }
      }
      
      if (results.length === 0) {
        // Debug: Check what's actually loaded in vector store
        const storeInfo = await vectorStoreManager.getLoadedProductsInfo();
        console.log(`❓ Vector store info:`, storeInfo);
        
        return `❌ Không tìm thấy sản phẩm nào phù hợp với "${query}".

💡 **Gợi ý tìm kiếm:**
- Thử từ khóa đơn giản hơn (ví dụ: "màn hình", "gaming", "BenQ")
- Kiểm tra chính tả từ khóa
- Tìm theo danh mục: "màn hình gaming", "bàn phím cơ", "chuột gaming"
- Tìm theo thương hiệu: "ASUS", "MSI", "Razer", "Logitech"

📊 **Thông tin hệ thống:** Đã tìm trong ${storeInfo.count} sản phẩm
🏷️ **Thương hiệu có sẵn:** ${storeInfo.brands.slice(0, 5).join(', ')}${storeInfo.brands.length > 5 ? '...' : ''}
${storeInfo.hasbenq ? '✅ Có sản phẩm BenQ trong hệ thống' : '❌ Không tìm thấy sản phẩm BenQ'}

❓ Bạn có thể hỏi tôi: "Có những thương hiệu màn hình nào?" hoặc "Tư vấn màn hình gaming"`;
      }
      
      const productList = results
        .map((result) => formatProductFromMetadata(result.metadata))
        .join("\n\n");
      
      console.log(`✅ ProductSearchTool returning ${results.length} results (strategy: ${searchStrategy})`);
      
      const resultMessage = `🔍 **Tìm thấy ${results.length} sản phẩm cho "${query}":**

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
