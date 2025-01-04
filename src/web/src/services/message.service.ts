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
    // Using socket.io events directly is not supported by our custom hook
    // Instead we'll handle these events through the hook's connection state and callbacks
    this.handleNewMessage = this.handleNewMessage.bind(this);
    this.updateMessageStatus = this.updateMessageStatus.bind(this);
  }

  /**
   * Encrypts sensitive message content
   */
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

  /**
   * Decrypts message content
   */
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

  /**
   * Sends a new message with encryption and delivery tracking
   */
  public async sendMessage(message: Message): Promise<Message> {
    try {
      // Encrypt message content if it's not a system message
      if (message.type !== MessageType.SYSTEM) {
        message.content = this.encryptContent(message.content);
      }

      // Attempt real-time delivery via WebSocket
      if (this.socket.isConnected) {
        await this.socket.sendMessage(message);
      } else {
        // Queue message for later delivery if offline
        this.messageQueue.push(message);
      }

      // Persist message via REST API
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

  /**
   * Uploads and shares documents with optimized handling
   */
  public async uploadDocument(
    file: File,
    threadId: string,
    options?: Partial<UploadOptions>
  ): Promise<Message> {
    try {
      // Validate file
      if (file.size > this.uploadConfig.maxSize) {
        throw new Error('File size exceeds maximum allowed size');
      }

      if (!this.uploadConfig.allowedTypes.some(type => 
        file.type.match(new RegExp(type.replace('*', '.*'))))) {
        throw new Error('File type not allowed');
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('threadId', threadId);
      formData.append('generatePreview', 
        String(options?.generatePreview ?? this.uploadConfig.generatePreview));

      // Upload document
      const response = await apiService.post<Message>(
        `${this.baseUrl}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Create and send document message
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

  /**
   * Retrieves message thread with pagination
   */
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

      // Decrypt message contents
      response.messages = response.messages.map((message: Message) => ({
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

  /**
   * Updates message status and notifies participants
   */
  private async updateMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    try {
      await apiService.put(`${this.baseUrl}/status/${messageId}`, {
        status
      });

      if (this.socket.isConnected) {
        await this.socket.sendMessage({
          id: messageId,
          status,
          type: MessageType.SYSTEM,
          content: '',
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

  /**
   * Handles incoming new messages
   */
  private async handleNewMessage(event: MessageEvent): Promise<void> {
    try {
      const message = event.payload;
      
      // Decrypt message content if needed
      if (message.type !== MessageType.SYSTEM) {
        message.content = this.decryptContent(message.content);
      }

      // Update message status to delivered
      await this.updateMessageStatus(message.id, MessageStatus.DELIVERED);

      // Trigger any UI updates or notifications here
    } catch (error) {
      console.error('Failed to handle new message:', error);
    }
  }
}

// Export singleton instance
export const messageService = new MessageServiceImpl();