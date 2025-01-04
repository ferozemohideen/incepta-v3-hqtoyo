/**
 * @fileoverview Enhanced messaging thread page component with real-time chat,
 * document sharing, and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Snackbar, 
  Alert 
} from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';

import ChatBox from '../../components/messages/ChatBox';
import DocumentShare from '../../components/messages/DocumentShare';
import { Message, MessageStatus } from '../../interfaces/message.interface';
import { useWebSocket } from '../../hooks/useWebSocket';

// Constants for offline handling and performance
const OFFLINE_QUEUE_LIMIT = 100;
const RECONNECT_DELAY = 5000;
const MESSAGE_BATCH_SIZE = 50;

/**
 * Interface for thread component state
 */
interface ThreadState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  isTyping: boolean;
  offlineQueue: Message[];
  deliveryStatus: Map<string, MessageStatus>;
  readReceipts: Map<string, Date>;
}

/**
 * Enhanced messaging thread page component with comprehensive features
 */
const Thread: React.FC = () => {
  // Router hooks
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [state, setState] = useState<ThreadState>({
    messages: [],
    loading: true,
    error: null,
    page: 1,
    hasMore: true,
    isTyping: false,
    offlineQueue: [],
    deliveryStatus: new Map(),
    readReceipts: new Map()
  });

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    connectionState, 
    sendMessage: sendWebSocketMessage 
  } = useWebSocket(
    import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  );

  /**
   * Handles sending messages with offline support and optimistic updates
   */
  const handleMessageSend = useCallback(async (message: Message) => {
    try {
      // Add optimistic message to UI
      setState(prev => ({
        ...prev,
        messages: [message, ...prev.messages],
        deliveryStatus: new Map(prev.deliveryStatus).set(message.id, MessageStatus.SENT)
      }));

      // Attempt to send via WebSocket if connected
      if (isConnected) {
        await sendWebSocketMessage(message);
      } else {
        // Queue message for later if offline
        if (state.offlineQueue.length < OFFLINE_QUEUE_LIMIT) {
          setState(prev => ({
            ...prev,
            offlineQueue: [...prev.offlineQueue, message]
          }));
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to send message. Please try again.'
      }));
    }
  }, [isConnected, sendWebSocketMessage, state.offlineQueue.length]);

  /**
   * Handles document sharing through the messaging system
   */
  const handleDocumentShare = useCallback(async (message: Message) => {
    try {
      await handleMessageSend({
        ...message,
        threadId: threadId!,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to share document:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to share document. Please try again.'
      }));
    }
  }, [threadId, handleMessageSend]);

  /**
   * Processes queued messages when connection is restored
   */
  const processOfflineQueue = useCallback(async () => {
    if (!isConnected || state.offlineQueue.length === 0) return;

    const queue = [...state.offlineQueue];
    setState(prev => ({ ...prev, offlineQueue: [] }));

    for (const message of queue) {
      try {
        await sendWebSocketMessage(message);
        setState(prev => ({
          ...prev,
          deliveryStatus: new Map(prev.deliveryStatus).set(message.id, MessageStatus.DELIVERED)
        }));
      } catch (error) {
        console.error('Failed to process queued message:', error);
        setState(prev => ({
          ...prev,
          offlineQueue: [...prev.offlineQueue, message]
        }));
        break;
      }
    }
  }, [isConnected, sendWebSocketMessage, state.offlineQueue]);

  /**
   * Handles connection status changes
   */
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    if (isConnected) {
      processOfflineQueue();
    } else {
      // Set reconnection timeout
      reconnectTimeout = setTimeout(() => {
        setState(prev => ({
          ...prev,
          error: 'Connection lost. Attempting to reconnect...'
        }));
      }, RECONNECT_DELAY);
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [isConnected, processOfflineQueue]);

  return (
    <Box
      sx={styles.threadContainer}
      role="main"
      aria-label="Message thread"
    >
      {!isConnected && (
        <Box sx={styles.offlineIndicator}>
          <Typography>
            You are currently offline. Messages will be sent when connection is restored.
          </Typography>
        </Box>
      )}

      <ChatBox
        threadId={threadId!}
        currentUserId="current-user" // Should come from auth context
        recipientId="recipient" // Should come from thread data
      />

      <DocumentShare
        threadId={threadId!}
        onDocumentShare={handleDocumentShare}
        enableEncryption={true}
        enableVirusScan={true}
      />

      {state.error && (
        <Snackbar
          open={!!state.error}
          autoHideDuration={6000}
          onClose={() => setState(prev => ({ ...prev, error: null }))}
        >
          <Alert 
            severity="error" 
            onClose={() => setState(prev => ({ ...prev, error: null }))}
          >
            {state.error}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

// Styles with accessibility considerations
const styles = {
  threadContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'background.default'
  },
  messageList: {
    flex: 1,
    overflow: 'auto',
    scrollBehavior: 'smooth',
    paddingX: 2,
    paddingY: 1
  },
  offlineIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'warning.main',
    color: 'warning.contrastText',
    padding: 1,
    textAlign: 'center',
    zIndex: 'tooltip'
  }
} as const;

export default Thread;