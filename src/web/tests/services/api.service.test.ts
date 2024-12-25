/**
 * API Service Test Suite
 * Comprehensive tests for core API service functionality
 * Version: 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // ^29.5.0
import axios from 'axios'; // ^1.4.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.5

import { apiService } from '../../src/services/api.service';
import { API_ENDPOINTS } from '../../src/constants/api.constants';
import { apiConfig } from '../../src/config/api.config';

// Test constants
const TEST_TIMEOUT = 10000;
const RATE_LIMIT_WINDOW = 60000; // 1 hour in ms

// Mock data
const mockTechnology = {
  id: '123',
  title: 'Test Technology',
  description: 'Test Description'
};

const mockAuthToken = 'mock-jwt-token';
const mockErrorResponse = {
  status: 500,
  message: 'Internal Server Error',
  code: 'ERR_500',
  details: {}
};

// Initialize mock axios instance
let mockAxios: MockAdapter;

describe('ApiService', () => {
  beforeEach(() => {
    // Setup mock axios instance
    mockAxios = new MockAdapter(axios);
    
    // Setup localStorage mock for auth token
    Storage.prototype.getItem = jest.fn(() => mockAuthToken);
    
    // Reset rate limit counters
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    mockAxios.reset();
    jest.clearAllMocks();
  });

  describe('Request Methods', () => {
    test('GET request should include authorization header and handle successful response', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      mockAxios.onGet(endpoint).reply(200, mockTechnology);

      const response = await apiService.get(endpoint);
      
      expect(response).toEqual(mockTechnology);
      expect(mockAxios.history.get[0].headers?.Authorization).toBe(`Bearer ${mockAuthToken}`);
    });

    test('POST request should handle data payload correctly', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      const payload = { title: 'New Technology' };
      
      mockAxios.onPost(endpoint, payload).reply(201, mockTechnology);

      const response = await apiService.post(endpoint, payload);
      
      expect(response).toEqual(mockTechnology);
      expect(mockAxios.history.post[0].data).toBe(JSON.stringify(payload));
    });

    test('PUT request should update existing resource', async () => {
      const endpoint = `${API_ENDPOINTS.TECHNOLOGIES.BASE}/123`;
      const payload = { title: 'Updated Technology' };
      
      mockAxios.onPut(endpoint, payload).reply(200, { ...mockTechnology, ...payload });

      const response = await apiService.put(endpoint, payload);
      
      expect(response.title).toBe(payload.title);
    });

    test('DELETE request should handle resource removal', async () => {
      const endpoint = `${API_ENDPOINTS.TECHNOLOGIES.BASE}/123`;
      mockAxios.onDelete(endpoint).reply(204);

      await apiService.delete(endpoint);
      
      expect(mockAxios.history.delete.length).toBe(1);
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry failed requests with exponential backoff', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      const startTime = Date.now();
      
      // Mock 2 failures followed by success
      mockAxios
        .onGet(endpoint)
        .replyOnce(500)
        .onGet(endpoint)
        .replyOnce(500)
        .onGet(endpoint)
        .reply(200, mockTechnology);

      const response = await apiService.get(endpoint);
      const duration = Date.now() - startTime;

      expect(response).toEqual(mockTechnology);
      expect(mockAxios.history.get.length).toBe(3);
      expect(duration).toBeGreaterThanOrEqual(
        apiConfig.retry.retryDelay + apiConfig.retry.retryDelay * apiConfig.retry.backoffMultiplier
      );
    });

    test('should respect maximum retry attempts', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      
      // Mock consistent failures
      mockAxios.onGet(endpoint).reply(500);

      await expect(apiService.get(endpoint)).rejects.toThrow();
      expect(mockAxios.history.get.length).toBe(apiConfig.retry.maxRetries + 1);
    });

    test('should only retry on specified status codes', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      
      mockAxios.onGet(endpoint).reply(400); // Bad request - should not retry

      await expect(apiService.get(endpoint)).rejects.toThrow();
      expect(mockAxios.history.get.length).toBe(1);
    });
  });

  describe('Rate Limiting', () => {
    test('should queue requests when approaching rate limit', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      const requests = Array(5).fill(null);
      
      mockAxios.onGet(endpoint).reply(200, mockTechnology);

      const responses = await Promise.all(
        requests.map(() => apiService.get(endpoint))
      );

      expect(responses).toHaveLength(5);
      expect(responses.every(r => r === mockTechnology)).toBe(true);
    });

    test('should handle rate limit exceeded response', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      
      mockAxios.onGet(endpoint).reply(429, {
        message: 'Rate limit exceeded',
        resetTime: Date.now() + 1000
      });

      await expect(apiService.get(endpoint)).rejects.toThrow('Rate limit exceeded');
    });

    test('should prioritize critical requests in queue', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      const normalRequest = apiService.get(endpoint);
      const criticalRequest = apiService.get(endpoint, undefined, { priority: 10 });

      mockAxios
        .onGet(endpoint)
        .replyOnce(200, { ...mockTechnology, priority: 'low' })
        .onGet(endpoint)
        .replyOnce(200, { ...mockTechnology, priority: 'high' });

      const [critical, normal] = await Promise.all([criticalRequest, normalRequest]);

      expect(critical.priority).toBe('high');
      expect(normal.priority).toBe('low');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      mockAxios.onGet(endpoint).networkError();

      await expect(apiService.get(endpoint)).rejects.toThrow();
    });

    test('should handle timeout errors', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      mockAxios.onGet(endpoint).timeout();

      await expect(apiService.get(endpoint)).rejects.toThrow();
    });

    test('should format error responses consistently', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      mockAxios.onGet(endpoint).reply(500, mockErrorResponse);

      try {
        await apiService.get(endpoint);
      } catch (error: any) {
        expect(error.status).toBe(500);
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.details).toBeDefined();
      }
    });
  });

  describe('Request Configuration', () => {
    test('should handle custom request headers', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      const customHeaders = { 'Custom-Header': 'test' };
      
      mockAxios.onGet(endpoint).reply(200, mockTechnology);

      await apiService.get(endpoint, undefined, { headers: customHeaders });
      
      expect(mockAxios.history.get[0].headers?.['Custom-Header']).toBe('test');
    });

    test('should respect request timeout configuration', async () => {
      const endpoint = API_ENDPOINTS.TECHNOLOGIES.BASE;
      const customTimeout = 5000;
      
      mockAxios.onGet(endpoint).reply(200, mockTechnology);

      await apiService.get(endpoint, undefined, { timeout: customTimeout });
      
      expect(mockAxios.history.get[0].timeout).toBe(customTimeout);
    });
  });
});