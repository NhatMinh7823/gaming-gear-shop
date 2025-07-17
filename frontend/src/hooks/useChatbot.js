import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import gamingChatbot from '../services/chatbotService';
import {
    setWelcomeMessage,
    addMessage,
    setLoading,
    toggleChatbot,
    setSessionId,
    clearChat,
    setSuggestions,
    toggleSuggestions,
    toggleQuickCategories,
    updateLastActivity,
    clearIntermediateSteps,
} from '../redux/slices/chatbotSlice';
import useWebSocket from './useWebSocket';

const useChatbot = () => {
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const dispatch = useDispatch();

    // Get state from Redux
    const { userInfo } = useSelector((state) => state.user);
    const {
        messages,
        isOpen,
        isLoading,
        sessionId,
        suggestions,
        showSuggestions,
        showQuickCategories,
        intermediateSteps
    } = useSelector((state) => state.chatbot);

    // WebSocket connection
    useWebSocket(isOpen, sessionId);

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
    }, [dispatch, userInfo, messages.length, showSuggestions, suggestions.length, sessionId]);

    // Auto-scroll
    useEffect(() => {
        scrollToBottom();
    }, [messages, intermediateSteps]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (messageText = inputMessage) => {
        if (!messageText.trim()) return;

        const validation = gamingChatbot.validateMessage(messageText);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        dispatch(clearIntermediateSteps());

        const userMessage = {
            id: 'user_' + Date.now(),
            text: messageText,
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        dispatch(addMessage(userMessage));
        setInputMessage('');
        dispatch(setLoading(true));

        try {
            const response = await gamingChatbot.sendMessage(messageText, userInfo);

            const botMessage = {
                id: 'bot_' + Date.now(),
                text: response.response,
                sender: 'bot',
                timestamp: response.timestamp,
                success: !response.error,
                intermediateSteps: response.debugInfo?.intermediateSteps || []
            };

            dispatch(addMessage(botMessage));

            if (response.sessionId && response.sessionId !== sessionId) {
                dispatch(setSessionId(response.sessionId));
            }

            if (showSuggestions) {
                const followUpSuggestions = gamingChatbot.getSuggestedQuestions(response.response);
                if (followUpSuggestions.length > 0) {
                    dispatch(setSuggestions(followUpSuggestions));
                }
            }

            dispatch(updateLastActivity());

        } catch (error) {
            const errorMessage = {
                id: 'error_' + Date.now(),
                text: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ support.",
                sender: 'bot',
                timestamp: new Date().toISOString(),
                success: false
            };
            dispatch(addMessage(errorMessage));
        } finally {
            dispatch(setLoading(false));
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSuggestionClick = (suggestion) => {
        handleSendMessage(suggestion);
    };

    const handleCategoryClick = (categoryName) => {
        const categoryQuestions = {
            "Chuột Gaming": "Tư vấn chuột gaming phù hợp với nhu cầu và budget của tôi",
            "Bàn phím Gaming": "Giúp tôi chọn bàn phím gaming tốt nhất",
            "Tai nghe Gaming": "Tư vấn tai nghe gaming có chất lượng âm thanh tốt",
            "Màn hình Gaming": "Tôi cần màn hình gaming với tần số quét cao",
            "Laptop Gaming": "Tư vấn laptop gaming trong tầm giá",
            "Setup Gaming": "Hỗ trợ tôi setup gaming hoàn chỉnh"
        };
        handleSendMessage(categoryQuestions[categoryName] || `Tôi quan tâm đến ${categoryName}`);
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

    return {
        // State
        inputMessage,
        messages,
        isOpen,
        isLoading,
        suggestions,
        showSuggestions,
        showQuickCategories,
        intermediateSteps,
        // Refs
        messagesEndRef,
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
    };
};

export default useChatbot;
