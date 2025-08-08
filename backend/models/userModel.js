// userModel.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
    trim: true,
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  address: {
    street: {
      type: String,
      trim: true,
    },
    ward: {
      code: {
        type: String,
        required: function () {
          return !!this.address.ward.name;
        },
      },
      name: {
        type: String,
        trim: true,
      },
    },
    district: {
      id: {
        type: Number,
        required: function () {
          return !!this.address.district.name;
        },
      },
      name: {
        type: String,
        trim: true,
      },
    },
    province: {
      id: {
        type: Number,
        required: function () {
          return !!this.address.province.name;
        },
      },
      name: {
        type: String,
        trim: true,
      },
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
  },
  wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  coupon: {
    code: {
      type: String,
      default: null,
    },
    used: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["usable", "pending", "used"],
      default: "usable",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    discountPercent: {
      type: Number,
      default: 30, // Giảm 30% cho đơn hàng đầu tiên
    },
    createdAt: {
      type: Date,
      default: null,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Password reset fields
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpire: {
    type: Date,
    default: null,
  },

  // Chatbot preferences for order management
  chatbotPreferences: {
    hasSeenOnboarding: {
      type: Boolean,
      default: false,
    },
    preferredPaymentMethod: {
      type: String,
      enum: ["COD", "VNPay"],
      default: "VNPay",
    },
    defaultShippingAddress: {
      type: String,
      default: null,
    },
    orderNotificationSettings: {
      chatbotUpdates: {
        type: Boolean,
        default: true,
      },
    },
  },
});

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = resetToken;

  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
