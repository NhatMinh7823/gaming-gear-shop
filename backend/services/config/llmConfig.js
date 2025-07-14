// LLM Configuration
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const llmConfig = {
  // model: "gemini-2.5-flash-lite-preview-06-17", // chậm vì có reasioning
  // model: "gemini-1.5-flash", nhanh, hiểu yêu cầu, không thông minh
  model: "gemini-2.5-flash", // Nhanh, hiểu yêu cầu, thông minh hơn
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
  maxTokens: 4096, // Tăng để handle longer conversations
  thinkingBudget: 2048,
};

const embeddingsConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004", // Model mới nhất của Google, hỗ trợ tốt Tiếng Việt
  // model: "gemini-embedding-001",
  taskType: "RETRIEVAL_QUERY", // Thêm taskType để tối ưu cho việc tìm kiếm và lưu trữ "SEMANTIC_SIMILARITY" là lựa chọn tốt cho mục đích chung, "RETRIEVAL_QUERY" khi tìm kiếm, "RETRIEVAL_DOCUMENT" khi lưu trữ vector trong logic ứng dụng.
};

const agentConfig = {
  verbose: process.env.LANGCHAIN_VERBOSE === "true",
  
  // 🚀 MULTI-TOOL WORKFLOW CONFIGURATION
  maxIterations: 15, // Tăng từ 10 → 15 (cho phép 5 tools x 3 steps mỗi tool)
  earlyStoppingMethod: "force", // Thay đổi từ "generate" → "force"
  
  // 🆕 CẤU HÌNH MỚI
  returnIntermediateSteps: true, // Track intermediate steps
  maxExecutionTime: 45000, // 45s timeout
  handleParsingErrors: true, // Xử lý lỗi parsing tốt hơn
  
  // 🎯 WORKFLOW CONFIGURATION
  continueBetweenTools: true, // Cho phép tiếp tục giữa các tools
  memoryBetweenSteps: true, // Giữ memory giữa các steps
  
  // 📊 MONITORING
  logIntermediateSteps: process.env.CHATBOT_DEBUG === "true",
};

// 🆕 EXECUTION STRATEGY
const executionStrategy = {
  allowMultiStep: true,
  stepTimeout: 8000, // 8s per step
  maxConcurrentTools: 1, // Execute tools sequentially
  retryFailedSteps: true,
  retryAttempts: 2,
};

module.exports = {
  llmConfig,
  embeddingsConfig,
  agentConfig,
  executionStrategy, // 🆕 Export execution strategy
};
