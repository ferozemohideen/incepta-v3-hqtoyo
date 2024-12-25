/**
 * Kafka Message Queue Implementation
 * Production-ready Kafka client for distributed event processing and data pipelines
 * @version 1.0.0
 */

// External imports
import { Kafka, Producer, Consumer, KafkaMessage, CompressionTypes, logLevel } from 'kafkajs'; // v2.2.4
import { Logger } from 'winston'; // v3.10.0
import { Counter, Gauge, Histogram } from 'prom-client'; // v14.2.0
import { HealthCheck, HealthStatus } from '@types/health-check'; // v1.0.0

// Internal imports
import { kafka as kafkaConfig } from '../../config';

/**
 * Enhanced Kafka configuration interface
 */
interface KafkaConfig {
  brokers: string[];
  clientId: string;
  ssl: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  connectionTimeout: number;
  sessionTimeout: number;
  retry: {
    maxRetries: number;
    initialRetryTime: number;
    maxRetryTime: number;
  };
  monitoring: {
    metricsInterval: number;
    logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  };
}

/**
 * Extended options for producing messages
 */
interface ProduceOptions {
  partition?: number;
  key?: string;
  headers?: Record<string, string>;
  timeout?: number;
  compression?: CompressionTypes;
  acks?: number;
}

/**
 * Comprehensive options for consuming messages
 */
interface ConsumerOptions {
  groupId: string;
  autoCommit?: boolean;
  maxBatchSize?: number;
  maxWaitTimeMs?: number;
  maxBytesPerPartition?: number;
  retry?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  deadLetter?: {
    topic: string;
    maxAttempts: number;
  };
}

/**
 * Production-ready Kafka queue implementation
 */
export class KafkaQueue {
  private client: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private logger: Logger;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, Function> = new Map();

  // Prometheus metrics
  private metrics = {
    messagesSent: new Counter({
      name: 'kafka_messages_sent_total',
      help: 'Total number of messages sent',
      labelNames: ['topic']
    }),
    messagesReceived: new Counter({
      name: 'kafka_messages_received_total',
      help: 'Total number of messages received',
      labelNames: ['topic', 'groupId']
    }),
    messageErrors: new Counter({
      name: 'kafka_message_errors_total',
      help: 'Total number of message errors',
      labelNames: ['type', 'topic']
    }),
    connectionStatus: new Gauge({
      name: 'kafka_connection_status',
      help: 'Current connection status (1 = connected, 0 = disconnected)'
    }),
    messageLatency: new Histogram({
      name: 'kafka_message_latency_seconds',
      help: 'Message processing latency in seconds',
      buckets: [0.1, 0.5, 1, 2, 5]
    })
  };

  /**
   * Initialize Kafka client with enhanced configuration
   */
  constructor(
    private readonly config: KafkaConfig,
    private readonly healthCheck: HealthCheck
  ) {
    this.client = new Kafka({
      brokers: config.brokers,
      clientId: config.clientId,
      ssl: config.ssl,
      sasl: config.sasl,
      connectionTimeout: config.connectionTimeout,
      retry: config.retry,
      logLevel: logLevel[config.monitoring.logLevel]
    });

    this.producer = this.client.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000
    });

    this.setupHealthCheck();
  }

  /**
   * Establish monitored connection to Kafka brokers
   */
  public async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.metrics.connectionStatus.set(1);
      this.healthCheck.setStatus('kafka', HealthStatus.UP);
      
      this.logger.info('Successfully connected to Kafka brokers', {
        brokers: this.config.brokers,
        clientId: this.config.clientId
      });
    } catch (error) {
      this.metrics.connectionStatus.set(0);
      this.healthCheck.setStatus('kafka', HealthStatus.DOWN);
      this.logger.error('Failed to connect to Kafka brokers', { error });
      throw error;
    }
  }

  /**
   * Gracefully disconnect from Kafka
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      await this.producer.disconnect();
      this.isConnected = false;
      this.metrics.connectionStatus.set(0);
      this.healthCheck.setStatus('kafka', HealthStatus.DOWN);
      
      this.logger.info('Successfully disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', { error });
      throw error;
    }
  }

  /**
   * Produce message to Kafka topic with reliability guarantees
   */
  public async produce(
    topic: string,
    message: any,
    options: ProduceOptions = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Kafka');
      }

      const messageValue = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);

      await this.producer.send({
        topic,
        messages: [{
          key: options.key,
          value: messageValue,
          headers: options.headers,
          partition: options.partition
        }],
        acks: options.acks ?? -1,
        timeout: options.timeout ?? 30000,
        compression: options.compression ?? CompressionTypes.GZIP
      });

      this.metrics.messagesSent.inc({ topic });
      this.metrics.messageLatency.observe(
        { topic },
        (Date.now() - startTime) / 1000
      );

      this.logger.debug('Successfully produced message', {
        topic,
        messageSize: messageValue.length,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.metrics.messageErrors.inc({ type: 'produce', topic });
      this.logger.error('Failed to produce message', {
        topic,
        error,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Subscribe to topics with advanced consumer features
   */
  public async subscribe(
    topics: string[],
    options: ConsumerOptions,
    messageHandler: (message: KafkaMessage) => Promise<void>
  ): Promise<void> {
    try {
      this.consumer = this.client.consumer({
        groupId: options.groupId,
        maxBytesPerPartition: options.maxBytesPerPartition ?? 1048576,
        sessionTimeout: this.config.sessionTimeout
      });

      await this.consumer.connect();

      await this.consumer.subscribe({ topics, fromBeginning: false });

      await this.consumer.run({
        autoCommit: options.autoCommit ?? true,
        partitionsConsumedConcurrently: 3,
        eachBatchAutoResolve: true,
        
        eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning }) => {
          const startTime = Date.now();

          for (const message of batch.messages) {
            if (!isRunning()) break;

            try {
              await messageHandler(message);
              resolveOffset(message.offset);
              await heartbeat();

              this.metrics.messagesReceived.inc({
                topic: batch.topic,
                groupId: options.groupId
              });
            } catch (error) {
              this.metrics.messageErrors.inc({
                type: 'consume',
                topic: batch.topic
              });

              if (options.deadLetter && 
                  this.getAttempts(message) < options.deadLetter.maxAttempts) {
                await this.handleDeadLetter(batch.topic, message, options);
              } else {
                this.logger.error('Failed to process message', {
                  topic: batch.topic,
                  partition: batch.partition,
                  offset: message.offset,
                  error
                });
              }
            }
          }

          this.metrics.messageLatency.observe(
            { topic: batch.topic },
            (Date.now() - startTime) / 1000
          );
        }
      });

      this.logger.info('Successfully subscribed to topics', {
        topics,
        groupId: options.groupId
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to topics', { topics, error });
      throw error;
    }
  }

  /**
   * Handle dead letter queue processing
   */
  private async handleDeadLetter(
    topic: string,
    message: KafkaMessage,
    options: ConsumerOptions
  ): Promise<void> {
    try {
      const attempts = this.getAttempts(message);
      
      await this.produce(
        options.deadLetter!.topic,
        message.value,
        {
          headers: {
            ...message.headers,
            'x-original-topic': topic,
            'x-attempt': (attempts + 1).toString()
          }
        }
      );

      this.logger.warn('Message moved to dead letter queue', {
        topic,
        originalTopic: topic,
        attempts: attempts + 1
      });
    } catch (error) {
      this.logger.error('Failed to move message to dead letter queue', {
        topic,
        error
      });
    }
  }

  /**
   * Get number of processing attempts for a message
   */
  private getAttempts(message: KafkaMessage): number {
    return message.headers?.['x-attempt']
      ? parseInt(message.headers['x-attempt'].toString())
      : 0;
  }

  /**
   * Set up health check integration
   */
  private setupHealthCheck(): void {
    this.healthCheck.registerCheck('kafka', async () => {
      try {
        const { brokers } = await this.client.brokers();
        return {
          status: brokers.length > 0 ? HealthStatus.UP : HealthStatus.DOWN,
          details: {
            brokers: brokers.length,
            connected: this.isConnected
          }
        };
      } catch (error) {
        return {
          status: HealthStatus.DOWN,
          details: { error: error.message }
        };
      }
    });
  }
}