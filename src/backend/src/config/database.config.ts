/**
 * Database Configuration Module
 * Configures PostgreSQL connection settings with enhanced security, pooling, and replication
 * @version 1.0.0
 */

// dotenv v16.3.1 - Load environment variables
import { config } from 'dotenv';
import { DatabaseConfig } from '../interfaces/config.interface';

// Load environment variables
config();

/**
 * Validates all database configuration parameters
 * @param config DatabaseConfig object to validate
 * @throws Error if validation fails
 */
const validateConfig = (config: DatabaseConfig): void => {
  // Validate host and port
  if (!config.host || !config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid database host or port configuration');
  }

  // Validate credentials
  if (!config.username || !config.password) {
    throw new Error('Database credentials are required');
  }

  // Validate database name
  if (!config.database) {
    throw new Error('Database name is required');
  }

  // Validate pool configuration
  if (
    !config.poolConfig ||
    config.poolConfig.max < 1 ||
    config.poolConfig.idleTimeoutMillis < 1000 ||
    config.poolConfig.connectionTimeoutMillis < 1000
  ) {
    throw new Error('Invalid pool configuration');
  }

  // Validate SSL configuration if enabled
  if (config.ssl.enabled) {
    if (typeof config.ssl.rejectUnauthorized !== 'boolean') {
      throw new Error('Invalid SSL configuration: rejectUnauthorized must be boolean');
    }
    if (config.ssl.ca && !config.ssl.ca.trim()) {
      throw new Error('Invalid SSL configuration: CA certificate path is empty');
    }
  }

  // Validate read replicas if configured
  if (config.replication.readReplicas.length > 0) {
    config.replication.readReplicas.forEach((replica, index) => {
      if (!replica.host || !replica.port || replica.port < 1 || replica.port > 65535) {
        throw new Error(`Invalid read replica configuration at index ${index}`);
      }
    });
  }
};

/**
 * Retrieves and validates database configuration from environment variables
 * Implements environment-specific settings and enhanced security features
 * @returns DatabaseConfig Validated database configuration object
 */
const getDatabaseConfig = (): DatabaseConfig => {
  // Parse read replica configuration
  const replicaHosts = process.env.DB_READ_REPLICA_HOSTS?.split(',') || [];
  const replicaPorts = process.env.DB_READ_REPLICA_PORTS?.split(',').map(Number) || [];
  
  const readReplicas = replicaHosts.map((host, index) => ({
    host,
    port: replicaPorts[index] || Number(process.env.DB_PORT)
  }));

  // Build configuration object
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    ssl: {
      enabled: process.env.DB_SSL_ENABLED === 'true',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.DB_SSL_CA
    },
    poolConfig: {
      min: 2, // Minimum pool size
      max: Number(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT) || 5000
    },
    replication: {
      readReplicas
    }
  };

  // Environment-specific configurations
  switch (process.env.NODE_ENV) {
    case 'production':
      // Enforce SSL in production
      config.ssl.enabled = true;
      config.ssl.rejectUnauthorized = true;
      // Increase pool size for production
      config.poolConfig.max = Math.max(config.poolConfig.max, 50);
      break;
    
    case 'staging':
      // Enable SSL but allow self-signed certificates
      config.ssl.enabled = true;
      config.ssl.rejectUnauthorized = false;
      break;
    
    case 'development':
      // Reduce pool size for development
      config.poolConfig.max = Math.min(config.poolConfig.max, 10);
      break;
  }

  // Validate final configuration
  validateConfig(config);

  return config;
};

// Export validated database configuration
export const databaseConfig = getDatabaseConfig();

/**
 * Re-export DatabaseConfig type for convenience
 */
export type { DatabaseConfig };