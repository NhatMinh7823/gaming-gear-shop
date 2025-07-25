const User = require("../models/userModel");
const Review = require("../models/reviewModel"); // Import Review model
const { generateCouponCode } = require("../utils/couponUtils");

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, fromSpecialOffer } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    // Nếu đăng ký từ form special offer, tạo coupon ngay
    if (fromSpecialOffer) {
      const couponCode = generateCouponCode();
      user.coupon = {
        code: couponCode,
        used: false,
        discountPercent: 30,
        createdAt: Date.now(),
      };

      await user.save();
    }

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        coupon: user.coupon,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = user.getSignedJwtToken();
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        coupon: user.coupon,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    } // Làm mới user để đảm bảo có dữ liệu coupon mới nhất
    const freshUser = await User.findById(user._id);

    res.status(200).json({
      success: true,
      user: {
        id: freshUser._id,
        name: freshUser.name,
        email: freshUser.email,
        role: freshUser.role,
        address: freshUser.address,
        wishlist: freshUser.wishlist || [], // Đảm bảo wishlist luôn tồn tại
        coupon: freshUser.coupon || null, // Trả về thông tin coupon
        createdAt: freshUser.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot update password through this route",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        wishlist: user.wishlist || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "wishlist",
      select:
        "name price images discountPrice countInStock averageRating numReviews",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist
// @access  Private
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Please provide a product ID",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { wishlist: productId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { wishlist: productId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Generate coupon for user
// @route   POST /api/users/generate-coupon
// @access  Private
exports.generateCoupon = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Nếu user đã có coupon và chưa sử dụng, trả về coupon hiện tại
    if (user.coupon && user.coupon.code && !user.coupon.used) {
      return res.status(200).json({
        success: true,
        coupon: user.coupon,
      });
    }

    // Tạo mã coupon ngẫu nhiên 5 ký tự
    const couponCode = generateCouponCode();

    // Cập nhật coupon cho user
    user.coupon = {
      code: couponCode,
      used: false,
      discountPercent: 30,
      createdAt: Date.now(),
    };

    await user.save();

    res.status(200).json({
      success: true,
      coupon: user.coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo coupon",
      error: error.message,
    });
  }
};

// @desc    Apply coupon to order
// @route   POST /api/users/apply-coupon
// @access  Public
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã coupon",
      });
    }

    // Tìm user với mã coupon này
    const user = await User.findOne({ "coupon.code": code });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Mã coupon không hợp lệ",
      });
    }

    if (user.coupon.used) {
      return res.status(400).json({
        success: false,
        message: "Mã coupon đã được sử dụng",
      });
    }

    res.status(200).json({
      success: true,
      coupon: {
        code: user.coupon.code,
        discountPercent: user.coupon.discountPercent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi áp dụng coupon",
      error: error.message,
    });
  }
};

// @desc    Mark coupon as used after successful order
// @route   POST /api/users/mark-coupon-used
// @access  Private
exports.markCouponAsUsed = async (req, res) => {
  try {
    const { code, orderId } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã coupon",
      });
    }

    // Tìm user với mã coupon này
    const user = await User.findOne({ "coupon.code": code });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy coupon",
      });
    }

    // Đánh dấu coupon đã sử dụng và cập nhật trạng thái mới
    user.coupon.used = true;
    user.coupon.status = "used";

    // Liên kết với đơn hàng nếu có
    if (orderId) {
      user.coupon.orderId = orderId;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu coupon là đã sử dụng",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái coupon",
      error: error.message,
    });
  }
};

// @desc    Get recent users (admin only)
// @route   GET /api/users/recent
// @access  Private/Admin
exports.getRecentUsers = async (req, res) => {
  try {
    const recentUsers = await User.find()
      .select("-password")
      .sort("-createdAt")
      .limit(10); // Get the last 10 registered users

    res.status(200).json({
      success: true,
      count: recentUsers.length,
      users: recentUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get user by ID (admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update user by ID (admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update user address
// @route   PUT /api/users/address
// @access  Private
exports.updateAddress = async (req, res) => {
  try {
    const { street, ward, district, province, isDefault } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update address
    user.address = {
      street: street || '',
      ward: {
        code: ward.code,
        name: ward.name
      },
      district: {
        id: district.id,
        name: district.name
      },
      province: {
        id: province.id,
        name: province.name
      },
      isDefault: isDefault !== undefined ? isDefault : true,
      isComplete: !!(street && ward.code && district.id && province.id)
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address: user.address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating address',
      error: error.message
    });
  }
};

// @desc    Get user address
// @route   GET /api/users/address
// @access  Private
exports.getUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('address');
    res.status(200).json({
      success: true,
      address: user.address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching address',
      error: error.message
    });
  }
};

// ===============================================
// ADMIN CONTROLLERS FOR USER DATA
// ===============================================

// @desc    Get user reviews by user ID (Admin)
// @route   GET /api/users/:userId/reviews
// @access  Private/Admin
exports.getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ user: userId }).populate('product', 'name images');
    
    if (!reviews) {
      return res.status(404).json({ success: false, message: 'No reviews found for this user' });
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};


// @desc    Get user addresses by user ID (Admin)
// @route   GET /api/users/:userId/addresses
// @access  Private/Admin
exports.getUserAddressesByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('address');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // The model currently supports one address, so we return it in an array for consistency
    const addresses = user.address && user.address.isComplete ? [user.address] : [];
    res.status(200).json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a user's address by ID (Admin)
// @route   PUT /api/users/:userId/addresses/:addressId
// @access  Private/Admin
exports.updateAddressByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { street, ward, district, province, isDefault } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Since there's only one address, we update it directly.
    // The addressId param is kept for future-proofing if the model changes to support multiple addresses.
    user.address = {
      street: street || '',
      ward: ward,
      district: district,
      province: province,
      isDefault: isDefault !== undefined ? isDefault : true,
      isComplete: !!(street && ward.code && district.id && province.id)
    };

    await user.save();
    res.status(200).json({ success: true, message: 'Address updated successfully', address: user.address });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating address', error: error.message });
  }
};

// @desc    Delete a user's address by ID (Admin)
// @route   DELETE /api/users/:userId/addresses/:addressId
// @access  Private/Admin
exports.deleteAddressByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // To "delete" the single address, we can set it to an empty object or clear its fields
    user.address = {
        street: '',
        ward: {},
        district: {},
        province: {},
        isDefault: false,
        isComplete: false
    };

    await user.save();
    res.status(200).json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting address', error: error.message });
  }
};
