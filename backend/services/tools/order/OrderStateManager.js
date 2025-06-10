/**
 * Manages order state for each user session
 */
const { ORDER_STEPS } = require('./utils/OrderConstants');

class OrderStateManager {
  constructor() {
    this.orderState = new Map(); // Store order state per user session
  }

  /**
   * Get or initialize order state for current user
   */
  getOrderState(userId) {
    if (!this.orderState.has(userId)) {
      this.orderState.set(userId, {
        step: ORDER_STEPS.IDLE,
        cartValidation: null,
        selectedAddress: null,
        shippingInfo: null,
        paymentMethod: null,
        orderSummary: null,
        createdOrder: null
      });
    }
    return this.orderState.get(userId);
  }

  /**
   * Update order state for current user
   */
  updateOrderState(userId, updates) {
    const currentState = this.getOrderState(userId);
    this.orderState.set(userId, { ...currentState, ...updates });
  }

  /**
   * Reset order state for user (useful when starting new order)
   */
  resetOrderState(userId) {
    this.orderState.set(userId, {
      step: ORDER_STEPS.IDLE,
      cartValidation: null,
      selectedAddress: null,
      shippingInfo: null,
      paymentMethod: null,
      orderSummary: null,
      createdOrder: null
    });
  }

  /**
   * Clear order state for user (cleanup)
   */
  clearOrderState(userId) {
    this.orderState.delete(userId);
  }

  /**
   * Get current step for user
   */
  getCurrentStep(userId) {
    const state = this.getOrderState(userId);
    return state.step;
  }

  /**
   * Set current step for user
   */
  setCurrentStep(userId, step) {
    this.updateOrderState(userId, { step });
  }

  /**
   * Check if user has completed a specific step
   */
  hasCompletedStep(userId, step) {
    const state = this.getOrderState(userId);
    const stepOrder = [
      ORDER_STEPS.IDLE,
      ORDER_STEPS.ORDER_INITIATED,
      ORDER_STEPS.CART_VALIDATED,
      ORDER_STEPS.ADDRESS_SELECTED,
      ORDER_STEPS.SHIPPING_CALCULATED,
      ORDER_STEPS.PAYMENT_SELECTED,
      ORDER_STEPS.SUMMARY_SHOWN,
      ORDER_STEPS.ORDER_CREATED
    ];

    const currentIndex = stepOrder.indexOf(state.step);
    const targetIndex = stepOrder.indexOf(step);
    
    return currentIndex >= targetIndex;
  }

  /**
   * Get all states (for debugging)
   */
  getAllStates() {
    return Array.from(this.orderState.entries());
  }
}

module.exports = OrderStateManager;
