/**
 * @fileoverview Defines comprehensive TypeScript interfaces and types for the secure messaging system
 * including message structure, thread management, document sharing capabilities, and real-time 
 * communication support.
 * @version 1.0.0
 */

/**
 * Enumeration of supported message types in the system
 */
export enum MessageType {
  TEXT = 'TEXT',           // Regular text messages
  DOCUMENT = 'DOCUMENT',   // Document/file sharing messages
  SYSTEM = 'SYSTEM',       // System-generated messages
  NOTIFICATION = 'NOTIFICATION' // User notifications
}

/**
 * Enumeration of possible message delivery statuses
 */
export enum MessageStatus {
  SENT = 'SENT',           // Message sent by sender
  DELIVERED = 'DELIVERED', // Message delivered to recipient
  READ = 'READ',           // Message read by recipient
  FAILED = 'FAILED'        // Message delivery failed
}

/**
 * Interface defining metadata for document messages
 * Includes comprehensive file and security information
 */
export interface MessageMetadata {
  // Document location and basic info
  documentUrl: string;     // Secure URL to the document
  fileName: string;        // Original filename
  fileSize: number;        // File size in bytes
  contentType: string;     // MIME type of the document
  
  // Timing information
  uploadedAt: Date;        // When the document was uploaded
  expiresAt: Date | null;  // Optional document expiration
  
  // Security metadata
  checksum: string;        // Document integrity verification
  encryptionKey: string | null; // Optional encryption key for sensitive documents
}

/**
 * Core message interface defining the structure of all messages
 * Supports encryption, tracking, and soft deletion
 */
export interface Message {
  // Core identifiers
  id: string;             // Unique message identifier
  threadId: string;       // Associated thread identifier
  senderId: string;       // Message sender's user ID
  recipientId: string;    // Message recipient's user ID
  
  // Message content
  type: MessageType;      // Type of message
  content: string;        // Message content (encrypted if isEncrypted=true)
  status: MessageStatus;  // Current delivery status
  metadata: MessageMetadata; // Additional message metadata
  
  // Security flags
  isEncrypted: boolean;   // Whether content is encrypted
  
  // Timestamps
  createdAt: Date;        // Message creation timestamp
  updatedAt: Date;        // Last update timestamp
  deletedAt: Date | null; // Soft deletion timestamp
}

/**
 * Interface for managing message threads
 * Supports multi-participant conversations with archiving
 */
export interface MessageThread {
  // Thread identifiers
  id: string;             // Unique thread identifier
  participantIds: string[]; // Array of participant user IDs
  lastMessageId: string;  // ID of the most recent message
  
  // Thread metadata
  subject: string;        // Thread subject/title
  isArchived: boolean;    // Whether thread is archived
  
  // Timestamps
  createdAt: Date;        // Thread creation timestamp
  updatedAt: Date;        // Last update timestamp
  deletedAt: Date | null; // Soft deletion timestamp
}