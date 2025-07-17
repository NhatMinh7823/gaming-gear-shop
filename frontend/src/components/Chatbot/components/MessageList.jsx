import React from 'react';
import MessageItem from './MessageItem';
import IntermediateStep from './IntermediateStep';

const MessageList = ({ messages, intermediateSteps, isLoading, messagesEndRef }) => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const regularMessages = (lastMessage && lastMessage.sender === 'bot' && !isLoading)
        ? messages.slice(0, messages.length - 1)
        : messages;

    return (
        <div className="messages-container">
            {/* Render regular messages */}
            {regularMessages.map((message) => (
                <MessageItem key={message.id} message={message} />
            ))}

            {/* Real-time step rendering */}
            {isLoading && intermediateSteps.map((step) => (
                <IntermediateStep key={step.id} step={step} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
                <div className="loading-indicator">
                    <div className="loading-dots">
                        Đang trả lời...
                    </div>
                </div>
            )}

            {/* Render the last message if it's from the bot and loading is complete */}
            {lastMessage && lastMessage.sender === 'bot' && !isLoading && (
                <MessageItem message={lastMessage} />
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
