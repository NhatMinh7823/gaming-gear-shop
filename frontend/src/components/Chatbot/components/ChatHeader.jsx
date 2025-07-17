import React from 'react';

const ChatHeader = ({ showSuggestions, showQuickCategories, handleToggleSuggestions, handleToggleQuickCategories, handleClearChat }) => {
    return (
        <>
            <div className="chat-header">
                <div className="chat-header-title">
                    <h3>Gaming Gear Assistant</h3>
                    <p>Tư vấn thiết bị gaming 24/7</p>
                </div>

                {/* Control Buttons */}
                <div className="chat-header-controls">
                    {/* Suggestions Toggle */}
                    <button
                        onClick={handleToggleSuggestions}
                        title={showSuggestions ? "Tắt gợi ý" : "Bật gợi ý"}
                        className={`settings-toggle chat-header-button ${showSuggestions ? 'suggestions-toggle-on' : 'suggestions-toggle-off'}`}
                    >
                        <span className="icon">
                            {showSuggestions ? '💡' : '🔆'}
                        </span>
                        <span className="text">
                            {showSuggestions ? 'ON' : 'OFF'}
                        </span>
                    </button>

                    {/* Quick Categories Toggle */}
                    <button
                        onClick={handleToggleQuickCategories}
                        title={showQuickCategories ? "Ẩn danh mục" : "Hiện danh mục"}
                        className={`settings-toggle quick-categories-toggle ${showQuickCategories ? 'toggled-on' : ''}`}
                    >
                        {showQuickCategories ? '📂' : '📁'}
                    </button>

                    {/* Clear Chat Button */}
                    <button
                        onClick={handleClearChat}
                        title="Xóa cuộc trò chuyện"
                        className="clear-chat-button"
                    >
                        🗑️
                    </button>
                </div>
            </div>
            {/* Settings Status Bar */}
            <div className="status-bar">
                <span>
                    Gợi ý: <strong className={showSuggestions ? 'status-bar-status-on' : 'status-bar-status-off'}>
                        {showSuggestions ? 'BẬT' : 'TẮT'}
                    </strong>
                </span>
                <span>
                    Danh mục: <strong className={showQuickCategories ? 'status-bar-status-on' : 'status-bar-status-off'}>
                        {showQuickCategories ? 'HIỆN' : 'ẨN'}
                    </strong>
                </span>
            </div>
        </>
    );
};

export default ChatHeader;
