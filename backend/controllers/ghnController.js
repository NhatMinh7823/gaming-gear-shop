const ghnService = require('../services/ghnService');

// @desc    Get all provinces
// @route   GET /api/ghn/provinces
// @access  Public
exports.getProvinces = async (req, res) => {
  try {
    console.log('GHN Controller: Getting provinces...');
    const result = await ghnService.getProvinces();
    console.log('GHN Controller: Provinces fetched successfully');
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('GHN Controller: Error getting provinces:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

// @desc    Get districts by province ID
// @route   GET /api/ghn/districts/:provinceId
// @access  Public
exports.getDistricts = async (req, res) => {
  try {
    const { provinceId } = req.params;
    const result = await ghnService.getDistricts(provinceId);
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get wards by district ID
// @route   GET /api/ghn/wards/:districtId
// @access  Public
exports.getWards = async (req, res) => {
  try {
    const { districtId } = req.params;
    const result = await ghnService.getWards(districtId);
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Calculate shipping fee
// @route   POST /api/ghn/calculate-fee
// @access  Public
exports.calculateFee = async (req, res) => {
  try {
    const result = await ghnService.calculateShippingFee(req.body);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        fee: result.data.data.total,
        details: result.data.data
      });
    } else {
      res.status(200).json({
        success: false,
        fee: result.fallbackFee,
        message: 'Using fallback shipping fee',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      fee: 15000, // Fallback fee
      message: 'Error calculating shipping fee',
      error: error.message
    });
  }
};
