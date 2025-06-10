/**
 * Handler for showing order summary
 */
const OrderStepHandler = require('../OrderStepHandler');
const { ORDER_STEPS, DEFAULT_VALUES } = require('../utils/OrderConstants');
const OrderMessageFormatter = require('../utils/OrderMessageFormatter');

class ShowSummaryStep extends OrderStepHandler {
  async validatePreConditions(userId, params) {
    const state = this.stateManager.getOrderState(userId);
    
    if (!state.selectedAddress || !state.shippingInfo || !state.paymentMethod) {
      return {
        success: false,
        message: "❌ Vui lòng hoàn tất các bước trước: chọn địa chỉ, tính phí ship và chọn thanh toán!"
      };
    }

    return { success: true };
  }

  async execute(userId, params) {
    try {
      const state = this.stateManager.getOrderState(userId);
      const cart = await this.getCart(userId);

      // Calculate totals using the cart's stored prices (which include discounts)
      const { subtotal } = this.calculateCartTotals(cart);
      const shippingFee = state.shippingInfo.fee || DEFAULT_VALUES.DEFAULT_SHIPPING_FEE;
      const serviceFee = DEFAULT_VALUES.SERVICE_FEE;
      const totalAmount = subtotal + shippingFee + serviceFee;

      // Create order summary
      const orderSummary = {
        subtotal,
        shippingFee,
        serviceFee,
        totalAmount,
        items: cart.items,
        address: state.selectedAddress,
        paymentMethod: state.paymentMethod,
        shippingInfo: state.shippingInfo
      };

      const summary = OrderMessageFormatter.formatOrderSummary(
        orderSummary, 
        state.selectedAddress, 
        state.paymentMethod
      );

      return {
        success: true,
        message: summary,
        orderSummary: orderSummary,
        needsConfirmation: true
      };

    } catch (error) {
      throw error;
    }
  }

  async updateState(userId, result) {
    if (result.orderSummary) {
      this.stateManager.updateOrderState(userId, { 
        orderSummary: result.orderSummary,
        step: ORDER_STEPS.SUMMARY_SHOWN 
      });
    }
  }
}

module.exports = ShowSummaryStep;
