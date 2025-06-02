/**
 * UserContext - Manages user context for chatbot tools
 */
class UserContext {
  constructor() {
    this.currentUserId = null;
    this.currentUserInfo = null;
  }
  /**
   * Set current user context
   * @param {string} userId - User ID
   * @param {Object} userInfo - Optional user information
   */
  setUser(userId, userInfo = null) {
    console.log("🔧 UserContext.setUser called with:", { userId, userInfo });
    this.currentUserId = userId;
    this.currentUserInfo = userInfo;
    console.log(
      "✅ UserContext.setUser completed. Current userId:",
      this.currentUserId
    );
  }

  /**
   * Get current user ID
   * @returns {string|null} Current user ID
   */
  getUserId() {
    console.log(
      "🔍 UserContext.getUserId called. Current userId:",
      this.currentUserId
    );
    return this.currentUserId;
  }

  /**
   * Get current user info
   * @returns {Object|null} Current user information
   */
  getUserInfo() {
    return this.currentUserInfo;
  }

  /**
   * Clear user context
   */
  clearUser() {
    this.currentUserId = null;
    this.currentUserInfo = null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUserId;
  }
}

module.exports = UserContext;
