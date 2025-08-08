const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const mongoose = require("mongoose");
const Order = require("../../../models/orderModel");
const Cart = require("../../../models/cartModel");
const User = require("../../../models/userModel");
const Product = require("../../../models/productModel");
const ghnService = require("../../ghnService");

/**
 * OptimizedAIOrderTool - Simplified order management tool
 * Eliminates AI processing loops by using direct pattern matching and deterministic logic
 */
class OptimizedAIOrderTool extends StructuredTool {
  constructor(userContext = null) {
    super();
    this.name = "optimized_ai_order_tool";
    this.description = `Quản lý đơn hàng thông minh tối ưu. Sử dụng khi người dùng muốn đặt hàng, thanh toán, xem đơn hàng, tính phí ship. Từ khóa: đặt hàng, thanh toán, COD, VNPay, phí ship, đơn hàng, order, checkout. Chỉ hoạt động khi đã đăng nhập.`;
    this.userContext = userContext;
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    
    this.schema = z.object({
      query: z.string().describe("User's natural language query about order operations."),
    });

    // Pre-defined patterns for direct matching - NO AI NEEDED
    this.patterns = {
      startCheckout: [
        /đặt\s*hàng/i,
        /mua\s*hàng/i,
        /checkout/i,
        /thanh\s*toán/i,
        /bắt\s*đầu.*đặt/i
      ],
      calculateShipping: [
        /phí\s*ship/i,
        /phí\s*vận\s*chuyển/i,
        /tính.*ship/i,
        /shipping/i
      ],
      selectPaymentCOD: [
        /cod/i,
        /thanh\s*toán.*khi.*nhận/i,
        /chọn.*cod/i
      ],
      selectPaymentVNPay: [
        /vnpay/i,
        /thanh\s*toán.*online/i,
        /chọn.*vnpay/i
      ],
      confirmOrder: [
        /xác\s*nhận.*đơn/i,
        /đồng\s*ý.*đặt/i,
        /hoàn\s*tất/i,
        /confirm/i
      ],
      checkOrderStatus: [
        /kiểm\s*tra.*đơn/i,
        /trạng\s*thái.*đơn/i,
        /đơn\s*hàng.*của.*tôi/i,
        /order.*status/i
      ],
      viewOrderDetails: [
        /chi\s*tiết.*đơn/i,
        /xem.*đơn/i,
        /order.*details/i
      ]
    };
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[OptimizedAIOrderTool] ${message}`, ...args);
    }
  }

  updateUserContext(userContext) {
    this.log(`Updating userContext - old: ${this.userContext ? this.userContext.getUserId() : 'null'}, new: ${userContext ? userContext.getUserId() : 'null'}`);
    this.userContext = userContext;
  }

  // MAIN ENTRY POINT - NO AI PROCESSING
  async _call({ query }) {
    try {
      // Input validation
      if (!query || typeof query !== 'string') {
        this.log("Invalid query input:", query);
        return "❌ Yêu cầu không hợp lệ. Vui lòng thử lại." + "\n\n[TASK_COMPLETED: Invalid request]";
      }

      const userId = this.userContext ? this.userContext.getUserId() : null;
      
      if (!userId) {
        this.log(`No userId found - authentication required`);
        return "🔒 Để đặt hàng, bạn cần đăng nhập vào tài khoản." + "\n\n[TASK_COMPLETED: Authentication required]";
      }

      this.log(`Processing query: "${query}" for userId: ${userId}`);
      
      // DIRECT PATTERN MATCHING - NO AI NEEDED
      const action = this.detectAction(query);
      this.log(`Detected action:`, JSON.stringify(action));

      // Get context data only when needed
      const contextData = await this.getContextData(userId, action);
      this.log(`Context data loaded:`, Object.keys(contextData));

      // DIRECT HANDLER EXECUTION
      return await this.executeDirectAction(action, userId, contextData, query);

    } catch (error) {
      this.log("Error in OptimizedAIOrderTool:", error);
      return `❌ Lỗi xử lý đơn hàng: ${error.message}. Vui lòng thử lại sau.` + "\n\n[TASK_COMPLETED: Order processing error]";
    }
  }

  // PATTERN MATCHING - DETERMINISTIC, NO AI
  detectAction(query) {
    const lowerQuery = query.toLowerCase();
    
    // Check for order ID in query for specific actions
    const orderIdMatch = query.match(/([a-f0-9]{24})/i);
    
    if (orderIdMatch && mongoose.Types.ObjectId.isValid(orderIdMatch[1])) {
      if (this.patterns.viewOrderDetails.some(pattern => pattern.test(lowerQuery))) {
        return { type: 'viewOrderDetails', orderId: orderIdMatch[1] };
      }
      if (this.patterns.checkOrderStatus.some(pattern => pattern.test(lowerQuery))) {
        return { type: 'checkOrderStatus', orderId: orderIdMatch[1] };
      }
    }

    // Pattern matching for actions - prioritize specific actions first
    const actionPriority = [
      'confirmOrder',
      'selectPaymentCOD', 
      'selectPaymentVNPay',
      'calculateShipping',
      'checkOrderStatus',
      'viewOrderDetails',
      'startCheckout'
    ];
    
    for (const actionType of actionPriority) {
      if (this.patterns[actionType] && this.patterns[actionType].some(pattern => pattern.test(lowerQuery))) {
        return { type: actionType };
      }
    }

    // Default action based on context
    return { type: 'startCheckout' };
  }

  // SMART CONTEXT LOADING - Only load what's needed
  async getContextData(userId, action) {
    const data = {};
    
    // Always need user info for most actions
    if (['startCheckout', 'confirmOrder', 'calculateShipping', 'selectPaymentCOD', 'selectPaymentVNPay'].includes(action.type)) {
      data.userInfo = await this.getUserInfo(userId);
    }
    
    // Load cart only for checkout-related actions
    if (['startCheckout', 'confirmOrder'].includes(action.type)) {
      data.currentCart = await this.getCurrentCart(userId);
    }
    
    // Load recent orders only for order-related actions
    if (['checkOrderStatus', 'viewOrderDetails'].includes(action.type)) {
      data.recentOrders = await this.getRecentOrders(userId);
    }

    return data;
  }

  // DIRECT ACTION EXECUTION - NO AI LOOPS
  async executeDirectAction(action, userId, contextData, originalQuery) {
    const { type, orderId, paymentMethod } = action;
    
    try {
      switch (type) {
        case 'startCheckout':
          return await this.handleStartCheckout(userId, contextData.currentCart, contextData.userInfo);
        
        case 'calculateShipping':
          return await this.handleCalculateShipping(userId, contextData.userInfo);
        
        case 'selectPaymentCOD':
          return await this.handleSelectPaymentMethod(userId, 'COD');
        
        case 'selectPaymentVNPay':
          return await this.handleSelectPaymentMethod(userId, 'VNPay');
        
        case 'confirmOrder':
          return await this.handleConfirmOrder(userId, contextData.currentCart, contextData.userInfo);
        
        case 'checkOrderStatus':
          return await this.handleCheckOrderStatus(userId, orderId);
        
        case 'viewOrderDetails':
          return await this.handleViewOrderDetails(userId, orderId);
        
        default:
          return this.handleGeneralInfo();
      }
    } catch (error) {
      this.log(`Error in executeDirectAction for ${type}:`, error);
      return `❌ Lỗi xử lý yêu cầu: ${error.message}. Vui lòng thử lại.` + "\n\n[TASK_COMPLETED: Request processing error]";
    }
  }

  // EXISTING METHODS - UNCHANGED BUT OPTIMIZED
  async getCurrentCart(userId) {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        this.log("Invalid userId for getCurrentCart:", userId);
        return { isEmpty: true, itemCount: 0, totalPrice: 0, items: [] };
      }

      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        return { isEmpty: true, itemCount: 0, totalPrice: 0, items: [] };
      }

      // Filter out items with null/undefined products
      const validItems = cart.items.filter(item => item.product && item.product._id);
      
      if (validItems.length === 0) {
        return { isEmpty: true, itemCount: 0, totalPrice: 0, items: [] };
      }

      return {
        isEmpty: false,
        itemCount: validItems.length,
        totalPrice: cart.totalPrice || 0,
        items: validItems.map(item => ({
          productId: item.product._id,
          name: item.name, // Use cart item name, not product name
          quantity: item.quantity || 1,
          price: item.price, // Use cart item price, not product price
          image: item.image, // Use cart item image, not product image
          stock: item.product.stock || 0
        }))
      };
    } catch (error) {
      this.log("Error getting cart:", error);
      return { isEmpty: true, itemCount: 0, totalPrice: 0, items: [] };
    }
  }

  async getUserInfo(userId) {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        this.log("Invalid userId for getUserInfo:", userId);
        return { hasAddress: false, preferredPaymentMethod: 'COD', name: 'Khách hàng' };
      }

      const user = await User.findById(userId);
      if (!user) {
        this.log("User not found:", userId);
        return { hasAddress: false, preferredPaymentMethod: 'COD', name: 'Khách hàng' };
      }

      return {
        name: user.name || 'Khách hàng',
        email: user.email || '',
        phone: user.phone || '',
        hasAddress: !!(user.address && user.address.street && user.address.province),
        address: user.address || null,
        preferredPaymentMethod: user.chatbotPreferences?.preferredPaymentMethod || 'COD'
      };
    } catch (error) {
      this.log("Error getting user info:", error);
      return { hasAddress: false, preferredPaymentMethod: 'COD', name: 'Khách hàng' };
    }
  }

  async getRecentOrders(userId, limit = 3) {
    try {
      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id status totalPrice createdAt');
      
      return orders.map(order => ({
        id: order._id,
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt
      }));
    } catch (error) {
      this.log("Error getting recent orders:", error);
      return [];
    }
  }

  // OPTIMIZED HANDLERS - DIRECT RESPONSES
  async handleStartCheckout(userId, currentCart, userInfo) {
    try {
      if (!currentCart || currentCart.isEmpty) {
        return "🛒 Giỏ hàng của bạn đang trống. Hãy thêm sản phẩm vào giỏ hàng trước khi đặt hàng.\n\n💡 Bạn có thể nói: 'Mua chuột gaming' hoặc 'Thêm bàn phím cơ vào giỏ'" + "\n\n[TASK_COMPLETED: Empty cart]";
      }

      // Validate cart items
      if (!currentCart.items || !Array.isArray(currentCart.items)) {
        this.log("Invalid cart items structure:", currentCart);
        return "🛒 Giỏ hàng không hợp lệ. Vui lòng thử lại." + "\n\n[TASK_COMPLETED: Invalid cart]";
      }

      // Check stock availability
      const stockIssues = currentCart.items.filter(item => 
        item && item.quantity && item.stock !== undefined && item.quantity > item.stock
      );
      if (stockIssues.length > 0) {
        const issueList = stockIssues.map(item => `- ${item.name || 'Sản phẩm'}: còn ${item.stock}, bạn muốn ${item.quantity}`).join('\n');
        return `⚠️ Một số sản phẩm trong giỏ hàng không đủ số lượng:
${issueList}

Vui lòng cập nhật số lượng hoặc xóa sản phẩm hết hàng.` + "\n\n[TASK_COMPLETED: Stock quantity issues]";
      }

      let response = `🛍️ **Bắt đầu đặt hàng**\n\n`;
      response += `📦 **Sản phẩm trong giỏ (${currentCart.itemCount || currentCart.items.length} món):**\n`;
      
      currentCart.items.forEach(item => {
        if (item && item.name && item.quantity && item.price) {
          response += `• ${item.name} x${item.quantity} - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}\n`;
        }
      });
      
      response += `\n💰 **Tạm tính:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentCart.totalPrice || 0)}\n\n`;

      if (!userInfo || !userInfo.hasAddress) {
        response += `📍 **Cần cập nhật địa chỉ giao hàng**\nVui lòng cập nhật địa chỉ trong tài khoản để tính phí vận chuyển.\n\n`;
      } else {
        try {
          const shippingFee = await this.calculateShippingFee(userInfo.address);
          response += `🚚 **Phí vận chuyển:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(shippingFee)}\n`;
          response += `💳 **Tổng cộng:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((currentCart.totalPrice || 0) + shippingFee)}\n\n`;
        } catch (error) {
          this.log("Error calculating shipping in checkout:", error);
          response += `🚚 **Phí vận chuyển:** Đang tính toán...\n\n`;
        }
      }

      response += `💳 **Phương thức thanh toán:**\n`;
      response += `• COD (Thanh toán khi nhận hàng)\n`;
      response += `• VNPay (Thanh toán online)\n\n`;
      response += `✅ Để tiếp tục, hãy chọn: "Thanh toán bằng COD" hoặc "Thanh toán qua VNPay"`;

      return response + "\n\n[TASK_COMPLETED: Order checkout initiated]";
    } catch (error) {
      this.log("Error in handleStartCheckout:", error);
      return "❌ Lỗi khi bắt đầu đặt hàng. Vui lòng thử lại." + "\n\n[TASK_COMPLETED: Checkout start error]";
    }
  }

  async handleCalculateShipping(userId, userInfo) {
    try {
      if (!userInfo || !userInfo.hasAddress) {
        return "📍 Để tính phí vận chuyển, bạn cần cập nhật địa chỉ giao hàng trong tài khoản.\n\n💡 Vui lòng vào Tài khoản > Địa chỉ để cập nhật thông tin." + "\n\n[TASK_COMPLETED: Address required for shipping]";
      }

      if (!userInfo.address) {
        this.log("User has hasAddress=true but no address object:", userInfo);
        return "📍 Địa chỉ giao hàng không hợp lệ. Vui lòng cập nhật lại địa chỉ." + "\n\n[TASK_COMPLETED: Invalid address]";
      }

      this.log("Calculating shipping for address:", userInfo.address);
      const shippingFee = await this.calculateShippingFee(userInfo.address);
      const estimatedDays = 2;
      
      const provinceName = userInfo.address.province?.name || userInfo.address.province || 'địa chỉ của bạn';
      const wardName = userInfo.address.ward?.name || userInfo.address.ward || '';
      const districtName = userInfo.address.district?.name || userInfo.address.district || '';
      const street = userInfo.address.street || '';
      
      return `🚚 **Phí vận chuyển đến ${provinceName}:**\n\n` +
             `💰 **Phí ship:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(shippingFee)}\n` +
             `⏱️ **Thời gian giao hàng:** ${estimatedDays}-3 ngày làm việc\n` +
             `📍 **Địa chỉ:** ${[street, wardName, districtName, provinceName].filter(Boolean).join(', ')}` +
             "\n\n[TASK_COMPLETED: Shipping calculated]";
    } catch (error) {
      this.log("Error calculating shipping:", error);
      return "❌ Không thể tính phí vận chuyển lúc này. Vui lòng thử lại sau." + "\n\n[TASK_COMPLETED: Shipping calculation failed]";
    }
  }

  async handleSelectPaymentMethod(userId, paymentMethod) {
    try {
      if (!paymentMethod || !['COD', 'VNPay'].includes(paymentMethod)) {
        return "💳 **Chọn phương thức thanh toán:**\n\n" +
               "• **COD** - Thanh toán khi nhận hàng (tiện lợi, không cần thẻ)\n" +
               "• **VNPay** - Thanh toán online (nhanh chóng, bảo mật)\n\n" +
               "Hãy nói: 'Tôi chọn COD' hoặc 'Thanh toán qua VNPay'" + "\n\n[TASK_COMPLETED: Payment method options shown]";
      }

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        this.log("Invalid userId for payment method selection:", userId);
        return "❌ Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." + "\n\n[TASK_COMPLETED: Invalid session]";
      }

      // Update user preference
      try {
        const updateResult = await User.findByIdAndUpdate(userId, {
          'chatbotPreferences.preferredPaymentMethod': paymentMethod
        }, { new: true });
        
        if (!updateResult) {
          this.log("User not found when updating payment preference:", userId);
        } else {
          this.log("Payment preference updated successfully for user:", userId);
        }
      } catch (error) {
        this.log("Error updating payment preference:", error);
      }

      const methodName = paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán online qua VNPay';
      return `✅ **Đã chọn phương thức thanh toán:** ${methodName}\n\n` +
             `🎯 Để hoàn tất đặt hàng, hãy nói: "Tôi đồng ý đặt hàng" hoặc "Xác nhận đơn hàng"` +
             "\n\n[TASK_COMPLETED: Payment method selected]";
    } catch (error) {
      this.log("Error in handleSelectPaymentMethod:", error);
      return "❌ Lỗi khi chọn phương thức thanh toán. Vui lòng thử lại." + "\n\n[TASK_COMPLETED: Payment method selection error]";
    }
  }

  async handleConfirmOrder(userId, currentCart, userInfo) {
    try {
      if (!currentCart || currentCart.isEmpty) {
        return "🛒 Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng." + "\n\n[TASK_COMPLETED: Empty cart for order]";
      }

      if (!userInfo || !userInfo.hasAddress) {
        return "📍 Vui lòng cập nhật địa chỉ giao hàng trước khi đặt hàng." + "\n\n[TASK_COMPLETED: Address required for order]";
      }

      if (!userInfo.address) {
        this.log("User has hasAddress=true but no address object:", userInfo);
        return "📍 Địa chỉ giao hàng không hợp lệ. Vui lòng cập nhật lại địa chỉ." + "\n\n[TASK_COMPLETED: Invalid address for order]";
      }

      // Validate cart items
      if (!currentCart.items || !Array.isArray(currentCart.items) || currentCart.items.length === 0) {
        return "🛒 Giỏ hàng không có sản phẩm hợp lệ." + "\n\n[TASK_COMPLETED: No valid cart items]";
      }

      // Kiểm tra xem đã chọn phương thức thanh toán chưa
      if (!userInfo.preferredPaymentMethod) {
        return `💳 **Vui lòng chọn phương thức thanh toán trước khi đặt hàng:**\n\n` +
               `• **COD** - Thanh toán khi nhận hàng\n` +
               `• **VNPay** - Thanh toán online\n\n` +
               `Hãy nói: "Tôi chọn COD" hoặc "Thanh toán qua VNPay"` +
               "\n\n[TASK_COMPLETED: payment_method_required]";
      }

      // Calculate shipping fee
      const shippingFee = await this.calculateShippingFee(userInfo.address);
      const paymentMethod = userInfo.preferredPaymentMethod;
      
      // Check stock again before creating order
      const stockIssues = [];
      for (const item of currentCart.items) {
        if (!item || !item.productId) {
          this.log("Invalid cart item:", item);
          continue;
        }
        
        const product = await Product.findById(item.productId);
        if (!product || product.stock < item.quantity) {
          stockIssues.push(item.name || 'Sản phẩm không xác định');
        }
      }

      if (stockIssues.length > 0) {
        return `⚠️ Sản phẩm sau đã hết hàng: ${stockIssues.join(', ')}. Vui lòng cập nhật giỏ hàng.` + "\n\n[TASK_COMPLETED: Out of stock items]";
      }

      // Filter valid items for order creation
      const validItems = currentCart.items.filter(item => 
        item && item.productId && item.name && item.quantity > 0 && item.price > 0
      );

      if (validItems.length === 0) {
        return "🛒 Không có sản phẩm hợp lệ để tạo đơn hàng." + "\n\n[TASK_COMPLETED: No valid products for order]";
      }

      // Create order
      const orderData = {
        user: userId,
        orderItems: validItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          image: item.image || '',
          price: item.price,
          product: item.productId
        })),
        shippingAddress: userInfo.address,
        paymentMethod: paymentMethod,
        taxPrice: 0,
        shippingPrice: shippingFee,
        totalPrice: (currentCart.totalPrice || 0) + shippingFee,
        chatbotOrder: true,
        orderSource: 'chatbot'
      };

      this.log("Creating order with data:", { ...orderData, orderItems: orderData.orderItems.length + ' items' });
      const order = await Order.create(orderData);
      this.log("Order created successfully:", order._id);

      // Update product stock
      for (const item of validItems) {
        try {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity, sold: item.quantity }
          });
        } catch (stockError) {
          this.log("Error updating stock for product:", item.productId, stockError);
        }
      }

      // Clear cart
      try {
        await Cart.findOneAndDelete({ user: userId });
      } catch (cartError) {
        this.log("Error clearing cart:", cartError);
      }

      const wardName = userInfo.address.ward?.name || userInfo.address.ward || '';
      const street = userInfo.address.street || '';
      
      let response = `🎉 **Đặt hàng thành công!**\n\n`;
      response += `📋 **Mã đơn hàng:** ${order._id}\n`;
      response += `💰 **Tổng tiền:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}\n`;
      response += `💳 **Thanh toán:** ${paymentMethod === 'COD' ? 'Khi nhận hàng' : 'VNPay'}\n`;
      response += `📍 **Giao đến:** ${[street, wardName].filter(Boolean).join(', ')}\n`;
      response += `⏱️ **Dự kiến giao:** 2-3 ngày làm việc\n\n`;
      
      if (paymentMethod === 'VNPay') {
        response += `🔗 **Link thanh toán VNPay sẽ được gửi qua email.**\n\n`;
      }
      
      response += `📞 **Cần hỗ trợ?** Liên hệ hotline hoặc nói "Kiểm tra đơn hàng ${order._id}"`;

      return response + "\n\n[TASK_COMPLETED: Order confirmed successfully]";

    } catch (error) {
      this.log("Error confirming order:", error);
      return `❌ Lỗi tạo đơn hàng: ${error.message}. Vui lòng thử lại.` + "\n\n[TASK_COMPLETED: Order creation error]";
    }
  }

  async handleCheckOrderStatus(userId, orderId) {
    try {
      let orders;
      
      if (orderId) {
        // Validate orderId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
          return `❌ Mã đơn hàng "${orderId}" không hợp lệ. Vui lòng kiểm tra lại.` + "\n\n[TASK_COMPLETED: Invalid order ID format]";
        }
        
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
          return `❌ Không tìm thấy đơn hàng ${orderId} hoặc bạn không có quyền xem đơn hàng này.` + "\n\n[TASK_COMPLETED: Order not found or no permission]";
        }
        orders = [order];
      } else {
        orders = await Order.find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(3);
      }

      if (orders.length === 0) {
        return "📦 Bạn chưa có đơn hàng nào. Hãy mua sắm ngay!" + "\n\n[TASK_COMPLETED: No orders found]";
      }

      let response = orderId ? `📋 **Chi tiết đơn hàng ${orderId}:**\n\n` : `📦 **Đơn hàng gần đây:**\n\n`;
      
      orders.forEach((order, index) => {
        if (order && order._id) {
          const statusEmoji = this.getStatusEmoji(order.status);
          const statusText = this.getStatusText(order.status);
          
          response += `${statusEmoji} **Đơn ${order._id}**\n`;
          response += `📅 ${new Date(order.createdAt).toLocaleDateString('vi-VN')}\n`;
          response += `💰 ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice || 0)}\n`;
          response += `📊 Trạng thái: ${statusText}\n`;
          
          if (order.trackingNumber) {
            response += `🚚 Mã vận đơn: ${order.trackingNumber}\n`;
          }
          
          if (index < orders.length - 1) response += `\n`;
        }
      });

      return response + "\n\n[TASK_COMPLETED: Order status checked]";

    } catch (error) {
      this.log("Error checking order status:", error);
      return `❌ Lỗi kiểm tra đơn hàng: ${error.message}. Vui lòng thử lại.` + "\n\n[TASK_COMPLETED: Order status check error]";
    }
  }

  async handleViewOrderDetails(userId, orderId) {
    try {
      if (!orderId) {
        return "🔍 Vui lòng cung cấp mã đơn hàng. Ví dụ: 'Xem chi tiết đơn hàng 123456'" + "\n\n[TASK_COMPLETED: Order ID required]";
      }

      // Validate orderId
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return `❌ Mã đơn hàng "${orderId}" không hợp lệ. Vui lòng kiểm tra lại.` + "\n\n[TASK_COMPLETED: Invalid order ID for details]";
      }

      this.log(`Viewing order details for orderId: ${orderId}, userId: ${userId}`);
      const order = await Order.findOne({ _id: orderId, user: userId })
        .populate('orderItems.product', 'name images');
      
      if (!order) {
        return `❌ Không tìm thấy đơn hàng ${orderId}.` + "\n\n[TASK_COMPLETED: Order details not found]";
      }

      const statusEmoji = this.getStatusEmoji(order.status);
      const statusText = this.getStatusText(order.status);
      
      let response = `📋 **Chi tiết đơn hàng ${order._id}**\n\n`;
      response += `📅 **Ngày đặt:** ${new Date(order.createdAt).toLocaleString('vi-VN')}\n`;
      response += `${statusEmoji} **Trạng thái:** ${statusText}\n`;
      response += `💳 **Thanh toán:** ${order.paymentMethod}\n\n`;
      
      if (order.orderItems && order.orderItems.length > 0) {
        response += `📦 **Sản phẩm:**\n`;
        order.orderItems.forEach(item => {
          if (item && item.name && item.quantity && item.price) {
            response += `• ${item.name} x${item.quantity} - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}\n`;
          }
        });
      } else {
        response += `📦 **Sản phẩm:** Không có thông tin sản phẩm\n`;
      }
      
      response += `\n💰 **Tổng tiền:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice || 0)}\n`;
      response += `🚚 **Phí ship:** ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.shippingPrice || 0)}\n\n`;
      
      if (order.shippingAddress) {
        const address = order.shippingAddress;
        const addressParts = [
          address.street,
          address.ward?.name || address.ward,
          address.district?.name || address.district,
          address.province?.name || address.province
        ].filter(Boolean);
        
        response += `📍 **Địa chỉ giao hàng:**\n${addressParts.join(', ')}\n\n`;
      }
      
      if (order.trackingNumber) {
        response += `🚚 **Mã vận đơn:** ${order.trackingNumber}\n`;
      }
      
      if (order.notes) {
        response += `📝 **Ghi chú:** ${order.notes}\n`;
      }

      return response + "\n\n[TASK_COMPLETED: Order details viewed]";

    } catch (error) {
      this.log("Error viewing order details:", error);
      return `❌ Lỗi xem chi tiết đơn hàng: ${error.message}. Vui lòng thử lại.` + "\n\n[TASK_COMPLETED: Order details view error]";
    }
  }

  handleGeneralInfo() {
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
           `📞 **Hỗ trợ:** Liên hệ hotline 24/7` +
           "\n\n[TASK_COMPLETED: General info provided]";
  }

  async calculateShippingFee(address) {
    try {
      // Validate address structure
      if (!address || !address.district || !address.ward) {
        this.log("Invalid address structure for shipping calculation:", address);
        return 30000; // Default shipping fee
      }

      const shippingParams = {
        to_district_id: address.district.id || address.district,
        to_ward_code: address.ward.code || address.ward,
        weight: 500,
        length: 30,
        width: 20,
        height: 10
      };

      this.log("Calculating shipping with params:", shippingParams);
      
      const result = await ghnService.calculateShippingFee(shippingParams);
      
      const shippingFee = result?.data?.total || result?.total || 30000;
      this.log("Calculated shipping fee:", shippingFee);
      
      return shippingFee;
    } catch (error) {
      this.log("Error calculating shipping fee:", error);
      return 30000; // Default fallback fee
    }
  }

  getStatusEmoji(status) {
    const statusMap = {
      'Processing': '⏳',
      'Shipped': '🚚',
      'Delivered': '✅',
      'Cancelled': '❌',
      'pending': '⏳',
      'processing': '📦',
      'shipped': '🚚',
      'delivered': '✅',
      'cancelled': '❌',
      'confirmed': '✅',
      'preparing': '👨‍🍳',
      'ready': '🎯'
    };
    return statusMap[status] || '📦';
  }

  getStatusText(status) {
    const statusMap = {
      'Processing': 'Đang xử lý',
      'Shipped': 'Đang giao hàng',
      'Delivered': 'Đã giao hàng',
      'Cancelled': 'Đã hủy',
      'pending': 'Chờ xử lý',
      'processing': 'Đang xử lý',
      'shipped': 'Đang giao hàng',
      'delivered': 'Đã giao hàng',
      'cancelled': 'Đã hủy',
      'confirmed': 'Đã xác nhận',
      'preparing': 'Đang chuẩn bị',
      'ready': 'Sẵn sàng giao hàng'
    };
    return statusMap[status] || status;
  }
}

module.exports = OptimizedAIOrderTool;