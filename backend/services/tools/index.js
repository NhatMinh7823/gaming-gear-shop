// Export all tools from this module
const { ProductSearchTool } = require("./productSearch");
const ProductFilterTool = require("./ProductFilterTool");
const CategoryListTool = require("./CategoryListTool");
const ProductDetailsTool = require("./ProductDetailsTool");
const PriceRangeTool = require("./PriceRangeTool");

// Import wishlist tools from wishlist module
const { WishlistTool, IntentDetector } = require("./wishlist");

// Import cart tool (enhanced version)
const CartTool = require("./cart/CartTool");

// Import order tool
const OrderTool = require("./order/OrderTool");

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
    new IntentDetector(),
    new ProductSearchTool(),
    new ProductFilterTool(),
    new CategoryListTool(),
    new ProductDetailsTool(),
    new PriceRangeTool(),
  ];

  console.log("Global tools initialized successfully");
};

/**
 * Create fresh tools with current UserContext
 * @param {UserContext} userContext - Current user context
 * @returns {Array} Array of tool instances with fresh UserContext
 */
const createFreshTools = (userContext) => {
  if (!globalToolInstances) {
    throw new Error("Global tools not initialized. Call initialize() first.");
  }

  // Create fresh tool set with current UserContext
  const freshTools = [
    ...globalToolInstances, // Non-user-specific tools (reuse)
    new WishlistTool(userContext), // Fresh WishlistTool with current UserContext
    new CartTool(userContext), // Single comprehensive cart tool (enhanced)
    new OrderTool(userContext), // Fresh OrderTool with current UserContext
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
  return [...globalToolInstances, new WishlistTool(null), new CartTool(null), new OrderTool(null)];
};

/**
 * Get tools with specific UserContext (recommended)
 * @param {UserContext} userContext - Current user context
 * @returns {Array} Array of tool instances with correct UserContext
 */
const getToolsWithContext = (userContext) => {
  return createFreshTools(userContext);
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
  ProductFilterTool,
  CategoryListTool,
  ProductDetailsTool,
  PriceRangeTool,
  WishlistTool,
  IntentDetector,
  CartTool,
  OrderTool,
};
