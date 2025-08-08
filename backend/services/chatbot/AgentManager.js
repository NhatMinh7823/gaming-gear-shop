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
    this.currentToolsHash = null; // Track current tools to avoid unnecessary updates
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

      // Create custom prompt that understands task completion markers
      const customPrompt = await this.createCustomPrompt();
      
      this.agent = await createStructuredChatAgent({
        llm: this.llm,
        tools: tools,
        prompt: customPrompt,
      });

      this.agentExecutor = new AgentExecutor({
        agent: this.agent,
        tools: tools,
        verbose: agentConfig.verbose,
        maxIterations: agentConfig.maxIterations,
        earlyStoppingMethod: agentConfig.earlyStoppingMethod,
        returnIntermediateSteps: false,
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
      if (!Array.isArray(freshTools) || freshTools.length === 0) {
        throw new Error("Fresh tools array is required");
      }

      // Create hash of tools to check if update is needed
      const toolsHash = this.createToolsHash(freshTools);
      
      // Skip update if tools haven't changed
      if (this.currentToolsHash === toolsHash && this.agentExecutor) {
        this.log("🚀 Tools unchanged, skipping agent update (performance optimization)");
        return;
      }

      this.log("Updating agent with fresh tools...");

      // Validate tools
      for (const tool of freshTools) {
        if (!tool.name || !tool.description) {
          throw new Error(`Invalid fresh tool detected: ${JSON.stringify(tool)}`);
        }
      }

      // Use consistent custom prompt that handles task completion markers
      const customPrompt = await this.createCustomPrompt();
      
      // Create new agent with fresh tools and custom prompt
      this.agent = await createStructuredChatAgent({
        llm: this.llm,
        tools: freshTools,
        prompt: customPrompt,
      });

      this.agentExecutor = new AgentExecutor({
        agent: this.agent,
        tools: freshTools,
        verbose: agentConfig.verbose,
        maxIterations: agentConfig.maxIterations,
        earlyStoppingMethod: agentConfig.earlyStoppingMethod,
        returnIntermediateSteps: false,
        maxExecutionTime: agentConfig.maxExecutionTime,
        handleParsingErrors: agentConfig.handleParsingErrors,
      });

      this.currentToolsHash = toolsHash;
      this.log(`Agent updated successfully with custom prompt`);
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

    const result = await this.agentExecutor.invoke(input, options);

    // Check if the result contains task completion markers
    if (result.output && this.hasTaskCompletionMarker(result.output)) {
      this.log("Task completion marker detected, stopping agent execution");
      // The marker will be cleaned up by ChatbotService before sending to user
    }

    return result;
  }

  hasTaskCompletionMarker(text) {
    if (!text) return false;
    return /\[(TASK_COMPLETED|ACTION_SUCCESS).*?\]/.test(text);
  }

  async createCustomPrompt() {
    const { ChatPromptTemplate } = require("@langchain/core/prompts");
    
    const template = `You are a helpful AI assistant for Gaming Gear Shop. Respond to the human as helpfully and accurately as possible. You have access to the following tools:

{tools}

Use a json blob to specify a tool by providing an action key (tool name) and an action_input key (tool input).

Valid "action" values: "Final Answer" or {tool_names}

Provide only ONE action per $JSON_BLOB, as shown:

\`\`\`
{{
  "action": $TOOL_NAME,
  "action_input": $INPUT
}}
\`\`\`

Follow this format:

Question: input question to answer
Thought: consider previous and subsequent steps
Action:
\`\`\`
$JSON_BLOB
\`\`\`
Observation: action result
... (repeat Thought/Action/Observation N times)
Thought: I know what to respond
Action:
\`\`\`
{{
  "action": "Final Answer",
  "action_input": "Final response to human"
}}
\`\`\`

CRITICAL TASK COMPLETION RULES:
1. If ANY tool output contains [TASK_COMPLETED: ...] or [ACTION_SUCCESS], you MUST IMMEDIATELY stop processing and provide a Final Answer.
2. These markers indicate the task is successfully completed - extract ONLY the meaningful user-facing content from the tool output.
3. NEVER include the markers [TASK_COMPLETED: ...] or [ACTION_SUCCESS] in your Final Answer.
4. NEVER call additional tools after seeing a completion marker.
5. When you see a completion marker, take the useful content before the marker and provide it as your complete Final Answer.

RESPONSE GUIDELINES:
- Always respond in Vietnamese
- Be helpful, friendly, and concise
- Use appropriate emojis when relevant
- Focus on the user's request and provide the most relevant information

Begin!

Question: {input}
Thought: {agent_scratchpad}`;

    return ChatPromptTemplate.fromTemplate(template);
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

  /**
   * Create a hash of tools to detect changes
   */
  createToolsHash(tools) {
    const toolsSignature = tools.map(tool => `${tool.name}:${tool.description}`).sort().join('|');
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < toolsSignature.length; i++) {
      const char = toolsSignature.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Performance monitoring removed for demo project
}

module.exports = AgentManager;
