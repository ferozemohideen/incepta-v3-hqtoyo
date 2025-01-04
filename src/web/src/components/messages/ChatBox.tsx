/**
 * @fileoverview Enhanced chat interface component with real-time messaging,
 * document sharing, and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Paper, Alert } from '@mui/material';
import { Message, MessageType, MessageStatus, MessageThread } from '../../interfaces/message.interface';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import useWebSocket from '../../hooks/useWebSocket';

/**
 * Props interface for ChatBox component
 */
interface ChatBoxProps {
  threadId: string;
  currentUserId: string;
  recipientId: string;
}

/**
 * Enhanced chat interface component with accessibility support
 */
const ChatBox: React.FC<ChatBoxProps> = React.memo(({ 
  threadId, 
  currentUserId, 
  recipientId 
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageDeliveryStatus, setMessageDeliveryStatus] = useState<Record<string, MessageStatus>>({});

  // Refs for managing component lifecycle
  const messageEndRef = useRef<HTMLDivElement>(null);
  const unreadMessagesRef = useRef<Set<string>>(new Set());

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    connectionState, 
    sendMessage: sendWebSocketMessage 
  } = useWebSocket(
    import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  );

  /**
   * Handles new messages with error boundaries and delivery tracking
   */
  const handleMessageReceived = useCallback(async (message: Message) => {
    try {
      // Update delivery status
      setMessageDeliveryStatus(prev => ({
        ...prev,
        [message.id]: MessageStatus.DELIVERED
      }));

      // Track unread messages
      if (message.senderId !== currentUserId) {
        unreadMessagesRef.current.add(message.id);
      }

      // Scroll to new message if at bottom
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }

    } catch (error) {
      console.error('Error handling new message:', error);
      setError('Failed to process new message');
    }
  }, [currentUserId]);

  /**
   * Handles message sending with real-time updates
   */
  const handleMessageSent = useCallback(async (message: Message) => {
    try {
      setMessageDeliveryStatus(prev => ({
        ...prev,
        [message.id]: MessageStatus.SENT
      }));

      if (isConnected) {
        await sendWebSocketMessage(message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  }, [isConnected, sendWebSocketMessage]);

  /**
   * Handles keyboard navigation for accessibility
   */
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Clear any active states or selections
      setError(null);
    }
  }, []);

  /**
   * Sets up keyboard event listeners
   */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  /**
   * Marks messages as read when they become visible
   */
  const handleMessagesViewed = useCallback((messageIds: string[]) => {
    messageIds.forEach(id => {
      if (unreadMessagesRef.current.has(id)) {
        setMessageDeliveryStatus(prev => ({
          ...prev,
          [id]: MessageStatus.READ
        }));
        unreadMessagesRef.current.delete(id);
      }
    });
  }, []);

  /**
   * Handles errors during message operations
   */
  const handleError = useCallback((error: Error) => {
    console.error('Chat operation failed:', error);
    setError(error.message);
  }, []);

  return (
    <Box
      sx={styles.chatBox}
      role="region"
      aria-label="Chat interface"
    >
      <Paper
        elevation={2}
        sx={styles.chatContainer}
      >
        {!isConnected && (
          <Alert 
            severity="warning" 
            sx={styles.connectionAlert}
          >
            Connection lost. Attempting to reconnect...
          </Alert>
        )}

        <Box sx={styles.messageContainer}>
          <MessageList
            threadId={threadId}
            currentUserId={currentUserId}
            onMessageReceived={handleMessageReceived}
            onMessagesViewed={handleMessagesViewed}
          />
          <div ref={messageEndRef} />
        </Box>

        <Box sx={styles.inputContainer}>
          <MessageInput
            threadId={threadId}
            recipientId={recipientId}
            onMessageSent={handleMessageSent}
            onError={handleError}
          />
        </Box>

        {isLoading && (
          <Box sx={styles.loadingOverlay}>
            <CircularProgress 
              aria-label="Loading messages"
            />
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={styles.errorAlert}
          >
            {error}
          </Alert>
        )}
      </Paper>
    </Box>
  );
});

// Styles with accessibility considerations
const styles = {
  chatBox: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  chatContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'background.paper',
    borderRadius: 2
  },
  messageContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative'
  },
  inputContainer: {
    padding: 2,
    borderTop: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1
  },
  connectionAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2
  },
  errorAlert: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 2
  }
} as const;

// Display name for debugging
ChatBox.displayName = 'ChatBox';

export default ChatBox;