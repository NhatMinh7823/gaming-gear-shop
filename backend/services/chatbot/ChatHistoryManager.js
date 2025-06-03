const { ChatMessageHistory } = require("langchain/stores/message/in_memory");

class ChatHistoryManager {
  constructor() {
    this.sessionHistories = new Map();
    // Configuration for memory management
    this.maxMessagesPerSession = 20; // Maximum messages to keep per session
    this.maxTokensEstimate = 8000; // Rough estimate of max tokens to preserve
    this.cleanupInterval = 5 * 60 * 1000; // Cleanup every 5 minutes
    this.sessionTimeout = 60 * 60 * 1000; // Sessions timeout after 1 hour
    this.lastCleanup = Date.now();
    
    // Track session activity
    this.sessionActivity = new Map();
    
    console.log('[ChatHistoryManager] Initialized with memory management');
  }

  /**
   * Get or create chat history for a session
   * @param {string|null} sessionId - Session ID, will generate one if null
   * @param {string|null} userId - User ID for personalized history
   * @returns {Object} Object containing history and sessionId
   */
  getOrCreateChatHistory(sessionId, userId = null) {
    // Perform cleanup if needed
    this.performCleanupIfNeeded();

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
   * @param {string} sessionId - Session ID
   * @param {ChatMessageHistory} history - Chat history instance
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
   * Perform cleanup if enough time has passed
   */
  performCleanupIfNeeded() {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.performGlobalCleanup();
      this.lastCleanup = now;
    }
  }

  /**
   * Clean up old and inactive sessions
   */
  performGlobalCleanup() {
    const now = Date.now();
    let cleanedSessions = 0;

    console.log(`[ChatHistoryManager] Starting global cleanup. Active sessions: ${this.sessionHistories.size}`);

    // Clean up sessions that haven't been active
    for (const [sessionId, lastActivity] of this.sessionActivity.entries()) {
      if (now - lastActivity > this.sessionTimeout) {
        this.sessionHistories.delete(sessionId);
        this.sessionActivity.delete(sessionId);
        cleanedSessions++;
      }
    }

    // Clean up sessions that don't have activity tracking (legacy)
    for (const sessionId of this.sessionHistories.keys()) {
      if (!this.sessionActivity.has(sessionId)) {
        this.sessionHistories.delete(sessionId);
        cleanedSessions++;
      }
    }

    if (cleanedSessions > 0) {
      console.log(`[ChatHistoryManager] Global cleanup completed: removed ${cleanedSessions} inactive sessions. Remaining: ${this.sessionHistories.size}`);
    }
  }

  /**
   * Get existing chat history
   * @param {string} sessionId - Session ID
   * @returns {ChatMessageHistory|null} Chat history or null if not found
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
   * @param {string} sessionId - Session ID
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

  /**
   * Get session statistics for monitoring
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    const now = Date.now();
    let activeSessions = 0;
    let totalMessages = 0;

    for (const [sessionId, lastActivity] of this.sessionActivity.entries()) {
      if (now - lastActivity < this.sessionTimeout) {
        activeSessions++;
      }
    }

    // Count total messages (this is async, so we'll return a promise)
    return {
      totalSessions: this.sessionHistories.size,
      activeSessions,
      inactiveSessions: this.sessionHistories.size - activeSessions,
      lastCleanup: new Date(this.lastCleanup).toISOString(),
    };
  }

  /**
   * Force cleanup of a specific session
   * @param {string} sessionId - Session ID to clean
   */
  async forceCleanupSession(sessionId) {
    const history = this.sessionHistories.get(sessionId);
    if (history) {
      await this.cleanupSessionHistory(sessionId, history);
    }
  }

  /**
   * Set configuration for memory management
   * @param {Object} config - Configuration object
   */
  setConfig(config) {
    if (config.maxMessagesPerSession) {
      this.maxMessagesPerSession = config.maxMessagesPerSession;
    }
    if (config.maxTokensEstimate) {
      this.maxTokensEstimate = config.maxTokensEstimate;
    }
    if (config.sessionTimeout) {
      this.sessionTimeout = config.sessionTimeout;
    }
    if (config.cleanupInterval) {
      this.cleanupInterval = config.cleanupInterval;
    }
    
    console.log('[ChatHistoryManager] Configuration updated:', {
      maxMessagesPerSession: this.maxMessagesPerSession,
      maxTokensEstimate: this.maxTokensEstimate,
      sessionTimeout: this.sessionTimeout,
      cleanupInterval: this.cleanupInterval,
    });
  }
}

module.exports = ChatHistoryManager;
