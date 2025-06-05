// Export all tools from this module
const { ProductSearchTool } = require("./productSearch");
const ProductFilterTool = require("./ProductFilterTool");
const CategoryListTool = require("./CategoryListTool");
const ProductDetailsTool = require("./ProductDetailsTool");
const PriceRangeTool = require("./PriceRangeTool");

// Import wishlist tools from wishlist module
const { WishlistTool, IntentDetector } = require("./wishlist");

// Tools instances
let toolInstances = null;

/**
 * Initialize tools with dependencies
 * @param {VectorStoreManager} vectorStoreManager
 * @param {UserContext} userContext
 */
const initialize = async (vectorStoreManager, userContext) => {
  console.log("Initializing tools with dependencies...");
  console.log("UserContext passed to tools:", userContext?.getUserId());

  toolInstances = [
    new IntentDetector(), // Thêm IntentDetector để nhận diện intent trước
    new ProductSearchTool(),
    new ProductFilterTool(),
    new CategoryListTool(),
    new ProductDetailsTool(),
    new PriceRangeTool(),
    new WishlistTool(userContext), // Đảm bảo userContext được truyền
  ];

  console.log("Tools initialized successfully");

  // Verify WishlistTool initialization
  const wishlistTool = toolInstances.find(
    (tool) => tool.name === "wishlist_tool"
  );
  console.log(
    "WishlistTool userContext after init:",
    wishlistTool?.userContext?.getUserId()
  );
};

/**
 * Get all tools as instances
 * @returns {Array} Array of tool instances
 */
const getAllTools = () => {
  if (!toolInstances) {
    throw new Error("Tools not initialized. Call initialize() first.");
  }
  return toolInstances;
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
  getToolsInfo,
  ProductSearchTool,
  ProductFilterTool,
  CategoryListTool,
  ProductDetailsTool,
  PriceRangeTool,
  WishlistTool,
  IntentDetector,
};
