import { Client } from '@elastic/elasticsearch'; // v8.9.0
import { elasticsearchConfig } from '../../config/elasticsearch.config';
import { createTechnologyIndex } from './technology.index';

/**
 * Constants for Elasticsearch client configuration
 */
const DEFAULT_REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const HEALTH_CHECK_INTERVAL = 60000;
const CONNECTION_POOL_SIZE = 10;

/**
 * Health status interface for cluster monitoring
 */
interface HealthStatus {
  status: 'green' | 'yellow' | 'red';
  clusterName: string;
  numberOfNodes: number;
  activeShards: number;
  relocatingShards: number;
  initializingShards: number;
  unassignedShards: number;
  pendingTasks: number;
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    jvmHeapUsage: number;
  };
}

/**
 * Performance monitoring decorator
 */
function monitorPerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    const start = process.hrtime();
    try {
      const result = await originalMethod.apply(this, args);
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      console.log(`${propertyKey} execution time: ${duration}ms`);
      return result;
    } catch (error) {
      console.error(`${propertyKey} failed after ${process.hrtime(start)[0]}s:`, error);
      throw error;
    }
  };
  return descriptor;
}

/**
 * Retry operation decorator with exponential backoff
 */
function retryOperation(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        lastError = error;
        const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    throw lastError;
  };
  return descriptor;
}

/**
 * Creates and configures an Elasticsearch client instance with enhanced security and monitoring
 */
@monitorPerformance
export async function createElasticsearchClient(): Promise<Client> {
  const client = new Client({
    nodes: elasticsearchConfig.nodes.filter(Boolean),
    auth: {
      username: elasticsearchConfig.auth.username,
      password: elasticsearchConfig.auth.password,
      apiKey: elasticsearchConfig.auth.apiKey
    },
    ssl: {
      rejectUnauthorized: true,
      ...elasticsearchConfig.ssl
    },
    maxRetries: MAX_RETRIES,
    requestTimeout: DEFAULT_REQUEST_TIMEOUT,
    compression: true,
    sniffOnStart: true,
    sniffInterval: 300000, // 5 minutes
    sniffOnConnectionFault: true,
    connectionPool: {
      maxRetries: MAX_RETRIES,
      maxSockets: CONNECTION_POOL_SIZE
    }
  });

  return client;
}

/**
 * Initializes and configures all required Elasticsearch indices with security policies
 */
@retryOperation
export async function initializeIndices(client: Client): Promise<void> {
  try {
    // Create technology index with security configurations
    await createTechnologyIndex(client);

    // Configure index lifecycle policies
    await client.ilm.putLifecycle({
      name: 'technology_lifecycle',
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: {
                max_age: '30d',
                max_size: '50gb'
              },
              set_priority: {
                priority: 100
              }
            }
          },
          warm: {
            min_age: '30d',
            actions: {
              allocate: {
                number_of_replicas: 1
              },
              set_priority: {
                priority: 50
              }
            }
          }
        }
      }
    });

    // Configure index templates
    await client.indices.putTemplate({
      name: 'technology_template',
      body: {
        index_patterns: ['incepta_technologies*'],
        settings: {
          number_of_shards: elasticsearchConfig.settings.numberOfShards,
          number_of_replicas: elasticsearchConfig.settings.numberOfReplicas,
          'index.lifecycle.name': 'technology_lifecycle',
          'index.lifecycle.rollover_alias': 'technologies'
        }
      }
    });

  } catch (error) {
    console.error('Failed to initialize indices:', error);
    throw error;
  }
}

/**
 * Comprehensive health check of Elasticsearch cluster with detailed diagnostics
 */
@monitorPerformance
export async function checkConnection(client: Client): Promise<HealthStatus> {
  try {
    const [health, stats, nodes] = await Promise.all([
      client.cluster.health(),
      client.cluster.stats(),
      client.nodes.stats()
    ]);

    const nodeStats = Object.values(nodes.nodes)[0];
    
    return {
      status: health.status,
      clusterName: health.cluster_name,
      numberOfNodes: health.number_of_nodes,
      activeShards: health.active_shards,
      relocatingShards: health.relocating_shards,
      initializingShards: health.initializing_shards,
      unassignedShards: health.unassigned_shards,
      pendingTasks: health.number_of_pending_tasks,
      performance: {
        cpuUsage: nodeStats.os.cpu.percent,
        memoryUsage: nodeStats.os.mem.used_percent,
        diskUsage: nodeStats.fs.total.available_in_bytes / nodeStats.fs.total.total_in_bytes * 100,
        jvmHeapUsage: nodeStats.jvm.mem.heap_used_percent
      }
    };
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
}

// Set up periodic health monitoring
setInterval(async () => {
  try {
    const client = await createElasticsearchClient();
    const health = await checkConnection(client);
    
    // Alert on critical health issues
    if (health.status === 'red' || 
        health.performance.cpuUsage > elasticsearchConfig.monitoring.performanceThresholds.cpuUsage ||
        health.performance.memoryUsage > elasticsearchConfig.monitoring.performanceThresholds.memoryUsage ||
        health.performance.diskUsage > elasticsearchConfig.monitoring.performanceThresholds.diskUsage ||
        health.performance.jvmHeapUsage > elasticsearchConfig.monitoring.performanceThresholds.jvmHeapUsage) {
      console.error('Critical Elasticsearch health issue detected:', health);
      // Implement alert notification system here
    }
  } catch (error) {
    console.error('Health monitoring failed:', error);
  }
}, HEALTH_CHECK_INTERVAL);