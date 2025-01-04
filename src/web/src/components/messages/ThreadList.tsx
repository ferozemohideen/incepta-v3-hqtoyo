/**
 * @fileoverview ThreadList component for displaying message threads with real-time updates
 * Implements virtualized rendering, infinite scroll, and offline support
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { List, ListItem, ListItemText, Badge, Typography, CircularProgress } from '@mui/material'; // v5.14.0
import { format } from 'date-fns'; // v2.30.0
import { useInfiniteScroll } from 'react-infinite-scroll-hook'; // v4.1.1
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0

import { MessageThread, MessageType, MessageStatus, Message } from '../../interfaces/message.interface';
import { messageService } from '../../services/message.service';
import Loading from '../common/Loading';

/**
 * Props interface for ThreadList component
 */
interface ThreadListProps {
  onThreadSelect: (threadId: string) => void;
  selectedThreadId: string | null;
}

/**
 * Interface for pending operations during offline mode
 */
interface PendingOperation {
  type: 'markAsRead';
  threadId: string;
  timestamp: number;
}

/**
 * Constants for list configuration
 */
const THREAD_ITEM_HEIGHT = 72; // Height of each thread item in pixels
const THREADS_PER_PAGE = 20; // Number of threads to load per page
const SCROLL_THRESHOLD = 0.8; // Threshold for triggering infinite scroll

/**
 * Formats thread preview text based on message type and content
 */
const formatThreadPreview = (thread: MessageThread): string => {
  if (!thread.lastMessageId) return '';

  switch (thread.type) {
    case MessageType.DOCUMENT:
      return 'Shared a document';
    case MessageType.SYSTEM:
      return thread.content || '';
    default:
      return thread.content && thread.content.length > 50 
        ? `${thread.content.substring(0, 50)}...` 
        : thread.content || '';
  }
};

/**
 * ThreadList component displays a virtualized list of message threads with real-time updates
 */
const ThreadList = React.memo(({ onThreadSelect, selectedThreadId }: ThreadListProps) => {
  // State management
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<PendingOperation[]>([]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const threadUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Fetches threads with pagination
   */
  const fetchThreads = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await messageService.getMessageThread(pageNum);

      setThreads(prevThreads => 
        pageNum === 1 ? response.messages : [...prevThreads, ...response.messages]
      );
      setHasMore(response.messages.length === THREADS_PER_PAGE);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handles infinite scroll loading
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore]);

  // Configure infinite scroll hook
  const [infiniteRef] = useInfiniteScroll({
    loading,
    hasNextPage: hasMore,
    onLoadMore: loadMore,
    disabled: !!error,
    rootMargin: '0px 0px 400px 0px',
  });

  // Configure virtualization
  const rowVirtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => THREAD_ITEM_HEIGHT,
    overscan: 5,
  });

  /**
   * Handles real-time thread updates
   */
  useEffect(() => {
    const subscription = messageService.socket.on('message_update', (event: { threadId: string; messageId: string }) => {
      setThreads(prevThreads => {
        const threadIndex = prevThreads.findIndex(t => t.id === event.threadId);
        if (threadIndex === -1) return prevThreads;

        const updatedThreads = [...prevThreads];
        updatedThreads[threadIndex] = {
          ...updatedThreads[threadIndex],
          lastMessageId: event.messageId,
          updatedAt: new Date(),
          unreadCount: updatedThreads[threadIndex].unreadCount + 1
        };

        return updatedThreads;
      });
    });

    return () => {
      subscription.off('message_update');
    };
  }, []);

  /**
   * Handles marking threads as read with offline support
   */
  const handleThreadClick = useCallback(async (threadId: string) => {
    onThreadSelect(threadId);

    try {
      await messageService.updateMessageStatus(threadId, MessageStatus.READ);
      
      setThreads(prevThreads => 
        prevThreads.map(thread => 
          thread.id === threadId 
            ? { ...thread, unreadCount: 0 } 
            : thread
        )
      );
    } catch (err) {
      // Queue operation for offline support
      setOfflineQueue(prev => [...prev, {
        type: 'markAsRead',
        threadId,
        timestamp: Date.now()
      }]);
    }
  }, [onThreadSelect]);

  /**
   * Process offline queue when connection is restored
   */
  useEffect(() => {
    const processQueue = async () => {
      if (offlineQueue.length === 0) return;

      const operations = [...offlineQueue];
      setOfflineQueue([]);

      for (const op of operations) {
        try {
          if (op.type === 'markAsRead') {
            await messageService.updateMessageStatus(op.threadId, MessageStatus.READ);
          }
        } catch (err) {
          console.error('Failed to process offline operation:', err);
          // Re-queue failed operations
          setOfflineQueue(prev => [...prev, op]);
        }
      }
    };

    if (navigator.onLine) {
      processQueue();
    }
  }, [offlineQueue]);

  // Initial thread load
  useEffect(() => {
    fetchThreads(page);
  }, [fetchThreads, page]);

  if (error) {
    return (
      <Typography color="error" align="center" p={2}>
        Error loading threads: {error.message}
      </Typography>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}
    >
      <List ref={infiniteRef} style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const thread = threads[virtualRow.index];
          return (
            <ListItem
              key={thread.id}
              button
              selected={selectedThreadId === thread.id}
              onClick={() => handleThreadClick(thread.id)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: THREAD_ITEM_HEIGHT,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <Badge
                badgeContent={thread.unreadCount}
                color="primary"
                max={99}
                sx={{ width: '100%' }}
              >
                <ListItemText
                  primary={thread.participantIds.join(', ')}
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        noWrap
                      >
                        {formatThreadPreview(thread)}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {format(new Date(thread.updatedAt), 'MMM d, h:mm a')}
                      </Typography>
                    </>
                  }
                />
              </Badge>
            </ListItem>
          );
        })}
      </List>
      {loading && <Loading size="small" />}
    </div>
  );
});

ThreadList.displayName = 'ThreadList';

export default ThreadList;