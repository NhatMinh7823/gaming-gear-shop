const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { llmConfig } = require("../../config/llmConfig");
const { formatProductFromMetadata } = require("../../config/utils");

class AIProductSearchTool extends StructuredTool {
  constructor(options = {}) {
    super();
    const { vectorStoreManager } = options;
    if (!vectorStoreManager) {
      throw new Error(
        "AIProductSearchTool requires a valid vectorStoreManager in options."
      );
    }
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
    this.vectorStoreManager = vectorStoreManager;
  }

  schema = z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().default(5).describe("Số lượng kết quả tối đa"),
  });

  name = "ai_product_search";
  description =
    "🤖 Tìm kiếm sản phẩm thông minh sử dụng AI Gemini-2.0-flash. AI sẽ phân tích yêu cầu và tự động chọn sản phẩm phù hợp nhất dựa trên tên, mô tả, thương hiệu, giá cả, thông số kỹ thuật, và ngữ cảnh tự nhiên.";

  async _call(input) {
    try {
      const query = input.query || "";
      const limit = input.limit || 5;

      console.log(
        `🤖 AIProductSearchTool called with query: "${query}", limit: ${limit}`
      );

      // Semantic search using vectorStoreManager
      if (!this.vectorStoreManager) {
        throw new Error("VectorStoreManager is not provided.");
      }
      const vectorResults = await this.vectorStoreManager.similaritySearch(
        query,
        limit
      );

      if (!vectorResults || vectorResults.length === 0) {
        return "❌ Không tìm thấy sản phẩm phù hợp theo semantic search.";
      }

      // Use only metadata from vectorStore (no DB query)
      const productsForAI = vectorResults.map((res) => {
        // Sử dụng trực tiếp inStock và stock từ metadata (không fallback)
        return {
          id: res.metadata?.id || "",
          name: res.metadata?.name || "",
          brand: res.metadata?.brand || "N/A",
          category: res.metadata?.category || "N/A",
          price: res.metadata?.price,
          discountPrice: res.metadata?.discountPrice || null,
          effectivePrice: res.metadata?.discountPrice || res.metadata?.price,
          description: res.metadata?.description || "",
          features: res.metadata?.features || [],
          specifications: res.metadata?.specifications || {},
          averageRating: res.metadata?.averageRating || 0,
          numReviews: res.metadata?.numReviews || 0,
          stock: res.metadata?.stock,
          inStock: res.metadata?.inStock,
          imageUrl: res.metadata?.imageUrl || "",
        };
      });

      // Simple price stats by category (from vector metadata)
      const categoryPriceStats = {};
      productsForAI.forEach((product) => {
        const cat = product.category;
        if (!categoryPriceStats[cat]) categoryPriceStats[cat] = [];
        categoryPriceStats[cat].push(product.effectivePrice);
      });
      // Compute quantiles for more robust stats
      const priceStatsText = Object.entries(categoryPriceStats)
        .map(([cat, prices]) => {
          const sorted = prices.filter(Boolean).sort((a, b) => a - b);
          if (!sorted.length) return `- ${cat}: không có dữ liệu giá`;
          const min = sorted[0];
          const max = sorted[sorted.length - 1];
          const quantile = (q) => {
            const pos = (sorted.length - 1) * q;
            const base = Math.floor(pos);
            const rest = pos - base;
            if (sorted[base + 1] !== undefined) {
              return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
            } else {
              return sorted[base];
            }
          };
          return `- ${cat}: min=${min}, max=${max}, Q1=${quantile(
            0.25
          )}, median=${quantile(0.5)}, Q3=${quantile(0.75)}`;
        })
        .join("\n");

      // Create AI prompt for intelligent product selection
      const aiPrompt = `Bạn là chuyên gia tư vấn sản phẩm gaming gear. Phân tích yêu cầu của khách hàng và chọn ${limit} sản phẩm phù hợp nhất.

      **THỐNG KÊ GIÁ THEO DANH MỤC:**
      ${priceStatsText}

**YÊU CẦU KHÁCH HÀNG:** "${query}"

**DANH SÁCH SẢN PHẨM:**
${JSON.stringify(productsForAI, null, 2)}
**NHIỆM VỤ:**
1. Phân tích ý định tìm kiếm (danh mục, thương hiệu, tầm giá, đặc điểm kỹ thuật)
2. Chọn ${limit} sản phẩm phù hợp nhất

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
        return await this.fallbackSearch(query, limit, productsForAI);
      }

      // Validate AI result
      if (
        !aiResult.selectedProducts ||
        !Array.isArray(aiResult.selectedProducts)
      ) {
        console.error("❌ Invalid AI result structure");
        return await this.fallbackSearch(query, limit, productsForAI);
      }

      // Map selected products with full details (from productsForAI)
      const selectedProducts = aiResult.selectedProducts
        .slice(0, limit)
        .map((selection) => {
          const product = productsForAI.find((p) => p.id === selection.id);
          if (!product) return null;
          return {
            metadata: product,
            aiScore: selection.relevanceScore || 0,
            matchReasons: selection.matchReasons || [],
            recommendation: selection.recommendation || "",
          };
        })
        .filter(Boolean);

      if (selectedProducts.length === 0) {
        console.log("❌ No valid products selected by AI");
        return await this.fallbackSearch(query, limit, productsForAI);
      }

      // Format results for display
      const productList = selectedProducts
        .map((result, index) => {
          const formatted = formatProductFromMetadata(result.metadata);
          return `${formatted}

🤖 **AI Phân tích (${result.aiScore}/100 điểm):**
${result.matchReasons.map((reason) => `✅ ${reason}`).join("\n")}
💡 **Đề xuất:** ${result.recommendation}`;
        })
        .join("\n\n" + "=".repeat(50) + "\n\n");

      // Build comprehensive response
      const analysis = aiResult.analysis || {};

      const response = `🤖 **AI Gemini-2.0-flash Phân Tích Thông Minh**

🔍 **Truy vấn:** "${query}"
🎯 **Ý định tìm kiếm:** ${analysis.searchIntent || "Tìm kiếm sản phẩm gaming"}
${
  analysis.detectedCategory
    ? `📂 **Danh mục:** ${analysis.detectedCategory}`
    : ""
}
${analysis.detectedBrand ? `🏷️ **Thương hiệu:** ${analysis.detectedBrand}` : ""}
${
  analysis.priceRange?.detected
    ? `💰 **Tầm giá:** ${analysis.priceRange.detected}`
    : ""
}

📋 **Yêu cầu chính:**
${
  analysis.keyRequirements
    ? analysis.keyRequirements.map((req) => `• ${req}`).join("\n")
    : "• Tìm sản phẩm gaming chất lượng"
}

## 🏆 **Top ${selectedProducts.length} Sản Phẩm AI Đề Xuất:**

${productList}

## 📊 **Tổng Kết AI:**
${
  aiResult.summary ||
  "AI đã phân tích và chọn những sản phẩm phù hợp nhất với yêu cầu của bạn."
}

💡 **Lưu ý:** Kết quả được phân tích bởi AI Gemini-2.0-flash, xem xét toàn diện về giá cả, tính năng, đánh giá và độ phù hợp với nhu cầu cụ thể.`;

      console.log(
        `✅ AI successfully analyzed and returned ${selectedProducts.length} products`
      );
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
  async fallbackSearch(query, limit, productsForAI) {
    console.log("🔄 Using fallback search...");
    const queryLower = query.toLowerCase();
    // Detect category keyword from query
    const categoryKeywords = [
      { key: "tai nghe", match: ["tai nghe", "headset"] },
      { key: "chuột", match: ["chuột", "mouse"] },
      { key: "bàn phím", match: ["bàn phím", "keyboard"] },
      { key: "màn hình", match: ["màn hình", "monitor"] },
      { key: "laptop", match: ["laptop", "máy tính xách tay"] },
      { key: "pc", match: ["pc", "máy tính", "desktop"] },
    ];
    let detectedCategory = null;
    for (const cat of categoryKeywords) {
      if (cat.match.some((kw) => queryLower.includes(kw))) {
        detectedCategory = cat.key;
        break;
      }
    }

    // Simple keyword matching on vectorStore metadata, with category filtering
    const matches = productsForAI
      .map((product) => {
        let score = 0;
        const searchText =
          `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
        if (product.name.toLowerCase().includes(queryLower)) score += 50;
        if (product.brand?.toLowerCase().includes(queryLower)) score += 30;
        if (searchText.includes(queryLower)) score += 20;
        // Category filtering: strong penalty if not matching detected category
        if (
          detectedCategory &&
          !product.category.toLowerCase().includes(detectedCategory)
        ) {
          score -= 100; // Negative weighting for wrong category
        }
        return { product, score };
      })
      .filter((item) => item.score > 0)
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
      .map((item) =>
        formatProductFromMetadata({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          discountPrice: item.product.discountPrice || null,
          category: item.product.category || "N/A",
          brand: item.product.brand || "N/A",
          inStock: item.product.inStock,
          stock: item.product.stock,
          specifications: item.product.specifications || {},
          features: item.product.features || [],
          averageRating: item.product.averageRating || 0,
          numReviews: item.product.numReviews || 0,
          imageUrl: item.product.imageUrl || "",
        })
      )
      .join("\n\n");

    return `🔍 **Kết quả tìm kiếm cho "${query}"** (Fallback mode)

## 📦 **${matches.length} Sản phẩm được tìm thấy:**

${productList}

⚠️ **Lưu ý:** Đây là kết quả tìm kiếm cơ bản. Để có kết quả tốt hơn, vui lòng thử lại sau.`;
  }
}

module.exports = AIProductSearchTool;
