/**
 * Detects simple actions that can bypass AI processing for better performance
 * This helps reduce unnecessary LLM calls for straightforward operations
 */
class SimpleActionDetector {
  static simpleActions = {
    // Cart actions
    'view_cart': {
      patterns: [
        /^(xem|hiển thị|show|view)\s*(giỏ\s*hàng|cart)$/i,
        /^(giỏ\s*hàng|cart)$/i,
        /^(xem|check)\s*(giỏ|cart)$/i
      ],
      tool: 'ai_smart_cart',
      action: 'view_cart'
    },
    'clear_cart': {
      patterns: [
        /^(xóa|clear|delete)\s*(tất\s*cả|all|toàn\s*bộ)\s*(giỏ\s*hàng|cart)$/i,
        /^(clear|xóa)\s*(giỏ\s*hàng|cart)$/i,
        /^(làm\s*trống|empty)\s*(giỏ\s*hàng|cart)$/i
      ],
      tool: 'ai_smart_cart',
      action: 'clear_cart'
    },
    
    // Wishlist actions
    'view_wishlist': {
      patterns: [
        /^(xem|hiển thị|show|view)\s*(danh\s*sách\s*yêu\s*thích|wishlist)$/i,
        /^(danh\s*sách\s*yêu\s*thích|wishlist)$/i
      ],
      tool: 'wishlist_tool',
      action: 'view_wishlist'
    },
    
    // Order actions
    'view_orders': {
      patterns: [
        /^(xem|hiển thị|show|view)\s*(đơn\s*hàng|orders?)$/i,
        /^(đơn\s*hàng|orders?)$/i,
        /^(lịch\s*sử|history)\s*(đơn\s*hàng|orders?)$/i
      ],
      tool: 'optimized_ai_order_tool',
      action: 'view_orders'
    }
  };

  /**
   * Detect if a message is a simple action that can bypass AI processing
   * @param {string} message - User message
   * @returns {Object|null} - Action details or null if not a simple action
   */
  static detectSimpleAction(message) {
    if (!message || typeof message !== 'string') {
      return null;
    }

    const cleanMessage = message.trim().toLowerCase();
    
    for (const [actionName, actionConfig] of Object.entries(this.simpleActions)) {
      for (const pattern of actionConfig.patterns) {
        if (pattern.test(cleanMessage)) {
          return {
            actionName,
            tool: actionConfig.tool,
            action: actionConfig.action,
            originalMessage: message,
            confidence: 'high'
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if a message is likely a simple action (lower confidence)
   * @param {string} message - User message
   * @returns {boolean}
   */
  static isLikelySimpleAction(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }

    const cleanMessage = message.trim().toLowerCase();
    const words = cleanMessage.split(/\s+/);
    
    // Very short messages are likely simple actions
    if (words.length <= 3) {
      const simpleKeywords = [
        'giỏ', 'cart', 'wishlist', 'yêu thích', 'đơn hàng', 'order',
        'xem', 'view', 'show', 'hiển thị', 'check'
      ];
      
      return words.some(word => 
        simpleKeywords.some(keyword => 
          word.includes(keyword) || keyword.includes(word)
        )
      );
    }

    return false;
  }

  /**
   * Get all supported simple actions
   * @returns {Array} - List of action names
   */
  static getSupportedActions() {
    return Object.keys(this.simpleActions);
  }

  /**
   * Add a new simple action pattern
   * @param {string} actionName - Name of the action
   * @param {Object} config - Action configuration
   */
  static addSimpleAction(actionName, config) {
    if (!config.patterns || !config.tool || !config.action) {
      throw new Error('Invalid action configuration');
    }
    
    this.simpleActions[actionName] = config;
  }

  /**
   * Get statistics about simple action detection
   * @returns {Object} - Statistics
   */
  static getStats() {
    return {
      totalActions: Object.keys(this.simpleActions).length,
      actions: Object.keys(this.simpleActions),
      totalPatterns: Object.values(this.simpleActions)
        .reduce((sum, action) => sum + action.patterns.length, 0)
    };
  }

  // Performance monitoring removed for demo project
}

module.exports = SimpleActionDetector;