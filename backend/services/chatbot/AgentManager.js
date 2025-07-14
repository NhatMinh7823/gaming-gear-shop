const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const {
  createStructuredChatAgent,
  AgentExecutor,
} = require("langchain/agents");
const { pull } = require("langchain/hub");
const {
  llmConfig,
  agentConfig,
} = require("../config/llmConfig");

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
      this.isInitialized = true;
      this.log("Agent manager initialized successfully");
    } catch (error) {
      this.logError("Error initializing agent manager:", error);
      throw error;
    }
  }

  async createAgent(tools = null) {
    try {
      this.log("Creating structured agent...");

      if (!tools || !Array.isArray(tools) || tools.length === 0) {
        throw new Error("Valid tools array is required");
      }

      // Validate tools
      for (const tool of tools) {
        if (!tool.name || !tool.description) {
          throw new Error(`Invalid tool detected: ${JSON.stringify(tool)}`);
        }
      }

      this.agent = await createStructuredChatAgent({
        llm: this.llm,
        tools: tools,
        prompt: await pull("hwchase17/structured-chat-agent"),
      });

      this.agentExecutor = new AgentExecutor({
        agent: this.agent,
        tools: tools,
        verbose: agentConfig.verbose,
        maxIterations: agentConfig.maxIterations,
        earlyStoppingMethod: agentConfig.earlyStoppingMethod,
        returnIntermediateSteps: agentConfig.returnIntermediateSteps,
        maxExecutionTime: agentConfig.maxExecutionTime,
        handleParsingErrors: agentConfig.handleParsingErrors,
      });

      this.log("Agent created successfully");
    } catch (error) {
      this.logError("Error creating agent:", error.message);
      throw new Error(`Failed to create agent: ${error.message}`);
    }
  }

  /**
   * Update agent with fresh tools (for dynamic user context)
   */
  async updateAgentTools(freshTools) {
    try {
      this.log("Updating agent with fresh tools...");

      if (!Array.isArray(freshTools) || freshTools.length === 0) {
        throw new Error("Fresh tools array is required");
      }

      // Validate tools
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
        returnIntermediateSteps: agentConfig.returnIntermediateSteps,
        maxExecutionTime: agentConfig.maxExecutionTime,
        handleParsingErrors: agentConfig.handleParsingErrors,
      });

      this.log("Agent updated successfully");
    } catch (error) {
      this.logError("Error updating agent tools:", error.message);
      throw new Error(`Failed to update agent tools: ${error.message}`);
    }
  }

  /**
   * Execute agent with input - main interaction point
   * Accepts input and options (e.g. callbacks)
   */
  async executeAgent(input, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.agentExecutor) {
      throw new Error("Agent executor not initialized");
    }

    // Pass options (such as callbacks) to agentExecutor.invoke if provided
    return await this.agentExecutor.invoke(input, options);
  }

  /**
   * Fallback handler for when agent fails
   */
  async handleFallback(message, history, sessionId) {
    try {
      this.log("Using fallback LLM...");
      const response = await this.llm.invoke(message);
      await history.addUserMessage(message);
      await history.addAIMessage(response.content);

      return {
        text: response.content || "Xin lỗi, tôi đang gặp vấn đề khi xử lý tin nhắn của bạn.",
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

  // Utility methods
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
