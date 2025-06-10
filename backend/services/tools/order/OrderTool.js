// OrderTool.js
const { StructuredTool } = require("langchain/tools");
const { z } = require("zod");
const Cart = require("../../../models/cartModel");
const User = require("../../../models/userModel");
const Order = require("../../../models/orderModel");
const Product = require("../../../models/productModel");
const InventoryValidator = require("./InventoryValidator");
const ghnService = require("../../ghnService");

/**
 * Main OrderTool for chatbot order creation and management
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

    this.userContext = userContext;
    this.ghnService = ghnServiceInstance || require("../../ghnService");
    this.orderController = orderController;
    this.orderState = new Map(); // Store order state per user session
  }

  /**
   * Get or initialize order state for current user
   */
  getOrderState(userId) {
    if (!this.orderState.has(userId)) {
      this.orderState.set(userId, {
        step: 'IDLE',
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

  async _call({ action, addressId, paymentMethod, confirmOrder, orderId }) {
    try {
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

      console.log(`[OrderTool] Action: ${action} for user: ${userId}`);

      switch (action) {
        case 'initiate_order':
          return await this.initiateOrder(userId);
        
        case 'validate_cart':
          return await this.validateCart(userId);
        
        case 'select_address':
          return await this.selectAddress(userId, addressId);
        
        case 'calculate_shipping':
          return await this.calculateShipping(userId);
        
        case 'select_payment':
          return await this.selectPaymentMethod(userId, paymentMethod);
        
        case 'show_summary':
          return await this.showOrderSummary(userId);
        
        case 'confirm_order':
          return await this.confirmOrder(userId, confirmOrder);
        
        case 'check_status':
          return await this.checkOrderStatus(userId, orderId);
        
        default:
          return {
            success: false,
            message: `❌ Hành động không hợp lệ: ${action}`
          };
      }

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
   * Initiate order process - first step
   */
  async initiateOrder(userId) {
    try {
      // Reset order state
      this.updateOrderState(userId, {
        step: 'ORDER_INITIATED',
        cartValidation: null,
        selectedAddress: null,
        shippingInfo: null,
        paymentMethod: null
      });

      // Check if user is authenticated
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "❌ Không tìm thấy thông tin người dùng!"
        };
      }

      // Get cart items
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || !cart.items || cart.items.length === 0) {
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
      const validation = await InventoryValidator.validateCartInventory(cart.items);
      this.updateOrderState(userId, { cartValidation: validation });

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

      // Calculate total using the cart's stored prices (which include discounts)
      const subtotal = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

      // Show cart summary and proceed
      let cartSummary = `🛒 **KIỂM TRA GIỎ HÀNG**

📦 **Sản phẩm trong giỏ (${itemCount} sản phẩm):**
`;

      cart.items.forEach((item, index) => {
        const emoji = this.getProductEmoji(item.product.category || 'default');
        // Show discount info if applicable
        let priceDisplay = `💰 ${item.price.toLocaleString()}đ`;
        if (item.product.discountPrice && item.product.discountPrice < item.product.price) {
          priceDisplay = `💰 ~~${item.product.price.toLocaleString()}đ~~ ${item.price.toLocaleString()}đ (đã giảm giá)`;
        }
        
        cartSummary += `${index + 1}. ${emoji} **${item.product.name}**
   ${priceDisplay} x ${item.quantity} = ${(item.price * item.quantity).toLocaleString()}đ
   📦 Kho: ${item.product.stock} sản phẩm
   
`;
      });

      cartSummary += `💰 **Tạm tính:** ${subtotal.toLocaleString()}đ
✅ **Tất cả sản phẩm đều có sẵn**

🚀 **Tiếp tục đặt hàng?** 
Nhập "có" để chọn địa chỉ giao hàng, hoặc "hủy" để dừng lại.`;

      this.updateOrderState(userId, { step: 'CART_VALIDATED' });

      return {
        success: true,
        message: cartSummary,
        cart: cart,
        validation: validation,
        subtotal: subtotal,
        nextStep: 'select_address'
      };

    } catch (error) {
      console.error('Error in initiateOrder:', error);
      return {
        success: false,
        message: "❌ Lỗi khi khởi tạo đơn hàng. Vui lòng thử lại!"
      };
    }
  }

  /**
   * Validate cart inventory
   */
  async validateCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || !cart.items || cart.items.length === 0) {
        return {
          success: false,
          message: "🛒 Giỏ hàng trống!"
        };
      }

      const validation = await InventoryValidator.validateCartInventory(cart.items);
      this.updateOrderState(userId, { cartValidation: validation });

      return {
        success: validation.success,
        message: validation.summary.message,
        validation: validation
      };

    } catch (error) {
      console.error('Error validating cart:', error);
      return {
        success: false,
        message: "❌ Lỗi khi kiểm tra giỏ hàng!"
      };
    }
  }

  /**
   * Select shipping address
   */
  async selectAddress(userId, addressId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "❌ Không tìm thấy thông tin người dùng!"
        };
      }

      // If no addressId provided, show address selection
      if (!addressId) {
        return await this.showAddressSelection(user);
      }

      // Validate and select address
      let selectedAddress = null;

      // Check if it's user's default address
      if (addressId === 'default' && user.address && user.address.street) {
        selectedAddress = user.address;
      } else {
        // For now, use default address (extend later for multiple addresses)
        if (user.address && user.address.street) {
          selectedAddress = user.address;
        }
      }

      if (!selectedAddress) {
        return {
          success: false,
          message: `📍 **CHƯA CÓ ĐỊA CHỈ GIAO HÀNG**

Bạn chưa thiết lập địa chỉ giao hàng. 

🔧 **Hướng dẫn:**
1. Vào trang "Hồ sơ" 
2. Cập nhật địa chỉ đầy đủ
3. Quay lại đặt hàng

Hoặc nói "cập nhật địa chỉ" để tôi hướng dẫn!`
        };
      }

      this.updateOrderState(userId, { 
        selectedAddress: selectedAddress,
        step: 'ADDRESS_SELECTED' 
      });

      return {
        success: true,
        message: `📍 **ĐỊA CHỈ GIAO HÀNG**

✅ **Đã chọn địa chỉ:**
${selectedAddress.street}
${selectedAddress.ward.name}, ${selectedAddress.district.name}, ${selectedAddress.province.name}

📦 **Đang tính phí vận chuyển...**`,
        selectedAddress: selectedAddress,
        nextStep: 'calculate_shipping'
      };

    } catch (error) {
      console.error('Error selecting address:', error);
      return {
        success: false,
        message: "❌ Lỗi khi chọn địa chỉ!"
      };
    }
  }

  /**
   * Show address selection options
   */
  async showAddressSelection(user) {
    if (!user.address || !user.address.street) {
      return {
        success: false,
        message: `📍 **THIẾT LẬP ĐỊA CHỈ GIAO HÀNG**

Bạn chưa có địa chỉ giao hàng nào được lưu.

🔧 **Cách thêm địa chỉ:**
1. Vào trang **"Hồ sơ"** 
2. Điền đầy đủ thông tin địa chỉ
3. Quay lại đặt hàng

📞 **Cần hỗ trợ?** Nói "hướng dẫn cập nhật địa chỉ"`,
        needsAddressSetup: true
      };
    }

    const address = user.address;
    return {
      success: true,
      message: `📍 **CHỌN ĐỊA CHỈ GIAO HÀNG**

1. 🏠 **Địa chỉ mặc định** 
   ${address.street}
   ${address.ward.name}, ${address.district.name}, ${address.province.name}

Nhập **"1"** hoặc **"chọn địa chỉ mặc định"** để tiếp tục.`,
      addresses: [address],
      needsSelection: true
    };
  }

  /**
   * Calculate shipping cost using GHN
   */
  async calculateShipping(userId) {
    try {
      const state = this.getOrderState(userId);
      if (!state.selectedAddress) {
        return {
          success: false,
          message: "❌ Vui lòng chọn địa chỉ giao hàng trước!"
        };
      }

      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return {
          success: false,
          message: "❌ Không tìm thấy giỏ hàng!"
        };
      }

      // Calculate total weight and value
      const totalWeight = cart.items.reduce((weight, item) => {
        return weight + ((item.product.weight || 500) * item.quantity); // Default 500g
      }, 0);

      const totalValue = cart.items.reduce((value, item) => {
        return value + (item.product.price * item.quantity);
      }, 0);

      // Get shipping fee from GHN
      const shippingRequest = {
        service_type_id: 2, // Standard service
        to_district_id: state.selectedAddress.district.id,
        to_ward_code: state.selectedAddress.ward.code,
        weight: Math.max(totalWeight, 500), // Minimum 500g
        insurance_value: totalValue
      };

      console.log('[OrderTool] Calculating shipping with:', shippingRequest);

      const shippingResult = await this.ghnService.calculateShippingFee(shippingRequest);
      console.log('[OrderTool] GHN shipping result:', JSON.stringify(shippingResult));
      
      if (!shippingResult.success) {
        // Use fallback shipping fee from GHNService result
        console.log('[OrderTool] GHN API failed, using fallback shipping fee');
        const fallbackShippingInfo = {
          fee: shippingResult.fallbackFee || 30000, // Use fallback fee from GHNService or default to 30k VND
          serviceType: 'standard',
          estimatedDays: 3
        };

        console.log('[OrderTool] Using fallback shipping info:', fallbackShippingInfo);

        this.updateOrderState(userId, { 
          shippingInfo: fallbackShippingInfo,
          step: 'SHIPPING_CALCULATED' 
        });

        return {
          success: true,
          message: `📦 **PHÍ VẬN CHUYỂN** (Phí cố định)

📍 **Giao đến:** ${state.selectedAddress.district.name}, ${state.selectedAddress.province.name}
🚚 **Dịch vụ:** Giao hàng tiêu chuẩn
💰 **Phí vận chuyển:** ${fallbackShippingInfo.fee.toLocaleString()}đ (phí cố định)
⏰ **Thời gian dự kiến:** 2-3 ngày làm việc

💳 **Bước tiếp theo:** Chọn phương thức thanh toán

🔹 Nhập **"COD"** - Thanh toán khi nhận hàng
🔹 Nhập **"VNPay"** - Thanh toán online`,
          shippingInfo: fallbackShippingInfo,
          nextStep: 'select_payment'
        };
      }

      // Kiểm tra dữ liệu trả về từ GHNService
      console.log('[OrderTool] GHN API success, data:', shippingResult.data);
      
      const shippingInfo = {
        fee: shippingResult.data?.total || 30000, // Fallback to 30k if total is undefined
        serviceType: 'standard',
        estimatedDays: 2, // Default 2-3 days
        ...shippingResult.data
      };

      console.log('[OrderTool] Final shipping info:', shippingInfo);

      this.updateOrderState(userId, { 
        shippingInfo: shippingInfo,
        step: 'SHIPPING_CALCULATED' 
      });

      return {
        success: true,
        message: `📦 **PHÍ VẬN CHUYỂN**

📍 **Giao đến:** ${state.selectedAddress.district.name}, ${state.selectedAddress.province.name}
🚚 **Dịch vụ:** Giao hàng tiêu chuẩn
💰 **Phí vận chuyển:** ${shippingInfo.fee.toLocaleString()}đ
⏰ **Thời gian dự kiến:** 2-3 ngày làm việc

💳 **Bước tiếp theo:** Chọn phương thức thanh toán

🔹 Nhập **"COD"** - Thanh toán khi nhận hàng
🔹 Nhập **"VNPay"** - Thanh toán online`,
        shippingInfo: shippingInfo,
        nextStep: 'select_payment'
      };

    } catch (error) {
      console.error('Error calculating shipping:', error);
      return {
        success: false,
        message: "❌ Lỗi khi tính phí vận chuyển. Sử dụng phí mặc định 30,000đ.",
        shippingInfo: { fee: 30000, serviceType: 'standard', estimatedDays: 3 }
      };
    }
  }

  /**
   * Select payment method
   */
  async selectPaymentMethod(userId, paymentMethod) {
    try {
      if (!paymentMethod) {
        return {
          success: true,
          message: `💳 **CHỌN PHƯƠNG THỨC THANH TOÁN**

1. 💵 **COD** (Thanh toán khi nhận hàng)
   • Thanh toán bằng tiền mặt khi nhận hàng
   • Không phí thêm
   • An toàn và tiện lợi

2. 🏦 **VNPay** (Thanh toán online)
   • Thanh toán qua thẻ ATM/Credit/QR Code  
   • Xử lý nhanh chóng
   • Bảo mật cao

Nhập **"COD"** hoặc **"VNPay"** để chọn:`,
          needsPaymentSelection: true
        };
      }

      // Validate payment method
      if (!['COD', 'VNPay'].includes(paymentMethod)) {
        return {
          success: false,
          message: `❌ Phương thức thanh toán không hợp lệ. Vui lòng chọn **COD** hoặc **VNPay**.`
        };
      }

      this.updateOrderState(userId, { 
        paymentMethod: paymentMethod,
        step: 'PAYMENT_SELECTED' 
      });

      const paymentEmoji = paymentMethod === 'COD' ? '💵' : '🏦';
      const paymentName = paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'VNPay - Thanh toán online';

      return {
        success: true,
        message: `✅ **ĐÃ CHỌN THANH TOÁN**

${paymentEmoji} **${paymentName}**

📋 **Bước tiếp theo:** Xem tóm tắt đơn hàng
Nhập **"xem đơn hàng"** hoặc **"tóm tắt"** để tiếp tục.`,
        paymentMethod: paymentMethod,
        nextStep: 'show_summary'
      };

    } catch (error) {
      console.error('Error selecting payment method:', error);
      return {
        success: false,
        message: "❌ Lỗi khi chọn phương thức thanh toán!"
      };
    }
  }

  /**
   * Show order summary before final confirmation
   */
  async showOrderSummary(userId) {
    try {
      const state = this.getOrderState(userId);
      
      if (!state.selectedAddress || !state.shippingInfo || !state.paymentMethod) {
        return {
          success: false,
          message: "❌ Vui lòng hoàn tất các bước trước: chọn địa chỉ, tính phí ship và chọn thanh toán!"
        };
      }

      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return {
          success: false,
          message: "❌ Không tìm thấy giỏ hàng!"
        };
      }

      // Calculate totals using the cart's stored prices (which include discounts)
      const subtotal = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      const shippingFee = state.shippingInfo.fee || 30000;
      const serviceFee = 10000; // Fixed service fee
      const totalAmount = subtotal + shippingFee + serviceFee;

      // Create order summary
      let summary = `📋 **XÁC NHẬN ĐƠN HÀNG**

🛒 **Sản phẩm:** ${subtotal.toLocaleString()}đ
📦 **Phí vận chuyển:** ${shippingFee.toLocaleString()}đ
🏷️ **Phí dịch vụ:** ${serviceFee.toLocaleString()}đ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 **TỔNG CỘNG: ${totalAmount.toLocaleString()}đ**

📍 **Giao đến:** 
${state.selectedAddress.street}
${state.selectedAddress.ward.name}, ${state.selectedAddress.district.name}, ${state.selectedAddress.province.name}

💳 **Thanh toán:** ${state.paymentMethod === 'COD' ? '💵 COD (Tiền mặt khi nhận hàng)' : '🏦 VNPay (Thanh toán online)'}
📅 **Dự kiến giao:** ${state.shippingInfo.estimatedDays || 3} ngày làm việc

✅ **XÁC NHẬN ĐẶT HÀNG?**
Nhập **"Có"** để xác nhận hoặc **"Không"** để hủy`;

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

      this.updateOrderState(userId, { 
        orderSummary: orderSummary,
        step: 'SUMMARY_SHOWN' 
      });

      return {
        success: true,
        message: summary,
        orderSummary: orderSummary,
        needsConfirmation: true
      };

    } catch (error) {
      console.error('Error showing order summary:', error);
      return {
        success: false,
        message: "❌ Lỗi khi tạo tóm tắt đơn hàng!"
      };
    }
  }

  /**
   * Confirm and create the actual order
   */
  async confirmOrder(userId, confirmed) {
    try {
      if (confirmed !== true) {
        return {
          success: false,
          message: `❌ **ĐƠN HÀNG CHƯA ĐƯỢC XÁC NHẬN**

Vui lòng nhập **"Có"** để xác nhận đặt hàng hoặc **"Không"** để hủy.`
        };
      }

      const state = this.getOrderState(userId);
      
      if (!state.orderSummary) {
        return {
          success: false,
          message: "❌ Vui lòng xem tóm tắt đơn hàng trước khi xác nhận!"
        };
      }

      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return {
          success: false,
          message: "❌ Không tìm thấy giỏ hàng!"
        };
      }

      // Final inventory check
      const finalValidation = await InventoryValidator.validateCartInventory(cart.items);
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
      const orderData = {
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

      // Create order
      const order = await Order.create(orderData);

      // Update product stock
      for (const item of cart.items) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.stock = Math.max(0, product.stock - item.quantity);
          product.sold = (product.sold || 0) + item.quantity;
          await product.save();
        }
      }

      // Clear cart
      await Cart.findOneAndDelete({ user: userId });

      // Generate order number
      const orderNumber = `#DH${String(order._id).slice(-6).toUpperCase()}`;

      // Update order state
      this.updateOrderState(userId, { 
        createdOrder: order,
        step: 'ORDER_CREATED' 
      });

      // Format success message
      const currentDate = new Date();
      const deliveryDate = new Date(currentDate.getTime() + (state.shippingInfo.estimatedDays || 3) * 24 * 60 * 60 * 1000);

      let successMessage = `🎉 **ĐẶT HÀNG THÀNH CÔNG!**

📄 **Mã đơn hàng:** ${orderNumber}
💰 **Tổng tiền:** ${state.orderSummary.totalAmount.toLocaleString()}đ
📅 **Ngày đặt:** ${currentDate.toLocaleDateString('vi-VN')}
📦 **Dự kiến giao:** ${deliveryDate.toLocaleDateString('vi-VN')}

📱 **Theo dõi đơn hàng:**
• Nói: "Kiểm tra đơn hàng ${orderNumber}"
• Hoặc: "Đơn hàng của tôi"

📞 **Hỗ trợ:** Liên hệ hotline nếu cần thay đổi`;

      if (state.paymentMethod === 'VNPay') {
        successMessage += `

💳 **Thanh toán VNPay:**
🔗 Đang tạo link thanh toán...
⏰ Bạn có 15 phút để hoàn tất thanh toán.`;
      }

      successMessage += `

🛒 **Mua tiếp?** Tôi có thể giúp bạn tìm sản phẩm khác!`;

      return {
        success: true,
        message: successMessage,
        order: {
          _id: order._id,
          orderNumber: orderNumber,
          totalPrice: state.orderSummary.totalAmount,
          status: order.status,
          paymentMethod: state.paymentMethod,
          estimatedDelivery: deliveryDate.toLocaleDateString('vi-VN'),
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

  /**
   * Check order status
   */
  async checkOrderStatus(userId, orderId) {
    try {
      if (!orderId) {
        // Show recent orders
        const recentOrders = await Order.find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(5);

        if (recentOrders.length === 0) {
          return {
            success: false,
            message: "📦 Bạn chưa có đơn hàng nào!"
          };
        }

        let ordersList = "📦 **ĐƠN HÀNG CỦA BẠN**\n\n";
        recentOrders.forEach((order, index) => {
          const orderNumber = `#DH${String(order._id).slice(-6).toUpperCase()}`;
          const statusEmoji = this.getStatusEmoji(order.status);
          ordersList += `${index + 1}. ${statusEmoji} **${orderNumber}**\n`;
          ordersList += `   💰 ${order.totalPrice.toLocaleString()}đ - ${order.status}\n`;
          ordersList += `   📅 ${order.createdAt.toLocaleDateString('vi-VN')}\n\n`;
        });

        ordersList += "Nhập mã đơn hàng để xem chi tiết (ví dụ: #DH123456)";

        return {
          success: true,
          message: ordersList,
          orders: recentOrders
        };
      }

      // Check specific order
      const order = await Order.findById(orderId).populate('orderItems.product');
      if (!order || order.user.toString() !== userId) {
        return {
          success: false,
          message: `❌ Không tìm thấy đơn hàng ${orderId}!`
        };
      }

      const orderNumber = `#DH${String(order._id).slice(-6).toUpperCase()}`;
      const statusEmoji = this.getStatusEmoji(order.status);
      
      let statusMessage = `📦 **CHI TIẾT ĐƠN HÀNG ${orderNumber}**

${statusEmoji} **Trạng thái:** ${order.status}
💰 **Tổng tiền:** ${order.totalPrice.toLocaleString()}đ
📅 **Ngày đặt:** ${order.createdAt.toLocaleDateString('vi-VN')}
💳 **Thanh toán:** ${order.isPaid ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}`;

      if (order.trackingNumber) {
        statusMessage += `\n📮 **Mã vận đơn:** ${order.trackingNumber}`;
      }

      return {
        success: true,
        message: statusMessage,
        order: order
      };

    } catch (error) {
      console.error('Error checking order status:', error);
      return {
        success: false,
        message: "❌ Lỗi khi kiểm tra trạng thái đơn hàng!"
      };
    }
  }

  /**
   * Auto-fix cart by removing unavailable products and adjusting quantities
   */
  async autoFixCart(userId, validation) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return { success: false, message: "Không tìm thấy giỏ hàng" };
      }

      let removedItems = [];
      let adjustedItems = [];
      let fixedItems = [];

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
        } else if (result.severity === 'SUCCESS') {
          fixedItems.push(result.item);
        }
      }

      // Recalculate total price
      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      // Save updated cart
      await cart.save();

      // Generate fix message
      let message = "✅ **Đã tự động điều chỉnh giỏ hàng:**\n\n";
      
      if (removedItems.length > 0) {
        message += `🗑️ **Đã xóa ${removedItems.length} sản phẩm không có sẵn:**\n`;
        removedItems.forEach(item => {
          message += `• ${item.name}\n`;
        });
        message += "\n";
      }

      if (adjustedItems.length > 0) {
        message += `📦 **Đã điều chỉnh số lượng ${adjustedItems.length} sản phẩm:**\n`;
        adjustedItems.forEach(item => {
          message += `• ${item.name}: ${item.oldQuantity} → ${item.newQuantity}\n`;
        });
        message += "\n";
      }

      if (cart.items.length > 0) {
        message += `🛒 **Giỏ hàng còn lại:** ${cart.items.length} sản phẩm\n`;
        message += `💰 **Tổng tiền mới:** ${cart.totalPrice.toLocaleString()}đ`;
      } else {
        message += `❌ **Giỏ hàng trống** sau khi điều chỉnh`;
        return { 
          success: false, 
          message: message + "\n\nVui lòng thêm sản phẩm mới vào giỏ hàng." 
        };
      }

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

  /**
   * Get product emoji based on category
   */
  getProductEmoji(category) {
    const emojiMap = {
      'laptop': '💻',
      'mouse': '🖱️',
      'keyboard': '⌨️',
      'headphone': '🎧',
      'monitor': '🖥️',
      'chair': '🪑',
      'default': '📦'
    };
    
    // Handle case where category might be an object or not a string
    let categoryString = 'default';
    if (category) {
      if (typeof category === 'string') {
        categoryString = category.toLowerCase();
      } else if (category.name && typeof category.name === 'string') {
        categoryString = category.name.toLowerCase();
      } else if (category.toString && typeof category.toString === 'function') {
        categoryString = category.toString().toLowerCase();
      }
    }
    
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (categoryString.includes(key)) {
        return emoji;
      }
    }
    
    return emojiMap.default;
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(status) {
    const statusMap = {
      'Processing': '🔄',
      'Shipped': '🚚',
      'Delivered': '✅',
      'Cancelled': '❌'
    };
    
    return statusMap[status] || '📦';
  }
}

module.exports = OrderTool;
