const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const {
  createStructuredChatAgent,
  AgentExecutor,
} = require("langchain/agents");
const { pull } = require("langchain/hub");
const { llmConfig, agentConfig } = require("../config/llmConfig");
const { getAllTools, getToolsInfo } = require("../tools");

// Configure LangChain logging
const LANGCHAIN_VERBOSE = process.env.LANGCHAIN_VERBOSE === "true";

class AgentManager {
  constructor() {
    this.llm = null;
    this.agent = null;
    this.agentExecutor = null;
    this.isInitialized = false;
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[AgentManager] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[AgentManager ERROR] ${message}`, ...args);
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.log("Initializing LLM...");
      this.llm = new ChatGoogleGenerativeAI(llmConfig);

      // Don't create agent here - it will be created when tools are available
      this.log("LLM initialized, waiting for tools to create agent...");

      this.isInitialized = true;
      this.log("Agent manager initialized successfully");
    } catch (error) {
      this.logError("Error initializing agent manager:", error);

      // Fallback initialization
      try {
        if (!this.llm) {
          this.llm = new ChatGoogleGenerativeAI(llmConfig);
          this.log("Fallback LLM initialized successfully");
        }
      } catch (fallbackError) {
        this.logError("Failed to initialize fallback LLM:", fallbackError);
      }

      throw error;
    }
  }
  async createAgent(tools = null) {
    try {
      this.log("Creating structured agent...");

      // If no tools provided, this means we're not ready yet
      if (!tools) {
        throw new Error("Tools not initialized. Call initialize() first.");
      }

      const agentTools = tools;
      const toolsInfo = getToolsInfo();

      if (!Array.isArray(agentTools) || agentTools.length === 0) {
        throw new Error("Tools array is undefined or empty.");
      }

      // Validate each tool
      for (const tool of agentTools) {
        if (!tool.name || !tool.description) {
          throw new Error(`Invalid tool detected: ${JSON.stringify(tool)}`);
        }
      }

      // Log tools information
      // this.log("Tool names:", toolsInfo.names);
      // this.log(
      //   "Formatted tools:",
      //   JSON.stringify(toolsInfo.descriptions, null, 2)
      // );

      this.agent = await createStructuredChatAgent({
        llm: this.llm,
        tools: agentTools,
        prompt: await pull("hwchase17/structured-chat-agent"),
      });

      this.agentExecutor = new AgentExecutor({
        agent: this.agent,
        tools: agentTools,
        verbose: agentConfig.verbose,
        maxIterations: agentConfig.maxIterations,
        earlyStoppingMethod: agentConfig.earlyStoppingMethod,
      });

      this.log("Structured agent created successfully");
    } catch (error) {
      this.logError("Error creating agent:", error.message);
      this.logError("Stack trace:", error.stack);
      throw new Error(`Failed to create agent: ${error.message}`);
    }
  }

  /**
   * Update agent with fresh tools (for dynamic user context)
   * @param {Array} freshTools - Fresh tools with updated UserContext
   */
  async updateAgentTools(freshTools) {
    try {
      this.log("🔄 Updating agent with fresh tools...");

      if (!Array.isArray(freshTools) || freshTools.length === 0) {
        throw new Error("Fresh tools array is undefined or empty.");
      }

      // Validate each tool
      for (const tool of freshTools) {
        if (!tool.name || !tool.description) {
          throw new Error(`Invalid fresh tool detected: ${JSON.stringify(tool)}`);
        }
      }

      // Create new agent with fresh tools
      this.agent = await createStructuredChatAgent({
        llm: this.llm,
        tools: freshTools,
        prompt: await pull("hwchase17/structured-chat-agent"),
      });

      this.agentExecutor = new AgentExecutor({
        agent: this.agent,
        tools: freshTools,
        verbose: agentConfig.verbose,
        maxIterations: agentConfig.maxIterations,
        earlyStoppingMethod: agentConfig.earlyStoppingMethod,
      });

      // Verify WishlistTool was updated
      const wishlistTool = freshTools.find(tool => tool.name === "wishlist_tool");
      this.log("✅ Agent updated with fresh WishlistTool UserContext:", wishlistTool?.userContext?.getUserId());

    } catch (error) {
      this.logError("Error updating agent tools:", error.message);
      throw new Error(`Failed to update agent tools: ${error.message}`);
    }
  }

  async executeAgent(input) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.agentExecutor) {
      throw new Error("Agent executor not initialized");
    }

    return await this.agentExecutor.invoke(input);
  }

  async handleFallback(message, history, sessionId) {
    try {
      this.log("Using fallback LLM...");
      const response = await this.llm.invoke(message);
      await history.addUserMessage(message);
      await history.addAIMessage(response.content);

      return {
        text:
          response.content ||
          "Xin lỗi, tôi đang gặp vấn đề khi xử lý tin nhắn của bạn.",
        sessionId: sessionId,
        fallback: true,
      };
    } catch (fallbackError) {
      this.logError("Fallback failed:", fallbackError);
      return {
        text: "❌ Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
        sessionId: sessionId,
      };
    }
  }

  isAgentReady() {
    return this.isInitialized && this.agentExecutor !== null;
  }
  getLLM() {
    return this.llm;
  }

  getAgentExecutor() {
    return this.agentExecutor;
  }
}

module.exports = AgentManager;
