const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const {
  createStructuredChatAgent,
  AgentExecutor,
} = require("langchain/agents");
const { pull } = require("langchain/hub");
const { llmConfig, agentConfig } = require("../config/llmConfig");
const { getAllTools, getToolsInfo } = require("../tools");

class AgentManager {
  constructor() {
    this.llm = null;
    this.agent = null;
    this.agentExecutor = null;
    this.isInitialized = false;
  }
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing LLM...");
      this.llm = new ChatGoogleGenerativeAI(llmConfig);

      // Don't create agent here - it will be created when tools are available
      console.log("LLM initialized, waiting for tools to create agent...");

      this.isInitialized = true;
      console.log("Agent manager initialized successfully");
    } catch (error) {
      console.error("Error initializing agent manager:", error);

      // Fallback initialization
      try {
        if (!this.llm) {
          this.llm = new ChatGoogleGenerativeAI(llmConfig);
          console.log("Fallback LLM initialized successfully");
        }
      } catch (fallbackError) {
        console.error("Failed to initialize fallback LLM:", fallbackError);
      }

      throw error;
    }
  }
  async createAgent(tools = null) {
    try {
      console.log("Creating structured agent...");

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
      console.log("Tool names:", toolsInfo.names);
      console.log(
        "Formatted tools:",
        JSON.stringify(toolsInfo.descriptions, null, 2)
      );

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

      console.log("Structured agent created successfully");
    } catch (error) {
      console.error("Error creating agent:", error.message);
      console.error("Stack trace:", error.stack);
      throw new Error(`Failed to create agent: ${error.message}`);
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
      console.log("Using fallback LLM...");
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
      console.error("Fallback failed:", fallbackError);
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
