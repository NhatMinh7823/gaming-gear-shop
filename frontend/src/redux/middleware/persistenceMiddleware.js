// Redux middleware for persisting chatbot state to localStorage
const PERSISTENCE_KEY = 'gaming-gear-chatbot-state';

// Default state structure for initialization
const defaultChatbotState = {
  messages: [],
  isOpen: false,
  isLoading: false,
  sessionId: null,
  suggestions: [],
  showSuggestions: true,
  showQuickCategories: true,
  lastActivity: null,
};

// Load state from localStorage
export const loadChatbotState = () => {
  try {
    const serializedState = localStorage.getItem(PERSISTENCE_KEY);
    if (serializedState === null) {
      return defaultChatbotState;
    }
    
    const parsedState = JSON.parse(serializedState);
    
    // Check if state is older than 24 hours and clear if so
    const lastActivity = parsedState.lastActivity;
    if (lastActivity) {
      const timeDiff = Date.now() - new Date(lastActivity).getTime();
      const hoursOld = timeDiff / (1000 * 60 * 60);
      
      if (hoursOld > 24) {
        console.log('🔄 Chatbot state expired (>24h), clearing...');
        localStorage.removeItem(PERSISTENCE_KEY);
        return defaultChatbotState;
      }
    }
    
    // Merge with default state to ensure all properties exist
    return {
      ...defaultChatbotState,
      ...parsedState,
      isLoading: false, // Always reset loading state on reload
    };
  } catch (error) {
    console.error('Error loading chatbot state from localStorage:', error);
    localStorage.removeItem(PERSISTENCE_KEY);
    return defaultChatbotState;
  }
};

// Save state to localStorage
export const saveChatbotState = (state) => {
  try {
    // Only save specific chatbot state properties we want to persist
    const stateToSave = {
      messages: state.messages,
      sessionId: state.sessionId,
      suggestions: state.suggestions,
      showSuggestions: state.showSuggestions,
      showQuickCategories: state.showQuickCategories,
      lastActivity: state.lastActivity,
      // Don't persist: isOpen, isLoading (these should reset on page load)
    };
    
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(PERSISTENCE_KEY, serializedState);
  } catch (error) {
    console.error('Error saving chatbot state to localStorage:', error);
  }
};

// Middleware to automatically save chatbot state changes
export const chatbotPersistenceMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Only save on chatbot-related actions
  if (action.type?.startsWith('chatbot/')) {
    const state = store.getState();
    if (state.chatbot) {
      saveChatbotState(state.chatbot);
    }
  }
  
  return result;
};

// Clear persisted state (useful for logout or reset)
export const clearPersistedChatbotState = () => {
  try {
    localStorage.removeItem(PERSISTENCE_KEY);
    console.log('🗑️ Cleared persisted chatbot state');
  } catch (error) {
    console.error('Error clearing persisted chatbot state:', error);
  }
};
