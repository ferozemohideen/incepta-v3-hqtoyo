/**
 * @fileoverview Enhanced messaging page component implementing secure real-time
 * communication with document sharing and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Grid, Box, Alert, CircularProgress } from '@mui/material'; // v5.14.0
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0

import ThreadList from '../../components/messages/ThreadList';
import ChatBox from '../../components/messages/ChatBox';
import ContactList from '../../components/messages/ContactList';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { Message, MessageType } from '../../interfaces/message.interface';
import { messageService } from '../../services/message.service';

/**
 * Interface for enhanced message page state
 */
interface MessagePageState {
  selectedThreadId: string | null;
  selectedContactId: string | null;
  connectionState: string;
  error: Error | null;
  isLoading: boolean;
}

/**
 * Enhanced messaging page component with real-time updates and accessibility
 */
const MessagesPage: React.FC = () => {
  // Authentication and user context
  const { user, permissions } = useAuth();

  // WebSocket connection management
  const { 
    isConnected, 
    connectionState, 
    connect, 
    reconnect 
  } = useWebSocket(
    import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  );

  // Component state
  const [state, setState] = useState<MessagePageState>({
    selectedThreadId: null,
    selectedContactId: null,
    connectionState: 'disconnected',
    error: null,
    isLoading: true
  });

  /**
   * Handles thread selection with optimistic updates
   */
  const handleThreadSelect = useCallback(async (threadId: string) => {
    try {
      setState(prev => ({
        ...prev,
        selectedThreadId: threadId,
        isLoading: true,
        error: null
      }));

      // Validate thread access permissions
      if (!permissions?.includes('message:read')) {
        throw new Error('Insufficient permissions to access thread');
      }

      // Update selected contact based on thread
      const threadInfo = await messageService.getThreadInfo(threadId);
      const contactId = threadInfo.participantIds.find(id => id !== user?.id);

      setState(prev => ({
        ...prev,
        selectedContactId: contactId || null,
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to select thread:', error);
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false
      }));
    }
  }, [user?.id, permissions]);

  /**
   * Handles contact selection and thread creation
   */
  const handleContactSelect = useCallback(async (contact: User) => {
    try {
      setState(prev => ({
        ...prev,
        selectedContactId: contact.id,
        isLoading: true,
        error: null
      }));

      // Find or create thread for contact
      const thread = await messageService.findOrCreateThread(contact.id);
      
      setState(prev => ({
        ...prev,
        selectedThreadId: thread.id,
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to select contact:', error);
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false
      }));
    }
  }, []);

  /**
   * Handles WebSocket connection status changes
   */
  useEffect(() => {
    setState(prev => ({
      ...prev,
      connectionState
    }));

    if (!isConnected) {
      reconnect();
    }
  }, [isConnected, connectionState, reconnect]);

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    connect();

    return () => {
      // Cleanup WebSocket connection
    };
  }, [connect]);

  return (
    <Box
      sx={styles.container}
      role="main"
      aria-label="Messaging interface"
    >
      {!isConnected && (
        <Alert 
          severity="warning"
          sx={styles.connectionAlert}
        >
          Connection lost. Attempting to reconnect...
        </Alert>
      )}

      <Grid container sx={styles.gridContainer}>
        {/* Thread List */}
        <Grid item xs={12} md={3} sx={styles.threadList}>
          <ThreadList
            onThreadSelect={handleThreadSelect}
            selectedThreadId={state.selectedThreadId}
          />
        </Grid>

        {/* Chat Box */}
        <Grid item xs={12} md={6} sx={styles.chatBox}>
          {state.selectedThreadId ? (
            <ChatBox
              threadId={state.selectedThreadId}
              currentUserId={user?.id || ''}
              recipientId={state.selectedContactId || ''}
            />
          ) : (
            <Box sx={styles.emptyState}>
              Select a conversation to start messaging
            </Box>
          )}
        </Grid>

        {/* Contact List */}
        <Grid item xs={12} md={3} sx={styles.contactList}>
          <ContactList
            onContactSelect={handleContactSelect}
            selectedContactId={state.selectedContactId}
          />
        </Grid>
      </Grid>

      {state.isLoading && (
        <Box sx={styles.loadingOverlay}>
          <CircularProgress />
        </Box>
      )}

      {state.error && (
        <Alert 
          severity="error"
          onClose={() => setState(prev => ({ ...prev, error: null }))}
          sx={styles.errorAlert}
        >
          {state.error.message}
        </Alert>
      )}
    </Box>
  );
};

// Styles with accessibility considerations
const styles = {
  container: {
    height: 'calc(100vh - 64px)',
    position: 'relative',
    overflow: 'hidden'
  },
  gridContainer: {
    height: '100%',
    overflow: 'hidden'
  },
  threadList: {
    borderRight: '1px solid',
    borderColor: 'divider',
    height: '100%',
    overflow: 'hidden'
  },
  chatBox: {
    height: '100%',
    overflow: 'hidden'
  },
  contactList: {
    borderLeft: '1px solid',
    borderColor: 'divider',
    height: '100%',
    overflow: 'hidden'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  connectionAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001
  },
  errorAlert: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 1001
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'text.secondary'
  }
} as const;

export default MessagesPage;