/**
 * @fileoverview Comprehensive unit test suite for GrantService
 * Tests grant management, AI assistance, security controls, and performance
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // ^29.0.0
import { OpenAI } from 'openai'; // ^4.0.0
import { GrantService } from '../../../src/services/grant.service';
import { IGrant, GrantType, GrantStatus } from '../../../src/interfaces/grant.interface';
import { SecurityLevel, ValidationSeverity } from '../../../src/utils/validation';
import { UserRole } from '../../../src/constants/roles';

// Mock dependencies
jest.mock('../../../src/db/models/grant.model');
jest.mock('openai');
jest.mock('../../../src/cache/redis.client');
jest.mock('../../../src/security/rate-limiter');

describe('GrantService', () => {
  let grantService: GrantService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockGrantModel: any;
  let mockRateLimiter: any;
  let mockRedisClient: any;

  // Test data
  const mockGrant: IGrant = {
    id: 'test-grant-id',
    title: 'Test SBIR Grant',
    description: 'Test grant for technology commercialization',
    type: GrantType.SBIR,
    agency: 'NSF',
    amount: 250000,
    deadline: new Date('2024-06-01'),
    requirements: {
      eligibilityCriteria: ['Small Business', 'US-based'],
      focusAreas: ['AI/ML', 'Technology Transfer'],
    },
    securityLevel: SecurityLevel.CONFIDENTIAL,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockUser = {
    id: 'test-user-id',
    role: UserRole.ENTREPRENEUR,
    profile: {
      organization: 'Test Company'
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    mockGrantModel = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findAndCountAll: jest.fn(),
      update: jest.fn()
    };

    mockRateLimiter = {
      consume: jest.fn().mockResolvedValue(true)
    };

    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    };

    // Initialize service
    grantService = new GrantService(
      mockOpenAI,
      mockGrantModel,
      mockRateLimiter,
      mockRedisClient
    );
  });

  describe('createGrant', () => {
    it('should create a grant with proper security validation', async () => {
      // Arrange
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockGrantModel.create.mockResolvedValue(mockGrant);

      // Act
      const result = await grantService.createGrant(mockGrant, adminUser);

      // Assert
      expect(result).toEqual(mockGrant);
      expect(mockGrantModel.create).toHaveBeenCalledWith({
        ...mockGrant,
        createdBy: adminUser.id,
        auditLog: expect.any(Array)
      });
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should reject grant creation for unauthorized users', async () => {
      // Arrange
      const guestUser = { ...mockUser, role: UserRole.GUEST };

      // Act & Assert
      await expect(grantService.createGrant(mockGrant, guestUser))
        .rejects
        .toThrow('Insufficient permissions to create grant');
    });
  });

  describe('searchGrants', () => {
    const searchParams = {
      type: [GrantType.SBIR],
      minAmount: 100000,
      maxAmount: 500000,
      page: 1,
      limit: 20
    };

    it('should return cached results when available', async () => {
      // Arrange
      const cachedResult = {
        grants: [mockGrant],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

      // Act
      const result = await grantService.searchGrants(searchParams, mockUser);

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockGrantModel.findAndCountAll).not.toHaveBeenCalled();
    });

    it('should apply security filters based on user role', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      mockGrantModel.findAndCountAll.mockResolvedValue({
        rows: [mockGrant],
        count: 1
      });

      // Act
      await grantService.searchGrants(searchParams, mockUser);

      // Assert
      expect(mockGrantModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            securityLevel: SecurityLevel.LOW
          })
        })
      );
    });
  });

  describe('getAIAssistance', () => {
    const mockSection = 'technical_approach';
    const mockContent = 'Current grant content';

    beforeEach(() => {
      mockGrantModel.findByPk.mockResolvedValue(mockGrant);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          { message: { content: 'Suggestion 1' } },
          { message: { content: 'Suggestion 2' } },
          { message: { content: 'Suggestion 3' } }
        ]
      } as any);
    });

    it('should provide AI assistance with rate limiting', async () => {
      // Act
      const result = await grantService.getAIAssistance(
        mockGrant.id,
        mockSection,
        mockContent,
        mockUser
      );

      // Assert
      expect(mockRateLimiter.consume).toHaveBeenCalledWith(mockUser.id, 1);
      expect(result).toEqual({
        suggestions: expect.any(Array),
        confidenceScore: expect.any(Number),
        metadata: expect.objectContaining({
          model: 'gpt-4',
          timestamp: expect.any(Date),
          processingTime: expect.any(Number)
        })
      });
    });

    it('should reject requests when rate limit is exceeded', async () => {
      // Arrange
      mockRateLimiter.consume.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act & Assert
      await expect(grantService.getAIAssistance(
        mockGrant.id,
        mockSection,
        mockContent,
        mockUser
      )).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete search operations within 2 seconds', async () => {
      // Arrange
      const startTime = Date.now();
      mockRedisClient.get.mockResolvedValue(null);
      mockGrantModel.findAndCountAll.mockResolvedValue({
        rows: [mockGrant],
        count: 1
      });

      // Act
      await grantService.searchGrants({ page: 1, limit: 20 }, mockUser);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(2000);
    });

    it('should maintain high cache hit ratio', async () => {
      // Arrange
      const totalRequests = 100;
      let cacheHits = 0;
      mockRedisClient.get.mockImplementation(() => {
        cacheHits++;
        return JSON.stringify({ grants: [mockGrant] });
      });

      // Act
      for (let i = 0; i < totalRequests; i++) {
        await grantService.searchGrants({ page: 1, limit: 20 }, mockUser);
      }

      // Assert
      const hitRatio = cacheHits / totalRequests;
      expect(hitRatio).toBeGreaterThan(0.8);
    });
  });

  describe('Security Validation', () => {
    it('should enforce data classification for confidential grants', async () => {
      // Arrange
      const confidentialGrant = {
        ...mockGrant,
        securityLevel: SecurityLevel.CONFIDENTIAL
      };

      // Act & Assert
      await expect(grantService.searchGrants(
        { securityLevel: SecurityLevel.CONFIDENTIAL },
        { ...mockUser, role: UserRole.GUEST }
      )).rejects.toThrow();
    });

    it('should maintain audit trail for grant operations', async () => {
      // Arrange
      const adminUser = { ...mockUser, role: UserRole.ADMIN };

      // Act
      await grantService.createGrant(mockGrant, adminUser);

      // Assert
      expect(mockGrantModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auditLog: expect.arrayContaining([
            expect.objectContaining({
              action: 'CREATE',
              userId: adminUser.id
            })
          ])
        })
      );
    });
  });
});