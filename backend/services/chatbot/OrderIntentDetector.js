// OrderIntentDetector.js
/**
 * Order Intent Detection for Chatbot
 * Detects when user wants to place an order and determines confidence level
 */
class OrderIntentDetector {
  
  // Primary order keywords (high confidence)
  static PRIMARY_ORDER_KEYWORDS = [
    'đặt hàng', 'đặt mua', 'đặt', 'mua hàng', 'mua ngay', 'mua', 'order', 
    'checkout', 'thanh toán', 'đặt đơn', 'đặt hàng ngay', 'buy now'
  ];

  // Secondary order keywords (medium confidence)
  static SECONDARY_ORDER_KEYWORDS = [
    'giao hàng', 'delivery', 'ship', 'shipping', 'vận chuyển',
    'thanh toán cod', 'thanh toán vnpay',
    'địa chỉ giao hàng', 'giao về', 'giao đến'
  ];

  // Contextual phrases that indicate order intent
  static CONTEXTUAL_PHRASES = [
    'trong giỏ', 'giỏ hàng', 'cart', 'tất cả sản phẩm',
    'hoàn tất', 'xác nhận', 'confirm', 'tiếp tục',
    'proceed', 'next step', 'bước tiếp theo'
  ];

  // Confirmation keywords
  static CONFIRMATION_KEYWORDS = [
    'có', 'yes', 'ok', 'okay', 'được', 'đồng ý', 'agree',
    'xác nhận', 'confirm', 'chắc chắn', 'sure'
  ];

  // Cancel/negative keywords
  static CANCEL_KEYWORDS = [
    'không', 'no', 'hủy', 'cancel', 'dừng', 'stop',
    'thôi', 'quit', 'exit', 'từ chối', 'refuse'
  ];

  // Flow-specific keywords
  static FLOW_KEYWORDS = {
    ADDRESS: ['địa chỉ', 'address', 'giao đến', 'ship to', 'delivery address'],
    PAYMENT: ['cod', 'vnpay', 'thanh toán', 'payment', 'pay'],
    SUMMARY: ['tóm tắt', 'summary', 'xem đơn', 'review', 'check order'],
    STATUS: ['trạng thái', 'status', 'theo dõi', 'track', 'kiểm tra đơn']
  };

  /**
   * Main intent detection method
   * @param {string} message - User message to analyze
   * @param {Object} context - Conversation context
   * @returns {Object} Intent detection results
   */
  static detectOrderIntent(message, context = {}) {
    if (!message || typeof message !== 'string') {
      return this.createIntentResult('NO_ORDER', 0.0, false);
    }

    const normalizedMessage = this.normalizeMessage(message);
    const words = normalizedMessage.split(/\s+/);

    // Check for direct order intent
    const directIntent = this.checkDirectOrderIntent(normalizedMessage, words);
    if (directIntent.trigger) {
      return directIntent;
    }

    // Check for contextual order intent
    const contextualIntent = this.checkContextualOrderIntent(normalizedMessage, context);
    if (contextualIntent.trigger) {
      return contextualIntent;
    }

    // Check for confirmation in order flow
    const confirmationIntent = this.checkConfirmationIntent(normalizedMessage, context);
    if (confirmationIntent.trigger) {
      return confirmationIntent;
    }

    // Check for flow-specific intents
    const flowIntent = this.checkFlowSpecificIntent(normalizedMessage, context);
    if (flowIntent.trigger) {
      return flowIntent;
    }

    // No order intent detected
    return this.createIntentResult('NO_ORDER', 0.0, false);
  }

  /**
   * Check for direct order keywords
   */
  static checkDirectOrderIntent(normalizedMessage, words) {
    // Primary keywords - high confidence
    for (const keyword of this.PRIMARY_ORDER_KEYWORDS) {
      if (normalizedMessage.includes(keyword)) {
        return this.createIntentResult(
          'ORDER_REQUEST', 
          0.95, 
          true, 
          `Direct order keyword: "${keyword}"`
        );
      }
    }

    // Secondary keywords - medium confidence  
    for (const keyword of this.SECONDARY_ORDER_KEYWORDS) {
      if (normalizedMessage.includes(keyword)) {
        return this.createIntentResult(
          'ORDER_CONTEXT', 
          0.75, 
          true, 
          `Secondary order keyword: "${keyword}"`
        );
      }
    }

    return this.createIntentResult('NO_ORDER', 0.0, false);
  }

  /**
   * Check for contextual order intent (when user has items in cart)
   */
  static checkContextualOrderIntent(normalizedMessage, context) {
    if (!context.hasCartItems) {
      return this.createIntentResult('NO_ORDER', 0.0, false);
    }

    // Cart-related phrases when user has items
    for (const phrase of this.CONTEXTUAL_PHRASES) {
      if (normalizedMessage.includes(phrase)) {
        return this.createIntentResult(
          'ORDER_CONTEXT', 
          0.75, 
          true, 
          `Contextual phrase with cart: "${phrase}"`
        );
      }
    }

    // Simple affirmative responses when in order flow
    if (context.isInOrderFlow) {
      for (const keyword of this.CONFIRMATION_KEYWORDS) {
        if (normalizedMessage === keyword || normalizedMessage.includes(keyword)) {
          return this.createIntentResult(
            'ORDER_CONFIRMATION', 
            0.85, 
            true, 
            `Confirmation in order flow: "${keyword}"`
          );
        }
      }
    }

    return this.createIntentResult('NO_ORDER', 0.0, false);
  }

  /**
   * Check for confirmation intent in order flow
   */
  static checkConfirmationIntent(normalizedMessage, context) {
    // Check for cancellation FIRST - should work even without needsConfirmation
    for (const keyword of this.CANCEL_KEYWORDS) {
      if (normalizedMessage === keyword || 
          normalizedMessage.startsWith(keyword) ||
          normalizedMessage.endsWith(keyword)) {
        return this.createIntentResult(
          'ORDER_CANCELLATION', 
          0.95, 
          true, 
          `Order cancellation: "${keyword}"`
        );
      }
    }

    if (!context.isInOrderFlow || !context.needsConfirmation) {
      return this.createIntentResult('NO_ORDER', 0.0, false);
    }

    // Check for positive confirmation
    for (const keyword of this.CONFIRMATION_KEYWORDS) {
      if (normalizedMessage === keyword || 
          normalizedMessage.startsWith(keyword) ||
          normalizedMessage.endsWith(keyword)) {
        return this.createIntentResult(
          'ORDER_CONFIRMATION', 
          0.90, 
          true, 
          `Positive confirmation: "${keyword}"`
        );
      }
    }

    return this.createIntentResult('NO_ORDER', 0.0, false);
  }

  /**
   * Check for flow-specific intents (address, payment, etc.)
   */
  static checkFlowSpecificIntent(normalizedMessage, context) {
    if (!context.isInOrderFlow) {
      return this.createIntentResult('NO_ORDER', 0.0, false);
    }

    // Payment method selection - PRIORITY CHECK
    if (context.needsPaymentSelection) {
      const paymentResult = this.detectPaymentSelection(normalizedMessage, context);
      if (paymentResult.detected) {
        return this.createIntentResult(
          'PAYMENT_SELECTION', 
          paymentResult.confidence, 
          true, 
          `Payment selection detected: ${paymentResult.paymentMethod}`
        );
      }
    }

    // Address selection
    if (context.needsAddressSelection) {
      // Check for numeric selection (1, 2, etc.)
      const numMatch = normalizedMessage.match(/^(\d+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        if (num >= 1 && num <= 10) { // Reasonable range
          return this.createIntentResult(
            'ADDRESS_SELECTION', 
            0.95, 
            true, 
            `Address selection: ${num}`
          );
        }
      }

      // Check for address keywords
      for (const keyword of this.FLOW_KEYWORDS.ADDRESS) {
        if (normalizedMessage.includes(keyword)) {
          return this.createIntentResult(
            'ADDRESS_SELECTION', 
            0.80, 
            true, 
            `Address keyword: "${keyword}"`
          );
        }
      }
    }

    // Order summary request
    for (const keyword of this.FLOW_KEYWORDS.SUMMARY) {
      if (normalizedMessage.includes(keyword)) {
        return this.createIntentResult(
          'ORDER_SUMMARY', 
          0.85, 
          true, 
          `Summary keyword: "${keyword}"`
        );
      }
    }

    // Order status check
    for (const keyword of this.FLOW_KEYWORDS.STATUS) {
      if (normalizedMessage.includes(keyword)) {
        return this.createIntentResult(
          'ORDER_STATUS', 
          0.85, 
          true, 
          `Status keyword: "${keyword}"`
        );
      }
    }

    return this.createIntentResult('NO_ORDER', 0.0, false);
  }

  /**
   * Detect payment method selection intent
   */
  static detectPaymentSelection(message, context) {
    const paymentKeywords = [
      'cod', 'cash on delivery', 'tiền mặt', 'thanh toán khi nhận',
      'vnpay', 'atm', 'thẻ', 'online', 'chuyển khoản', 'bank'
    ];

    const normalizedMessage = message.toLowerCase().trim();
    
    const hasPaymentKeyword = paymentKeywords.some(keyword => 
      normalizedMessage.includes(keyword)
    );

    // Specific checks for common payment methods
    const isPaymentMethod = normalizedMessage === 'cod' || 
                           normalizedMessage === 'vnpay' ||
                           normalizedMessage === '1' || 
                           normalizedMessage === '2';

    // Higher confidence if in payment selection context
    if ((hasPaymentKeyword || isPaymentMethod) && context.needsPaymentSelection) {
      return {
        detected: true,
        confidence: 0.95, // High confidence when context matches
        paymentMethod: this.extractPaymentMethod(message)
      };
    }

    if (hasPaymentKeyword || isPaymentMethod) {
      return {
        detected: true,
        confidence: 0.8,
        paymentMethod: this.extractPaymentMethod(message)
      };
    }

    return { detected: false, confidence: 0 };
  }

  /**
   * Extract payment method from message
   */
  static extractPaymentMethod(message) {
    const normalizedMessage = message.toLowerCase().trim();
    
    if (normalizedMessage.includes('cod') || normalizedMessage === '1') {
      return 'COD';
    } else if (normalizedMessage.includes('vnpay') || normalizedMessage === '2') {
      return 'VNPay';
    }
    
    return null;
  }

  /**
   * Normalize message for better matching
   */
  static normalizeMessage(message) {
    return message
      .toLowerCase()
      .trim()
      .replace(/[^\w\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Create standardized intent result
   */
  static createIntentResult(intent, confidence, trigger, reason = '') {
    return {
      intent,
      confidence,
      trigger,
      reason,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract specific information from order-related messages
   */
  static extractOrderInfo(message, context = {}) {
    const normalizedMessage = this.normalizeMessage(message);
    
    const info = {
      paymentMethod: null,
      addressSelection: null,
      quantity: null,
      confirmation: null
    };

    // Extract payment method
    info.paymentMethod = this.extractPaymentMethod(message);

    // Extract address selection (numeric)
    const addressMatch = normalizedMessage.match(/(\d+)/);
    if (addressMatch && context.needsAddressSelection) {
      info.addressSelection = parseInt(addressMatch[1]);
    }

    // Extract confirmation
    const hasPositive = this.CONFIRMATION_KEYWORDS.some(k => normalizedMessage.includes(k));
    const hasNegative = this.CANCEL_KEYWORDS.some(k => normalizedMessage.includes(k));
    
    if (hasPositive && !hasNegative) {
      info.confirmation = true;
    } else if (hasNegative && !hasPositive) {
      info.confirmation = false;
    }

    return info;
  }

  /**
   * Determine next action based on intent and context
   */
  static getNextAction(intentResult, context = {}) {
    if (!intentResult.trigger) {
      return { action: 'NO_ACTION', message: null };
    }

    switch (intentResult.intent) {
      case 'ORDER_REQUEST':
        return { 
          action: 'INITIATE_ORDER', 
          message: 'Starting order process...' 
        };

      case 'ORDER_CONFIRMATION':
        if (context.currentStep === 'SUMMARY_SHOWN') {
          return { 
            action: 'CONFIRM_ORDER', 
            message: 'Confirming order...' 
          };
        } else if (context.needsConfirmation) {
          return { 
            action: 'CONTINUE_FLOW', 
            message: 'Continuing order flow...' 
          };
        }
        break;

      case 'ORDER_CANCELLATION':
        return { 
          action: 'CANCEL_ORDER', 
          message: 'Cancelling order process...' 
        };

      case 'ADDRESS_SELECTION':
        return { 
          action: 'SELECT_ADDRESS', 
          message: 'Processing address selection...' 
        };

      case 'PAYMENT_SELECTION':
        return { 
          action: 'SELECT_PAYMENT', 
          message: 'Processing payment selection...' 
        };

      case 'ORDER_SUMMARY':
        return { 
          action: 'SHOW_SUMMARY', 
          message: 'Showing order summary...' 
        };

      case 'ORDER_STATUS':
        return { 
          action: 'CHECK_STATUS', 
          message: 'Checking order status...' 
        };

      default:
        return { 
          action: 'CONTINUE_FLOW', 
          message: 'Processing order context...' 
        };
    }

    return { action: 'NO_ACTION', message: null };
  }

  /**
   * Check if message is order-related (for routing)
   */
  static isOrderRelated(message, context = {}) {
    const intentResult = this.detectOrderIntent(message, context);
    return intentResult.trigger || intentResult.confidence > 0.3;
  }
}

module.exports = OrderIntentDetector;
