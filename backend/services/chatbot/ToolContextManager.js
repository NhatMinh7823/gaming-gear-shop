const { getToolsWithContext } = require("../tools");

class ToolContextManager {
  static async createFreshToolsAndUpdateAgent(agentManager, userContext, log) {
    try {
      log("🔄 Creating fresh tools and updating agent...");

      const freshTools = getToolsWithContext(userContext);

      await agentManager.updateAgentTools(freshTools);

      log("✅ Successfully updated agent with fresh tools");

      const wishlistTool = freshTools.find((tool) => tool.name === "wishlist_tool");
      log(
        "Fresh WishlistTool UserContext verification:",
        wishlistTool?.userContext?.getUserId()
      );
    } catch (error) {
      log("Error creating fresh tools and updating agent:", error);

      log("⚠️  Falling back to legacy tool update method");
      await ToolContextManager.updateToolsUserContextLegacy(userContext, log);
    }
  }

  static async updateToolsUserContextLegacy(userContext, log) {
    try {
      const tools = require("../tools");
      const allTools = tools.getAllTools();

      const wishlistTool = allTools.find((tool) => tool.name === "wishlist_tool");
      if (wishlistTool) {
        wishlistTool.userContext = userContext;
        log(
          "Legacy: Updated WishlistTool userContext with:",
          userContext.getUserId()
        );
      }
    } catch (error) {
      log("Error in legacy tools user context update:", error);
    }
  }
}

module.exports = ToolContextManager;
