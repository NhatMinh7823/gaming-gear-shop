// OrderFlowManager.js
const OrderIntentDetector = require('./OrderIntentDetector');
const OrderTool = require('../tools/order/OrderTool');
const Cart = require('../../models/cartModel');

/**
 * Order Flow Manager - Manages conversation flow for order placement
 * Handles state transitions and orchestrates the order process
 */
class OrderFlowManager {
  constructor(userContext, ghnService = null) {
    this.userContext = userContext;
    this.ghnService = ghnService;
    this.orderTool = new OrderTool(userContext, ghnService);
    
    // Order flow states
    this.FLOW_STATES = {
      IDLE: 'IDLE',
      ORDER_INITIATED: 'ORDER_INITIATED',
      CART_VALIDATED: 'CART_VALIDATED',
      ADDRESS_SELECTION: 'ADDRESS_SELECTION',
      ADDRESS_SELECTED: 'ADDRESS_SELECTED',
      SHIPPING_CALCULATED: 'SHIPPING_CALCULATED',
      PAYMENT_SELECTION: 'PAYMENT_SELECTION',
      PAYMENT_SELECTED: 'PAYMENT_SELECTED',
      SUMMARY_SHOWN: 'SUMMARY_SHOWN',
      ORDER_CREATED: 'ORDER_CREATED',
      ERROR_STATE: 'ERROR_STATE'
    };

    // Session state storage (in production, use Redis or database)
    this.sessionStates = new Map();
  }

  /**
   * Get current session state
   */
  getSessionState(sessionId) {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, {
        currentState: this.FLOW_STATES.IDLE,
        orderContext: {},
        lastActivity: new Date(),
        conversationHistory: [],
        errorCount: 0
      });
    }
    return this.sessionStates.get(sessionId);
  }

  /**
   * Update session state
   */
  updateSessionState(sessionId, updates) {
    const currentState = this.getSessionState(sessionId);
    this.sessionStates.set(sessionId, {
      ...currentState,
      ...updates,
      lastActivity: new Date()
    });
  }

  /**
   * Main order flow handler
   */
  async handleOrderFlow(message, sessionId, additionalContext = {}) {
    try {
      const sessionState = this.getSessionState(sessionId);
      const userId = this.userContext?.getUserId();

      if (!userId) {
        return {
          success: false,
          message: "❌ Bạn cần đăng nhập để đặt hàng. Vui lòng đăng nhập trước!",
          requiresAuth: true
        };
      }

      // Build conversation context
      const conversationContext = await this.buildConversationContext(sessionState, additionalContext);

      // Detect order intent
      const intentResult = OrderIntentDetector.detectOrderIntent(message, conversationContext);
      
      console.log(`[OrderFlowManager] Intent detected:`, {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        trigger: intentResult.trigger,
        currentState: sessionState.currentState
      });

      // Handle based on intent and current state
      const response = await this.processOrderIntent(
        intentResult, 
        message, 
        sessionId, 
        sessionState, 
        conversationContext
      );

      // Update conversation history
      this.updateConversationHistory(sessionId, message, response);

      return response;

    } catch (error) {
      console.error('[OrderFlowManager] Error handling order flow:', error);
      return this.handleError(sessionId, error);
    }
  }

  /**
   * Process order intent based on current state
   */
  async processOrderIntent(intentResult, message, sessionId, sessionState, context) {
    const { intent, trigger, confidence } = intentResult;

    // If no order intent detected and not in order flow, return null (let other handlers process)
    if (!trigger && sessionState.currentState === this.FLOW_STATES.IDLE) {
      return null;
    }

    // Handle different intents
    switch (intent) {
      case 'ORDER_REQUEST':
        return await this.initiateOrderFlow(sessionId);

      case 'ORDER_CONFIRMATION':
        return await this.handleConfirmation(sessionId, message, context);

      case 'ORDER_CANCELLATION':
        return await this.handleCancellation(sessionId);

      case 'ADDRESS_SELECTION':
        return await this.handleAddressSelection(sessionId, message, context);

      case 'PAYMENT_SELECTION':
        return await this.handlePaymentSelection(sessionId, message, context);

      case 'ORDER_SUMMARY':
        return await this.showOrderSummary(sessionId);

      case 'ORDER_STATUS':
        return await this.checkOrderStatus(sessionId, message);

      case 'ORDER_CONTEXT':
        return await this.handleContextualOrder(sessionId, message, context);

      default:
        // Handle based on current state
        return await this.handleCurrentState(sessionId, message, context);
    }
  }

  /**
   * Initiate order flow
   */
  async initiateOrderFlow(sessionId) {
    try {
      // Check if user needs onboarding
      const userId = this.userContext.getUserId();
      const user = await require('../../models/userModel').findById(userId);
      
      if (!user.chatbotPreferences?.hasSeenOnboarding) {
        const onboardingResponse = await this.showOnboarding(sessionId);
        return onboardingResponse;
      }

      // Start order process
      const result = await this.orderTool._call({ action: 'initiate_order' });

      if (result.success) {
        this.updateSessionState(sessionId, {
          currentState: this.FLOW_STATES.CART_VALIDATED,
          orderContext: {
            cart: result.cart,
            validation: result.validation,
            subtotal: result.subtotal
          }
        });
      } else {
        this.updateSessionState(sessionId, {
          currentState: this.FLOW_STATES.ERROR_STATE,
          orderContext: { error: result.message }
        });
      }

      return {
        success: result.success,
        message: result.message,
        orderFlow: true,
        nextStep: result.nextStep
      };

    } catch (error) {
      console.error('Error initiating order flow:', error);
      return this.handleError(sessionId, error);
    }
  }

  /**
   * Show user onboarding for first-time order users
   */
  async showOnboarding(sessionId) {
    const onboardingMessage = `🎉 **Chào mừng bạn đến với tính năng đặt hàng thông minh!**

✨ **Điều gì mới?**
Bây giờ bạn có thể đặt hàng hoàn toàn qua chat mà không cần rời khỏi cuộc trò chuyện!

🚀 **Cách sử dụng:**
• Chỉ cần nói: "Đặt hàng" hoặc "Mua"
• Tôi sẽ hướng dẫn bạn từng bước
• Chọn địa chỉ, thanh toán và xác nhận

💡 **Ví dụ:**
• "Đặt hàng tất cả trong giỏ"
• "Mua laptop và giao về nhà"  
• "Thanh toán COD cho đơn hàng này"

🎯 **Lợi ích:**
✅ Nhanh chóng và tiện lợi
✅ Không cần chuyển trang
✅ Hỗ trợ 24/7

Bạn đã sẵn sàng thử ngay chưa? Hãy nói "Đặt hàng" để bắt đầu! 🛒

*Nhập "Tiếp tục" để bắt đầu đặt hàng hoặc "Bỏ qua" để xem sau.*`;

    // Mark user as seen onboarding
    const userId = this.userContext.getUserId();
    await require('../../models/userModel').findByIdAndUpdate(
      userId,
      { 'chatbotPreferences.hasSeenOnboarding': true }
    );

    this.updateSessionState(sessionId, {
      currentState: this.FLOW_STATES.ORDER_INITIATED,
      orderContext: { showingOnboarding: true }
    });

    return {
      success: true,
      message: onboardingMessage,
      orderFlow: true,
      onboarding: true,
      nextStep: 'continue_or_skip'
    };
  }

  /**
   * Handle confirmation responses
   */
  async handleConfirmation(sessionId, message, context) {
    const sessionState = this.getSessionState(sessionId);
    const orderInfo = OrderIntentDetector.extractOrderInfo(message, context);

    switch (sessionState.currentState) {
      case this.FLOW_STATES.ORDER_INITIATED:
      case this.FLOW_STATES.CART_VALIDATED:
        // User confirmed to proceed with order
        return await this.proceedToAddressSelection(sessionId);

      case this.FLOW_STATES.ADDRESS_SELECTION:
        // User selected address
        return await this.handleAddressSelection(sessionId, message, context);

      case this.FLOW_STATES.PAYMENT_SELECTION:
        // User selected payment method
        return await this.handlePaymentSelection(sessionId, message, context);

      case this.FLOW_STATES.SUMMARY_SHOWN:
        // User confirmed final order
        return await this.confirmFinalOrder(sessionId, orderInfo.confirmation);

      default:
        return await this.handleCurrentState(sessionId, message, context);
    }
  }

  /**
   * Handle order cancellation
   */
  async handleCancellation(sessionId) {
    this.updateSessionState(sessionId, {
      currentState: this.FLOW_STATES.IDLE,
      orderContext: {}
    });

    return {
      success: true,
      message: `❌ **ĐÃ HỦY ĐẶT HÀNG**

Quá trình đặt hàng đã được hủy. Giỏ hàng của bạn vẫn được giữ nguyên.

🛒 **Muốn đặt hàng lại?** Chỉ cần nói "Đặt hàng"
🛍️ **Tiếp tục mua sắm?** Tôi có thể giúp bạn tìm sản phẩm khác!`,
      orderFlow: false,
      cancelled: true
    };
  }

  /**
   * Proceed to address selection
   */
  async proceedToAddressSelection(sessionId) {
    const result = await this.orderTool._call({ action: 'select_address' });

    if (result.success) {
      if (result.needsSelection) {
        this.updateSessionState(sessionId, {
          currentState: this.FLOW_STATES.ADDRESS_SELECTION,
          orderContext: {
            ...this.getSessionState(sessionId).orderContext,
            addresses: result.addresses,
            needsAddressSelection: true
          }
        });
      } else if (result.selectedAddress) {
        this.updateSessionState(sessionId, {
          currentState: this.FLOW_STATES.ADDRESS_SELECTED,
          orderContext: {
            ...this.getSessionState(sessionId).orderContext,
            selectedAddress: result.selectedAddress
          }
        });
        // Proceed to shipping calculation
        return await this.calculateShipping(sessionId);
      }
    } else {
      this.updateSessionState(sessionId, {
        currentState: this.FLOW_STATES.ERROR_STATE,
        orderContext: {
          ...this.getSessionState(sessionId).orderContext,
          error: result.message
        }
      });
    }

    return {
      success: result.success,
      message: result.message,
      orderFlow: true,
      needsAddressSelection: result.needsSelection,
      addresses: result.addresses
    };
  }

  /**
   * Handle address selection
   */
  async handleAddressSelection(sessionId, message, context) {
    const orderInfo = OrderIntentDetector.extractOrderInfo(message, context);
    let addressId = 'default';

    // Extract address selection from message
    if (orderInfo.addressSelection) {
      addressId = orderInfo.addressSelection.toString();
    } else if (message.includes('1') || message.includes('mặc định') || message.includes('default')) {
      addressId = 'default';
    }

    const result = await this.orderTool._call({ 
      action: 'select_address', 
      addressId: addressId 
    });

    if (result.success) {
      this.updateSessionState(sessionId, {
        currentState: this.FLOW_STATES.ADDRESS_SELECTED,
        orderContext: {
          ...this.getSessionState(sessionId).orderContext,
          selectedAddress: result.selectedAddress
        }
      });

      // Proceed to shipping calculation
      return await this.calculateShipping(sessionId);
    }

    return {
      success: result.success,
      message: result.message,
      orderFlow: true
    };
  }

  /**
   * Calculate shipping
   */
  async calculateShipping(sessionId) {
    const result = await this.orderTool._call({ action: 'calculate_shipping' });

    if (result.success) {
      this.updateSessionState(sessionId, {
        currentState: this.FLOW_STATES.SHIPPING_CALCULATED,
        orderContext: {
          ...this.getSessionState(sessionId).orderContext,
          shippingInfo: result.shippingInfo
        }
      });

      // Proceed to payment selection
      const paymentResult = await this.orderTool._call({ action: 'select_payment' });
      
      if (paymentResult.success) {
        this.updateSessionState(sessionId, {
          currentState: this.FLOW_STATES.PAYMENT_SELECTION,
          orderContext: {
            ...this.getSessionState(sessionId).orderContext,
            needsPaymentSelection: true
          }
        });

        return {
          success: true,
          message: result.message + '\n\n' + paymentResult.message,
          orderFlow: true,
          needsPaymentSelection: true
        };
      }
    }

    return {
      success: result.success,
      message: result.message,
      orderFlow: true
    };
  }

  /**
   * Handle payment method selection
   */
  async handlePaymentSelection(sessionId, message, context) {
    const orderInfo = OrderIntentDetector.extractOrderInfo(message, context);
    let paymentMethod = orderInfo.paymentMethod;

    // Extract payment method from message if not detected
    if (!paymentMethod) {
      const normalizedMessage = message.toLowerCase().trim();
      if (normalizedMessage.includes('cod') || normalizedMessage === '1') {
        paymentMethod = 'COD';
      } else if (normalizedMessage.includes('vnpay') || normalizedMessage === '2') {
        paymentMethod = 'VNPay';
      }
    }

    if (!paymentMethod) {
      return {
        success: false,
        message: `❌ Vui lòng chọn phương thức thanh toán hợp lệ:
        
**1. COD** - Thanh toán khi nhận hàng
**2. VNPay** - Thanh toán online

Nhập "COD" hoặc "VNPay" để chọn.`,
        orderFlow: true,
        needsPaymentSelection: true
      };
    }

    console.log(`[OrderFlowManager] Processing payment method: ${paymentMethod}`);

    const result = await this.orderTool._call({ 
      action: 'select_payment', 
      paymentMethod: paymentMethod 
    });

    if (result.success) {
      console.log(`[OrderFlowManager] Payment selection successful, updating state to PAYMENT_SELECTED`);
      
      this.updateSessionState(sessionId, {
        currentState: this.FLOW_STATES.PAYMENT_SELECTED,
        orderContext: {
          ...this.getSessionState(sessionId).orderContext,
          paymentMethod: paymentMethod
        }
      });

      // Proceed to order summary
      console.log(`[OrderFlowManager] Proceeding to order summary`);
      const summaryResult = await this.showOrderSummary(sessionId);
      
      if (summaryResult.success) {
        console.log(`[OrderFlowManager] Order summary shown successfully`);
        return summaryResult;
      } else {
        console.error(`[OrderFlowManager] Failed to show order summary:`, summaryResult);
        return {
          success: false,
          message: `✅ **ĐÃ CHỌN THANH TOÁN**

${paymentMethod === 'COD' ? '💵' : '🏦'} **${paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'VNPay - Thanh toán online'}**

📋 **Bước tiếp theo:** Xem tóm tắt đơn hàng
Nhập **"xem đơn hàng"** hoặc **"tóm tắt"** để tiếp tục.`,
          orderFlow: true,
          paymentSelected: true,
          nextStep: 'show_summary'
        };
      }
    }

    return {
      success: result.success,
      message: result.message,
      orderFlow: true
    };
  }

  /**
   * Show order summary
   */
  async showOrderSummary(sessionId) {
    const result = await this.orderTool._call({ action: 'show_summary' });

    if (result.success) {
      this.updateSessionState(sessionId, {
        currentState: this.FLOW_STATES.SUMMARY_SHOWN,
        orderContext: {
          ...this.getSessionState(sessionId).orderContext,
          orderSummary: result.orderSummary,
          needsConfirmation: true
        }
      });
    }

    return {
      success: result.success,
      message: result.message,
      orderFlow: true,
      needsConfirmation: result.needsConfirmation,
      orderSummary: result.orderSummary
    };
  }

  /**
   * Confirm final order
   */
  async confirmFinalOrder(sessionId, confirmed) {
    const result = await this.orderTool._call({ 
      action: 'confirm_order', 
      confirmOrder: confirmed 
    });

    if (result.success) {
      this.updateSessionState(sessionId, {
        currentState: this.FLOW_STATES.ORDER_CREATED,
        orderContext: {
          ...this.getSessionState(sessionId).orderContext,
          createdOrder: result.order
        }
      });

      // Reset state after successful order
      setTimeout(() => {
        this.updateSessionState(sessionId, {
          currentState: this.FLOW_STATES.IDLE,
          orderContext: {}
        });
      }, 1000);
    }

    return {
      success: result.success,
      message: result.message,
      orderFlow: result.success ? false : true, // End flow if successful
      order: result.order
    };
  }

  /**
   * Handle contextual order (when user has items in cart)
   */
  async handleContextualOrder(sessionId, message, context) {
    // Similar to ORDER_REQUEST but with lower confidence
    return await this.initiateOrderFlow(sessionId);
  }

  /**
   * Handle current state when no specific intent detected
   */
  async handleCurrentState(sessionId, message, context) {
    const sessionState = this.getSessionState(sessionId);

    switch (sessionState.currentState) {
      case this.FLOW_STATES.ADDRESS_SELECTION:
        return await this.handleAddressSelection(sessionId, message, context);

      case this.FLOW_STATES.PAYMENT_SELECTION:
        return await this.handlePaymentSelection(sessionId, message, context);

      case this.FLOW_STATES.SUMMARY_SHOWN:
        return {
          success: false,
          message: `📋 **XÁC NHẬN ĐƠN HÀNG**
          
Vui lòng xác nhận đặt hàng bằng cách nhập:
• **"Có"** - để xác nhận đặt hàng
• **"Không"** - để hủy đơn hàng`,
          orderFlow: true,
          needsConfirmation: true
        };

      default:
        // If in order flow but no specific handler, provide guidance
        if (sessionState.currentState !== this.FLOW_STATES.IDLE) {
          return {
            success: false,
            message: `🤔 **CẦN HỖ TRỢ**
            
Tôi không hiểu yêu cầu của bạn. Trong quá trình đặt hàng, bạn có thể:
• Nhập **"Hủy"** để hủy đặt hàng
• Nhập **"Trợ giúp"** để xem hướng dẫn
• Hoặc làm theo hướng dẫn ở tin nhắn trước`,
            orderFlow: true
          };
        }
        
        // Not in order flow, return null to let other handlers process
        return null;
    }
  }

  /**
   * Check order status
   */
  async checkOrderStatus(sessionId, message) {
    // Extract order ID from message if provided
    const orderIdMatch = message.match(/#?DH(\w+)/i);
    const orderId = orderIdMatch ? orderIdMatch[1] : null;

    const result = await this.orderTool._call({ 
      action: 'check_status', 
      orderId: orderId 
    });

    return {
      success: result.success,
      message: result.message,
      orderFlow: false,
      orders: result.orders,
      order: result.order
    };
  }

  /**
   * Build conversation context for intent detection
   */
  async buildConversationContext(sessionState, additionalContext = {}) {
    const userId = this.userContext?.getUserId();
    let hasCartItems = false;

    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      hasCartItems = cart && cart.items && cart.items.length > 0;
    }

    return {
      isInOrderFlow: sessionState.currentState !== this.FLOW_STATES.IDLE,
      currentStep: sessionState.currentState,
      hasCartItems: hasCartItems,
      needsConfirmation: sessionState.orderContext?.needsConfirmation || false,
      needsAddressSelection: sessionState.orderContext?.needsAddressSelection || false,
      needsPaymentSelection: sessionState.orderContext?.needsPaymentSelection || false,
      ...additionalContext
    };
  }

  /**
   * Update conversation history
   */
  updateConversationHistory(sessionId, userMessage, response) {
    const sessionState = this.getSessionState(sessionId);
    const history = sessionState.conversationHistory || [];
    
    history.push({
      timestamp: new Date(),
      userMessage: userMessage,
      botResponse: response?.message || '',
      state: sessionState.currentState,
      success: response?.success || false
    });

    // Keep only last 10 messages to prevent memory issues
    if (history.length > 10) {
      history.shift();
    }

    this.updateSessionState(sessionId, {
      conversationHistory: history
    });
  }

  /**
   * Handle errors gracefully
   */
  handleError(sessionId, error) {
    console.error('[OrderFlowManager] Error:', error);
    
    const sessionState = this.getSessionState(sessionId);
    sessionState.errorCount = (sessionState.errorCount || 0) + 1;

    this.updateSessionState(sessionId, {
      currentState: this.FLOW_STATES.ERROR_STATE,
      orderContext: {
        ...sessionState.orderContext,
        error: error.message
      },
      errorCount: sessionState.errorCount
    });

    return {
      success: false,
      message: `❌ **LỖI XỬ LÝ**

Có lỗi xảy ra trong quá trình đặt hàng. Vui lòng thử lại!

🔄 **Thử lại:** Nói "Đặt hàng lại"
📞 **Hỗ trợ:** Liên hệ nếu vấn đề tiếp diễn

*Lỗi: ${error.message}*`,
      orderFlow: false,
      error: true
    };
  }

  /**
   * Reset order flow (for testing or recovery)
   */
  resetOrderFlow(sessionId) {
    this.updateSessionState(sessionId, {
      currentState: this.FLOW_STATES.IDLE,
      orderContext: {},
      errorCount: 0
    });
  }

  /**
   * Get flow state for debugging
   */
  getFlowState(sessionId) {
    return this.getSessionState(sessionId);
  }
}

module.exports = OrderFlowManager;
