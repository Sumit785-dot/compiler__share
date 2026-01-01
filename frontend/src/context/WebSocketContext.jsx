/**
 * WebSocket Context
 * Manages real-time WebSocket connections for coding sessions
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

// SECURITY: Use environment variable for WebSocket URL, fallback to window.location.host (handles ngrok & local ports)
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// const WS_BASE_URL = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
const WS_BASE_URL = 'ws://127.0.0.1:8001'; // DEBUG: Hardcoded to bypass proxy

export function WebSocketProvider({ children }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [sessionCode, setSessionCode] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const listeners = useRef(new Map());
    const reconnectTimeout = useRef(null);
    const heartbeatInterval = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Connect to a session
    const connect = useCallback((code) => {
        if (!user || !code) {
            console.warn('Cannot connect: user or code missing');
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.warn('Cannot connect: no access token');
            return;
        }

        // Close existing connection
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            socket.close(1000, 'Reconnecting');
        }

        const wsUrl = `${WS_BASE_URL}/ws/session/${code}/?token=${token}`;
        console.log('🔌 Connecting to WebSocket:', wsUrl); // DEBUG
        // OPTIMIZATION: Connecting to WebSocket session
        const ws = new WebSocket(wsUrl);

        ws.onopen = (event) => {
            console.log('✅ WebSocket Connected'); // DEBUG
            // OPTIMIZATION: WebSocket connected
            setIsConnected(true);
            setSessionCode(code);
            reconnectAttempts.current = 0;

            // Start heartbeat
            heartbeatInterval.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'heartbeat' }));
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);

                // OPTIMIZATION: Connection confirmed from server
                if (data.type === 'connection_confirmed') {
                    // WebSocket connection confirmed
                }

                // Call registered listeners for this message type
                const typeListeners = listeners.current.get(data.type) || [];
                typeListeners.forEach(callback => callback(data));

                // Call 'all' listeners
                const allListeners = listeners.current.get('all') || [];
                allListeners.forEach(callback => callback(data));
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };

        ws.onclose = (event) => {
            console.log('🔴 WebSocket Closed:', event.code, event.reason); // DEBUG
            // OPTIMIZATION: WebSocket closed
            setIsConnected(false);

            // Clear heartbeat
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
                heartbeatInterval.current = null;
            }

            // Don't reconnect on:
            // - Normal close (1000)
            // - Auth failure (4001)
            // - Max reconnect attempts reached
            const shouldReconnect = event.code !== 1000 &&
                event.code !== 4001 &&
                sessionCode &&
                reconnectAttempts.current < maxReconnectAttempts;

            if (shouldReconnect) {
                reconnectAttempts.current++;
                const delay = Math.min(3000 * reconnectAttempts.current, 15000);
                // OPTIMIZATION: Scheduling reconnect attempt
                reconnectTimeout.current = setTimeout(() => {
                    connect(sessionCode);
                }, delay);
            } else if (event.code === 4001) {
                console.error('WebSocket authentication failed - please login again');
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        setSocket(ws);
        return ws;
    }, [user, socket, sessionCode]);

    // Disconnect from session
    const disconnect = useCallback(() => {
        if (socket) {
            socket.close(1000, 'User disconnected');
            setSocket(null);
        }
        setSessionCode(null);
        setIsConnected(false);

        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
        }
    }, [socket]);

    // Send a message
    const send = useCallback((type, data = {}) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type, ...data }));
        } else {
            console.warn('WebSocket not connected, cannot send:', type);
        }
    }, [socket]);

    // Add event listener
    const on = useCallback((type, callback) => {
        if (!listeners.current.has(type)) {
            listeners.current.set(type, []);
        }
        listeners.current.get(type).push(callback);

        // Return unsubscribe function
        return () => {
            const typeListeners = listeners.current.get(type) || [];
            const index = typeListeners.indexOf(callback);
            if (index > -1) {
                typeListeners.splice(index, 1);
            }
        };
    }, []);

    // Remove event listener
    const off = useCallback((type, callback) => {
        const typeListeners = listeners.current.get(type) || [];
        const index = typeListeners.indexOf(callback);
        if (index > -1) {
            typeListeners.splice(index, 1);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    const value = {
        socket,
        isConnected,
        sessionCode,
        lastMessage,
        connect,
        disconnect,
        send,
        on,
        off,
        // Convenience methods for common actions
        sendCodeChange: (code, language, cursorPosition) =>
            send('code_change', { code, language, cursor_position: cursorPosition }),
        sendTeacherEdit: (studentId, code, language, cursorPosition) =>
            send('teacher_edit', { student_id: studentId, code, language, cursor_position: cursorPosition }),
        sendRunCode: (code, language) =>
            send('run_code', { code, language }),
        requestControl: (studentId) =>
            send('request_control', { student_id: studentId }),
        releaseControl: (studentId) =>
            send('release_control', { student_id: studentId }),
        sendStudentAlert: (message) =>
            send('student_notification', { message }),
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}
