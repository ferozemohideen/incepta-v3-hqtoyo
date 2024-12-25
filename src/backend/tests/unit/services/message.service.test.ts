/**
 * Comprehensive unit tests for MessageService
 * Tests secure messaging, document handling, performance, and error scenarios
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // ^29.0.0
import { performance } from 'perf_hooks';
import { MessageService } from '../../src/services/message.service';
import { Message, MessageType, MessageStatus } from '../../src/interfaces/message.interface';
import { S3Service } from '../../src/lib/s3';
import { CacheService } from '../../src/lib/cache';

// Mock dependencies
jest.mock('../../src/lib/s3');
jest.mock('../../src/lib/cache');
jest.mock('winston');

describe('MessageService', () => {
  let messageService: MessageService;
  let mockS3Service: jest.Mocked<S3Service>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockLogger: any;

  // Test data
  const testMessage: Partial<Message> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    threadId: '123e4567-e89b-12d3-a456-426614174001',
    senderId: 'sender-123',
    recipientId: 'recipient-456',
    type: MessageType.TEXT,
    content: 'Test message content',
    status: MessageStatus.SENT,
    metadata: {
      documentUrl: '',
      fileName: '',
      fileSize: 0,
      contentType: '',
      uploadedAt: new Date(),
      expiresAt: null,
      checksum: '',
      encryptionKey: null
    },
    isEncrypted: false
  };

  const testDocument = {
    buffer: Buffer.from('test document content'),
    fileName: 'test.pdf',
    contentType: 'application/pdf'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockS3Service = {
      uploadFile: jest.fn(),
      getSignedUrl: jest.fn(),
      deleteFile: jest.fn()
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidate: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      configure: jest.fn()
    };

    // Create service instance
    messageService = new MessageService(
      mockS3Service,
      mockCacheService,
      mockLogger
    );
  });

  describe('Message Security', () => {
    it('should validate sender authentication before sending message', async () => {
      const invalidSenderId = '';
      
      await expect(
        messageService.sendMessage(
          invalidSenderId,
          testMessage.recipientId!,
          testMessage.content!
        )
      ).rejects.toThrow('Invalid sender ID');
    });

    it('should enforce message encryption for sensitive content', async () => {
      const sensitiveMessage = {
        ...testMessage,
        content: 'CONFIDENTIAL: sensitive information',
        isEncrypted: true
      };

      const result = await messageService.sendMessage(
        sensitiveMessage.senderId!,
        sensitiveMessage.recipientId!,
        sensitiveMessage.content,
        undefined,
        undefined,
        { isEncrypted: true }
      );

      expect(result.isEncrypted).toBe(true);
    });

    it('should validate document security metadata', async () => {
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://test-bucket.s3.amazonaws.com/test.pdf',
        key: 'test.pdf',
        etag: 'test-etag',
        metadata: { secure: 'true' }
      });

      const result = await messageService.sendMessage(
        testMessage.senderId!,
        testMessage.recipientId!,
        'Document message',
        testDocument.buffer,
        testDocument.fileName
      );

      expect(result.metadata.checksum).toBeTruthy();
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String),
        testDocument.contentType,
        expect.objectContaining({
          threadId: expect.any(String),
          uploadedBy: expect.any(String)
        })
      );
    });
  });

  describe('Performance Validation', () => {
    it('should complete message send within 2 seconds', async () => {
      const startTime = performance.now();

      await messageService.sendMessage(
        testMessage.senderId!,
        testMessage.recipientId!,
        testMessage.content!
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should retrieve thread messages with pagination within SLA', async () => {
      const startTime = performance.now();

      await messageService.getThreadMessages(testMessage.threadId!, 1, 50);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should handle document upload within time limit', async () => {
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://test-bucket.s3.amazonaws.com/test.pdf',
        key: 'test.pdf',
        etag: 'test-etag',
        metadata: {}
      });

      const startTime = performance.now();

      await messageService.sendMessage(
        testMessage.senderId!,
        testMessage.recipientId!,
        'Document message',
        testDocument.buffer,
        testDocument.fileName
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message content', async () => {
      const emptyContent = '';
      
      await expect(
        messageService.sendMessage(
          testMessage.senderId!,
          testMessage.recipientId!,
          emptyContent
        )
      ).rejects.toThrow('Message content must be between 1 and');
    });

    it('should handle S3 upload failures gracefully', async () => {
      mockS3Service.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(
        messageService.sendMessage(
          testMessage.senderId!,
          testMessage.recipientId!,
          'Document message',
          testDocument.buffer,
          testDocument.fileName
        )
      ).rejects.toThrow('Upload failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle cache failures without breaking functionality', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await messageService.getThreadMessages(testMessage.threadId!);

      expect(result).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate file types for document messages', async () => {
      const invalidDocument = {
        buffer: Buffer.from('test'),
        fileName: 'test.exe',
        contentType: 'application/x-msdownload'
      };

      await expect(
        messageService.sendMessage(
          testMessage.senderId!,
          testMessage.recipientId!,
          'Document message',
          invalidDocument.buffer,
          invalidDocument.fileName
        )
      ).rejects.toThrow('File type not allowed');
    });
  });

  describe('Cache Management', () => {
    it('should cache thread messages for performance', async () => {
      const cachedMessages = [testMessage];
      mockCacheService.get.mockResolvedValue(cachedMessages);

      const result = await messageService.getThreadMessages(testMessage.threadId!);

      expect(result.messages).toEqual(cachedMessages);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining(testMessage.threadId!)
      );
    });

    it('should invalidate cache on new message', async () => {
      await messageService.sendMessage(
        testMessage.senderId!,
        testMessage.recipientId!,
        testMessage.content!
      );

      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        expect.stringContaining(testMessage.threadId!)
      );
    });
  });

  describe('Document Handling', () => {
    it('should generate secure document URLs', async () => {
      const signedUrl = 'https://test-bucket.s3.amazonaws.com/signed-url';
      mockS3Service.getSignedUrl.mockResolvedValue({ url: signedUrl, expires: new Date() });

      const documentMessage = {
        ...testMessage,
        type: MessageType.DOCUMENT,
        metadata: {
          ...testMessage.metadata,
          documentUrl: 'original-url',
          fileName: 'test.pdf'
        }
      };

      const result = await messageService.getThreadMessages(
        documentMessage.threadId!,
        1,
        50,
        { includeDocuments: true }
      );

      expect(mockS3Service.getSignedUrl).toHaveBeenCalled();
      expect(result.messages[0]?.metadata.documentUrl).toBe(signedUrl);
    });

    it('should handle document expiration', async () => {
      const expiresIn = 3600; // 1 hour
      
      const result = await messageService.sendMessage(
        testMessage.senderId!,
        testMessage.recipientId!,
        'Document message',
        testDocument.buffer,
        testDocument.fileName,
        { expiresIn }
      );

      expect(result.metadata.expiresAt).toBeDefined();
      expect(result.metadata.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });
});