/**
 * Elasticsearch Configuration Module
 * Defines comprehensive connection settings, authentication, index configurations,
 * cluster settings, monitoring, and maintenance configurations for the Incepta platform
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.3.1
import { ElasticsearchConfig } from '../interfaces/config.interface';

// Load environment variables
config();

/**
 * Default configuration constants for Elasticsearch
 */
export const DEFAULT_NUMBER_OF_SHARDS = 5;
export const DEFAULT_NUMBER_OF_REPLICAS = 1;
export const DEFAULT_REFRESH_INTERVAL = '1s';
export const DEFAULT_MAX_RESULT_WINDOW = 10000;
export const DEFAULT_SEARCH_TIMEOUT = '30s';
export const DEFAULT_BULK_SIZE = '5mb';

/**
 * Validates Elasticsearch configuration
 * @param config ElasticsearchConfig object to validate
 * @throws Error if configuration is invalid
 * @returns boolean
 */
export const validateConfig = (config: ElasticsearchConfig): boolean => {
  // Validate nodes
  if (!config.nodes || config.nodes.length === 0) {
    throw new Error('At least one Elasticsearch node must be configured');
  }

  // Validate authentication
  if (!config.auth.username || !config.auth.password) {
    if (!config.auth.apiKey) {
      throw new Error('Either username/password or API key authentication must be configured');
    }
  }

  // Validate indices
  if (!config.indices.technology || !config.indices.grant) {
    throw new Error('Technology and grant indices must be configured');
  }

  // Validate settings
  if (config.settings.numberOfShards < 1 || config.settings.numberOfReplicas < 0) {
    throw new Error('Invalid shard or replica configuration');
  }

  return true;
};

/**
 * Production Elasticsearch configuration
 * Implements high-availability cluster setup with monitoring and maintenance
 */
export const elasticsearchConfig: ElasticsearchConfig & {
  ssl: any;
  monitoring: any;
} = {
  // Cluster nodes configuration
  nodes: [
    process.env.ES_NODE_1 || 'http://localhost:9200',
    process.env.ES_NODE_2,
    process.env.ES_NODE_3
  ].filter(Boolean) as string[],

  // Authentication configuration
  auth: {
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD || '',
    apiKey: process.env.ES_API_KEY
  },

  // Index configuration
  indices: {
    technology: 'incepta_technologies',
    grant: 'incepta_grants',
    user: 'incepta_users',
    maxResultWindow: DEFAULT_MAX_RESULT_WINDOW
  },

  // Cluster settings
  settings: {
    numberOfShards: Number(process.env.ES_NUMBER_OF_SHARDS) || DEFAULT_NUMBER_OF_SHARDS,
    numberOfReplicas: Number(process.env.ES_NUMBER_OF_REPLICAS) || DEFAULT_NUMBER_OF_REPLICAS,
    refreshInterval: process.env.ES_REFRESH_INTERVAL || DEFAULT_REFRESH_INTERVAL,
    bulkSize: process.env.ES_BULK_SIZE || DEFAULT_BULK_SIZE,
    searchTimeout: process.env.ES_SEARCH_TIMEOUT || DEFAULT_SEARCH_TIMEOUT
  },

  // Snapshot configuration for backup
  snapshotConfig: {
    repository: process.env.ES_SNAPSHOT_REPOSITORY || 'incepta_snapshots',
    schedule: process.env.ES_SNAPSHOT_SCHEDULE || '0 0 * * *', // Daily at midnight
    retention: {
      maxCount: Number(process.env.ES_SNAPSHOT_RETENTION_COUNT) || 7,
      maxAge: process.env.ES_SNAPSHOT_RETENTION_AGE || '7d'
    }
  },

  // SSL/TLS configuration
  ssl: {
    enabled: process.env.ES_SSL_ENABLED === 'true',
    verifyHostnames: process.env.ES_SSL_VERIFY_HOSTNAMES !== 'false',
    certificate: process.env.ES_SSL_CERTIFICATE
  },

  // Monitoring and health check configuration
  monitoring: {
    slowLog: {
      threshold: {
        query: process.env.ES_SLOW_QUERY_THRESHOLD || '10s',
        fetch: process.env.ES_SLOW_FETCH_THRESHOLD || '5s',
        index: process.env.ES_SLOW_INDEX_THRESHOLD || '5s'
      }
    },
    healthCheck: {
      interval: process.env.ES_HEALTH_CHECK_INTERVAL || '30s',
      timeout: process.env.ES_HEALTH_CHECK_TIMEOUT || '5s'
    },
    performanceThresholds: {
      cpuUsage: Number(process.env.ES_CPU_THRESHOLD) || 80,
      memoryUsage: Number(process.env.ES_MEMORY_THRESHOLD) || 85,
      diskUsage: Number(process.env.ES_DISK_THRESHOLD) || 75,
      jvmHeapUsage: Number(process.env.ES_JVM_HEAP_THRESHOLD) || 80
    }
  }
};

// Validate configuration on module load
validateConfig(elasticsearchConfig);

export default elasticsearchConfig;