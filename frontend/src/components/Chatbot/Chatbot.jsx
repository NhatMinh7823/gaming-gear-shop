import React, { useState, useEffect, useRef } from 'react';
import { gamingChatbot } from '../../services/chatbotService';
// import { gamingChatbot } from '../../services/chatbotService_direct';

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

        // Hàm xử lý định dạng Markdown thành HTML
    const formatMarkdown = (text) => {
        if (!text) return '';
        
        // Xử lý nhiều xuống dòng liên tiếp thành một xuống dòng duy nhất (thay vì hai như trước)
        let formattedText = text.replace(/\n{2,}/g, '\n');
    
        // Xử lý in đậm: **text** -> <strong>text</strong>
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
        // Xử lý nghiêng: *text* -> <em>text</em>
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
        // Xử lý xuống dòng: \n -> <br>
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        // Xử lý danh sách đánh dấu (bullet lists)
        const lines = formattedText.split('<br>');
        let inList = false;
        let processedLines = [];
    
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Kiểm tra xem dòng có bắt đầu bằng "- " hoặc "* " không
            if (line.trim().match(/^[-*]\s+/)) {
                // Nếu chưa trong danh sách, bắt đầu danh sách mới
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
                // Chuyển dòng thành mục danh sách
                processedLines.push('<li>' + line.trim().substring(2) + '</li>');
            } else {
                // Nếu đang trong danh sách và gặp dòng không phải danh sách, kết thúc danh sách
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                // Thêm dòng không phải danh sách vào kết quả
                processedLines.push(line);
            }
        }
    
        // Nếu kết thúc văn bản mà vẫn còn trong danh sách, đóng thẻ danh sách
        if (inList) {
            processedLines.push('</ul>');
        }
    
        formattedText = processedLines.join('<br>');
        
        // Đảm bảo chỉ có tối đa một <br> liên tiếp
        formattedText = formattedText.replace(/<br>\s*<br>+/g, '<br>');
    
        return formattedText;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* Chat Toggle Button */}
            <button
                className={`w-12 h-12 rounded-full border-none bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl cursor-pointer shadow-lg hover:shadow-xl transform transition-all duration-300 ease-in-out flex items-center justify-center ${isOpen ? 'rotate-45' : 'hover:scale-110'}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle chat"
            >
                {isOpen ? '✕' : '🎮'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 h-[450px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slideUp border border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2.5 flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-semibold m-0">Gaming Gear Assistant</h3>
                            <span className="text-xs opacity-90 flex items-center">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                                Online
                            </span>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={clearChat}
                                className="bg-white bg-opacity-20 hover:bg-opacity-30 border-none text-white p-1.5 rounded text-xs cursor-pointer transition-all"
                                title="Clear chat"
                            >
                                🗑️
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="bg-white bg-opacity-20 hover:bg-opacity-30 border-none text-white p-1.5 rounded text-xs cursor-pointer transition-all"
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-3">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
                            >
                                <div className={`max-w-[90%] p-2.5 rounded-2xl word-wrap break-words leading-snug ${message.sender === 'user'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm'
                                    : message.success === false
                                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(message.text) }}
                                />
                                <div className="text-xs text-gray-500 mt-0.5 px-1">
                                    {formatTime(message.timestamp)}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start animate-fadeIn">
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm p-2.5 shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Categories - Show when few messages */}
                    {messages.length <= 1 && (
                        <div className="p-2 bg-white border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-700 mb-1.5">Danh mục sản phẩm:</p>
                            <div className="flex overflow-x-auto pb-1.5 gap-1.5 hide-scrollbar">
                                {categories.map((category, index) => (
                                    <button
                                        key={index}
                                        className="flex items-center p-1.5 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-xs cursor-pointer transition-all whitespace-nowrap"
                                        onClick={() => handleCategoryClick(category)}
                                    >
                                        <span className="mr-1">{category.icon}</span>
                                        <span className="text-gray-700">{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Suggestions */}
                    {messages.length <= 1 && (
                        <div className="p-2 bg-white border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-700 mb-1.5">Câu hỏi gợi ý:</p>
                            <div className="space-y-1.5">
                                {suggestions.slice(0, 2).map((suggestion, index) => (
                                    <button
                                        key={index}
                                        className="w-full p-1.5 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-xs cursor-pointer transition-all text-gray-700"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex p-2.5 bg-white border-t border-gray-200 gap-2 items-end">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Nhập tin nhắn..."
                            disabled={isLoading}
                            rows="1"
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-sm font-inherit resize-none max-h-20 outline-none focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={isLoading || !inputMessage.trim()}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed border-none rounded-full w-8 h-8 text-white cursor-pointer text-base transition-all duration-200 flex items-center justify-center disabled:hover:transform-none hover:scale-105"
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
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* CSS cho định dạng Markdown */
        strong {
          font-weight: bold;
        }
        
        em {
          font-style: italic;
        }
        

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .chatbot-container {
            bottom: 10px;
            right: 10px;
          }
          
          .chat-window {
            width: 300px;
            height: 400px;
            bottom: 50px;
          }
        }
      `}</style>
        </div>
    );
};

export default Chatbot;
