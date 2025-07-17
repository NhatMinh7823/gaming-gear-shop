import React from 'react';

const Suggestions = ({ suggestions, onSuggestionClick, onToggleSuggestions }) => {
    return (
        <div className="suggestions-container">
            <div className="suggestion-header">
                <span className="suggestion-header-title">💡 Gợi ý cho bạn:</span>
                <button
                    onClick={onToggleSuggestions}
                    className="suggestion-close-button"
                >
                    ✕
                </button>
            </div>
            <div className="suggestion-list">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionClick(suggestion)}
                        className="suggestion-button"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Suggestions;
