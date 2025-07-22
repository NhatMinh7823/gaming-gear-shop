const { getToolsWithContext } = require("../tools");

class ToolContextManager {
  // Tool cache to avoid recreating tools unnecessarily
  static toolsCache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  static lastToolsHash = null;
  static async createFreshToolsAndUpdateAgent(agentManager, userContext, log) {
    try {
      const userId = userContext.getUserId();
      
      // Check if we can use cached tools
      const cachedTools = this.getCachedTools(userId);
      if (cachedTools && agentManager.isAgentReady()) {
        log("🚀 Using cached tools (performance optimization)");
        // Just update user context in existing tools
        await this.updateToolsUserContextLegacy(userContext, log);
        return;
      }

      log("🔄 Creating fresh tools and updating agent...");

      const freshTools = getToolsWithContext(userContext);

      // Cache the tools
      this.setCachedTools(userId, freshTools);

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

  // Cache management methods
  static getCachedTools(userId) {
    if (!userId) return null;
    
    const cached = this.toolsCache.get(userId);
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.toolsCache.delete(userId);
      return null;
    }
    
    return cached.tools;
  }

  static setCachedTools(userId, tools) {
    if (!userId) return;
    
    this.toolsCache.set(userId, {
      tools: tools,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries
    this.cleanupExpiredCache();
  }

  static cleanupExpiredCache() {
    const now = Date.now();
    for (const [userId, cached] of this.toolsCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.toolsCache.delete(userId);
      }
    }
  }

  static clearCache(userId = null) {
    if (userId) {
      this.toolsCache.delete(userId);
    } else {
      this.toolsCache.clear();
    }
  }

  // Performance monitoring removed for demo project
}

module.exports = ToolContextManager;
