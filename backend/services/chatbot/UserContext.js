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
    this.currentUserId = userId;
    this.currentUserInfo = userInfo;
  }

  /**
   * Get current user ID
   * @returns {string|null} Current user ID
   */
  getUserId() {
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
