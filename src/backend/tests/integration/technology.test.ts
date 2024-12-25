import { describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'jest'; // Version: ^29.0.0
import { expect } from '@jest/globals'; // Version: ^29.0.0
import { Client } from '@elastic/elasticsearch'; // Version: 8.9.0
import { performance } from 'perf_hooks'; // Version: native
import { Transaction } from 'sequelize'; // Version: 6.32.1
import Redis from 'ioredis'; // Version: 5.3.2

import { 
  Technology, 
  TechnologySearchParams, 
  SecurityClassification, 
  PatentStatus,
  SortOptions 
} from '../../src/interfaces/technology.interface';
import { TechnologyService } from '../../src/services/technology.service';
import TechnologyModel from '../../src/db/models/technology.model';

// Test configuration constants
const TEST_TIMEOUT = 30000;
const PERFORMANCE_THRESHOLD_MS = 2000;
const BULK_TEST_SIZE = 1000;

// Mock security contexts
const ADMIN_CONTEXT = { userId: 'admin-1', roles: ['ADMIN'] };
const TTO_CONTEXT = { userId: 'tto-1', roles: ['TTO_MANAGER'] };
const RESEARCHER_CONTEXT = { userId: 'researcher-1', roles: ['RESEARCHER'] };

describe('Technology Integration Tests', () => {
  let technologyService: TechnologyService;
  let esClient: Client;
  let redisClient: Redis;
  let transaction: Transaction;

  // Sample test data
  const mockTechnology: Omit<Technology, 'id' | 'createdAt' | 'updatedAt'> = {
    title: 'Test Technology',
    description: 'Test Description',
    university: 'Test University',
    patentStatus: PatentStatus.PENDING,
    trl: 5,
    domains: ['AI/ML'],
    securityLevel: SecurityClassification.CONFIDENTIAL,
    metadata: {
      inventors: ['Test Inventor'],
      patentNumber: 'TEST123',
      filingDate: new Date('2023-01-01'),
      stage: 'PROTOTYPE',
      publications: [],
      fundingHistory: []
    }
  };

  beforeAll(async () => {
    // Initialize test clients
    esClient = new Client({ node: process.env.ELASTICSEARCH_URL });
    redisClient = new Redis(process.env.REDIS_URL);
    
    // Initialize service with test dependencies
    technologyService = new TechnologyService(esClient, transaction, redisClient);

    // Create test indices with security mappings
    await esClient.indices.create({
      index: 'technologies-test',
      body: {
        mappings: {
          properties: {
            securityMetadata: {
              properties: {
                classification: { type: 'keyword' },
                allowedRoles: { type: 'keyword' }
              }
            }
          }
        }
      }
    });
  });

  beforeEach(async () => {
    // Clear test data
    await cleanupTestData();
    // Setup fresh test data
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    // Cleanup test resources
    await esClient.indices.delete({ index: 'technologies-test' });
    await redisClient.quit();
  });

  describe('Technology Creation', () => {
    it('should create technology with proper security context', async () => {
      const result = await technologyService.createTechnology(mockTechnology, ADMIN_CONTEXT);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.securityLevel).toBe(SecurityClassification.CONFIDENTIAL);

      // Verify Elasticsearch indexing
      const indexed = await esClient.get({
        index: 'technologies-test',
        id: result.id
      });
      expect(indexed._source).toBeDefined();
      expect(indexed._source.securityMetadata.classification).toBe(SecurityClassification.CONFIDENTIAL);
    }, TEST_TIMEOUT);

    it('should reject creation with insufficient permissions', async () => {
      await expect(
        technologyService.createTechnology(mockTechnology, RESEARCHER_CONTEXT)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Search Performance', () => {
    it('should return search results within performance threshold', async () => {
      // Setup large dataset for performance testing
      await setupBulkTestData(BULK_TEST_SIZE);

      const searchParams: TechnologySearchParams = {
        query: 'AI',
        universities: ['Test University'],
        patentStatus: [PatentStatus.PENDING],
        trlRange: { min: 4, max: 6 },
        domains: ['AI/ML'],
        page: 1,
        limit: 10,
        sortBy: SortOptions.RELEVANCE
      };

      const startTime = performance.now();
      const results = await technologyService.searchTechnologies(searchParams, ADMIN_CONTEXT);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.metadata.total).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should properly cache and return cached search results', async () => {
      const searchParams: TechnologySearchParams = {
        query: 'Test',
        limit: 10
      };

      // First search - should hit database
      const firstStart = performance.now();
      await technologyService.searchTechnologies(searchParams, ADMIN_CONTEXT);
      const firstDuration = performance.now() - firstStart;

      // Second search - should hit cache
      const secondStart = performance.now();
      await technologyService.searchTechnologies(searchParams, ADMIN_CONTEXT);
      const secondDuration = performance.now() - secondStart;

      expect(secondDuration).toBeLessThan(firstDuration);
    });
  });

  describe('Security Classification Tests', () => {
    it('should enforce security boundaries between different contexts', async () => {
      // Create technology with CONFIDENTIAL classification
      const confidentialTech = await technologyService.createTechnology({
        ...mockTechnology,
        securityLevel: SecurityClassification.CONFIDENTIAL
      }, ADMIN_CONTEXT);

      // Attempt to access with researcher context
      const searchParams: TechnologySearchParams = {
        query: confidentialTech.title
      };

      const results = await technologyService.searchTechnologies(searchParams, RESEARCHER_CONTEXT);
      expect(results.items).toHaveLength(0);
    });

    it('should properly handle security classification updates', async () => {
      const tech = await technologyService.createTechnology(mockTechnology, ADMIN_CONTEXT);
      
      // Update to RESTRICTED
      const updated = await technologyService.updateTechnology(
        tech.id,
        { securityLevel: SecurityClassification.RESTRICTED },
        ADMIN_CONTEXT
      );

      expect(updated.securityLevel).toBe(SecurityClassification.RESTRICTED);

      // Verify Elasticsearch security metadata
      const indexed = await esClient.get({
        index: 'technologies-test',
        id: updated.id
      });
      expect(indexed._source.securityMetadata.allowedRoles).toEqual(['ADMIN', 'TTO_MANAGER']);
    });
  });
});

async function setupTestData(): Promise<void> {
  // Create test technologies with different security classifications
  const classifications = Object.values(SecurityClassification);
  
  for (const classification of classifications) {
    await TechnologyModel.create({
      ...mockTechnology,
      id: `test-${classification}`,
      securityLevel: classification
    });
  }

  // Refresh Elasticsearch index
  await esClient.indices.refresh({ index: 'technologies-test' });
}

async function setupBulkTestData(count: number): Promise<void> {
  const bulkOperations = [];
  
  for (let i = 0; i < count; i++) {
    const tech = {
      ...mockTechnology,
      id: `bulk-test-${i}`,
      title: `Test Technology ${i}`,
      trl: Math.floor(Math.random() * 9) + 1
    };
    
    bulkOperations.push(
      { index: { _index: 'technologies-test' } },
      tech
    );
  }

  await esClient.bulk({ body: bulkOperations, refresh: true });
}

async function cleanupTestData(): Promise<void> {
  // Clear test data from PostgreSQL
  await TechnologyModel.destroy({ where: {} });
  
  // Clear test data from Elasticsearch
  await esClient.deleteByQuery({
    index: 'technologies-test',
    body: {
      query: { match_all: {} }
    },
    refresh: true
  });

  // Clear Redis cache
  await redisClient.flushdb();
}