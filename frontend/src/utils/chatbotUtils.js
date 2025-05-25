import { gamingChatbot } from "../services/chatbotService";

export const testChatbot = async () => {
  console.log("🧪 Testing Gaming Chatbot...");

  const testMessages = [
    "Xin chào, tôi mới bắt đầu gaming",
    "Tư vấn chuột gaming tốt nhất dưới 1 triệu",
    "So sánh Logitech G Pro vs Razer DeathAdder V3",
    "Setup gaming hoàn chỉnh cho budget 20 triệu",
    "Bàn phím cơ nào tốt nhất cho gaming và code?",
    "Tai nghe gaming có micro tốt giá rẻ",
  ];

  for (const message of testMessages) {
    console.log(`\n👤 User: ${message}`);
    try {
      const response = await gamingChatbot.sendMessage(message);
      console.log(`🤖 Bot: ${response.message}`);
      console.log(`✅ Success: ${response.success}`);

      // Delay between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log("\n✅ Test completed!");
};

// Error handling utility
export const handleChatbotError = (error) => {
  console.error("Chatbot Error:", error);

  if (error.message.includes("API_KEY")) {
    return "Lỗi cấu hình API key. Vui lòng kiểm tra lại trong file .env";
  }

  if (error.message.includes("QUOTA_EXCEEDED")) {
    return "Đã vượt quá giới hạn API. Vui lòng thử lại sau.";
  }

  if (error.message.includes("RATE_LIMIT")) {
    return "Bạn gửi tin nhắn quá nhanh. Vui lòng chờ chút.";
  }

  return "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.";
};

// Performance monitoring
export const monitorChatbot = () => {
  const originalSendMessage = gamingChatbot.sendMessage.bind(gamingChatbot);

  gamingChatbot.sendMessage = async (message) => {
    const startTime = performance.now();
    console.log(`📤 Sending message: "${message.substring(0, 50)}..."`);

    try {
      const response = await originalSendMessage(message);
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      console.log(`📥 Response received in ${duration}ms`);
      console.log(`📊 Success: ${response.success}`);

      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      console.error(`❌ Error after ${duration}ms:`, error.message);
      throw error;
    }
  };
};

// Usage example:
// In browser console:
// import { testChatbot, monitorChatbot } from './utils/chatbotUtils';
// monitorChatbot(); // Enable monitoring
// testChatbot(); // Run tests
