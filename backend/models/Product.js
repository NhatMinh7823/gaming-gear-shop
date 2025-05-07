// backend/models/Product.js
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    imageUrls: [String],

    // Gaming-specific fields
    specifications: {
      // Common specifications
      dimensions: String,
      weight: String,

      // PC/Laptop specifications
      processor: String,
      graphicsCard: String,
      ram: String,
      storage: String,
      display: String,

      // Peripheral specifications
      connectivity: String,
      batteryLife: String,

      // Additional specs as needed
      additionalSpecs: mongoose.Schema.Types.Mixed,
    },

    compatibleWith: [
      {
        type: String,
      },
    ],

    performanceMetrics: {
      // Gaming benchmarks
      fps: [{ game: String, settings: String, value: Number }],
      // Other performance metrics
    },

    reviews: [reviewSchema],

    rating: {
      type: Number,
      required: true,
      default: 0,
    },

    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
