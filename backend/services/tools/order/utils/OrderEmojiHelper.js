/**
 * Helper class for managing emojis in order messages
 */
class OrderEmojiHelper {
  /**
   * Get product emoji based on category
   */
  static getProductEmoji(category) {
    const emojiMap = {
      'laptop': '💻',
      'mouse': '🖱️',
      'keyboard': '⌨️',
      'headphone': '🎧',
      'monitor': '🖥️',
      'chair': '🪑',
      'default': '📦'
    };
    
    // Handle case where category might be an object or not a string
    let categoryString = 'default';
    if (category) {
      if (typeof category === 'string') {
        categoryString = category.toLowerCase();
      } else if (category.name && typeof category.name === 'string') {
        categoryString = category.name.toLowerCase();
      } else if (category.toString && typeof category.toString === 'function') {
        categoryString = category.toString().toLowerCase();
      }
    }
    
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (categoryString.includes(key)) {
        return emoji;
      }
    }
    
    return emojiMap.default;
  }

  /**
   * Get status emoji based on order status
   */
  static getStatusEmoji(status) {
    const statusMap = {
      'Processing': '🔄',
      'Shipped': '🚚',
      'Delivered': '✅',
      'Cancelled': '❌'
    };
    
    return statusMap[status] || '📦';
  }

  /**
   * Get payment method emoji
   */
  static getPaymentEmoji(paymentMethod) {
    return paymentMethod === 'COD' ? '💵' : '🏦';
  }

  /**
   * Get payment method name
   */
  static getPaymentName(paymentMethod) {
    return paymentMethod === 'COD' 
      ? 'Thanh toán khi nhận hàng' 
      : 'VNPay - Thanh toán online';
  }
}

module.exports = OrderEmojiHelper;
