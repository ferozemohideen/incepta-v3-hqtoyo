/**
 * @fileoverview Custom React hook for managing WebSocket connections with robust
 * connection management, automatic reconnection, message queuing, and type-safe event handling.
 * @version 1.0.0
 */

import { useEffect, useCallback, useState, useRef } from 'react'; // v18.0.0
import io, { Socket } from 'socket.io-client'; // v4.7.0
import { MessageEvent, MessageEventType, Message } from '../interfaces/message.interface';

/**
 * Enum representing possible WebSocket connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Interface for WebSocket configuration options
 */
interface WebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  authToken?: string;
  secure?: boolean;
  messageQueueSize?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  autoConnect: true,
  reconnectAttempts: 5,
  authToken: '',
  secure: true,
  messageQueueSize: 100
};

// Constants for connection management
const RECONNECT_INTERVAL = 5000;
const HEALTH_CHECK_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 10000;

/**
 * Custom hook for WebSocket management with comprehensive connection handling
 * and message queuing capabilities.
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  // Merge provided options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Socket and connection state management
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs for managing connection lifecycle
  const reconnectAttempts = useRef(0);
  const healthCheckInterval = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<Message[]>([]);
  const connectionTimeout = useRef<NodeJS.Timeout>();

  /**
   * Handles message queuing when offline
   */
  const queueMessage = useCallback((message: Message): boolean => {
    if (messageQueue.current.length >= config.messageQueueSize) {
      console.warn('Message queue limit reached, dropping oldest message');
      messageQueue.current.shift();
    }
    messageQueue.current.push(message);
    return true;
  }, [config.messageQueueSize]);

  /**
   * Processes queued messages when connection is restored
   */
  const processMessageQueue = useCallback(async () => {
    if (!socket || !isConnected) return;

    while (messageQueue.current.length > 0) {
      const message = messageQueue.current[0];
      try {
        await socket.emit(MessageEventType.NEW_MESSAGE, message);
        messageQueue.current.shift();
      } catch (error) {
        console.error('Failed to process queued message:', error);
        break;
      }
    }
  }, [socket, isConnected]);

  /**
   * Establishes WebSocket connection with retry logic
   */
  const connect = useCallback(async () => {
    if (socket || connectionState === ConnectionState.CONNECTING) return;

    setConnectionState(ConnectionState.CONNECTING);

    const socketOptions = {
      reconnection: false, // We handle reconnection manually
      secure: config.secure,
      auth: {
        token: config.authToken
      },
      timeout: CONNECTION_TIMEOUT
    };

    const newSocket = io(url, socketOptions);

    // Connection lifecycle event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionState(ConnectionState.CONNECTED);
      reconnectAttempts.current = 0;
      processMessageQueue();
      
      // Setup health check
      healthCheckInterval.current = setInterval(() => {
        newSocket.emit('ping');
      }, HEALTH_CHECK_INTERVAL);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setConnectionState(ConnectionState.DISCONNECTED);
      clearInterval(healthCheckInterval.current);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      setConnectionState(ConnectionState.ERROR);
    });

    // Message event handlers
    newSocket.on(MessageEventType.NEW_MESSAGE, (event: MessageEvent) => {
      // Handle incoming messages
      console.log('New message received:', event);
    });

    newSocket.on(MessageEventType.MESSAGE_DELIVERED, (event: MessageEvent) => {
      // Handle message delivery confirmations
      console.log('Message delivered:', event);
    });

    setSocket(newSocket);

    // Set connection timeout
    connectionTimeout.current = setTimeout(() => {
      if (connectionState !== ConnectionState.CONNECTED) {
        newSocket.close();
        setConnectionState(ConnectionState.ERROR);
      }
    }, CONNECTION_TIMEOUT);

  }, [url, config, connectionState, socket, processMessageQueue]);

  /**
   * Handles graceful disconnection and cleanup
   */
  const disconnect = useCallback(() => {
    if (!socket) return;

    clearInterval(healthCheckInterval.current);
    clearTimeout(connectionTimeout.current);
    socket.removeAllListeners();
    socket.close();
    setSocket(null);
    setIsConnected(false);
    setConnectionState(ConnectionState.DISCONNECTED);
  }, [socket]);

  /**
   * Sends a message with offline queuing support
   */
  const sendMessage = useCallback(async (message: Message): Promise<boolean> => {
    if (!socket || !isConnected) {
      return queueMessage(message);
    }

    try {
      await socket.emit(MessageEventType.NEW_MESSAGE, message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return queueMessage(message);
    }
  }, [socket, isConnected, queueMessage]);

  /**
   * Handles automatic reconnection with exponential backoff
   */
  useEffect(() => {
    if (!config.autoConnect || isConnected || 
        reconnectAttempts.current >= config.reconnectAttempts) return;

    const attemptReconnection = async () => {
      setConnectionState(ConnectionState.RECONNECTING);
      reconnectAttempts.current++;

      const backoffTime = Math.min(
        RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts.current - 1),
        30000
      );

      setTimeout(() => {
        connect();
      }, backoffTime);
    };

    if (connectionState === ConnectionState.DISCONNECTED) {
      attemptReconnection();
    }
  }, [connectionState, isConnected, config.autoConnect, config.reconnectAttempts, connect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Initial connection if autoConnect is enabled
  useEffect(() => {
    if (config.autoConnect && !socket && connectionState === ConnectionState.DISCONNECTED) {
      connect();
    }
  }, [config.autoConnect, socket, connectionState, connect]);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    sendMessage
  };
}