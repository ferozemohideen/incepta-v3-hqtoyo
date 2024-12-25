/**
 * @fileoverview Integration tests for grant management functionality
 * Tests CRUD operations, search, application submission, and AI assistance
 * with enhanced security and performance validation
 * @version 1.0.0
 */

import { GrantService } from '../../src/services/grant.service';
import { OpenAI } from 'openai'; // ^4.0.0
import { Redis } from 'redis'; // ^4.6.8
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1
import { GrantModel } from '../../src/db/models/grant.model';
import { IGrant, GrantType, GrantStatus } from '../../src/interfaces/grant.interface';
import { User, UserRole } from '../../src/interfaces/user.interface';
import { SecurityLevel, ValidationSeverity } from '../../src/utils/validation';

// Mock dependencies
jest.mock('openai');
jest.mock('redis');
jest.mock('rate-limiter-flexible');

describe('Grant Management Integration Tests', () => {
  let grantService: GrantService;
  let openaiClient: jest.Mocked<OpenAI>;
  let redisClient: jest.Mocked<Redis>;
  let rateLimiter: jest.Mocked<RateLimiterRedis>;

  // Test user with admin privileges
  const testAdmin: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@incepta.com',
    name: 'Test Admin',
    role: UserRole.ADMIN,
    profile: {
      organization: 'Incepta',
      title: 'System Administrator',
      phone: '+1-555-0123',
      bio: 'Test admin user',
      interests: ['Technology Transfer'],
      avatar: 'https://example.com/avatar.jpg'
    },
    preferences: {
      emailNotifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    },
    security: {
      mfaEnabled: true,
      lastLogin: new Date(),
      passwordChangedAt: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Sample grant data for testing
  const sampleGrant: IGrant = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test SBIR Grant',
    description: 'Test grant for integration testing',
    type: GrantType.SBIR,
    agency: 'NSF',
    amount: 250000,
    deadline: new Date('2024-12-31'),
    requirements: {
      eligibilityCriteria: ['Small Business', 'US-based'],
      focusAreas: ['AI/ML', 'Technology Transfer'],
      applicationUrl: 'https://example.com/apply'
    },
    status: GrantStatus.DRAFT,
    securityLevel: SecurityLevel.CONFIDENTIAL,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeAll(async () => {
    // Initialize mocks
    openaiClient = new OpenAI() as jest.Mocked<OpenAI>;
    redisClient = new Redis() as jest.Mocked<Redis>;
    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: 100,
      duration: 3600
    }) as jest.Mocked<RateLimiterRedis>;

    // Setup grant service with mocked dependencies
    grantService = new GrantService(
      openaiClient,
      GrantModel,
      rateLimiter,
      redisClient
    );

    // Setup database connection for tests
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await redisClient.quit();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Grant Creation', () => {
    it('should create a new grant with proper security validation', async () => {
      const startTime = Date.now();

      const result = await grantService.createGrant(sampleGrant, testAdmin);

      // Verify response time
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // 2 second SLA

      // Verify grant creation
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(sampleGrant.title);
      expect(result.securityLevel).toBe(SecurityLevel.CONFIDENTIAL);

      // Verify audit trail
      expect(result.auditLog).toBeDefined();
      expect(result.auditLog[0].action).toBe('CREATE');
      expect(result.auditLog[0].userId).toBe(testAdmin.id);
    });

    it('should reject grant creation with insufficient permissions', async () => {
      const guestUser: User = { ...testAdmin, role: UserRole.GUEST };
      
      await expect(
        grantService.createGrant(sampleGrant, guestUser)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should validate grant data before creation', async () => {
      const invalidGrant = { ...sampleGrant, amount: -1000 };
      
      await expect(
        grantService.createGrant(invalidGrant, testAdmin)
      ).rejects.toThrow('Grant validation failed');
    });
  });

  describe('Grant Search', () => {
    it('should search grants with security filtering', async () => {
      const searchParams = {
        type: [GrantType.SBIR],
        minAmount: 100000,
        maxAmount: 500000,
        page: 1,
        limit: 20
      };

      const startTime = Date.now();
      
      const result = await grantService.searchGrants(searchParams, testAdmin);

      // Verify response time
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);

      // Verify search results
      expect(result.grants).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.page).toBe(1);
      
      // Verify security filtering
      result.grants.forEach(grant => {
        expect(grant.securityLevel).toBeDefined();
      });
    });

    it('should use cache for repeated searches', async () => {
      const searchParams = {
        type: [GrantType.SBIR],
        page: 1,
        limit: 20
      };

      // First search - should hit database
      await grantService.searchGrants(searchParams, testAdmin);

      // Second search - should hit cache
      const startTime = Date.now();
      await grantService.searchGrants(searchParams, testAdmin);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(500); // Cache response should be faster
      expect(redisClient.get).toHaveBeenCalled();
    });
  });

  describe('AI Assistance', () => {
    it('should provide AI-powered grant writing assistance', async () => {
      const grantId = sampleGrant.id;
      const section = 'technical_approach';
      const content = 'Initial draft of technical approach section';

      // Mock GPT-4 response
      openaiClient.chat.completions.create.mockResolvedValue({
        choices: [
          { message: { content: 'Improved technical approach suggestion 1' } },
          { message: { content: 'Improved technical approach suggestion 2' } },
          { message: { content: 'Improved technical approach suggestion 3' } }
        ]
      } as any);

      const startTime = Date.now();
      
      const result = await grantService.getAIAssistance(
        grantId,
        section,
        content,
        testAdmin
      );

      // Verify response time
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 second SLA for AI operations

      // Verify AI response
      expect(result.suggestions).toHaveLength(3);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.85);
      expect(result.metadata.model).toBe('gpt-4');
    });

    it('should enforce rate limits for AI assistance', async () => {
      rateLimiter.consume.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        grantService.getAIAssistance(
          sampleGrant.id,
          'technical_approach',
          'content',
          testAdmin
        )
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Security Validation', () => {
    it('should enforce security classifications', async () => {
      const sensitiveGrant = {
        ...sampleGrant,
        securityLevel: SecurityLevel.CRITICAL
      };

      const result = await grantService.createGrant(sensitiveGrant, testAdmin);
      
      expect(result.securityLevel).toBe(SecurityLevel.CRITICAL);
      expect(result.auditLog).toContainEqual(
        expect.objectContaining({
          action: 'CREATE',
          securityLevel: SecurityLevel.CRITICAL
        })
      );
    });

    it('should validate data sanitization', async () => {
      const grantWithXSS = {
        ...sampleGrant,
        description: '<script>alert("xss")</script>Technical description'
      };

      const result = await grantService.createGrant(grantWithXSS, testAdmin);
      
      expect(result.description).not.toContain('<script>');
      expect(result.description).toContain('Technical description');
    });
  });
});

/**
 * Helper function to setup test database
 */
async function setupTestDatabase(): Promise<void> {
  // Implementation would initialize test database
  // with required schemas and test data
}

/**
 * Helper function to cleanup test database
 */
async function cleanupTestDatabase(): Promise<void> {
  // Implementation would clean up test data
  // and close database connections
}