import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import gamingChatbot from "../services/chatbotService";
import {
  setWelcomeMessage,
  addMessage,
  setLoading,
  setProcessing,
  setCurrentRequestId,
  cancelCurrentRequest,
  toggleChatbot,
  setSessionId,
  clearChat,
  setSuggestions,
  toggleSuggestions,
  toggleQuickCategories,
  updateLastActivity,
} from "../redux/slices/chatbotSlice";

const useChatbot = () => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const lastBotMessageRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const dispatch = useDispatch();

  // Get state from Redux
  const { userInfo } = useSelector((state) => state.user);
  const {
    messages,
    isOpen,
    isLoading,
    isProcessing,
    currentRequestId,
    sessionId,
    suggestions,
    showSuggestions,
    showQuickCategories,
  } = useSelector((state) => state.chatbot);

  // Initialize chatbot
  useEffect(() => {
    if (messages.length === 0) {
      dispatch(setWelcomeMessage({ userInfo }));
    }
    if (showSuggestions && suggestions.length === 0) {
      dispatch(setSuggestions(gamingChatbot.getQuickResponses()));
    }
    if (sessionId) {
      gamingChatbot.sessionId = sessionId;
    }
  }, [
    dispatch,
    userInfo,
    messages.length,
    showSuggestions,
    suggestions.length,
    sessionId,
  ]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    // Scroll to the start of the last bot message if it exists, otherwise scroll to bottom
    if (lastBotMessageRef.current) {
      lastBotMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return;

    const validation = gamingChatbot.validateMessage(messageText);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const requestId = "req_" + Date.now();

    dispatch(setCurrentRequestId(requestId));
    dispatch(setProcessing(true));

    const userMessage = {
      id: "user_" + Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    dispatch(addMessage(userMessage));
    setInputMessage("");
    dispatch(setLoading(true));

    try {
      const response = await gamingChatbot.sendMessage(
        messageText,
        userInfo,
        abortControllerRef.current.signal
      );

      // Check if request was cancelled
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      const botMessage = {
        id: "bot_" + Date.now(),
        text: response.response,
        sender: "bot",
        timestamp: response.timestamp,
        success: !response.error,
      };

      dispatch(addMessage(botMessage));

      if (response.sessionId && response.sessionId !== sessionId) {
        dispatch(setSessionId(response.sessionId));
      }

      if (showSuggestions) {
        const followUpSuggestions = gamingChatbot.getSuggestedQuestions(
          response.response
        );
        if (followUpSuggestions.length > 0) {
          dispatch(setSuggestions(followUpSuggestions));
        }
      }

      dispatch(updateLastActivity());
    } catch (error) {
      // Don't show error if request was cancelled
      if (
        error.name === "AbortError" ||
        abortControllerRef.current?.signal.aborted
      ) {
        return;
      }

      const errorMessage = {
        id: "error_" + Date.now(),
        text: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ support.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        success: false,
      };
      dispatch(addMessage(errorMessage));
    } finally {
      dispatch(setLoading(false));
      dispatch(setProcessing(false));
      dispatch(setCurrentRequestId(null));
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleCategoryClick = (categoryName) => {
    const categoryQuestions = {
      "Chuột Gaming": "Tìm cho tôi 1 số mẫu chuột có đánh giá cao",
      "Bàn phím Gaming": "Bàn phím cơ rẻ nhất?",
      "Tai nghe Gaming": "Tai nghe gaming trong tầm giá 3 triệu",
      "Màn hình Gaming": "Màn hình 144Hz",
      "Laptop Gaming": "Laptop gaming màn hình 16 inch, có RTX 4060",
      "PC Gaming": "PC tầm khoảng 30 triệu",
    };
    handleSendMessage(
      categoryQuestions[categoryName] || `Tôi quan tâm đến ${categoryName}`
    );
  };

  const handleClearChat = () => {
    dispatch(clearChat({ userInfo }));
    gamingChatbot.clearHistory();
    if (showSuggestions) {
      dispatch(setSuggestions(gamingChatbot.getQuickResponses()));
    }
  };

  const handleToggleSuggestions = () => {
    dispatch(toggleSuggestions());
    if (!showSuggestions) {
      dispatch(setSuggestions(gamingChatbot.getQuickResponses()));
    }
  };

  const handleToggleChatbot = () => {
    dispatch(toggleChatbot());
  };

  const handleToggleQuickCategories = () => {
    dispatch(toggleQuickCategories());
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current && isProcessing) {
      abortControllerRef.current.abort();
      dispatch(cancelCurrentRequest());
      abortControllerRef.current = null;
    }
  };

  return {
    // State
    inputMessage,
    messages,
    isOpen,
    isLoading,
    isProcessing,
    currentRequestId,
    suggestions,
    showSuggestions,
    showQuickCategories,

    // Refs
    messagesEndRef,
    lastBotMessageRef,
    inputRef,
    // Handlers
    setInputMessage,
    handleSendMessage,
    handleKeyPress,
    handleSuggestionClick,
    handleCategoryClick,
    handleClearChat,
    handleToggleSuggestions,
    handleToggleChatbot,
    handleToggleQuickCategories,
    handleCancelRequest,
  };
};

export default useChatbot;
