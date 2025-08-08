// Export all tools from this module
const { ProductSearchTool, ProductDetailsTool, CategoryListTool } = require("./productSearch");

// Import AI-driven wishlist tool directly
const AISmartWishlistTool = require("./wishlist/AISmartWishlistTool");

// Import cart tools - NEW AI-driven version only
const AISmartCartTool = require("./cart/AISmartCartTool");
// const CartTool = require("./cart/CartTool"); // Legacy version removed

// Import order tool - OPTIMIZED VERSION
const OptimizedAIOrderTool = require("./order/OptimizedAIOrderTool"); // OPTIMIZED AI-driven version

// Global tools instances (for non-user-specific tools)
let globalToolInstances = null;
let vectorStoreManager = null;

/**
 * Initialize global tools and dependencies
 * @param {VectorStoreManager} vsManager
 * @param {UserContext} userContext - Initial userContext (will be replaced dynamically)
 */
const initialize = async (vsManager, userContext) => {
  console.log("Initializing global tools...");
  vectorStoreManager = vsManager;

  // Initialize non-user-specific tools once
  globalToolInstances = [
    new ProductSearchTool({ vectorStoreManager }),
    new CategoryListTool(),
    new ProductDetailsTool(),
  ];

  console.log("Global tools initialized successfully");
};

/**
 * Create fresh tools with current UserContext
 * @param {UserContext} userContext - Current user context
 * @returns {Array} Array of tool instances with fresh UserContext
 */
const createFreshTools = (userContext, sessionContext = null) => {
  if (!globalToolInstances) {
    throw new Error("Global tools not initialized. Call initialize() first.");
  }

  // Create fresh tool set with current UserContext and optional sessionContext
  const freshTools = [
    ...globalToolInstances, // Non-user-specific tools (reuse)
    new AISmartWishlistTool(userContext),
    new AISmartCartTool(userContext),
    new OptimizedAIOrderTool(userContext), // OPTIMIZED - No more maxIteration issues
  ];

  return freshTools;
};

/**
 * Get all tools as instances (legacy - for backward compatibility)
 * @returns {Array} Array of tool instances
 */
const getAllTools = () => {
  if (!globalToolInstances) {
    throw new Error("Tools not initialized. Call initialize() first.");
  }
  // Return global tools + user-specific tools with null context (fallback)
  return [...globalToolInstances, new AISmartWishlistTool(null), new OptimizedAIOrderTool(null)];
};

/**
 * Get tools with specific UserContext (recommended)
 * @param {UserContext} userContext - Current user context
 * @returns {Array} Array of tool instances with correct UserContext
 */
const getToolsWithContext = (userContext, sessionContext = null) => {
  return createFreshTools(userContext, sessionContext);
};

/**
 * Get tools formatted for agent
 * @returns {Object} Tools information for logging
 */
const getToolsInfo = () => {
  const tools = getAllTools();
  return {
    names: tools.map((tool) => tool.name).join(", "),
    descriptions: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema?.shape || {},
    })),
  };
};

module.exports = {
  initialize,
  getAllTools,
  getToolsWithContext,
  createFreshTools,
  getToolsInfo,
  ProductSearchTool,
  CategoryListTool,
  ProductDetailsTool,
  AISmartWishlistTool,
  AISmartCartTool,
  OptimizedAIOrderTool,
};
