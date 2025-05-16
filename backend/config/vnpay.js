const vnpayConfig = {
  // Merchant config
  tmnCode: "WC1RRQDL",
  hashSecret: "SHX0GT67H0D0IXUK0PVW8RY3E6WXO2XZ",

  // API endpoints
  vnpUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl: "http://localhost:3000/payment/vnpay_return",
  ipnUrl: "http://localhost:5000/api/payment/vnpay_ipn",
  apiUrl: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",

  // Payment config
  orderType: "billpayment",
  currCode: "VND",
  locale: "vn",
  expireTime: 15, // minutes

  // Response codes
  successCode: "00",
  
  // URL encoding
  urlEncode: true,
  encodeCharset: "utf-8",
  
  // API version
  apiVersion: "2.1.0"
};

module.exports = vnpayConfig;
