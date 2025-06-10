/**
 * Handler for calculating shipping costs
 */
const OrderStepHandler = require('../OrderStepHandler');
const { ORDER_STEPS, DEFAULT_VALUES } = require('../utils/OrderConstants');
const OrderMessageFormatter = require('../utils/OrderMessageFormatter');

class CalculateShippingStep extends OrderStepHandler {
  async validatePreConditions(userId, params) {
    const state = this.stateManager.getOrderState(userId);
    if (!state.selectedAddress) {
      return {
        success: false,
        message: "❌ Vui lòng chọn địa chỉ giao hàng trước!"
      };
    }
    return { success: true };
  }

  async execute(userId, params) {
    try {
      const state = this.stateManager.getOrderState(userId);
      const cart = await this.getCart(userId);

      // Calculate total weight and value
      const totalWeight = cart.items.reduce((weight, item) => {
        return weight + ((item.product.weight || DEFAULT_VALUES.DEFAULT_PRODUCT_WEIGHT) * item.quantity);
      }, 0);

      const totalValue = cart.items.reduce((value, item) => {
        return value + (item.product.price * item.quantity);
      }, 0);

      // Get shipping fee from GHN
      const shippingRequest = {
        service_type_id: 2, // Standard service
        to_district_id: state.selectedAddress.district.id,
        to_ward_code: state.selectedAddress.ward.code,
        weight: Math.max(totalWeight, DEFAULT_VALUES.MIN_WEIGHT),
        insurance_value: totalValue
      };

      console.log('[CalculateShippingStep] Calculating shipping with:', shippingRequest);

      const shippingResult = await this.ghnService.calculateShippingFee(shippingRequest);
      console.log('[CalculateShippingStep] GHN shipping result:', JSON.stringify(shippingResult));
      
      let shippingInfo;
      let message;

      if (!shippingResult.success) {
        // Use fallback shipping fee
        console.log('[CalculateShippingStep] GHN API failed, using fallback shipping fee');
        shippingInfo = {
          fee: shippingResult.fallbackFee || DEFAULT_VALUES.DEFAULT_SHIPPING_FEE,
          serviceType: 'standard',
          estimatedDays: DEFAULT_VALUES.ESTIMATED_DELIVERY_DAYS
        };

        message = OrderMessageFormatter.formatFallbackShipping(shippingInfo, state.selectedAddress);
      } else {
        // Use GHN shipping data
        console.log('[CalculateShippingStep] GHN API success, data:', shippingResult.data);
        
        shippingInfo = {
          fee: shippingResult.data?.data?.service_fee || DEFAULT_VALUES.DEFAULT_SHIPPING_FEE,
          serviceType: 'standard',
          estimatedDays: 2,
          ...shippingResult.data
        };

        message = OrderMessageFormatter.formatShippingInfo(shippingInfo, state.selectedAddress);
      }

      console.log('[CalculateShippingStep] Final shipping info:', shippingInfo);

      return {
        success: true,
        message: message,
        shippingInfo: shippingInfo,
        nextStep: 'select_payment'
      };

    } catch (error) {
      console.error('Error calculating shipping:', error);
      
      // Return fallback shipping info on error
      const fallbackShippingInfo = { 
        fee: DEFAULT_VALUES.DEFAULT_SHIPPING_FEE, 
        serviceType: 'standard', 
        estimatedDays: DEFAULT_VALUES.ESTIMATED_DELIVERY_DAYS 
      };

      return {
        success: true,
        message: "❌ Lỗi khi tính phí vận chuyển. Sử dụng phí mặc định 29,000đ.",
        shippingInfo: fallbackShippingInfo,
        nextStep: 'select_payment'
      };
    }
  }

  async updateState(userId, result) {
    if (result.shippingInfo) {
      this.stateManager.updateOrderState(userId, { 
        shippingInfo: result.shippingInfo,
        step: ORDER_STEPS.SHIPPING_CALCULATED 
      });
    }
  }
}

module.exports = CalculateShippingStep;
