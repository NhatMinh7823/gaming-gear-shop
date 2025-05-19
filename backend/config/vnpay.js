const vnpayConfig = {
  // Merchant config
  tmnCode: process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,

  // API endpoints
  vnpUrl: process.env.VNPAY_URL,
  returnUrl: process.env.VNPAY_RETURN_URL,
  ipnUrl: process.env.VNPAY_IPN_URL,
  apiUrl: process.env.VNPAY_API_URL,

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
  apiVersion: "2.1.0",
};

module.exports = vnpayConfig;
