/**
 * Core API Service
 * Implements comprehensive HTTP client with enhanced features for the Incepta platform
 * Version: 1.0.0
 * 
 * Features:
 * - OAuth 2.0 + JWT authentication
 * - Request/response interceptors
 * - Sophisticated error handling
 * - Response caching
 * - Rate limiting with request queue
 * - Circuit breaker pattern
 * - Retry mechanism with exponential backoff
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // ^1.4.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import cacheManager from 'cache-manager'; // ^5.2.0

import { apiConfig } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';
import { formatRequestUrl, handleApiError, retryRequest } from '../utils/api.utils';

/**
 * Interface for enhanced API request configuration
 */
interface ApiRequestConfig extends AxiosRequestConfig {
  cache?: boolean;
  priority?: number;
  retry?: boolean;
}

/**
 * Interface defining core API service methods
 */
export interface ApiService {
  get<T>(url: string, params?: Record<string, any>, config?: ApiRequestConfig): Promise<T>;
  post<T>(url: string, data?: Record<string, any>, config?: ApiRequestConfig): Promise<T>;
  put<T>(url: string, data?: Record<string, any>, config?: ApiRequestConfig): Promise<T>;
  delete<T>(url: string, config?: ApiRequestConfig): Promise<T>;
}

/**
 * Request queue implementation for rate limiting
 */
class RequestQueue {
  private queue: Array<{
    request: () => Promise<any>;
    priority: number;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private processing = false;

  async add(
    request: () => Promise<any>,
    priority: number = 1
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, priority, resolve, reject });
      this.queue.sort((a, b) => b.priority - a.priority);
      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { request, resolve, reject } = this.queue.shift()!;

    try {
      const result = await request();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Add delay between requests for rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000 / apiConfig.rateLimit.maxRequests));
    this.process();
  }
}

/**
 * Enhanced API service implementation
 */
class ApiServiceImpl implements ApiService {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private cacheManager: any;
  private requestQueue: RequestQueue;

  constructor() {
    // Initialize Axios instance with enhanced configuration
    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: apiConfig.headers
    });

    // Initialize request queue for rate limiting
    this.requestQueue = new RequestQueue();

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(this.executeRequest.bind(this), {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Initialize cache manager
    this.cacheManager = cacheManager.caching({
      store: 'memory',
      max: 100,
      ttl: 60 * 5 // 5 minutes
    });

    this.setupInterceptors();
  }

  /**
   * Configure request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication and request tracking
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add authentication token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp for tracking
        config.metadata = { startTime: new Date() };

        return config;
      },
      (error) => Promise.reject(handleApiError(error))
    );

    // Response interceptor for error handling and response transformation
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const duration = new Date().getTime() - response.config.metadata.startTime.getTime();
        console.debug(`Request completed in ${duration}ms:`, response.config.url);

        return response.data;
      },
      (error) => Promise.reject(handleApiError(error))
    );
  }

  /**
   * Execute request through circuit breaker
   */
  private async executeRequest<T>(
    config: AxiosRequestConfig
  ): Promise<T> {
    return this.axiosInstance.request(config);
  }

  /**
   * Handle GET requests with caching
   */
  async get<T>(
    url: string,
    params?: Record<string, any>,
    config: ApiRequestConfig = {}
  ): Promise<T> {
    const formattedUrl = formatRequestUrl(url, params);
    const cacheKey = `get:${formattedUrl}`;

    // Check cache if enabled
    if (config.cache !== false) {
      const cachedResponse = await this.cacheManager.get(cacheKey);
      if (cachedResponse) {
        return cachedResponse as T;
      }
    }

    // Queue request with priority
    const response = await this.requestQueue.add(
      () => retryRequest(() => 
        this.circuitBreaker.fire({
          ...config,
          method: 'GET',
          url: formattedUrl
        })
      ),
      config.priority || 1
    );

    // Cache successful response
    if (config.cache !== false) {
      await this.cacheManager.set(cacheKey, response);
    }

    return response;
  }

  /**
   * Handle POST requests
   */
  async post<T>(
    url: string,
    data?: Record<string, any>,
    config: ApiRequestConfig = {}
  ): Promise<T> {
    return this.requestQueue.add(
      () => retryRequest(() =>
        this.circuitBreaker.fire({
          ...config,
          method: 'POST',
          url,
          data
        })
      ),
      config.priority || 1
    );
  }

  /**
   * Handle PUT requests
   */
  async put<T>(
    url: string,
    data?: Record<string, any>,
    config: ApiRequestConfig = {}
  ): Promise<T> {
    return this.requestQueue.add(
      () => retryRequest(() =>
        this.circuitBreaker.fire({
          ...config,
          method: 'PUT',
          url,
          data
        })
      ),
      config.priority || 1
    );
  }

  /**
   * Handle DELETE requests
   */
  async delete<T>(
    url: string,
    config: ApiRequestConfig = {}
  ): Promise<T> {
    return this.requestQueue.add(
      () => retryRequest(() =>
        this.circuitBreaker.fire({
          ...config,
          method: 'DELETE',
          url
        })
      ),
      config.priority || 1
    );
  }
}

// Export singleton instance
export const apiService = new ApiServiceImpl();