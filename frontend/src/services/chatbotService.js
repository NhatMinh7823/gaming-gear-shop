import { GoogleGenerativeAI } from "@google/generative-ai";

class GamingChatbot {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.chat = null;
    this.chatHistory = [];
    this.systemPrompt = `Bạn là trợ lý AI cho cửa hàng Gaming Gear Shop chuyên về thiết bị gaming.
          
Nhiệm vụ của bạn:
- Tư vấn sản phẩm gaming (chuột, bàn phím, tai nghe, màn hình, laptop gaming)
- Giúp khách hàng chọn setup gaming phù hợp với budget
- Trả lời về thông số kỹ thuật và so sánh sản phẩm
- Tư vấn về combo gaming và khuyến mãi
- Hỗ trợ troubleshooting cơ bản cho thiết bị gaming

Phong cách trả lời:
- Thân thiện, nhiệt tình như một gamer chuyên nghiệp
- Sử dụng thuật ngữ gaming phù hợp
- Đưa ra gợi ý cụ thể và thực tế
- Luôn hỏi thêm về budget và nhu cầu sử dụng

Kiến thức về sản phẩm:
- Chuột gaming: DPI, polling rate, sensor, switch
- Bàn phím: mechanical, membrane, switch types (Cherry MX, Gateron)
- Tai nghe: driver size, frequency response, surround sound
- Màn hình: refresh rate, response time, panel types
- Laptop gaming: GPU, CPU, RAM, storage

Lưu ý: Nếu không chắc chắn về thông tin cụ thể, hãy thừa nhận và đề xuất liên hệ nhân viên tư vấn.`;

    this.initializeModel();
  }

  initializeModel() {
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("API_KEY not found in environment variables");
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
        },
      });

      // Initialize chat with system prompt
      this.chat = this.model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: this.systemPrompt }],
          },
          {
            role: "model",
            parts: [
              {
                text: "Xin chào! Tôi đã hiểu vai trò của mình là trợ lý AI chuyên tư vấn gaming gear. Tôi sẵn sàng giúp bạn!",
              },
            ],
          },
        ],
      });

      console.log(
        "✅ Gaming Chatbot initialized successfully with Google Generative AI"
      );
    } catch (error) {
      console.error("❌ Failed to initialize chatbot:", error);
      throw new Error("Chatbot initialization failed");
    }
  }

  async sendMessage(message) {
    try {
      if (!this.chat) {
        throw new Error("Chatbot not initialized");
      }

      // Send message to Gemini
      const result = await this.chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      // Store in chat history for context
      this.chatHistory.push({
        user: message,
        bot: text,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: text,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error sending message:", error);

      // Handle specific error types
      let errorMessage = "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.";

      if (
        error.message.includes("API_KEY") ||
        error.message.includes("API key")
      ) {
        errorMessage =
          "Lỗi cấu hình API. Vui lòng kiểm tra API key trong file .env";
      } else if (
        error.message.includes("QUOTA_EXCEEDED") ||
        error.message.includes("quota")
      ) {
        errorMessage =
          "Đã vượt quá giới hạn API. Vui lòng thử lại sau ít phút.";
      } else if (
        error.message.includes("RATE_LIMIT") ||
        error.message.includes("rate limit")
      ) {
        errorMessage = "Bạn gửi tin nhắn hơi nhanh rồi đấy! Chờ chút nhé 😊";
      } else if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        errorMessage = "Model AI không khả dụng. Đang thử kết nối lại...";
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
    // Reset chat session
    this.chat = this.model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: this.systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Xin chào! Tôi đã hiểu vai trò của mình là trợ lý AI chuyên tư vấn gaming gear. Tôi sẵn sàng giúp bạn!",
            },
          ],
        },
      ],
    });

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

  // Get chat statistics
  getChatStats() {
    return {
      totalMessages: this.chatHistory.length,
      isInitialized: !!this.chat,
      modelName: "gemini-1.5-flash",
    };
  }
}

// Export singleton instance
export const gamingChatbot = new GamingChatbot();
export default gamingChatbot;
