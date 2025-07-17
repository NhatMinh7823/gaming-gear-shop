const SocketIOCallbackHandler = require("./chatbot/SocketIOCallbackHandler");
const AgentManager = require("./chatbot/AgentManager");
const ChatHistoryManager = require("./chatbot/ChatHistoryManager");
const VectorStoreManager = require("./chatbot/VectorStoreManager");
const UserContext = require("./chatbot/UserContext");
const WorkflowStateManager = require("./chatbot/WorkflowStateManager");
const WorkflowUpdater = require("./chatbot/WorkflowUpdater");
const WorkflowIntentDetector = require("./chatbot/WorkflowIntentDetector");
const tools = require("./tools");
const ToolContextManager = require("./chatbot/ToolContextManager");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const Category = require("../models/categoryModel");

const LANGCHAIN_VERBOSE = process.env.LANGCHAIN_VERBOSE === "true";
const CHATBOT_DEBUG = process.env.CHATBOT_DEBUG === "true";

if (!LANGCHAIN_VERBOSE) {
  process.env.LANGCHAIN_TRACING_V2 = "false";
  process.env.LANGCHAIN_VERBOSE = "false";
}

class ChatbotService {
  constructor() {
    this.agentManager = new AgentManager();
    this.chatHistoryManager = new ChatHistoryManager();
    this.vectorStoreManager = VectorStoreManager.getInstance();
    this.userContext = new UserContext();
    this.workflowStateManager = new WorkflowStateManager();
    this.isInitialized = false;
    this.debugMode = CHATBOT_DEBUG;
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
    this.log("Socket.IO instance has been set.");
  }

  createSocketCallbackHandler(sessionId) {
    return new SocketIOCallbackHandler(this.io, sessionId, this.log.bind(this));
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
      await this.agentManager.initialize();
      await this.vectorStoreManager.initialize();

      this.log("Loading products to vector store...");
      await this.loadProductsToVectorStore();

      this.log("Initializing tools...");
if (!tools.isInitialized) {
  await tools.initialize(this.vectorStoreManager, this.userContext);
}
await ToolContextManager.createFreshToolsAndUpdateAgent(
  this.agentManager,
  this.userContext,
  this.log.bind(this)
);

      this.isInitialized = true;
      console.log("✅ Chatbot service initialized successfully");
    } catch (error) {
      this.logError("Failed to initialize chatbot service:", error);
      throw error;
    }
  }

  async loadProductsToVectorStore() {
    try {
      const products = await Product.find().populate("category", "name");
      await this.vectorStoreManager.loadProducts(products);
      this.log(`Loaded ${products.length} products to vector store`);
    } catch (error) {
      this.logError("Error loading products to vector store:", error);
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
    const startTime = Date.now();

    try {
      this.log(`Message: "${message}"`);

      if (userId) {
        this.userContext.setUser(userId);
        await ToolContextManager.createFreshToolsAndUpdateAgent(
          this.agentManager,
          this.userContext,
          this.log.bind(this)
        );
      } else {
        this.log(`No userId provided, clearing user context`);
        this.userContext.clearUser();
        await ToolContextManager.createFreshToolsAndUpdateAgent(
          this.agentManager,
          this.userContext,
          this.log.bind(this)
        );
      }

      const { history, sessionId: actualSessionId } =
        this.chatHistoryManager.getOrCreateChatHistory(sessionId, userId);

      const workflowIntent = WorkflowIntentDetector.detectWorkflowIntent(
        message
      );
      let workflow =
        this.workflowStateManager.getWorkflowState(actualSessionId);

      if (workflowIntent && !workflow) {
        workflow = this.workflowStateManager.initWorkflow(
          actualSessionId,
          workflowIntent,
          {
            originalMessage: message,
            userId: userId,
          }
        );
        this.log(`🎯 Started new ${workflowIntent} workflow`);
      } else if (
        workflow &&
        this.workflowStateManager.shouldContinueWorkflow(actualSessionId)
      ) {
        this.log(
          `🔄 Continuing ${workflow.type} workflow at step ${workflow.currentStep}`
        );
      }

      const agentExecutor = this.agentManager.getAgentExecutor();
      if (!agentExecutor) {
        throw new Error("Agent executor not available");
      }
      const previousMessages = await history.getMessages();

      if (this.io) {
        this.io.to(actualSessionId).emit("processing:start", {
          message: message,
          timestamp: new Date().toISOString(),
        });
      }

      const workflowContext = workflow
        ? {
            currentWorkflow: workflow.type,
            currentStep: workflow.currentStep,
            stepInfo:
              this.workflowStateManager.getCurrentStepInfo(actualSessionId),
            shouldContinue:
              this.workflowStateManager.shouldContinueWorkflow(actualSessionId),
          }
        : {};

      const agentStartTime = Date.now();
      const callbackHandler = this.createSocketCallbackHandler(actualSessionId);
      const result = await this.agentManager.executeAgent(
        {
          input: message,
          chat_history: previousMessages,
          workflow_context: workflowContext,
          session_id: actualSessionId,
        },
        {
          callbacks: [callbackHandler],
        }
      );
      const agentDuration = Date.now() - agentStartTime;

      await history.addUserMessage(message);
      await history.addAIMessage(result.output);

      const toolsUsed =
        result.intermediateSteps
          ?.map((step) => step.action?.tool)
          .filter(Boolean) || [];

      if (workflow || workflowIntent) {
        WorkflowUpdater.updateWorkflowBasedOnResult(
          actualSessionId,
          result,
          toolsUsed,
          this.workflowStateManager
        );
        workflow = this.workflowStateManager.getWorkflowState(actualSessionId);
      }

      const workflowAnalytics =
        this.workflowStateManager.getWorkflowAnalytics(actualSessionId);
      const workflowComplete = workflowAnalytics
        ? workflowAnalytics.status === "completed"
        : false;
      const workflowProgress = workflowAnalytics
        ? workflowAnalytics.progress
        : null;

      const totalDuration = Date.now() - startTime;

      return {
        text:
          result.output ||
          "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.",
        sessionId: actualSessionId,
        intermediateSteps: result.intermediateSteps || [],
        toolsUsed: toolsUsed,
        workflowComplete: workflowComplete,
        workflow: workflowAnalytics,
        executionTime: totalDuration,
        agentExecutionTime: agentDuration,
        iterationsUsed: result.intermediateSteps?.length || 0,
        analytics: {
          workflowIntent: workflowIntent,
          hasActiveWorkflow: !!workflow,
          toolsExecuted: toolsUsed.length,
          workflowProgress: workflowProgress,
        },
      };
    } catch (error) {
      this.logError("Error processing message with agent:", error);
      const workflow = this.workflowStateManager.getWorkflowState(sessionId);
      if (workflow) {
        this.workflowStateManager.errorWorkflow(sessionId, error);
      }
      try {
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
}

module.exports = new ChatbotService();
