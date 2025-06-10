/**
 * Handler for selecting shipping address
 */
const OrderStepHandler = require('../OrderStepHandler');
const { ORDER_STEPS } = require('../utils/OrderConstants');
const OrderMessageFormatter = require('../utils/OrderMessageFormatter');

class SelectAddressStep extends OrderStepHandler {
  async validatePreConditions(userId, params) {
    // Check if user exists
    try {
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
    const { addressId } = params;
    
    try {
      const user = await this.getUser(userId);

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
      throw error;
    }
  }

  async updateState(userId, result) {
    if (result.selectedAddress) {
      this.stateManager.updateOrderState(userId, { 
        selectedAddress: result.selectedAddress,
        step: ORDER_STEPS.ADDRESS_SELECTED 
      });
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

    const message = OrderMessageFormatter.formatAddressSelection(user.address);
    
    return {
      success: true,
      message: message,
      addresses: [user.address],
      needsSelection: true
    };
  }
}

module.exports = SelectAddressStep;
