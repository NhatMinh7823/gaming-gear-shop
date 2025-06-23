const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const Product = require("../../../models/productModel");
const { llmConfig } = require("../../config/llmConfig");
const { formatProductFromMetadata } = require("../../config/utils");

class AIProductSearchTool extends StructuredTool {
  constructor() {
    super();
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
  }

  schema = z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().default(5).describe("Số lượng kết quả tối đa"),
  });

  name = "ai_product_search";
  description = "🤖 Tìm kiếm sản phẩm thông minh sử dụng AI Gemini-2.0-flash. AI sẽ phân tích yêu cầu và tự động chọn sản phẩm phù hợp nhất dựa trên tên, mô tả, thương hiệu, giá cả, thông số kỹ thuật, và ngữ cảnh tự nhiên.";

  async _call(input) {
    try {
      const query = input.query || "";
      const limit = input.limit || 5;
      
      console.log(`🤖 AIProductSearchTool called with query: "${query}", limit: ${limit}`);
      
      // Fetch all products from database
      const allProducts = await Product.find({ stock: { $gt: 0 } })
        .populate("category", "name")
        .lean();
      
      if (allProducts.length === 0) {
        return "❌ Không có sản phẩm nào trong kho hiện tại.";
      }

      console.log(`📦 Loaded ${allProducts.length} products for AI analysis`);

      // Prepare products data for AI analysis
      const productsForAI = allProducts.map(product => ({
        id: product._id.toString(),
        name: product.name,
        brand: product.brand || "N/A",
        category: product.category?.name || "N/A",
        price: product.price,
        discountPrice: product.discountPrice || null,
        effectivePrice: product.discountPrice || product.price,
        description: product.description || "",
        features: product.features || [],
        specifications: product.specifications || {},
        averageRating: product.averageRating || 0,
        numReviews: product.numReviews || 0,
        stock: product.stock,
        imageUrl: product.images?.[0]?.url || ""
      }));

      // Create AI prompt for intelligent product selection
      const aiPrompt = `Bạn là chuyên gia tư vấn sản phẩm gaming gear. Phân tích yêu cầu của khách hàng và chọn ${limit} sản phẩm phù hợp nhất.

**YÊU CẦU KHÁCH HÀNG:** "${query}"

**DANH SÁCH SẢN PHẨM:**
${JSON.stringify(productsForAI, null, 2)}

**NHIỆM VỤ:**
1. Phân tích ý định tìm kiếm (danh mục, thương hiệu, tầm giá, đặc điểm kỹ thuật)
2. Chọn ${limit} sản phẩm phù hợp nhất
3. Xếp hạng theo độ phù hợp (từ cao đến thấp)
4. Xem xét giá khuyến mãi (discountPrice) là giá thực tế
5. Ưu tiên sản phẩm có đánh giá tốt và còn hàng

**QUY TẮC PHÂN LOẠI QUAN TRỌNG:**
- "pc gaming", "gaming pc", "máy tính bàn", "desktop" → Gaming PCs/Case
- "laptop gaming", "laptop", "máy tính xách tay" → Gaming Laptops  
- "màn hình", "monitor" → Gaming Monitors
- "chuột", "mouse" → Gaming Mice
- "bàn phím", "keyboard" → Gaming Keyboards
- "tai nghe", "headset" → Gaming Headsets

**XỬ LÝ TẦMGIÁ:**
- Phát hiện tự động: "tầm 5 triệu", "7-8 triệu", "dưới 10 triệu"
- So sánh với effectivePrice (ưu tiên discountPrice nếu có)
- Chấp nhận sản phẩm có giá gốc cao nhưng giảm giá phù hợp

**ĐỊNH DẠNG PHẢN HỒI JSON:**
{
  "analysis": {
    "detectedCategory": "tên danh mục được phát hiện",
    "detectedBrand": "thương hiệu được phát hiện (nếu có)",
    "priceRange": {
      "min": giá_tối_thiểu,
      "max": giá_tối_đa,
      "detected": "chuỗi giá được phát hiện"
    },
    "searchIntent": "mô tả ý định tìm kiếm",
    "keyRequirements": ["yêu cầu 1", "yêu cầu 2"]
  },
  "selectedProducts": [
    {
      "id": "product_id",
      "relevanceScore": số_điểm_từ_1_đến_100,
      "matchReasons": ["lý do phù hợp 1", "lý do 2"],
      "priceAnalysis": "phân tích về giá cả",
      "recommendation": "lý do đề xuất"
    }
  ],
  "summary": "tóm tắt kết quả tìm kiếm và đề xuất"
}

Hãy phân tích kỹ và trả về JSON hợp lệ:`;

      // Get AI analysis
      console.log(`🧠 Sending query to Gemini AI for analysis...`);
      const aiResponse = await this.llm.invoke(aiPrompt);
      
      let aiResult;
      try {
        // Extract JSON from AI response
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in AI response");
        }
        aiResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("❌ AI JSON parsing error:", parseError);
        console.log("Raw AI response:", aiResponse.content);
        
        // Fallback: simple search
        return await this.fallbackSearch(query, limit, allProducts);
      }

      // Validate AI result
      if (!aiResult.selectedProducts || !Array.isArray(aiResult.selectedProducts)) {
        console.error("❌ Invalid AI result structure");
        return await this.fallbackSearch(query, limit, allProducts);
      }

      // Map selected products with full details
      const selectedProducts = aiResult.selectedProducts
        .slice(0, limit)
        .map(selection => {
          const product = allProducts.find(p => p._id.toString() === selection.id);
          if (!product) return null;
          
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
              imageUrl: product.images?.[0]?.url || ""
            },
            aiScore: selection.relevanceScore || 0,
            matchReasons: selection.matchReasons || [],
            recommendation: selection.recommendation || ""
          };
        })
        .filter(Boolean);

      if (selectedProducts.length === 0) {
        console.log("❌ No valid products selected by AI");
        return await this.fallbackSearch(query, limit, allProducts);
      }

      // Format results for display
      const productList = selectedProducts
        .map((result, index) => {
          const formatted = formatProductFromMetadata(result.metadata);
          return `${formatted}

🤖 **AI Phân tích (${result.aiScore}/100 điểm):**
${result.matchReasons.map(reason => `✅ ${reason}`).join('\n')}
💡 **Đề xuất:** ${result.recommendation}`;
        })
        .join("\n\n" + "=".repeat(50) + "\n\n");

      // Build comprehensive response
      const analysis = aiResult.analysis || {};
      
      const response = `🤖 **AI Gemini-2.0-flash Phân Tích Thông Minh**

🔍 **Truy vấn:** "${query}"
🎯 **Ý định tìm kiếm:** ${analysis.searchIntent || "Tìm kiếm sản phẩm gaming"}
${analysis.detectedCategory ? `📂 **Danh mục:** ${analysis.detectedCategory}` : ""}
${analysis.detectedBrand ? `🏷️ **Thương hiệu:** ${analysis.detectedBrand}` : ""}
${analysis.priceRange?.detected ? `💰 **Tầm giá:** ${analysis.priceRange.detected}` : ""}

📋 **Yêu cầu chính:**
${analysis.keyRequirements ? analysis.keyRequirements.map(req => `• ${req}`).join('\n') : "• Tìm sản phẩm gaming chất lượng"}

## 🏆 **Top ${selectedProducts.length} Sản Phẩm AI Đề Xuất:**

${productList}

## 📊 **Tổng Kết AI:**
${aiResult.summary || "AI đã phân tích và chọn những sản phẩm phù hợp nhất với yêu cầu của bạn."}

💡 **Lưu ý:** Kết quả được phân tích bởi AI Gemini-2.0-flash, xem xét toàn diện về giá cả, tính năng, đánh giá và độ phù hợp với nhu cầu cụ thể.`;

      console.log(`✅ AI successfully analyzed and returned ${selectedProducts.length} products`);
      return response;

    } catch (error) {
      console.error("❌ Error in AIProductSearchTool:", error);
      return `❌ Lỗi AI tìm kiếm sản phẩm: ${error.message}

💡 **Gợi ý:**
- Thử lại với từ khóa đơn giản hơn
- Kiểm tra kết nối mạng
- Liên hệ hỗ trợ nếu lỗi tiếp tục`;
    }
  }

  /**
   * Fallback search when AI fails
   */
  async fallbackSearch(query, limit, allProducts) {
    console.log("🔄 Using fallback search...");
    
    const queryLower = query.toLowerCase();
    
    // Simple keyword matching
    const matches = allProducts
      .map(product => {
        let score = 0;
        const searchText = `${product.name} ${product.brand} ${product.category?.name} ${product.description}`.toLowerCase();
        
        // Basic scoring
        if (product.name.toLowerCase().includes(queryLower)) score += 50;
        if (product.brand?.toLowerCase().includes(queryLower)) score += 30;
        if (searchText.includes(queryLower)) score += 20;
        
        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (matches.length === 0) {
      return `❌ Không tìm thấy sản phẩm phù hợp với "${query}".

💡 **Gợi ý:**
- Kiểm tra chính tả từ khóa
- Sử dụng từ khóa đơn giản hơn
- Tìm theo danh mục: "chuột gaming", "bàn phím", "màn hình gaming"`;
    }

    const productList = matches
      .map(item => formatProductFromMetadata({
        id: item.product._id.toString(),
        name: item.product.name,
        price: item.product.price,
        discountPrice: item.product.discountPrice || null,
        category: item.product.category?.name || "N/A",
        brand: item.product.brand || "N/A",
        inStock: item.product.stock > 0,
        specifications: item.product.specifications || {},
        features: item.product.features || [],
        averageRating: item.product.averageRating || 0,
        numReviews: item.product.numReviews || 0,
        imageUrl: item.product.images?.[0]?.url || ""
      }))
      .join("\n\n");

    return `🔍 **Kết quả tìm kiếm cho "${query}"** (Fallback mode)

## 📦 **${matches.length} Sản phẩm được tìm thấy:**

${productList}

⚠️ **Lưu ý:** Đây là kết quả tìm kiếm cơ bản. Để có kết quả tốt hơn, vui lòng thử lại sau.`;
  }
}

module.exports = AIProductSearchTool;
