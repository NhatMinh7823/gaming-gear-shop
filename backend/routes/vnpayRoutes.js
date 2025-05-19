const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createPayment,
  handleReturn,
  handleIPN,
  getPaymentStatus,
} = require("../controllers/vnpayController");

// Routes
router.post("/create-payment/:id", protect, createPayment);
router.get("/payment-return", handleReturn);
router.get("/ipn", handleIPN);
router.get("/payment-status/:id", protect, getPaymentStatus);

module.exports = router;
