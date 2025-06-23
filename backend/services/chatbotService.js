const AgentManager = require("./chatbot/AgentManager");
const ChatHistoryManager = require("./chatbot/ChatHistoryManager");
const VectorStoreManager = require("./chatbot/VectorStoreManager");
const UserContext = require("./chatbot/UserContext");
const OrderFlowManager = require("./chatbot/OrderFlowManager");
const OrderIntentDetector = require("./chatbot/OrderIntentDetector");
const WorkflowStateManager = require("./chatbot/WorkflowStateManager");
const tools = require("./tools");
const { getToolsWithContext } = require("./tools");
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
    this.orderFlowManager = null; // Will be initialized with userContext

    // 🆕 WORKFLOW MANAGEMENT COMPONENTS
    this.workflowStateManager = new WorkflowStateManager();

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
  /**
   * Enhanced processMessage with workflow support
   */
  async processMessage(message, sessionId = null, userId = null) {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.log(
        `Processing message for session ${sessionId || "new"}${
          userId ? ` (user: ${userId})` : ""
        }`
      );
      this.log(`Message: "${message}"`);
      this.log(`UserId received:`, userId);

      // Set user context and create fresh tools
      if (userId) {
        this.log(`Setting user context with userId: ${userId}`);
        this.userContext.setUser(userId);

        // Create fresh tools with current UserContext and update agent
        await this.createFreshToolsAndUpdateAgent();
      } else {
        this.log(`No userId provided, clearing user context`);
        this.userContext.clearUser();

        // Create fresh tools with cleared UserContext and update agent
        await this.createFreshToolsAndUpdateAgent();
      }

      // Initialize OrderFlowManager with current userContext
      if (
        !this.orderFlowManager ||
        this.orderFlowManager.userContext !== this.userContext
      ) {
        this.orderFlowManager = new OrderFlowManager(this.userContext);
        this.log("🔄 OrderFlowManager initialized with current userContext");
      }

      // Get or create chat history with user context
      const { history, sessionId: actualSessionId } =
        this.chatHistoryManager.getOrCreateChatHistory(sessionId, userId);

      // 🎯 WORKFLOW DETECTION AND MANAGEMENT
      const workflowIntent = this.detectWorkflowIntent(message);
      const existingWorkflow =
        this.workflowStateManager.getWorkflowState(actualSessionId);

      this.log(`📊 Workflow analysis:`, {
        detectedIntent: workflowIntent,
        hasExistingWorkflow: !!existingWorkflow,
        existingType: existingWorkflow?.type,
      });

      // 🚀 WORKFLOW INITIALIZATION
      if (workflowIntent && !existingWorkflow) {
        // Start new workflow
        const workflow = this.workflowStateManager.initWorkflow(
          actualSessionId,
          workflowIntent,
          {
            originalMessage: message,
            userId: userId,
          }
        );
        this.log(`🎯 Started new ${workflowIntent} workflow`);
      } else if (
        existingWorkflow &&
        this.workflowStateManager.shouldContinueWorkflow(actualSessionId)
      ) {
        // Continue existing workflow
        this.log(
          `🔄 Continuing ${existingWorkflow.type} workflow at step ${existingWorkflow.currentStep}`
        );
      }

      // 🔄 WORKFLOW-FIRST LOGIC: Check if we should use complete workflow instead of OrderFlow
      const shouldUseCompleteWorkflow = this.shouldUseCompleteWorkflow(
        message,
        workflowIntent
      );

      // Check for order flow ONLY if not using complete workflow
      if (this.orderFlowManager && !shouldUseCompleteWorkflow) {
        this.log("🛒 Checking for order flow (no complete workflow needed)...");
        const orderFlowResult = await this.orderFlowManager.handleOrderFlow(
          message,
          actualSessionId
        );

        if (orderFlowResult) {
          this.log("✅ Order flow handled the message");

          // Save to conversation history
          await history.addUserMessage(message);
          await history.addAIMessage(orderFlowResult.message);

          return {
            text: orderFlowResult.message,
            sessionId: actualSessionId,
            orderFlow: orderFlowResult.orderFlow || false,
            ...orderFlowResult,
          };
        }
      } else if (shouldUseCompleteWorkflow) {
        this.log("🎯 Bypassing OrderFlow - using complete workflow instead");
      }

      // Get agent executor from manager
      const agentExecutor = this.agentManager.getAgentExecutor();

      if (!agentExecutor) {
        throw new Error("Agent executor not available");
      }

      // Get previous messages
      const previousMessages = await history.getMessages();

      // 🤖 ENHANCED AGENT PROCESSING with workflow context
      const workflowContext = existingWorkflow
        ? {
            currentWorkflow: existingWorkflow.type,
            currentStep: existingWorkflow.currentStep,
            stepInfo:
              this.workflowStateManager.getCurrentStepInfo(actualSessionId),
            shouldContinue:
              this.workflowStateManager.shouldContinueWorkflow(actualSessionId),
          }
        : {};

      const agentStartTime = Date.now();
      const result = await agentExecutor.invoke({
        input: message,
        chat_history: previousMessages,
        workflow_context: workflowContext, // 🎯 Add workflow context
        session_id: actualSessionId,
      });
      const agentDuration = Date.now() - agentStartTime;

      // Save conversation to history
      await history.addUserMessage(message);
      await history.addAIMessage(result.output);

      // 📈 UPDATE WORKFLOW STATE AND ANALYTICS
      const toolsUsed =
        result.intermediateSteps
          ?.map((step) => step.action?.tool)
          .filter(Boolean) || [];

      // 🔗 TOOL CHAINING VALIDATION AND ENFORCEMENT
      const hasCartTool = toolsUsed.includes("cart_tool");
      const hasOrderTool = toolsUsed.includes("order_tool");
      const isPurchaseWorkflow =
        workflowIntent === "purchase" || existingWorkflow?.type === "purchase";

      // 🎯 CONDITIONAL AUTO-INJECTION LOGIC
      const originalMessage = message; // Store original user message
      const hasOrderKeywordInOriginal =
        /đặt hàng|đặt mua|order|purchase|mua ngay|đặt đơn/i.test(
          originalMessage
        );

      // 🚨 SMART AUTO-INJECTION: Only inject when user originally wanted to order
      // 🛠️ FIXED: Expanded exclusion to include ALL cart operations
      const isCartOnlyRequest =
        /^(xem|kiểm tra|check|show|xóa|xoá|remove|clear|delete|bỏ|lấy ra|loại bỏ)\s*(giỏ hàng|cart|sản phẩm|toàn bộ|khỏi giỏ|ra khỏi)/i.test(
          originalMessage.trim()
        );

      // Additional check for cart operation keywords anywhere in message
      const hasCartOperationKeywords =
        /xóa|xoá|remove|clear|delete|bỏ ra|lấy ra|loại bỏ|xóa khỏi|bỏ khỏi/.test(
          originalMessage.toLowerCase()
        );

      const needsAutoOrderInjection =
        hasOrderKeywordInOriginal && // Original message had "đặt hàng"
        !isCartOnlyRequest && // NOT cart-only operation
        !hasCartOperationKeywords && // NOT contains cart operation keywords        hasCartTool &&                      // cart_tool executed successfully
        !hasOrderTool && // order_tool didn't execute
        isPurchaseWorkflow && // Is purchase workflow
        !(result.output && String(result.output).includes("Error")) && // No errors in cart process
        !(result.output && String(result.output).includes("thất bại")) && // No failures
        userId && // User authenticated
        actualSessionId; // Valid session

      if (needsAutoOrderInjection) {
        this.log(
          `🎯 AUTO-INJECTION TRIGGERED for original message: "${originalMessage}"`
        );
        this.log(
          `📊 Conditions met: orderKeyword=${hasOrderKeywordInOriginal}, cartTool=${hasCartTool}, orderTool=${hasOrderTool}`
        );

        try {
          // 🤖 AUTO-INJECT: Simulate user saying "đặt hàng"
          this.log(`🚀 Auto-injecting "đặt hàng" command...`);

          // Add the auto-injected message to conversation history for context
          await history.addUserMessage("đặt hàng");

          // Execute OrderFlow with the auto-injected command
          const autoOrderResult = await this.orderFlowManager.handleOrderFlow(
            "đặt hàng",
            actualSessionId
          );

          if (autoOrderResult && autoOrderResult.success !== false) {
            this.log(`✅ Auto-injection successful! OrderFlow initiated.`);

            // 🎉 MERGE RESPONSES: Create seamless user experience
            const mergedResponse = `${result.output}

🎉 **Đang tự động khởi tạo đơn hàng theo yêu cầu của bạn...**

${autoOrderResult.message}`;

            // Save the merged response to chat history
            await history.addAIMessage(mergedResponse);

            // Return complete merged response
            return {
              text: mergedResponse,
              sessionId: actualSessionId,

              // 🆕 AUTO-INJECTION METADATA
              autoCompleted: true,
              originalCommand: originalMessage,
              autoInjectedCommand: "đặt hàng",
              autoInjectionSuccess: true,

              // Preserve original workflow data
              intermediateSteps: result.intermediateSteps || [],
              toolsUsed: toolsUsed,
              workflowComplete: true, // Mark as complete due to auto-injection

              // Include OrderFlow data
              orderFlow: autoOrderResult.orderFlow || true,
              ...autoOrderResult,

              // Performance metrics
              executionTime: Date.now() - startTime,
              agentExecutionTime: agentDuration,
              iterationsUsed: result.intermediateSteps?.length || 0,

              // Analytics
              analytics: {
                workflowIntent: workflowIntent,
                hasActiveWorkflow: !!existingWorkflow,
                toolsExecuted: toolsUsed.length,
                autoInjectionTriggered: true,
                workflowProgress: 100, // Complete due to auto-injection
              },
            };
          } else {
            this.logError(`❌ Auto-injection failed: OrderFlow returned error`);
            this.log(`OrderFlow result:`, autoOrderResult);
          }
        } catch (autoInjectionError) {
          this.logError(`❌ Auto-injection error:`, autoInjectionError);
        }
      }

      // 🚨 FALLBACK: Log incomplete workflow (for cases where auto-injection didn't trigger)
      const needsOrderToolContinuation =
        isPurchaseWorkflow &&
        hasCartTool &&
        !hasOrderTool &&
        !needsAutoOrderInjection;

      if (needsOrderToolContinuation) {
        this.log(
          `🚨 WORKFLOW INCOMPLETE: cart_tool executed but missing order_tool`
        );
        this.log(`📊 Tools used: ${toolsUsed.join(", ")}`);
        this.log(
          `🔄 Workflow type: ${workflowIntent || existingWorkflow?.type}`
        );
        this.log(
          `💡 Auto-injection not triggered: original message didn't contain order keywords`
        );

        // Log warning for debugging
        this.logError(
          `WORKFLOW INCOMPLETE: workflow stopped after cart_tool. Original message: "${originalMessage}"`
        );
      }

      // Update workflow state based on result
      if (existingWorkflow || workflowIntent) {
        this.updateWorkflowBasedOnResult(actualSessionId, result, toolsUsed);
      }

      const totalDuration = Date.now() - startTime;

      // 📊 Enhanced response with comprehensive workflow information
      return {
        text:
          result.output ||
          "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.",
        sessionId: actualSessionId,

        // 🎯 Multi-tool workflow information
        intermediateSteps: result.intermediateSteps || [],
        toolsUsed: toolsUsed,
        workflowComplete: this.isWorkflowComplete(result.intermediateSteps),

        // 🆕 WORKFLOW STATE INFO
        workflow:
          this.workflowStateManager.getWorkflowAnalytics(actualSessionId),

        // 📈 Performance metrics
        executionTime: totalDuration,
        agentExecutionTime: agentDuration,
        iterationsUsed: result.intermediateSteps?.length || 0,

        // 🆕 ANALYTICS INFO
        analytics: {
          workflowIntent: workflowIntent,
          hasActiveWorkflow: !!existingWorkflow,
          toolsExecuted: toolsUsed.length,
          workflowProgress: existingWorkflow
            ? Math.round(
                (existingWorkflow.currentStep / existingWorkflow.steps.length) *
                  100
              )
            : null,
        },
      };
    } catch (error) {
      this.logError("Error processing message with agent:", error);

      // Track workflow error if applicable
      const existingWorkflow =
        this.workflowStateManager.getWorkflowState(sessionId);
      if (existingWorkflow) {
        this.workflowStateManager.errorWorkflow(sessionId, error);
      }

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
          executionTime: Date.now() - startTime,
        };
      } catch (fallbackError) {
        this.logError("Fallback also failed:", fallbackError);
        return {
          text: "❌ Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
          sessionId: sessionId || "error",
          executionTime: Date.now() - startTime,
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
   * Create fresh tools with current UserContext and update agent
   * This ensures that each request gets tools with the correct UserContext
   */
  async createFreshToolsAndUpdateAgent() {
    try {
      this.log("🔄 Creating fresh tools and updating agent...");

      // Get fresh tools with current UserContext
      const freshTools = getToolsWithContext(this.userContext);

      // Update agent with fresh tools
      await this.agentManager.updateAgentTools(freshTools);

      this.log("✅ Successfully updated agent with fresh tools");

      // Verify the update worked
      const wishlistTool = freshTools.find(
        (tool) => tool.name === "wishlist_tool"
      );
      this.log(
        "Fresh WishlistTool UserContext verification:",
        wishlistTool?.userContext?.getUserId()
      );
    } catch (error) {
      this.logError("Error creating fresh tools and updating agent:", error);

      // Fallback to old method if new approach fails
      this.log("⚠️  Falling back to legacy tool update method");
      await this.updateToolsUserContextLegacy();
    }
  }

  /**
   * Legacy method - Update all tools with current user context (fallback)
   */
  async updateToolsUserContextLegacy() {
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
          "Legacy: Updated WishlistTool userContext with:",
          this.userContext.getUserId()
        );
      }
    } catch (error) {
      this.logError("Error in legacy tools user context update:", error);
    }
  }

  /**
   * Test wishlist functionality with current user context
   */
  async testWishlistAccess() {
    try {
      // Get the current agent's tools to test the actual tools being used
      const agentExecutor = this.agentManager.getAgentExecutor();

      if (!agentExecutor || !agentExecutor.tools) {
        this.log("No agent executor or tools available for testing");
        return false;
      }

      const wishlistTool = agentExecutor.tools.find(
        (tool) => tool.name === "wishlist_tool"
      );

      if (!wishlistTool) {
        this.log("WishlistTool not found in current agent");
        return false;
      }
      this.log("Testing wishlist access with current agent tools...");
      const result = await wishlistTool._call({ action: "get_wishlist" });
      this.log("Wishlist test result:", result);

      return !(result && String(result).includes("User not authenticated"));
    } catch (error) {
      this.logError("Wishlist test failed:", error);
      return false;
    }
  }

  /**
   * Detect workflow intent from message
   */
  detectWorkflowIntent(message) {
    const lowerMessage = message.toLowerCase();

    // 🎯 ENHANCED PURCHASE INTENT DETECTION
    // Check if message contains product keywords (indicating need for search workflow)
    const hasProductKeywords = this.hasProductKeywords(lowerMessage);

    // Purchase intent patterns with product context
    const purchaseWithProductPatterns = [
      /đặt hàng.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
      /mua.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
      /tôi muốn mua.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
      /cần mua.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
    ];

    // General purchase patterns (for existing cart scenarios)
    const generalPurchasePatterns = [
      /tôi muốn mua/,
      /mua.*tầm.*triệu/,
      /tìm và mua/,
      /mua.*gaming/,
    ];

    // Wishlist purchase patterns
    const wishlistPurchasePatterns = [
      /mua.*wishlist/,
      /đặt hàng.*yêu thích/,
      /mua.*từ.*danh sách/,
    ];

    // Category browse patterns
    const categoryBrowsePatterns = [
      /xem.*danh mục/,
      /loại.*sản phẩm/,
    ];

    // Search patterns (basic intent)
    const searchPatterns = [
      /tìm/,
      /tư vấn/,
      /gợi ý/,
      /recommend/,
      /có gì/,
      /xem.*sản phẩm/,
    ];

    // 🚀 PRIORITY DETECTION: Purchase with product keywords
    if (
      purchaseWithProductPatterns.some((pattern) => pattern.test(lowerMessage))
    ) {
      this.log(`🎯 Detected purchase workflow with product: "${message}"`);
      return "purchase";
    }

    // Check for general purchase patterns with product keywords
    if (
      hasProductKeywords &&
      generalPurchasePatterns.some((pattern) => pattern.test(lowerMessage))
    ) {
      this.log(
        `🎯 Detected purchase workflow with general purchase + product: "${message}"`
      );
      return "purchase";
    }

    // Order keywords with product context should trigger purchase workflow
    if (hasProductKeywords && /đặt hàng|order/.test(lowerMessage)) {
      this.log(
        `🎯 Detected purchase workflow with order + product: "${message}"`
      );
      return "purchase";
    }

    // Check patterns in priority order
    if (
      wishlistPurchasePatterns.some((pattern) => pattern.test(lowerMessage))
    ) {
      return "wishlist_purchase";
    }

    // General purchase patterns (only when no product keywords)
    if (
      !hasProductKeywords &&
      generalPurchasePatterns.some((pattern) => pattern.test(lowerMessage))
    ) {
      return "purchase";
    }

    if (categoryBrowsePatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "category_browse";
    }

    if (searchPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "search";
    }

    return null;
  }

  /**
   * Check if message contains product keywords indicating need for search
   */
  hasProductKeywords(message) {
    const productKeywords = [
      // Gaming peripherals
      "tai nghe",
      "headset",
      "gaming headset",
      "mouse",
      "chuột",
      "gaming mouse",
      "bàn phím",
      "keyboard",
      "gaming keyboard",
      "màn hình",
      "monitor",
      "gaming monitor",

      // Computing devices
      "laptop",
      "gaming laptop",
      "laptop gaming",
      "pc",
      "gaming pc",
      "pc gaming",
      "máy tính",
      "máy tính gaming",

      // Brands
      "logitech",
      "razer",
      "steelseries",
      "corsair",
      "asus",
      "msi",
      "alienware",
      "acer",
      "hp",
      "benq",
      "aoc",
      "samsung",
      "lg",

      // Generic terms
      "gaming",
      "game",
      "chơi game",
      "sản phẩm",
      "device",
      "gear",
    ];

    return productKeywords.some((keyword) => message.includes(keyword));
  }

  /**
   * Enhanced method to check if message should trigger complete workflow vs OrderFlow
   */
  shouldUseCompleteWorkflow(message, workflowIntent) {
    // If workflow intent detected, use complete workflow
    if (workflowIntent) {
      this.log(`🔄 Using complete workflow for intent: ${workflowIntent}`);
      return true;
    }

    // Check for product keywords in order-related messages
    const lowerMessage = message.toLowerCase();
    const hasOrderKeywords = /đặt hàng|order|mua/.test(lowerMessage);
    const hasProductKeywords = this.hasProductKeywords(lowerMessage);

    if (hasOrderKeywords && hasProductKeywords) {
      this.log(
        `🔄 Using complete workflow for order with product keywords: "${message}"`
      );
      return true;
    }

    return false;
  }

  /**
   * Update workflow state based on agent result
   */
  updateWorkflowBasedOnResult(sessionId, result, toolsUsed) {
    const workflow = this.workflowStateManager.getWorkflowState(sessionId);
    if (!workflow) return;

    // Analyze result to determine workflow progress
    const output = result.output?.toLowerCase() || "";
    const intermediateSteps = result.intermediateSteps || [];

    // Determine if workflow should advance
    let shouldAdvance = false;
    let stepData = {
      toolsUsed,
      timestamp: Date.now(),
      output: result.output,
    };

    // Logic for different workflow types
    switch (workflow.type) {
      case "purchase":
        if (
          workflow.currentStep === 0 &&
          toolsUsed.includes("product_search")
        ) {
          shouldAdvance = true;
          stepData.searchCompleted = true;
        } else if (
          workflow.currentStep === 2 &&
          toolsUsed.includes("cart_tool")
        ) {
          shouldAdvance = true;
          stepData.addedToCart = true;
        } else if (
          workflow.currentStep === 4 &&
          toolsUsed.includes("order_tool")
        ) {
          shouldAdvance = true;
          stepData.orderInitiated = true;
        }
        break;

      case "search":
        if (
          workflow.currentStep === 0 &&
          toolsUsed.includes("product_search")
        ) {
          shouldAdvance = true;
          stepData.searchCompleted = true;
        } else if (workflow.currentStep === 1) {
          shouldAdvance = true;
          stepData.resultsDisplayed = true;
        }
        break;

      case "wishlist_purchase":
        if (workflow.currentStep === 0 && toolsUsed.includes("wishlist_tool")) {
          shouldAdvance = true;
          stepData.wishlistRetrieved = true;
        } else if (
          workflow.currentStep === 2 &&
          toolsUsed.includes("cart_tool")
        ) {
          shouldAdvance = true;
          stepData.addedToCart = true;
        } else if (
          workflow.currentStep === 3 &&
          toolsUsed.includes("order_tool")
        ) {
          shouldAdvance = true;
          stepData.orderInitiated = true;
        }
        break;

      case "category_browse":
        if (
          workflow.currentStep === 0 &&
          toolsUsed.includes("category_list_tool")
        ) {
          shouldAdvance = true;
          stepData.categoriesListed = true;
        } else if (
          workflow.currentStep === 1 &&
          toolsUsed.includes("ai_product_search")
        ) {
          shouldAdvance = true;
          stepData.productsSearched = true;
        } else if (
          workflow.currentStep === 2 &&
          toolsUsed.includes("cart_tool")
        ) {
          shouldAdvance = true;
          stepData.addedToCart = true;
        } else if (
          workflow.currentStep === 3 &&
          toolsUsed.includes("order_tool")
        ) {
          shouldAdvance = true;
          stepData.orderInitiated = true;
        }
        break;
    }

    // Advance workflow if criteria met
    if (shouldAdvance) {
      this.workflowStateManager.advanceWorkflow(sessionId, stepData);
    }

    // Check for completion
    if (!this.workflowStateManager.shouldContinueWorkflow(sessionId)) {
      const completedWorkflow = this.workflowStateManager.completeWorkflow(
        sessionId,
        {
          finalOutput: result.output,
          toolsUsed: toolsUsed,
          totalSteps: workflow.currentStep,
        }
      );

    }

    // Handle user cancellation patterns
    if (
      output.includes("không") &&
      (output.includes("mua") || output.includes("đặt hàng"))
    ) {
      const cancelledWorkflow = this.workflowStateManager.cancelWorkflow(
        sessionId,
        "user_declined"
      );
    }
  }

  /**
   * Check if workflow is complete based on intermediate steps
   */
  isWorkflowComplete(intermediateSteps) {
    if (!intermediateSteps || intermediateSteps.length === 0) {
      return false;
    }

    const toolsUsed = intermediateSteps
      .map((step) => step.action?.tool)
      .filter(Boolean);

    // Define common workflow patterns
    const purchaseWorkflow = ["product_search", "cart_tool", "order_tool"];
    const searchAndCartWorkflow = ["product_search", "cart_tool"];
    const wishlistPurchaseWorkflow = [
      "wishlist_tool",
      "cart_tool",
      "order_tool",
    ];
    const categoryBrowseWorkflow = ["category_list_tool", "cart_tool"];

    // Check if any complete workflow pattern is matched
    const hasPurchaseWorkflow = purchaseWorkflow.every((tool) =>
      toolsUsed.includes(tool)
    );
    const hasSearchAndCart = searchAndCartWorkflow.every((tool) =>
      toolsUsed.includes(tool)
    );
    const hasWishlistPurchase = wishlistPurchaseWorkflow.every((tool) =>
      toolsUsed.includes(tool)
    );
    const hasCategoryBrowse = categoryBrowseWorkflow.every((tool) =>
      toolsUsed.includes(tool)
    );

    return (
      hasPurchaseWorkflow ||
      hasWishlistPurchase ||
      hasSearchAndCart ||
      hasCategoryBrowse
    );
  }

  /**
   * Get workflow analytics dashboard data
   */
  getWorkflowDashboard() {
    return {
      activeWorkflows: this.workflowStateManager.getActiveWorkflows(),
      workflowsSummary: this.workflowStateManager.getWorkflowsSummary(),
      timestamp: Date.now(),
    };
  }

  /**
   * Get workflow state for specific session
   */
  getSessionWorkflow(sessionId) {
    return this.workflowStateManager.getWorkflowAnalytics(sessionId);
  }

  /**
   * Reset workflow analytics (for testing/debugging)
   */
  resetWorkflowAnalytics() {
    this.workflowStateManager.clearAllWorkflows();
    this.log("📊 Workflow analytics reset completed");
  }
}

module.exports = new ChatbotService();
