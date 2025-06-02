const { StructuredTool } = require("langchain/tools");
const { z } = require("zod");
const User = require("../../models/userModel");
const Product = require("../../models/productModel"); // Ensure Product model is registered

/**
 * WishlistTool - Tool for accessing user's wishlist to provide personalized recommendations
 */
class WishlistTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "wishlist_tool";
    this.description =
      "Get user's wishlist to provide personalized product recommendations. Only use when user is authenticated (userId provided).";
    this.userContext = userContext;
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    this.schema = z.object({
      action: z
        .enum(["get_wishlist", "get_recommendations"])
        .describe(
          "Action to perform: get_wishlist to see items, get_recommendations for similar products"
        ),
    });
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

      if (this.userContext) {
        this.log(
          "🔍 UserContext methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(this.userContext))
        );
        this.log(
          "🔍 Current userId in userContext:",
          this.userContext.currentUserId
        );
      }

      // Get userId from context
      const userId = this.userContext ? this.userContext.getUserId() : null;

      this.log("🔍 WishlistTool called with action:", action);
      this.log("🔍 UserContext exists:", !!this.userContext);
      this.log("🔍 UserId from context:", userId);

      if (!userId) {
        this.log("❌ WishlistTool: No userId found in context");
        return "User not authenticated. Cannot access wishlist. Ask user to login for personalized recommendations.";
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

      return "Invalid action specified.";
    } catch (error) {
      this.logError("Error in WishlistTool:", error);
      return `Lỗi khi truy cập wishlist: ${error.message}`;
    }
  }
}

module.exports = WishlistTool;
