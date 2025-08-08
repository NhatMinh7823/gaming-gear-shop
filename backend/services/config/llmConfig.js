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

};

const embeddingsConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004", // Model mới nhất của Google, hỗ trợ tốt Tiếng Việt
  // model: "gemini-embedding-001",
  taskType: "RETRIEVAL_QUERY", // Thêm taskType để tối ưu cho việc tìm kiếm và lưu trữ "SEMANTIC_SIMILARITY" là lựa chọn tốt cho mục đích chung, "RETRIEVAL_QUERY" khi tìm kiếm, "RETRIEVAL_DOCUMENT" khi lưu trữ vector trong logic ứng dụng.
};

const agentConfig = {
  verbose: process.env.LANGCHAIN_VERBOSE === "true",

  // 🚀 OPTIMIZED CONFIGURATION - Giảm maxIteration risk
  maxIterations: 10, // Giảm từ 5 → 2 vì OptimizedAIOrderTool chỉ cần 1 lần gọi
  earlyStoppingMethod: "force", // Sử dụng "force" - phương thức dừng hợp lệ

  // 🆕 CẤU HÌNH TỐI ƯU
  returnIntermediateSteps: false,
  maxExecutionTime: 20000, // Giảm từ 30s → 20s timeout
  handleParsingErrors: true, // Xử lý lỗi parsing tốt hơn

  // 🎯 WORKFLOW CONFIGURATION - Tối ưu cho OptimizedTools
  continueBetweenTools: false, // Tắt tiếp tục giữa các tools để tránh loop
  memoryBetweenSteps: false, // Tắt memory để giảm complexity

};

// 🆕 EXECUTION STRATEGY
const executionStrategy = {
  allowMultiStep: false, // Tắt multi-step để tránh AI tự tạo thêm steps
  stepTimeout: 5000, // Giảm từ 8s → 5s per step
  maxConcurrentTools: 1, // Execute tools sequentially
  retryFailedSteps: false, // Tắt retry để tránh loop
  retryAttempts: 1, // Giảm retry attempts
};

module.exports = {
  llmConfig,
  embeddingsConfig,
  agentConfig,
  executionStrategy, // 🆕 Export execution strategy
};
