import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // Version: 29.0.0
import { Client } from '@elastic/elasticsearch'; // Version: 8.9.0
import { Transaction } from 'sequelize'; // Version: 6.32.1
import Redis from 'ioredis'; // Version: 5.3.2

import { TechnologyService } from '../../../src/services/technology.service';
import {
  Technology,
  TechnologySearchParams,
  PatentStatus,
  SecurityClassification,
  SortOptions
} from '../../../src/interfaces/technology.interface';
import TechnologyModel from '../../../src/db/models/technology.model';

// Mock external dependencies
jest.mock('@elastic/elasticsearch');
jest.mock('sequelize');
jest.mock('ioredis');
jest.mock('../../../src/db/models/technology.model');

// Performance threshold from technical specifications
const PERFORMANCE_THRESHOLD_MS = 2000;

describe('TechnologyService', () => {
  let service: TechnologyService;
  let mockEsClient: jest.Mocked<Client>;
  let mockTransaction: jest.Mocked<Transaction>;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockTechnologyModel: jest.Mocked<typeof TechnologyModel>;

  // Test data
  const testTechnology: Technology = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Technology',
    description: 'Test Description',
    university: 'Test University',
    patentStatus: PatentStatus.PENDING,
    trl: 5,
    domains: ['AI', 'ML'],
    metadata: {
      inventors: ['John Doe'],
      keywords: ['test'],
      stage: 'PROTOTYPE',
      publications: [],
      fundingHistory: []
    },
    securityLevel: SecurityClassification.INTERNAL,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const testSecurityContext = {
    userId: 'test-user',
    roles: ['TTO_MANAGER']
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockEsClient = new Client({ node: 'http://localhost:9200' }) as jest.Mocked<Client>;
    mockTransaction = new Transaction(null, null) as jest.Mocked<Transaction>;
    mockRedisClient = new Redis() as jest.Mocked<Redis>;
    mockTechnologyModel = TechnologyModel as jest.Mocked<typeof TechnologyModel>;

    // Initialize service with mocks
    service = new TechnologyService(
      mockEsClient,
      mockTransaction,
      mockRedisClient
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createTechnology', () => {
    it('should create technology with valid data and permissions', async () => {
      // Setup
      const { id, createdAt, updatedAt, ...createData } = testTechnology;
      mockTechnologyModel.create.mockResolvedValue(testTechnology as any);
      mockEsClient.index.mockResolvedValue({ result: 'created' } as any);

      // Execute
      const result = await service.createTechnology(createData, testSecurityContext);

      // Assert
      expect(result).toEqual(testTechnology);
      expect(mockTechnologyModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createData,
          createdById: testSecurityContext.userId
        }),
        expect.any(Object)
      );
      expect(mockEsClient.index).toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should throw error when user has insufficient permissions', async () => {
      // Setup
      const invalidContext = { userId: 'test', roles: ['GUEST'] };
      const { id, createdAt, updatedAt, ...createData } = testTechnology;

      // Execute & Assert
      await expect(service.createTechnology(createData, invalidContext))
        .rejects
        .toThrow('Insufficient permissions');
    });
  });

  describe('searchTechnologies', () => {
    const testSearchParams: TechnologySearchParams = {
      query: 'test',
      universities: ['Test University'],
      patentStatus: [PatentStatus.PENDING],
      trlRange: { min: 4, max: 6 },
      page: 1,
      limit: 10,
      sortBy: SortOptions.RELEVANCE
    };

    it('should return cached results when available', async () => {
      // Setup
      const cachedResults = {
        items: [testTechnology],
        metadata: { total: 1, page: 1, limit: 10, totalPages: 1 }
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResults));

      // Execute
      const result = await service.searchTechnologies(testSearchParams, testSecurityContext);

      // Assert
      expect(result).toEqual(cachedResults);
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('should perform search with security filtering when cache misses', async () => {
      // Setup
      mockRedisClient.get.mockResolvedValue(null);
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [{
            _source: testTechnology,
            _score: 1.0
          }]
        }
      } as any);

      // Execute
      const startTime = Date.now();
      const result = await service.searchTechnologies(testSearchParams, testSecurityContext);
      const endTime = Date.now();

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.metadata.total).toBe(1);
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'technologies',
          timeout: `${PERFORMANCE_THRESHOLD_MS}ms`
        })
      );
    });
  });

  describe('updateTechnology', () => {
    it('should update technology with valid permissions', async () => {
      // Setup
      const updateData = { title: 'Updated Title' };
      mockTechnologyModel.findByPk.mockResolvedValue(testTechnology as any);
      mockEsClient.update.mockResolvedValue({ result: 'updated' } as any);

      // Execute
      const result = await service.updateTechnology(
        testTechnology.id,
        updateData,
        testSecurityContext
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockEsClient.update).toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should throw error when technology not found', async () => {
      // Setup
      mockTechnologyModel.findByPk.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.updateTechnology(
        'non-existent-id',
        { title: 'New Title' },
        testSecurityContext
      )).rejects.toThrow('Technology not found');
    });
  });

  describe('Security Classifications', () => {
    it('should enforce security level access restrictions', async () => {
      // Setup
      const restrictedTech = {
        ...testTechnology,
        securityLevel: SecurityClassification.RESTRICTED
      };
      const regularUser = { userId: 'test', roles: ['RESEARCHER'] };

      // Execute & Assert
      await expect(service.updateTechnology(
        restrictedTech.id,
        { title: 'New Title' },
        regularUser
      )).rejects.toThrow('Insufficient permissions');
    });

    it('should allow admin access to all security levels', async () => {
      // Setup
      const adminContext = { userId: 'admin', roles: ['ADMIN'] };
      mockTechnologyModel.findByPk.mockResolvedValue(testTechnology as any);
      mockEsClient.update.mockResolvedValue({ result: 'updated' } as any);

      // Execute
      const result = await service.updateTechnology(
        testTechnology.id,
        { title: 'Admin Update' },
        adminContext
      );

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should invalidate related caches on update', async () => {
      // Setup
      mockTechnologyModel.findByPk.mockResolvedValue(testTechnology as any);
      mockRedisClient.keys.mockResolvedValue(['tech:search:Test University']);

      // Execute
      await service.updateTechnology(
        testTechnology.id,
        { title: 'Cache Test' },
        testSecurityContext
      );

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should generate consistent cache keys', async () => {
      // Setup
      const searchParams = { query: 'test' };
      mockEsClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] }
      } as any);

      // Execute
      await service.searchTechnologies(searchParams, testSecurityContext);

      // Assert
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('tech:search:'),
        expect.any(Number),
        expect.any(String)
      );
    });
  });
});