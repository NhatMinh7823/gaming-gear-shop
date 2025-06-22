// chatbotRoutes.js
const express = require("express");
const {
  handleChatbotConversation,
} = require("../controllers/chatbotController");

const router = express.Router();

// @route   POST /api/chatbot/chat
// @desc    Handle chatbot conversation
// @access  Public
router.post("/chat", handleChatbotConversation);

module.exports = router;
