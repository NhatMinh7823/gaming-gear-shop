const express = require('express');
const router = express.Router();
const specificationController = require('../controllers/specificationController');

/**
 * Specification Routes - API endpoints cho phân loại và lọc specifications
 */

// @route   GET /api/specifications/analyze
// @desc    Phân tích và phân loại tất cả sản phẩm theo specifications
// @access  Public
router.get('/analyze', specificationController.analyzeProducts);

// @route   POST /api/specifications/filter
// @desc    Lọc sản phẩm theo specifications nâng cao
// @access  Public
// @body    { category, performanceTier, useCase, specifications, priceRange, sortBy, sortOrder, page, limit }
router.post('/filter', specificationController.filterBySpecifications);

// @route   GET /api/specifications/category/:categoryId
// @desc    Lấy thông tin specifications của một danh mục
// @access  Public
router.get('/category/:categoryId', specificationController.getCategorySpecifications);

// @route   POST /api/specifications/compare
// @desc    So sánh specifications của nhiều sản phẩm
// @access  Public
// @body    { productIds: [string] }
router.post('/compare', specificationController.compareProducts);

// @route   POST /api/specifications/recommend
// @desc    Gợi ý sản phẩm dựa trên specifications và tiêu chí
// @access  Public
// @body    { category, budget, useCase, prioritySpecs, limit }
router.post('/recommend', specificationController.recommendProducts);

module.exports = router;
