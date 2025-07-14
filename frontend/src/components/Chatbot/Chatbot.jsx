import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import gamingChatbot from '../../services/chatbotService';
import { formatMessageText } from '../../utils/textFormatter';
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
    updateLastActivity
} from '../../redux/slices/chatbotSlice';
import './Chatbot.css';

const Chatbot = () => {
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
        showQuickCategories
    } = useSelector((state) => state.chatbot);

    // Initialize chatbot on component mount
    useEffect(() => {
        // Set welcome message if no messages exist
        if (messages.length === 0) {
            dispatch(setWelcomeMessage({ userInfo }));
        }

        // Load quick suggestions if enabled
        if (showSuggestions && suggestions.length === 0) {
            dispatch(setSuggestions(gamingChatbot.getQuickResponses()));
        }

        // Sync session ID with service
        if (sessionId) {
            gamingChatbot.sessionId = sessionId;
        }
    }, [dispatch, userInfo, messages.length, showSuggestions, suggestions.length, sessionId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-scroll to bottom when chatbot opens
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

        // Validate message
        const validation = gamingChatbot.validateMessage(messageText);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        const userMessage = {
            id: 'user_' + Date.now(),
            text: messageText,
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        // Add user message to Redux store
        dispatch(addMessage(userMessage));
        setInputMessage('');
        dispatch(setLoading(true));

        try {
            console.log("🔍 Frontend - userInfo before sending:", userInfo);
            console.log("🔍 Frontend - userInfo.id:", userInfo?.id);
            console.log("🔍 Frontend - userInfo._id:", userInfo?._id);

            const response = await gamingChatbot.sendMessage(messageText, userInfo);

            const botMessage = {
                id: 'bot_' + Date.now(),
                text: response.response,
                sender: 'bot',
                timestamp: response.timestamp,
                success: !response.error
            };

            // Add bot message to Redux store
            dispatch(addMessage(botMessage));

            // Update session ID if provided
            if (response.sessionId && response.sessionId !== sessionId) {
                dispatch(setSessionId(response.sessionId));
            }

            // Get suggested follow-up questions if suggestions are enabled
            if (showSuggestions) {
                const followUpSuggestions = gamingChatbot.getSuggestedQuestions(response.response);
                if (followUpSuggestions.length > 0) {
                    dispatch(setSuggestions(followUpSuggestions));
                }
            }

            // Update last activity
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
            // If turning on suggestions, load quick responses
            dispatch(setSuggestions(gamingChatbot.getQuickResponses()));
        }
    };

    const handleToggleChatbot = () => {
        dispatch(toggleChatbot());
    };

    const quickCategories = [
        { name: "Chuột Gaming", icon: "🖱️", color: "#ef4444", desc: "DPI cao, ergonomic" },
        { name: "Bàn phím Gaming", icon: "⌨️", color: "#3b82f6", desc: "Mechanical, RGB" },
        { name: "Tai nghe Gaming", icon: "🎧", color: "#8b5cf6", desc: "Surround, mic clear" },
        { name: "Màn hình Gaming", icon: "🖥️", color: "#10b981", desc: "High refresh, low lag" },
        { name: "Laptop Gaming", icon: "💻", color: "#f59e0b", desc: "Hiệu năng mạnh" },
        { name: "Setup Gaming", icon: "🎮", color: "#ec4899", desc: "Combo hoàn chỉnh" }
    ];

    return (
        <div className="chatbot-container">
            {/* Chatbot Toggle Button */}
            <button
                onClick={handleToggleChatbot}
                className="chatbot-toggle"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    transition: 'all 0.3s ease'
                }}
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div
                    className="chat-window"
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        right: '20px',
                        width: '350px',
                        height: '500px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <div
                        className="chat-header"
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                                Gaming Gear Assistant
                            </h3>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                                Tư vấn thiết bị gaming 24/7
                            </p>
                        </div>

                        {/* Control Buttons */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {/* Suggestions Toggle */}
                            <button
                                onClick={handleToggleSuggestions}
                                title={showSuggestions ? "Tắt gợi ý" : "Bật gợi ý"}
                                className="settings-toggle"
                                style={{
                                    background: showSuggestions ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    color: 'white',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <span style={{ fontSize: '14px' }}>
                                    {showSuggestions ? '💡' : '🔆'}
                                </span>
                                <span style={{ fontSize: '10px' }}>
                                    {showSuggestions ? 'ON' : 'OFF'}
                                </span>
                            </button>

                            {/* Quick Categories Toggle */}
                            <button
                                onClick={() => dispatch(toggleQuickCategories())}
                                title={showQuickCategories ? "Ẩn danh mục" : "Hiện danh mục"}
                                className="settings-toggle"
                                style={{
                                    background: showQuickCategories ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    color: 'white',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {showQuickCategories ? '📂' : '📁'}
                            </button>

                            {/* Clear Chat Button */}
                            <button
                                onClick={handleClearChat}
                                title="Xóa cuộc trò chuyện"
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>

                    {/* Settings Status Bar */}
                    <div
                        className="status-bar"
                        style={{
                            backgroundColor: '#f8fafc',
                            padding: '6px 16px',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '11px',
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <span>
                            Gợi ý: <strong style={{ color: showSuggestions ? '#10b981' : '#ef4444' }}>
                                {showSuggestions ? 'BẬT' : 'TẮT'}
                            </strong>
                        </span>
                        <span>
                            Danh mục: <strong style={{ color: showQuickCategories ? '#10b981' : '#ef4444' }}>
                                {showQuickCategories ? 'HIỆN' : 'ẨN'}
                            </strong>
                        </span>
                    </div>

                    {/* Messages Area */}
                    <div
                        className="messages-container"
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className="message-item"
                                style={{
                                    display: 'flex',
                                    justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '80%',
                                        padding: '10px 14px',
                                        borderRadius: '18px',
                                        backgroundColor: message.sender === 'user' ? '#3b82f6' : '#f3f4f6',
                                        color: message.sender === 'user' ? 'white' : '#374151',
                                        fontSize: '14px',
                                        lineHeight: '1.4',
                                        wordWrap: 'break-word'
                                    }}
                                >
                                    {message.sender === 'bot' ? formatMessageText(message.text) : message.text}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div
                                    className="loading-dots"
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '18px',
                                        backgroundColor: '#f3f4f6',
                                        color: '#6b7280',
                                        fontSize: '14px'
                                    }}
                                >
                                    Đang trả lời...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Categories */}
                    {showQuickCategories && messages.length <= 1 && (
                        <div className="quick-categories" style={{ padding: '0 16px 8px' }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>
                                📂 Danh mục phổ biến:
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}
                            >
                                {quickCategories.map((category) => (
                                    <button
                                        key={category.name}
                                        onClick={() => handleCategoryClick(category.name)}
                                        className="category-button"
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '12px',
                                            border: `2px solid ${category.color || '#e5e7eb'}`,
                                            backgroundColor: 'white',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            color: category.color || '#374151'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                            <span style={{ fontSize: '16px' }}>{category.icon}</span>
                                            <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{category.name}</span>
                                            {category.desc && (
                                                <span style={{ fontSize: '8px', opacity: 0.7, fontWeight: 'normal' }}>
                                                    {category.desc}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{ padding: '0 16px 8px' }}>
                            <div className="suggestion-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>💡 Gợi ý cho bạn:</span>
                                <button
                                    onClick={handleToggleSuggestions}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#6b7280',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        backgroundColor: '#f3f4f6'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {suggestions.slice(0, 3).map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="suggestion-button"
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #3b82f6',
                                            backgroundColor: '#f0f9ff',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            color: '#1e40af',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div
                        style={{
                            padding: '16px',
                            borderTop: '1px solid #e5e7eb'
                        }}
                    >
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Nhập câu hỏi của bạn..."
                                disabled={isLoading}
                                className="chat-input"
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '20px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isLoading || !inputMessage.trim()}
                                className="send-button"
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                                    opacity: inputMessage.trim() ? 1 : 0.5,
                                    fontSize: '14px'
                                }}
                            >
                                Gửi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
