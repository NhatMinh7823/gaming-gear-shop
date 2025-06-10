/**
 * Factory for creating order step handlers
 * Implements Factory Pattern
 */
const { ORDER_ACTIONS } = require('./utils/OrderConstants');

// Import all step handlers
const InitiateOrderStep = require('./steps/InitiateOrderStep');
const SelectAddressStep = require('./steps/SelectAddressStep');
const CalculateShippingStep = require('./steps/CalculateShippingStep');
const SelectPaymentStep = require('./steps/SelectPaymentStep');
const ShowSummaryStep = require('./steps/ShowSummaryStep');
const ConfirmOrderStep = require('./steps/ConfirmOrderStep');
const CheckStatusStep = require('./steps/CheckStatusStep');

class OrderStepFactory {
  constructor(orderStateManager, models) {
    this.stateManager = orderStateManager;
    this.models = models;
  }

  /**
   * Create step handler based on action
   */
  createStepHandler(action) {
    const StepClass = this.getStepClass(action);
    
    if (!StepClass) {
      throw new Error(`Unknown order action: ${action}`);
    }

    return new StepClass(this.stateManager, this.models);
  }

  /**
   * Get step class based on action
   */
  getStepClass(action) {
    const stepMap = {
      [ORDER_ACTIONS.INITIATE_ORDER]: InitiateOrderStep,
      [ORDER_ACTIONS.VALIDATE_CART]: InitiateOrderStep, // Reuse initiate step for validation
      [ORDER_ACTIONS.SELECT_ADDRESS]: SelectAddressStep,
      [ORDER_ACTIONS.CALCULATE_SHIPPING]: CalculateShippingStep,
      [ORDER_ACTIONS.SELECT_PAYMENT]: SelectPaymentStep,
      [ORDER_ACTIONS.SHOW_SUMMARY]: ShowSummaryStep,
      [ORDER_ACTIONS.CONFIRM_ORDER]: ConfirmOrderStep,
      [ORDER_ACTIONS.CHECK_STATUS]: CheckStatusStep
    };

    return stepMap[action];
  }

  /**
   * Get all available actions
   */
  getAvailableActions() {
    return Object.values(ORDER_ACTIONS);
  }

  /**
   * Check if action is valid
   */
  isValidAction(action) {
    return Object.values(ORDER_ACTIONS).includes(action);
  }
}

module.exports = OrderStepFactory;
