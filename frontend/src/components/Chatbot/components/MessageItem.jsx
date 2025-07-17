import React from 'react';
import { formatMessageText } from '../../../utils/textFormatter';

const MessageItem = ({ message }) => {
    const senderClass = message.sender === 'user' ? 'user' : 'bot';

    return (
        <div className={`message-item ${senderClass}`}>
            <div className={`message-bubble ${senderClass}`}>
                {message.sender === 'bot' ? formatMessageText(message.text) : message.text}
            </div>
        </div>
    );
};

export default MessageItem;
