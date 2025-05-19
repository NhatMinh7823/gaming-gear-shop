const crypto = require("crypto");
const querystring = require("querystring");
const fetch = require("node-fetch");
const qs = require("qs");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const vnpayConfig = require("../config/vnpay");

// Helper function to clear user's cart
const clearCart = async (userId) => {
  await Cart.findOneAndDelete({ user: userId });
};

// Helper function to create hmac hash
const createHmacHash = (data, secretKey) => {
  return crypto.createHmac("sha512", secretKey).update(data).digest("hex");
};

const generateUniqueRequestId = (prefix = "REQ") => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}${timestamp}${random}`;
};

const sortObject = (obj) => {
  let sorted = {};
  let str = [];
  let key;

  // Push all keys into array
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(key);
    }
  }

  // Sort array
  str.sort();

  // Build new object
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = obj[str[key]];
  }

  return sorted;
};

const formatDate = (date) => {
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

// Helper function to clean and normalize order info
const normalizeOrderInfo = (info) => {
  // Remove special characters and normalize spaces
  return info
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Generate VNPay payment URL
exports.createPaymentUrl = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log("Creating payment URL for order:", order._id);

    const now = new Date();
    const createDate = formatDate(now);
    const orderId = `${now.getTime()}_${order._id}`;
    const requestId = generateUniqueRequestId();

    // Get client IP
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress ||
      "127.0.0.1";

    // Create payment data with cleaned order info
    const amount = Math.round(order.totalPrice * 100);
    const orderInfo = normalizeOrderInfo(`Thanh toan don hang ${order._id}`);

    console.log("Payment parameters:", {
      amount,
      orderId,
      createDate,
      orderInfo,
    });

    // Build payment request data
    const vnpParams = {
      vnp_Version: vnpayConfig.apiVersion,
      vnp_Command: "pay",
      vnp_TmnCode: vnpayConfig.tmnCode,
      vnp_Amount: amount,
      vnp_BankCode: "", // Leave empty for VNPay portal
      vnp_CreateDate: createDate,
      vnp_CurrCode: vnpayConfig.currCode,
      vnp_IpAddr: ipAddr,
      vnp_Locale: vnpayConfig.locale,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: vnpayConfig.orderType,
      vnp_ReturnUrl: vnpayConfig.returnUrl,
      vnp_TxnRef: orderId,
      vnp_ExpireDate: formatDate(
        new Date(Date.now() + vnpayConfig.expireTime * 60000)
      ),
      vnp_Time: createDate,
    };

    // Clean and format parameters
    vnpParams.vnp_Amount = parseInt(vnpParams.vnp_Amount);
    Object.keys(vnpParams).forEach((key) => {
      if (
        vnpParams[key] === "" ||
        vnpParams[key] === null ||
        vnpParams[key] === undefined
      ) {
        delete vnpParams[key];
      }
    });

    // Sort parameters alphabetically
    const sortedParams = sortObject(vnpParams);

    // Create raw string for signing following VNPay's format
    const rawSignature = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    console.log("Raw signature string:", rawSignature);

    // Calculate secure hash
    const secureHash = createHmacHash(rawSignature, vnpayConfig.hashSecret);
    console.log("Generated secure hash:", secureHash);

    // Add hash to parameters
    const finalParams = {
      ...sortedParams,
      vnp_SecureHash: secureHash,
    };

    // Create final URL with proper encoding
    const finalQueryString = qs.stringify(finalParams, {
      encode: true,
      encoder: (str) => {
        return encodeURIComponent(str)
          .replace(/%20/g, "+")
          .replace(/[!'()*]/g, (c) => {
            return "%" + c.charCodeAt(0).toString(16).toUpperCase();
          });
      },
    });
    const paymentUrl = `${vnpayConfig.vnpUrl}?${finalQueryString}`;

    console.log("Final query string:", finalQueryString);

    res.json({
      success: true,
      paymentUrl,
    });
  } catch (error) {
    console.error("Error creating payment URL:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment URL",
      error: error.message,
    });
  }
};

// Handle VNPay IPN (Instant Payment Notification)
exports.handleIpn = async (req, res) => {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;

    // Clean parameters and remove hash
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;
    Object.keys(vnpParams).forEach((key) => {
      if (
        vnpParams[key] === "" ||
        vnpParams[key] === null ||
        vnpParams[key] === undefined
      ) {
        delete vnpParams[key];
      }
    });

    // Sort parameters
    const sortedParams = sortObject(vnpParams);

    // Create raw signature string
    const rawSignature = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    console.log("IPN Raw signature:", rawSignature);

    // Calculate secure hash
    const calculatedHash = createHmacHash(rawSignature, vnpayConfig.hashSecret);
    console.log("IPN Calculated hash:", calculatedHash);
    console.log("IPN Received hash:", secureHash);

    // Validate hash
    if (secureHash === calculatedHash) {
      const orderId = vnpParams.vnp_TxnRef.split("_")[1];
      const order = await Order.findById(orderId);

      if (order) {
        if (vnpParams.vnp_ResponseCode === "00") {
          // Payment successful
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentResult = {
            vnp_TransactionNo: vnpParams.vnp_TransactionNo,
            vnp_PayDate: vnpParams.vnp_PayDate,
            vnp_OrderInfo: vnpParams.vnp_OrderInfo,
            vnp_ResponseCode: vnpParams.vnp_ResponseCode
          };
          await order.save();

          // Clear the cart after successful payment
          if (order.user) {
            await clearCart(order.user);
          }
        }

        res.status(200).json({ RspCode: "00", Message: "success" });
      } else {
        res.status(200).json({ RspCode: "01", Message: "Order not found" });
      }
    } else {
    console.log('Signature validation failed:', {
      received: secureHash,
      calculated: calculatedHash,
      params: sortedParams
    });
    res.status(200).json({ RspCode: "97", Message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Error handling IPN:", error);
    res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
};

// Query transaction status
exports.queryTransaction = async (req, res) => {
  try {
    const { orderId } = req.params;
    const requestId = generateUniqueRequestId("QUERY");
    const createDate = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .substring(0, 14);

    // Build query data
    const queryParams = {
      vnp_RequestId: requestId,
      vnp_Version: vnpayConfig.apiVersion,
      vnp_Command: "querydr",
      vnp_TmnCode: vnpayConfig.tmnCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Query transaction ${orderId}`,
      vnp_TransactionDate: createDate,
      vnp_CreateDate: createDate,
      vnp_IpAddr: req.ip || "127.0.0.1",
    };

    // Create signature
    const signData = `${queryParams.vnp_RequestId}|${queryParams.vnp_Version}|${queryParams.vnp_Command}|${queryParams.vnp_TmnCode}|${queryParams.vnp_TxnRef}|${queryParams.vnp_TransactionDate}|${queryParams.vnp_CreateDate}|${queryParams.vnp_IpAddr}|${queryParams.vnp_OrderInfo}`;
    const secureHash = createHmacHash(signData, vnpayConfig.hashSecret);
    queryParams.vnp_SecureHash = secureHash;

    // Send query request to VNPay
    const querystring = require("qs");
    const response = await fetch(
      vnpayConfig.apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryParams),
      }
    );

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error("Error querying transaction:", error);
    res.status(500).json({
      success: false,
      message: "Error querying transaction",
      error: error.message,
    });
  }
};

// Refund transaction
exports.refundTransaction = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, transactionNo } = req.body;

    const requestId = generateUniqueRequestId("REFUND");
    const createDate = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .substring(0, 14);

    // Build refund data
    const refundParams = {
      vnp_RequestId: requestId,
      vnp_Version: vnpayConfig.apiVersion,
      vnp_Command: "refund",
      vnp_TmnCode: vnpayConfig.tmnCode,
      vnp_TransactionType: "02", // Full refund
      vnp_TxnRef: orderId,
      vnp_Amount: parseInt(amount),
      vnp_TransactionNo: transactionNo,
      vnp_TransactionDate: createDate,
      vnp_CreateBy: "System",
      vnp_CreateDate: createDate,
      vnp_IpAddr: req.ip || "127.0.0.1",
      vnp_OrderInfo: `Refund for order ${orderId}`,
    };

    // Create signature
    const signData = `${refundParams.vnp_RequestId}|${refundParams.vnp_Version}|${refundParams.vnp_Command}|${refundParams.vnp_TmnCode}|${refundParams.vnp_TransactionType}|${refundParams.vnp_TxnRef}|${refundParams.vnp_Amount}|${refundParams.vnp_TransactionNo}|${refundParams.vnp_TransactionDate}|${refundParams.vnp_CreateBy}|${refundParams.vnp_CreateDate}|${refundParams.vnp_IpAddr}|${refundParams.vnp_OrderInfo}`;
    const secureHash = createHmacHash(signData, vnpayConfig.hashSecret);
    refundParams.vnp_SecureHash = secureHash;

    // Send refund request to VNPay
    const response = await fetch(
      vnpayConfig.apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refundParams),
      }
    );

    const result = await response.json();

    // Update order refund status if successful
    if (result.vnp_ResponseCode === "00") {
      const order = await Order.findOne({
        "paymentResult.vnp_TxnRef": orderId,
      });
      if (order) {
        order.paymentResult.refundStatus = "completed";
        order.paymentResult.refundDate = new Date();
        order.paymentResult.refundAmount = amount;
        await order.save();
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Error refunding transaction:", error);
    res.status(500).json({
      success: false,
      message: "Error refunding transaction",
      error: error.message,
    });
  }
};

// Handle VNPay Return
exports.handleReturn = async (req, res) => {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;

    // Clean parameters and remove hash
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // Clean empty values
    Object.keys(vnpParams).forEach((key) => {
      if (
        vnpParams[key] === "" ||
        vnpParams[key] === null ||
        vnpParams[key] === undefined
      ) {
        delete vnpParams[key];
      }
    });

    // Sort parameters
    const sortedParams = sortObject(vnpParams);

    // Create raw signature string
    const rawSignature = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    console.log("Return Raw signature:", rawSignature);

    // Calculate secure hash
    const calculatedHash = createHmacHash(rawSignature, vnpayConfig.hashSecret);
    console.log("Return Calculated hash:", calculatedHash);
    console.log("Return Received hash:", secureHash);

    // Validate hash
    if (secureHash === calculatedHash) {
      const orderId = vnpParams.vnp_TxnRef.split("_")[1];
      const order = await Order.findById(orderId);

      if (order) {
        if (vnpParams.vnp_ResponseCode === "00") {
          // Payment successful
          // Update order status
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentResult = {
            vnp_TransactionNo: vnpParams.vnp_TransactionNo,
            vnp_PayDate: vnpParams.vnp_PayDate,
            vnp_OrderInfo: vnpParams.vnp_OrderInfo,
            vnp_ResponseCode: vnpParams.vnp_ResponseCode,
          };
          await order.save();

          // Clear the cart after successful payment
          if (order.user) {
            await clearCart(order.user);
          }

          res.json({
            success: true,
            message: "Payment successful",
            orderId: order._id,
          });
        } else {
          res.json({
            success: false,
            message: "Payment failed",
            responseCode: vnpParams.vnp_ResponseCode,
            responseMessage: vnpParams.vnp_Message || 'Payment was not successful',
          });
        }
      } else {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("Error handling return:", error);
    res.status(500).json({
      success: false,
      message: "Error handling return",
      error: error.message,
    });
  }
};
