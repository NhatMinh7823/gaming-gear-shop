const AgentManager = require("./chatbot/AgentManager");
const ChatHistoryManager = require("./chatbot/ChatHistoryManager");
const VectorStoreManager = require("./chatbot/VectorStoreManager");
const UserContext = require("./chatbot/UserContext");
const WorkflowStateManager = require("./chatbot/WorkflowStateManager");
const WorkflowUpdater = require("./chatbot/WorkflowUpdater");
const WorkflowIntentDetector = require("./chatbot/WorkflowIntentDetector");
const SimpleActionDetector = require("./chatbot/SimpleActionDetector");
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
    this.lastUserId = null; // Track last user to avoid unnecessary tool updates
  }



  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[ChatbotService] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[ChatbotService] ${message}`, ...args);
  }

  cleanTaskCompletionMarkers(text) {
    if (!text) return text;
    // Remove task completion markers that are meant for the agent
    return text.replace(/\n\n\[(TASK_COMPLETED|ACTION_SUCCESS).*?\]/g, '');
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

      // Optimize tool updates - only update if user changed or agent not ready
      const userChanged = this.lastUserId !== userId;
      const needsToolUpdate = userChanged || !this.agentManager.isAgentReady();

      if (userId) {
        this.userContext.setUser(userId);
        
        if (needsToolUpdate) {
          await ToolContextManager.createFreshToolsAndUpdateAgent(
            this.agentManager,
            this.userContext,
            this.log.bind(this)
          );
          this.lastUserId = userId;
        } else {
          this.log(`🚀 Same user (${userId}), skipping tool update (performance optimization)`);
        }
      } else {
        this.log(`No userId provided, clearing user context`);
        this.userContext.clearUser();
        if (needsToolUpdate) {
          await ToolContextManager.createFreshToolsAndUpdateAgent(
            this.agentManager,
            this.userContext,
            this.log.bind(this)
          );
          this.lastUserId = null;
        } else {
          this.log(`🚀 No user context change, skipping tool update`);
        }
      }

      const { history, sessionId: actualSessionId } =
        this.chatHistoryManager.getOrCreateChatHistory(sessionId, userId);

      // Check for simple actions that can bypass AI processing
      const simpleAction = SimpleActionDetector.detectSimpleAction(message);
      if (simpleAction && userId) {
        this.log(`🚀 Simple action detected: ${simpleAction.actionName}, bypassing AI processing`);
        
        try {
          const result = await this.executeSimpleAction(simpleAction, userId, actualSessionId, history);
          if (result) {
            const totalDuration = Date.now() - startTime;
            return {
              text: result.output || result,
              sessionId: actualSessionId,
              simpleAction: true,
              actionName: simpleAction.actionName,
              executionTime: totalDuration,
              bypassedAI: true
            };
          }
        } catch (error) {
          this.log(`Simple action failed, falling back to AI: ${error.message}`);
          // Continue with normal AI processing
        }
      }

      // Continue with normal AI processing
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
      const result = await this.agentManager.executeAgent(
        {
          input: message,
          chat_history: previousMessages,
          workflow_context: workflowContext,
          session_id: actualSessionId,
        }
      );
      const agentDuration = Date.now() - agentStartTime;

      await history.addUserMessage(message);
      await history.addAIMessage(result.output);

      const toolsUsed = [];

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

      // Clean up task completion markers from response
      const cleanedOutput = this.cleanTaskCompletionMarkers(result.output);

      return {
        text:
          cleanedOutput ||
          "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.",
        sessionId: actualSessionId,

        toolsUsed: toolsUsed,
        workflowComplete: workflowComplete,
        workflow: workflowAnalytics,
        executionTime: totalDuration,
        agentExecutionTime: agentDuration,
        iterationsUsed: 0,
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

  /**
   * Execute simple actions without AI processing
   */
  async executeSimpleAction(simpleAction, userId, sessionId, history) {
    try {
      this.log(`Executing simple action: ${simpleAction.tool}.${simpleAction.action}`);
      
      // Get tools with proper user context
      this.userContext.setUser(userId);
      const toolsWithContext = tools.getToolsWithContext(this.userContext);
      const tool = toolsWithContext.find(t => t.name === simpleAction.tool);
      
      if (!tool) {
        throw new Error(`Tool ${simpleAction.tool} not found`);
      }

      // Execute the tool directly
      const result = await tool._call({ query: simpleAction.originalMessage });
      
      // Add to chat history
      await history.addUserMessage(simpleAction.originalMessage);
      await history.addAIMessage(result);
      
      return result;
    } catch (error) {
      this.logError(`Error executing simple action:`, error);
      throw error;
    }
  }

  // Performance monitoring removed for demo project
}

module.exports = new ChatbotService();
