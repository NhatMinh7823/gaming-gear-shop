const express = require('express');
const router = express.Router();
const {
  getProvinces,
  getDistricts,
  getWards,
  calculateFee
} = require('../controllers/ghnController');

// Test route to verify GHN routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'GHN routes are working!',
    timestamp: new Date().toISOString()
  });
});

router.get('/provinces', getProvinces);
router.get('/districts/:provinceId', getDistricts);
router.get('/wards/:districtId', getWards);
router.post('/calculate-fee', calculateFee);

module.exports = router;
