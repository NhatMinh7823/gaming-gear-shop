import React from 'react';

const ChatInput = ({ inputMessage, setInputMessage, handleKeyPress, handleSendMessage, isLoading, isProcessing, handleCancelRequest, inputRef }) => {
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
                {isProcessing ? (
                    <button
                        onClick={handleCancelRequest}
                        className="cancel-button"
                        title="Dừng yêu cầu"
                    >
                        ⏹️
                    </button>
                ) : (
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={isLoading || !inputMessage.trim()}
                        className="send-button"
                    >
                        Gửi
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatInput;
