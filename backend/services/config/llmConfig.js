// LLM Configuration
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const llmConfig = {
  // model: "gemini-1.5-flash-8b",
  model: "gemini-1.5-flash", // tốt nhất có thể đọc sản phẩm-wishlist, nhận diện bản thân
  // model: "gemini-2.5-flash-preview-05-20", // ko thể đọc wishlist
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
};

const embeddingsConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
};

const agentConfig = {
  verbose: process.env.LANGCHAIN_VERBOSE === "true",
  maxIterations: 3,
  earlyStoppingMethod: "generate",
};

module.exports = {
  llmConfig,
  embeddingsConfig,
  agentConfig,
};
