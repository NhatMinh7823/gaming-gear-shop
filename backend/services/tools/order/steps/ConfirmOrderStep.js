/**
 * Handler for confirming and creating the actual order
 */
const OrderStepHandler = require('../OrderStepHandler');
const { ORDER_STEPS } = require('../utils/OrderConstants');
const OrderMessageFormatter = require('../utils/OrderMessageFormatter');

class ConfirmOrderStep extends OrderStepHandler {
  async validatePreConditions(userId, params) {
    const { confirmed } = params;
    
    if (confirmed !== true) {
      return {
        success: false,
        message: `❌ **ĐƠN HÀNG CHƯA ĐƯỢC XÁC NHẬN**

Vui lòng nhập **"Có"** để xác nhận đặt hàng hoặc **"Không"** để hủy.`
      };
    }

    const state = this.stateManager.getOrderState(userId);
    if (!state.orderSummary) {
      return {
        success: false,
        message: "❌ Vui lòng xem tóm tắt đơn hàng trước khi xác nhận!"
      };
    }

    return { success: true };
  }

  async execute(userId, params) {
    try {
      const state = this.stateManager.getOrderState(userId);
      const cart = await this.getCart(userId);

      // Final inventory check
      const finalValidation = await this.inventoryValidator.validateCartInventory(cart.items);
      if (!finalValidation.success) {
        return {
          success: false,
          message: `❌ **THAY ĐỔI TỒN KHO**

Có sản phẩm trong giỏ hàng đã thay đổi tình trạng kho:

${finalValidation.summary.message}

Vui lòng kiểm tra lại giỏ hàng và đặt hàng lại!`
        };
      }

      // Prepare order data
      const orderData = this.prepareOrderData(userId, cart, state);

      // Create order
      const order = await this.models.Order.create(orderData);

      // Update product stock
      await this.updateProductStock(cart.items);

      // Clear cart
      await this.models.Cart.findOneAndDelete({ user: userId });

      // Generate order number and delivery date
      const orderNumber = this.generateOrderNumber(order._id);
      const deliveryDate = this.calculateDeliveryDate(state.shippingInfo.estimatedDays);

      // Format success message
      const successMessage = OrderMessageFormatter.formatOrderSuccess(
        orderNumber,
        state.orderSummary.totalAmount,
        state.paymentMethod,
        deliveryDate
      );

      return {
        success: true,
        message: successMessage,
        order: {
          _id: order._id,
          orderNumber: orderNumber,
          totalPrice: state.orderSummary.totalAmount,
          status: order.status,
          paymentMethod: state.paymentMethod,
          estimatedDelivery: deliveryDate,
          chatbotOrder: true
        }
      };

    } catch (error) {
      console.error('Error confirming order:', error);
      return {
        success: false,
        message: `❌ **LỖI TẠO ĐƠN HÀNG**

Có lỗi xảy ra khi tạo đơn hàng: ${error.message}

🔄 **Thử lại:** Nói "đặt hàng lại"
📞 **Hỗ trợ:** Liên hệ nếu vấn đề tiếp diễn`
      };
    }
  }

  async updateState(userId, result) {
    if (result.order) {
      this.stateManager.updateOrderState(userId, { 
        createdOrder: result.order,
        step: ORDER_STEPS.ORDER_CREATED 
      });
    }
  }

  /**
   * Prepare order data for creation
   */
  prepareOrderData(userId, cart, state) {
    return {
      user: userId,
      orderItems: cart.items.map(item => {
        // Get the first image and ensure it has the correct path format
        let imagePath = '';
        if (item.product.images && item.product.images.length > 0) {
          const firstImage = item.product.images[0];
          
          // Handle different image data types
          if (firstImage && typeof firstImage === 'string') {
            // Check if it's already a full URL (starts with http)
            if (firstImage.startsWith('http')) {
              imagePath = firstImage; // Keep full URL as is
            } else {
              // If image doesn't start with /, add it (relative path for backend)
              imagePath = firstImage.startsWith('/') ? firstImage : `/${firstImage}`;
              // Remove any duplicate slashes
              imagePath = imagePath.replace(/\/+/g, '/');
            }
          } else if (firstImage && typeof firstImage === 'object' && firstImage.url) {
            // Handle case where image is an object with url property
            const imageUrl = firstImage.url;
            if (imageUrl.startsWith('http')) {
              imagePath = imageUrl; // Keep full URL as is
            } else {
              imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
              imagePath = imagePath.replace(/\/+/g, '/');
            }
          } else if (firstImage && typeof firstImage === 'object' && firstImage.path) {
            // Handle case where image is an object with path property
            const imagePth = firstImage.path;
            if (imagePth.startsWith('http')) {
              imagePath = imagePth; // Keep full URL as is
            } else {
              imagePath = imagePth.startsWith('/') ? imagePth : `/${imagePth}`;
              imagePath = imagePath.replace(/\/+/g, '/');
            }
          }
        }
        
        return {
          name: item.product.name,
          quantity: item.quantity,
          image: imagePath,
          price: item.price, // Use the cart's stored price (which includes discounts)
          product: item.product._id
        };
      }),
      shippingAddress: {
        street: state.selectedAddress.street,
        ward: state.selectedAddress.ward,
        district: state.selectedAddress.district,
        province: state.selectedAddress.province
      },
      paymentMethod: state.paymentMethod === 'COD' ? 'CashOnDelivery' : 'VNPay',
      taxPrice: 0,
      shippingPrice: state.orderSummary.shippingFee,
      totalPrice: state.orderSummary.totalAmount,
      // Chatbot specific fields
      chatbotOrder: true,
      orderSource: 'chatbot'
    };
  }

  /**
   * Update product stock after order creation
   */
  async updateProductStock(cartItems) {
    for (const item of cartItems) {
      const product = await this.models.Product.findById(item.product._id);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        product.sold = (product.sold || 0) + item.quantity;
        await product.save();
      }
    }
  }
}

module.exports = ConfirmOrderStep;
