// chatbotRoutes.js
const express = require("express");
const {
  handleChatbotConversation,
  getProductsForChatbot,
} = require("../controllers/chatbotController");

const router = express.Router();

// @route   POST /api/chatbot/chat
// @desc    Handle chatbot conversation
// @access  Public
router.post("/chat", handleChatbotConversation);

// @route   GET /api/chatbot/products
// @desc    Get products data for chatbot
// @access  Public
router.get("/products", getProductsForChatbot);

module.exports = router;
