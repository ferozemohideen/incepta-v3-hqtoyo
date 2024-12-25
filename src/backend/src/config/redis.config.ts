/**
 * Redis Configuration Module
 * Provides comprehensive connection settings, cache parameters, and cluster configuration
 * for the Redis caching layer used across the Incepta platform
 * @version 1.0.0
 * @module config/redis
 */

// External imports
import { config } from 'dotenv'; // ^16.0.0

// Internal imports
import { RedisConfig } from '../interfaces/config.interface';

// Initialize environment variables
config();

// Constants for Redis configuration
const REDIS_DEFAULT_TTL = 3600; // 1 hour in seconds
const REDIS_DEFAULT_PORT = 6379;
const REDIS_CLUSTER_RETRY_DELAY = 1000; // 1 second
const REDIS_MAX_RETRIES = 3;
const REDIS_POOL_MIN_SIZE = 5;
const REDIS_POOL_MAX_SIZE = 20;

/**
 * Validates Redis configuration parameters
 * @param config - Redis configuration object
 * @throws Error if configuration is invalid
 */
const validateRedisConfig = (config: RedisConfig): boolean => {
  // Host validation
  if (!config.host || !/^[\w.-]+$/.test(config.host)) {
    throw new Error('Invalid Redis host configuration');
  }

  // Port validation
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid Redis port configuration');
  }

  // Password validation if provided
  if (config.password && config.password.length < 8) {
    throw new Error('Redis password must be at least 8 characters');
  }

  // TTL validation
  if (config.ttl && (config.ttl < 0 || config.ttl > 86400 * 30)) { // Max 30 days
    throw new Error('Invalid Redis TTL configuration');
  }

  // Cluster configuration validation
  if (config.cluster?.enabled) {
    if (!config.cluster.nodes || config.cluster.nodes.length < 1) {
      throw new Error('Cluster enabled but no nodes configured');
    }
    for (const node of config.cluster.nodes) {
      if (!node.host || !node.port) {
        throw new Error('Invalid cluster node configuration');
      }
    }
  }

  return true;
};

/**
 * Redis configuration object
 * Provides all necessary settings for Redis connection and operation
 */
export const redisConfig: RedisConfig = {
  // Basic connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || REDIS_DEFAULT_PORT.toString(), 10),
  password: process.env.REDIS_PASSWORD || '',

  // TTL settings for different cache types
  ttl: {
    default: parseInt(process.env.REDIS_DEFAULT_TTL || REDIS_DEFAULT_TTL.toString(), 10),
    session: parseInt(process.env.REDIS_SESSION_TTL || '86400', 10), // 24 hours
    rateLimit: parseInt(process.env.REDIS_RATE_LIMIT_TTL || '3600', 10), // 1 hour
  },

  // Cluster configuration
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES ? 
      JSON.parse(process.env.REDIS_CLUSTER_NODES) : 
      [{ host: process.env.REDIS_HOST || 'localhost', port: REDIS_DEFAULT_PORT }],
  },

  // Sentinel configuration for high availability
  sentinel: {
    enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
    masterName: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
    nodes: process.env.REDIS_SENTINEL_NODES ? 
      JSON.parse(process.env.REDIS_SENTINEL_NODES) : 
      [],
    password: process.env.REDIS_SENTINEL_PASSWORD,
  },

  // TLS configuration
  tls: {
    enabled: process.env.REDIS_TLS_ENABLED === 'true',
    cert: process.env.REDIS_TLS_CERT,
    key: process.env.REDIS_TLS_KEY,
    ca: process.env.REDIS_TLS_CA,
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  },

  // Connection pool configuration
  connectionPool: {
    minSize: parseInt(process.env.REDIS_POOL_MIN_SIZE || REDIS_POOL_MIN_SIZE.toString(), 10),
    maxSize: parseInt(process.env.REDIS_POOL_MAX_SIZE || REDIS_POOL_MAX_SIZE.toString(), 10),
    acquireTimeoutMillis: parseInt(process.env.REDIS_POOL_ACQUIRE_TIMEOUT || '5000', 10),
    idleTimeoutMillis: parseInt(process.env.REDIS_POOL_IDLE_TIMEOUT || '30000', 10),
    evictionRunIntervalMillis: parseInt(process.env.REDIS_POOL_EVICTION_INTERVAL || '15000', 10),
  },

  // Retry configuration
  retry: {
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || REDIS_MAX_RETRIES.toString(), 10),
    retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY || REDIS_CLUSTER_RETRY_DELAY.toString(), 10),
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.REDIS_MONITORING_ENABLED === 'true',
    interval: parseInt(process.env.REDIS_MONITORING_INTERVAL || '10000', 10),
    slowLogThresholdMs: parseInt(process.env.REDIS_SLOW_LOG_THRESHOLD || '100', 10),
  },
};

// Validate the configuration
validateRedisConfig(redisConfig);

export default redisConfig;