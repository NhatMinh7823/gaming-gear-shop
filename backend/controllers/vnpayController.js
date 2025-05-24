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
    } // Kiểm tra quyền sở hữu đơn hàng
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      res.status(401);
      throw new Error("Bạn không có quyền truy cập đơn hàng này");
    }

    // Kiểm tra trạng thái đơn hàng, không cho phép thanh toán đơn hàng đã hủy
    if (order.status === "Cancelled") {
      res.status(400);
      throw new Error("Không thể thanh toán đơn hàng đã bị hủy");
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
    console.log("VNPay return params:", req.query);
    const vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;
    const responseCode = vnpParams.vnp_ResponseCode;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

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

    // Sắp xếp tham số
    const sortedParams = sortObject(vnpParams);

    // Tạo chuỗi raw signature
    const signData = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    // Tính toán secure hash
    const calculatedHash = createHmacHash(signData, vnpayConfig.hashSecret);

    // Log để debug
    console.log("Calculated hash:", calculatedHash);
    console.log("Received hash:", secureHash);
    console.log("Hash match:", calculatedHash === secureHash);

    // RE-ENABLE signature verification for security
    if (secureHash === calculatedHash) {
      const txnRef = vnpParams.vnp_TxnRef;
      console.log("Transaction reference:", txnRef);

      const orderId = extractOrderId(txnRef);
      console.log("Extracted order ID:", orderId);

      // Tìm đơn hàng
      const order = await Order.findById(orderId);
      console.log("Found order:", order ? "Yes" : "No");
      if (order) {
        // Check if order is cancelled
        if (order.status === "Cancelled") {
          console.error(
            "Cannot process payment for cancelled order:",
            order._id
          );

          const isApiCall =
            req.xhr || req.headers.accept?.includes("application/json");
          if (isApiCall) {
            return res.status(400).json({
              success: false,
              message: "Không thể thanh toán đơn hàng đã bị hủy",
              orderId: order._id.toString(),
            });
          } else {
            return res.redirect(
              `${frontendUrl}/payment-error?error=order-cancelled&orderId=${order._id}`
            );
          }
        }

        // Verify payment amount matches the order amount
        const paidAmount = parseInt(vnpParams.vnp_Amount) / 100; // Convert back from VNPay format
        const orderAmount = order.totalPrice;

        if (Math.abs(paidAmount - orderAmount) > 0.01) {
          // Allow small rounding difference
          console.error(
            `Amount mismatch: Paid ${paidAmount}, Expected ${orderAmount}`
          );

          const isApiCall =
            req.xhr || req.headers.accept?.includes("application/json");
          if (isApiCall) {
            return res.status(400).json({
              success: false,
              message: "Payment amount does not match order amount",
            });
          } else {
            return res.redirect(
              `${frontendUrl}/payment-error?error=amount-mismatch`
            );
          }
        }

        // Check for duplicate payment (prevent replay attacks)
        if (
          order.isPaid &&
          order.paymentDetails?.transactionNo === vnpParams.vnp_TransactionNo
        ) {
          console.warn("Duplicate payment detected for order:", order._id);

          const isApiCall =
            req.xhr || req.headers.accept?.includes("application/json");
          if (isApiCall) {
            return res.json({
              success: true,
              message: "Payment was already processed",
              orderId: order._id.toString(),
            });
          } else {
            return res.redirect(
              `${frontendUrl}/order/${order._id}?payment=already-processed`
            );
          }
        }

        // Continue with existing code...
        // Nếu response code là 00 (thành công)
        if (responseCode === "00") {
          // Process successful payment logic (unchanged)
          // Chỉ cập nhật nếu chưa thanh toán
          if (!order.isPaid) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentDetails = {
              id: vnpParams.vnp_TransactionNo,
              status: "completed",
              provider: "vnpay",
              txnRef: txnRef,
              transactionNo: vnpParams.vnp_TransactionNo,
              bankCode: vnpParams.vnp_BankCode || "",
              cardType: vnpParams.vnp_CardType || "",
              bankTranNo: vnpParams.vnp_BankTranNo || "",
              payDate: vnpParams.vnp_PayDate || "",
              responseCode: responseCode,
              update_time: vnpParams.vnp_PayDate,
              payer: {
                payment_method: "VNPAY",
                bank_code: vnpParams.vnp_BankCode || "",
              },
            };

            await order.save();
            console.log("Order updated successfully:", order._id);
          }

          // Cập nhật trạng thái coupon nếu đơn hàng có áp dụng coupon
          if (order.couponCode) {
            try {
              // Tìm người dùng có mã coupon này
              const User = require("../models/userModel");
              const user = await User.findOne({
                "coupon.code": order.couponCode,
              });
              if (user) {
                // Cập nhật trạng thái coupon thành 'used'
                if (
                  user.coupon.status === "pending" &&
                  user.coupon.orderId &&
                  user.coupon.orderId.toString() === order._id.toString()
                ) {
                  user.coupon.status = "used";
                  user.coupon.used = true; // Giữ trường cũ để tương thích ngược
                  await user.save();
                  console.log(
                    `Đã cập nhật trạng thái coupon ${order.couponCode} thành đã sử dụng sau khi thanh toán VNPay`
                  );
                }
              }
            } catch (couponErr) {
              console.error("Lỗi khi cập nhật trạng thái coupon:", couponErr);
            }
          }

          // Kiểm tra xem yêu cầu có phải là API call hay không
          const isApiCall =
            req.xhr || req.headers.accept?.includes("application/json");

          if (isApiCall) {
            // Trả về JSON cho API call
            return res.json({
              success: true,
              message: "Payment successful",
              orderId: order._id.toString(),
            });
          } else {
            // Chuyển hướng cho browser access
            return res.redirect(
              `${frontendUrl}/order/${order._id}?payment=success`
            );
          }
        } else {
          // Process failed payment logic (unchanged)
          console.log("Payment failed with code:", responseCode);

          // Kiểm tra xem yêu cầu có phải là API call hay không
          const isApiCall =
            req.xhr || req.headers.accept?.includes("application/json");

          if (isApiCall) {
            // Trả về JSON cho API call
            return res.json({
              success: false,
              message: `Payment failed with code: ${responseCode}`,
              orderId: order._id.toString(),
            });
          } else {
            // Chuyển hướng cho browser access
            return res.redirect(
              `${frontendUrl}/order/${order._id}?payment=failed`
            );
          }
        }
      } else {
        // Order not found logic (unchanged)
        console.error("Order not found for ID:", orderId);

        // Kiểm tra xem yêu cầu có phải là API call hay không
        const isApiCall =
          req.xhr || req.headers.accept?.includes("application/json");

        if (isApiCall) {
          // Trả về JSON cho API call
          return res.json({
            success: false,
            message: "Order not found",
            orderId: null,
          });
        } else {
          // Chuyển hướng cho browser access
          return res.redirect(
            `${frontendUrl}/payment-error?error=order-not-found`
          );
        }
      }
    } else {
      console.error("Invalid signature");

      // Kiểm tra xem yêu cầu có phải là API call hay không
      const isApiCall =
        req.xhr || req.headers.accept?.includes("application/json");

      if (isApiCall) {
        // Trả về JSON cho API call
        return res.status(401).json({
          success: false,
          message: "Invalid payment signature. Possible tampering detected.",
        });
      } else {
        // Chuyển hướng cho browser access
        return res.redirect(
          `${frontendUrl}/payment-error?error=invalid-signature`
        );
      }
    }
  } catch (error) {
    // Error handling (unchanged)
    console.error("VNPay return error:", error);

    // Kiểm tra xem yêu cầu có phải là API call hay không
    const isApiCall =
      req.xhr || req.headers.accept?.includes("application/json");

    if (isApiCall) {
      // Trả về JSON cho API call
      return res.status(500).json({
        success: false,
        message:
          error.message || "An error occurred during payment verification",
      });
    } else {
      // Chuyển hướng cho browser access
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(
        `${frontendUrl}/payment-error?error=${encodeURIComponent(
          error.message
        )}`
      );
    }
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
