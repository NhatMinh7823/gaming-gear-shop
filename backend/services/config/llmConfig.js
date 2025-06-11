// LLM Configuration
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const llmConfig = {
  model: "gemini-1.5-flash", // tốt nhất có thể đọc sản phẩm-wishlist, nhận diện bản thân
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
  maxTokens: 4096, // Tăng để handle longer conversations
};

const embeddingsConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
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
