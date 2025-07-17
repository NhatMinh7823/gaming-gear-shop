import React from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import QuickCategories from './QuickCategories';
import Suggestions from './Suggestions';
import ChatInput from './ChatInput';

const ChatWindow = (props) => {
    const {
        isOpen,
        messages,
        showQuickCategories,
        showSuggestions,
        suggestions,
        handleCategoryClick,
        handleSuggestionClick,
        handleToggleSuggestions,
        ...rest
    } = props;

    if (!isOpen) return null;

    return (
        <div className="chat-window">
            <ChatHeader {...props} />
            <MessageList {...props} />

            {showQuickCategories && messages.length <= 1 && (
                <QuickCategories onCategoryClick={handleCategoryClick} />
            )}

            {showSuggestions && suggestions.length > 0 && (
                <Suggestions
                    suggestions={suggestions}
                    onSuggestionClick={handleSuggestionClick}
                    onToggleSuggestions={handleToggleSuggestions}
                />
            )}

            <ChatInput {...props} />
        </div>
    );
};

export default ChatWindow;
