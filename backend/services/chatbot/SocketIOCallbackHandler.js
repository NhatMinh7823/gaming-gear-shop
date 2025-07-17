const { BaseCallbackHandler } = require("@langchain/core/callbacks/base");

class SocketIOCallbackHandler extends BaseCallbackHandler {
  constructor(io, sessionId, log) {
    super();
    this.io = io;
    this.sessionId = sessionId;
    this.log = log;
  }

  name = "SocketIOCallbackHandler";

  handleToolStart(tool, input, runId, parentRunId, tags, metadata) {
    this.log(`[SocketCallback] Tool Start: ${tool.name}`);
    if (this.io) {
      const stepData = {
        id: `step_${runId}_${Date.now()}`,
        tool: tool.name,
        input: input,
        status: 'running',
        timestamp: new Date().toISOString(),
        runId: runId
      };
      this.io.to(this.sessionId).emit("tool:start", stepData);
    }
  }

  handleToolEnd(output, runId, parentRunId, tags) {
    this.log(`[SocketCallback] Tool End. Output:`);
    if (this.io) {
      const stepData = {
        id: `step_${runId}_${Date.now()}`,
        output: output,
        status: 'completed',
        timestamp: new Date().toISOString(),
        runId: runId
      };
      this.io.to(this.sessionId).emit("tool:end", stepData);
    }
  }

  handleAgentAction(action, runId, parentRunId, tags) {
    this.log(`[SocketCallback] Agent Action: ${action.tool}`);
    if (this.io) {
      const stepData = {
        id: `step_${runId}_${Date.now()}`,
        tool: action.tool,
        input: action.toolInput,
        status: 'running',
        timestamp: new Date().toISOString(),
        runId: runId
      };
      this.io.to(this.sessionId).emit("agent:action", stepData);
    }
  }

  handleAgentEnd(action, runId, parentRunId, tags) {
    this.log(`[SocketCallback] Agent End`);
    if (this.io) {
      this.io.to(this.sessionId).emit("agent:end", {
        timestamp: new Date().toISOString(),
        runId: runId
      });
    }
  }

  handleLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata) {
    this.log(`[SocketCallback] LLM Start`);
    if (this.io) {
      this.io.to(this.sessionId).emit("llm:start", {
        id: `llm_${runId}_${Date.now()}`,
        status: 'thinking',
        timestamp: new Date().toISOString(),
        runId: runId
      });
    }
  }

  handleLLMEnd(output, runId, parentRunId, tags) {
    this.log(`[SocketCallback] LLM End`);
    if (this.io) {
      this.io.to(this.sessionId).emit("llm:end", {
        id: `llm_${runId}_${Date.now()}`,
        status: 'completed',
        timestamp: new Date().toISOString(),
        runId: runId
      });
    }
  }
}

module.exports = SocketIOCallbackHandler;
