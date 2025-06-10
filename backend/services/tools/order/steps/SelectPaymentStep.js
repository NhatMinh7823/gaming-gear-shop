/**
 * Handler for selecting payment method
 */
const OrderStepHandler = require('../OrderStepHandler');
const { ORDER_STEPS, PAYMENT_METHODS } = require('../utils/OrderConstants');
const OrderMessageFormatter = require('../utils/OrderMessageFormatter');
const OrderEmojiHelper = require('../utils/OrderEmojiHelper');

class SelectPaymentStep extends OrderStepHandler {
  async execute(userId, params) {
    const { paymentMethod } = params;

    if (!paymentMethod) {
      return {
        success: true,
        message: OrderMessageFormatter.formatPaymentSelection(),
        needsPaymentSelection: true
      };
    }

    // Validate payment method
    if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
      return {
        success: false,
        message: `❌ Phương thức thanh toán không hợp lệ. Vui lòng chọn **COD** hoặc **VNPay**.`
      };
    }

    const paymentEmoji = OrderEmojiHelper.getPaymentEmoji(paymentMethod);
    const paymentName = OrderEmojiHelper.getPaymentName(paymentMethod);

    return {
      success: true,
      message: `✅ **ĐÃ CHỌN THANH TOÁN**

${paymentEmoji} **${paymentName}**

📋 **Bước tiếp theo:** Xem tóm tắt đơn hàng
Nhập **"xem đơn hàng"** hoặc **"tóm tắt"** để tiếp tục.`,
      paymentMethod: paymentMethod,
      nextStep: 'show_summary'
    };
  }

  async updateState(userId, result) {
    if (result.paymentMethod) {
      this.stateManager.updateOrderState(userId, { 
        paymentMethod: result.paymentMethod,
        step: ORDER_STEPS.PAYMENT_SELECTED 
      });
    }
  }
}

module.exports = SelectPaymentStep;
