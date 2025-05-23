// authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }

  try {    // Verify token - log only when DEBUG is enabled
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Only log when DEBUG environment variable is set
    if (process.env.DEBUG === 'true') {
      console.log("Auth: Token verification successful for user ID:", decoded.id);
    }

    // Get user from the token
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      console.error(`Protect Middleware: User not found in DB for ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: "User associated with token not found. Not authorized.",
      });
    }
    
    req.user = user; // Assign user to request object

    next();
  } catch (error) {
    console.error("Error in protect middleware:", error.name, error.message, error.stack); // Log more details
    
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
    }
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    // Generic error for other cases during token processing
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route (token processing issue).",
      errorName: error.name, // Send error name for better client-side debugging if needed
      // errorMessage: error.message // Optionally send error message in dev
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
