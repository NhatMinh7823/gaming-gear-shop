const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const mongoose = require("mongoose");
const Order = require("../../../models/orderModel");
const Cart = require("../../../models/cartModel");
const User = require("../../../models/userModel");
const Product = require("../../../models/productModel");
const ghnService = require("../../ghnService");
const { llmConfig } = require("../../config/llmConfig");

/**
 * AIOrderTool - AI-driven tool for intelligent order management.
 * Handles order creation, payment method selection, shipping calculation, and order tracking.
 */
class AIOrderTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "ai_order_tool";
    this.description = `Quản lý đơn hàng thông minh. Sử dụng khi người dùng muốn đặt hàng, thanh toán, xem đơn hàng, tính phí ship. Từ khóa: đặt hàng, thanh toán, COD, VNPay, phí ship, đơn hàng, order, checkout. Chỉ hoạt động khi đã đăng nhập.`;
    this.userContext = userContext;
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    
    this.schema = z.object({
      query: z.string().describe("User's natural language query about order operations."),
    });
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
        return "🔒 Để đặt hàng, bạn cần đăng nhập vào tài khoản.";
      }

      this.log(`Processing query: "${query}" for userId: ${userId}`);
      
      // Get current context
      const [currentCart, userInfo, recentOrders] = await Promise.all([
        this.getCurrentCart(userId),
        this.getUserInfo(userId),
        this.getRecentOrders(userId)
      ]);

      const aiPrompt = this.createOrderAIPrompt(query, currentCart, userInfo, recentOrders);

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

      // DIRECT HANDLER EXECUTION - Results go directly to user
      // No additional AI processing of handler results
      return await this.executeAIAction(aiResult, userId, currentCart, userInfo);

    } catch (error) {
      this.log("Error in AIOrderTool:", error);
      return `❌ Lỗi xử lý đơn hàng: ${error.message}. Vui lòng thử lại.`;
    }
  }

  async getCurrentCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        return { isEmpty: true, itemCount: 0, totalPrice: 0, items: [] };
      }

      return {
        isEmpty: false,
        itemCount: cart.items.length,
        totalPrice: cart.totalPrice,
        items: cart.items.map(item => ({
          productId: item.product?._id.toString(),
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          stock: item.product?.stock || 0
        }))
      };
    } catch (error) {
      this.log("Error getting current cart:", error);
      return { isEmpty: true, itemCount: 0, totalPrice: 0, items: [] };
    }
  }

  async getUserInfo(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      return {
        name: user.name,
        email: user.email,
        hasAddress: user.address && user.address.isComplete,
        address: user.address,
        preferredPaymentMethod: user.chatbotPreferences?.preferredPaymentMethod || 'VNPay',
        coupon: user.coupon
      };
    } catch (error) {
      this.log("Error getting user info:", error);
      return null;
    }
  }

  async getRecentOrders(userId, limit = 3) {
    try {
      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id status totalPrice paymentMethod createdAt trackingNumber');
      
      return orders.map(order => ({
        id: order._id.toString(),
        status: order.status,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        trackingNumber: order.trackingNumber
      }));
    } catch (error) {
      this.log("Error getting recent orders:", error);
      return [];
    }
  }

  createOrderAIPrompt(query, currentCart, userInfo, recentOrders) {
    return `Bạn là AI quản lý đơn hàng. Phân tích yêu cầu của khách hàng và thông tin hiện tại để quyết định hành động.

**Giỏ hàng hiện tại:**
${JSON.stringify(currentCart, null, 2)}

**Thông tin khách hàng:**
${JSON.stringify(userInfo, null, 2)}

**Đơn hàng gần đây:**
${JSON.stringify(recentOrders, null, 2)}

**Yêu cầu khách hàng:** "${query}"

**Hành động có thể thực hiện:**
- **start_checkout**: Bắt đầu quy trình đặt hàng (khi có sản phẩm trong giỏ)
- **calculate_shipping**: Tính phí vận chuyển
- **select_payment_method**: Chọn phương thức thanh toán (COD hoặc VNPay)
- **confirm_order**: Xác nhận và tạo đơn hàng
- **check_order_status**: Kiểm tra trạng thái đơn hàng
- **view_order_details**: Xem chi tiết đơn hàng cụ thể
- **general_info**: Trả lời câu hỏi chung về đặt hàng

**Trả về JSON với format:**
{
  "action": "<action_name>",
  "params": {
    "paymentMethod": "COD|VNPay" (nếu cần),
    "orderId": "<order_id>" (nếu cần),
    "message": "<explanation_message>"
  },
  "confidence": 0.9
}

**Lưu ý:**
- Nếu giỏ hàng trống và người dùng muốn đặt hàng → hướng dẫn thêm sản phẩm
- Nếu chưa có địa chỉ và cần tính phí ship → yêu cầu cập nhật địa chỉ
- Ưu tiên phương thức thanh toán mặc định của user
- Kiểm tra tồn kho trước khi xác nhận đơn hàng`;
  }

  async executeAIAction(aiResult, userId, currentCart, userInfo) {
    const { action, params } = aiResult;
    
    switch (action) {
      case 'start_checkout':
        return await this.handleStartCheckout(userId, currentCart, userInfo);
      
      case 'calculate_shipping':
        return await this.handleCalculateShipping(userId, userInfo);
      
      case 'select_payment_method':
        return await this.handleSelectPaymentMethod(userId, params?.paymentMethod);
      
      case 'confirm_order':
        return await this.handleConfirmOrder(userId, currentCart, userInfo, params);
      
      case 'check_order_status':
        return await this.handleCheckOrderStatus(userId, params?.orderId);
      
      case 'view_order_details':
        return await this.handleViewOrderDetails(userId, params?.orderId);
      
      case 'general_info':
        return this.handleGeneralInfo(params?.message);
      
      default:
        return this.fallbackResponse(aiResult.action);
    }
  }

  async handleStartCheckout(userId, currentCart, userInfo) {
    if (currentCart.isEmpty) {
      return "🛒 Giỏ hàng của bạn đang trống. Hãy thêm sản phẩm vào giỏ hàng trước khi đặt hàng.\n\n💡 Bạn có thể nói: 'Mua chuột gaming' hoặc 'Thêm bàn phím cơ vào giỏ'";
    }

    // Check stock availability
    const stockIssues = currentCart.items.filter(item => item.quantity > item.stock);
    if (stockIssues.length > 0) {
      const issueList = stockIssues.map(item => `- ${item.name}: còn ${item.stock}, bạn muốn ${item.quantity}`).join('\n');
      return `⚠️ Một số sản phẩm trong giỏ hàng không đủ số lượng:\n${issueList}\n\nVui lòng cập nhật số lượng hoặc xóa sản phẩm hết hàng.`;
    }

    let response = `🛍️ **Bắt đầu đặt hàng**\n\n`;
    response += `📦 **Sản phẩm trong giỏ (${currentCart.itemCount} món):**\n`;
    
    currentCart.items.forEach(item => {
      response += `• ${item.name} x${item.quantity} - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}\n`;
    });
    
    response += `\n💰 **Tạm tính:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentCart.totalPrice)}\n\n`;

    if (!userInfo.hasAddress) {
      response += `📍 **Cần cập nhật địa chỉ giao hàng**\nVui lòng cập nhật địa chỉ trong tài khoản để tính phí vận chuyển.\n\n`;
    } else {
      try {
        const shippingFee = await this.calculateShippingFee(userInfo.address);
        response += `🚚 **Phí vận chuyển:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(shippingFee)}\n`;
        response += `💳 **Tổng cộng:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentCart.totalPrice + shippingFee)}\n\n`;
      } catch (error) {
        response += `🚚 **Phí vận chuyển:** Đang tính toán...\n\n`;
      }
    }

    response += `💳 **Phương thức thanh toán:**\n`;
    response += `• COD (Thanh toán khi nhận hàng)\n`;
    response += `• VNPay (Thanh toán online)\n\n`;
    response += `✅ Để tiếp tục, hãy chọn: "Thanh toán bằng COD" hoặc "Thanh toán qua VNPay"`;

    return response;
  }

  async handleCalculateShipping(userId, userInfo) {
    if (!userInfo.hasAddress) {
      return "📍 Để tính phí vận chuyển, bạn cần cập nhật địa chỉ giao hàng trong tài khoản.\n\n💡 Vui lòng vào Tài khoản > Địa chỉ để cập nhật thông tin.";
    }

    try {
      const shippingFee = await this.calculateShippingFee(userInfo.address);
      const estimatedDays = 2; // Default estimation
      
      return `🚚 **Phí vận chuyển đến ${userInfo.address.province.name}:**\n\n` +
             `💰 **Phí ship:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(shippingFee)}\n` +
             `⏱️ **Thời gian giao hàng:** ${estimatedDays}-3 ngày làm việc\n` +
             `📍 **Địa chỉ:** ${userInfo.address.street}, ${userInfo.address.ward.name}, ${userInfo.address.district.name}, ${userInfo.address.province.name}`;
    } catch (error) {
      this.log("Error calculating shipping:", error);
      return "❌ Không thể tính phí vận chuyển lúc này. Vui lòng thử lại sau.";
    }
  }

  async handleSelectPaymentMethod(userId, paymentMethod) {
    if (!paymentMethod || !['COD', 'VNPay'].includes(paymentMethod)) {
      return "💳 **Chọn phương thức thanh toán:**\n\n" +
             "• **COD** - Thanh toán khi nhận hàng (tiện lợi, không cần thẻ)\n" +
             "• **VNPay** - Thanh toán online (nhanh chóng, bảo mật)\n\n" +
             "Hãy nói: 'Tôi chọn COD' hoặc 'Thanh toán qua VNPay'";
    }

    // Update user preference
    try {
      await User.findByIdAndUpdate(userId, {
        'chatbotPreferences.preferredPaymentMethod': paymentMethod
      });
    } catch (error) {
      this.log("Error updating payment preference:", error);
    }

    const methodName = paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán online qua VNPay';
    return `✅ **Đã chọn phương thức thanh toán:** ${methodName}\n\n` +
           `🎯 Để hoàn tất đặt hàng, hãy nói: "Tôi đồng ý đặt hàng" hoặc "Xác nhận đơn hàng"`;
  }

  async handleConfirmOrder(userId, currentCart, userInfo, params) {
    if (currentCart.isEmpty) {
      return "🛒 Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.";
    }

    if (!userInfo.hasAddress) {
      return "📍 Vui lòng cập nhật địa chỉ giao hàng trước khi đặt hàng.";
    }

    try {
      // Calculate shipping fee
      const shippingFee = await this.calculateShippingFee(userInfo.address);
      const paymentMethod = userInfo.preferredPaymentMethod;
      
      // Check stock again before creating order
      const stockIssues = [];
      for (const item of currentCart.items) {
        const product = await Product.findById(item.productId);
        if (!product || product.stock < item.quantity) {
          stockIssues.push(item.name);
        }
      }

      if (stockIssues.length > 0) {
        return `⚠️ Sản phẩm sau đã hết hàng: ${stockIssues.join(', ')}. Vui lòng cập nhật giỏ hàng.`;
      }

      // Create order
      const orderData = {
        user: userId,
        orderItems: currentCart.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: item.price,
          product: item.productId
        })),
        shippingAddress: userInfo.address,
        paymentMethod: paymentMethod,
        taxPrice: 0,
        shippingPrice: shippingFee,
        totalPrice: currentCart.totalPrice + shippingFee,
        chatbotOrder: true,
        orderSource: 'chatbot'
      };

      const order = await Order.create(orderData);

      // Update product stock
      for (const item of currentCart.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity, sold: item.quantity }
        });
      }

      // Clear cart
      await Cart.findOneAndDelete({ user: userId });

      let response = `🎉 **Đặt hàng thành công!**\n\n`;
      response += `📋 **Mã đơn hàng:** ${order._id}\n`;
      response += `💰 **Tổng tiền:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}\n`;
      response += `💳 **Thanh toán:** ${paymentMethod === 'COD' ? 'Khi nhận hàng' : 'VNPay'}\n`;
      response += `📍 **Giao đến:** ${userInfo.address.street}, ${userInfo.address.ward.name}\n`;
      response += `⏱️ **Dự kiến giao:** 2-3 ngày làm việc\n\n`;
      
      if (paymentMethod === 'VNPay') {
        response += `🔗 **Link thanh toán VNPay sẽ được gửi qua email.**\n\n`;
      }
      
      response += `📞 **Cần hỗ trợ?** Liên hệ hotline hoặc nói "Kiểm tra đơn hàng ${order._id}"`;

      return response;

    } catch (error) {
      this.log("Error confirming order:", error);
      return `❌ Lỗi tạo đơn hàng: ${error.message}. Vui lòng thử lại.`;
    }
  }

  async handleCheckOrderStatus(userId, orderId) {
    try {
      let orders;
      
      if (orderId) {
        // Check specific order
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
          return `❌ Không tìm thấy đơn hàng ${orderId} hoặc bạn không có quyền xem đơn hàng này.`;
        }
        orders = [order];
      } else {
        // Get recent orders
        orders = await Order.find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(3);
      }

      if (orders.length === 0) {
        return "📦 Bạn chưa có đơn hàng nào. Hãy mua sắm ngay!";
      }

      let response = orderId ? `📋 **Chi tiết đơn hàng ${orderId}:**\n\n` : `📦 **Đơn hàng gần đây:**\n\n`;
      
      orders.forEach((order, index) => {
        const statusEmoji = this.getStatusEmoji(order.status);
        const statusText = this.getStatusText(order.status);
        
        response += `${statusEmoji} **Đơn ${order._id}**\n`;
        response += `📅 ${new Date(order.createdAt).toLocaleDateString('vi-VN')}\n`;
        response += `💰 ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}\n`;
        response += `📊 Trạng thái: ${statusText}\n`;
        
        if (order.trackingNumber) {
          response += `🚚 Mã vận đơn: ${order.trackingNumber}\n`;
        }
        
        if (index < orders.length - 1) response += `\n`;
      });

      return response;

    } catch (error) {
      this.log("Error checking order status:", error);
      return "❌ Lỗi kiểm tra đơn hàng. Vui lòng thử lại.";
    }
  }

  async handleViewOrderDetails(userId, orderId) {
    if (!orderId) {
      return "🔍 Vui lòng cung cấp mã đơn hàng. Ví dụ: 'Xem chi tiết đơn hàng 123456'";
    }

    try {
      const order = await Order.findOne({ _id: orderId, user: userId })
        .populate('orderItems.product', 'name images');
      
      if (!order) {
        return `❌ Không tìm thấy đơn hàng ${orderId}.`;
      }

      const statusEmoji = this.getStatusEmoji(order.status);
      const statusText = this.getStatusText(order.status);
      
      let response = `📋 **Chi tiết đơn hàng ${order._id}**\n\n`;
      response += `📅 **Ngày đặt:** ${new Date(order.createdAt).toLocaleString('vi-VN')}\n`;
      response += `${statusEmoji} **Trạng thái:** ${statusText}\n`;
      response += `💳 **Thanh toán:** ${order.paymentMethod}\n\n`;
      
      response += `📦 **Sản phẩm:**\n`;
      order.orderItems.forEach(item => {
        response += `• ${item.name} x${item.quantity} - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}\n`;
      });
      
      response += `\n💰 **Tổng tiền:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}\n`;
      response += `🚚 **Phí ship:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.shippingPrice)}\n\n`;
      
      response += `📍 **Địa chỉ giao hàng:**\n${order.shippingAddress.street}, ${order.shippingAddress.ward.name}, ${order.shippingAddress.district.name}, ${order.shippingAddress.province.name}\n\n`;
      
      if (order.trackingNumber) {
        response += `🚚 **Mã vận đơn:** ${order.trackingNumber}\n`;
      }
      
      if (order.notes) {
        response += `📝 **Ghi chú:** ${order.notes}\n`;
      }

      return response;

    } catch (error) {
      this.log("Error viewing order details:", error);
      return "❌ Lỗi xem chi tiết đơn hàng. Vui lòng thử lại.";
    }
  }

  handleGeneralInfo(message) {
    return `🛍️ **Hướng dẫn đặt hàng tại Gaming Gear Shop:**\n\n` +
           `1️⃣ **Thêm sản phẩm vào giỏ:** "Mua chuột gaming"\n` +
           `2️⃣ **Xem giỏ hàng:** "Xem giỏ hàng"\n` +
           `3️⃣ **Đặt hàng:** "Tôi muốn đặt hàng"\n` +
           `4️⃣ **Chọn thanh toán:** COD hoặc VNPay\n` +
           `5️⃣ **Xác nhận:** "Đồng ý đặt hàng"\n\n` +
           `💳 **Phương thức thanh toán:**\n` +
           `• COD: Thanh toán khi nhận hàng\n` +
           `• VNPay: Thanh toán online an toàn\n\n` +
           `🚚 **Giao hàng:** 2-3 ngày toàn quốc\n` +
           `📞 **Hỗ trợ:** Liên hệ hotline 24/7`;
  }

  async calculateShippingFee(address) {
    try {
      const result = await ghnService.calculateShippingFee({
        to_district_id: address.district.id,
        to_ward_code: address.ward.code,
        weight: 500, // Default weight
        length: 30,
        width: 20,
        height: 10
      });
      
      return result.data?.total || 30000; // Fallback fee
    } catch (error) {
      this.log("Error calculating shipping fee:", error);
      return 30000; // Default shipping fee
    }
  }

  getStatusEmoji(status) {
    const statusMap = {
      'Processing': '⏳',
      'Shipped': '🚚',
      'Delivered': '✅',
      'Cancelled': '❌'
    };
    return statusMap[status] || '📦';
  }

  getStatusText(status) {
    const statusMap = {
      'Processing': 'Đang xử lý',
      'Shipped': 'Đang giao hàng',
      'Delivered': 'Đã giao hàng',
      'Cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
  }

  fallbackResponse(query) {
    return `🤖 Xin lỗi, tôi chưa hiểu yêu cầu "${query}".\n\n` +
           `💡 **Bạn có thể thử:**\n` +
           `• "Tôi muốn đặt hàng"\n` +
           `• "Tính phí ship"\n` +
           `• "Kiểm tra đơn hàng"\n` +
           `• "Thanh toán bằng COD"`;
  }
}

module.exports = AIOrderTool;