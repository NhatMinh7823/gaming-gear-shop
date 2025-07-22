const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const mongoose = require("mongoose");
const Cart = require("../../../models/cartModel");
const Product = require("../../../models/productModel");
const VectorStoreManager = require("../../chatbot/VectorStoreManager");
const { llmConfig } = require("../../config/llmConfig");

/**
 * AISmartCartTool - A simplified, AI-driven tool for intelligent cart management.
 * This version streamlines the logic by using a single LLM call for all cart operations,
 * removing the complex two-step AI verification for adding products.
 */
class AISmartCartTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "ai_smart_cart";
    this.description = `Quản lý giỏ hàng thông minh. Sử dụng khi người dùng muốn thêm, xóa, xem, hoặc cập nhật sản phẩm trong giỏ hàng. Từ khóa: mua, thêm, giỏ hàng, cart, xóa, xem. Chỉ hoạt động khi đã đăng nhập. Khi yêu cầu thêm hãy thực hiện search_and_add.`;
    this.userContext = userContext;
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    
    this.schema = z.object({
      query: z.string().describe("User's natural language query about cart operations."),
    });
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[AISmartCartTool] ${message}`, ...args);
    }
  }

  async _call({ query }) {
    try {
      const userId = this.userContext ? this.userContext.getUserId() : null;
      if (!userId) {
        return "🔒 Để sử dụng giỏ hàng, bạn cần đăng nhập vào tài khoản.";
      }

      this.log(`Processing query: "${query}" for userId: ${userId}`);
      const currentCart = await this.getCurrentCart(userId);
      const aiPrompt = this.createCartAIPrompt(query, currentCart);

      this.log("Sending query to Gemini AI...");
      const aiResponse = await this.llm.invoke(aiPrompt);
      
      let aiResult;
      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");
        aiResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        this.log("AI JSON parsing error:", parseError, "Response:", aiResponse.content);
        return this.fallbackResponse(query);
      }

      if (!aiResult || !aiResult.action) {
        this.log("Invalid AI result structure:", aiResult);
        return this.fallbackResponse(query);
      }

      return await this.executeAIAction(aiResult, userId);

    } catch (error) {
      this.log("Error in AISmartCartTool:", error);
      return `❌ Lỗi xử lý giỏ hàng: ${error.message}. Vui lòng thử lại.`;
    }
  }

  async getCurrentCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      return {
        itemCount: cart ? cart.items.length : 0,
        totalPrice: cart ? cart.totalPrice : 0,
        items: cart ? cart.items.map(item => ({
          productId: item.product?._id.toString(),
          name: item.name,
          quantity: item.quantity,
        })) : []
      };
    } catch (error) {
      this.log("Error getting current cart:", error);
      return { itemCount: 0, totalPrice: 0, items: [] };
    }
  }

  createCartAIPrompt(query, currentCart) {
    return `Bạn là AI quản lý giỏ hàng. Phân tích yêu cầu của khách hàng và thông tin giỏ hàng để quyết định hành động.

**Giỏ hàng hiện tại:**
${JSON.stringify(currentCart, null, 2)}

**Yêu cầu khách hàng:** "${query}"

**Hành động có thể thực hiện:**
- **search_and_add**: Tìm và thêm sản phẩm.
- **view_cart**: Xem giỏ hàng.
- **remove_product**: Xóa sản phẩm.
- **clear_cart**: Xóa toàn bộ giỏ hàng.
- **update_quantity**: Cập nhật số lượng.
- **uncertain**: Khi không hiểu rõ yêu cầu.

**Trích xuất thông tin:**
- **productName**: Tên sản phẩm (cho các hành động add, remove, update).
- **quantity**: Số lượng (mặc định là 1 nếu không nói rõ).
- **productId**: ID sản phẩm (nếu có thể xác định từ giỏ hàng).

**QUAN TRỌNG:**
- Luôn trả về một JSON object duy nhất.
- Với "vài cái", hiểu là 3. "một cặp" hoặc "một đôi" là 2.

**Ví dụ yêu cầu -> JSON:**
- "mua 2 chuột logitech" -> { "action": "search_and_add", "productName": "chuột logitech", "quantity": 2 }
- "xem giỏ hàng" -> { "action": "view_cart" }
- "xóa con chuột ra khỏi giỏ" -> { "action": "remove_product", "productName": "chuột" }
- "tôi không chắc" -> { "action": "uncertain", "responseMessage": "Tôi chưa hiểu rõ, bạn có thể nói lại được không?" }

Phân tích và trả về JSON:`;
  }

  async executeAIAction(aiResult, userId) {
    const { action, productName, quantity, productId, responseMessage } = aiResult;
    this.log(`Executing AI action: ${action}`, { productName, quantity, productId });

    try {
      switch (action) {
        case "search_and_add":
          return await this.handleSearchAndAdd(userId, { productName, quantity });
        case "view_cart":
          return await this.handleViewCart(userId);
        case "remove_product":
          return await this.handleRemoveProduct(userId, { productName, productId });
        case "clear_cart":
          return await this.handleClearCart(userId);
        case "update_quantity":
          return await this.handleUpdateQuantity(userId, { productId, productName, quantity });
        case "uncertain":
          return responseMessage || this.generateUncertaintyResponse(aiResult);
        default:
          this.log("Unknown AI action:", action);
          return this.generateUncertaintyResponse(aiResult);
      }
    } catch (error) {
      this.log("Error executing AI action:", error);
      return `❌ Lỗi thực hiện hành động: ${error.message}`;
    }
  }

  async handleSearchAndAdd(userId, { productName, quantity = 1 }) {
    if (!productName) {
      return "❌ AI không xác định được sản phẩm bạn muốn tìm. Vui lòng thử lại.";
    }

    const vectorStoreManager = VectorStoreManager.getInstance();
    // Search for the top 3 most relevant products
    const searchResults = await vectorStoreManager.similaritySearch(productName, 3);

    if (!searchResults || searchResults.length === 0) {
      return `❌ Không tìm thấy sản phẩm nào phù hợp với "${productName}".`;
    }

    // Default to the most relevant product
    const topProductMetadata = searchResults[0].metadata;
    const product = await Product.findById(topProductMetadata.id);
    
    if (!product) {
      return `❌ Sản phẩm "${topProductMetadata.name}" không còn tồn tại.`;
    }

    // If there are multiple relevant results, give user options but proceed with the top one.
    if (searchResults.length > 1) {
      const optionsMessage = this.generateProductSelectionOptions(searchResults, productName);
      const addToCartResult = await this.addToCart(userId, product, quantity);
      return `${addToCartResult}\n\n${optionsMessage}`;
    }

    return await this.addToCart(userId, product, quantity);
  }

  async handleViewCart(userId) {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return `[ACTION_SUCCESS] 🛒 Giỏ hàng của bạn đang trống. Hãy tìm kiếm và thêm sản phẩm!`;
    }

    const cartItems = cart.items.map((item, index) => {
      const stockStatus = item.product 
        ? (item.product.stock >= item.quantity ? "✅ Còn hàng" : `⚠️ Chỉ còn ${item.product.stock}`) 
        : "❌ Sản phẩm không tồn tại";
      
      return `${index + 1}. **${item.name}**
   - Số lượng: ${item.quantity}
   - Giá: ${item.price.toLocaleString("vi-VN")}đ
   - Trạng thái: ${stockStatus}`;
    }).join("\n\n");

    return `[ACTION_SUCCESS] 🛒 **Giỏ hàng của bạn:**\n\n${cartItems}\n\n💰 **TỔNG CỘNG: ${cart.totalPrice.toLocaleString("vi-VN")}đ**`;
  }

  async handleRemoveProduct(userId, { productName, productId }) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return "❌ Giỏ hàng của bạn đang trống.";
    }

    let itemIndex = -1;
    if (productId) {
      itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    } else if (productName) {
      const lowerCaseProductName = productName.toLowerCase();
      // Ưu tiên so khớp chính xác tên sản phẩm, nếu không thì mới dùng includes
      itemIndex = cart.items.findIndex(item =>
        item.name.toLowerCase() === lowerCaseProductName
      );
      if (itemIndex === -1) {
        itemIndex = cart.items.findIndex(item =>
          item.name.toLowerCase().includes(lowerCaseProductName)
        );
      }
    }

    if (itemIndex === -1) {
      return `❌ Không tìm thấy sản phẩm khớp với "${productName || productId}" trong giỏ hàng.`;
    }

    const removedItem = cart.items[itemIndex];
    cart.items.splice(itemIndex, 1);
    await cart.save();

    return `[ACTION_SUCCESS] ✅ Đã xóa **${removedItem.name}** khỏi giỏ hàng.`;
  }

  async handleClearCart(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return "[ACTION_SUCCESS] ✅ Giỏ hàng của bạn đã trống rồi.";
    }
    
    await Cart.findOneAndDelete({ user: userId });
    return `[ACTION_SUCCESS] ✅ Đã xóa toàn bộ sản phẩm khỏi giỏ hàng.`;
  }

  async handleUpdateQuantity(userId, { productId, productName, quantity }) {
    if (!quantity || quantity <= 0) {
      return "❌ Vui lòng cung cấp số lượng hợp lệ.";
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return "❌ Giỏ hàng của bạn đang trống.";
    }

    let itemIndex = -1;
    if (productId) {
        itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    } else if (productName) {
        const lowerCaseProductName = productName.toLowerCase();
        itemIndex = cart.items.findIndex(item => item.name.toLowerCase().includes(lowerCaseProductName));
    }

    if (itemIndex === -1) {
      return `❌ Không tìm thấy sản phẩm khớp với "${productName || productId}" trong giỏ hàng.`;
    }

    const itemToUpdate = cart.items[itemIndex];
    const product = await Product.findById(itemToUpdate.product);
    if (quantity > product.stock) {
      return `❌ Không đủ hàng! Sản phẩm **${product.name}** chỉ còn ${product.stock} trong kho.`;
    }

    itemToUpdate.quantity = quantity;
    await cart.save();

    return `[ACTION_SUCCESS] ✅ Đã cập nhật số lượng cho **${itemToUpdate.name}** thành **${quantity}**.`;
  }

  async addToCart(userId, product, quantity) {
    if (product.stock < quantity) {
      return `❌ Không đủ hàng! Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho.`;
    }

    let cart = await Cart.findOne({ user: userId });
    const effectivePrice = product.discountPrice || product.price;

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === product._id.toString()
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return `❌ Không thể thêm! Bạn muốn thêm ${quantity} sản phẩm, nhưng trong kho chỉ còn ${product.stock} và bạn đã có ${cart.items[existingItemIndex].quantity} trong giỏ.`;
      }
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || "",
        price: effectivePrice,
        quantity: quantity,
      });
    }
    
    await cart.save();
    
    return `[ACTION_SUCCESS] ✅ Đã thêm **${quantity} x ${product.name}** vào giỏ hàng. Giỏ hàng hiện có ${cart.items.length} loại sản phẩm.`;
  }

  generateProductSelectionOptions(searchResults, query) {
    const productList = searchResults.slice(0, 3).map((result, index) => {
      const p = result.metadata;
      return `${index + 1}. **${p.name}** (${(p.discountPrice || p.price).toLocaleString('vi-VN')}đ)`;
    }).join('\n');

    return `💡 Tôi đã thêm sản phẩm phù hợp nhất. Nếu bạn muốn sản phẩm khác, đây là vài lựa chọn cho "${query}":\n${productList}\n\nBạn có thể yêu cầu "thêm số 2" hoặc "đổi sang sản phẩm 3".`;
  }

  generateUncertaintyResponse(aiResult) {
    const userQuery = aiResult.analysis?.userQuery || "";
    return `🤔 Tôi chưa hiểu rõ yêu cầu của bạn${userQuery ? ` về "${userQuery}"` : ''}. Bạn có thể diễn đạt lại được không? Ví dụ: "mua 2 chuột gaming", "xem giỏ hàng".`;
  }

  fallbackResponse(query) {
    return `🤖 Đã có lỗi xảy ra khi AI phân tích câu hỏi về giỏ hàng. Vui lòng thử lại với câu hỏi cụ thể hơn. Ví dụ: "Mua chuột gaming", "Xem giỏ hàng".`;
  }
}

module.exports = AISmartCartTool;
