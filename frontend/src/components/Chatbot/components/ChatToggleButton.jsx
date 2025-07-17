import React from 'react';

const ChatToggleButton = ({ isOpen, handleToggleChatbot }) => {
    return (
        <button
            onClick={handleToggleChatbot}
            className="chatbot-toggle"
        >
            {isOpen ? '✕' : '💬'}
        </button>
    );
};

export default ChatToggleButton;
