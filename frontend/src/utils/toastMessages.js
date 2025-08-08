// toastMessages.js - Centralized Vietnamese toast messages

export const TOAST_MESSAGES = {
  // Authentication
  AUTH: {
    LOGIN_SUCCESS: 'Đăng nhập thành công! Chào mừng bạn quay trở lại!',
    LOGIN_ERROR: 'Đăng nhập thất bại! Vui lòng kiểm tra thông tin và thử lại.',
    REGISTER_SUCCESS: 'Đăng ký thành công!',
    REGISTER_SUCCESS_WITH_COUPON: 'Đăng ký thành công! Bạn đã nhận được mã giảm giá 30% cho đơn hàng đầu tiên.',
    EMAIL_ALREADY_EXISTS: 'Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.',
    PASSWORD_MIN_LENGTH: 'Mật khẩu phải có ít nhất 6 ký tự',
    PASSWORD_MISMATCH: 'Mật khẩu xác nhận không khớp',
    PLEASE_LOGIN: 'Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích'
  },

  // Password Reset
  PASSWORD_RESET: {
    EMAIL_REQUIRED: 'Vui lòng nhập email',
    TOKEN_REQUIRED: 'Vui lòng nhập mã reset',
    TOKEN_COPIED: 'Đã sao chép mã reset vào clipboard!',
    RESET_SUCCESS: 'Mật khẩu đã được reset thành công! Bạn đã được đăng nhập.'
  },

  // Profile
  PROFILE: {
    NAME_REQUIRED: 'Vui lòng nhập tên của bạn',
    EMAIL_REQUIRED: 'Vui lòng nhập email của bạn',
    EMAIL_INVALID: 'Vui lòng nhập một địa chỉ email hợp lệ',
    UPDATE_SUCCESS: 'Cập nhật hồ sơ thành công',
    UPDATE_ERROR: 'Lỗi khi cập nhật hồ sơ',
    LOAD_ERROR: 'Lỗi khi lấy thông tin hồ sơ'
  },

  // Cart
  CART: {
    ADDED_SUCCESS: 'Đã thêm vào giỏ hàng',
    ADDED_ERROR: 'Lỗi khi thêm vào giỏ hàng',
    UPDATE_SUCCESS: 'Cập nhật giỏ hàng thành công',
    UPDATE_ERROR: 'Lỗi khi cập nhật giỏ hàng',
    REMOVE_SUCCESS: 'Đã xóa sản phẩm khỏi giỏ hàng',
    REMOVE_ERROR: 'Lỗi khi xóa sản phẩm',
    EMPTY_SUCCESS: 'Đã làm trống giỏ hàng',
    EMPTY_ERROR: 'Lỗi khi làm trống giỏ hàng',
    OUT_OF_STOCK: 'Sản phẩm đã hết hàng',
    INSUFFICIENT_STOCK: 'Chỉ còn {stock} sản phẩm trong kho',
    FETCH_ERROR: 'Lỗi khi tải giỏ hàng'
  },

  // Wishlist
  WISHLIST: {
    ADDED_SUCCESS: 'Đã thêm vào danh sách yêu thích',
    REMOVED_SUCCESS: 'Đã xóa khỏi danh sách yêu thích',
    UPDATE_ERROR: 'Lỗi khi cập nhật danh sách yêu thích',
    LOAD_ERROR: 'Lỗi khi tải danh sách yêu thích'
  },

  // Coupons
  COUPON: {
    CODE_REQUIRED: 'Vui lòng nhập mã giảm giá',
    APPLIED_SUCCESS: 'Mã giảm giá {code} đã được áp dụng!',
    FREE_SHIPPING_APPLIED: '🚚 Mã miễn phí vận chuyển đã được áp dụng!',
    REMOVED: 'Đã xóa mã giảm giá',
    COPY_SUCCESS: 'Đã sao chép mã {code}!',
    COPY_ERROR: 'Không thể sao chép mã giảm giá',
    ALREADY_USED: 'Mã giảm giá của bạn đã được sử dụng.',
    STILL_AVAILABLE: 'Mã giảm giá của bạn vẫn có thể sử dụng!',
    UPDATE_STATUS_ERROR: 'Không thể cập nhật trạng thái mã giảm giá.',
    CREATE_SUCCESS: 'Đã tạo mã giảm giá 30% thành công!',
    CREATE_ERROR: 'Không thể tạo mã giảm giá. Vui lòng thử lại sau!',
    RETURNED_INFO: 'Mã giảm giá {code} đã được hoàn trả và bạn có thể sử dụng lại'
  },

  // Orders
  ORDER: {
    SUCCESS: 'Đặt hàng thành công!',
    ERROR: 'Lỗi khi đặt hàng. Vui lòng thử lại!',
    CANCEL_SUCCESS: 'Hủy đơn hàng thành công',
    CANCEL_ERROR: 'Lỗi khi hủy đơn hàng',
    LOAD_ERROR: 'Lỗi khi lấy thông tin đơn hàng',
    LIST_ERROR: 'Lỗi khi lấy danh sách đơn hàng'
  },

  // Payment
  PAYMENT: {
    SUCCESS: 'Thanh toán thành công!',
    ERROR: 'Thanh toán thất bại: {message}',
    CHECK_ERROR: 'Lỗi khi kiểm tra trạng thái thanh toán',
    LINK_ERROR: 'Lỗi khi tạo liên kết thanh toán'
  },

  // Reviews
  REVIEW: {
    RATING_REQUIRED: 'Vui lòng chọn số sao từ 1 đến 5',
    TITLE_REQUIRED: 'Vui lòng nhập tiêu đề đánh giá',
    COMMENT_REQUIRED: 'Vui lòng nhập nội dung đánh giá',
    SUBMIT_SUCCESS: 'Gửi đánh giá thành công',
    SUBMIT_ERROR: 'Lỗi khi gửi đánh giá',
    UPDATE_SUCCESS: 'Đánh giá đã được cập nhật thành công',
    UPDATE_ERROR: 'Lỗi khi cập nhật đánh giá',
    DELETE_SUCCESS: 'Đánh giá đã được xóa thành công',
    DELETE_ERROR: 'Lỗi khi xóa đánh giá',
    LOAD_ERROR: 'Lỗi khi lấy đánh giá'
  },

  // Address
  ADDRESS: {
    LOAD_ERROR: 'Không thể tải địa chỉ',
    LOCATION_REQUIRED: 'Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, phường/xã',
    DETAIL_REQUIRED: 'Vui lòng nhập địa chỉ chi tiết',
    UPDATE_SUCCESS: 'Cập nhật địa chỉ thành công',
    UPDATE_ERROR: 'Lỗi khi cập nhật địa chỉ',
    SHIPPING_CHECK_ERROR: 'Vui lòng kiểm tra thông tin địa chỉ giao hàng'
  },

  // Products
  PRODUCT: {
    LOAD_ERROR: 'Lỗi khi lấy sản phẩm',
    CATEGORY_ERROR: 'Lỗi khi lấy danh mục'
  },

  // Admin Categories
  ADMIN_CATEGORY: {
    DELETE_SUCCESS: 'Xóa danh mục thành công',
    DELETE_ERROR: 'Lỗi khi xóa danh mục',
    DELETE_MULTIPLE_SUCCESS: 'Xóa các danh mục thành công',
    DELETE_MULTIPLE_ERROR: 'Lỗi khi xóa các danh mục',
    SAVE_SUCCESS: 'Lưu danh mục thành công!',
    SAVE_ERROR: 'Lỗi khi lưu danh mục',
    IMAGE_SIZE_ERROR: 'Kích thước ảnh phải nhỏ hơn 5MB',
    IMAGE_TYPE_ERROR: 'Vui lòng tải lên file ảnh'
  },

  // Newsletter
  NEWSLETTER: {
    SIGNUP_SUCCESS: 'Vui lòng đăng ký để nhận mã giảm giá 30% cho đơn hàng đầu tiên',
    COUPON_CREATED: 'Đã tạo mã giảm giá 30% cho đơn hàng đầu tiên của bạn!',
    SIGNUP_ERROR: 'Không thể đăng ký lúc này. Vui lòng thử lại sau!'
  },

  // General
  GENERAL: {
    UNKNOWN_ERROR: 'Có lỗi xảy ra! Vui lòng thử lại.',
    NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.'
  }
};

// Helper function to replace placeholders in messages
export const formatToastMessage = (message, replacements = {}) => {
  let formattedMessage = message;
  Object.keys(replacements).forEach(key => {
    formattedMessage = formattedMessage.replace(`{${key}}`, replacements[key]);
  });
  return formattedMessage;
};

// Export individual categories for easier imports
export const {
  AUTH,
  PASSWORD_RESET,
  PROFILE,
  CART,
  WISHLIST,
  COUPON,
  ORDER,
  PAYMENT,
  REVIEW,
  ADDRESS,
  PRODUCT,
  ADMIN_CATEGORY,
  NEWSLETTER,
  GENERAL
} = TOAST_MESSAGES;