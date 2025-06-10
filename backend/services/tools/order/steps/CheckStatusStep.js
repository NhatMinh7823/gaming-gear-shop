/**
 * Handler for checking order status
 */
const OrderStepHandler = require('../OrderStepHandler');
const OrderMessageFormatter = require('../utils/OrderMessageFormatter');

class CheckStatusStep extends OrderStepHandler {
  async execute(userId, params) {
    const { orderId } = params;

    try {
      if (!orderId) {
        // Show recent orders
        return await this.showRecentOrders(userId);
      }

      // Check specific order
      return await this.showOrderDetails(userId, orderId);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Show recent orders for user
   */
  async showRecentOrders(userId) {
    const recentOrders = await this.models.Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentOrders.length === 0) {
      return {
        success: false,
        message: "📦 Bạn chưa có đơn hàng nào!"
      };
    }

    const ordersList = OrderMessageFormatter.formatOrdersList(recentOrders);

    return {
      success: true,
      message: ordersList,
      orders: recentOrders
    };
  }

  /**
   * Show details for specific order
   */
  async showOrderDetails(userId, orderId) {
    const order = await this.models.Order.findById(orderId).populate('orderItems.product');
    
    if (!order || order.user.toString() !== userId) {
      return {
        success: false,
        message: `❌ Không tìm thấy đơn hàng ${orderId}!`
      };
    }

    const statusMessage = OrderMessageFormatter.formatOrderDetails(order);
    
    return {
      success: true,
      message: statusMessage,
      order: order
    };
  }
}

module.exports = CheckStatusStep;
