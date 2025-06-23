// 🤖 AI-Powered ProductSearch System
// Simplified single-tool approach using Gemini-2.0-flash
// 
// Replaces 11 complex modules with 1 intelligent AI tool
// See AI_TRANSFORMATION_README.md for details

module.exports = {
  // Main AI-powered product search tool
  ProductSearchTool: require('./AIProductSearchTool'),
  // Product details and category tools
  ProductDetailsTool: require('./ProductDetailsTool'),
  CategoryListTool: require('./CategoryListTool')
};

// Legacy modules have been moved to .gitignore for cleaner codebase
// They remain available in the file system for reference if needed
