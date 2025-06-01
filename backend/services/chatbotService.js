const AgentManager = require("./chatbot/AgentManager");
const ChatHistoryManager = require("./chatbot/ChatHistoryManager");
const VectorStoreManager = require("./chatbot/VectorStoreManager");
const tools = require("./tools");
const Product = require("../models/productModel");

class ChatbotService {
  constructor() {
    this.agentManager = new AgentManager();
    this.chatHistoryManager = new ChatHistoryManager();
    this.vectorStoreManager = VectorStoreManager.getInstance();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing chatbot service...");

      // Initialize managers
      await this.agentManager.initialize();
      await this.vectorStoreManager.initialize();

      // Load products to vector store
      console.log("Loading products to vector store...");
      await this.loadProductsToVectorStore();

      // Initialize tools with dependencies
      console.log("Initializing tools...");
      await tools.initialize(this.vectorStoreManager);

      // Create agent with tools
      console.log("Creating agent...");
      await this.agentManager.createAgent(tools.getAllTools());

      this.isInitialized = true;
      console.log("Chatbot service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize chatbot service:", error);
      throw error;
    }
  }
  async loadProductsToVectorStore() {
    try {
      // Check if database is connected
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState !== 1) {
        console.log("Waiting for database connection...");
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
      console.log(`Loaded ${products.length} products to vector store`);
    } catch (error) {
      console.error("Error loading products to vector store:", error);
      // Don't throw the error - allow the service to continue without products initially
      console.log(
        "Chatbot will initialize without product data and retry later"
      );
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async processMessage(message, sessionId = null) {
    await this.ensureInitialized();

    try {
      console.log(`Processing message for session ${sessionId || "new"}`);

      // Get or create chat history
      const { history, sessionId: actualSessionId } =
        this.chatHistoryManager.getOrCreateChatHistory(sessionId);

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
      console.error("Error processing message with agent:", error);

      try {
        // Fallback to direct LLM call
        console.log("Attempting fallback with direct LLM call");
        const llm = this.agentManager.getLLM();
        const response = await llm.invoke(message);

        const { history, sessionId: actualSessionId } =
          this.chatHistoryManager.getOrCreateChatHistory(sessionId);

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
        console.error("Fallback also failed:", fallbackError);
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
      console.error("Error fetching products data:", error);
      throw error;
    }
  }
}

module.exports = new ChatbotService();
