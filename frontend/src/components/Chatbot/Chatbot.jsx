import React from 'react';
import useChatbot from '../../hooks/useChatbot';
import ChatToggleButton from './components/ChatToggleButton';
import ChatWindow from './components/ChatWindow';
import './Chatbot.css';

const Chatbot = () => {
    const chatbotProps = useChatbot();

    return (
        <div className="chatbot-container">
            <ChatToggleButton
                isOpen={chatbotProps.isOpen}
                handleToggleChatbot={chatbotProps.handleToggleChatbot}
            />
            <ChatWindow {...chatbotProps} />
        </div>
    );
};

export default Chatbot;
