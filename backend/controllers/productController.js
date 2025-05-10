const Product = require("../models/productModel");
const { uploadFile, deleteFile } = require("../utils/fileUtils");

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const { page: pageParam = 1, limit: limitParam = 10, sort, fields, category, minPrice, maxPrice, brand, ...otherFilters } = req.query;

    const queryConditions = {};

    // Handle category
    if (category && category !== "") {
      queryConditions.category = category;
    }

    // Handle brand
    if (brand && brand !== "") {
      // Using regex for partial matching, case-insensitive. Adjust if exact match is needed.
      queryConditions.brand = { $regex: brand, $options: "i" };
    }

    // Handle price range
    // Consider using a validation library (e.g., Joi, express-validator) here for more comprehensive checks.
    const priceCondition = {};
    if (minPrice !== undefined && minPrice !== '') {
      const parsedMinPrice = parseFloat(minPrice);
      if (!isNaN(parsedMinPrice)) {
        priceCondition.$gte = parsedMinPrice;
      } else {
        // Optionally, return a 400 Bad Request if invalid price format is critical
        // return res.status(400).json({ success: false, message: "Invalid minPrice format." });
        console.warn(`Invalid minPrice format received: ${minPrice}`); // Or log for debugging
      }
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      const parsedMaxPrice = parseFloat(maxPrice);
      if (!isNaN(parsedMaxPrice)) {
        priceCondition.$lte = parsedMaxPrice;
      } else {
        // Optionally, return a 400 Bad Request
        // return res.status(400).json({ success: false, message: "Invalid maxPrice format." });
        console.warn(`Invalid maxPrice format received: ${maxPrice}`);
      }
    }
    if (Object.keys(priceCondition).length > 0) {
      queryConditions.price = priceCondition;
    }
    
    // Handle other dynamic filters from req.query (e.g., isFeatured=true)
    // This is a simplified approach; more robust validation/typing is recommended.
    // A validation library would be ideal here to define allowed filters and their types.
    Object.keys(otherFilters).forEach(key => {
      const value = otherFilters[key];
      if (value !== '' && value !== undefined) {
        // Basic conversion for boolean-like strings
        if (value === 'true') {
          queryConditions[key] = true;
        } else if (value === 'false') {
          queryConditions[key] = false;
        } else if (!isNaN(Number(value))) { // Attempt to convert to number if it looks like one
          queryConditions[key] = Number(value);
        }
        else {
          // For other string types, assign as is.
          // Consider if specific fields need regex for partial matches.
          queryConditions[key] = value;
        }
      }
    });
    
    let query = Product.find(queryConditions).populate("category", "name slug");

    if (sort) {
      const sortBy = sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    if (fields) {
      const selectFields = fields.split(",").join(" ");
      query = query.select(selectFields);
    } else {
      query = query.select("-__v");
    }

    const page = parseInt(pageParam, 10);
    const limit = parseInt(limitParam, 10);
    const startIndex = (page - 1) * limit;

    query = query.skip(startIndex).limit(limit);

    const products = await query;
    const totalProducts = await Product.countDocuments(queryConditions); // Use the same queryConditions

    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "name",
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadedImage = await uploadFile(file);
        images.push(uploadedImage);
      }
    }

    const productData = {
      ...req.body,
      images: images.length > 0 ? images : req.body.images || [],
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          await deleteFile(image.public_id);
        }
      }
      for (const file of req.files) {
        const uploadedImage = await uploadFile(file);
        images.push(uploadedImage);
      }
    }

    const updatedData = {
      ...req.body,
      images: images.length > 0 ? images : product.images,
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await deleteFile(image.public_id);
      }
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const products = await Product.find({})
      .sort({ averageRating: -1 })
      .limit(limit)
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get new arrivals
// @route   GET /api/products/new
// @access  Public
exports.getNewArrivals = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const products = await Product.find({ isNewArrival: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const products = await Product.find({ isFeatured: true })
      .limit(limit)
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const products = await Product.find({ category: categoryId }).populate(
      "category",
      "name slug"
    );

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
exports.searchProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      brand,
    } = req.query;
    if (!keyword) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a search keyword" });
    }

    const query = {
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { brand: { $regex: keyword, $options: "i" } },
      ],
    };

    if (category && category !== "") {
      query.category = category;
    }
    if (minPrice) {
      query.price = { $gte: Number(minPrice) };
    }
    if (maxPrice) {
      query.price = { ...query.price, $lte: Number(maxPrice) };
    }
    if (brand) {
      query.brand = { $regex: brand, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .populate("category", "name slug")
      .skip(skip)
      .limit(Number(limit));

    const totalProducts = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: Number(page),
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get search suggestions
// @route   GET /api/products/suggestions
// @access  Public
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ success: false, message: "Please provide a keyword" });
    }

    const suggestions = await Product.aggregate([
      { $match: { $text: { $search: keyword } } },
      { $group: { _id: "$name", brand: { $first: "$brand" } } },
      { $limit: 5 },
      { $project: { name: "$_id", brand: 1, _id: 0 } },
    ]);

    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Compare products
// @route   GET /api/products/compare
// @access  Public
exports.compareProducts = async (req, res) => {
  const { productIds } = req.query;
  const products = await Product.find({ _id: { $in: productIds.split(",") } });
  res.status(200).json({ success: true, products });
};
