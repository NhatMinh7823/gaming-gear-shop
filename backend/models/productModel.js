// productModel.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a product name"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide a product description"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please provide a product price"],
      min: [0, "Price must be a positive number"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price must be a positive number"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please select a category"],
    },
    brand: {
      type: String,
      required: [true, "Please provide a brand name"],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Please provide stock quantity"],
      min: [0, "Stock quantity must be a positive number"],
      default: 0,
    },
    sold: {
      type: Number,
      default: 0,
    },
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    specifications: {
      type: Object,
      default: {},
    },
    features: [String],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      min: [0, "Rating must be at least 0"],
      max: [5, "Rating cannot exceed 5"],
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  shippingInfo: {
    weight: {
      type: Number,
      default: 200 // grams
    },
    dimensions: {
      length: {
        type: Number,
        default: 20 // cm
      },
      width: {
        type: Number,
        default: 20 // cm
      },
      height: {
        type: Number,
        default: 5 // cm
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for reviews
productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
  justOne: false,
});

// Update timestamp on save
productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// searching 
productSchema.index({ name: "text", description: "text", brand: "text" });

module.exports = mongoose.model("Product", productSchema);
