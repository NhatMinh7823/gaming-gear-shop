import React from 'react';

const ChatInput = ({ inputMessage, setInputMessage, handleKeyPress, handleSendMessage, isLoading, inputRef }) => {
    return (
        <div className="chat-input-container">
            <div className="chat-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập câu hỏi của bạn..."
                    disabled={isLoading}
                    className="chat-input"
                />
                <button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                    className="send-button"
                >
                    Gửi
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
