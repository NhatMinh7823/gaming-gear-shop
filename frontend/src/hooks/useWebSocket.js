import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import io from 'socket.io-client';
import {
    addIntermediateStep,
    updateIntermediateStep,
    clearIntermediateSteps,
    addThinkingStep,
    updateThinkingStep,
} from '../redux/slices/chatbotSlice';

const useWebSocket = (isOpen, sessionId, userId = null) => {
    const dispatch = useDispatch();
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const attemptReconnection = () => {
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.log('🔌 Max reconnection attempts reached');
            return;
        }

        reconnectAttemptsRef.current += 1;
        console.log(`🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (isOpen && sessionId) {
                connectSocket();
            }
        }, reconnectDelay * reconnectAttemptsRef.current);
    };

    const connectSocket = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        // Connect to the server with reconnection options
        socketRef.current = io('http://localhost:5000', {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });

        // Join a room based on sessionId
        const joinData = userId ? { sessionId, userId } : sessionId;
        socketRef.current.emit('join_session', joinData);

        socketRef.current.on('connect', () => {
             console.log('🔌 Connected to WebSocket server with ID:', socketRef.current.id);
             reconnectAttemptsRef.current = 0; // Reset reconnection attempts on successful connection
         });

         // Handle reconnection events
         socketRef.current.on('reconnection_success', (data) => {
             console.log('✅ Session reconnected successfully:', data);
             reconnectAttemptsRef.current = 0;
         });

         socketRef.current.on('reconnection_failed', (data) => {
             console.log('❌ Session reconnection failed:', data);
         });

            // Handle tool start events
            socketRef.current.on('tool:start', (data) => {
                console.log('⚡ Tool Start:', data);
                dispatch(addIntermediateStep({
                    id: data.id,
                    tool: data.tool,
                    input: data.input,
                    status: 'running',
                    runId: data.runId,
                }));
            });

            // Handle tool end events
            socketRef.current.on('tool:end', (data) => {
                console.log('✅ Tool End:', data);
                dispatch(updateIntermediateStep({
                    id: data.id,
                    runId: data.runId,
                    output: data.output,
                    status: 'completed',
                }));
            });

            // Handle agent action events
            socketRef.current.on('agent:action', (data) => {
                console.log('🤖 Agent Action:', data);
                dispatch(addIntermediateStep({
                    id: data.id,
                    tool: data.tool,
                    input: data.input,
                    status: 'running',
                    runId: data.runId,
                }));
            });

            // Handle agent end events
            socketRef.current.on('agent:end', (data) => {
                console.log('🤖 Agent End:', data);
                // Agent end doesn't need specific handling, tools will handle their own completion
            });

            // Handle LLM thinking events
            socketRef.current.on('llm:start', (data) => {
                console.log('🧠 LLM Start:', data);
                dispatch(addThinkingStep({
                    id: data.id,
                    runId: data.runId,
                    status: 'thinking',
                }));
            });

            // Handle LLM end events
            socketRef.current.on('llm:end', (data) => {
                console.log('🧠 LLM End:', data);
                dispatch(updateThinkingStep({
                    id: data.id,
                    runId: data.runId,
                    status: 'completed',
                }));
            });

            // Handle session joined confirmation
            socketRef.current.on('session_joined', (data) => {
                console.log('✅ Session joined:', data);
                if (data.reconnected) {
                    console.log('🔄 Successfully reconnected to existing session');
                }
            });

            // Handle processing start event
            socketRef.current.on('processing:start', (data) => {
                console.log('🚀 Processing started:', data);
                // Clear any existing intermediate steps when new processing starts
                dispatch(clearIntermediateSteps());
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('🔌 Disconnected from WebSocket server. Reason:', reason);
                
                // Attempt reconnection for certain disconnect reasons
                if (reason === 'io server disconnect') {
                    // Server initiated disconnect, don't reconnect automatically
                    console.log('🔌 Server initiated disconnect, not attempting reconnection');
                } else if (reason === 'transport close' || reason === 'ping timeout') {
                    // Network issues, attempt reconnection
                    console.log('🔄 Network issue detected, attempting reconnection...');
                    attemptReconnection();
                }
            });

            socketRef.current.on('connect_error', (error) => {
                console.log('🔌 Connection error:', error.message);
                attemptReconnection();
            });
        };
    
    useEffect(() => {
        if (isOpen && sessionId) {
            connectSocket();
        } else {
            // Disconnect when chat is closed or sessionId is not available
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            
            // Clear any pending reconnection attempts
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            reconnectAttemptsRef.current = 0;
        }

        // Cleanup on component unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [isOpen, sessionId, userId, dispatch]);

    return socketRef;
};

export default useWebSocket;
