const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const mongoose = require("mongoose");

// Import models and services
const Cart = require("../../../models/cartModel");
const User = require("../../../models/userModel");
const Order = require("../../../models/orderModel");
const Product = require("../../../models/productModel");
const InventoryValidator = require("./InventoryValidator");
const ghnService = require("../../ghnService");
const { llmConfig } = require("../../config/llmConfig");
const OrderMessageFormatter = require('./utils/OrderMessageFormatter');
const { DEFAULT_VALUES } = require("./utils/OrderConstants");

/**
 * AIOrderTool - An AI-driven, intelligent tool for managing the entire order process.
 * This tool simplifies the previous state-machine-based OrderTool by leveraging an LLM
 * to understand user intent and orchestrate the checkout flow.
 */
class AIOrderTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "ai_order_tool";
    this.description = this.getOptimizedDescription();
    this.userContext = userContext;
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
    this.ghnService = ghnService;
    this.debugMode = process.env.CHATBOT_DEBUG === "true";

    this.schema = z.object({
      query: z.string().describe("User's natural language query about checkout, payment, shipping, order confirmation, or status checks."),
    });
  }

  getOptimizedDescription() {
    return `🤖 AI ORDER TOOL - Intelligent order management using Gemini for natural language understanding.

🛒 **WHEN TO USE:**
- User wants to checkout or place an order: "thanh toán", "đặt hàng", "checkout", "place order"
- User asks about shipping: "phí ship bao nhiêu?", "giao hàng tới đâu?"
- User wants to select payment method: "trả bằng tiền mặt", "thanh toán qua VNPay"
- User confirms the order: "đồng ý", "xác nhận đơn hàng"
- User wants to check order status: "đơn hàng của tôi sao rồi?", "check my order"

🔍 **AI CAPABILITIES:**
- Understands the entire checkout flow from a single query.
- Extracts key information like address, payment method from natural language.
- Can answer questions about shipping fees and delivery times.
- Handles order confirmation and status checks.
- Guides the user through the necessary steps if information is missing.

⚡ **KEYWORDS:** đặt hàng, thanh toán, checkout, order, mua, ship, giao hàng, địa chỉ, xác nhận, trạng thái.

Only works when the user is authenticated.`;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[AIOrderTool] ${message}`, ...args);
    }
  }

  async _call({ query }) {
    try {
      const userId = this.userContext ? this.userContext.getUserId() : null;
      if (!userId) {
        return "🔒 Để sử dụng chức năng đặt hàng, bạn cần đăng nhập.";
      }

      this.log(`Processing order query: "${query}" for userId: ${userId}`);

      // Get current context (cart, user info)
      const context = await this.getOrderContext(userId);

      // Check if cart is null, and initialize it if necessary
      if (!context.cart) {
        context.cart = { items: [], totalPrice: 0 };
      }

      // If cart is empty and user wants to checkout, guide them.
      if (context.cart.items.length === 0 && query.match(/thanh toán|đặt hàng|checkout/i)) {
        return `🛒 **GIỎ HÀNG TRỐNG**
        
Bạn chưa có sản phẩm nào để đặt hàng. Hãy thêm sản phẩm vào giỏ trước nhé!

🔍 **Gợi ý:**
• "Tìm laptop gaming"
• "Mua chuột Logitech"`;
      }

      const aiPrompt = this.createOrderAIPrompt(query, context);
      this.log("Sending query to Gemini AI for order analysis...");
      const aiResponse = await this.llm.invoke(aiPrompt);
      
      let aiResult;
      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");
        aiResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        this.log("AI JSON parsing error:", parseError, "Response was:", aiResponse.content);
        return "🤖 Rất tiếc, tôi gặp sự cố khi phân tích yêu cầu. Bạn có thể thử lại với câu hỏi đơn giản hơn không?";
      }

      this.log("AI Result:", JSON.stringify(aiResult, null, 2));
      return await this.executeAIAction(aiResult, userId, context);

    } catch (error) {
      this.log("Error in AIOrderTool:", error);
      return `❌ Lỗi xử lý đơn hàng: ${error.message}`;
    }
  }

  async getOrderContext(userId) {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    const user = await User.findById(userId);
    const recentOrders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5);

    return {
      user: {
        name: user.name,
        email: user.email,
        address: user.address ? {
          street: user.address.street,
          ward: user.address.ward?.name,
          district: user.address.district?.name,
          province: user.address.province?.name,
        } : null,
      },
      cart: cart, // Pass the entire populated cart object
      recentOrders: recentOrders.map(o => ({ id: o._id.toString(), status: o.status, total: o.totalPrice }))
    };
  }

  createOrderAIPrompt(query, context) {
    // Adjust the context for the AI to only include necessary product details
    const aiContextCart = {
      itemCount: context.cart ? context.cart.items.length : 0,
      totalPrice: context.cart ? context.cart.totalPrice : 0,
      items: context.cart ? context.cart.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        stock: item.product ? item.product.stock : 0, // Ensure stock is accessed safely
      })) : [],
    };

    return `Bạn là AI chuyên gia xử lý đơn hàng thông minh cho một cửa hàng gaming gear. Nhiệm vụ của bạn là phân tích yêu cầu của khách hàng và điều phối quy trình đặt hàng một cách tự nhiên.

**BỐI CẢNH HIỆN TẠI:**
${JSON.stringify({ ...context, cart: aiContextCart }, null, 2)}

**YÊU CẦU CỦA KHÁCH HÀNG:** "${query}"

**NHIỆM VỤ:**
1.  Phân tích ý định của khách hàng (muốn thanh toán, hỏi phí ship, xác nhận đơn, hay kiểm tra đơn hàng?).
2.  Xác định hành động (action) cần thực hiện.
3.  Trích xuất thông tin cần thiết (địa chỉ, phương thức thanh toán, mã đơn hàng).
4.  Nếu thiếu thông tin, hãy đặt câu hỏi để làm rõ.

**CÁC HÀNH ĐỘNG (ACTION) CÓ THỂ THỰC HIỆN:**
-   **start_checkout**: Bắt đầu quy trình thanh toán. Kiểm tra giỏ hàng và tồn kho.
-   **calculate_shipping**: Tính phí vận chuyển dựa trên địa chỉ mặc định.
-   **select_payment_method**: Chọn phương thức thanh toán (COD hoặc VNPay).
-   **confirm_order**: Chốt đơn hàng. Hiển thị tóm tắt cuối cùng và yêu cầu xác nhận.
-   **check_order_status**: Kiểm tra trạng thái của một đơn hàng cụ thể hoặc các đơn hàng gần đây.
-   **answer_question**: Trả lời các câu hỏi chung chung liên quan đến đặt hàng mà không cần hành động cụ thể.

**QUY TẮC QUAN TRỌNG:**
-   **Tin tưởng vào giỏ hàng:** Luôn giả định rằng các sản phẩm trong giỏ hàng là chính xác và đã được người dùng hoặc các công cụ khác (như tìm kiếm sản phẩm rẻ nhất) lựa chọn. Đừng đặt câu hỏi xác nhận lại sản phẩm trong giỏ hàng trừ khi người dùng trực tiếp yêu cầu thay đổi.
-   Luôn kiểm tra tồn kho trước khi bắt đầu thanh toán.
-   Nếu người dùng hỏi phí ship mà chưa có địa chỉ, hãy yêu cầu họ cập nhật hồ sơ.
-   Quy trình chuẩn: start_checkout -> calculate_shipping -> select_payment_method -> confirm_order.
-   Tuy nhiên, người dùng có thể thực hiện không theo thứ tự. Ví dụ: "Giao hàng tới địa chỉ mặc định và thanh toán bằng COD". AI phải hiểu và gộp các bước.

**ĐỊNH DẠNG PHẢN HỒI JSON (BẮT BUỘC):**
{
  "action": "tên_hành_động",
  "intent": "Tóm tắt ý định của người dùng",
  "confidence": "high/medium/low",
  "parameters": {
    "paymentMethod": "COD" | "VNPay" | null,
    "useDefaultAddress": true | false,
    "orderId": "mã đơn hàng nếu có"
  },
  "response": {
    "message": "Câu trả lời hoặc câu hỏi cho người dùng.",
    "reasoning": "Giải thích ngắn gọn tại sao AI chọn hành động này."
  }
}

Phân tích và trả về JSON hợp lệ.`;
  }

  async executeAIAction(aiResult, userId, context) {
    const { action, parameters, response } = aiResult;
    this.log(`Executing AI action: ${action}`, parameters);

    switch (action) {
      case "start_checkout":
        return this.handleStartCheckout(userId, context, response);
      case "calculate_shipping":
        return this.handleCalculateShipping(userId, context, response);
      case "select_payment_method":
        return this.handleSelectPaymentMethod(userId, parameters, response);
      case "confirm_order":
        return this.handleConfirmOrder(userId, context, parameters, response);
      case "check_order_status":
        return this.handleCheckOrderStatus(userId, parameters, response);
      case "answer_question":
        return response.message || "Tôi có thể giúp gì khác cho bạn về việc đặt hàng không?";
      default:
        this.log("Unknown AI action:", action);
        return "Rất tiếc, tôi chưa hiểu rõ yêu cầu của bạn. Bạn có thể nói rõ hơn về việc đặt hàng được không?";
    }
  }

  // --- HANDLER FUNCTIONS ---

  async handleStartCheckout(userId, context, response) {
    // Logic from InitiateOrderStep
    this.log("Cart items before inventory validation:", JSON.stringify(context.cart.items.map(item => ({
      _id: item._id,
      product_id: item.product ? item.product._id : 'NOT_POPULATED',
      product_name: item.product ? item.product.name : item.name,
      quantity: item.quantity,
      isProductPopulated: !!item.product
    })), null, 2));

    const validation = await InventoryValidator.validateCartInventory(context.cart.items);
    if (!validation.success) {
      // For simplicity, we won't auto-fix here. We'll just report.
      return `⚠️ **VẤN ĐỀ VỚI GIỎ HÀNG**\n\n${validation.summary.message}\n\nVui lòng điều chỉnh giỏ hàng của bạn trước khi tiếp tục.`;
    }
    
    // If validation is successful, ask the next logical question.
    return response.message || "Giỏ hàng của bạn đã sẵn sàng. Bạn muốn giao hàng đến địa chỉ mặc định và tính phí vận chuyển chứ?";
  }

  async handleCalculateShipping(userId, context, response) {
    // Full logic from CalculateShippingStep
    if (!context.user.address?.street) {
        return "📍 Bạn chưa có địa chỉ mặc định. Vui lòng cập nhật địa chỉ trong hồ sơ của bạn trước nhé.";
    }

    const user = await User.findById(userId); // Need full user object for district/ward IDs

    try {
        const cart = context.cart;
        const totalWeight = cart.items.reduce((weight, item) => weight + ((item.product?.weight || DEFAULT_VALUES.DEFAULT_PRODUCT_WEIGHT) * item.quantity), 0);
        const totalValue = cart.totalPrice;

        const shippingRequest = {
            service_type_id: 2,
            to_district_id: user.address.district.id,
            to_ward_code: user.address.ward.code,
            weight: Math.max(totalWeight, DEFAULT_VALUES.MIN_WEIGHT),
            insurance_value: totalValue
        };

        this.log('Calculating shipping with GHN:', shippingRequest);
        const shippingResult = await this.ghnService.calculateShippingFee(shippingRequest);

        let shippingInfo;
        if (!shippingResult.success) {
            this.log('GHN API failed, using fallback shipping fee');
            shippingInfo = { fee: shippingResult.fallbackFee || DEFAULT_VALUES.DEFAULT_SHIPPING_FEE };
            return response.message || `Rất tiếc, không thể kết nối với đơn vị vận chuyển. Tạm tính phí giao hàng mặc định là ${shippingInfo.fee.toLocaleString('vi-VN')}đ. Bạn có muốn tiếp tục không?`;
        } else {
            shippingInfo = { fee: shippingResult.data?.data?.service_fee || DEFAULT_VALUES.DEFAULT_SHIPPING_FEE };
            return response.message || `Phí vận chuyển tới địa chỉ của bạn là ${shippingInfo.fee.toLocaleString('vi-VN')}đ. Bạn có muốn tiếp tục thanh toán không?`;
        }
    } catch (error) {
        this.log("Error calculating shipping:", error);
        const fallbackFee = DEFAULT_VALUES.DEFAULT_SHIPPING_FEE;
        return `❌ Lỗi khi tính phí vận chuyển. Sử dụng phí mặc định ${fallbackFee.toLocaleString('vi-VN')}đ. Bạn muốn tiếp tục chứ?`;
    }
  }

  async handleSelectPaymentMethod(userId, parameters, response) {
    // Logic from SelectPaymentStep
    const { paymentMethod } = parameters;
    if (!paymentMethod) {
      return "Bạn muốn thanh toán bằng COD (tiền mặt) hay qua VNPay?";
    }
    return response.message || `Đã chọn thanh toán bằng ${paymentMethod}.`;
  }

  async handleConfirmOrder(userId, context, parameters, response) {
    // Full logic from ShowSummaryStep and ConfirmOrderStep
    try {
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        // 1. Final inventory check
        const finalValidation = await InventoryValidator.validateCartInventory(cart.items);
        if (!finalValidation.success) {
            return `❌ **THAY ĐỔI TỒN KHO**\n\nCó sản phẩm trong giỏ hàng đã thay đổi tình trạng. ${finalValidation.summary.message}\n\nVui lòng bắt đầu lại quy trình thanh toán.`;
        }

        // 2. Prepare order data (re-calculating shipping for accuracy)
        const shippingFee = (await this.ghnService.calculateShippingFee({
            service_type_id: 2,
            to_district_id: user.address.district.id,
            to_ward_code: user.address.ward.code,
            weight: Math.max(cart.items.reduce((w, i) => w + ((i.product?.weight || 100) * i.quantity), 0), 100),
            insurance_value: cart.totalPrice
        })).data?.data?.service_fee || DEFAULT_VALUES.DEFAULT_SHIPPING_FEE;

        const totalAmount = cart.totalPrice + shippingFee;

        const orderData = {
            user: userId,
            orderItems: cart.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                image: item.product.images?.[0]?.url || "",
                price: item.price,
                product: item.product._id
            })),
            shippingAddress: user.address,
            paymentMethod: parameters.paymentMethod || 'CashOnDelivery', // Default to COD
            shippingPrice: shippingFee,
            totalPrice: totalAmount,
            chatbotOrder: true,
            orderSource: 'chatbot' // Corrected to match enum in orderModel.js
        };

        // 3. Create order
        const order = await Order.create(orderData);

        // 4. Update product stock
        for (const item of cart.items) {
            await Product.updateOne({ _id: item.product._id }, {
                $inc: {
                    stock: -item.quantity,
                    sold: +item.quantity
                }
            });
        }

        // 5. Clear cart
        await Cart.findByIdAndDelete(cart._id);

        const orderNumber = order._id.toString().slice(-6).toUpperCase();
        
        // Luôn trả về thông báo thành công để đảm bảo chatbot nhận biết
        return `✅ **ĐẶT HÀNG THÀNH CÔNG!**\n\nMã đơn hàng của bạn là **#${orderNumber}**.\nTổng số tiền: ${totalAmount.toLocaleString('vi-VN')}đ.\nCảm ơn bạn đã mua sắm!`;

    } catch (error) {
        this.log("Error confirming order:", error);
        return `❌ **LỖI TẠO ĐƠN HÀNG**\n\nCó lỗi xảy ra: ${error.message}. Vui lòng thử lại sau.`;
    }
  }

  async handleCheckOrderStatus(userId, parameters, response) {
    // Logic from CheckStatusStep
    const { orderId } = parameters;
    if (!orderId) {
      const recentOrders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5);
      if (recentOrders.length === 0) return "Bạn chưa có đơn hàng nào.";
      return OrderMessageFormatter.formatOrdersList(recentOrders);
    }

    const order = await Order.findById(orderId);
    if (!order || order.user.toString() !== userId) {
      return `❌ Không tìm thấy đơn hàng ${orderId}.`;
    }
    return OrderMessageFormatter.formatOrderDetails(order);
  }
}

module.exports = AIOrderTool;
