/**
 * @fileoverview Redux slice for managing messaging state with real-time updates,
 * thread management, document sharing, and offline support
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import {
  Message,
  MessageThread,
  MessageType,
  MessageStatus,
  MessageEvent,
  MessageEventType,
  MessageMetadata
} from '../interfaces/message.interface';
import { messageService } from '../services/message.service';

/**
 * Interface defining the message slice state structure
 */
interface MessageState {
  threads: MessageThread[];
  activeThread: MessageThread | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  drafts: Map<string, Message>;
  offlineQueue: Message[];
  documentUploads: Map<string, MessageMetadata>;
}

/**
 * Initial state for the message slice
 */
const initialState: MessageState = {
  threads: [],
  activeThread: null,
  messages: [],
  loading: false,
  error: null,
  unreadCount: 0,
  drafts: new Map(),
  offlineQueue: [],
  documentUploads: new Map()
};

/**
 * Async thunk for fetching message threads with pagination
 */
export const fetchThreads = createAsyncThunk(
  'messages/fetchThreads',
  async ({ page, limit, forceRefresh = false }: { 
    page: number; 
    limit: number; 
    forceRefresh?: boolean;
  }) => {
    try {
      const response = await messageService.getThreads(page, limit);
      return response;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for fetching messages in a thread
 */
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async ({ threadId, page, limit }: { 
    threadId: string; 
    page: number; 
    limit: number; 
  }) => {
    try {
      const response = await messageService.getMessages(threadId, page, limit);
      return response;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for sending a new message
 */
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (message: Message) => {
    try {
      const response = await messageService.sendMessage(message);
      return response;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for uploading documents
 */
export const uploadDocument = createAsyncThunk(
  'messages/uploadDocument',
  async ({ file, threadId }: { file: File; threadId: string }) => {
    try {
      const response = await messageService.uploadDocument(file, threadId);
      return response;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Message slice implementation with comprehensive state management
 */
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    /**
     * Set active message thread
     */
    setActiveThread: (state, action: PayloadAction<MessageThread>) => {
      state.activeThread = action.payload;
    },

    /**
     * Handle real-time message receipt
     */
    receiveMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      state.messages.push(message);
      
      // Update thread with new message
      const threadIndex = state.threads.findIndex(t => t.id === message.threadId);
      if (threadIndex !== -1) {
        state.threads[threadIndex].lastMessageId = message.id;
        state.threads[threadIndex].unreadCount += 1;
        state.unreadCount += 1;
      }
    },

    /**
     * Update message status (delivered/read)
     */
    updateMessageStatus: (state, action: PayloadAction<{
      messageId: string;
      status: MessageStatus;
    }>) => {
      const { messageId, status } = action.payload;
      const messageIndex = state.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        state.messages[messageIndex].status = status;
      }
    },

    /**
     * Save message draft
     */
    saveDraft: (state, action: PayloadAction<{
      threadId: string;
      draft: Message;
    }>) => {
      const { threadId, draft } = action.payload;
      state.drafts.set(threadId, draft);
    },

    /**
     * Queue message for offline sending
     */
    queueOfflineMessage: (state, action: PayloadAction<Message>) => {
      state.offlineQueue.push(action.payload);
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Mark thread messages as read
     */
    markThreadAsRead: (state, action: PayloadAction<string>) => {
      const threadId = action.payload;
      const threadIndex = state.threads.findIndex(t => t.id === threadId);
      
      if (threadIndex !== -1) {
        const unreadCount = state.threads[threadIndex].unreadCount;
        state.threads[threadIndex].unreadCount = 0;
        state.unreadCount = Math.max(0, state.unreadCount - unreadCount);
      }

      state.messages
        .filter(m => m.threadId === threadId && m.status !== MessageStatus.READ)
        .forEach(m => {
          m.status = MessageStatus.READ;
          messageService.markAsRead(m.id);
        });
    }
  },
  extraReducers: (builder) => {
    // Handle fetchThreads
    builder
      .addCase(fetchThreads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchThreads.fulfilled, (state, action) => {
        state.loading = false;
        state.threads = action.payload;
        state.unreadCount = action.payload.reduce(
          (count, thread) => count + thread.unreadCount, 
          0
        );
      })
      .addCase(fetchThreads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch threads';
      })

    // Handle fetchMessages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })

    // Handle sendMessage
    builder
      .addCase(sendMessage.pending, (state) => {
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
        const threadIndex = state.threads.findIndex(
          t => t.id === action.payload.threadId
        );
        if (threadIndex !== -1) {
          state.threads[threadIndex].lastMessageId = action.payload.id;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to send message';
      })

    // Handle uploadDocument
    builder
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push(action.payload);
        if (action.payload.type === MessageType.DOCUMENT) {
          state.documentUploads.set(action.payload.id, action.payload.metadata);
        }
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to upload document';
      });
  }
});

// Export actions and reducer
export const {
  setActiveThread,
  receiveMessage,
  updateMessageStatus,
  saveDraft,
  queueOfflineMessage,
  clearError,
  markThreadAsRead
} = messageSlice.actions;

export default messageSlice.reducer;