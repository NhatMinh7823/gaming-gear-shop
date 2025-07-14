const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const User = require("../../../models/userModel"); // Keep User for wishlist population
const { llmConfig } = require("../../config/llmConfig");
const { formatProductFromMetadata } = require("../../config/utils");
const VectorStoreManager = require("../../chatbot/VectorStoreManager"); // Import VectorStoreManager

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
    this.vectorStoreManager = VectorStoreManager.getInstance(); // Initialize VectorStoreManager
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    
    this.schema = z.object({
      query: z.string().describe("User's natural language query about wishlist, preferences, or recommendations"),
    });
  }

  getOptimizedDescription() {
    return `🤖 AI SMART WISHLIST TOOL - Intelligent wishlist analysis and personalized recommendations using Gemini-2.0-flash.

🎯 **WHEN TO USE:**
- User asks about personal preferences, wishlist items, or recommendations
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

⚡ **KEYWORDS:** wishlist, của tôi, của mình, gợi ý, đề xuất, setup, cá nhân

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
        select: "name price discountPrice brand category specifications features averageRating numReviews stock",
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

      // Create comprehensive AI prompt
      const aiPrompt = this.createAIPrompt(query, userData);

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

      let recommendedProducts = [];
      if (aiResult.responseType === 'recommendations' || aiResult.analysis?.userIntent?.includes('recommendations')) {
        recommendedProducts = await this.getRecommendationsFromVectorStore(userData.wishlistItems, query);
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

  createAIPrompt(query, userData) {
    return `Bạn là AI chuyên gia tư vấn gaming gear thông minh. Phân tích yêu cầu của khách hàng và đưa ra phản hồi cá nhân hóa.

**THÔNG TIN KHÁCH HÀNG:**
- Tên: ${userData.name}
- Số sản phẩm trong wishlist: ${userData.wishlistCount}

**WISHLIST HIỆN TẠI:**
${JSON.stringify(userData.wishlistItems, null, 2)}

**YÊU CẦU KHÁCH HÀNG:** "${query}"

**NHIỆM VỤ:**
1. Phân tích ý định thực sự của khách hàng
2. Hiểu ngữ cảnh và nhu cầu cá nhân
3. Đưa ra phản hồi phù hợp và hữu ích
4. Đề xuất sản phẩm nếu cần thiết

**LOẠI PHẢN HỒI CÓ THỂ:**
- **wishlist_info**: Hiển thị thông tin wishlist hiện tại
- **preferences_analysis**: Phân tích sở thích và pattern
- **recommendations**: Đề xuất sản phẩm dựa trên wishlist. Khi user yêu cầu đề xuất, ưu tiên đưa ra ngay các sản phẩm đề xuất mà không hỏi thêm về wishlist hiện tại hay sở thích.
- **setup_completion**: Gợi ý hoàn thiện gaming setup
- **comparison**: So sánh sản phẩm với wishlist
- **general_advice**: Tư vấn chung

**QUY TẮC QUAN TRỌNG:**
- Sử dụng giá khuyến mãi (discountPrice) nếu có
- Ưu tiên sản phẩm có đánh giá tốt và phù hợp tầm giá
- Phân tích pattern từ wishlist để hiểu sở thích
- Đề xuất tối đa 3-5 sản phẩm để tránh overwhelm
- Sử dụng ngôn ngữ thân thiện và cá nhân hóa
- Khi đề xuất sản phẩm, hãy tập trung vào việc giới thiệu các sản phẩm được tìm thấy, không hỏi thêm thông tin từ người dùng.

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

  generateResponse(aiResult, userData, recommendedProducts) {
    const { response, nextSteps } = aiResult;
    let result = `🤖 **AI Smart Analysis cho ${userData.name}**\n\n`;

    if (recommendedProducts.length > 0) {
      result += `## 🎯 **AI Recommendations:**\n\n`;
      result += `Dựa trên yêu cầu của bạn, AI nhận định đây là những đề xuất phù hợp nhất. Việc tư vấn sẽ dựa trên các sản phẩm này mà không cần hỏi thêm:\n\n`;
      
      recommendedProducts.forEach((rec, index) => {
        const formatted = formatProductFromMetadata(rec.metadata);
        result += `${formatted}\n\n💡 **Lý do:** ${rec.reason}\n\n`;
        if (index < recommendedProducts.length - 1) {
          result += "---\n\n";
        }
      });

      result += `Hy vọng những gợi ý này sẽ giúp bạn có lựa chọn tốt nhất! Nếu cần thông tin chi tiết về sản phẩm nào, bạn chỉ cần hỏi.`;
      return result;
    }

    // Fallback to general response if no recommendations or other response types
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
  async getRecommendationsFromVectorStore(wishlistItems, query) {
    const recommendedProducts = [];
    const categoriesInWishlist = [...new Set(wishlistItems.map(item => item.category))];
    let targetCategory = null;

    // Case 1: User mentioned a specific category in the query
    const mentionedCategory = this.detectCategoryInQuery(query, categoriesInWishlist);
    if (mentionedCategory) {
      targetCategory = mentionedCategory;
      this.log(`User mentioned category: ${targetCategory}`);
    } else if (categoriesInWishlist.length > 0) {
      // Case 2: User didn't mention any category, pick the first category from wishlist
      targetCategory = categoriesInWishlist[0];
      this.log(`No category mentioned, picking first wishlist category: ${targetCategory}`);
    } else {
      // Case 3: User mentioned a category not in wishlist or no wishlist items, pick "gaming pcs"
      targetCategory = "Gaming PCs"; // Default category
      this.log(`No relevant category found, defaulting to: ${targetCategory}`);
    }

    if (targetCategory) {
      let queryText = `${targetCategory}`;

      // Extract specifications from a relevant wishlist item in the target category
      const relevantWishlistItems = wishlistItems.filter(
        (item) => item.category === targetCategory
      );
      
      if (relevantWishlistItems.length > 0) {
        const firstRelevantItem = relevantWishlistItems[0];
        if (firstRelevantItem.specifications) {
          // Extract values from the Map and join them
          const specsValues = [...firstRelevantItem.specifications.values()]
            .join(" ");
          if (specsValues) {
            queryText += ` ${specsValues}`;
          }
        }
      }

      this.log(
        `Searching for similar products with query: "${queryText}" in category: "${targetCategory}"`
      );

      const results = await this.vectorStoreManager.similaritySearch(
        queryText,
        3,
        {
          "metadata.category.name": targetCategory,
        }
      );

      for (const result of results) {
        recommendedProducts.push({
          metadata: result.metadata,
          aiScore: 0, // Placeholder, AI will determine this
          reason: `Sản phẩm đề xuất trong danh mục ${targetCategory}`,
          fitWithWishlist: "N/A", // Can be refined with more complex logic
        });
      }
    }
    
    return recommendedProducts;
  }

  // Helper to detect category in query (simplified for this example)
  detectCategoryInQuery(query, availableCategories) {
    const lowerQuery = query.toLowerCase();
    for (const category of availableCategories) {
      if (lowerQuery.includes(category.toLowerCase())) {
        return category;
      }
    }
    // Add common Vietnamese category names if not directly from wishlist
    if (lowerQuery.includes("máy tính") || lowerQuery.includes("pc"))
      return "Gaming PCs";
    if (lowerQuery.includes("chuột")) return "Mouse";
    if (lowerQuery.includes("bàn phím")) return "Mechanical Keyboard";
    if (lowerQuery.includes("tai nghe")) return "Headset";
    if (lowerQuery.includes("màn hình")) return "Monitor";
    if (lowerQuery.includes("laptop")) return "Gaming Laptop";
    if (lowerQuery.includes("laptop gaming")) return "Gaming Laptop";
    return null;
  }
}

module.exports = AISmartWishlistTool;
