const { StructuredTool } = require("langchain/tools");
const { z } = require("zod");
const Cart = require("../../../models/cartModel");
const Product = require("../../../models/productModel");
const ProductSelectionHelper = require("./ProductSelectionHelper");
const QuantityExtractor = require("./QuantityExtractor");
const VectorStoreManager = require("../../chatbot/VectorStoreManager");

/**
 * CartTool - Advanced cart management tool with intelligent product selection,
 * quantity extraction, and seamless integration with product search
 */
class CartTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "cart_tool";
    this.description = this.getOptimizedDescription();
    this.userContext = userContext;
    this.debugMode = process.env.CHATBOT_DEBUG === "true";

    this.schema = z.object({
      action: z
        .enum([
          "search_and_add",
          "add_to_cart",
          "get_cart",
          "remove_from_cart",
          "clear_cart",
          "select_and_add",
        ])
        .describe(
          "Action: search_and_add to find and add product, add_to_cart for direct add, select_and_add for selecting from previous search"
        ),
      query: z
        .string()
        .optional()
        .describe("Search query to find products (for search_and_add)"),
      productId: z.string().optional().describe("Product ID to add to cart"),
      productName: z
        .string()
        .optional()
        .describe("Product name for identification"),
      quantity: z
        .number()
        .optional()
        .default(1)
        .describe("Quantity to add (default: 1)"),
      selectionCriteria: z
        .string()
        .optional()
        .describe(
          "Selection criteria: 'cheapest', 'best', 'highest_rated', 'first', or specific product index like '1', '2'"
        ),
    });
  }

  getOptimizedDescription() {
    const baseDescription =
      "CART TOOL - Intelligent cart management with automatic product search, selection, and quantity extraction.";

    const enhancedKeywords = [
      // Cart and purchase actions
      "CART",
      "GIỎ HÀNG",
      "MUA",
      "PURCHASE",
      "BUY",
      "ADD",
      "THÊM",
      // Search and add combinations
      "TÌM VÀ MUA",
      "SEARCH AND BUY",
      "TÌM KIẾM VÀ THÊM",
      // Selection keywords
      "CHỌN",
      "SELECT",
      "PICK",
      "LẤY",
      "QUYẾT ĐỊNH",
      // Vietnamese purchase phrases
      "MUA CÁI NÀY",
      "CHỌN MUA",
      "ĐẶT MUA",
      "THÊM VÀO GIỎ",
      // Auto selection keywords
      "TỐT NHẤT",
      "RẺ NHẤT",
      "BEST",
      "CHEAPEST",
      "FIRST",
      // Quantity keywords
      "VÀI",
      "NHIỀU",
      "ÍT",
      "ĐÔI",
      "CẶP",
      "PIECES",
      "ITEMS",
    ];

    return `${baseDescription}

🛒 USE THIS TOOL WHEN:
- User wants to SEARCH and ADD products in one step
- "Tìm [sản phẩm] và thêm vào giỏ"
- "Mua [số lượng] [sản phẩm] [tiêu chí]"
- "Chọn và mua [sản phẩm] rẻ nhất"
- User specifies quantities: "Mua 3 cái", "Lấy 1 đôi"
- Standard cart operations (view, remove, clear)

🔍 KEYWORDS: ${enhancedKeywords.slice(0, 15).join(", ")}

⚡ Features: Smart search + selection + quantity extraction + cart operations.`;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[CartTool] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[CartTool ERROR] ${message}`, ...args);
  }

  async _call({
    action,
    query,
    productId,
    productName,
    quantity = 1,
    selectionCriteria,
  }) {
    try {
      this.log("🛒 CartTool._call started");
      this.log("🛒 Action:", action);
      this.log("🛒 Query:", query);
      this.log("🛒 SelectionCriteria:", selectionCriteria);

      // Get userId from context
      const userId = this.userContext ? this.userContext.getUserId() : null;

      if (!userId) {
        return "Bạn cần đăng nhập để sử dụng giỏ hàng. Vui lòng đăng nhập trước khi thêm sản phẩm.";
      }

      switch (action) {
        case "search_and_add":
          return await this.searchAndAdd(
            userId,
            query,
            quantity,
            selectionCriteria
          );

        case "select_and_add":
          return await this.selectAndAdd(
            userId,
            query,
            quantity,
            selectionCriteria
          );

        case "add_to_cart":
          return await this.addToCart(userId, productId, productName, quantity);

        case "get_cart":
          return await this.getCart(userId);

        case "remove_from_cart":
          return await this.removeFromCart(userId, productId, productName);

        case "clear_cart":
          return await this.clearCart(userId);

        default:
          return "Hành động không hợp lệ. Vui lòng chọn: search_and_add, add_to_cart, get_cart, remove_from_cart, hoặc clear_cart.";
      }
    } catch (error) {
      this.logError("Error in CartTool:", error);
      return `Lỗi khi xử lý giỏ hàng: ${error.message}`;
    }
  }

  /**
   * Search for products and intelligently add to cart with quantity extraction
   */
  async searchAndAdd(userId, query, quantity, selectionCriteria) {
    try {
      if (!query) {
        return "Vui lòng cung cấp từ khóa tìm kiếm để tìm và thêm sản phẩm vào giỏ hàng.";
      }

      // Extract quantity from query if not explicitly provided
      let finalQuantity = quantity;
      let quantityExplanation = "";

      if (!quantity || quantity === 1) {
        const quantityResult = QuantityExtractor.extractQuantity(query);
        if (quantityResult.confidence !== "default") {
          finalQuantity = quantityResult.quantity;
          quantityExplanation =
            QuantityExtractor.explainExtraction(quantityResult);
          this.log(
            "📊 Extracted quantity:",
            finalQuantity,
            "from query with confidence:",
            quantityResult.confidence
          );
        }
      }

      this.log("🔍 Searching for products with query:", query);
      this.log("📦 Final quantity:", finalQuantity);

      // Perform product search using VectorStoreManager
      const vectorStoreManager = VectorStoreManager.getInstance();
      const searchResults = await vectorStoreManager.similaritySearch(
        query,
        10
      );

      if (!searchResults || searchResults.length === 0) {
        return `❌ Không tìm thấy sản phẩm nào phù hợp với "${query}". Vui lòng thử từ khóa khác.`;
      }

      this.log(
        `📊 Found ${searchResults.length} products, applying selection logic...`
      );

      // Apply intelligent product selection
      const selectionResult = this.applySelectionLogic(
        query,
        searchResults,
        selectionCriteria
      );

      if (!selectionResult.success) {
        // If automatic selection fails, ask user to clarify
        if (selectionResult.reason === "multiple_options") {
          return ProductSelectionHelper.generateClarificationMessage(
            searchResults
          );
        }
        return selectionResult.message;
      }

      // Validate quantity against product stock
      const product = selectionResult.product;
      const productForValidation = await Product.findById(product.id);

      if (productForValidation) {
        const validation = QuantityExtractor.validateQuantity(finalQuantity, {
          maxStock: productForValidation.stock,
          productType: "general",
        });

        if (!validation.isValid) {
          finalQuantity = validation.adjustedQuantity;
          quantityExplanation += validation.suggestion
            ? ` ${validation.suggestion}`
            : "";
        }
      }

      this.log("✅ Selected product:", product.name);
      this.log("📦 Validated quantity:", finalQuantity);

      const addResult = await this.addToCartById(
        userId,
        product.id,
        finalQuantity
      );

      // Enhance response with selection reasoning and quantity explanation
      let enhancedResponse = `${addResult}

🎯 **Lý do chọn sản phẩm này:** ${selectionResult.message}
🔍 **Từ ${searchResults.length} sản phẩm tìm được cho "${query}"**`;

      if (quantityExplanation) {
        enhancedResponse += `\n📦 **Số lượng:** ${quantityExplanation}`;
      }

      return enhancedResponse;
    } catch (error) {
      this.logError("Error in searchAndAdd:", error);
      return `Lỗi khi tìm kiếm và thêm sản phẩm: ${error.message}`;
    }
  }

  /**
   * Select from previous search results and add to cart
   */
  async selectAndAdd(userId, context, quantity, selectionCriteria) {
    // This would work with conversation context to access previous search results
    // For now, we'll treat it as a search and add operation
    return await this.searchAndAdd(
      userId,
      context,
      quantity,
      selectionCriteria
    );
  }

  /**
   * Apply intelligent selection logic based on criteria and query analysis
   */
  applySelectionLogic(query, searchResults, selectionCriteria) {
    // Convert search results to format expected by ProductSelectionHelper
    const formattedResults = searchResults.map((result) => ({
      metadata: {
        id: result.metadata.id,
        name: result.metadata.name,
        price: result.metadata.price,
        discountPrice: result.metadata.discountPrice,
        brand: result.metadata.brand,
        averageRating: result.metadata.averageRating,
        numReviews: result.metadata.numReviews,
        features: result.metadata.features,
        description: result.metadata.description,
      },
    }));

    // Handle explicit selection criteria
    if (selectionCriteria) {
      const criteriaResult = this.handleExplicitCriteria(
        formattedResults,
        selectionCriteria
      );
      if (criteriaResult.success) {
        return criteriaResult;
      }
    }

    // Use ProductSelectionHelper for intelligent selection
    return ProductSelectionHelper.selectBestProduct(query, formattedResults);
  }

  /**
   * Handle explicit selection criteria
   */
  handleExplicitCriteria(results, criteria) {
    const lowerCriteria = criteria.toLowerCase();

    // Handle numeric selection (1, 2, 3, etc.)
    const numMatch = lowerCriteria.match(/^(\d+)$/);
    if (numMatch) {
      const index = parseInt(numMatch[1]) - 1;
      if (index >= 0 && index < results.length) {
        return {
          success: true,
          product: results[index].metadata,
          confidence: "high",
          message: `Đã chọn sản phẩm thứ ${numMatch[1]}`,
        };
      }
    }

    // Handle specific criteria keywords
    if (
      lowerCriteria.includes("rẻ nhất") ||
      lowerCriteria.includes("cheapest")
    ) {
      const cheapest = results.sort((a, b) => {
        const aPrice = a.metadata.discountPrice || a.metadata.price;
        const bPrice = b.metadata.discountPrice || b.metadata.price;
        return aPrice - bPrice;
      })[0];

      return {
        success: true,
        product: cheapest.metadata,
        confidence: "high",
        message: "Đã chọn sản phẩm có giá rẻ nhất",
      };
    }

    if (
      lowerCriteria.includes("tốt nhất") ||
      lowerCriteria.includes("best") ||
      lowerCriteria.includes("đánh giá cao")
    ) {
      const best = results.sort((a, b) => {
        return (
          (b.metadata.averageRating || 0) - (a.metadata.averageRating || 0)
        );
      })[0];

      return {
        success: true,
        product: best.metadata,
        confidence: "high",
        message: "Đã chọn sản phẩm có đánh giá tốt nhất",
      };
    }

    if (lowerCriteria.includes("đầu tiên") || lowerCriteria.includes("first")) {
      return {
        success: true,
        product: results[0].metadata,
        confidence: "high",
        message: "Đã chọn sản phẩm đầu tiên trong kết quả",
      };
    }

    return {
      success: false,
      message: "Không hiểu tiêu chí chọn sản phẩm",
    };
  }

  /**
   * Add product to cart by ID
   */
  async addToCartById(userId, productId, quantity) {
    const product = await Product.findById(productId);

    if (!product) {
      return `❌ Không tìm thấy sản phẩm với ID: ${productId}`;
    }

    return await this.addToCart(userId, productId, product.name, quantity);
  }

  /**
   * Standard add to cart functionality with quantity extraction
   */
  async addToCart(userId, productId, productName, quantity) {
    try {
      let product = null;

      if (productId) {
        product = await Product.findById(productId);
      } else if (productName) {
        product = await Product.findOne({
          name: { $regex: new RegExp(productName, "i") },
        });
      } else {
        return "Vui lòng cung cấp ID sản phẩm hoặc tên sản phẩm để thêm vào giỏ hàng.";
      }

      if (!product) {
        return productName
          ? `Không tìm thấy sản phẩm "${productName}". Vui lòng kiểm tra lại tên sản phẩm.`
          : "Không tìm thấy sản phẩm. Vui lòng kiểm tra lại ID sản phẩm.";
      }

      if (product.stock < quantity) {
        return `❌ Không đủ hàng! Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm trong kho.`;
      }

      let cart = await Cart.findOne({ user: userId });

      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [
            {
              product: product._id,
              name: product.name,
              image: product.images.length > 0 ? product.images[0].url : "",
              price: product.discountPrice || product.price,
              quantity: quantity,
            },
          ],
          totalPrice: (product.discountPrice || product.price) * quantity,
        });
      } else {
        const existingItemIndex = cart.items.findIndex(
          (item) => item.product.toString() === product._id.toString()
        );

        if (existingItemIndex > -1) {
          const newQuantity = cart.items[existingItemIndex].quantity + quantity;

          if (newQuantity > product.stock) {
            return `❌ Không thể thêm ${quantity} sản phẩm! Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm trong kho và bạn đã có ${cart.items[existingItemIndex].quantity} trong giỏ hàng.`;
          }

          cart.items[existingItemIndex].quantity = newQuantity;
        } else {
          cart.items.push({
            product: product._id,
            name: product.name,
            image: product.images.length > 0 ? product.images[0].url : "",
            price: product.discountPrice || product.price,
            quantity: quantity,
          });
        }

        cart.totalPrice = cart.items.reduce((total, item) => {
          return total + item.price * item.quantity;
        }, 0);
      }

      await cart.save();

      const effectivePrice = product.discountPrice || product.price;
      const totalItemPrice = effectivePrice * quantity;

      return `✅ **Đã thêm vào giỏ hàng thành công!**

🛒 **Sản phẩm:** ${product.name}
💰 **Giá:** ${effectivePrice.toLocaleString("vi-VN")}đ${
        product.discountPrice
          ? ` (Giảm từ ${product.price.toLocaleString("vi-VN")}đ)`
          : ""
      }
📦 **Số lượng:** ${quantity}
💵 **Tổng tiền sản phẩm:** ${totalItemPrice.toLocaleString("vi-VN")}đ

🛍️ **Tổng giỏ hàng:** ${cart.totalPrice.toLocaleString("vi-VN")}đ (${
        cart.items.length
      } sản phẩm)

💡 Bạn có thể tiếp tục mua sắm hoặc hỏi tôi để xem toàn bộ giỏ hàng!`;
    } catch (error) {
      this.logError("Error adding to cart:", error);
      return `Lỗi khi thêm sản phẩm vào giỏ hàng: ${error.message}`;
    }
  }

  async getCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate(
        "items.product"
      );

      if (!cart || cart.items.length === 0) {
        return "🛒 Giỏ hàng của bạn đang trống. Hãy tìm kiếm và thêm sản phẩm vào giỏ hàng!";
      }

      const cartItems = cart.items
        .map((item, index) => {
          const product = item.product;
          return `${index + 1}. **${item.name}**
   💰 Giá: ${item.price.toLocaleString("vi-VN")}đ
   📦 Số lượng: ${item.quantity}
   💵 Thành tiền: ${(item.price * item.quantity).toLocaleString("vi-VN")}đ
   📋 Tình trạng: ${
     product && product.stock >= item.quantity ? "✅ Còn hàng" : "⚠️ Hết hàng"
   }`;
        })
        .join("\n\n");

      return `🛒 **GIỎ HÀNG CỦA BẠN**

${cartItems}

💰 **TỔNG CỘNG: ${cart.totalPrice.toLocaleString("vi-VN")}đ**
📦 **Tổng số sản phẩm: ${cart.items.length}**

💡 Bạn có thể yêu cầu xóa sản phẩm hoặc tiến hành thanh toán!`;
    } catch (error) {
      this.logError("Error getting cart:", error);
      return `Lỗi khi lấy thông tin giỏ hàng: ${error.message}`;
    }
  }

  async removeFromCart(userId, productId, productName) {
    try {
      if (!productId && !productName) {
        return "Vui lòng cung cấp ID sản phẩm hoặc tên sản phẩm để xóa khỏi giỏ hàng.";
      }

      const cart = await Cart.findOne({ user: userId });

      if (!cart || cart.items.length === 0) {
        return "❌ Giỏ hàng của bạn đang trống.";
      }

      let itemIndex = -1;

      if (productId) {
        itemIndex = cart.items.findIndex(
          (item) => item.product.toString() === productId
        );
      } else if (productName) {
        itemIndex = cart.items.findIndex((item) =>
          item.name.toLowerCase().includes(productName.toLowerCase())
        );
      }

      if (itemIndex === -1) {
        return productName
          ? `❌ Không tìm thấy sản phẩm "${productName}" trong giỏ hàng.`
          : "❌ Không tìm thấy sản phẩm trong giỏ hàng.";
      }

      const removedItem = cart.items[itemIndex];
      cart.items.splice(itemIndex, 1);

      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);

      await cart.save();

      return `✅ **Đã xóa sản phẩm khỏi giỏ hàng!**

🗑️ **Sản phẩm đã xóa:** ${removedItem.name}
💰 **Số tiền tiết kiệm:** ${(
        removedItem.price * removedItem.quantity
      ).toLocaleString("vi-VN")}đ

🛍️ **Giỏ hàng còn lại:** ${cart.totalPrice.toLocaleString("vi-VN")}đ (${
        cart.items.length
      } sản phẩm)`;
    } catch (error) {
      this.logError("Error removing from cart:", error);
      return `Lỗi khi xóa sản phẩm khỏi giỏ hàng: ${error.message}`;
    }
  }

  async clearCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart || cart.items.length === 0) {
        return "❌ Giỏ hàng của bạn đã trống.";
      }

      const itemCount = cart.items.length;
      const totalValue = cart.totalPrice;

      await Cart.findOneAndDelete({ user: userId });

      return `✅ **Đã xóa toàn bộ giỏ hàng!**

🗑️ **Đã xóa:** ${itemCount} sản phẩm
💰 **Tổng giá trị:** ${totalValue.toLocaleString("vi-VN")}đ

🛒 Giỏ hàng hiện tại đã trống. Bạn có thể bắt đầu mua sắm mới!`;
    } catch (error) {
      this.logError("Error clearing cart:", error);
      return `Lỗi khi xóa giỏ hàng: ${error.message}`;
    }
  }
}

module.exports = CartTool;
