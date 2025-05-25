import React, { useState, useEffect, useRef } from 'react';
import { gamingChatbot } from '../../services/chatbotService_direct';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [categories] = useState(gamingChatbot.getGamingCategories());
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Load quick suggestions
        const loadSuggestions = async () => {
            const quickSuggestions = await gamingChatbot.getQuickSuggestions();
            setSuggestions(quickSuggestions);
        };
        loadSuggestions();

        // Welcome message
        setMessages([{
            id: Date.now(),
            text: "Chào bạn! 👋 Tôi là trợ lý AI của Gaming Gear Shop. Tôi có thể giúp bạn tư vấn về thiết bị gaming, so sánh sản phẩm, và tìm setup phù hợp với budget. Bạn cần hỗ trợ gì?",
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

        const userMessage = {
            id: Date.now(),
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
                id: Date.now() + 1,
                text: response.message,
                sender: 'bot',
                timestamp: new Date(),
                success: response.success
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
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

    const handleCategoryClick = (category) => {
        const categoryQuestions = {
            "Chuột Gaming": "Tư vấn chuột gaming phù hợp với nhu cầu và budget của tôi",
            "Bàn phím Gaming": "Giúp tôi chọn bàn phím gaming tốt nhất",
            "Tai nghe Gaming": "Tư vấn tai nghe gaming có chất lượng âm thanh tốt",
            "Màn hình Gaming": "Tôi cần màn hình gaming với tần số quét cao",
            "Laptop Gaming": "Tư vấn laptop gaming trong tầm giá",
            "Setup Gaming": "Hỗ trợ tôi setup gaming hoàn chỉnh"
        };

        handleSendMessage(categoryQuestions[category.name] || `Tôi quan tâm đến ${category.name}`);
    };

    const clearChat = () => {
        setMessages([{
            id: Date.now(),
            text: "Cuộc trò chuyện đã được làm mới! Tôi có thể giúp gì cho bạn? 🎮",
            sender: 'bot',
            timestamp: new Date()
        }]);
        gamingChatbot.clearMemory();
    };

    const formatTime = (timestamp) => {
        return new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(timestamp);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* Chat Toggle Button */}
            <button
                className={`w-16 h-16 rounded-full border-none bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl cursor-pointer shadow-lg hover:shadow-xl transform transition-all duration-300 ease-in-out flex items-center justify-center ${isOpen ? 'rotate-45' : 'hover:scale-110'}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle chat"
            >
                {isOpen ? '✕' : '🎮'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slideUp border border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold m-0">Gaming Gear Assistant</h3>
                            <span className="text-sm opacity-90 flex items-center">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                Online
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={clearChat}
                                className="bg-white bg-opacity-20 hover:bg-opacity-30 border-none text-white p-2 rounded text-sm cursor-pointer transition-all"
                                title="Clear chat"
                            >
                                🗑️
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="bg-white bg-opacity-20 hover:bg-opacity-30 border-none text-white p-2 rounded text-sm cursor-pointer transition-all"
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
                            >
                                <div className={`max-w-[80%] p-3 rounded-2xl word-wrap break-words leading-relaxed ${message.sender === 'user'
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm'
                                        : message.success === false
                                            ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-sm'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                    }`}>
                                    {message.text}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 px-2">
                                    {formatTime(message.timestamp)}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start animate-fadeIn">
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm p-3 shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Categories - Show when few messages */}
                    {messages.length <= 1 && (
                        <div className="p-4 bg-white border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-3">Danh mục sản phẩm:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {categories.map((category, index) => (
                                    <button
                                        key={index}
                                        className="flex items-center p-2 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-sm cursor-pointer transition-all duration-200"
                                        onClick={() => handleCategoryClick(category)}
                                    >
                                        <span className="mr-2">{category.icon}</span>
                                        <span className="text-gray-700">{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Suggestions */}
                    {messages.length <= 1 && (
                        <div className="p-4 bg-white border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-3">Câu hỏi gợi ý:</p>
                            <div className="space-y-2">
                                {suggestions.slice(0, 3).map((suggestion, index) => (
                                    <button
                                        key={index}
                                        className="w-full p-2 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-sm cursor-pointer transition-all duration-200 text-gray-700"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex p-4 bg-white border-t border-gray-200 gap-3 items-end">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Nhập tin nhắn..."
                            disabled={isLoading}
                            rows="1"
                            className="flex-1 border border-gray-300 rounded-2xl px-4 py-2 text-sm font-inherit resize-none max-h-24 outline-none focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={isLoading || !inputMessage.trim()}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed border-none rounded-full w-10 h-10 text-white cursor-pointer text-lg transition-all duration-200 flex items-center justify-center disabled:hover:transform-none hover:scale-105"
                        >
                            📤
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .chatbot-container {
            bottom: 10px;
            right: 10px;
          }
          
          .chat-window {
            width: 320px;
            height: 500px;
            bottom: 70px;
          }
        }
      `}</style>
        </div>
    );
};

export default Chatbot;
