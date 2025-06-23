const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const User = require("../../../models/userModel");
const Product = require("../../../models/productModel");
const { llmConfig } = require("../../config/llmConfig");
const { formatProductFromMetadata } = require("../../config/utils");

/**
 * AISmartWishlistTool - AI-driven intelligent wishlist tool
 * Replaces WishlistTool, WishlistIntentClassifier, and IntentDetector
 * Uses Gemini-2.0-flash for natural language understanding and decision making
 */
class AISmartWishlistTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "ai_smart_wishlist";
    this.description = this.getOptimizedDescription();
    this.userContext = userContext;
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    
    this.schema = z.object({
      query: z.string().describe("User's natural language query about wishlist, preferences, or recommendations"),
    });
  }

  getOptimizedDescription() {
    return `🤖 AI SMART WISHLIST TOOL - Intelligent wishlist analysis and personalized recommendations using Gemini-2.0-flash.

🎯 **WHEN TO USE:**
- User asks about personal preferences, wishlist, or "tôi/mình"
- Requests for personalized recommendations or advice
- Questions about completing/upgrading their setup
- Comparisons with current user equipment
- Any query requiring user's personal context

🔍 **AI CAPABILITIES:**
- Natural language intent detection
- Smart wishlist analysis
- Personalized product recommendations
- Setup completion suggestions
- Preference pattern recognition

⚡ **KEYWORDS:** wishlist, tôi, mình, tư vấn, gợi ý, đề xuất, setup, cá nhân, preferences

Only works when user is authenticated (userId available).`;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[AISmartWishlistTool] ${message}`, ...args);
    }
  }

  async _call({ query }) {
    try {
      // Get userId from context
      const userId = this.userContext ? this.userContext.getUserId() : null;

      if (!userId) {
        return "🔒 Để sử dụng tính năng wishlist và nhận tư vấn cá nhân, bạn cần đăng nhập vào tài khoản.";
      }

      this.log(`Processing query: "${query}" for userId: ${userId}`);

      // Get user data with populated wishlist
      const user = await User.findById(userId).populate({
        path: "wishlist",
        select: "name price discountPrice brand category specifications features averageRating numReviews images stock",
        populate: {
          path: "category",
          select: "name",
        },
      });

      if (!user) {
        return "❌ Không tìm thấy thông tin người dùng.";
      }

      const wishlist = user.wishlist || [];
      this.log(`User ${user.name} has ${wishlist.length} items in wishlist`);

      // Get available products for recommendations
      const availableProducts = await Product.find({ stock: { $gt: 0 } })
        .populate("category", "name")
        .lean();

      // Prepare data for AI analysis
      const userData = {
        name: user.name,
        wishlistCount: wishlist.length,
        wishlistItems: wishlist.map(item => ({
          id: item._id.toString(),
          name: item.name,
          brand: item.brand || "N/A",
          category: item.category?.name || "N/A",
          price: item.price,
          discountPrice: item.discountPrice || null,
          effectivePrice: item.discountPrice || item.price,
          rating: item.averageRating || 0,
          reviews: item.numReviews || 0,
          features: item.features || [],
          specifications: item.specifications || {}
        }))
      };

      // Sample available products for recommendations (limit to prevent token overflow)
      const sampleProducts = availableProducts
        .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        .slice(0, 50)
        .map(product => ({
          id: product._id.toString(),
          name: product.name,
          brand: product.brand || "N/A",
          category: product.category?.name || "N/A",
          price: product.price,
          discountPrice: product.discountPrice || null,
          effectivePrice: product.discountPrice || product.price,
          rating: product.averageRating || 0,
          features: product.features || [],
          specifications: product.specifications || {}
        }));

      // Create comprehensive AI prompt
      const aiPrompt = this.createAIPrompt(query, userData, sampleProducts);

      this.log("Sending query to Gemini AI for analysis...");
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
        this.log("AI JSON parsing error:", parseError);
        return this.fallbackResponse(query, userData);
      }

      // Validate AI result
      if (!aiResult || typeof aiResult !== 'object') {
        this.log("Invalid AI result structure");
        return this.fallbackResponse(query, userData);
      }

      // Process AI recommendations if any
      let recommendedProducts = [];
      if (aiResult.recommendations && Array.isArray(aiResult.recommendations)) {
        recommendedProducts = await this.processRecommendations(aiResult.recommendations, availableProducts);
      }

      // Generate final response
      return this.generateResponse(aiResult, userData, recommendedProducts);

    } catch (error) {
      this.log("Error in AISmartWishlistTool:", error);
      return `❌ Lỗi xử lý wishlist: ${error.message}

💡 **Gợi ý:**
- Kiểm tra kết nối mạng
- Thử lại với câu hỏi đơn giản hơn
- Liên hệ hỗ trợ nếu lỗi tiếp tục`;
    }
  }

  createAIPrompt(query, userData, sampleProducts) {
    return `Bạn là AI chuyên gia tư vấn gaming gear thông minh. Phân tích yêu cầu của khách hàng và đưa ra phản hồi cá nhân hóa.

**THÔNG TIN KHÁCH HÀNG:**
- Tên: ${userData.name}
- Số sản phẩm trong wishlist: ${userData.wishlistCount}

**WISHLIST HIỆN TẠI:**
${JSON.stringify(userData.wishlistItems, null, 2)}

**SẢN PHẨM CÓ SẴN (mẫu):**
${JSON.stringify(sampleProducts.slice(0, 20), null, 2)}

**YÊU CẦU KHÁCH HÀNG:** "${query}"

**NHIỆM VỤ:**
1. Phân tích ý định thực sự của khách hàng
2. Hiểu ngữ cảnh và nhu cầu cá nhân
3. Đưa ra phản hồi phù hợp và hữu ích
4. Đề xuất sản phẩm nếu cần thiết

**LOẠI PHẢN HỒI CÓ THỂ:**
- **wishlist_info**: Hiển thị thông tin wishlist hiện tại
- **preferences_analysis**: Phân tích sở thích và pattern
- **recommendations**: Đề xuất sản phẩm dựa trên wishlist
- **setup_completion**: Gợi ý hoàn thiện gaming setup
- **comparison**: So sánh sản phẩm với wishlist
- **general_advice**: Tư vấn chung

**QUY TẮC QUAN TRỌNG:**
- Sử dụng giá khuyến mãi (discountPrice) nếu có
- Ưu tiên sản phẩm có đánh giá tốt và phù hợp tầm giá
- Phân tích pattern từ wishlist để hiểu sở thích
- Đề xuất tối đa 3-5 sản phẩm để tránh overwhelm
- Sử dụng ngôn ngữ thân thiện và cá nhân hóa

**ĐỊNH DẠNG PHẢN HỒI JSON:**
{
  "responseType": "loại phản hồi",
  "analysis": {
    "userIntent": "ý định thực sự của user",
    "context": "bối cảnh câu hỏi",
    "wishlistPattern": "pattern nhận diện từ wishlist",
    "priceRange": "tầm giá quan tâm",
    "preferredCategories": ["danh mục yêu thích"],
    "preferredBrands": ["thương hiệu yêu thích"]
  },
  "response": {
    "title": "Tiêu đề phản hồi",
    "content": "Nội dung chi tiết phản hồi",
    "insights": ["insight 1", "insight 2"],
    "advice": "Lời khuyên cụ thể"
  },
  "recommendations": [
    {
      "productId": "id sản phẩm",
      "reason": "lý do đề xuất",
      "score": "điểm từ 1-100",
      "fitWithWishlist": "mức độ phù hợp với wishlist"
    }
  ],
  "nextSteps": ["bước tiếp theo 1", "bước 2"]
}

Phân tích và trả về JSON hợp lệ:`;
  }

  async processRecommendations(aiRecommendations, availableProducts) {
    const recommendations = [];
    
    for (const rec of aiRecommendations.slice(0, 5)) {
      const product = availableProducts.find(p => p._id.toString() === rec.productId);
      if (product) {
        recommendations.push({
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
          aiScore: rec.score || 0,
          reason: rec.reason || "",
          fitWithWishlist: rec.fitWithWishlist || ""
        });
      }
    }
    
    return recommendations;
  }

  generateResponse(aiResult, userData, recommendedProducts) {
    const { analysis, response, nextSteps } = aiResult;
    
    let result = `🤖 **AI Smart Analysis cho ${userData.name}**\n\n`;
    
    // Add main response
    if (response?.title) {
      result += `## ${response.title}\n\n`;
    }
    
    if (response?.content) {
      result += `${response.content}\n\n`;
    }

    // Add wishlist info if requested
    if (aiResult.responseType === 'wishlist_info' && userData.wishlistCount > 0) {
      result += `## 💫 **Wishlist hiện tại (${userData.wishlistCount} sản phẩm):**\n\n`;
      userData.wishlistItems.forEach((item, index) => {
        const price = item.discountPrice 
          ? `${item.discountPrice.toLocaleString('vi-VN')}đ (giảm từ ${item.price.toLocaleString('vi-VN')}đ)`
          : `${item.price.toLocaleString('vi-VN')}đ`;
        result += `${index + 1}. **${item.name}** - ${item.brand}\n   💰 ${price} | ⭐ ${item.rating}/5 (${item.reviews} đánh giá)\n   📂 ${item.category}\n\n`;
      });
    }

    // Add insights
    if (response?.insights && response.insights.length > 0) {
      result += `## 🔍 **AI Insights:**\n`;
      response.insights.forEach(insight => {
        result += `• ${insight}\n`;
      });
      result += '\n';
    }

    // Add recommendations
    if (recommendedProducts.length > 0) {
      result += `## 🎯 **AI Recommendations:**\n\n`;
      recommendedProducts.forEach((rec, index) => {
        const formatted = formatProductFromMetadata(rec.metadata);
        result += `${formatted}\n\n🤖 **AI Score:** ${rec.aiScore}/100\n💡 **Lý do:** ${rec.reason}\n🎯 **Độ phù hợp:** ${rec.fitWithWishlist}\n\n`;
        if (index < recommendedProducts.length - 1) {
          result += "---\n\n";
        }
      });
    }

    // Add advice
    if (response?.advice) {
      result += `## 💡 **Lời khuyên AI:**\n${response.advice}\n\n`;
    }

    // Add next steps
    if (nextSteps && nextSteps.length > 0) {
      result += `## 🚀 **Bước tiếp theo:**\n`;
      nextSteps.forEach((step, index) => {
        result += `${index + 1}. ${step}\n`;
      });
    }

    return result;
  }

  fallbackResponse(query, userData) {
    if (userData.wishlistCount === 0) {
      return `👋 Xin chào ${userData.name}!

🤔 **Câu hỏi của bạn:** "${query}"

📝 **Thông tin:** Bạn chưa có sản phẩm nào trong wishlist. 

💡 **Gợi ý:**
- Duyệt qua các sản phẩm gaming và thêm vào wishlist
- Cho tôi biết bạn quan tâm đến loại sản phẩm nào để tư vấn
- Chia sẻ tầm giá và nhu cầu sử dụng để đề xuất phù hợp`;
    }

    return `👋 Xin chào ${userData.name}!

🤔 **Câu hỏi của bạn:** "${query}"

📊 **Wishlist hiện tại:** ${userData.wishlistCount} sản phẩm

⚠️ **Lưu ý:** AI đang xử lý câu hỏi của bạn. Vui lòng thử lại hoặc đặt câu hỏi cụ thể hơn.

💡 **Gợi ý câu hỏi:**
- "Phân tích wishlist của tôi"
- "Gợi ý sản phẩm phù hợp"
- "Setup của tôi còn thiếu gì?"
- "So sánh [tên sản phẩm] với wishlist của tôi"`;
  }
}

module.exports = AISmartWishlistTool;
