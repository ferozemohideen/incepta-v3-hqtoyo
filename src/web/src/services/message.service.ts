/**
 * @fileoverview Enhanced message service implementation with secure messaging,
 * real-time communication, document sharing, and offline support
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // ^4.1.1
import { 
  Message, 
  MessageThread, 
  MessageType, 
  MessageStatus,
  MessageEvent,
  MessageEventType 
} from '../interfaces/message.interface';
import { apiService } from './api.service';
import { useWebSocket } from '../hooks/useWebSocket';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Interface for message encryption configuration
 */
interface EncryptionConfig {
  algorithm: string;
  secretKey: string;
  ivSize: number;
}

/**
 * Interface for file upload options
 */
interface UploadOptions {
  maxSize: number;
  allowedTypes: string[];
  generatePreview: boolean;
  compressionQuality?: number;
}

/**
 * Enhanced message service implementation class
 */
export class MessageServiceImpl {
  private socket: ReturnType<typeof useWebSocket>;
  private readonly baseUrl: string;
  private readonly encryptionConfig: EncryptionConfig;
  private readonly uploadConfig: UploadOptions;
  private readonly messageQueue: Message[] = [];

  constructor() {
    // Initialize WebSocket connection
    this.socket = useWebSocket(import.meta.env['VITE_WS_URL'] || 'ws://localhost:3000', {
      autoConnect: true,
      reconnectAttempts: 5,
      secure: true,
      messageQueueSize: 100
    });

    // Configure encryption settings
    this.encryptionConfig = {
      algorithm: 'AES-256-CBC',
      secretKey: import.meta.env['VITE_MESSAGE_ENCRYPTION_KEY'],
      ivSize: 16
    };

    // Configure file upload settings
    this.uploadConfig = {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf', '.doc', '.docx'],
      generatePreview: true,
      compressionQuality: 0.8
    };

    this.baseUrl = API_ENDPOINTS.MESSAGES.BASE;
    this.initializeEventListeners();
  }

  /**
   * Initialize WebSocket event listeners for real-time updates
   */
  private initializeEventListeners(): void {
    this.socket.on && this.socket.on(MessageEventType.NEW_MESSAGE, (event: MessageEvent) => {
      this.handleNewMessage(event);
    });

    this.socket.on && this.socket.on(MessageEventType.MESSAGE_DELIVERED, (event: MessageEvent) => {
      this.updateMessageStatus(event.payload.id, MessageStatus.DELIVERED);
    });

    this.socket.on && this.socket.on(MessageEventType.MESSAGE_READ, (event: MessageEvent) => {
      this.updateMessageStatus(event.payload.id, MessageStatus.READ);
    });
  }

  /**
   * Retrieves all message threads with pagination
   */
  public async getThreads(page: number = 1, limit: number = 20): Promise<{ threads: MessageThread[]; total: number }> {
    try {
      return await apiService.get<{ threads: MessageThread[]; total: number }>(
        `${this.baseUrl}/threads`,
        { page, limit }
      );
    } catch (error) {
      console.error('Failed to retrieve message threads:', error);
      throw error;
    }
  }

  /**
   * Retrieves messages for a specific thread with pagination
   */
  public async getMessages(threadId: string, page: number = 1, limit: number = 50): Promise<Message[]> {
    try {
      const response = await apiService.get<Message[]>(
        `${this.baseUrl}/thread/${threadId}/messages`,
        { page, limit }
      );

      return response.map(message => ({
        ...message,
        content: message.type !== MessageType.SYSTEM 
          ? this.decryptContent(message.content)
          : message.content
      }));
    } catch (error) {
      console.error('Failed to retrieve messages:', error);
      throw error;
    }
  }

  /**
   * Marks messages as read and updates status
   */
  public async markAsRead(messageIds: string[]): Promise<void> {
    try {
      await apiService.put(`${this.baseUrl}/status/read`, { messageIds });
      
      if (this.socket.isConnected) {
        messageIds.forEach(id => {
          this.socket.sendMessage({
            id,
            type: MessageType.SYSTEM,
            content: 'Message read',
            status: MessageStatus.READ,
            threadId: '',
            senderId: '',
            recipientId: '',
            metadata: { documentUrl: '', fileName: '', fileSize: 0, contentType: '', uploadedAt: new Date() },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time status updates for messages
   */
  public async subscribeToStatus(threadId: string, callback: (event: MessageEvent) => void): Promise<void> {
    if (this.socket.isConnected) {
      this.socket.on && this.socket.on(MessageEventType.MESSAGE_DELIVERED, callback);
      this.socket.on && this.socket.on(MessageEventType.MESSAGE_READ, callback);
    }
  }

  /**
   * Gets unread message count for all threads
   */
  public async getUnreadCount(): Promise<number> {
    try {
      const response = await apiService.get<{ count: number }>(
        `${this.baseUrl}/unread/count`
      );
      return response.count;
    } catch (error) {
      console.error('Failed to get unread message count:', error);
      throw error;
    }
  }

  private encryptContent(content: string): string {
    const iv = CryptoJS.lib.WordArray.random(this.encryptionConfig.ivSize);
    const encrypted = CryptoJS.AES.encrypt(
      content,
      this.encryptionConfig.secretKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC
      }
    );
    return iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
  }

  private decryptContent(encryptedContent: string): string {
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedContent);
    const iv = ciphertext.clone();
    iv.sigBytes = this.encryptionConfig.ivSize;
    iv.clamp();
    
    const encrypted = ciphertext.clone();
    encrypted.words.splice(0, this.encryptionConfig.ivSize / 4);
    encrypted.sigBytes -= this.encryptionConfig.ivSize;

    const decrypted = CryptoJS.AES.decrypt(
      encrypted.toString(CryptoJS.enc.Base64),
      this.encryptionConfig.secretKey,
      { iv: iv, mode: CryptoJS.mode.CBC }
    );
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  public async sendMessage(message: Message): Promise<Message> {
    try {
      if (message.type !== MessageType.SYSTEM) {
        message.content = this.encryptContent(message.content);
      }

      if (this.socket.isConnected) {
        await this.socket.sendMessage(message);
      } else {
        this.messageQueue.push(message);
      }

      const response = await apiService.post<Message>(
        `${this.baseUrl}/send`,
        message
      );

      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  public async uploadDocument(
    file: File,
    threadId: string,
    options?: Partial<UploadOptions>
  ): Promise<Message> {
    try {
      if (file.size > this.uploadConfig.maxSize) {
        throw new Error('File size exceeds maximum allowed size');
      }

      if (!this.uploadConfig.allowedTypes.some(type => 
        file.type.match(new RegExp(type.replace('*', '.*'))))) {
        throw new Error('File type not allowed');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('threadId', threadId);
      formData.append('generatePreview', 
        String(options?.generatePreview ?? this.uploadConfig.generatePreview));

      const response = await apiService.post<Message>(
        `${this.baseUrl}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const documentMessage: Message = {
        ...response,
        type: MessageType.DOCUMENT,
        status: MessageStatus.SENT
      };

      return this.sendMessage(documentMessage);
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }

  public async getMessageThread(
    threadId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; thread: MessageThread }> {
    try {
      const response = await apiService.get<{ messages: Message[]; thread: MessageThread }>(
        `${this.baseUrl}/thread/${threadId}`,
        { page, limit }
      );

      response.messages = response.messages.map(message => ({
        ...message,
        content: message.type !== MessageType.SYSTEM 
          ? this.decryptContent(message.content)
          : message.content
      }));

      return response;
    } catch (error) {
      console.error('Failed to retrieve message thread:', error);
      throw error;
    }
  }

  private async updateMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    try {
      await apiService.put(`${this.baseUrl}/status/${messageId}`, {
        status
      });

      if (this.socket.isConnected) {
        this.socket.sendMessage({
          id: messageId,
          type: MessageType.SYSTEM,
          content: `Message ${status.toLowerCase()}`,
          status,
          threadId: '',
          senderId: '',
          recipientId: '',
          metadata: { documentUrl: '', fileName: '', fileSize: 0, contentType: '', uploadedAt: new Date() },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to update message status:', error);
    }
  }

  private async handleNewMessage(event: MessageEvent): Promise<void> {
    try {
      const message = event.payload;
      
      if (message.type !== MessageType.SYSTEM) {
        message.content = this.decryptContent(message.content);
      }

      await this.updateMessageStatus(message.id, MessageStatus.DELIVERED);

    } catch (error) {
      console.error('Failed to handle new message:', error);
    }
  }
}

// Export singleton instance
export const messageService = new MessageServiceImpl();