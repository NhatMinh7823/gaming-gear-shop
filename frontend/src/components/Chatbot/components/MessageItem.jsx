import React from 'react';
import { formatMessageText } from '../../../utils/textFormatter';

const MessageItem = React.forwardRef(({ message }, ref) => {
    const senderClass = message.sender === 'user' ? 'user' : message.sender === 'system' ? 'system' : 'bot';

    return (
        <div className={`message-item ${senderClass}`} ref={ref}>
            <div className={`message-bubble ${senderClass}`}>
                {message.sender === 'bot' ? formatMessageText(message.text) : message.text}
            </div>
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
