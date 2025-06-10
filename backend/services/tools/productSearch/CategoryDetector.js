class CategoryDetector {
  /**
   * Analyze query to detect intended category with smart conflict resolution
   */
  static detectCategory(query) {
    const lowerQuery = query.toLowerCase();
    
    // Priority-based category mapping with conflict resolution
    const categoryMap = {
      // HIGH PRIORITY - Specific terms first
      "Gaming Laptops": {
        keywords: ["laptop", "laptop gaming", "gaming laptop", "máy tính xách tay", "laptop game", "may tinh xach tay"],
        priority: 1,
        exclusions: ["pc", "case", "vỏ máy tính", "desktop", "main"]
      },
      "Gaming PCs": {
        keywords: ["pc gaming", "gaming pc", "pc game", "máy tính bàn", "desktop", "case", "vỏ máy tính", "main", "pc desktop", "may tinh ban"],
        priority: 1,
        exclusions: ["laptop", "xách tay", "portable"]
      },
      "Mice": {
        keywords: ["chuột", "mouse", "chuột gaming", "gaming mouse", "chuot"],
        priority: 2,
        exclusions: ["laptop", "máy tính xách tay", "notebook"]
      },
      "Keyboards": {
        keywords: ["bàn phím", "keyboard", "bàn phím cơ", "mechanical keyboard", "bàn phím gaming", "ban phim"],
        priority: 2,
        exclusions: ["laptop", "máy tính xách tay", "notebook"]
      },
      "Monitors": {
        keywords: ["màn hình", "monitor", "màn hình gaming", "gaming monitor", "display", "man hinh", "screen"],
        priority: 2,
        exclusions: []
      },
      "Headsets": {
        keywords: ["tai nghe", "headset", "tai nghe gaming", "gaming headset", "headphone", "tai nghe steelseries", "tai nghe razer"],
        priority: 2,
        exclusions: []
      }
    };
    
    // First pass: Find exact matches with exclusion checking
    const matches = [];
    
    for (const [category, config] of Object.entries(categoryMap)) {
      const hasKeyword = config.keywords.some(keyword => lowerQuery.includes(keyword));
      const hasExclusion = config.exclusions.some(exclusion => lowerQuery.includes(exclusion));
      
      if (hasKeyword && !hasExclusion) {
        matches.push({
          category,
          priority: config.priority,
          matchStrength: this.calculateMatchStrength(lowerQuery, config.keywords)
        });
      }
    }
    
    // If no matches, try fallback with generic terms
    if (matches.length === 0) {
      // Generic fallback for "máy tính" - try to determine context
      if (lowerQuery.includes("máy tính") || lowerQuery.includes("may tinh")) {
        // Check context clues to determine if it's laptop or PC
        const laptopClues = ["xách tay", "portable", "di động", "mang theo", "laptop"];
        const pcClues = ["bàn", "desktop", "tower", "case", "main", "để bàn"];
        
        const hasLaptopClues = laptopClues.some(clue => lowerQuery.includes(clue));
        const hasPcClues = pcClues.some(clue => lowerQuery.includes(clue));
        
        if (hasLaptopClues && !hasPcClues) {
          return "Gaming Laptops";
        } else if (hasPcClues && !hasLaptopClues) {
          return "Gaming PCs";
        }
        // If ambiguous, default to PC as it's more common in gaming context
        return "Gaming PCs";
      }
    }
    
    if (matches.length === 0) return null;
    
    // Sort by priority first, then by match strength
    matches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher priority
      }
      return b.matchStrength - a.matchStrength; // Higher match strength first
    });
    
    return matches[0].category;
  }

  /**
   * Calculate match strength based on keyword matches
   */
  static calculateMatchStrength(query, keywords) {
    let strength = 0;
    keywords.forEach(keyword => {
      if (query.includes(keyword)) {
        // Longer keywords get higher score
        strength += keyword.length;
        // Exact word matches get bonus
        if (query.split(' ').includes(keyword)) {
          strength += 5;
        }
      }
    });
    return strength;
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