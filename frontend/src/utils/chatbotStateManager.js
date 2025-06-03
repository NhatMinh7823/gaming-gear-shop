// Utility functions for managing chatbot state consistency
import gamingChatbot from '../services/chatbotService';

/**
 * Sync chatbot service session with Redux store
 * @param {string} sessionId - Session ID from Redux store
 */
export const syncChatbotSession = (sessionId) => {
  if (sessionId && gamingChatbot.sessionId !== sessionId) {
    gamingChatbot.sessionId = sessionId;
    console.log('🔄 Synced chatbot service session ID:', sessionId);
  }
};

/**
 * Clear chatbot service state
 */
export const clearChatbotService = () => {
  gamingChatbot.clearHistory();
  console.log('🗑️ Cleared chatbot service state');
};

/**
 * Get chatbot service status
 */
export const getChatbotServiceStatus = () => {
  return {
    sessionId: gamingChatbot.sessionId,
    historyLength: gamingChatbot.getHistory().length,
    isTyping: gamingChatbot.getTypingStatus(),
  };
};
