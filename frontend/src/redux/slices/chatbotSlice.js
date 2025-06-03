import { createSlice } from '@reduxjs/toolkit';
import { loadChatbotState } from '../middleware/persistenceMiddleware';

// Load initial state from localStorage or use defaults
const initialState = loadChatbotState();

const chatbotSlice = createSlice({
  name: 'chatbot',
  initialState,
  reducers: {
    // Set initial welcome message
    setWelcomeMessage: (state, action) => {
      const { userInfo } = action.payload;
      const welcomeText = userInfo
        ? `Chào ${userInfo.name}! 👋 Tôi là trợ lý AI của Gaming Gear Shop. Tôi có thể giúp bạn tư vấn về thiết bị gaming dựa trên sở thích của bạn. Bạn cần hỗ trợ gì?`
        : "Chào bạn! 👋 Tôi là trợ lý AI của Gaming Gear Shop. Tôi có thể giúp bạn tư vấn về thiết bị gaming. Bạn cần hỗ trợ gì?";
      
      // Only set welcome message if there are no messages yet
      if (state.messages.length === 0) {
        state.messages = [{
          id: 'welcome_' + Date.now(),
          text: welcomeText,
          sender: 'bot',
          timestamp: new Date().toISOString()
        }];
      }
      state.lastActivity = new Date().toISOString();
    },

    // Add a message to the chat
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      state.lastActivity = new Date().toISOString();
    },

    // Add multiple messages at once
    addMessages: (state, action) => {
      state.messages.push(...action.payload);
      state.lastActivity = new Date().toISOString();
    },

    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Toggle chatbot open/close
    toggleChatbot: (state) => {
      state.isOpen = !state.isOpen;
    },

    // Set chatbot open state
    setChatbotOpen: (state, action) => {
      state.isOpen = action.payload;
    },

    // Update session ID
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
    },

    // Clear all messages and reset session
    clearChat: (state, action) => {
      const { userInfo } = action.payload || {};
      const welcomeText = userInfo
        ? `Chào ${userInfo.name}! 👋 Tôi có thể giúp gì cho bạn?`
        : "Chào bạn! 👋 Tôi có thể giúp gì cho bạn?";

      state.messages = [{
        id: 'welcome_' + Date.now(),
        text: welcomeText,
        sender: 'bot',
        timestamp: new Date().toISOString()
      }];
      state.sessionId = null;
      state.isLoading = false;
      state.lastActivity = new Date().toISOString();
    },

    // Update suggestions
    setSuggestions: (state, action) => {
      state.suggestions = action.payload;
    },

    // Toggle suggestions visibility
    toggleSuggestions: (state) => {
      state.showSuggestions = !state.showSuggestions;
      if (!state.showSuggestions) {
        state.suggestions = [];
      }
    },

    // Set suggestions visibility
    setSuggestionsVisibility: (state, action) => {
      state.showSuggestions = action.payload;
      if (!action.payload) {
        state.suggestions = [];
      }
    },

    // Toggle quick categories visibility
    toggleQuickCategories: (state) => {
      state.showQuickCategories = !state.showQuickCategories;
    },

    // Set quick categories visibility
    setQuickCategoriesVisibility: (state, action) => {
      state.showQuickCategories = action.payload;
    },

    // Reset chatbot to initial state
    resetChatbot: (state) => {
      return { ...loadChatbotState() };
    },

    // Update last activity timestamp
    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },
  },
});

export const {
  setWelcomeMessage,
  addMessage,
  addMessages,
  setLoading,
  toggleChatbot,
  setChatbotOpen,
  setSessionId,
  clearChat,
  setSuggestions,
  toggleSuggestions,
  setSuggestionsVisibility,
  toggleQuickCategories,
  setQuickCategoriesVisibility,
  resetChatbot,
  updateLastActivity,
} = chatbotSlice.actions;

export default chatbotSlice.reducer;
