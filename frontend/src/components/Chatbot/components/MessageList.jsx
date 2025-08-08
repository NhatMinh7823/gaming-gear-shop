import React from 'react';
import MessageItem from './MessageItem';

const MessageList = ({ messages, isLoading, messagesEndRef, lastBotMessageRef }) => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const regularMessages = (lastMessage && lastMessage.sender === 'bot' && !isLoading)
        ? messages.slice(0, messages.length - 1)
        : messages;

    return (
        <div className="messages-container">
            {/* Render regular messages */}
            {regularMessages.map((message, index) => {
                // Check if this is the last bot message in regular messages
                const isLastBotMessage = message.sender === 'bot' && 
                    index === regularMessages.length - 1 && 
                    (!lastMessage || lastMessage.sender !== 'bot' || isLoading);
                
                return (
                    <MessageItem 
                        key={message.id} 
                        message={message} 
                        ref={isLastBotMessage ? lastBotMessageRef : null}
                    />
                );
            })}



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
                <MessageItem message={lastMessage} ref={lastBotMessageRef} />
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
