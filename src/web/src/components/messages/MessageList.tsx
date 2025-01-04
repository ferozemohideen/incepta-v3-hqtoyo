import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, List, ListItem, CircularProgress, Typography } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Message, 
  MessageType, 
  MessageDeliveryStatus 
} from '../../interfaces/message.interface';
import { messageService } from '../../services/message.service';
import { useWebSocket } from '../../hooks/useWebSocket';

// Message grouping threshold in minutes
const MESSAGE_GROUP_THRESHOLD = 5;
const MESSAGE_BATCH_SIZE = 50;
const SCROLL_THRESHOLD = 100;

interface MessageListProps {
  threadId: string;
  currentUserId: string;
  onMessageReceived?: (message: Message) => void;
  messageLimit?: number;
}

/**
 * A virtualized, accessible message list component with real-time updates
 * and document sharing capabilities.
 * 
 * @version 1.0.0
 */
const MessageList: React.FC<MessageListProps> = React.memo(({
  threadId,
  currentUserId,
  onMessageReceived,
  messageLimit = MESSAGE_BATCH_SIZE
}) => {
  // Refs for DOM elements and state management
  const listRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const isLoadingMore = useRef(false);
  const hasMoreMessages = useRef(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time updates
  const { isConnected, sendMessage } = useWebSocket(
    import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  );

  // State for messages with memoization
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  /**
   * Groups messages by date for better visual organization
   */
  const groupedMessages = useMemo(() => {
    return messages.reduce((groups, message) => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {} as Record<string, Message[]>);
  }, [messages]);

  /**
   * Virtualizer setup for efficient message rendering
   */
  const rowVirtualizer = useVirtualizer({
    count: Object.keys(groupedMessages).length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  /**
   * Loads initial messages and sets up real-time updates
   */
  useEffect(() => {
    const loadInitialMessages = async () => {
      try {
        setIsLoading(true);
        const response = await messageService.getMessageThread(threadId, 1, messageLimit);
        setMessages(response.messages);
        lastMessageRef.current = response.messages[0]?.id;
        hasMoreMessages.current = response.messages.length === messageLimit;
      } catch (err) {
        setError(err as Error);
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialMessages();
    
    // Subscribe to thread-specific WebSocket events
    if (isConnected) {
      sendMessage({
        type: 'SUBSCRIBE_THREAD',
        payload: { threadId }
      });
    }

    return () => {
      if (isConnected) {
        sendMessage({
          type: 'UNSUBSCRIBE_THREAD',
          payload: { threadId }
        });
      }
    };
  }, [threadId, messageLimit, isConnected, sendMessage]);

  /**
   * Handles loading more messages when scrolling up
   */
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore.current || !hasMoreMessages.current) return;

    try {
      isLoadingMore.current = true;
      const lastMessage = messages[messages.length - 1];
      const response = await messageService.getMessageThread(
        threadId,
        Math.ceil(messages.length / messageLimit) + 1,
        messageLimit
      );

      if (response.messages.length < messageLimit) {
        hasMoreMessages.current = false;
      }

      setMessages(prevMessages => [...prevMessages, ...response.messages]);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      isLoadingMore.current = false;
    }
  }, [threadId, messages, messageLimit]);

  /**
   * Handles real-time message updates
   */
  useEffect(() => {
    if (!isConnected) return;

    const handleNewMessage = (message: Message) => {
      if (message.threadId === threadId) {
        setMessages(prev => [message, ...prev]);
        onMessageReceived?.(message);

        // Mark message as delivered
        messageService.markAsRead(message.id);
      }
    };

    const handleMessageStatus = (messageId: string, status: MessageDeliveryStatus) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, status } : msg
        )
      );
    };

    // WebSocket event subscriptions
    const unsubscribe = () => {
      // Cleanup WebSocket listeners
    };

    return unsubscribe;
  }, [threadId, isConnected, onMessageReceived]);

  /**
   * Handles intersection observer for infinite scroll
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMoreMessages.current) {
          loadMoreMessages();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [isLoading, loadMoreMessages]);

  /**
   * Renders a message item with accessibility support
   */
  const renderMessage = useCallback((message: Message) => {
    const isOwnMessage = message.senderId === currentUserId;
    
    return (
      <ListItem
        key={message.id}
        sx={{
          ...styles.messageItem,
          alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
        }}
        role="listitem"
        aria-label={`Message from ${isOwnMessage ? 'you' : 'sender'}`}
        tabIndex={0}
      >
        <Box
          sx={{
            backgroundColor: isOwnMessage ? 'primary.light' : 'grey.100',
            padding: 2,
            borderRadius: 2,
          }}
        >
          {message.type === MessageType.DOCUMENT && message.metadata ? (
            <Box component="a" href={message.metadata.documentUrl} target="_blank">
              <Typography variant="body2">
                📎 {message.metadata.fileName} ({Math.round(message.metadata.fileSize / 1024)}KB)
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1">{message.content}</Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {new Date(message.createdAt).toLocaleTimeString()}
          </Typography>
        </Box>
      </ListItem>
    );
  }, [currentUserId]);

  if (error) {
    return (
      <Box sx={styles.messageList} role="alert">
        <Typography color="error">
          Failed to load messages. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={listRef}
      sx={styles.messageList}
      role="log"
      aria-live="polite"
      aria-label="Message thread"
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <div ref={loadMoreRef} style={{ height: 1 }} />
          <List>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const date = Object.keys(groupedMessages)[virtualRow.index];
              const dateMessages = groupedMessages[date];

              return (
                <React.Fragment key={date}>
                  <Typography
                    variant="overline"
                    sx={styles.dateHeader}
                    aria-label={`Messages from ${date}`}
                  >
                    {date}
                  </Typography>
                  {dateMessages.map(renderMessage)}
                </React.Fragment>
              );
            })}
          </List>
        </>
      )}
    </Box>
  );
});

// Styles object for component
const styles = {
  messageList: {
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column-reverse',
    scrollBehavior: 'smooth',
    position: 'relative',
  },
  messageItem: {
    marginBottom: '8px',
    maxWidth: '70%',
    position: 'relative',
    focusVisible: {
      outline: '2px solid primary.main',
      outlineOffset: '2px',
    },
  },
  messageGroup: {
    marginBottom: '24px',
    position: 'relative',
  },
  dateHeader: {
    textAlign: 'center',
    margin: '16px 0',
    color: 'text.secondary',
  },
  typingIndicator: {
    position: 'absolute',
    bottom: '8px',
    left: '16px',
    zIndex: 1,
  },
} as const;

MessageList.displayName = 'MessageList';

export default MessageList;