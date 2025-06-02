const asyncHandler = require("express-async-handler");
const ChatbotService = require("../services/chatbotService");

// @desc    Handle chatbot conversation
// @route   POST /api/chatbot/chat
// @access  Public
const handleChatbotConversation = asyncHandler(async (req, res) => {
  const { message, sessionId, userId } = req.body;

  console.log("🔍 ChatbotController received:");
  console.log("🔍 Message:", message);
  console.log("🔍 SessionId:", sessionId);
  console.log("🔍 UserId:", userId);
  console.log("🔍 Full request body:", req.body);

  if (!message) {
    res.status(400);
    throw new Error("Vui lòng cung cấp tin nhắn");
  }
  try {
    const response = await ChatbotService.processMessage(
      message,
      sessionId,
      userId
    );

    res.json({
      success: true,
      data: {
        response: response.text,
        sessionId: response.sessionId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Chatbot error:", error.message);
    res.status(500);
    throw new Error("Không thể xử lý yêu cầu chatbot. Vui lòng thử lại sau.");
  }
});

// @desc    Get detailed product information for chatbot
// @route   GET /api/chatbot/products
// @access  Public (not used)
const getProductsForChatbot = asyncHandler(async (req, res) => {
  try {
    const products = await ChatbotService.getProductsData();

    res.json({
      success: true,
      data: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discountPrice: product.discountPrice || null,
        brand: product.brand || "N/A",
        category: product.category || "N/A",
        inStock: product.inStock,
        specifications: product.specifications || {},
        features: product.features || [],
        averageRating: product.averageRating || 0,
        numReviews: product.numReviews || 0,
        isFeatured: product.isFeatured || false,
        isNewArrival: product.isNewArrival || false,
        imageUrl: product.imageUrl || "",
      })),
      total: products.length,
    });
  } catch (error) {
    console.error("Error fetching products for chatbot:", error.message);
    res.status(500);
    throw new Error("Không thể lấy dữ liệu sản phẩm. Vui lòng thử lại sau.");
  }
});

module.exports = {
  handleChatbotConversation,
  getProductsForChatbot,
};
