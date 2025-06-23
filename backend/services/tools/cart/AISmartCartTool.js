const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const mongoose = require("mongoose");
const Cart = require("../../../models/cartModel");
const Product = require("../../../models/productModel");
const VectorStoreManager = require("../../chatbot/VectorStoreManager");
const { llmConfig } = require("../../config/llmConfig");

/**
 * AISmartCartTool - AI-driven intelligent cart management tool
 * Replaces CartTool, ProductSelectionHelper, and QuantityExtractor
 * Uses Gemini-2.0-flash for natural language understanding and decision making
 */
class AISmartCartTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "ai_smart_cart";
    this.description = this.getOptimizedDescription();
    this.userContext = userContext;
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    
    this.schema = z.object({
      query: z.string().describe("User's natural language query about cart operations, product adding, or shopping requests"),
    });
  }

  getOptimizedDescription() {
    return `🤖 AI SMART CART TOOL - Intelligent cart management using Gemini-2.0-flash for natural language understanding.

🛒 **WHEN TO USE:**
- User wants to add products to cart: "mua", "thêm vào giỏ", "add to cart"
- Shopping with quantities: "mua 3 cái", "lấy vài sản phẩm" 
- Product search + add: "tìm và mua", "search and buy"
- Selection criteria: "chọn rẻ nhất", "lấy tốt nhất", "pick the best"
- Cart operations: view cart, remove items, clear cart
- Shopping with context: "mua cho team", "setup gaming"

🔍 **AI CAPABILITIES:**
- Natural language intent detection
- Smart product search and selection
- Quantity extraction from text
- Price/quality preference understanding
- Context-aware recommendations
- Multilingual support (Vietnamese/English)

⚡ **KEYWORDS:** mua, thêm, cart, giỏ hàng, buy, add, purchase, tìm kiếm, search, chọn, select

Only works when user is authenticated (userId available).`;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[AISmartCartTool] ${message}`, ...args);
    }
  }

  async _call({ query }) {
    try {
      // Get userId from context
      const userId = this.userContext ? this.userContext.getUserId() : null;

      if (!userId) {
        return "🔒 Để sử dụng giỏ hàng, bạn cần đăng nhập vào tài khoản.";
      }

      this.log(`Processing cart query: "${query}" for userId: ${userId}`);

      // Get current cart for context
      const currentCart = await this.getCurrentCart(userId);
      
      // Get available products for AI analysis (sample to prevent token overflow)
      const availableProducts = await this.getAvailableProducts();

      // Create comprehensive AI prompt for cart analysis
      const aiPrompt = this.createCartAIPrompt(query, currentCart, availableProducts);

      this.log("Sending query to Gemini AI for cart analysis...");
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
        return this.fallbackResponse(query, currentCart);
      }

      // Validate AI result
      if (!aiResult || typeof aiResult !== 'object') {
        this.log("Invalid AI result structure");
        return this.fallbackResponse(query, currentCart);
      }

      // Execute the AI-determined action
      return await this.executeAIAction(aiResult, userId);

    } catch (error) {
      this.log("Error in AISmartCartTool:", error);
      return `❌ Lỗi xử lý giỏ hàng: ${error.message}

💡 **Gợi ý:**
- Kiểm tra kết nối mạng
- Thử lại với câu hỏi đơn giản hơn
- Liên hệ hỗ trợ nếu lỗi tiếp tục`;
    }
  }

  async getCurrentCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      return {
        exists: !!cart,
        itemCount: cart ? cart.items.length : 0,
        totalPrice: cart ? cart.totalPrice : 0,
        items: cart ? cart.items.map(item => ({
          id: item.product._id.toString(),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          stock: item.product.stock
        })) : []
      };
    } catch (error) {
      this.log("Error getting current cart:", error);
      return { exists: false, itemCount: 0, totalPrice: 0, items: [] };
    }
  }

  async getAvailableProducts() {
    try {
      const products = await Product.find({ stock: { $gt: 0 } })
        .populate("category", "name")
        .sort({ averageRating: -1 })
        .limit(30) // Limit to prevent token overflow
        .lean();

      return products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        brand: product.brand || "N/A",
        category: product.category?.name || "N/A",
        price: product.price,
        discountPrice: product.discountPrice || null,
        effectivePrice: product.discountPrice || product.price,
        stock: product.stock,
        rating: product.averageRating || 0,
        reviews: product.numReviews || 0,
        features: product.features || [],
        description: product.description || ""
      }));
    } catch (error) {
      this.log("Error getting available products:", error);
      return [];
    }
  }

  createCartAIPrompt(query, currentCart, availableProducts) {
    return `Bạn là AI chuyên gia quản lý giỏ hàng thông minh cho gaming gear shop. Phân tích yêu cầu của khách hàng và thực hiện hành động phù hợp.

**THÔNG TIN GIỎ HÀNG HIỆN TẠI:**
${JSON.stringify(currentCart, null, 2)}

**SẢN PHẨM CÓ SẴN (mẫu):**
${JSON.stringify(availableProducts.slice(0, 20), null, 2)}

**YÊU CẦU KHÁCH HÀNG:** "${query}"

**NHIỆM VỤ:**
1. Phân tích ý định thực sự của khách hàng về giỏ hàng
2. Xác định hành động cần thực hiện
3. Extract thông tin cần thiết (sản phẩm, số lượng, tiêu chí)
4. Đưa ra quyết định thông minh và phản hồi phù hợp

**CÁC LOẠI HÀNH ĐỘNG:**
- **add_product**: Thêm sản phẩm vào giỏ hàng
- **view_cart**: Xem giỏ hàng hiện tại
- **remove_product**: Xóa sản phẩm khỏi giỏ hàng  
- **clear_cart**: Xóa toàn bộ giỏ hàng
- **search_and_add**: Tìm kiếm và thêm sản phẩm
- **update_quantity**: Cập nhật số lượng sản phẩm

**QUY TẮC QUAN TRỌNG:**
- Sử dụng giá khuyến mãi (discountPrice) nếu có
- Kiểm tra tồn kho trước khi thêm
- Hiểu được số lượng từ ngôn ngữ tự nhiên
- Áp dụng tiêu chí lựa chọn thông minh
- Extract product intent từ search results nếu cần
- Đưa ra gợi ý khi không chắc chắn

**PRODUCT SELECTION LOGIC:**
- "rẻ nhất" → chọn sản phẩm giá thấp nhất
- "tốt nhất" → chọn sản phẩm rating cao nhất
- "đầu tiên" → chọn sản phẩm đầu tiên
- Thương hiệu cụ thể → ưu tiên brand đó
- Đặc điểm cụ thể → match features

**QUANTITY EXTRACTION:**
- Số cụ thể: "mua 3 cái" → 3
- Mô tả: "vài cái" → 3, "đôi" → 2, "nhiều" → 5
- Context: "cho team" → 6, "cá nhân" → 1
- Default: không có thông tin → 1

**ĐỊNH DẠNG PHẢN HỒI JSON:**
{
  "action": "loại hành động",
  "intent": "ý định thực sự của user",
  "confidence": "high/medium/low",
  "analysis": {
    "userQuery": "câu hỏi gốc",
    "extractedInfo": {
      "product": "tên/mô tả sản phẩm cần tìm",
      "quantity": "số lượng",
      "criteria": "tiêu chí lựa chọn",
      "context": "bối cảnh sử dụng"
    }
  },
  "execution": {
    "needsSearch": true/false,
    "searchQuery": "từ khóa tìm kiếm nếu cần",
    "productId": "id sản phẩm cụ thể nếu có",
    "quantity": số lượng cuối cùng,
    "selectionCriteria": "tiêu chí lựa chọn"
  },
  "response": {
    "title": "Tiêu đề phản hồi",
    "message": "Nội dung phản hồi chi tiết",
    "reasoning": "Lý do AI đưa ra quyết định này"
  },
  "suggestions": ["gợi ý 1", "gợi ý 2"],
  "warnings": ["cảnh báo nếu có"]
}

Phân tích và trả về JSON hợp lệ cho cart operation:`;
  }

  async executeAIAction(aiResult, userId) {
    const { action, execution, response, analysis } = aiResult;
    
    this.log(`Executing AI action: ${action}`, execution);

    try {
      switch (action) {
        case "add_product":
          return await this.handleAddProduct(userId, execution, response);

        case "search_and_add":
          return await this.handleSearchAndAdd(userId, execution, response);

        case "view_cart":
          return await this.handleViewCart(userId, response);

        case "remove_product":
          return await this.handleRemoveProduct(userId, execution, response);

        case "clear_cart":
          return await this.handleClearCart(userId, response);

        case "update_quantity":
          return await this.handleUpdateQuantity(userId, execution, response);

        default:
          return this.generateUncertaintyResponse(aiResult);
      }
    } catch (error) {
      this.log("Error executing AI action:", error);
      return `❌ Lỗi thực hiện hành động: ${error.message}`;
    }
  }

  async handleAddProduct(userId, execution, response) {
    const { productId, quantity = 1 } = execution;

    if (!productId) {
      return "❌ Không xác định được sản phẩm cần thêm. Vui lòng chỉ rõ tên hoặc ID sản phẩm.";
    }

    const product = await Product.findById(productId);
    if (!product) {
      return "❌ Không tìm thấy sản phẩm. Vui lòng kiểm tra lại thông tin.";
    }

    return await this.addToCart(userId, product, quantity, response);
  }

  async handleSearchAndAdd(userId, execution, response) {
    const { searchQuery, quantity = 1, selectionCriteria } = execution;

    if (!searchQuery) {
      return "❌ Không xác định được từ khóa tìm kiếm. Vui lòng chỉ rõ sản phẩm cần tìm.";
    }

    // Perform vector search
    const vectorStoreManager = VectorStoreManager.getInstance();
    const searchResults = await vectorStoreManager.similaritySearch(searchQuery, 10);

    if (!searchResults || searchResults.length === 0) {
      return `❌ Không tìm thấy sản phẩm nào phù hợp với "${searchQuery}". Vui lòng thử từ khóa khác.`;
    }

    // Let AI select the best product
    const selectedProduct = await this.aiSelectProduct(searchResults, selectionCriteria, searchQuery);
    
    if (!selectedProduct) {
      return this.generateProductSelectionOptions(searchResults, searchQuery);
    }

    const product = await Product.findById(selectedProduct.id);
    if (!product) {
      return "❌ Sản phẩm đã chọn không tồn tại. Vui lòng thử lại.";
    }

    const result = await this.addToCart(userId, product, quantity, response);
    return `${result}\n\n🎯 **Lý do chọn:** ${selectedProduct.reason}\n🔍 **Từ ${searchResults.length} kết quả tìm được**`;
  }

  async aiSelectProduct(searchResults, criteria, originalQuery) {
    try {
      const selectionPrompt = `Từ danh sách sản phẩm sau, hãy chọn sản phẩm phù hợp nhất với yêu cầu:

**YÊU CẦU:** "${originalQuery}"
**TIÊU CHÍ:** "${criteria || 'tự động'}"

**DANH SÁCH SẢN PHẨM:**
${JSON.stringify(searchResults.map(r => r.metadata), null, 2)}

Trả về JSON:
{
  "selectedProductId": "id sản phẩm được chọn",
  "reason": "lý do chọn sản phẩm này",
  "confidence": "high/medium/low"
}`;

      const selectionResponse = await this.llm.invoke(selectionPrompt);
      const jsonMatch = selectionResponse.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const selection = JSON.parse(jsonMatch[0]);
        return {
          id: selection.selectedProductId,
          reason: selection.reason,
          confidence: selection.confidence
        };
      }
    } catch (error) {
      this.log("Error in AI product selection:", error);
    }

    return null;
  }

  async handleViewCart(userId, response) {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return `🛒 **${response.title || 'Giỏ hàng trống'}**

${response.message || 'Giỏ hàng của bạn đang trống. Hãy tìm kiếm và thêm sản phẩm!'}

💡 **Gợi ý:**
- "Tìm chuột gaming" 
- "Mua tai nghe tốt nhất"
- "Thêm bàn phím cơ vào giỏ"`;
    }

    const cartItems = cart.items.map((item, index) => {
      const product = item.product;
      const stockStatus = product && product.stock >= item.quantity ? "✅ Còn hàng" : "⚠️ Hết hàng";
      
      return `${index + 1}. **${item.name}**
   💰 ${item.price.toLocaleString("vi-VN")}đ x ${item.quantity} = ${(item.price * item.quantity).toLocaleString("vi-VN")}đ
   📋 ${stockStatus}`;
    }).join("\n\n");

    return `🛒 **${response.title || 'Giỏ hàng của bạn'}**

${cartItems}

💰 **TỔNG CỘNG: ${cart.totalPrice.toLocaleString("vi-VN")}đ**
📦 **${cart.items.length} sản phẩm**

${response.message || 'Bạn có thể tiếp tục mua sắm hoặc tiến hành thanh toán!'}`;
  }

  async handleRemoveProduct(userId, execution, response) {
    const { productId, productName } = execution;
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return "❌ Giỏ hàng của bạn đang trống.";
    }

    let itemIndex = -1;
    if (productId) {
      itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    } else if (productName) {
      itemIndex = cart.items.findIndex(item => 
        item.name.toLowerCase().includes(productName.toLowerCase())
      );
    }

    if (itemIndex === -1) {
      return `❌ Không tìm thấy sản phẩm "${productName || productId}" trong giỏ hàng.`;
    }

    const removedItem = cart.items[itemIndex];
    cart.items.splice(itemIndex, 1);
    cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
    await cart.save();

    return `✅ **${response.title || 'Đã xóa sản phẩm'}**

🗑️ **Đã xóa:** ${removedItem.name}
💰 **Tiết kiệm:** ${(removedItem.price * removedItem.quantity).toLocaleString("vi-VN")}đ

🛍️ **Giỏ hàng còn:** ${cart.totalPrice.toLocaleString("vi-VN")}đ (${cart.items.length} sản phẩm)

${response.message || ''}`;
  }

  async handleClearCart(userId, response) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return "❌ Giỏ hàng của bạn đã trống.";
    }

    const itemCount = cart.items.length;
    const totalValue = cart.totalPrice;
    await Cart.findOneAndDelete({ user: userId });

    return `✅ **${response.title || 'Đã xóa toàn bộ giỏ hàng'}**

🗑️ **Đã xóa:** ${itemCount} sản phẩm
💰 **Tổng giá trị:** ${totalValue.toLocaleString("vi-VN")}đ

${response.message || 'Giỏ hàng hiện tại đã trống. Bạn có thể bắt đầu mua sắm mới!'}`;
  }

  async handleUpdateQuantity(userId, execution, response) {
    const { productId, quantity } = execution;
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return "❌ Giỏ hàng của bạn đang trống.";
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return "❌ Không tìm thấy sản phẩm trong giỏ hàng.";
    }

    const product = await Product.findById(productId);
    if (quantity > product.stock) {
      return `❌ Không đủ hàng! Sản phẩm chỉ còn ${product.stock} trong kho.`;
    }

    cart.items[itemIndex].quantity = quantity;
    cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
    await cart.save();

    return `✅ **Đã cập nhật số lượng**

📦 **${cart.items[itemIndex].name}:** ${quantity} sản phẩm
💰 **Tổng giỏ hàng:** ${cart.totalPrice.toLocaleString("vi-VN")}đ`;
  }

  async addToCart(userId, product, quantity, response) {
    if (product.stock < quantity) {
      return `❌ Không đủ hàng! Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho.`;
    }

    let cart = await Cart.findOne({ user: userId });
    const effectivePrice = product.discountPrice || product.price;

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{
          product: product._id,
          name: product.name,
          image: product.images?.[0]?.url || "",
          price: effectivePrice,
          quantity: quantity,
        }],
        totalPrice: effectivePrice * quantity,
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === product._id.toString()
      );

      if (existingItemIndex > -1) {
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        if (newQuantity > product.stock) {
          return `❌ Không thể thêm ${quantity} sản phẩm! Chỉ còn ${product.stock} trong kho và bạn đã có ${cart.items[existingItemIndex].quantity} trong giỏ.`;
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

      cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
    }

    await cart.save();

    const discountText = product.discountPrice 
      ? ` (Giảm từ ${product.price.toLocaleString("vi-VN")}đ)`
      : "";

    return `✅ **${response.title || 'Đã thêm vào giỏ hàng!'}**

🛒 **${product.name}**
💰 ${effectivePrice.toLocaleString("vi-VN")}đ${discountText}
📦 Số lượng: ${quantity}
💵 Thành tiền: ${(effectivePrice * quantity).toLocaleString("vi-VN")}đ

🛍️ **Tổng giỏ hàng:** ${cart.totalPrice.toLocaleString("vi-VN")}đ (${cart.items.length} sản phẩm)

${response.message || 'Tiếp tục mua sắm hoặc hỏi tôi để xem giỏ hàng!'}`;
  }

  generateProductSelectionOptions(searchResults, query) {
    const topProducts = searchResults.slice(0, 3);
    
    const productList = topProducts.map((result, index) => {
      const product = result.metadata;
      const price = product.discountPrice || product.price;
      return `${index + 1}. **${product.name}** - ${product.brand}
   💰 ${price.toLocaleString('vi-VN')}đ
   ⭐ ${product.rating}/5 (${product.reviews} đánh giá)`;
    }).join('\n\n');

    return `🔍 **Tìm thấy ${searchResults.length} sản phẩm cho "${query}"**

${productList}

💡 **Bạn muốn chọn sản phẩm nào?**
- "Chọn số 1" 
- "Mua sản phẩm thứ 2"
- "Lấy cái rẻ nhất"
- "Thêm cái tốt nhất"`;
  }

  generateUncertaintyResponse(aiResult) {
    return `🤔 **AI chưa hiểu rõ yêu cầu của bạn**

**Câu hỏi:** "${aiResult.analysis?.userQuery || 'N/A'}"

💡 **Gợi ý câu hỏi rõ ràng hơn:**
- "Mua 2 chuột gaming Logitech"
- "Thêm tai nghe tốt nhất vào giỏ"
- "Xem giỏ hàng của tôi"
- "Xóa sản phẩm [tên] khỏi giỏ"
- "Tìm và mua bàn phím cơ rẻ nhất"

🔄 **Hoặc thử diễn đạt lại yêu cầu của bạn!**`;
  }

  fallbackResponse(query, currentCart) {
    return `🤖 **AI đang xử lý câu hỏi về giỏ hàng**

**Câu hỏi:** "${query}"
**Giỏ hàng hiện tại:** ${currentCart.itemCount} sản phẩm

⚠️ **Lưu ý:** Có lỗi trong quá trình phân tích AI. Vui lòng thử lại với câu hỏi cụ thể hơn.

💡 **Ví dụ:**
- "Mua chuột gaming"
- "Thêm 3 tai nghe vào giỏ"  
- "Xem giỏ hàng"
- "Xóa sản phẩm X"`;
  }

  isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === id);
  }
}

module.exports = AISmartCartTool;
