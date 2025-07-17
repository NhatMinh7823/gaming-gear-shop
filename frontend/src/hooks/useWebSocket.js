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

const useWebSocket = (isOpen, sessionId) => {
    const dispatch = useDispatch();
    const socketRef = useRef(null);

    useEffect(() => {
        if (isOpen && sessionId) {
            // Connect to the server
            socketRef.current = io('http://localhost:5000');

            // Join a room based on sessionId
            socketRef.current.emit('join_session', sessionId);

            socketRef.current.on('connect', () => {
                console.log('🔌 Connected to WebSocket server with ID:', socketRef.current.id);
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
            });

            // Handle processing start event
            socketRef.current.on('processing:start', (data) => {
                console.log('🚀 Processing started:', data);
                // Clear any existing intermediate steps when new processing starts
                dispatch(clearIntermediateSteps());
            });

            socketRef.current.on('disconnect', () => {
                console.log('🔌 Disconnected from WebSocket server.');
            });

        } else {
            // Disconnect when chat is closed or sessionId is not available
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        }

        // Cleanup on component unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [isOpen, sessionId, dispatch]);

    return socketRef;
};

export default useWebSocket;
