/**
 * Helper class for formatting order messages
 */
const OrderEmojiHelper = require('./OrderEmojiHelper');

class OrderMessageFormatter {
  /**
   * Format cart summary message
   */
  static formatCartSummary(cart, subtotal, itemCount) {
    let cartSummary = `🛒 **KIỂM TRA GIỎ HÀNG**

📦 **Sản phẩm trong giỏ (${itemCount} sản phẩm):**
`;

    cart.items.forEach((item, index) => {
      const emoji = OrderEmojiHelper.getProductEmoji(item.product.category || 'default');
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

    return cartSummary;
  }

  /**
   * Format address selection message
   */
  static formatAddressSelection(address) {
    return `📍 **CHỌN ĐỊA CHỈ GIAO HÀNG**

1. 🏠 **Địa chỉ mặc định** 
   ${address.street}
   ${address.ward.name}, ${address.district.name}, ${address.province.name}

Nhập **"1"** hoặc **"chọn địa chỉ mặc định"** để tiếp tục.`;
  }

  /**
   * Format shipping calculation message
   */
  static formatShippingInfo(shippingInfo, address) {
    return `📦 **PHÍ VẬN CHUYỂN**

📍 **Giao đến:** ${address.district.name}, ${address.province.name}
🚚 **Dịch vụ:** Giao hàng tiêu chuẩn
💰 **Phí vận chuyển:** ${shippingInfo.fee.toLocaleString()}đ
⏰ **Thời gian dự kiến:** 2-3 ngày làm việc

💳 **Bước tiếp theo:** Chọn phương thức thanh toán

🔹 Nhập **"COD"** - Thanh toán khi nhận hàng
🔹 Nhập **"VNPay"** - Thanh toán online`;
  }

  /**
   * Format fallback shipping info message
   */
  static formatFallbackShipping(shippingInfo, address) {
    return `📦 **PHÍ VẬN CHUYỂN** (Phí cố định)

📍 **Giao đến:** ${address.district.name}, ${address.province.name}
🚚 **Dịch vụ:** Giao hàng tiêu chuẩn
💰 **Phí vận chuyển:** ${shippingInfo.fee.toLocaleString()}đ (phí cố định)
⏰ **Thời gian dự kiến:** 2-3 ngày làm việc

💳 **Bước tiếp theo:** Chọn phương thức thanh toán

🔹 Nhập **"COD"** - Thanh toán khi nhận hàng
🔹 Nhập **"VNPay"** - Thanh toán online`;
  }

  /**
   * Format payment method selection message
   */
  static formatPaymentSelection() {
    return `💳 **CHỌN PHƯƠNG THỨC THANH TOÁN**

1. 💵 **COD** (Thanh toán khi nhận hàng)
   • Thanh toán bằng tiền mặt khi nhận hàng
   • Không phí thêm
   • An toàn và tiện lợi

2. 🏦 **VNPay** (Thanh toán online)
   • Thanh toán qua thẻ ATM/Credit/QR Code  
   • Xử lý nhanh chóng
   • Bảo mật cao

Nhập **"COD"** hoặc **"VNPay"** để chọn:`;
  }

  /**
   * Format order summary message
   */
  static formatOrderSummary(orderSummary, address, paymentMethod) {
    return `📋 **XÁC NHẬN ĐƠN HÀNG**

🛒 **Sản phẩm:** ${orderSummary.subtotal.toLocaleString()}đ
📦 **Phí vận chuyển:** ${orderSummary.shippingFee.toLocaleString()}đ
🏷️ **Phí dịch vụ:** ${orderSummary.serviceFee.toLocaleString()}đ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 **TỔNG CỘNG: ${orderSummary.totalAmount.toLocaleString()}đ**

📍 **Giao đến:** 
${address.street}
${address.ward.name}, ${address.district.name}, ${address.province.name}

💳 **Thanh toán:** ${paymentMethod === 'COD' ? '💵 COD (Tiền mặt khi nhận hàng)' : '🏦 VNPay (Thanh toán online)'}
📅 **Dự kiến giao:** ${orderSummary.shippingInfo.estimatedDays || 3} ngày làm việc

✅ **XÁC NHẬN ĐẶT HÀNG?**
Nhập **"Có"** để xác nhận hoặc **"Không"** để hủy`;
  }

  /**
   * Format order success message
   */
  static formatOrderSuccess(orderNumber, totalAmount, paymentMethod, deliveryDate) {
    const currentDate = new Date();
    
    let successMessage = `🎉 **ĐẶT HÀNG THÀNH CÔNG!**

📄 **Mã đơn hàng:** ${orderNumber}
💰 **Tổng tiền:** ${totalAmount.toLocaleString()}đ
📅 **Ngày đặt:** ${currentDate.toLocaleDateString('vi-VN')}
📦 **Dự kiến giao:** ${deliveryDate}

📱 **Theo dõi đơn hàng:**
• Nói: "Kiểm tra đơn hàng ${orderNumber}"
• Hoặc: "Đơn hàng của tôi"

📞 **Hỗ trợ:** Liên hệ hotline nếu cần thay đổi`;

    if (paymentMethod === 'VNPay') {
      successMessage += `

💳 **Thanh toán VNPay:**
🔗 Đang tạo link thanh toán...
⏰ Bạn có 15 phút để hoàn tất thanh toán.`;
    }

    successMessage += `

🛒 **Mua tiếp?** Tôi có thể giúp bạn tìm sản phẩm khác!`;

    return successMessage;
  }

  /**
   * Format recent orders list
   */
  static formatOrdersList(orders) {
    let ordersList = "📦 **ĐƠN HÀNG CỦA BẠN**\n\n";
    orders.forEach((order, index) => {
      const orderNumber = `#${String(order._id).toUpperCase()}`;
      const statusEmoji = OrderEmojiHelper.getStatusEmoji(order.status);
      ordersList += `${index + 1}. ${statusEmoji} **${orderNumber}**\n`;
      ordersList += `   💰 ${order.totalPrice.toLocaleString()}đ - ${order.status}\n`;
      ordersList += `   📅 ${order.createdAt.toLocaleDateString('vi-VN')}\n\n`;
    });

    ordersList += "Nhập mã đơn hàng để xem chi tiết (ví dụ: #DH123456)";
    return ordersList;
  }

  /**
   * Format order details message
   */
  static formatOrderDetails(order) {
    const orderNumber = `#DH${String(order._id).slice(-6).toUpperCase()}`;
    const statusEmoji = OrderEmojiHelper.getStatusEmoji(order.status);

    // Format order items
    let itemsSection = '';
    if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
      itemsSection = '\n🛒 **Sản phẩm đã đặt:**\n';
      order.orderItems.forEach((item, idx) => {
        itemsSection += `${idx + 1}. **${item.name}** x${item.quantity} - ${item.price.toLocaleString()}đ\n`;
        if (item.image) {
          itemsSection += `   🖼️ ${item.image}\n`;
        }
      });
    }

    // Format shipping address
    let addressSection = '';
    if (order.shippingAddress) {
      const addr = order.shippingAddress;
      addressSection = `\n📍 **Địa chỉ giao hàng:**\n${addr.street || ''}${addr.city ? ', ' + addr.city : ''}${addr.state ? ', ' + addr.state : ''}${addr.postalCode ? ', ' + addr.postalCode : ''}${addr.country ? ', ' + addr.country : ''}`;
    }

    // Format payment method
    let paymentMethodSection = '';
    if (order.paymentMethod) {
      paymentMethodSection = `\n💳 **Phương thức thanh toán:** ${order.paymentMethod}`;
    }

    // Format tax, shipping, delivery, notes
    let extraSection = '';
    extraSection += `\n🧾 **Thuế:** ${order.taxPrice ? order.taxPrice.toLocaleString() : 0}đ`;
    extraSection += `\n🚚 **Phí vận chuyển:** ${order.shippingPrice ? order.shippingPrice.toLocaleString() : 0}đ`;
    extraSection += `\n📦 **Đã giao:** ${order.isDelivered ? '✅ Đã giao' : '⏳ Chưa giao'}`;
    if (order.notes) {
      extraSection += `\n📝 **Ghi chú:** ${order.notes}`;
    }

    let statusMessage = `📦 **CHI TIẾT ĐƠN HÀNG ${orderNumber}**

👤 **Mã khách hàng:** ${order.user && order.user.$oid ? order.user.$oid : ''}
${statusEmoji} **Trạng thái:** ${order.status}
💰 **Tổng tiền:** ${order.totalPrice.toLocaleString()}đ
📅 **Ngày đặt:** ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : ''}
💳 **Thanh toán:** ${order.isPaid ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}`;

    if (order.trackingNumber) {
      statusMessage += `\n📮 **Mã vận đơn:** ${order.trackingNumber}`;
    }

    statusMessage += itemsSection + addressSection + paymentMethodSection + extraSection;

    return statusMessage;
  }

  /**
   * Format cart auto-fix message
   */
  static formatCartAutoFix(removedItems, adjustedItems, remainingCount, newTotal) {
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

    if (remainingCount > 0) {
      message += `🛒 **Giỏ hàng còn lại:** ${remainingCount} sản phẩm\n`;
      message += `💰 **Tổng tiền mới:** ${newTotal.toLocaleString()}đ`;
    } else {
      message += `❌ **Giỏ hàng trống** sau khi điều chỉnh`;
    }

    return message;
  }
}

module.exports = OrderMessageFormatter;
