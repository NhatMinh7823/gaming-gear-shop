const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createPaymentUrl,
    handleIpn,
    handleReturn,
    queryTransaction,
    refundTransaction
} = require('../controllers/vnpayController');

// Payment routes
router.post('/:orderId/create_payment_url', protect, createPaymentUrl);
router.get('/vnpay_ipn', handleIpn);
router.get('/vnpay_return', handleReturn);

// Transaction management routes
router.post('/:orderId/query', protect, queryTransaction);
router.post('/:orderId/refund', protect, refundTransaction);

module.exports = router;
