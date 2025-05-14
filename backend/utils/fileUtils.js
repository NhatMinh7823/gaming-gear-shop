const fs = require('fs');
const path = require('path');

const uploadFile = (file) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'images', 'products');
  const fileName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
  const filePath = path.join(uploadDir, fileName);

  // Move the file from the temporary upload location to the target directory
  fs.renameSync(file.path, filePath);

  // Return the relative path that can be served statically
  return {
    public_id: fileName, // Using filename as a simple public_id for now
    url: `/uploads/images/products/${fileName}`,
  };
};

const deleteFile = (public_id) => {
  if (!public_id || typeof public_id !== "string") return false;
  const uploadDir = path.join(__dirname, "..", "uploads", "images", "products");
  const filePath = path.join(uploadDir, public_id);

  // Check if the file exists before attempting to delete
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false; // File did not exist
};

module.exports = { uploadFile, deleteFile };
