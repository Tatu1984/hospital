import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// WebSocket event types
export type WSEventType =
  | 'notification'
  | 'bed-update'
  | 'queue-update'
  | 'vitals-alert'
  | 'critical-value'
  | 'admission-update'
  | 'discharge-update'
  | 'ot-status'
  | 'emergency-alert'
  | 'lab-result'
  | 'appointment-update'
  | 'message'
  | 'ping'
  | 'pong';

// WebSocket message structure
export interface WSMessage {
  type: WSEventType;
  payload: any;
  timestamp: string;
}

// WebSocket connection state
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketContextType {
  isConnected: boolean;
  connectionState: ConnectionState;
  lastMessage: WSMessage | null;
  sendMessage: (message: any) => void;
  subscribe: (eventType: WSEventType, callback: (payload: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Map<WSEventType, Set<(payload: any) => void>>>(new Map());
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL from environment or construct from current location
  const getWebSocketUrl = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    // Use environment variable or construct from API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');

    return `${wsProtocol}://${wsHost}/ws?token=${token}`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const url = getWebSocketUrl();
    if (!url) {
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setConnectionState('connected');

        // Start ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Notify subscribers
          const subscribers = subscribersRef.current.get(message.type);
          if (subscribers) {
            subscribers.forEach(callback => callback(message.payload));
          }

          // Also notify 'all' subscribers
          const allSubscribers = subscribersRef.current.get('message' as WSEventType);
          if (allSubscribers) {
            allSubscribers.forEach(callback => callback(message));
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Attempt reconnection after 5 seconds (unless intentional close)
        if (event.code !== 1000 && event.code !== 4001 && event.code !== 4002) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocket] Attempting reconnection...');
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionState('error');
      };
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setConnectionState('error');
    }
  }, [getWebSocketUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }, []);

  // Subscribe to specific event type
  const subscribe = useCallback((eventType: WSEventType, callback: (payload: any) => void) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }
    subscribersRef.current.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(eventType);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      connect();
    }

    // Listen for login/logout events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          connect();
        } else {
          disconnect();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      disconnect();
    };
  }, [connect, disconnect]);

  const value: WebSocketContextType = {
    isConnected,
    connectionState,
    lastMessage,
    sendMessage,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook to subscribe to specific event types
export function useWSEvent<T = any>(eventType: WSEventType, callback: (payload: T) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, callback, subscribe]);
}
