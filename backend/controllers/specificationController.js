const SpecificationStandardizer = require('../utils/specificationStandardizer');
const Product = require('../models/productModel');

/**
 * Specification Controller - Xử lý API liên quan đến phân loại specifications
 */

const specificationController = {
  /**
   * Phân tích và phân loại sản phẩm theo specifications
   * GET /api/specifications/analyze
   */
  analyzeProducts: async (req, res) => {
    try {
      const products = await Product.find().populate('category').lean();
      
      if (!products || products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No products found'
        });
      }

      const standardizer = new SpecificationStandardizer();
      const { analyzed, report } = standardizer.generateAnalysisReport(products);

      res.status(200).json({
        success: true,
        data: {
          totalProducts: report.totalProducts,
          categories: report.categories,
          performanceTiers: report.performanceTiers,
          useCases: report.useCases,
          specifications: report.specifications,
          analyzedProducts: analyzed
        }
      });
    } catch (error) {
      console.error('Error analyzing products:', error);
      res.status(500).json({
        success: false,
        message: 'Error analyzing products',
        error: error.message
      });
    }
  },

  /**
   * Lọc sản phẩm theo specifications nâng cao
   * POST /api/specifications/filter
   */
  filterBySpecifications: async (req, res) => {
    try {
      const {
        category,
        performanceTier,
        useCase,
        specifications = {},
        priceRange,
        sortBy = 'name',
        sortOrder = 'asc',
        page = 1,
        limit = 20
      } = req.body;

      // Build query filter
      let query = {};

      // Category filter
      if (category) {
        query.category = category;
      }

      // Price range filter
      if (priceRange && (priceRange.min || priceRange.max)) {
        query.price = {};
        if (priceRange.min) query.price.$gte = priceRange.min;
        if (priceRange.max) query.price.$lte = priceRange.max;
      }

      // Fetch products
      const products = await Product.find(query).populate('category').lean();

      if (!products || products.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            products: [],
            totalProducts: 0,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        });
      }

      // Analyze and classify products while preserving all original fields
      const standardizer = new SpecificationStandardizer();
      let analyzed = standardizer.analyzeProducts(products);
      
      // Ensure all original product fields are preserved
      analyzed = analyzed.map(analyzedProduct => {
        const originalProduct = products.find(p => p._id.toString() === analyzedProduct._id.toString());
        return {
          ...originalProduct, // All original fields including images, stock, etc.
          ...analyzedProduct, // Analysis results (performanceTier, useCase, standardized specs)
        };
      });

      // Apply specification filters
      if (performanceTier) {
        analyzed = analyzed.filter(product => product.performanceTier === performanceTier);
      }

      if (useCase) {
        analyzed = analyzed.filter(product => product.useCase === useCase);
      }

      // Apply detailed specification filters
      if (Object.keys(specifications).length > 0) {
        analyzed = analyzed.filter(product => {
          return Object.entries(specifications).every(([key, value]) => {
            const productSpec = product.specifications[key];
            if (!productSpec) return false;
            
            // Handle array values (multiple options)
            if (Array.isArray(value)) {
              return value.some(v => productSpec.toLowerCase().includes(v.toLowerCase()));
            }
            
            // Handle string values
            return productSpec.toLowerCase().includes(value.toLowerCase());
          });
        });
      }

      // Sort products
      analyzed.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // Handle price sorting
        if (sortBy === 'price') {
          aValue = a.price || 0;
          bValue = b.price || 0;
        }

        // Handle name sorting
        if (sortBy === 'name') {
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
        }

        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });

      // Pagination
      const totalProducts = analyzed.length;
      const totalPages = Math.ceil(totalProducts / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = analyzed.slice(startIndex, endIndex);

      // Sanitize images like productController does
      const sanitizedProducts = paginatedProducts.map((product) => {
        const validImages = (product.images || []).filter(
          (img) => img && img.url && img.public_id
        );
        if (validImages.length !== (product.images || []).length) {
          console.warn(
            `Product ${product._id} has invalid images:`,
            product.images
          );
        }
        return { ...product, images: validImages };
      });

      res.status(200).json({
        success: true,
        data: {
          products: sanitizedProducts,
          totalProducts,
          currentPage: parseInt(page),
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          filters: {
            category,
            performanceTier,
            useCase,
            specifications,
            priceRange
          }
        }
      });
    } catch (error) {
      console.error('Error filtering products by specifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error filtering products',
        error: error.message
      });
    }
  },

  /**
   * Lấy thông tin specifications của một danh mục
   * GET /api/specifications/category/:categoryId
   */
  getCategorySpecifications: async (req, res) => {
    try {
      const { categoryId } = req.params;

      const products = await Product.find({ category: categoryId }).lean();

      if (!products || products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No products found for this category'
        });
      }

      const standardizer = new SpecificationStandardizer();
      const analyzed = standardizer.analyzeProducts(products);

      // Collect unique specifications for this category
      const categorySpecs = {};
      const performanceTiers = { entry: 0, mid: 0, high: 0 };
      const useCases = { competitive: 0, content: 0, casual: 0 };

      analyzed.forEach(product => {
        // Count tiers and use cases
        performanceTiers[product.performanceTier]++;
        useCases[product.useCase]++;

        // Collect specifications
        Object.entries(product.specifications).forEach(([key, value]) => {
          if (!categorySpecs[key]) {
            categorySpecs[key] = new Set();
          }
          categorySpecs[key].add(value);
        });
      });

      // Convert Sets to Arrays
      Object.keys(categorySpecs).forEach(key => {
        categorySpecs[key] = Array.from(categorySpecs[key]).sort();
      });

      res.status(200).json({
        success: true,
        data: {
          categoryId,
          totalProducts: products.length,
          specifications: categorySpecs,
          performanceTiers,
          useCases,
          categoryKey: standardizer.getCategoryKey(categoryId)
        }
      });
    } catch (error) {
      console.error('Error getting category specifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting category specifications',
        error: error.message
      });
    }
  },

  /**
   * So sánh specifications của nhiều sản phẩm
   * POST /api/specifications/compare
   */
  compareProducts: async (req, res) => {
    try {
      const { productIds } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least 2 product IDs for comparison'
        });
      }

      if (productIds.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 products can be compared at once'
        });
      }

      const products = await Product.find({ _id: { $in: productIds } })
        .populate('category')
        .lean();

      if (products.length !== productIds.length) {
        return res.status(404).json({
          success: false,
          message: 'Some products not found'
        });
      }

      const standardizer = new SpecificationStandardizer();
      const analyzed = standardizer.analyzeProducts(products);

      // Create comparison matrix
      const comparison = {
        products: analyzed.map(product => ({
          _id: product._id,
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          category: product.category,
          performanceTier: product.performanceTier,
          useCase: product.useCase,
          specifications: product.specifications
        })),
        specificationMatrix: {}
      };

      // Build specification comparison matrix
      const allSpecs = new Set();
      analyzed.forEach(product => {
        Object.keys(product.specifications).forEach(spec => allSpecs.add(spec));
      });

      Array.from(allSpecs).forEach(spec => {
        comparison.specificationMatrix[spec] = analyzed.map(product => ({
          productId: product._id,
          value: product.specifications[spec] || 'N/A'
        }));
      });

      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error comparing products:', error);
      res.status(500).json({
        success: false,
        message: 'Error comparing products',
        error: error.message
      });
    }
  },

  /**
   * Gợi ý sản phẩm dựa trên specifications
   * POST /api/specifications/recommend
   */
  recommendProducts: async (req, res) => {
    try {
      const {
        category,
        budget,
        useCase = 'casual',
        prioritySpecs = [],
        limit = 10
      } = req.body;

      // Build query
      let query = {};
      if (category) query.category = category;
      if (budget) {
        query.price = { $lte: budget };
      }

      const products = await Product.find(query).populate('category').lean();

      if (!products || products.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            recommendations: [],
            message: 'No products found matching criteria'
          }
        });
      }

      const standardizer = new SpecificationStandardizer();
      const analyzed = standardizer.analyzeProducts(products);

      // Filter by use case
      let recommendations = analyzed.filter(product => 
        product.useCase === useCase || product.useCase === 'casual'
      );

      // Score products based on priority specs
      if (prioritySpecs.length > 0) {
        recommendations = recommendations.map(product => {
          let score = 0;
          prioritySpecs.forEach(spec => {
            if (product.specifications[spec.key]) {
              const productValue = product.specifications[spec.key].toLowerCase();
              const targetValue = spec.value.toLowerCase();
              
              if (productValue.includes(targetValue)) {
                score += spec.weight || 1;
              }
            }
          });
          
          return { ...product, recommendationScore: score };
        });

        // Sort by score and price
        recommendations.sort((a, b) => {
          if (a.recommendationScore !== b.recommendationScore) {
            return b.recommendationScore - a.recommendationScore;
          }
          return (a.price || 0) - (b.price || 0);
        });
      } else {
        // Default sorting by performance tier and price
        recommendations.sort((a, b) => {
          const tierOrder = { high: 3, mid: 2, entry: 1 };
          if (tierOrder[a.performanceTier] !== tierOrder[b.performanceTier]) {
            return tierOrder[b.performanceTier] - tierOrder[a.performanceTier];
          }
          return (a.price || 0) - (b.price || 0);
        });
      }

      // Limit results
      recommendations = recommendations.slice(0, limit);

      res.status(200).json({
        success: true,
        data: {
          recommendations,
          criteria: {
            category,
            budget,
            useCase,
            prioritySpecs
          }
        }
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating recommendations',
        error: error.message
      });
    }
  }
};

module.exports = specificationController;
