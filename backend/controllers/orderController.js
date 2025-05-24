// orderController.js

const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
      couponCode,
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No order items",
      });
    } // Tính toán giảm giá từ coupon (nếu có)
    let couponDiscount = 0;
    if (req.couponData) {
      couponDiscount = req.couponData.discountAmount;
    }

    // Log the value of req.couponData to debug
    console.log(`Coupon data in request:`, req.couponData);

    // Điều chỉnh tổng tiền nếu có coupon
    const finalTotalPrice = Math.max(0, totalPrice - couponDiscount); // Create order
    const order = await Order.create({
      user: req.user._id,
      orderItems,
      couponCode: couponCode || null,
      couponDiscount,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice: Math.round(finalTotalPrice), // Làm tròn để tránh lỗi amount mismatch
    });

    // Update product stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock -= item.quantity;
        product.sold += item.quantity;
        await product.save();
      }
    } // Clear user's cart
    await Cart.findOneAndDelete({ user: req.user._id });

    // Xử lý coupon nếu có
    if (couponCode) {
      // Đánh dấu coupon là "pending" và lưu ID đơn hàng
      const user = await User.findOne({ "coupon.code": couponCode });
      if (user && (user.coupon.status === "usable" || !user.coupon.used)) {
        user.coupon.status = "pending";
        user.coupon.orderId = order._id;
        await user.save();
        console.log(
          `Đã đánh dấu coupon ${couponCode} đang được sử dụng trong đơn hàng ${order._id}`
        );
      }
    }

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error in createOrder:", error); // Đổi tên lỗi để phù hợp
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Make sure the logged in user is viewing their own order or is an admin
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    // Transform image URLs in order items
    const backendBaseUrl = `${req.protocol}://${req.get("host")}`;
    order.orderItems = order.orderItems.map((item) => {
      if (
        item.image &&
        typeof item.image === "string" &&
        !item.image.startsWith("http")
      ) {
        return {
          ...item.toObject(), // Convert Mongoose document to plain object
          image: `${backendBaseUrl}${item.image}`,
        };
      }
      return item.toObject(); // Convert Mongoose document to plain object
    });

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort("-createdAt");

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "id name")
      .sort("-createdAt");

    let totalAmount = 0;
    orders.forEach((order) => {
      totalAmount += order.totalPrice;
    });

    res.status(200).json({
      success: true,
      totalAmount,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
exports.updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if the order belongs to the user or if user is admin
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    // Update order
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    // Nếu đơn hàng có sử dụng coupon, cập nhật trạng thái coupon
    if (order.couponCode) {
      try {
        const user = await User.findOne({ "coupon.code": order.couponCode });
        // Chỉ cập nhật khi coupon đang ở trạng thái 'pending' và được liên kết với đơn hàng này
        if (
          user &&
          user.coupon.status === "pending" &&
          user.coupon.orderId &&
          user.coupon.orderId.toString() === order._id.toString()
        ) {
          user.coupon.status = "used";
          user.coupon.used = true; // Giữ trường cũ để tương thích ngược
          await user.save();
          console.log(
            `Đã cập nhật trạng thái coupon ${order.couponCode} thành 'used' sau khi thanh toán`
          );
        }
      } catch (couponErr) {
        console.error("Lỗi khi cập nhật trạng thái coupon:", couponErr);
      }
    }

    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Please provide a status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Lưu trạng thái cũ để kiểm tra thay đổi
    const previousStatus = order.status;

    // Update order status
    order.status = status; // Nếu đơn hàng bị hủy (Cancelled) và trạng thái trước đó không phải là hủy
    if (status === "Cancelled" && previousStatus !== "Cancelled") {
      // Xử lý hoàn trả coupon nếu đơn hàng chưa thanh toán
      if (!order.isPaid && order.couponCode) {
        try {
          console.log(
            `Đang tìm user với coupon code: ${order.couponCode} để hoàn trả do admin hủy đơn hàng`
          );
          const user = await User.findOne({ "coupon.code": order.couponCode });

          if (!user) {
            console.log(
              `Không tìm thấy user nào có mã coupon ${order.couponCode}`
            );
          } else {
            console.log(
              `Tìm thấy user ${user.name} (${user._id}) với coupon ${order.couponCode}`
            );
            console.log(
              `Trạng thái hiện tại của coupon: ${user.coupon.status}`
            );

            // Kiểm tra liên kết với đơn hàng
            if (!user.coupon.orderId) {
              console.log(
                `Coupon ${order.couponCode} không liên kết với đơn hàng nào`
              );
              // Vẫn đảm bảo coupon ở trạng thái usable
              user.coupon.status = "usable";
              user.coupon.used = false;
              await user.save();
            } else if (
              user.coupon.orderId.toString() === order._id.toString()
            ) {
              // Nếu coupon liên kết với đơn hàng hiện tại, hoàn trả về trạng thái usable
              console.log(
                `Coupon ${order.couponCode} liên kết với đơn hàng hiện tại (${order._id})`
              );
              user.coupon.status = "usable";
              user.coupon.orderId = null;
              user.coupon.used = false;
              await user.save();
              console.log(
                `Đã hoàn trả coupon ${order.couponCode} về trạng thái usable do đơn hàng bị hủy bởi admin`
              );
            } else {
              console.log(
                `Coupon ${order.couponCode} đã được liên kết với đơn hàng khác (${user.coupon.orderId})`
              );
            }
          }
        } catch (couponErr) {
          console.error("Lỗi khi hoàn trả coupon:", couponErr);
        }
      }
    }

    // If status is Delivered, update isDelivered and deliveredAt
    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    // If status is Shipped, add tracking number if provided
    if (status === "Shipped" && req.body.trackingNumber) {
      order.trackingNumber = req.body.trackingNumber;
    }

    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get sales data aggregated by month
// @route   GET /api/orders/salesdata
// @access  Private/Admin
exports.getSalesData = async (req, res) => {
  try {
    const salesData = await Order.aggregate([
      {
        $match: {
          isPaid: true, // Only include paid orders
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
          },
          totalSales: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      salesData,
    });
  } catch (error) {
    console.error("Error in getSalesData:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get daily stats for the last 7 days
    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeek },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          paidOrders: {
            $sum: {
              $cond: [{ $eq: ["$isPaid", true] }, 1, 0],
            },
          },
          paidRevenue: {
            $sum: {
              $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0],
            },
          },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ["$isDelivered", true] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Transform data into arrays
    const historyData = {
      usersHistory: [], // Users will be handled separately
      ordersHistory: dailyStats.map((day) => day.totalOrders),
      revenueHistory: dailyStats.map((day) => day.totalRevenue),
      paidOrdersHistory: dailyStats.map((day) => day.paidOrders),
      paidRevenueHistory: dailyStats.map((day) => day.paidRevenue),
      deliveredOrdersHistory: dailyStats.map((day) => day.deliveredOrders),
    };

    res.status(200).json({
      success: true,
      ...historyData,
    });
  } catch (error) {
    console.error("Error in getOrderHistory:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ isPaid: true });
    const deliveredOrders = await Order.countDocuments({ isDelivered: true });

    const revenueAggregation = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);
    const totalRevenue =
      revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    const paidRevenueAggregation = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: null,
          paidRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);
    const paidRevenue =
      paidRevenueAggregation.length > 0
        ? paidRevenueAggregation[0].paidRevenue
        : 0;

    const statusCounts = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        paidOrders,
        paidRevenue,
        deliveredOrders,
        statusStats,
      },
    });
  } catch (error) {
    console.error("Error in getOrderStats:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Cancel order (for users)
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    // Kiểm tra quyền hủy đơn
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này",
      });
    }

    // Không cho phép hủy đơn hàng đã thanh toán
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Không thể hủy đơn hàng đã thanh toán",
      });
    }

    // Không cho phép hủy đơn hàng đã giao hoặc đang vận chuyển
    if (order.status === "Delivered" || order.status === "Shipped") {
      return res.status(400).json({
        success: false,
        message: "Không thể hủy đơn hàng đang vận chuyển hoặc đã giao",
      });
    } // Hủy đơn hàng
    order.status = "Cancelled";

    // Add more detailed logging to debug coupon reset logic
    console.log(`Order status set to Cancelled for order ID: ${order._id}`);
    if (order.couponCode) {
      console.log(`Attempting to reset coupon with code: ${order.couponCode}`);
      // Log the value of order.couponCode to debug
      console.log(`Coupon code for order ID ${order._id}: ${order.couponCode}`);
      try {
        const user = await User.findOne({ "coupon.code": order.couponCode });

        if (!user) {
          console.log(`No user found with coupon code: ${order.couponCode}`);
        } else {
          console.log(
            `User found: ${user.name} (${user._id}) with coupon code: ${order.couponCode}`
          );
          console.log(
            `Current coupon status: ${user.coupon.status}, orderId: ${user.coupon.orderId}`
          );

          if (
            user.coupon.orderId &&
            user.coupon.orderId.toString() === order._id.toString()
          ) {
            user.coupon.status = "usable";
            user.coupon.orderId = null;
            user.coupon.used = false;
            await user.save();
            console.log(`Coupon ${order.couponCode} reset to usable.`);
          } else {
            console.log(
              `Coupon ${order.couponCode} is linked to another order (${user.coupon.orderId}).`
            );
          }
        }
      } catch (couponErr) {
        console.error(`Error resetting coupon: ${couponErr.message}`);
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Đơn hàng đã được hủy thành công",
      order,
    });
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
      error: error.message,
    });
  }
};
