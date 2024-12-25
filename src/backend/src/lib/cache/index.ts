/**
 * Cache Layer Entry Point
 * Exports Redis cache implementation with enhanced monitoring capabilities
 * for session management and query optimization across the Incepta platform
 * @version 1.0.0
 */

// Internal imports
import { RedisCache } from './redis';

/**
 * Cache configuration interface
 * Defines settings for cache behavior and monitoring
 */
export interface CacheConfig {
  /** Time-to-live in seconds for cached items */
  ttl: number;
  /** Maximum size of cache in bytes */
  maxSize: number;
  /** Flag to enable/disable monitoring */
  monitoringEnabled: boolean;
}

/**
 * Cache health metrics interface
 * Defines structure for health check data
 */
export interface CacheHealth {
  /** Current status of cache service */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** Number of active connections */
  connectionCount: number;
  /** Current memory usage in bytes */
  memoryUsage: number;
}

/**
 * Cache statistics interface
 * Defines structure for performance metrics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit rate percentage */
  hitRate: number;
  /** Average response time in milliseconds */
  avgResponseTime: number;
}

// Re-export RedisCache class and its methods
export {
  RedisCache,
  // Static factory method
  getInstance,
  // Core cache operations
  set,
  get,
  del,
  flush,
  // Monitoring methods
  getHealth,
  getStats,
} from './redis';

/**
 * Default cache instance
 * Provides singleton access to the Redis cache implementation
 */
export const defaultCache = RedisCache.getInstance();

/**
 * Default export for convenient access to the cache implementation
 */
export default defaultCache;