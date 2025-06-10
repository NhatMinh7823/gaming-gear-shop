/**
 * Handler for initiating order process
 */
const OrderStepHandler = require('../OrderStepHandler');
const { ORDER_STEPS } = require('../utils/OrderConstants');
const OrderMessageFormatter = require('../utils/OrderMessageFormatter');

class InitiateOrderStep extends OrderStepHandler {
  async validatePreConditions(userId, params) {
    try {
      // Check if user exists
      await this.getUser(userId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: "❌ Không tìm thấy thông tin người dùng!"
      };
    }
  }

  async execute(userId, params) {
    try {
      // Get cart items
      let cart;
      try {
        cart = await this.getCart(userId);
      } catch (error) {
        return {
          success: false,
          message: `🛒 **GIỎ HÀNG TRỐNG**
          
Bạn chưa có sản phẩm nào trong giỏ hàng.

🔍 **Gợi ý:**
• Tìm kiếm sản phẩm: "Tìm laptop gaming"
• Xem danh mục: "Hiển thị tất cả laptop"
• Xem sản phẩm hot: "Sản phẩm bán chạy"

Hãy thêm sản phẩm vào giỏ trước khi đặt hàng nhé! 🛍️`
        };
      }

      // Validate cart inventory
      const validation = await this.inventoryValidator.validateCartInventory(cart.items);

      if (!validation.success) {
        // Auto-fix cart by removing unavailable products
        const autoFixResult = await this.autoFixCart(userId, validation);
        
        if (autoFixResult.success) {
          return {
            success: true,
            message: `🔧 **ĐÃ TỰ ĐỘNG ĐIỀU CHỈNH GIỎ HÀNG**

${autoFixResult.message}

Tiếp tục với giỏ hàng đã được điều chỉnh? Nhập "có" để tiếp tục đặt hàng.`,
            autoFixed: true,
            fixDetails: autoFixResult
          };
        } else {
          return {
            success: false,
            message: `⚠️ **VẤN ĐỀ VỚI GIỎ HÀNG**

${validation.summary.message}

🔧 **TÙY CHỌN XỬ LÝY:**
1. **Điều chỉnh số lượng** sản phẩm theo khả năng có sẵn
2. **Xóa sản phẩm** không còn hàng khỏi giỏ
3. **Tìm sản phẩm thay thế** tương tự

Bạn có muốn tôi giúp điều chỉnh giỏ hàng không?`,
            validation: validation,
            needsCartAdjustment: true
          };
        }
      }

      // Calculate totals
      const { subtotal, itemCount } = this.calculateCartTotals(cart);

      // Format cart summary message
      const cartSummary = OrderMessageFormatter.formatCartSummary(cart, subtotal, itemCount);

      return {
        success: true,
        message: cartSummary,
        cart: cart,
        validation: validation,
        subtotal: subtotal,
        nextStep: 'select_address'
      };

    } catch (error) {
      throw error;
    }
  }

  async updateState(userId, result) {
    // Reset order state when initiating new order
    this.stateManager.resetOrderState(userId);
    
    // Update with initial data
    this.stateManager.updateOrderState(userId, {
      step: ORDER_STEPS.ORDER_INITIATED,
      cartValidation: result.validation
    });

    // If cart was validated successfully, move to next step
    if (result.validation && result.validation.success) {
      this.stateManager.updateOrderState(userId, {
        step: ORDER_STEPS.CART_VALIDATED
      });
    }
  }

  /**
   * Auto-fix cart by removing unavailable products and adjusting quantities
   */
  async autoFixCart(userId, validation) {
    try {
      const cart = await this.models.Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return { success: false, message: "Không tìm thấy giỏ hàng" };
      }

      let removedItems = [];
      let adjustedItems = [];

      // Process validation results
      for (const result of validation.results) {
        if (result.severity === 'ERROR') {
          if (result.status === 'PRODUCT_UNAVAILABLE' || result.status === 'PRODUCT_NOT_FOUND') {
            // Remove unavailable products
            const itemIndex = cart.items.findIndex(item => 
              item.product._id.toString() === result.item.product.toString()
            );
            if (itemIndex > -1) {
              const removedItem = cart.items.splice(itemIndex, 1)[0];
              removedItems.push(removedItem);
            }
          } else if (result.status === 'INSUFFICIENT_STOCK' && result.available === 0) {
            // Remove out of stock products
            const itemIndex = cart.items.findIndex(item => 
              item.product._id.toString() === result.item.product.toString()
            );
            if (itemIndex > -1) {
              const removedItem = cart.items.splice(itemIndex, 1)[0];
              removedItems.push(removedItem);
            }
          }
        } else if (result.severity === 'WARNING') {
          if (result.status === 'INSUFFICIENT_STOCK' && result.available > 0) {
            // Adjust quantity to available stock
            const itemIndex = cart.items.findIndex(item => 
              item.product._id.toString() === result.item.product.toString()
            );
            if (itemIndex > -1) {
              const oldQuantity = cart.items[itemIndex].quantity;
              cart.items[itemIndex].quantity = result.available;
              adjustedItems.push({
                name: cart.items[itemIndex].name,
                oldQuantity: oldQuantity,
                newQuantity: result.available
              });
            }
          }
        }
      }

      // Recalculate total price
      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      // Save updated cart
      await cart.save();

      if (cart.items.length === 0) {
        const message = OrderMessageFormatter.formatCartAutoFix(removedItems, adjustedItems, cart.items.length, cart.totalPrice);
        return { 
          success: false, 
          message: message + "\n\nVui lòng thêm sản phẩm mới vào giỏ hàng." 
        };
      }

      // Generate fix message
      const message = OrderMessageFormatter.formatCartAutoFix(removedItems, adjustedItems, cart.items.length, cart.totalPrice);

      return {
        success: true,
        message: message,
        removedCount: removedItems.length,
        adjustedCount: adjustedItems.length,
        remainingCount: cart.items.length,
        newTotal: cart.totalPrice
      };

    } catch (error) {
      console.error('Error in autoFixCart:', error);
      return { 
        success: false, 
        message: "Lỗi khi tự động điều chỉnh giỏ hàng" 
      };
    }
  }
}

module.exports = InitiateOrderStep;
