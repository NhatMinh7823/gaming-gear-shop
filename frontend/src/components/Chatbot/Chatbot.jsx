import React, { useState, useEffect, useRef } from 'react';
import gamingChatbot from '../../services/chatbotService';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Load quick suggestions
        setSuggestions(gamingChatbot.getQuickResponses());

        // Welcome message
        setMessages([{
            id: 'welcome_' + Date.now(),
            text: "Chào bạn! 👋 Tôi là trợ lý AI của Gaming Gear Shop. Tôi có thể giúp bạn tư vấn về thiết bị gaming. Bạn cần hỗ trợ gì?",
            sender: 'bot',
            timestamp: new Date()
        }]);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await gamingChatbot.sendMessage(messageText);

            const botMessage = {
                id: 'bot_' + Date.now(),
                text: response.response,
                sender: 'bot',
                timestamp: new Date(response.timestamp),
                success: !response.error
            };

            setMessages(prev => [...prev, botMessage]);

            // Get suggested follow-up questions
            const followUpSuggestions = gamingChatbot.getSuggestedQuestions(response.response);
            if (followUpSuggestions.length > 0) {
                setSuggestions(followUpSuggestions);
            }

        } catch (error) {
            const errorMessage = {
                id: 'error_' + Date.now(),
                text: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ support.",
                sender: 'bot',
                timestamp: new Date(),
                success: false
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
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

    const clearChat = () => {
        setMessages([{
            id: 'welcome_' + Date.now(),
            text: "Chào bạn! 👋 Tôi có thể giúp gì cho bạn?",
            sender: 'bot',
            timestamp: new Date()
        }]);
        gamingChatbot.clearHistory();
        setSuggestions(gamingChatbot.getQuickResponses());
    };

    const quickCategories = [
        { name: "Chuột Gaming", icon: "🖱️" },
        { name: "Bàn phím Gaming", icon: "⌨️" },
        { name: "Tai nghe Gaming", icon: "🎧" },
        { name: "Màn hình Gaming", icon: "🖥️" },
        { name: "Laptop Gaming", icon: "💻" },
        { name: "Setup Gaming", icon: "🎮" }
    ];

    return (
        <div className="chatbot-container">
            {/* Chatbot Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
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
                            padding: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                                Gaming Gear Assistant
                            </h3>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                                Tư vấn thiết bị gaming 24/7
                            </p>
                        </div>
                        <button
                            onClick={clearChat}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            🗑️ Clear
                        </button>
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
                                    {message.text}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div
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
                    {messages.length <= 1 && (
                        <div style={{ padding: '0 16px 8px' }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>
                                Danh mục phổ biến:
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
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb',
                                            backgroundColor: 'white',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            color: '#374151'
                                        }}
                                    >
                                        {category.icon} {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div style={{ padding: '0 16px 8px' }}>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>
                                Gợi ý:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {suggestions.slice(0, 3).map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            backgroundColor: '#f9fafb',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            color: '#374151',
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
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Nhập câu hỏi của bạn..."
                                disabled={isLoading}
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
