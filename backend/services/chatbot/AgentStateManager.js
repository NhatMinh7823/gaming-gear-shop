class AgentStateManager {
  constructor() {
    this.agentRefreshInterval = 15 * 60 * 1000; // Refresh agent every 15 minutes
    this.lastAgentRefresh = Date.now();
    this.messageCounter = new Map(); // Track messages per session
    this.agentRefreshThreshold = 5; // Refresh agent after 5 messages in a session
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[AgentStateManager] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[AgentStateManager ERROR] ${message}`, ...args);
  }

  /**
   * Check if agent state needs refreshing to prevent tool forgetting
   * @param {string} sessionId - Session ID
   * @returns {boolean} Whether agent should be refreshed
   */
  shouldRefreshAgent(sessionId) {
    try {
      const now = Date.now();
      const sessionMessageCount = this.messageCounter.get(sessionId) || 0;
      
      // Increment message counter
      this.messageCounter.set(sessionId, sessionMessageCount + 1);
      
      // Check refresh conditions
      const timeSinceRefresh = now - this.lastAgentRefresh;
      const shouldRefreshByTime = timeSinceRefresh > this.agentRefreshInterval;
      const shouldRefreshByMessages = sessionMessageCount > this.agentRefreshThreshold;
      
      if (shouldRefreshByTime || shouldRefreshByMessages) {
        this.log(`🔄 Agent refresh needed - Time: ${shouldRefreshByTime}, Messages: ${shouldRefreshByMessages}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logError("Error checking agent refresh:", error);
      return false;
    }
  }

  /**
   * Mark agent as refreshed and reset counters
   * @param {string} sessionId - Session ID
   */
  markAgentRefreshed(sessionId) {
    this.lastAgentRefresh = Date.now();
    this.messageCounter.set(sessionId, 0);
    this.log("✅ Agent state refresh marked complete");
  }

  /**
   * Add system reminder to help agent remember its capabilities
   * @param {Array} messages - Current chat messages
   * @returns {Array} Messages with system reminder if needed
   */
  addSystemReminderIfNeeded(messages) {
    try {
      // Only add reminder if there are many messages and no recent system message
      if (messages.length > 10) {
        const recentSystemMessage = messages.slice(-5).find(msg => 
          msg._getType() === 'system' || 
          (msg.content && msg.content.includes('product_search'))
        );
        
        if (!recentSystemMessage) {
          const { SystemMessage } = require("@langchain/core/messages");
          const systemReminder = new SystemMessage(
            "🎯 REMINDER: You are a gaming gear shop assistant with access to these tools: product_search, product_filter, category_list, product_details, price_range, wishlist_tool. ALWAYS use product_search when users ask about products, brands, or recommendations. Use wishlist_tool for personalized advice."
          );
          
          // Insert reminder before the last few messages
          const updatedMessages = [...messages];
          updatedMessages.splice(-2, 0, systemReminder);
          
          this.log("📝 Added system reminder to maintain tool awareness");
          return updatedMessages;
        }
      }
      
      return messages;
    } catch (error) {
      this.logError("Error adding system reminder:", error);
      return messages;
    }
  }

  /**
   * Get agent state statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      lastAgentRefresh: new Date(this.lastAgentRefresh).toISOString(),
      activeSessions: this.messageCounter.size,
      totalMessagesSinceRefresh: Array.from(this.messageCounter.values()).reduce((a, b) => a + b, 0),
      sessionMessageCounts: Object.fromEntries(this.messageCounter.entries())
    };
  }

  /**
   * Clean up old session counters
   */
  cleanup() {
    // Remove sessions that haven't been active for a while
    const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours
    
    for (const [sessionId, count] of this.messageCounter.entries()) {
      // Simple cleanup based on session pattern (if it contains timestamp)
      if (sessionId.includes('session_')) {
        const match = sessionId.match(/session_(\d+)_/);
        if (match) {
          const sessionTime = parseInt(match[1]);
          if (sessionTime < cutoffTime) {
            this.messageCounter.delete(sessionId);
            this.log(`Cleaned up old session: ${sessionId}`);
          }
        }
      }
    }
  }
}

module.exports = AgentStateManager;
