const AgentManager = require("./chatbot/AgentManager");
const ChatHistoryManager = require("./chatbot/ChatHistoryManager");
const VectorStoreManager = require("./chatbot/VectorStoreManager");
const UserContext = require("./chatbot/UserContext");
const tools = require("./tools");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const Category = require("../models/categoryModel");

// Configure LangChain logging based on environment
const LANGCHAIN_VERBOSE = process.env.LANGCHAIN_VERBOSE === "true";
const CHATBOT_DEBUG = process.env.CHATBOT_DEBUG === "true";

// Set LangChain logging levels
if (!LANGCHAIN_VERBOSE) {
  // Disable verbose LangChain logging for cleaner output
  process.env.LANGCHAIN_TRACING_V2 = "false";
  process.env.LANGCHAIN_VERBOSE = "false";
}

class ChatbotService {
  constructor() {
    this.agentManager = new AgentManager();
    this.chatHistoryManager = new ChatHistoryManager();
    this.vectorStoreManager = VectorStoreManager.getInstance();
    this.userContext = new UserContext();
    this.isInitialized = false;
    this.debugMode = CHATBOT_DEBUG;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[ChatbotService] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[ChatbotService ERROR] ${message}`, ...args);
  }
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.log("Initializing chatbot service...");

      // Initialize managers
      await this.agentManager.initialize();
      await this.vectorStoreManager.initialize();

      // Load products to vector store
      this.log("Loading products to vector store...");
      await this.loadProductsToVectorStore(); // Initialize tools with dependencies
      this.log("Initializing tools...");
      await tools.initialize(this.vectorStoreManager, this.userContext);

      // Create agent with tools
      this.log("Creating agent...");
      await this.agentManager.createAgent(tools.getAllTools());

      this.isInitialized = true;
      console.log("✅ Chatbot service initialized successfully");
    } catch (error) {
      this.logError("Failed to initialize chatbot service:", error);
      throw error;
    }
  }
  async loadProductsToVectorStore() {
    try {
      // Check if database is connected
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState !== 1) {
        this.log("Waiting for database connection...");
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Database connection timeout"));
          }, 30000); // 30 second timeout

          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout);
            resolve();
          } else {
            mongoose.connection.on("connected", () => {
              clearTimeout(timeout);
              resolve();
            });
            mongoose.connection.on("error", (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          }
        });
      }

      const products = await Product.find().populate("category", "name");
      await this.vectorStoreManager.loadProducts(products);
      this.log(`Loaded ${products.length} products to vector store`);
    } catch (error) {
      this.logError("Error loading products to vector store:", error);
      // Don't throw the error - allow the service to continue without products initially
      this.log("Chatbot will initialize without product data and retry later");
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  async processMessage(message, sessionId = null, userId = null) {
    await this.ensureInitialized();

    try {
      this.log(
        `Processing message for session ${sessionId || "new"}${
          userId ? ` (user: ${userId})` : ""
        }`
      );
      this.log(`Message: "${message}"`);
      this.log(`UserId received:`, userId);

      // Set user context for tools
      if (userId) {
        this.log(`Setting user context with userId: ${userId}`);
        this.userContext.setUser(userId);

        // Update all tools with new user context
        await this.updateToolsUserContext();
      } else {
        this.log(`No userId provided, clearing user context`);
        this.userContext.clearUser();

        // Update all tools to clear user context
        await this.updateToolsUserContext();
      }

      // Verify user context was set
      const currentUserId = this.userContext.getUserId();
      this.log(`UserContext current userId after setting:`, currentUserId); // Debug user context thoroughly
      this.debugUserContext();

      // Test wishlist access if user is authenticated
      if (userId) {
        const canAccessWishlist = await this.testWishlistAccess();
        this.log("Can access wishlist:", canAccessWishlist);
      }

      // Get or create chat history with user context
      const { history, sessionId: actualSessionId } =
        this.chatHistoryManager.getOrCreateChatHistory(sessionId, userId);

      // Get agent executor from manager
      const agentExecutor = this.agentManager.getAgentExecutor();

      if (!agentExecutor) {
        throw new Error("Agent executor not available");
      }

      // Get previous messages
      const previousMessages = await history.getMessages();

      // Process message with agent
      const result = await agentExecutor.invoke({
        input: message,
        chat_history: previousMessages,
      });

      // Save conversation to history
      await history.addUserMessage(message);
      await history.addAIMessage(result.output);

      return {
        text:
          result.output ||
          "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.",
        sessionId: actualSessionId,
      };
    } catch (error) {
      this.logError("Error processing message with agent:", error);

      try {
        // Fallback to direct LLM call
        this.log("Attempting fallback with direct LLM call");
        const llm = this.agentManager.getLLM();
        const response = await llm.invoke(message);
        const { history, sessionId: actualSessionId } =
          this.chatHistoryManager.getOrCreateChatHistory(sessionId, userId);

        await history.addUserMessage(message);
        await history.addAIMessage(response.content);

        return {
          text:
            response.content ||
            "Xin lỗi, tôi đang gặp vấn đề khi xử lý tin nhắn của bạn.",
          sessionId: actualSessionId,
          fallback: true,
        };
      } catch (fallbackError) {
        this.logError("Fallback also failed:", fallbackError);
        return {
          text: "❌ Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
          sessionId: sessionId || "error",
        };
      }
    }
  }
  async getProductsData() {
    try {
      const products = await Product.find()
        .populate("category", "name")
        .select(
          "name description price discountPrice brand stock specifications features averageRating numReviews isFeatured isNewArrival images"
        )
        .limit(70);

      return products.map((product) => ({
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        discountPrice: product.discountPrice,
        brand: product.brand,
        category: product.category?.name,
        inStock: product.stock > 0,
        specifications: product.specifications,
        features: product.features,
        averageRating: product.averageRating,
        numReviews: product.numReviews,
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        imageUrl: product.images?.[0]?.url,
      }));
    } catch (error) {
      this.logError("Error fetching products data:", error);
      throw error;
    }
  }
  debugUserContext() {
    if (!this.debugMode) return;

    console.log("=== UserContext Debug ===");
    console.log("UserContext exists:", !!this.userContext);
    console.log("Current userId:", this.userContext?.getUserId());
    console.log("Is authenticated:", this.userContext?.isAuthenticated());

    const tools = require("./tools");
    try {
      const allTools = tools.getAllTools();
      const wishlistTool = allTools.find(
        (tool) => tool.name === "wishlist_tool"
      );
      console.log("WishlistTool exists:", !!wishlistTool);
      console.log(
        "WishlistTool userContext:",
        wishlistTool?.userContext?.getUserId()
      );
    } catch (error) {
      console.log("Error getting tools:", error.message);
    }
    console.log("========================");
  }
  /**
   * Update all tools with current user context
   */
  async updateToolsUserContext() {
    try {
      const tools = require("./tools");
      const allTools = tools.getAllTools();

      // Find WishlistTool and update its userContext
      const wishlistTool = allTools.find(
        (tool) => tool.name === "wishlist_tool"
      );
      if (wishlistTool) {
        wishlistTool.userContext = this.userContext;
        this.log(
          "Updated WishlistTool userContext with:",
          this.userContext.getUserId()
        );
      }
    } catch (error) {
      this.logError("Error updating tools user context:", error);
    }
  }
  /**
   * Test wishlist functionality with current user context
   */
  async testWishlistAccess() {
    try {
      const tools = require("./tools");
      const allTools = tools.getAllTools();
      const wishlistTool = allTools.find(
        (tool) => tool.name === "wishlist_tool"
      );

      if (!wishlistTool) {
        this.log("WishlistTool not found");
        return false;
      }

      this.log("Testing wishlist access...");
      const result = await wishlistTool._call({ action: "get_wishlist" });
      this.log("Wishlist test result:", result);

      return !result.includes("User not authenticated");
    } catch (error) {
      this.logError("Wishlist test failed:", error);
      return false;
    }
  }
}

module.exports = new ChatbotService();
