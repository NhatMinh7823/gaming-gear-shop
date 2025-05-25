import { GoogleGenerativeAI } from "@google/generative-ai";
import api from "./api"; // Import API service to fetch product data

class GamingChatbot {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.chat = null;
    this.chatHistory = [];
    this.productData = null; // Store cached product data
    this.lastProductFetch = null; // Track when we last fetched products
    this.productFetchInProgress = false; // Prevent multiple simultaneous fetch requests
    this.systemPrompt = `Bạn là trợ lý AI cho cửa hàng Gaming Gear Shop chuyên về thiết bị gaming.
          
Nhiệm vụ của bạn:
- Tư vấn sản phẩm gaming (chuột, bàn phím, tai nghe, màn hình, laptop gaming) dựa trên dữ liệu sản phẩm thực
- Giúp khách hàng chọn setup gaming phù hợp với budget
- Trả lời về thông số kỹ thuật và so sánh sản phẩm
- Tư vấn về combo gaming và khuyến mãi
- Hỗ trợ troubleshooting cơ bản cho thiết bị gaming

Phong cách trả lời:
- Thân thiện, nhiệt tình như một gamer chuyên nghiệp
- Sử dụng thuật ngữ gaming phù hợp
- Đưa ra gợi ý cụ thể và thực tế dựa trên sản phẩm thực trong hệ thống
- Luôn hỏi thêm về budget và nhu cầu sử dụng
- Khi gợi ý sản phẩm, hãy nhắc đến tên sản phẩm cụ thể, giá và đặc điểm nổi bật

Kiến thức về sản phẩm:
- Chuột gaming: DPI, polling rate, sensor, switch
- Bàn phím: mechanical, membrane, switch types (Cherry MX, Gateron)
- Tai nghe: driver size, frequency response, surround sound
- Màn hình: refresh rate, response time, panel types
- Laptop gaming: GPU, CPU, RAM, storage

Lưu ý: Khi không chắc chắn về thông tin cụ thể, bạn có thể gợi ý khách hàng kiểm tra thêm trên website hoặc liên hệ nhân viên tư vấn.`;

    this.initializeModel();
    // Fetch product data during initialization
    this.fetchProductData();
  }

  // Fetch product data from our API
  async fetchProductData(query = {}) {
    // If a fetch is already in progress, don't start another one
    if (this.productFetchInProgress) {
      return;
    }

    try {
      this.productFetchInProgress = true;
      console.log("🔄 Fetching product data for chatbot...");

      const response = await api.get("/products/chatbot-data", {
        params: query,
      });

      if (response && response.data && response.data.success) {
        this.productData = response.data.data;
        this.lastProductFetch = new Date();
        console.log(
          `✅ Fetched ${this.productData.products.length} products for chatbot`
        );

        // Update system prompt with real product data summary
        this.updateSystemPromptWithProductData();

        return this.productData;
      }
    } catch (error) {
      console.error("❌ Error fetching product data:", error);
    } finally {
      this.productFetchInProgress = false;
    }
  }

  // Update system prompt with product data summary
  updateSystemPromptWithProductData() {
    if (!this.productData) return;

    const { summary } = this.productData;

    // Create brands summary
    const brandsSummary = summary.brands
      .map((b) => `${b._id} (${b.count} sản phẩm)`)
      .join(", ");

    // Create categories summary
    const categoriesSummary = summary.categories
      .map((c) => `${c._id} (${c.count} sản phẩm)`)
      .join(", ");

    // Create price range summary
    const { minPrice, maxPrice, avgPrice } = summary.priceRange;
    const priceRangeSummary = `Giá từ ${minPrice.toLocaleString(
      "vi-VN"
    )}đ đến ${maxPrice.toLocaleString("vi-VN")}đ, trung bình ${Math.round(
      avgPrice
    ).toLocaleString("vi-VN")}đ`;

    // Append product knowledge to the existing system prompt
    const productDataSummary = `
THÔNG TIN SẢN PHẨM THỰC TẾ:
- Tổng số sản phẩm: ${summary.totalProducts} sản phẩm
- Thương hiệu: ${brandsSummary}
- Danh mục: ${categoriesSummary}
- Khoảng giá: ${priceRangeSummary}

Khi khách hỏi về sản phẩm cụ thể, hãy tìm và trích dẫn từ danh sách sản phẩm thực trong hệ thống để đưa ra tư vấn chính xác nhất.`;

    this.extendedSystemPrompt = `${this.systemPrompt}\n\n${productDataSummary}`;

    // If chat is already initialized, we need to reinitialize with extended prompt
    if (this.chat) {
      this.clearMemory();
    }
  }

  // Search for relevant products based on query
  async searchProducts(query) {
    // Refresh product data if it's older than 30 minutes or doesn't exist
    const needsRefresh =
      !this.lastProductFetch ||
      new Date() - this.lastProductFetch > 30 * 60 * 1000;

    if (needsRefresh || !this.productData) {
      await this.fetchProductData({ search: query });
    }

    if (!this.productData) return [];

    const { products } = this.productData;

    // Simple search implementation - can be enhanced as needed
    const searchTerms = query.toLowerCase().split(" ");

    return products
      .filter((product) => {
        const searchText =
          `${product.name} ${product.description} ${product.brand}`.toLowerCase();
        return searchTerms.some((term) => searchText.includes(term));
      })
      .slice(0, 5); // Return top 5 matches
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

      // Use the extended system prompt if available
      const promptToUse = this.extendedSystemPrompt || this.systemPrompt;

      // Initialize chat with system prompt
      this.chat = this.model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: promptToUse }],
          },
          {
            role: "model",
            parts: [
              {
                text: "Xin chào! Tôi đã hiểu vai trò của mình là trợ lý AI chuyên tư vấn gaming gear. Tôi sẵn sàng giúp bạn với dữ liệu sản phẩm thực từ cửa hàng!",
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

      // Before answering, try to find relevant products for the query
      const relevantProducts = await this.searchProducts(message);

      let enhancedPrompt = message;

      // If we found relevant products, enhance the user's query with product info
      if (relevantProducts && relevantProducts.length > 0) {
        const productDetails = relevantProducts
          .map((p) => {
            const price = p.discountPrice || p.price;
            return `- ${p.name}: ${price.toLocaleString("vi-VN")}đ, ${
              p.brand
            }, ${p.description.substring(0, 100)}...${
              p.stock > 0 ? " (Còn hàng)" : " (Hết hàng)"
            }`;
          })
          .join("\n");

        enhancedPrompt = `${message}\n\nSản phẩm liên quan trong hệ thống:\n${productDetails}\n\nHãy sử dụng thông tin sản phẩm thực này để tư vấn cho khách hàng.`;
      }

      // Send enhanced message to Gemini
      const result = await this.chat.sendMessage(enhancedPrompt);
      const response = await result.response;
      const text = response.text();

      // Store in chat history for context
      this.chatHistory.push({
        user: message, // Store original user message
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
    // Use the extended system prompt if available
    const promptToUse = this.extendedSystemPrompt || this.systemPrompt;

    // Reset chat session
    this.chat = this.model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: promptToUse }],
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
      hasProductData: !!this.productData,
      productCount: this.productData?.products?.length || 0,
    };
  }
}

// Export singleton instance
export const gamingChatbot = new GamingChatbot();
export default gamingChatbot;
