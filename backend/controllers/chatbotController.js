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
        //  Debugging and analytics information
        debugInfo: {
          toolsUsed: response.toolsUsed,
          workflow: response.workflow,
          executionTime: response.executionTime,
          agentExecutionTime: response.agentExecutionTime,
          iterationsUsed: response.iterationsUsed,
          intermediateSteps: response.intermediateSteps,
        },
      },
    });
  } catch (error) {
    console.error("Chatbot error:", error.message);
    res.status(500);
    throw new Error("Không thể xử lý yêu cầu chatbot. Vui lòng thử lại sau.");
  }
});

module.exports = {
  handleChatbotConversation,
};
