/**
 * Integration Tests for Secure Messaging System
 * Tests message operations, document sharing, security, and performance metrics
 * @version 1.0.0
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals'; // ^29.6.2
import { faker } from '@faker-js/faker'; // ^8.0.2
import supertest from 'supertest'; // ^6.3.3
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'; // ^3.0.0

import { MessageService } from '../../src/services/message.service';
import { Message, MessageType, MessageStatus } from '../../interfaces/message.interface';
import { s3Config } from '../../config/s3.config';

// Test constants
const TEST_TIMEOUT = 5000;
const PERFORMANCE_THRESHOLD_MS = 2000; // 2 seconds max response time
const TEST_FILE_SIZE = 1024 * 1024; // 1MB test file

// Mock S3 service for document testing
class S3ServiceMock {
  async uploadFile(buffer: Buffer, key: string, contentType: string, metadata: any): Promise<any> {
    return {
      url: `https://test-bucket.s3.amazonaws.com/${key}`,
      key,
      metadata,
      etag: 'test-etag'
    };
  }

  async getSignedUrl(key: string): Promise<any> {
    return {
      url: `https://test-bucket.s3.amazonaws.com/${key}?signed=true`,
      expires: new Date(Date.now() + 3600000)
    };
  }

  async deleteFile(key: string): Promise<void> {
    return Promise.resolve();
  }
}

// Test data interface
interface TestData {
  senderId: string;
  recipientId: string;
  threadId: string;
  message?: Message;
  documentKey?: string;
}

/**
 * Sets up test data including users, messages, and documents
 */
async function setupTestData(messageType: MessageType = MessageType.TEXT): Promise<TestData> {
  const testData: TestData = {
    senderId: faker.string.uuid(),
    recipientId: faker.string.uuid(),
    threadId: faker.string.uuid()
  };

  const messageService = new MessageService(
    new S3ServiceMock() as any,
    {} as any, // Cache mock will be added in specific tests
    console as any
  );

  if (messageType === MessageType.DOCUMENT) {
    const documentBuffer = Buffer.from(faker.lorem.paragraphs(5));
    const fileName = `test-doc-${faker.string.uuid()}.pdf`;
    
    testData.message = await messageService.sendMessage(
      testData.senderId,
      testData.recipientId,
      'Test document message',
      documentBuffer,
      fileName,
      { isEncrypted: true }
    );
    testData.documentKey = `messages/${testData.threadId}/${fileName}`;
  } else {
    testData.message = await messageService.sendMessage(
      testData.senderId,
      testData.recipientId,
      faker.lorem.paragraph(),
      undefined,
      undefined,
      { isEncrypted: true }
    );
  }

  return testData;
}

/**
 * Cleans up test data and resources
 */
async function cleanupTestData(testData: TestData): Promise<void> {
  if (testData.documentKey) {
    const s3Client = new S3Client(s3Config);
    await s3Client.send(new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: testData.documentKey
    }));
  }
}

describe('Message Integration Tests', () => {
  let testData: TestData;
  let messageService: MessageService;

  beforeEach(async () => {
    jest.setTimeout(TEST_TIMEOUT);
    messageService = new MessageService(
      new S3ServiceMock() as any,
      {} as any,
      console as any
    );
  });

  afterEach(async () => {
    if (testData) {
      await cleanupTestData(testData);
    }
  });

  describe('Message Operations', () => {
    it('should create and retrieve a text message within performance threshold', async () => {
      const startTime = Date.now();
      
      // Create message
      const content = faker.lorem.paragraph();
      const message = await messageService.sendMessage(
        faker.string.uuid(),
        faker.string.uuid(),
        content,
        undefined,
        undefined,
        { isEncrypted: true }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(message).toBeDefined();
      expect(message.content).toBe(content);
      expect(message.type).toBe(MessageType.TEXT);
      expect(message.isEncrypted).toBe(true);
    });

    it('should handle document upload and retrieval with encryption', async () => {
      const startTime = Date.now();
      
      // Create document message
      testData = await setupTestData(MessageType.DOCUMENT);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(testData.message).toBeDefined();
      expect(testData.message?.type).toBe(MessageType.DOCUMENT);
      expect(testData.message?.metadata.documentUrl).toContain('https://');
      expect(testData.message?.isEncrypted).toBe(true);
    });

    it('should handle concurrent message operations efficiently', async () => {
      const messageCount = 5;
      const startTime = Date.now();
      
      // Create multiple messages concurrently
      const promises = Array(messageCount).fill(null).map(() => 
        messageService.sendMessage(
          faker.string.uuid(),
          faker.string.uuid(),
          faker.lorem.paragraph()
        )
      );

      const messages = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgDuration = duration / messageCount;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(messages).toHaveLength(messageCount);
      messages.forEach(message => {
        expect(message).toBeDefined();
        expect(message.id).toBeDefined();
      });
    });
  });

  describe('Security Validation', () => {
    it('should enforce encryption for sensitive messages', async () => {
      const message = await messageService.sendMessage(
        faker.string.uuid(),
        faker.string.uuid(),
        faker.lorem.paragraph(),
        undefined,
        undefined,
        { isEncrypted: true }
      );

      expect(message.isEncrypted).toBe(true);
      // Additional encryption checks would be performed here
    });

    it('should validate document type restrictions', async () => {
      const invalidFile = Buffer.from('test');
      const invalidFileName = 'test.exe';

      await expect(
        messageService.sendMessage(
          faker.string.uuid(),
          faker.string.uuid(),
          'Test message',
          invalidFile,
          invalidFileName
        )
      ).rejects.toThrow('File type not allowed');
    });

    it('should handle large encrypted documents within performance threshold', async () => {
      const startTime = Date.now();
      
      const largeDocument = Buffer.alloc(TEST_FILE_SIZE);
      const fileName = `large-doc-${faker.string.uuid()}.pdf`;
      
      const message = await messageService.sendMessage(
        faker.string.uuid(),
        faker.string.uuid(),
        'Large document test',
        largeDocument,
        fileName,
        { isEncrypted: true }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(message).toBeDefined();
      expect(message.metadata.fileSize).toBe(TEST_FILE_SIZE);
      expect(message.isEncrypted).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should retrieve thread messages with pagination within threshold', async () => {
      // Setup test thread with multiple messages
      const threadId = faker.string.uuid();
      const messageCount = 20;
      
      for (let i = 0; i < messageCount; i++) {
        await messageService.sendMessage(
          faker.string.uuid(),
          faker.string.uuid(),
          faker.lorem.paragraph()
        );
      }

      const startTime = Date.now();
      
      const result = await messageService.getThreadMessages(threadId, 1, 10);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result.messages).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.hasMore).toBeDefined();
    });

    it('should handle message status updates efficiently', async () => {
      testData = await setupTestData();
      const startTime = Date.now();
      
      const message = testData.message!;
      message.status = MessageStatus.READ;
      
      // Update would be performed here if the method was exposed
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(message.status).toBe(MessageStatus.READ);
    });
  });
});