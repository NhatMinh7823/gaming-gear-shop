import React from 'react';

const IntermediateStep = ({ step }) => {
    const isThinking = step.tool === 'AI Thinking';
    const isRunning = step.status === 'running' || step.status === 'thinking';
    const containerClass = isThinking ? 'thinking' : 'tool';
    const spinnerClass = isThinking ? 'thinking' : 'tool';

    return (
        <div className="message-item bot">
            <div className={`intermediate-step-container ${containerClass}`}>
                <div className="step-message">
                    <p>
                        {isRunning ? (
                            <span className={`spinner ${spinnerClass}`}></span>
                        ) : (
                            <span className="completed-icon">✅</span>
                        )}
                        <span>
                            {isThinking ? (
                                <>🧠 <em>Đang suy nghĩ...</em></>
                            ) : (
                                <>🔧 Đang sử dụng: <code className="tool-name">{step.tool}</code></>
                            )}
                        </span>
                    </p>
                    {step.status === 'completed' && step.output && !isThinking && (
                        <div className="step-output-container">
                            <strong>Kết quả:</strong>
                            <div className="step-output">
                                <pre>
                                    {typeof step.output === 'string'
                                        ? step.output.length > 200
                                            ? step.output.substring(0, 200) + '...'
                                            : step.output
                                        : JSON.stringify(step.output, null, 2)
                                    }
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntermediateStep;
