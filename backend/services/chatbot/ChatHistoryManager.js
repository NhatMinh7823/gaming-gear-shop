const { ChatMessageHistory } = require("langchain/stores/message/in_memory");

class ChatHistoryManager {
  constructor() {
    this.sessionHistories = new Map();
  }
  /**
   * Get or create chat history for a session
   * @param {string|null} sessionId - Session ID, will generate one if null
   * @param {string|null} userId - User ID for personalized history
   * @returns {Object} Object containing history and sessionId
   */
  getOrCreateChatHistory(sessionId, userId = null) {
    if (!sessionId) {
      const userPrefix = userId ? `user_${userId}_` : "";
      sessionId = `${userPrefix}session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }

    if (!this.sessionHistories.has(sessionId)) {
      this.sessionHistories.set(sessionId, new ChatMessageHistory());
    }

    return {
      history: this.sessionHistories.get(sessionId),
      sessionId,
    };
  }

  /**
   * Get existing chat history
   * @param {string} sessionId - Session ID
   * @returns {ChatMessageHistory|null} Chat history or null if not found
   */
  getChatHistory(sessionId) {
    return this.sessionHistories.get(sessionId) || null;
  }

  /**
   * Clear chat history for a session
   * @param {string} sessionId - Session ID
   */
  clearChatHistory(sessionId) {
    this.sessionHistories.delete(sessionId);
  }

  /**
   * Clear all chat histories
   */
  clearAllHistories() {
    this.sessionHistories.clear();
  }

  /**
   * Get total number of active sessions
   * @returns {number} Number of active sessions
   */
  getActiveSessionsCount() {
    return this.sessionHistories.size;
  }

  /**
   * Get all session IDs
   * @returns {Array<string>} Array of session IDs
   */
  getAllSessionIds() {
    return Array.from(this.sessionHistories.keys());
  }
}

module.exports = ChatHistoryManager;
