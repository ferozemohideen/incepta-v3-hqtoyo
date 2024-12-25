/**
 * Queue Module Entry Point
 * Provides a production-ready Kafka message queue implementation with enhanced type safety,
 * validation, monitoring, and error handling for distributed event processing.
 * @module lib/queue
 * @version 1.0.0
 */

// External imports
import { Logger } from '@incepta/logger'; // v1.0.0

// Internal imports
import { KafkaQueue } from './kafka';

/**
 * Queue configuration namespace containing type definitions
 * for queue operations and configuration
 */
export namespace QueueTypes {
  /**
   * Queue configuration interface
   */
  export interface QueueConfig {
    brokers: string[];
    clientId: string;
    retryOptions?: {
      maxRetries: number;
      initialRetryTime: number;
      maxRetryTime: number;
    };
    monitoring?: {
      metricsInterval: number;
      logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
    };
    ssl?: {
      enabled: boolean;
      rejectUnauthorized: boolean;
      ca?: string;
    };
  }

  /**
   * Queue message interface for type-safe message handling
   */
  export interface QueueMessage<T = unknown> {
    topic: string;
    payload: T;
    metadata?: {
      timestamp?: number;
      correlationId?: string;
      source?: string;
      [key: string]: unknown;
    };
    headers?: Record<string, string>;
  }

  /**
   * Queue metrics interface for monitoring
   */
  export interface QueueMetrics {
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    latency: number;
    connectionStatus: 'connected' | 'disconnected';
  }

  /**
   * Message handler type definition
   */
  export type MessageHandler<T = unknown> = (
    message: QueueMessage<T>
  ) => Promise<void>;
}

/**
 * Default queue configuration values
 */
const QUEUE_DEFAULTS: Partial<QueueTypes.QueueConfig> = {
  retryOptions: {
    maxRetries: 3,
    initialRetryTime: 1000,
    maxRetryTime: 30000
  },
  monitoring: {
    metricsInterval: 10000,
    logLevel: 'INFO'
  },
  ssl: {
    enabled: process.env.NODE_ENV === 'production',
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
};

/**
 * Queue factory function to create new queue instances
 * @param config Queue configuration
 * @param logger Logger instance
 * @returns Configured KafkaQueue instance
 */
export function createQueue(
  config: QueueTypes.QueueConfig,
  logger: Logger
): KafkaQueue {
  // Merge provided config with defaults
  const finalConfig = {
    ...QUEUE_DEFAULTS,
    ...config,
    retryOptions: {
      ...QUEUE_DEFAULTS.retryOptions,
      ...config.retryOptions
    },
    monitoring: {
      ...QUEUE_DEFAULTS.monitoring,
      ...config.monitoring
    },
    ssl: {
      ...QUEUE_DEFAULTS.ssl,
      ...config.ssl
    }
  };

  // Validate configuration
  validateQueueConfig(finalConfig);

  return new KafkaQueue(finalConfig, logger);
}

/**
 * Validates queue configuration
 * @param config Queue configuration to validate
 * @throws Error if configuration is invalid
 */
function validateQueueConfig(config: QueueTypes.QueueConfig): void {
  if (!config.brokers || config.brokers.length === 0) {
    throw new Error('At least one Kafka broker must be configured');
  }

  if (!config.clientId || config.clientId.trim().length === 0) {
    throw new Error('Client ID must be provided');
  }

  if (config.retryOptions) {
    if (config.retryOptions.maxRetries < 0) {
      throw new Error('Max retries must be non-negative');
    }
    if (config.retryOptions.initialRetryTime < 0) {
      throw new Error('Initial retry time must be non-negative');
    }
    if (config.retryOptions.maxRetryTime < config.retryOptions.initialRetryTime) {
      throw new Error('Max retry time must be greater than initial retry time');
    }
  }
}

// Export the KafkaQueue class and types
export { KafkaQueue };

// Export utility functions for queue operations
export const QueueUtils = {
  validateQueueConfig,
  createQueue
};

/**
 * Default export for convenient importing
 */
export default {
  createQueue,
  KafkaQueue,
  QueueUtils,
  QueueTypes
};