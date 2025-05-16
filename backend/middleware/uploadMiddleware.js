const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories for different types of images
const createUploadDirs = () => {
  const dirs = {
    products: path.join(__dirname, '..', 'uploads', 'images', 'products'),
    categories: path.join(__dirname, '..', 'uploads', 'images', 'categories')
  };

  // Create directories if they don't exist
  Object.values(dirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return dirs;
};

const uploadDirs = createUploadDirs();

// Set up storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on upload type
    const uploadType = file.fieldname === 'image' ? 'categories' : 'products';
    cb(null, uploadDirs[uploadType]);
  },
  filename: function (req, file, cb) {
    // Determine destination based on upload type
    const uploadType = file.fieldname === 'image' ? 'categories' : 'products';
    // Generate relative path for storage
    const relativePath = `/uploads/images/${uploadType}/${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    // Extract just the filename from the relative path
    const filename = path.basename(relativePath);
    cb(null, filename);
  }
});

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif|webp/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only! (jpeg, jpg, png, gif, webp)');
  }
}

// Initialize upload middleware with file size and type validation
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).fields([
  { name: 'image', maxCount: 1 },    // For single category image
  { name: 'images', maxCount: 10 }   // For multiple product images
]);

// Middleware wrapper to handle errors
const handleUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err
      });
    }
    next();
  });
};

// Export specific middleware for different upload types
const uploadCategoryImage = (req, res, next) => handleUpload(req, res, next);
const uploadProductImages = (req, res, next) => handleUpload(req, res, next);

module.exports = { 
  uploadProductImages, 
  uploadCategoryImage,
  uploadDirs // Export dirs for use in controllers
};
