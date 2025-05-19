const Order = require("../models/orderModel");
const asyncHandler = require("express-async-handler");
const vnpayConfig = require("../config/vnpay");
const {
  sortObject,
  createHmacHash,
  formatDate,
  createTxnRef,
  extractOrderId,
} = require("../utils/vnpayUtils");

/**
 * Tạo URL thanh toán VNPay
 * @route POST /api/vnpay/create-payment/:id
 * @access Private
 */
const createPayment = asyncHandler(async (req, res) => {
  try {
    // Lấy thông tin đơn hàng từ database
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Không tìm thấy đơn hàng");
    }

    // Kiểm tra quyền sở hữu đơn hàng
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      res.status(401);
      throw new Error("Bạn không có quyền truy cập đơn hàng này");
    }

    // Tạo thông tin thanh toán
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    const tmnCode = vnpayConfig.tmnCode;
    const secretKey = vnpayConfig.hashSecret;
    const vnpUrl = vnpayConfig.vnpUrl;
    const returnUrl = vnpayConfig.returnUrl;

    const date = new Date();
    const createDate = formatDate(date);

    // Tạo mã đơn hàng tham chiếu
    const txnRef = createTxnRef(order._id.toString());

    // Số tiền không có phần thập phân, nhân với 100
    const amount = Math.round(order.totalPrice * 100);

    // Tạo thông tin đơn hàng an toàn
    const orderInfo = `Payment-for-order-${order._id
      .toString()
      .replace(/[^a-zA-Z0-9]/g, "")}`;

    // Xây dựng dữ liệu thanh toán
    const vnpParams = {
      vnp_Version: vnpayConfig.apiVersion,
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: amount,
      vnp_CreateDate: createDate,
      vnp_CurrCode: vnpayConfig.currCode,
      vnp_IpAddr: ipAddr,
      vnp_Locale: vnpayConfig.locale,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: vnpayConfig.orderType,
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: txnRef,
    };

    // URL encode tất cả các giá trị tham số
    Object.keys(vnpParams).forEach((key) => {
      if (typeof vnpParams[key] === "string") {
        vnpParams[key] = encodeURIComponent(vnpParams[key]).replace(
          /%20/g,
          "+"
        );
      }
    });

    // Sắp xếp tham số theo thứ tự alphabet
    const sortedParams = sortObject(vnpParams);

    // Tạo chuỗi raw signature
    const rawSignature = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    // Tính toán secure hash
    const secureHash = createHmacHash(rawSignature, secretKey);

    // Thêm secure hash vào tham số
    sortedParams.vnp_SecureHash = secureHash;

    // Xây dựng URL thanh toán đầy đủ
    const paymentUrl =
      `${vnpUrl}?` +
      Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    // Cập nhật trạng thái đơn hàng
    order.paymentDetails = {
      provider: "vnpay",
      txnRef: txnRef,
      status: "pending",
    };
    await order.save();

    // Trả về URL thanh toán cho frontend
    res.json({
      success: true,
      paymentUrl: paymentUrl,
    });
  } catch (error) {
    console.error("VNPay payment error:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo URL thanh toán",
      error: error.message,
    });
  }
});

/**
 * Xử lý kết quả thanh toán từ VNPay (Return URL)
 * @route GET /api/vnpay/payment-return
 * @access Public
 */
const handleReturn = asyncHandler(async (req, res) => {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;

    // Xóa các tham số hash
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // Xóa các tham số trống
    Object.keys(vnpParams).forEach((key) => {
      if (
        vnpParams[key] === "" ||
        vnpParams[key] === null ||
        vnpParams[key] === undefined
      ) {
        delete vnpParams[key];
      }
    });

    // Sắp xếp các tham số
    const sortedParams = sortObject(vnpParams);

    // Tạo chuỗi raw signature
    const rawSignature = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    // Tính toán secure hash
    const calculatedHash = createHmacHash(rawSignature, vnpayConfig.hashSecret);

    // Kiểm tra hash
    if (secureHash === calculatedHash) {
      const txnRef = vnpParams.vnp_TxnRef;
      const orderId = extractOrderId(txnRef);

      // Tìm đơn hàng
      const order = await Order.findById(orderId);

      if (order) {
        // Kiểm tra mã response
        const responseCode = vnpParams.vnp_ResponseCode;
        const transactionStatus = vnpParams.vnp_TransactionStatus;

        // Cập nhật thông tin thanh toán vào đơn hàng
        order.paymentDetails = {
          ...order.paymentDetails,
          transactionNo: vnpParams.vnp_TransactionNo,
          bankCode: vnpParams.vnp_BankCode,
          bankTranNo: vnpParams.vnp_BankTranNo,
          cardType: vnpParams.vnp_CardType,
          payDate: vnpParams.vnp_PayDate,
          responseCode: responseCode,
          transactionStatus: transactionStatus,
        };

        // Nếu thanh toán thành công
        if (
          responseCode === vnpayConfig.successCode &&
          transactionStatus === vnpayConfig.successCode
        ) {
          order.paymentDetails.status = "completed";
          order.isPaid = true;
          order.paidAt = Date.now();
        } else {
          order.paymentDetails.status = "failed";
        }

        await order.save();

        // Chuyển hướng về trang frontend thông báo kết quả
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const redirectUrl = `${frontendUrl}/order/${order._id}?payment=${
          responseCode === "00" ? "success" : "failed"
        }`;

        res.redirect(redirectUrl);
      } else {
        // Không tìm thấy đơn hàng
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        res.redirect(`${frontendUrl}/payment-error?error=order-not-found`);
      }
    } else {
      // Hash không khớp
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/payment-error?error=invalid-signature`);
    }
  } catch (error) {
    console.error("VNPay return error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/payment-error?error=unknown`);
  }
});

/**
 * Xử lý thông báo thanh toán tự động từ VNPay (IPN URL)
 * @route GET /api/vnpay/ipn
 * @access Public
 */
const handleIPN = asyncHandler(async (req, res) => {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;

    // Xóa các tham số hash
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // Xóa các tham số trống
    Object.keys(vnpParams).forEach((key) => {
      if (
        vnpParams[key] === "" ||
        vnpParams[key] === null ||
        vnpParams[key] === undefined
      ) {
        delete vnpParams[key];
      }
    });

    // Sắp xếp các tham số
    const sortedParams = sortObject(vnpParams);

    // Tạo chuỗi raw signature
    const rawSignature = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    // Tính toán secure hash
    const calculatedHash = createHmacHash(rawSignature, vnpayConfig.hashSecret);

    // Kiểm tra hash
    if (secureHash === calculatedHash) {
      const txnRef = vnpParams.vnp_TxnRef;
      const orderId = extractOrderId(txnRef);
      const responseCode = vnpParams.vnp_ResponseCode;
      const transactionStatus = vnpParams.vnp_TransactionStatus;

      // Tìm đơn hàng
      const order = await Order.findById(orderId);

      if (order) {
        // Cập nhật thông tin thanh toán vào đơn hàng
        order.paymentDetails = {
          ...order.paymentDetails,
          transactionNo: vnpParams.vnp_TransactionNo,
          bankCode: vnpParams.vnp_BankCode,
          bankTranNo: vnpParams.vnp_BankTranNo,
          cardType: vnpParams.vnp_CardType,
          payDate: vnpParams.vnp_PayDate,
          responseCode: responseCode,
          transactionStatus: transactionStatus,
        };

        // Nếu thanh toán thành công
        if (
          responseCode === vnpayConfig.successCode &&
          transactionStatus === vnpayConfig.successCode
        ) {
          order.paymentDetails.status = "completed";
          order.isPaid = true;
          order.paidAt = Date.now();
        } else {
          order.paymentDetails.status = "failed";
        }

        await order.save();

        // Trả về phản hồi cho VNPAY
        return res.status(200).json({
          RspCode: "00",
          Message: "success",
        });
      } else {
        // Không tìm thấy đơn hàng
        return res.status(200).json({
          RspCode: "01",
          Message: "Order not found",
        });
      }
    } else {
      // Hash không khớp
      return res.status(200).json({
        RspCode: "97",
        Message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("VNPay IPN error:", error);
    return res.status(200).json({
      RspCode: "99",
      Message: "Unknown error",
    });
  }
});

/**
 * Kiểm tra trạng thái thanh toán
 * @route GET /api/vnpay/payment-status/:id
 * @access Private
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Không tìm thấy đơn hàng");
  }

  // Kiểm tra quyền sở hữu
  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(401);
    throw new Error("Bạn không có quyền truy cập đơn hàng này");
  }

  res.json({
    success: true,
    paymentStatus: order.isPaid ? "completed" : "pending",
    isPaid: order.isPaid,
    paidAt: order.paidAt,
    paymentDetails: order.paymentDetails || {},
  });
});

module.exports = {
  createPayment,
  handleReturn,
  handleIPN,
  getPaymentStatus,
};
