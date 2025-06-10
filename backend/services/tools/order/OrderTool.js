/**
 * Refactored OrderTool using Strategy and Factory patterns
 * Main orchestrator for order processing
 */
const { StructuredTool } = require("langchain/tools");
const { z } = require("zod");

// Import refactored components
const OrderStateManager = require('./OrderStateManager');
const OrderStepFactory = require('./OrderStepFactory');
const { ORDER_ACTIONS, PAYMENT_METHODS } = require('./utils/OrderConstants');

// Import models and services
const Cart = require("../../../models/cartModel");
const User = require("../../../models/userModel");
const Order = require("../../../models/orderModel");
const Product = require("../../../models/productModel");
const InventoryValidator = require("./InventoryValidator");
const ghnService = require("../../ghnService");

/**
 * Refactored OrderTool for chatbot order creation and management
 * Now uses modular architecture with separate concerns
 */
class OrderTool extends StructuredTool {
  static lc_name() {
    return "OrderTool";
  }
  
  constructor(userContext = null, ghnServiceInstance = null, orderController = null) {
    super();
    
    this.name = "order_tool";
    this.description = `
        Comprehensive order management tool for chatbot. Handles the complete order flow:
        - initiate_order: Start order process and validate cart
        - validate_cart: Check inventory and cart validity  
        - select_address: Choose shipping address
        - calculate_shipping: Get shipping costs via GHN
        - select_payment: Choose payment method (COD/VNPay)
        - show_summary: Display order summary before confirmation
        - confirm_order: Create the actual order
        - check_status: Check order status
        
        Use this tool when user wants to place an order, check out, or manage their orders.
        Common triggers: "đặt hàng", "mua", "checkout", "thanh toán", "order"
      `;
    
    this.schema = z.object({
      action: z.enum([
        "initiate_order",
        "validate_cart", 
        "select_address",
        "calculate_shipping",
        "select_payment",
        "show_summary",
        "confirm_order",
        "check_status"
      ]).describe("Action to perform in the order process"),
      
      addressId: z.string().optional().describe("Address ID for shipping"),
      
      paymentMethod: z.enum(["COD", "VNPay"]).optional().describe("Payment method selection"),
      
      confirmOrder: z.boolean().optional().describe("Final order confirmation"),
      
      orderId: z.string().optional().describe("Order ID for status checking")
    });

    // Initialize components
    this.userContext = userContext;
    this.stateManager = new OrderStateManager();
    
    // Prepare models and services for dependency injection
    const models = {
      Cart,
      User,
      Order,
      Product,
      InventoryValidator,
      ghnService: ghnServiceInstance || ghnService
    };
    
    this.stepFactory = new OrderStepFactory(this.stateManager, models);
    this.orderController = orderController;
  }

  async _call({ action, addressId, paymentMethod, confirmOrder, orderId }) {
    try {
      // Validate user authentication
      if (!this.userContext) {
        return {
          success: false,
          message: "❌ Bạn cần đăng nhập để đặt hàng. Vui lòng đăng nhập trước!"
        };
      }

      const userId = this.userContext.getUserId();
      if (!userId) {
        return {
          success: false,
          message: "❌ Không thể xác định người dùng. Vui lòng đăng nhập lại!"
        };
      }

      // Validate action
      if (!this.stepFactory.isValidAction(action)) {
        return {
          success: false,
          message: `❌ Hành động không hợp lệ: ${action}`
        };
      }

      console.log(`[OrderTool] Action: ${action} for user: ${userId}`);

      // Create and execute step handler
      const stepHandler = this.stepFactory.createStepHandler(action);
      
      // Prepare parameters for step execution
      const params = this.prepareStepParams(action, {
        addressId,
        paymentMethod,
        confirmed: confirmOrder,
        orderId
      });

      // Execute the step
      const result = await stepHandler.handle(userId, params);

      return result;

    } catch (error) {
      console.error('[OrderTool] Error:', error);
      return {
        success: false,
        message: "❌ Có lỗi xảy ra trong quá trình xử lý đơn hàng. Vui lòng thử lại!",
        error: error.message
      };
    }
  }

  /**
   * Prepare parameters for step execution based on action
   */
  prepareStepParams(action, params) {
    const { addressId, paymentMethod, confirmed, orderId } = params;

    switch (action) {
      case ORDER_ACTIONS.SELECT_ADDRESS:
        return { addressId };
      
      case ORDER_ACTIONS.SELECT_PAYMENT:
        return { paymentMethod };
      
      case ORDER_ACTIONS.CONFIRM_ORDER:
        return { confirmed };
      
      case ORDER_ACTIONS.CHECK_STATUS:
        return { orderId };
      
      default:
        return {};
    }
  }

  /**
   * Get current order state for user (for debugging)
   */
  getOrderState(userId) {
    return this.stateManager.getOrderState(userId);
  }

  /**
   * Reset order state for user
   */
  resetOrderState(userId) {
    this.stateManager.resetOrderState(userId);
  }

  /**
   * Get available actions
   */
  getAvailableActions() {
    return this.stepFactory.getAvailableActions();
  }
}

module.exports = OrderTool;
