import { GoogleGenerativeAI } from "@google/generative-ai";

class GamingChatbot {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.chatHistory = [];
    this.initializeModel();
  }

  initializeModel() {
    try {
      if (!process.env.REACT_APP_GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not found in environment variables");
      }

      this.genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 500,
        },
      });

      console.log("✅ Gaming Chatbot initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize chatbot:", error);
      throw new Error("Chatbot initialization failed: " + error.message);
    }
  }

  getSystemPrompt() {
    return `Bạn là trợ lý AI chuyên nghiệp cho cửa hàng Gaming Gear Shop.

NHIỆM VỤ CỦA BẠN:
- Tư vấn sản phẩm gaming (chuột, bàn phím, tai nghe, màn hình, laptop gaming)
- Giúp khách hàng chọn setup gaming phù hợp với budget và nhu cầu
- Trả lời về thông số kỹ thuật và so sánh sản phẩm
- Tư vấn về combo gaming và các ưu đãi
- Hỗ trợ troubleshooting cơ bản cho thiết bị gaming

PHONG CÁCH TRẢ LỜI:
- Thân thiện, nhiệt tình như một gamer chuyên nghiệp
- Sử dụng thuật ngữ gaming phù hợp nhưng dễ hiểu
- Đưa ra gợi ý cụ thể và thực tế
- Luôn hỏi thêm về budget và mục đích sử dụng
- Trả lời ngắn gọn, dễ hiểu

KIẾN THỨC SẢN PHẨM:
- Chuột gaming: DPI, polling rate, sensor optical/laser, loại switch
- Bàn phím: mechanical vs membrane, các loại switch (Cherry MX, Gateron, Outemu)
- Tai nghe: driver size, frequency response, surround sound, microphone quality
- Màn hình: refresh rate (60Hz, 144Hz, 240Hz), response time, panel types (IPS, TN, VA)
- Laptop gaming: GPU (RTX 3060, 4060, 4070), CPU, RAM, storage SSD

THƯƠNG HIỆU PHỔ BIẾN:
- Chuột: Logitech, Razer, SteelSeries, Corsair
- Bàn phím: Corsair, Razer, Logitech, Keychron
- Tai nghe: SteelSeries, HyperX, Razer, Audio-Technica
- Màn hình: ASUS, MSI, AOC, Samsung
- Laptop: ASUS ROG, MSI Gaming, Acer Predator, HP Omen

LƯU Ý: Nếu không chắc chắn về thông tin cụ thể, hãy thừa nhận và đề xuất liên hệ nhân viên tư vấn để được hỗ trợ chi tiết hơn.`;
  }

  async sendMessage(message) {
    try {
      if (!this.model) {
        throw new Error("Chatbot not initialized");
      }

      // Tạo context từ lịch sử chat
      const conversationHistory = this.chatHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const fullPrompt = `${this.getSystemPrompt()}

LỊCH SỬ TRÒ CHUYỆN:
${conversationHistory}

KHÁCH HÀNG: ${message}

TRỢ LÝ:`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const botReply = response.text();

      // Lưu vào lịch sử
      this.chatHistory.push(
        { role: "KHÁCH HÀNG", content: message },
        { role: "TRỢ LÝ", content: botReply }
      );

      // Giới hạn lịch sử (giữ 10 tin nhắn gần nhất)
      if (this.chatHistory.length > 10) {
        this.chatHistory = this.chatHistory.slice(-10);
      }

      return {
        success: true,
        message: botReply,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error sending message:", error);

      // Handle specific error types
      let errorMessage = "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.";

      if (
        error.message.includes("API_KEY") ||
        error.message.includes("GEMINI_API_KEY")
      ) {
        errorMessage = "Lỗi cấu hình API. Vui lòng kiểm tra API key.";
      } else if (
        error.message.includes("QUOTA_EXCEEDED") ||
        error.message.includes("quota")
      ) {
        errorMessage = "Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.";
      } else if (
        error.message.includes("RATE_LIMIT") ||
        error.message.includes("rate")
      ) {
        errorMessage = "Bạn gửi tin nhắn hơi nhanh rồi! Chờ chút nhé 😊";
      } else if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        errorMessage = "Đang có sự cố với AI model. Vui lòng thử lại sau.";
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  clearMemory() {
    this.chatHistory = [];
    console.log("🧹 Chat memory cleared");
  }

  async getQuickSuggestions() {
    const suggestions = [
      "Tư vấn chuột gaming dưới 1 triệu",
      "So sánh bàn phím cơ vs màng",
      "Setup gaming cho budget 20 triệu",
      "Tai nghe gaming tốt nhất hiện tại",
      "Màn hình 144Hz giá rẻ",
      "Laptop gaming cho học sinh",
      "Combo chuột + bàn phím RGB",
    ];
    return suggestions;
  }

  // Get gaming categories for quick access
  getGamingCategories() {
    return [
      { name: "Chuột Gaming", icon: "🖱️" },
      { name: "Bàn phím Gaming", icon: "⌨️" },
      { name: "Tai nghe Gaming", icon: "🎧" },
      { name: "Màn hình Gaming", icon: "🖥️" },
      { name: "Laptop Gaming", icon: "💻" },
      { name: "Setup Gaming", icon: "🎮" },
    ];
  }

  // Test connection
  async testConnection() {
    try {
      const testResult = await this.sendMessage("Xin chào");
      return testResult.success;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const gamingChatbot = new GamingChatbot();
export default gamingChatbot;
