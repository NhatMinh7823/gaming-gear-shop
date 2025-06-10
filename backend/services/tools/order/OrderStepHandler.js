/**
 * Base class for all order step handlers
 * Implements the Template Method pattern
 */
class OrderStepHandler {
  constructor(orderStateManager, models = {}) {
    this.stateManager = orderStateManager;
    this.models = models; // { Cart, User, Order, Product }
    this.inventoryValidator = models.InventoryValidator;
    this.ghnService = models.ghnService;
  }

  /**
   * Template method for handling order steps
   * This is the main interface that will be called by OrderTool
   */
  async handle(userId, params = {}) {
    try {
      // Pre-execution validation
      const validationResult = await this.validatePreConditions(userId, params);
      if (!validationResult.success) {
        return validationResult;
      }

      // Execute the main logic (implemented by subclasses)
      const result = await this.execute(userId, params);
      
      // Post-execution processing
      if (result.success) {
        await this.updateState(userId, result);
      }

      return result;

    } catch (error) {
      console.error(`[${this.constructor.name}] Error:`, error);
      return {
        success: false,
        message: "❌ Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại!",
        error: error.message
      };
    }
  }

  /**
   * Validate pre-conditions before executing step
   * Override in subclasses as needed
   */
  async validatePreConditions(userId, params) {
    // Default: no validation
    return { success: true };
  }

  /**
   * Execute the main logic of the step
   * Must be implemented by subclasses
   */
  async execute(userId, params) {
    throw new Error('execute() method must be implemented by subclasses');
  }

  /**
   * Update state after successful execution
   * Override in subclasses as needed
   */
  async updateState(userId, result) {
    // Default: no state update
  }

  /**
   * Get user data
   */
  async getUser(userId) {
    const user = await this.models.User.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy thông tin người dùng');
    }
    return user;
  }

  /**
   * Get cart data
   */
  async getCart(userId) {
    const cart = await this.models.Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Giỏ hàng trống');
    }
    return cart;
  }

  /**
   * Calculate cart totals
   */
  calculateCartTotals(cart) {
    const subtotal = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

    return { subtotal, itemCount };
  }

  /**
   * Generate order number
   */
  generateOrderNumber(orderId) {
    return `#DH${String(orderId).slice(-6).toUpperCase()}`;
  }

  /**
   * Calculate delivery date
   */
  calculateDeliveryDate(estimatedDays = 3) {
    const currentDate = new Date();
    const deliveryDate = new Date(currentDate.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
    return deliveryDate.toLocaleDateString('vi-VN');
  }
}

module.exports = OrderStepHandler;
