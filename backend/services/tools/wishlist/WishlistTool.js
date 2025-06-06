const { StructuredTool } = require("langchain/tools");
const { z } = require("zod");
const User = require("../../../models/userModel"); 


/**
 * WishlistTool - Tool for accessing user's wishlist to provide personalized recommendations
 */
class WishlistTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "wishlist_tool";
    
    // Enhanced description optimized for both Gemini models
    this.description = this.getOptimizedDescription();
    
    this.userContext = userContext;
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    this.schema = z.object({
      action: z
        .enum(["get_wishlist", "get_recommendations", "analyze_preferences", "suggest_complementary"])
        .describe(
          "Action to perform: get_wishlist to see items, get_recommendations for similar products, analyze_preferences for detailed pattern analysis, suggest_complementary for missing setup items"
        ),
    });
  }

  /**
   * Get optimized description based on current model
   */
  getOptimizedDescription() {
    // Get current model from config
    const llmConfig = require("../../config/llmConfig");
    const currentModel = llmConfig.llmConfig.model;
    
    // Base description
    const baseDescription = "WISHLIST ACCESS TOOL - Get user's saved products to provide personalized recommendations.";
    
    // Enhanced keywords for better tool selection
    const enhancedKeywords = [
      // Personal context keywords
      "PERSONAL", "USER'S", "MY", "THEIR", "INDIVIDUAL", "CUSTOMIZED",
      // Wishlist specific
      "WISHLIST", "FAVORITES", "SAVED", "LIKED", "BOOKMARKED", "WANT",
      // Recommendation context  
      "RECOMMEND", "SUGGEST", "ADVICE", "GUIDANCE", "PROPOSAL",
      // Setup and preferences
      "SETUP", "PREFERENCES", "TASTE", "STYLE", "CHOICE",
      // Completion context
      "COMPLETE", "FINISH", "MISSING", "ADD", "COMPLEMENT", "ENHANCE",
      // Vietnamese equivalents
      "TƯ VẤN", "GỢI Ý", "ĐỀ XUẤT", "HOÀN THIỆN", "BỔ SUNG", "THIẾU"
    ];

    // Model-specific optimizations
    if (currentModel?.includes("gemini-2.5")) {
      // For Gemini-2.5: More explicit and structured description
      return `${baseDescription}

🎯 USE THIS TOOL WHEN:
- User asks for PERSONALIZED recommendations
- User mentions "tôi", "mình", "của tôi", "cho tôi"  
- User wants to COMPLETE/FINISH their setup
- User asks what products to ADD/COMPLEMENT
- User needs advice based on their PREFERENCES
- User asks about their CURRENT setup or gear
- Questions about "hoàn thiện", "bổ sung", "thiếu gì"
- ANY request requiring PERSONAL CONTEXT

🔍 KEYWORDS: ${enhancedKeywords.slice(0, 15).join(", ")}

⚡ ALWAYS check user authentication first. Only works when userId is available.`;
    } else {
      // For Gemini-1.5 and others: Original optimized description
      return `${baseDescription} Use when user asks about: wishlist, favorites, personal preferences, recommendations, what they like, their setup, advice, suggestions, completing setup, missing items, or any personalized queries. Keywords: ${enhancedKeywords.slice(0, 10).join(", ")}. Only works when user is authenticated (userId provided).`;
    }
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[WishlistTool] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[WishlistTool ERROR] ${message}`, ...args);
  }

  async _call({ action }) {
    try {
      this.log("🔍 WishlistTool._call started");
      this.log("🔍 Action:", action);
      this.log("🔍 UserContext exists:", !!this.userContext);
      this.log("🔍 Tool instance created at:", new Date().toISOString());

      if (this.userContext) {
        this.log(
          "🔍 UserContext methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(this.userContext))
        );
        this.log(
          "🔍 Current userId in userContext:",
          this.userContext.currentUserId
        );
        this.log(
          "🔍 UserContext instance check:",
          this.userContext.constructor.name
        );
      }

      // Get userId from context
      const userId = this.userContext ? this.userContext.getUserId() : null;

      this.log("🔍 WishlistTool called with action:", action);
      this.log("🔍 UserContext exists:", !!this.userContext);
      this.log("🔍 UserId from context:", userId);
      this.log("🔍 UserContext isAuthenticated():", this.userContext?.isAuthenticated());

      if (!userId) {
        this.log("❌ WishlistTool: No userId found in context");
        this.log("❌ UserContext debug info:", {
          exists: !!this.userContext,
          currentUserId: this.userContext?.currentUserId,
          getUserId: this.userContext?.getUserId(),
          isAuthenticated: this.userContext?.isAuthenticated()
        });
        return "I need a user ID to access the wishlist and provide personalized recommendations. Please provide your user ID or log in.";
      }

      // Find user and populate wishlist
      const user = await User.findById(userId).populate({
        path: "wishlist",
        select:
          "name price discountPrice brand category specifications features averageRating images",
        populate: {
          path: "category",
          select: "name",
        },
      });

      if (!user) {
        return "User not found.";
      }

      const wishlist = user.wishlist || [];

      if (action === "get_wishlist") {
        if (wishlist.length === 0) {
          return `${user.name} chưa có sản phẩm nào trong wishlist. Bạn có thể tư vấn các sản phẩm phổ biến hoặc hỏi thêm về nhu cầu của họ.`;
        }

        const wishlistInfo = wishlist.map((product) => ({
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          brand: product.brand,
          category: product.category?.name || "Không rõ",
          rating: product.averageRating || 0,
          features: product.features?.slice(0, 3) || [],
        }));

        return `Wishlist của ${user.name} có ${wishlist.length} sản phẩm:
${wishlistInfo
  .map(
    (item, index) =>
      `${index + 1}. ${item.name} - ${item.brand}
   Giá: ${
     item.discountPrice
       ? `${item.discountPrice.toLocaleString(
           "vi-VN"
         )}đ (giảm từ ${item.price.toLocaleString("vi-VN")}đ)`
       : `${item.price.toLocaleString("vi-VN")}đ`
   }
   Danh mục: ${item.category}
   Đánh giá: ${item.rating}/5 ⭐
   ${item.features.length > 0 ? `Tính năng: ${item.features.join(", ")}` : ""}`
  )
  .join("\n\n")}

Bạn có thể tư vấn các sản phẩm tương tự hoặc bổ sung cho wishlist này.`;
      }

      if (action === "get_recommendations") {
        if (wishlist.length === 0) {
          return `${user.name} chưa có sản phẩm nào trong wishlist để đưa ra gợi ý tương tự. Hãy hỏi về nhu cầu của họ để tư vấn phù hợp.`;
        }

        // Analyze wishlist patterns
        const categories = [
          ...new Set(
            wishlist.map((item) => item.category?.name).filter(Boolean)
          ),
        ];
        const brands = [
          ...new Set(wishlist.map((item) => item.brand).filter(Boolean)),
        ];
        const priceRanges = wishlist.map(
          (item) => item.discountPrice || item.price
        );
        const avgPrice =
          priceRanges.length > 0
            ? priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length
            : 0;
        const minPrice = Math.min(...priceRanges);
        const maxPrice = Math.max(...priceRanges);

        return `Dựa trên wishlist của ${user.name}, tôi thấy họ quan tâm đến:
- Danh mục: ${categories.join(", ") || "Đa dạng"}
- Thương hiệu yêu thích: ${brands.join(", ") || "Đa dạng"}
- Mức giá quan tâm: ${minPrice.toLocaleString(
          "vi-VN"
        )}đ - ${maxPrice.toLocaleString(
          "vi-VN"
        )}đ (trung bình: ${avgPrice.toLocaleString("vi-VN")}đ)
- Tổng ${wishlist.length} sản phẩm trong wishlist

Gợi ý: Tư vấn các sản phẩm trong các danh mục này, từ các thương hiệu tương tự, và trong tầm giá phù hợp. Có thể đề xuất combo/bundle hoặc phụ kiện đi kèm.`;
      }

      if (action === "analyze_preferences") {
        if (wishlist.length === 0) {
          return `${user.name} chưa có sản phẩm nào trong wishlist để phân tích preferences. Hãy hỏi về nhu cầu để tư vấn.`;
        }

        // Deep analysis of user preferences
        const categories = [...new Set(wishlist.map(item => item.category?.name).filter(Boolean))];
        const brands = [...new Set(wishlist.map(item => item.brand).filter(Boolean))];
        const priceRanges = wishlist.map(item => item.discountPrice || item.price);
        const avgPrice = priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length;
        const totalValue = priceRanges.reduce((a, b) => a + b, 0);
        
        // Gaming setup analysis
        const hasMonitor = categories.some(cat => cat.toLowerCase().includes('màn hình'));
        const hasKeyboard = categories.some(cat => cat.toLowerCase().includes('bàn phím'));
        const hasMouse = categories.some(cat => cat.toLowerCase().includes('chuột'));
        const hasHeadset = categories.some(cat => cat.toLowerCase().includes('tai nghe'));
        const hasLaptop = categories.some(cat => cat.toLowerCase().includes('laptop'));
        
        const setupCompleteness = [hasMonitor, hasKeyboard, hasMouse, hasHeadset, hasLaptop].filter(Boolean).length;
        
        return `📊 PHÂN TÍCH PREFERENCES CHI TIẾT cho ${user.name}:

🎯 **Xu hướng mua sắm:**
- Tổng giá trị wishlist: ${totalValue.toLocaleString('vi-VN')}đ
- Giá trung bình: ${avgPrice.toLocaleString('vi-VN')}đ
- Số danh mục quan tâm: ${categories.length}
- Độ hoàn thiện setup: ${setupCompleteness}/5 ⭐

🏷️ **Thương hiệu yêu thích:** ${brands.join(', ')}
📂 **Danh mục quan tâm:** ${categories.join(', ')}

🎮 **Phân tích Setup Gaming:**
${hasMonitor ? '✅' : '❌'} Màn hình
${hasKeyboard ? '✅' : '❌'} Bàn phím
${hasMouse ? '✅' : '❌'} Chuột
${hasHeadset ? '✅' : '❌'} Tai nghe
${hasLaptop ? '✅' : '❌'} Laptop

💡 **Insights:** ${user.name} có xu hướng ${avgPrice > 5000000 ? 'high-end' : avgPrice > 2000000 ? 'mid-range' : 'budget-friendly'}, quan tâm đến ${brands.length > 3 ? 'đa dạng thương hiệu' : 'các thương hiệu yêu thích'}.`;
      }

      if (action === "suggest_complementary") {
        if (wishlist.length === 0) {
          return `${user.name} chưa có sản phẩm nào trong wishlist. Hãy tư vấn các sản phẩm cơ bản cho gaming setup.`;
        }

        // Analyze what's missing for complete gaming setup
        const categories = wishlist.map(item => item.category?.name?.toLowerCase() || '').filter(Boolean);
        const missing = [];
        const complementary = [];
        
        // Check missing essential items
        if (!categories.some(cat => cat.includes('màn hình'))) missing.push('Màn hình gaming');
        if (!categories.some(cat => cat.includes('bàn phím'))) missing.push('Bàn phím mechanical');
        if (!categories.some(cat => cat.includes('chuột'))) missing.push('Chuột gaming');
        if (!categories.some(cat => cat.includes('tai nghe'))) missing.push('Tai nghe gaming');
        
        // Suggest complementary items
        if (categories.some(cat => cat.includes('chuột'))) complementary.push('Mouse pad gaming chất lượng cao');
        if (categories.some(cat => cat.includes('bàn phím'))) complementary.push('Wrist rest cho bàn phím');
        if (categories.some(cat => cat.includes('màn hình'))) complementary.push('Đèn LED bias lighting');
        if (categories.some(cat => cat.includes('laptop'))) complementary.push('Đế tản nhiệt laptop', 'Dock/Hub USB-C');
        
        complementary.push('Ghế gaming ergonomic', 'Bàn gaming', 'Webcam cho streaming');
        
        return `🛒 GỢI Ý SẢN PHẨM BỔ SUNG cho ${user.name}:

❌ **Còn thiếu trong setup:**
${missing.length > 0 ? missing.map(item => `• ${item}`).join('\n') : '• Setup đã khá hoàn chỉnh!'}

✨ **Phụ kiện đề xuất:**
${complementary.slice(0, 5).map(item => `• ${item}`).join('\n')}

💰 **Ưu tiên mua:**
1. ${missing[0] || complementary[0]}
2. ${missing[1] || complementary[1]}
3. ${missing[2] || complementary[2]}

🎯 Tư vấn dựa trên ${wishlist.length} sản phẩm hiện tại trong wishlist để tạo setup gaming hoàn hảo!`;
      }

      return "Invalid action specified.";
    } catch (error) {
      this.logError("Error in WishlistTool:", error);
      return `Lỗi khi truy cập wishlist: ${error.message}`;
    }
  }
}

module.exports = WishlistTool;
