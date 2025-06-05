class CategoryDetector {
  /**
   * Analyze query to detect intended category
   */
  static detectCategory(query) {
    const lowerQuery = query.toLowerCase();
    
    // Category mapping with more comprehensive keywords
    const categoryMap = {
      "Mice": ["chuột", "mouse", "chuột gaming", "gaming mouse", "chuot"],
      "Keyboards": ["bàn phím", "keyboard", "bàn phím cơ", "mechanical keyboard", "bàn phím gaming", "ban phim"],
      "Monitors": ["màn hình", "monitor", "màn hình gaming", "gaming monitor", "display", "man hinh"],
      "Headsets": ["tai nghe", "headset", "tai nghe gaming", "gaming headset", "headphone", "tai nghe steelseries", "tai nghe razer"],
      "Gaming Laptops": ["laptop", "laptop gaming", "gaming laptop", "máy tính xách tay"],
      "Gaming PCs": ["máy tính", "pc", "case", "vỏ máy tính", "gaming pc", "may tinh"]
    };
    
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return category;
      }
    }
    
    return null;
  }

  /**
   * Get category IDs by name
   */
  static async getCategoryIds(categoryName) {
    const Category = require("../../../models/categoryModel");
    const categories = await Category.find({ 
      name: new RegExp(categoryName, 'i') 
    });
    return categories.map(cat => cat._id);
  }
}

module.exports = CategoryDetector;