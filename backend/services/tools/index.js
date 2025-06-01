// Export all tools from this module
const ProductSearchTool = require("./ProductSearchTool");
const ProductFilterTool = require("./ProductFilterTool");
const CategoryListTool = require("./CategoryListTool");
const ProductDetailsTool = require("./ProductDetailsTool");
const PriceRangeTool = require("./PriceRangeTool");

// Tools instances
let toolInstances = null;

/**
 * Initialize tools with dependencies
 * @param {VectorStoreManager} vectorStoreManager
 */
const initialize = async (vectorStoreManager) => {
  console.log("Initializing tools with dependencies...");
  toolInstances = [
    new ProductSearchTool(),
    new ProductFilterTool(),
    new CategoryListTool(),
    new ProductDetailsTool(),
    new PriceRangeTool(),
  ];
  console.log("Tools initialized successfully");
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
};
