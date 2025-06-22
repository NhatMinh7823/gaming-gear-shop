// chatbotService.js - Frontend service for Gaming Gear Shop Chatbot
import api from "./api";

class GamingChatbot {
  constructor() {
    this.chatHistory = [];
    this.sessionId = null;
    this.isTyping = false;
  } // Send message to backend chatbot
  async sendMessage(message, userInfo = null) {
    if (!message.trim()) {
      throw new Error("Message cannot be empty");
    }

    this.isTyping = true;

    try {
      const requestBody = {
        message: message.trim(),
        sessionId: this.sessionId,
      }; // Add userId if user is authenticated
      // Check for both _id and id since backend returns 'id' but some components might use '_id'
      const userId = userInfo?._id || userInfo?.id;
      if (userInfo && userId) {
        requestBody.userId = userId;
        console.log(
          "🔍 Frontend chatbotService: Adding userId to request:",
          userId
        );
        console.log("🔍 Complete userInfo object:", userInfo);
      } else {
        console.log(
          "🔍 Frontend chatbotService: No userInfo or userId:",
          userInfo
        );
      }

      console.log("🔍 Sending request body:", requestBody);

      const response = await api.post("/chatbot/chat", requestBody);

      if (response.data.success) {
        const {
          response: botResponse,
          sessionId,
          timestamp,
        } = response.data.data;

        // Update session ID if provided
        if (sessionId) {
          this.sessionId = sessionId;
        }

        // Add messages to local history
        this.addToHistory("user", message, timestamp);
        this.addToHistory("bot", botResponse, timestamp);

        return {
          response: botResponse,
          sessionId: sessionId,
          timestamp: timestamp,
        };
      } else {
        throw new Error("Failed to get response from chatbot");
      }
    } catch (error) {
      console.error("❌ Error sending message to chatbot:", error);

      // Return a fallback response
      const fallbackResponse =
        "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ với nhân viên hỗ trợ.";
      this.addToHistory("user", message);
      this.addToHistory("bot", fallbackResponse);

      return {
        response: fallbackResponse,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        error: true,
      };
    } finally {
      this.isTyping = false;
    }
  }

  // Add message to local chat history
  addToHistory(role, content, timestamp = null) {
    this.chatHistory.push({
      role,
      content,
      timestamp: timestamp || new Date().toISOString(),
      id: `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    // Keep only last 50 messages to prevent memory issues
    if (this.chatHistory.length > 50) {
      this.chatHistory = this.chatHistory.slice(-50);
    }
  }

  // Get chat history
  getHistory() {
    return [...this.chatHistory]; // Return a copy
  }

  // Clear chat history and start new session
  clearHistory() {
    this.chatHistory = [];
    this.sessionId = null;
  }

  // Get typing status
  getTypingStatus() {
    return this.isTyping;
  }

  // Get current session ID
  getSessionId() {
    return this.sessionId;
  }

  // Quick responses for common questions
  getQuickResponses() {
    return [
      "Tôi cần tư vấn chuột gaming",
      "Bàn phím cơ nào tốt?",
      "Tai nghe gaming trong tầm giá 1 triệu",
      "Setup gaming budget 20 triệu",
      "Màn hình gaming 144Hz",
      "Laptop gaming sinh viên",
    ];
  }

  // Suggested follow-up questions based on context
  getSuggestedQuestions(lastBotResponse) {
    if (!lastBotResponse) return [];

    const suggestions = [];

    if (lastBotResponse.includes("chuột")) {
      suggestions.push(
        "DPI bao nhiêu là phù hợp?",
        "Chuột có dây hay không dây?"
      );
    }

    if (lastBotResponse.includes("bàn phím")) {
      suggestions.push("Switch nào êm nhất?", "Bàn phím có LED RGB không?");
    }

    if (lastBotResponse.includes("tai nghe")) {
      suggestions.push("Có micro tốt không?", "Tai nghe có chống ồn không?");
    }

    if (lastBotResponse.includes("màn hình")) {
      suggestions.push(
        "Kích thước màn hình nào phù hợp?",
        "Tần số quét cao có cần thiết?"
      );
    }

    if (lastBotResponse.includes("giá") || lastBotResponse.includes("VND")) {
      suggestions.push(
        "Có khuyến mãi gì không?",
        "Có sản phẩm tương tự rẻ hơn?"
      );
    }

    return suggestions.slice(0, 3); // Return max 3 suggestions
  }

  // Format price for display
  formatPrice(price) {
    if (typeof price !== "number") return price;
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  }

  // Validate message before sending
  validateMessage(message) {
    if (!message || typeof message !== "string") {
      return { valid: false, error: "Tin nhắn không hợp lệ" };
    }

    const trimmed = message.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: "Tin nhắn không được để trống" };
    }

    if (trimmed.length > 1000) {
      return { valid: false, error: "Tin nhắn quá dài (tối đa 1000 ký tự)" };
    }

    return { valid: true, message: trimmed };
  }

  // Get bot status
  getBotStatus() {
    return {
      isOnline: true, // Assume online if service is running
      isTyping: this.isTyping,
      sessionId: this.sessionId,
      historyLength: this.chatHistory.length,
    };
  }
}

// Export singleton instance
const gamingChatbot = new GamingChatbot();
export default gamingChatbot;
