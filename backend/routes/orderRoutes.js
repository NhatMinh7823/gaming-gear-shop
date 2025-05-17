// orderRoutes.js
const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderToPaid,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
  getSalesData,
  getOrderHistory,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

// User routes
router.post("/", protect, createOrder);
router.get("/myorders", protect, getMyOrders);
router.get("/stats", protect, authorize("admin"), getOrderStats); 
router.get("/salesdata", protect, authorize("admin"), getSalesData);
router.get("/history", protect, authorize("admin"), getOrderHistory);
router.get("/:id", protect, getOrderById);
router.put("/:id/pay", protect, updateOrderToPaid);

// Admin routes
router.get("/", protect, authorize("admin"), getAllOrders);
router.put("/:id/status", protect, authorize("admin"), updateOrderStatus);
router.delete("/:id", protect, authorize("admin"), deleteOrder);


module.exports = router;
