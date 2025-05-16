// categoryController.js

const Category = require("../models/categoryModel");

const path = require("path");
const fs = require("fs");

// @desc    Get categories with pagination, search and sorting
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const sortField = req.query.sortField || "name";
    const sortOrder = req.query.sortOrder || "asc";

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    // Get total count for pagination
    const total = await Category.countDocuments(query);

    // Get categories with pagination and sorting
    const categories = await Category.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("subcategories");

    res.status(200).json({
      success: true,
      categories,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get main categories (with no parent)
// @route   GET /api/categories/main
// @access  Public
exports.getMainCategories = async (req, res) => {
  try {
    const categories = await Category.find({ parent: null }).populate(
      "subcategories"
    );

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "subcategories"
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get subcategories by parent ID
// @route   GET /api/categories/:id/subcategories
// @access  Public
exports.getSubcategories = async (req, res) => {
  try {
    const subcategories = await Category.find({ parent: req.params.id });

    res.status(200).json({
      success: true,
      count: subcategories.length,
      subcategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parent, featured } = req.body;

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists",
      });
    }

    const categoryData = { name, description, parent, featured };

    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      const uploadType = 'categories';
      const relativePath = `/uploads/images/${uploadType}/${file.filename}`;

      categoryData.image = {
        url: relativePath,
        filename: file.filename,
        public_id: file.filename
      };
    }

    const category = await Category.create(categoryData);
    const populatedCategory = await Category.findById(category._id).populate(
      "subcategories"
    );

    res.status(201).json({
      success: true,
      category: populatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, parent, featured } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if another category with the same name exists (excluding current category)
    const existingCategory = await Category.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Another category with this name already exists",
      });
    }

    // Build category data
    const categoryData = { name, description, parent, featured };

    // Handle file upload
    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      
      // Delete old image if it exists
      if (category.image && category.image.public_id) {
        const oldImagePath = path.join(
          __dirname,
          '..',
          'uploads',
          'images',
          'categories',
          category.image.public_id
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      const uploadType = 'categories';
      const relativePath = `/uploads/images/${uploadType}/${file.filename}`;

      categoryData.image = {
        url: relativePath,
        filename: file.filename,
        public_id: file.filename
      };
    } else {
      categoryData.image = category.image;
    }

    // Update category
    Object.assign(category, categoryData);
    await category.save();

    // Return populated category
    const updatedCategory = await Category.findById(category._id).populate(
      "subcategories"
    );

    res.status(200).json({
      success: true,
      category: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has subcategories
    const hasSubcategories = await Category.findOne({ parent: req.params.id });
    if (hasSubcategories) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with subcategories. Delete subcategories first.",
      });
    }

    // Delete image if exists
    if (category.image && category.image.public_id) {
      const imagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "images",
        "categories",
        category.image.public_id
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete multiple categories
// @route   DELETE /api/categories
// @access  Private/Admin
exports.deleteCategories = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of category IDs to delete",
      });
    }

    // Check if any category has subcategories
    const categoriesWithSubs = await Category.find({
      parent: { $in: ids },
    });

    if (categoriesWithSubs.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete categories with subcategories. Delete subcategories first.",
      });
    }

    // Get all categories to delete
    const categoriesToDelete = await Category.find({ _id: { $in: ids } });

    // Delete associated images
    for (const category of categoriesToDelete) {
      if (category.image && category.image.public_id) {
        const imagePath = path.join(
          __dirname,
          "..",
          "uploads",
          "images",
          "categories",
          category.image.public_id
        );
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    // Delete categories
    await Category.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${ids.length} categories`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get featured categories
// @route   GET /api/categories/featured
// @access  Public
exports.getFeaturedCategories = async (req, res) => {
  try {
    const categories = await Category.find({ featured: true }).populate(
      "subcategories"
    );

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).populate(
      "subcategories"
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
