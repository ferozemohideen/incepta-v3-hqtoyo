/**
 * @fileoverview TypeScript interfaces and types for the Incepta messaging system
 * Provides comprehensive type safety for messages, threads, document sharing,
 * and real-time communication capabilities.
 * @version 1.0.0
 */

/**
 * Enumeration of supported message types in the system
 */
export enum MessageType {
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  SYSTEM = 'SYSTEM'
}

/**
 * Enumeration of message delivery statuses for real-time tracking
 */
export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

/**
 * Alias for MessageStatus to maintain backward compatibility
 */
export const MessageDeliveryStatus = MessageStatus;

/**
 * Enumeration of WebSocket message event types for real-time updates
 */
export enum MessageEventType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  MESSAGE_READ = 'MESSAGE_READ',
  MESSAGE_DELIVERED = 'MESSAGE_DELIVERED'
}

/**
 * Interface for document message metadata including file details and tracking
 */
export interface MessageMetadata {
  /**
   * Secure URL for accessing the shared document
   */
  documentUrl: string;

  /**
   * Original filename of the shared document
   */
  fileName: string;

  /**
   * Size of the file in bytes
   */
  fileSize: number;

  /**
   * MIME type of the document
   */
  contentType: string;

  /**
   * Timestamp when the document was uploaded
   */
  uploadedAt: Date;
}

/**
 * Alias for MessageMetadata to maintain backward compatibility
 */
export type DocumentMetadata = MessageMetadata;

/**
 * Core message interface defining structure of messages in the frontend
 */
export interface Message {
  /**
   * Unique identifier for the message
   */
  id: string;

  /**
   * ID of the thread this message belongs to
   */
  threadId: string;

  /**
   * ID of the user who sent the message
   */
  senderId: string;

  /**
   * ID of the message recipient
   */
  recipientId: string;

  /**
   * Type of message (text, document, system)
   */
  type: MessageType;

  /**
   * Message content - text content for TEXT type,
   * system message for SYSTEM type
   */
  content: string;

  /**
   * Current delivery status of the message
   */
  status: MessageStatus;

  /**
   * Additional metadata, required for DOCUMENT type messages
   */
  metadata: MessageMetadata;

  /**
   * Timestamp when the message was created
   */
  createdAt: Date;

  /**
   * Timestamp of last message update (e.g., status change)
   */
  updatedAt: Date;
}

/**
 * Interface for managing message threads with participant tracking and status
 */
export interface MessageThread {
  /**
   * Unique identifier for the thread
   */
  id: string;

  /**
   * Array of user IDs participating in the thread
   */
  participantIds: string[];

  /**
   * ID of the most recent message in the thread
   */
  lastMessageId: string;

  /**
   * Count of unread messages in the thread
   */
  unreadCount: number;

  /**
   * Timestamp when the thread was created
   */
  createdAt: Date;

  /**
   * Timestamp of last thread update
   */
  updatedAt: Date;
}

/**
 * Type-safe interface for WebSocket message events with real-time capabilities
 */
export interface MessageEvent {
  /**
   * Type of the message event
   */
  type: MessageEventType;

  /**
   * Message payload for the event
   */
  payload: Message;

  /**
   * Timestamp when the event occurred
   */
  timestamp: Date;
}