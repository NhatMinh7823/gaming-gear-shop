const {
  ChatPromptTemplate,
  MessagesPlaceholder,
} = require("@langchain/core/prompts");

// System prompt cho chatbot
const SYSTEM_PROMPT = `Bạn là trợ lý AI thân thiện cho cửa hàng Gaming Gear. 
Bạn có thể sử dụng các công cụ sau: {tool_names}

Hướng dẫn:
- Sử dụng các công cụ để trả lời chính xác
- Trả lời bằng tiếng Việt, chi tiết và thân thiện
- Sử dụng emoji phù hợp
- Kết thúc bằng câu hỏi để tiếp tục hỗ trợ

Công cụ có sẵn:
{tools}`;

// Tạo prompt template cho structured chat agent
const createChatPrompt = () => {
  return ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);
};

module.exports = {
  SYSTEM_PROMPT,
  createChatPrompt,
};
