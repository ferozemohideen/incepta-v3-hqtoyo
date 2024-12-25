/**
 * Enhanced Message Service Implementation
 * Provides secure messaging and document sharing functionality with performance optimizations
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import winston from 'winston'; // ^3.8.0

import { Message, MessageType, MessageStatus, MessageMetadata } from '../../interfaces/message.interface';
import { MessageModel } from '../../db/models/message.model';
import { S3Service } from '../../lib/s3';
import { CacheService } from '../../lib/cache';

// Constants for message handling
const MESSAGE_CACHE_TTL = 3600; // 1 hour
const MAX_MESSAGE_LENGTH = 10000; // characters
const THREAD_PAGE_SIZE = 50;
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/plain'
]);

/**
 * Interface for message sending options
 */
interface MessageOptions {
  isEncrypted?: boolean;
  expiresIn?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Interface for thread retrieval options
 */
interface ThreadOptions {
  includeDocuments?: boolean;
  sortDirection?: 'ASC' | 'DESC';
  filter?: {
    type?: MessageType[];
    startDate?: Date;
    endDate?: Date;
  };
}

/**
 * Interface for paginated message response
 */
interface MessagePage {
  messages: Message[];
  total: number;
  page: number;
  hasMore: boolean;
  metadata: {
    unreadCount: number;
    documentCount: number;
  };
}

/**
 * Enhanced Message Service class implementing secure messaging functionality
 */
export class MessageService {
  private readonly s3Service: S3Service;
  private readonly cacheService: CacheService;
  private readonly logger: winston.Logger;

  /**
   * Initializes message service with required dependencies
   */
  constructor(
    s3Service: S3Service,
    cacheService: CacheService,
    logger: winston.Logger
  ) {
    this.s3Service = s3Service;
    this.cacheService = cacheService;
    this.logger = logger;

    // Initialize logger configuration
    this.logger.configure({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'messages.log' })
      ]
    });
  }

  /**
   * Sends a new message with optional document attachment
   */
  public async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    documentBuffer?: Buffer,
    fileName?: string,
    options: MessageOptions = {}
  ): Promise<Message> {
    try {
      // Validate message content
      if (!content || content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Message content must be between 1 and ${MAX_MESSAGE_LENGTH} characters`);
      }

      // Generate or retrieve thread ID
      const threadId = await this.getOrCreateThreadId(senderId, recipientId);

      let messageMetadata: MessageMetadata = {
        documentUrl: '',
        fileName: '',
        fileSize: 0,
        contentType: '',
        uploadedAt: new Date(),
        expiresAt: options.expiresIn ? new Date(Date.now() + options.expiresIn * 1000) : null,
        checksum: '',
        encryptionKey: null
      };

      // Handle document upload if provided
      if (documentBuffer && fileName) {
        messageMetadata = await this.handleDocumentUpload(
          documentBuffer,
          fileName,
          threadId,
          options
        );
      }

      // Create message record
      const message = await MessageModel.create({
        id: uuidv4(),
        threadId,
        senderId,
        recipientId,
        type: documentBuffer ? MessageType.DOCUMENT : MessageType.TEXT,
        content,
        status: MessageStatus.SENT,
        metadata: messageMetadata,
        isEncrypted: options.isEncrypted ?? false
      });

      // Invalidate thread cache
      await this.cacheService.invalidate(`thread:${threadId}`);

      // Log message creation
      this.logger.info('Message sent successfully', {
        messageId: message.id,
        threadId,
        type: message.type
      });

      return message;
    } catch (error) {
      this.logger.error('Error sending message', { error, senderId, recipientId });
      throw error;
    }
  }

  /**
   * Retrieves messages from a thread with pagination and caching
   */
  public async getThreadMessages(
    threadId: string,
    page: number = 1,
    limit: number = THREAD_PAGE_SIZE,
    options: ThreadOptions = {}
  ): Promise<MessagePage> {
    try {
      // Check cache first
      const cacheKey = `thread:${threadId}:${page}:${limit}`;
      const cachedData = await this.cacheService.get(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Build query options
      const queryOptions = {
        where: {
          threadId,
          ...(options.filter?.type && { type: options.filter.type }),
          ...(options.filter?.startDate && options.filter?.endDate && {
            createdAt: {
              $between: [options.filter.startDate, options.filter.endDate]
            }
          })
        },
        order: [['createdAt', options.sortDirection || 'DESC']],
        limit,
        offset
      };

      // Fetch messages and count
      const [messages, total] = await Promise.all([
        MessageModel.findAll(queryOptions),
        MessageModel.count({ where: queryOptions.where })
      ]);

      // Generate signed URLs for documents if needed
      if (options.includeDocuments) {
        await this.generateDocumentUrls(messages);
      }

      // Calculate metadata
      const metadata = await this.calculateThreadMetadata(threadId);

      // Prepare response
      const response: MessagePage = {
        messages,
        total,
        page,
        hasMore: offset + messages.length < total,
        metadata
      };

      // Cache the response
      await this.cacheService.set(cacheKey, response, MESSAGE_CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error('Error retrieving thread messages', { error, threadId });
      throw error;
    }
  }

  /**
   * Handles document upload and metadata generation
   */
  private async handleDocumentUpload(
    documentBuffer: Buffer,
    fileName: string,
    threadId: string,
    options: MessageOptions
  ): Promise<MessageMetadata> {
    const fileType = this.getFileType(fileName);
    
    if (!ALLOWED_FILE_TYPES.has(fileType)) {
      throw new Error('File type not allowed');
    }

    // Generate unique file key
    const fileKey = `messages/${threadId}/${uuidv4()}-${fileName}`;

    // Upload file to S3
    const uploadResult = await this.s3Service.uploadFile(
      documentBuffer,
      fileKey,
      fileType,
      {
        threadId,
        uploadedBy: 'system',
        documentType: 'message-attachment'
      }
    );

    return {
      documentUrl: uploadResult.url,
      fileName,
      fileSize: documentBuffer.length,
      contentType: fileType,
      uploadedAt: new Date(),
      expiresAt: options.expiresIn ? new Date(Date.now() + options.expiresIn * 1000) : null,
      checksum: uploadResult.etag,
      encryptionKey: null
    };
  }

  /**
   * Generates or retrieves thread ID for conversation
   */
  private async getOrCreateThreadId(senderId: string, recipientId: string): Promise<string> {
    const participants = [senderId, recipientId].sort().join(':');
    const cacheKey = `thread:participants:${participants}`;
    
    let threadId = await this.cacheService.get(cacheKey);
    
    if (!threadId) {
      const existingThread = await MessageModel.findOne({
        where: {
          $or: [
            { senderId, recipientId },
            { senderId: recipientId, recipientId: senderId }
          ]
        },
        order: [['createdAt', 'DESC']]
      });

      threadId = existingThread ? existingThread.threadId : uuidv4();
      await this.cacheService.set(cacheKey, threadId);
    }

    return threadId;
  }

  /**
   * Generates signed URLs for document messages
   */
  private async generateDocumentUrls(messages: Message[]): Promise<void> {
    const documentMessages = messages.filter(m => m.type === MessageType.DOCUMENT);
    
    await Promise.all(documentMessages.map(async message => {
      if (message.metadata.documentUrl) {
        const signedUrl = await this.s3Service.getSignedUrl(
          message.metadata.documentUrl,
          3600,
          {
            requireSignedUrls: true,
            customHeaders: {
              'Content-Disposition': `attachment; filename="${message.metadata.fileName}"`
            }
          }
        );
        message.metadata.documentUrl = signedUrl.url;
      }
    }));
  }

  /**
   * Calculates thread metadata including unread and document counts
   */
  private async calculateThreadMetadata(threadId: string): Promise<{ unreadCount: number; documentCount: number }> {
    const [unreadCount, documentCount] = await Promise.all([
      MessageModel.count({
        where: {
          threadId,
          status: MessageStatus.SENT
        }
      }),
      MessageModel.count({
        where: {
          threadId,
          type: MessageType.DOCUMENT
        }
      })
    ]);

    return { unreadCount, documentCount };
  }

  /**
   * Determines file type from filename
   */
  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      txt: 'text/plain'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}