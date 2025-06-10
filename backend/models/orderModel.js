// orderModel.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  orderItems: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true },
      product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Product",
      },
    },
  ],
  shippingAddress: {
    street: { type: String, required: true },
    ward: {
      code: { type: String, required: true },
      name: { type: String, required: true }
    },
    district: {
      id: { type: Number, required: true },
      name: { type: String, required: true }
    },
    province: {
      id: { type: Number, required: true },
      name: { type: String, required: true }
    }
  },
  paymentMethod: {
    type: String,
    required: [true, "Payment method is required"],
    enum: [
      "PayPal",
      "Stripe",
      "CreditCard",
      "BankTransfer",
      "CashOnDelivery",
      "VNPay",
    ],
  },
  paymentResult: {
    id: { type: String },
    status: { type: String },
    update_time: { type: String },
    email_address: { type: String },
    // VNPay specific fields
    vnp_TransactionNo: { type: String },
    vnp_PayDate: { type: String },
    vnp_OrderInfo: { type: String },
    vnp_ResponseCode: { type: String },
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  shippingDetails: {
    ghnFee: {
      type: Number,
      default: 0
    },
    originalFee: {
      type: Number,
      default: 0
    },
    discountedFee: {
      type: Number,
      default: 0
    },
    serviceType: {
      type: String,
      default: 'standard'
    },
    estimatedDays: {
      type: Number,
      default: 3
    }
  },
  couponDiscount: {
    type: Number,
    default: 0.0,
  },
  couponCode: {
    type: String,
    default: null,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false,
  },
  paidAt: {
    type: Date,
  },
  paymentDetails: {
    provider: String, // 'vnpay', 'cod', etc.
    txnRef: String, // Mã tham chiếu giao dịch
    transactionNo: String, // Mã giao dịch tại VNPay
    bankCode: String, // Mã ngân hàng
    bankTranNo: String, // Mã giao dịch tại ngân hàng
    cardType: String, // Loại thẻ: ATM, QRCODE, etc.
    payDate: String, // Ngày thanh toán từ VNPay
    responseCode: String, // Mã phản hồi từ VNPay
    transactionStatus: String, // Trạng thái giao dịch từ VNPay
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
  },
  status: {
    type: String,
    required: true,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Processing",
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false,
  },
  deliveredAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  trackingNumber: {
    type: String,
  },
  notes: {
    type: String,
  },
  
  // Chatbot order fields
  chatbotOrder: {
    type: Boolean,
    default: false
  },
  conversationId: {
    type: String,
    required: false
  },
  orderSource: {
    type: String,
    enum: ['web', 'chatbot', 'mobile'],
    default: 'web'
  },
  chatbotMetadata: {
    intentConfidence: Number,
    conversationLength: Number,
    onboardingShown: Boolean,
    paymentMethodChanges: Number
  }
});

module.exports = mongoose.model("Order", orderSchema);
