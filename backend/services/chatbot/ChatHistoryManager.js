const { ChatMessageHistory } = require("langchain/stores/message/in_memory");

class ChatHistoryManager {
  constructor() {
    this.sessionHistories = new Map();
    this.maxMessagesPerSession = 20; // Maximum messages to keep per session
    this.sessionActivity = new Map();
    
    console.log('[ChatHistoryManager] Initialized');
  }

  /**
   * Get or create chat history for a session
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
      console.log(`[ChatHistoryManager] Created new session: ${sessionId}`);
    }

    // Update session activity
    this.sessionActivity.set(sessionId, Date.now());

    const history = this.sessionHistories.get(sessionId);
    
    // Clean up this specific session if it has too many messages
    this.cleanupSessionHistory(sessionId, history);

    return {
      history,
      sessionId,
    };
  }

  /**
   * Clean up history for a specific session to prevent context overflow
   */
  async cleanupSessionHistory(sessionId, history) {
    try {
      const messages = await history.getMessages();
      
      if (messages.length > this.maxMessagesPerSession) {
        console.log(`[ChatHistoryManager] Cleaning up session ${sessionId}: ${messages.length} messages`);
        
        // Keep the most recent messages
        const recentMessages = messages.slice(-this.maxMessagesPerSession);
        
        // Clear history and add back recent messages
        await history.clear();
        for (const message of recentMessages) {
          await history.addMessage(message);
        }
        
        console.log(`[ChatHistoryManager] Cleaned session ${sessionId}: kept ${recentMessages.length} recent messages`);
      }
    } catch (error) {
      console.error(`[ChatHistoryManager] Error cleaning session ${sessionId}:`, error);
    }
  }

  /**
   * Get existing chat history
   */
  getChatHistory(sessionId) {
    // Update activity if session exists
    if (this.sessionHistories.has(sessionId)) {
      this.sessionActivity.set(sessionId, Date.now());
    }
    return this.sessionHistories.get(sessionId) || null;
  }

  /**
   * Clear chat history for a session
   */
  clearChatHistory(sessionId) {
    this.sessionHistories.delete(sessionId);
    this.sessionActivity.delete(sessionId);
    console.log(`[ChatHistoryManager] Cleared session: ${sessionId}`);
  }

  /**
   * Clear all chat histories
   */
  clearAllHistories() {
    this.sessionHistories.clear();
    this.sessionActivity.clear();
    console.log('[ChatHistoryManager] Cleared all sessions');
  }

  /**
   * Get total number of active sessions
   */
  getActiveSessionsCount() {
    return this.sessionHistories.size;
  }

  /**
   * Get all session IDs
   */
  getAllSessionIds() {
    return Array.from(this.sessionHistories.keys());
  }

  /**
   * Get session statistics for monitoring
   */
  getSessionStats() {
    return {
      totalSessions: this.sessionHistories.size,
      activeSessions: this.sessionHistories.size,
    };
  }
}

module.exports = ChatHistoryManager;
