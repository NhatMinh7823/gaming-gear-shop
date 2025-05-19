const vnpayConfig = {
  // Merchant config
  tmnCode: process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,

  // API endpoints
  vnpUrl:
    process.env.VNPAY_URL ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl: process.env.VNPAY_RETURN_URL,
  ipnUrl: process.env.VNPAY_IPN_URL,

  // Payment config
  orderType: "billpayment",
  currCode: "VND",
  locale: "vn",

  // API version
  apiVersion: "2.1.0",

  // Response codes
  successCode: "00",
};

module.exports = vnpayConfig;
