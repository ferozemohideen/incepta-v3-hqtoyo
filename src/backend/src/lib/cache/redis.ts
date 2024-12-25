/**
 * Enhanced Redis Cache Implementation
 * Provides high-performance caching layer with connection pooling, compression,
 * monitoring, and advanced error handling for the Incepta platform
 * @version 1.0.0
 */

// External imports
import Redis from 'ioredis'; // ^5.3.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { gzip, ungzip } from 'node:zlib/promises';

// Internal imports
import { redisConfig } from '../config/redis.config';
import { RedisConfig } from '../interfaces/config.interface';

// Constants for circuit breaker configuration
const BREAKER_TIMEOUT = 3000; // 3 seconds
const BREAKER_RESET_TIMEOUT = 30000; // 30 seconds
const BREAKER_THRESHOLD = 5; // Number of failures before opening

/**
 * Enhanced Redis Cache Manager implementing Singleton pattern
 * Provides caching functionality with advanced features like compression,
 * connection pooling, and monitoring
 */
export class RedisCache {
  private static instance: RedisCache;
  private client: Redis;
  private readonly ttl: number;
  private readonly compressionThreshold: number;
  private breaker: CircuitBreaker;
  private metrics: {
    hits: number;
    misses: number;
    errors: number;
    operations: number;
  };

  /**
   * Private constructor to enforce singleton pattern
   * Initializes Redis client with enhanced configuration
   */
  private constructor() {
    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0,
    };

    // Initialize Redis client with connection pool
    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: 0,
      retryStrategy: (times: number) => {
        if (times > redisConfig.retry.maxRetries) {
          return null; // Stop retrying
        }
        return Math.min(times * redisConfig.retry.retryDelayMs, 5000);
      },
      connectionName: 'incepta_cache',
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      ...redisConfig.connectionPool,
    });

    // Set default TTL and compression threshold
    this.ttl = redisConfig.ttl.default;
    this.compressionThreshold = redisConfig.monitoring.slowLogThresholdMs;

    // Initialize circuit breaker
    this.breaker = new CircuitBreaker(async (operation: Function) => {
      return await operation();
    }, {
      timeout: BREAKER_TIMEOUT,
      resetTimeout: BREAKER_RESET_TIMEOUT,
      errorThresholdPercentage: 50,
      volumeThreshold: BREAKER_THRESHOLD,
    });

    // Setup error handling
    this.setupErrorHandling();
    
    // Setup connection event handlers
    this.setupConnectionHandlers();

    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  /**
   * Gets singleton instance of RedisCache
   * @returns {RedisCache} Singleton instance
   */
  public static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  /**
   * Sets up comprehensive error handling
   */
  private setupErrorHandling(): void {
    this.client.on('error', (error: Error) => {
      this.metrics.errors++;
      console.error('Redis Error:', error);
    });

    this.breaker.on('open', () => {
      console.warn('Circuit Breaker opened - Redis operations suspended');
    });

    this.breaker.on('halfOpen', () => {
      console.info('Circuit Breaker half-open - testing Redis operations');
    });

    this.breaker.on('close', () => {
      console.info('Circuit Breaker closed - Redis operations resumed');
    });
  }

  /**
   * Sets up connection event handlers
   */
  private setupConnectionHandlers(): void {
    this.client.on('connect', () => {
      console.info('Redis client connected');
    });

    this.client.on('ready', () => {
      console.info('Redis client ready');
    });

    this.client.on('close', () => {
      console.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      console.info('Redis client reconnecting');
    });
  }

  /**
   * Sets up cleanup handlers for graceful shutdown
   */
  private setupCleanupHandlers(): void {
    process.on('SIGTERM', async () => {
      await this.cleanup();
    });

    process.on('SIGINT', async () => {
      await this.cleanup();
    });
  }

  /**
   * Performs cleanup operations before shutdown
   */
  private async cleanup(): Promise<void> {
    try {
      await this.client.quit();
      console.info('Redis connection closed gracefully');
    } catch (error) {
      console.error('Error during Redis cleanup:', error);
    }
  }

  /**
   * Sets a value in cache with optional compression
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} [ttl] - Optional TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    this.metrics.operations++;
    
    try {
      const serializedValue = JSON.stringify(value);
      let finalValue = serializedValue;

      // Apply compression if value size exceeds threshold
      if (serializedValue.length > this.compressionThreshold) {
        const compressed = await gzip(serializedValue);
        finalValue = compressed.toString('base64');
      }

      const operation = async () => {
        if (ttl) {
          await this.client.setex(key, ttl, finalValue);
        } else {
          await this.client.setex(key, this.ttl, finalValue);
        }
      };

      await this.breaker.fire(operation);
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Gets a value from cache with automatic decompression
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  public async get(key: string): Promise<any> {
    this.metrics.operations++;
    
    try {
      const operation = async () => await this.client.get(key);
      const value = await this.breaker.fire(operation);

      if (!value) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;

      // Check if value is compressed
      try {
        const decompressed = await ungzip(Buffer.from(value, 'base64'));
        return JSON.parse(decompressed.toString());
      } catch {
        // Value wasn't compressed
        return JSON.parse(value);
      }
    } catch (error) {
      this.metrics.errors++;
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Deletes a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  public async del(key: string): Promise<boolean> {
    this.metrics.operations++;
    
    try {
      const operation = async () => await this.client.del(key);
      await this.breaker.fire(operation);
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Flushes all cache data
   * @returns {Promise<boolean>} Success status
   */
  public async flush(): Promise<boolean> {
    try {
      const operation = async () => await this.client.flushdb();
      await this.breaker.fire(operation);
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Gets cache health status
   * @returns {Promise<object>} Health status object
   */
  public async getHealth(): Promise<object> {
    try {
      const info = await this.client.info();
      const status = await this.client.ping();
      
      return {
        status: status === 'PONG' ? 'healthy' : 'unhealthy',
        circuitBreakerState: this.breaker.status,
        connectionStatus: this.client.status,
        serverInfo: info,
        metrics: this.metrics,
      };
    } catch (error) {
      console.error('Error getting cache health:', error);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Gets cache statistics
   * @returns {Promise<object>} Statistics object
   */
  public async getStats(): Promise<object> {
    try {
      const info = await this.client.info();
      const hitRate = this.metrics.operations ? 
        (this.metrics.hits / this.metrics.operations) * 100 : 0;

      return {
        operations: this.metrics,
        hitRate: `${hitRate.toFixed(2)}%`,
        errorRate: `${((this.metrics.errors / this.metrics.operations) * 100).toFixed(2)}%`,
        memoryUsage: info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown',
        connectedClients: info.match(/connected_clients:(\d+)/)?.[1] || 'unknown',
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        error: error.message,
      };
    }
  }
}

export default RedisCache;