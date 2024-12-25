/**
 * @fileoverview Enhanced message input component with secure real-time messaging,
 * document attachments, and comprehensive error handling
 * @version 1.0.0
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Message, MessageType, MessageStatus } from '../../interfaces/message.interface';
import { messageService } from '../../services/message.service';
import { useWebSocket } from '../../hooks/useWebSocket';

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/*',
  'application/pdf',
  '.doc',
  '.docx'
];

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_MESSAGES: 10,
  TIME_WINDOW: 60000, // 1 minute
};

/**
 * Props interface for MessageInput component
 */
interface MessageInputProps {
  threadId: string;
  recipientId: string;
  onMessageSent?: (message: Message) => void;
  onError?: (error: Error) => void;
  maxFileSize?: number;
}

/**
 * Enhanced message input component with real-time messaging capabilities
 */
const MessageInput: React.FC<MessageInputProps> = ({
  threadId,
  recipientId,
  onMessageSent,
  onError,
  maxFileSize = MAX_FILE_SIZE,
}) => {
  // State management
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<MessageStatus>(MessageStatus.SENT);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messageCountRef = useRef<number>(0);
  const lastMessageTimeRef = useRef<number>(Date.now());

  // WebSocket connection
  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket(
    import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  );

  /**
   * Rate limiting check
   */
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastMessageTimeRef.current > RATE_LIMIT.TIME_WINDOW) {
      messageCountRef.current = 0;
      lastMessageTimeRef.current = now;
    }

    if (messageCountRef.current >= RATE_LIMIT.MAX_MESSAGES) {
      setError('Message rate limit exceeded. Please wait before sending more messages.');
      return false;
    }

    messageCountRef.current++;
    return true;
  }, []);

  /**
   * Handle message submission with validation and error handling
   */
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() && !fileInputRef.current?.files?.length) {
      setError('Please enter a message or attach a file');
      return;
    }

    if (!checkRateLimit()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Validate message content
      await messageService.validateMessage(messageText);

      // Create message object
      const message: Message = {
        id: crypto.randomUUID(),
        threadId,
        recipientId,
        senderId: 'currentUserId', // Should be obtained from auth context
        type: MessageType.TEXT,
        content: messageText,
        status: MessageStatus.SENT,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Send message through service
      const sentMessage = await messageService.sendMessage(message);

      // Send through WebSocket if connected
      if (isConnected) {
        await sendWebSocketMessage(sentMessage);
      }

      // Clear input and update state
      setMessageText('');
      setMessageStatus(MessageStatus.DELIVERED);
      onMessageSent?.(sentMessage);

    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [messageText, threadId, recipientId, isConnected, sendWebSocketMessage, onMessageSent, onError, checkRateLimit]);

  /**
   * Handle file upload with progress tracking
   */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize) {
      setError(`File size exceeds maximum allowed size of ${maxFileSize / 1024 / 1024}MB`);
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.some(type => 
      file.type.match(new RegExp(type.replace('*', '.*'))))) {
      setError('File type not allowed');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setUploadProgress(0);

      // Upload document with progress tracking
      const uploadedMessage = await messageService.uploadDocument(
        file,
        threadId,
        {
          onProgress: (progress: number) => setUploadProgress(progress)
        }
      );

      // Send message through WebSocket
      if (isConnected) {
        await sendWebSocketMessage(uploadedMessage);
      }

      setUploadProgress(100);
      onMessageSent?.(uploadedMessage);

    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [threadId, maxFileSize, isConnected, sendWebSocketMessage, onMessageSent, onError]);

  /**
   * Auto-resize textarea as content grows
   */
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = `${messageInputRef.current.scrollHeight}px`;
    }
  }, [messageText]);

  return (
    <form onSubmit={handleSendMessage} className="message-input-container">
      {error && (
        <div className="message-input-error" role="alert">
          {error}
        </div>
      )}
      
      <div className="message-input-content">
        <textarea
          ref={messageInputRef}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          disabled={isSubmitting}
          maxLength={1000}
          rows={1}
          className="message-input-textarea"
          aria-label="Message input"
        />
        
        <div className="message-input-actions">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept={ALLOWED_FILE_TYPES.join(',')}
            disabled={isSubmitting}
            className="message-input-file"
            aria-label="Attach file"
          />
          
          <button
            type="submit"
            disabled={isSubmitting || (!messageText.trim() && !fileInputRef.current?.files?.length)}
            className="message-input-send"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="message-upload-progress" role="progressbar" aria-valuenow={uploadProgress}>
          Uploading: {uploadProgress}%
          <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {messageStatus === MessageStatus.DELIVERED && (
        <div className="message-status" role="status">
          Message delivered
        </div>
      )}
    </form>
  );
};

export default MessageInput;