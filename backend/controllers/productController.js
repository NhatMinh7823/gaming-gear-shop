const Product = require("../models/productModel");
const { uploadFile, deleteFile } = require("../utils/fileUtils");

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const {
      page: pageParam = 1,
      limit: limitParam = 10,
      sort,
      fields,
      category,
      minPrice,
      maxPrice,
      brand,
      stockStatus,
      ...otherFilters
    } = req.query;

    const queryConditions = {};
    // Handle category filter - lookup by name or use ID directly
    if (category && category !== "") {
      try {
        // If category is a valid MongoDB ObjectId, use it directly
        if (category.match(/^[0-9a-fA-F]{24}$/)) {
          queryConditions.category = category;
        } else {
          // Otherwise, try to find category by name
          const Category = require("../models/categoryModel");
          const categoryDoc = await Category.findOne({
            $or: [
              { name: { $regex: new RegExp(category, "i") } },
              { slug: category.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-") },
            ],
          });
          if (categoryDoc) {
            queryConditions.category = categoryDoc._id;
          }
        }
      } catch (err) {
        console.error("Error processing category filter:", err);
      }
    }
    if (brand && brand !== "")
      queryConditions.brand = { $regex: brand, $options: "i" };

    // Xử lý lọc theo tình trạng tồn kho
    if (stockStatus) {
      switch (stockStatus) {
        case "in_stock":
          queryConditions.stock = { $gt: 5 };
          break;
        case "low_stock":
          queryConditions.stock = { $gt: 0, $lte: 5 };
          break;
        case "out_of_stock":
          queryConditions.stock = { $lte: 0 };
          break;
      }
    }

    const priceCondition = {};
    if (minPrice !== undefined && minPrice !== "") {
      const parsedMinPrice = parseFloat(minPrice);
      if (!isNaN(parsedMinPrice)) priceCondition.$gte = parsedMinPrice;
    }
    if (maxPrice !== undefined && maxPrice !== "") {
      const parsedMaxPrice = parseFloat(maxPrice);
      if (!isNaN(parsedMaxPrice)) priceCondition.$lte = parsedMaxPrice;
    }
    if (Object.keys(priceCondition).length > 0)
      queryConditions.price = priceCondition;
    Object.keys(otherFilters).forEach((key) => {
      const value = otherFilters[key];
      if (value !== "" && value !== undefined) {
        if (value === "true") queryConditions[key] = true;
        else if (value === "false") queryConditions[key] = false;
        else if (!isNaN(Number(value))) queryConditions[key] = Number(value);
        else queryConditions[key] = value;
      }
    });

    let query = Product.find(queryConditions).populate("category", "name slug");

    if (sort) query = query.sort(sort.split(",").join(" "));
    else query = query.sort("-createdAt");

    if (fields) query = query.select(fields.split(",").join(" "));
    else query = query.select("-__v");

    const page = parseInt(pageParam, 10);
    const limit = parseInt(limitParam, 10);
    const startIndex = (page - 1) * limit;

    query = query.skip(startIndex).limit(limit);

    const products = await query;
    const totalProducts = await Product.countDocuments(queryConditions);

    // Filter out invalid images
    const sanitizedProducts = products.map((product) => {
      const validImages = (product.images || []).filter(
        (img) => img && img.url && img.public_id
      );
      if (validImages.length !== (product.images || []).length) {
        console.warn(
          `Product ${product._id} has invalid images:`,
          product.images
        );
      }
      return { ...product.toObject(), images: validImages };
    });

    res.status(200).json({
      success: true,
      count: sanitizedProducts.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      products: sanitizedProducts,
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
    if (req.files && req.files.images) {
      for (const file of req.files.images) {
        const uploadType = "products";
        const relativePath = `/uploads/images/${uploadType}/${file.filename}`;
        images.push({
          url: relativePath,
          filename: file.filename,
          public_id: file.filename,
        });
      }
    }

    const productData = {
      ...req.body,
      images: images,
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

    // Parse existingImages from req.body
    let existingImagesToKeep = [];
    if (req.body.existingImages) {
      try {
        existingImagesToKeep = JSON.parse(req.body.existingImages);
        if (!Array.isArray(existingImagesToKeep)) {
          existingImagesToKeep = [];
        }
      } catch (error) {
        console.error("Error parsing existingImages:", error);
        existingImagesToKeep = [];
      }
    }

    // Get existing images from the product in the database
    const existingImagesInDB = product.images || [];

    // Identify images to delete
    const imagesToDelete = existingImagesInDB.filter(
      (image) =>
        !existingImagesToKeep.some(
          (keptImage) => keptImage.public_id === image.public_id
        )
    );

    // Delete images that are no longer needed
    for (const image of imagesToDelete) {
      await deleteFile(image.public_id);
    }

    // Upload new files with error handling
    const newImages = [];
    if (req.files && req.files.images) {
      for (const file of req.files.images) {
        try {
          const uploadType = "products";
          const relativePath = `/uploads/images/${uploadType}/${file.filename}`;
          newImages.push({
            url: relativePath,
            filename: file.filename,
            public_id: file.filename,
          });
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Failed to upload new images",
            error: uploadError.message,
          });
        }
      }
    }

    // Combine existing images to keep and new images
    const finalImages = [...existingImagesToKeep, ...newImages];

    const updatedData = {
      ...req.body,
      images: finalImages,
    };

    // Remove existingImages from req.body before updating the product
    delete updatedData.existingImages;

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
    console.error("Error updating product:", error);
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
      stockStatus,
    } = req.query;
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Keyword is required",
      });
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

    // Xử lý lọc theo tình trạng tồn kho
    if (stockStatus) {
      switch (stockStatus) {
        case "in_stock":
          query.stock = { $gt: 5 };
          break;
        case "low_stock":
          query.stock = { $gt: 0, $lte: 5 };
          break;
        case "out_of_stock":
          query.stock = { $lte: 0 };
          break;
      }
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
      return res
        .status(400)
        .json({ success: false, message: "Please provide a keyword" });
    }

    const suggestions = await Product.aggregate([
      { $match: { $text: { $search: keyword } } },
      { $group: { _id: "$name", brand: { $first: "$brand" } } },
      { $limit: 5 },
      { $project: { name: "$_id", brand: 1, _id: 0 } },
    ]);

    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
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
